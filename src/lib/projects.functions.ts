/**
 * Projetos — Server Functions (Sprint 12).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Project, ProjectEvent, ProjectStatus, ProjectsOverview } from "@/types/project";
import { PROJECT_ACTIVE_STATUSES } from "@/types/project";

const PROJECT_STATUS_VALUES = [
  "nao_iniciado",
  "planejamento",
  "em_desenvolvimento",
  "em_revisao",
  "aguardando_cliente",
  "concluido",
  "cancelado",
] as const satisfies readonly ProjectStatus[];

const PROJECT_SELECT =
  "id, client_id, proposal_id, code, name, description, status, owner_id, start_date, due_date, completed_at, created_by, created_at, updated_at";

interface RawProject {
  id: string;
  client_id: string;
  proposal_id: string | null;
  code: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  owner_id: string | null;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

async function hydrate(supabase: any, row: RawProject): Promise<Project> {
  let owner_name: string | null = null;
  let client_name: string | null = null;
  let proposal_number: string | null = null;
  if (row.owner_id) {
    const { data } = await supabase.from("profiles").select("full_name").eq("id", row.owner_id).maybeSingle();
    owner_name = data?.full_name ?? null;
  }
  if (row.client_id) {
    const { data } = await supabase.from("clients").select("company_name").eq("id", row.client_id).maybeSingle();
    client_name = data?.company_name ?? null;
  }
  if (row.proposal_id) {
    const { data } = await supabase.from("proposals").select("number").eq("id", row.proposal_id).maybeSingle();
    proposal_number = data?.number ?? null;
  }
  return { ...row, owner_name, client_name, proposal_number };
}

// ---------------------------------------------------------------
// listProjects
// ---------------------------------------------------------------
export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        status: z.enum(PROJECT_STATUS_VALUES).optional(),
        client_id: z.string().uuid().optional(),
        owner_id: z.string().uuid().optional(),
        q: z.string().trim().optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<Project[]> => {
    let q = context.supabase.from("projects").select(PROJECT_SELECT).order("created_at", { ascending: false });
    if (data.status) q = q.eq("status", data.status);
    if (data.client_id) q = q.eq("client_id", data.client_id);
    if (data.owner_id) q = q.eq("owner_id", data.owner_id);
    if (data.q && data.q.length > 0) {
      const term = `%${data.q}%`;
      q = q.or(`name.ilike.${term},code.ilike.${term}`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return await Promise.all(((rows ?? []) as unknown as RawProject[]).map((r) => hydrate(context.supabase, r)));
  });

// ---------------------------------------------------------------
// listProjectsByClient
// ---------------------------------------------------------------
export const listProjectsByClient = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ client_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<Project[]> => {
    const { data: rows, error } = await context.supabase
      .from("projects")
      .select(PROJECT_SELECT)
      .eq("client_id", data.client_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return await Promise.all(((rows ?? []) as unknown as RawProject[]).map((r) => hydrate(context.supabase, r)));
  });

// ---------------------------------------------------------------
// getProject (with events)
// ---------------------------------------------------------------
export const getProject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ project: Project; events: ProjectEvent[] }> => {
    const { data: row, error } = await context.supabase
      .from("projects")
      .select(PROJECT_SELECT)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Projeto não encontrado.");

    const { data: evs, error: evErr } = await context.supabase
      .from("project_events")
      .select("id, project_id, type, description, metadata, created_by, created_at")
      .eq("project_id", data.id)
      .order("created_at", { ascending: false });
    if (evErr) throw new Error(evErr.message);

    const evRows = (evs ?? []) as any[];
    const authorIds = Array.from(new Set(evRows.map((e) => e.created_by).filter(Boolean) as string[]));
    let names: Record<string, string> = {};
    if (authorIds.length > 0) {
      const { data: profs } = await context.supabase.from("profiles").select("id, full_name").in("id", authorIds);
      names = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name]));
    }
    const events: ProjectEvent[] = evRows.map((e) => ({
      ...e,
      created_by_name: e.created_by ? names[e.created_by] ?? null : null,
    }));

    const project = await hydrate(context.supabase, row as unknown as RawProject);
    return { project, events };
  });

// ---------------------------------------------------------------
// createProject
// ---------------------------------------------------------------
export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        client_id: z.string().uuid(),
        proposal_id: z.string().uuid().nullable().optional(),
        name: z.string().trim().min(2).max(200),
        description: z.string().nullable().optional(),
        status: z.enum(PROJECT_STATUS_VALUES).optional(),
        owner_id: z.string().uuid().nullable().optional(),
        start_date: z.string().nullable().optional(),
        due_date: z.string().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: row, error } = await context.supabase
      .from("projects")
      .insert({
        client_id: data.client_id,
        proposal_id: data.proposal_id ?? null,
        name: data.name,
        description: data.description ?? null,
        status: data.status ?? "nao_iniciado",
        owner_id: data.owner_id ?? context.userId,
        start_date: data.start_date ?? null,
        due_date: data.due_date ?? null,
        created_by: context.userId,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as { id: string }).id };
  });

// ---------------------------------------------------------------
// updateProject
// ---------------------------------------------------------------
export const updateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(2).max(200).optional(),
        description: z.string().nullable().optional(),
        status: z.enum(PROJECT_STATUS_VALUES).optional(),
        owner_id: z.string().uuid().nullable().optional(),
        start_date: z.string().nullable().optional(),
        due_date: z.string().nullable().optional(),
        proposal_id: z.string().uuid().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("projects").update(patch as never).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------
// deleteProject (admin apenas — via RLS)
// ---------------------------------------------------------------
export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("projects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------
// getProjectsOverview — para dashboard e listas
// ---------------------------------------------------------------
export const getProjectsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProjectsOverview> => {
    const { data, error } = await context.supabase
      .from("projects")
      .select("status, due_date, completed_at");
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { status: ProjectStatus; due_date: string | null; completed_at: string | null }[];
    const today = new Date().toISOString().slice(0, 10);

    const overview: ProjectsOverview = {
      total: rows.length,
      ativos: 0,
      emDesenvolvimento: 0,
      aguardandoCliente: 0,
      concluidos: 0,
      cancelados: 0,
      atrasados: 0,
    };
    for (const r of rows) {
      if (r.status === "concluido") overview.concluidos++;
      else if (r.status === "cancelado") overview.cancelados++;
      else if (PROJECT_ACTIVE_STATUSES.includes(r.status)) overview.ativos++;

      if (r.status === "em_desenvolvimento") overview.emDesenvolvimento++;
      if (r.status === "aguardando_cliente") overview.aguardandoCliente++;
      if (
        r.due_date &&
        !r.completed_at &&
        r.status !== "concluido" &&
        r.status !== "cancelado" &&
        r.due_date < today
      ) {
        overview.atrasados++;
      }
    }
    return overview;
  });

// ---------------------------------------------------------------
// getClientsOverview — contagens simples
// ---------------------------------------------------------------
export const getClientsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("clients").select("status");
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { status: "ativo" | "inativo" | "arquivado" }[];
    return {
      total: rows.length,
      ativos: rows.filter((r) => r.status === "ativo").length,
      inativos: rows.filter((r) => r.status === "inativo").length,
      arquivados: rows.filter((r) => r.status === "arquivado").length,
    };
  });
