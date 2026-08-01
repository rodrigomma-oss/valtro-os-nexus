/**
 * Gestão de Bugs — Server Functions (VOS-001D.1).
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Bug, BugEvent, BugStatus, BugSeverity, BugCategory, BugEnvironment } from "@/types/bug";

const STATUS = ["new", "confirmed", "in_progress", "waiting_deploy", "fixed", "closed", "wont_fix", "duplicate"] as const;
const SEVERITY = ["low", "normal", "high", "critical", "blocker"] as const;
const CATEGORY = ["ui_ux", "backend", "frontend", "security", "performance", "localization", "data_integrity", "other"] as const;
const ENVIRONMENT = ["production", "staging", "development", "local"] as const;

const BUG_SELECT =
  "id, code, title, description, saas_product_id, ticket_id, reported_by, owner_id, status, severity, category, environment, affected_version, fixed_version, request_id, external_reference, created_at, updated_at, confirmed_at, fixed_at, closed_at";

type RawBug = Omit<Bug, "product_name" | "reported_by_name" | "owner_name">;

function requestId(): string | null {
  try {
    return getRequestHeader("x-request-id") ?? null;
  } catch {
    return null;
  }
}

function log(action: string, payload: Record<string, unknown>) {
  console.info(
    JSON.stringify({ scope: "os.bugs", action, request_id: requestId(), ...payload }),
  );
}

async function hydrate(supabase: any, rows: RawBug[]): Promise<Bug[]> {
  const productIds = Array.from(new Set(rows.map((r) => r.saas_product_id).filter(Boolean)));
  const reporterIds = Array.from(new Set(rows.map((r) => r.reported_by).filter(Boolean)));
  const ownerIds = Array.from(new Set(rows.map((r) => r.owner_id).filter(Boolean) as string[]));

  const [products, profiles] = await Promise.all([
    productIds.length
      ? supabase.from("saas_products").select("id, name").in("id", productIds)
      : Promise.resolve({ data: [] }),
    [...reporterIds, ...ownerIds].length
      ? supabase.from("profiles").select("id, full_name").in("id", [...new Set([...reporterIds, ...ownerIds])])
      : Promise.resolve({ data: [] }),
  ]);

  const pMap = new Map<string, string>((products.data ?? []).map((p: any) => [p.id, p.name]));
  const uMap = new Map<string, string>((profiles.data ?? []).map((u: any) => [u.id, u.full_name]));

  return rows.map((r) => ({
    ...r,
    product_name: r.saas_product_id ? pMap.get(r.saas_product_id) ?? null : null,
    reported_by_name: r.reported_by ? uMap.get(r.reported_by) ?? null : null,
    owner_name: r.owner_id ? uMap.get(r.owner_id) ?? null : null,
  }));
}

// ---------------------------------------------------------------
// listBugs
// ---------------------------------------------------------------
export const listBugs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        code: z.string().optional(),
        q: z.string().optional(),
        request_id: z.string().optional(),
        status: z.enum(STATUS).optional(),
        severity: z.enum(SEVERITY).optional(),
        category: z.enum(CATEGORY).optional(),
        environment: z.enum(ENVIRONMENT).optional(),
        saas_product_id: z.string().uuid().optional(),
        owner_id: z.string().uuid().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<{ items: Bug[]; total: number }> => {
    let query = context.supabase
      .from("bugs")
      .select(BUG_SELECT, { count: "exact" })
      .order("updated_at", { ascending: false });

    if (data.code) query = query.ilike("code", `%${data.code}%`);
    if (data.request_id) query = query.eq("request_id", data.request_id);
    if (data.status) query = query.eq("status", data.status);
    if (data.severity) query = query.eq("severity", data.severity);
    if (data.category) query = query.eq("category", data.category);
    if (data.environment) query = query.eq("environment", data.environment);
    if (data.saas_product_id) query = query.eq("saas_product_id", data.saas_product_id);
    if (data.owner_id) query = query.eq("owner_id", data.owner_id);
    
    if (data.q) {
      const term = `%${data.q}%`;
      query = query.or(`title.ilike.${term},description.ilike.${term}`);
    }

    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    
    const { data: rows, count, error } = await query.range(from, to);
    if (error) throw new Error(error.message);

    const items = await hydrate(context.supabase, (rows ?? []) as unknown as RawBug[]);
    log("listBugs", { count: items.length, total: count, user_id: context.userId });
    
    return { items, total: count ?? 0 };
  });

// ---------------------------------------------------------------
// getBug
// ---------------------------------------------------------------
export const getBug = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ bug: Bug; events: BugEvent[] }> => {
    const { data: row, error } = await context.supabase
      .from("bugs")
      .select(BUG_SELECT)
      .eq("id", data.id)
      .maybeSingle();
    
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Bug não encontrado.");

    const { data: evs, error: evErr } = await context.supabase
      .from("bug_events")
      .select("id, bug_id, type, description, metadata, created_by, created_at")
      .eq("bug_id", data.id)
      .order("created_at", { ascending: false });
    
    if (evErr) throw new Error(evErr.message);

    const evRows = (evs ?? []) as any[];
    const authorIds = Array.from(new Set(evRows.map((e) => e.created_by).filter(Boolean) as string[]));
    let names: Record<string, string | null> = {};
    
    if (authorIds.length > 0) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", authorIds);
      names = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name]));
    }

    const [bug] = await hydrate(context.supabase, [row as unknown as RawBug]);
    const events: BugEvent[] = evRows.map((e) => ({
      ...e,
      created_by_name: e.created_by ? names[e.created_by] ?? null : null,
    }));

    log("getBug", { bug_id: data.id, user_id: context.userId });
    return { bug: bug!, events };
  });

// ---------------------------------------------------------------
// createBug
// ---------------------------------------------------------------
export const createBug = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      title: z.string().min(5).max(200),
      description: z.string().min(10),
      saas_product_id: z.string().uuid(),
      ticket_id: z.string().uuid().nullable().optional(),
      severity: z.enum(SEVERITY).default("normal"),
      category: z.enum(CATEGORY).default("other"),
      environment: z.enum(ENVIRONMENT).default("production"),
      affected_version: z.string().nullable().optional(),
      request_id: z.string().nullable().optional(),
      external_reference: z.string().nullable().optional(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("bugs")
      .insert({
        ...data,
        status: "new",
        reported_by: context.userId,
      } as any)
      .select("id, code")
      .single();

    if (error) throw new Error(error.message);

    const created = row as { id: string; code: string };
    
    log("createBug", { bug_id: created.id, code: created.code, user_id: context.userId });
    return created;
  });

// ---------------------------------------------------------------
// updateBug
// ---------------------------------------------------------------
export const updateBug = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      id: z.string().uuid(),
      title: z.string().min(5).max(200).optional(),
      description: z.string().min(10).optional(),
      severity: z.enum(SEVERITY).optional(),
      category: z.enum(CATEGORY).optional(),
      environment: z.enum(ENVIRONMENT).optional(),
      affected_version: z.string().nullable().optional(),
      fixed_version: z.string().nullable().optional(),
      request_id: z.string().nullable().optional(),
      external_reference: z.string().nullable().optional(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    
    const { error } = await context.supabase
      .from("bugs")
      .update(patch as any)
      .eq("id", id);

    if (error) throw new Error(error.message);

    log("updateBug", { bug_id: id, user_id: context.userId });
    return { ok: true };
  });

// ---------------------------------------------------------------
// assignBug
// ---------------------------------------------------------------
export const assignBug = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), owner_id: z.string().uuid().nullable() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("bugs")
      .update({ owner_id: data.owner_id } as any)
      .eq("id", data.id);

    if (error) throw new Error(error.message);

    log("assignBug", { bug_id: data.id, owner_id: data.owner_id, user_id: context.userId });
    return { ok: true };
  });

// ---------------------------------------------------------------
// changeBugStatus
// ---------------------------------------------------------------
export const changeBugStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), status: z.enum(STATUS) }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("bugs")
      .update({ status: data.status } as any)
      .eq("id", data.id);

    if (error) throw new Error(error.message);

    log("changeBugStatus", { bug_id: data.id, status: data.status, user_id: context.userId });
    return { ok: true };
  });

// ---------------------------------------------------------------
// markBugFixed
// ---------------------------------------------------------------
export const markBugFixed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), fixed_version: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("bugs")
      .update({ status: "fixed", fixed_version: data.fixed_version } as any)
      .eq("id", data.id);

    if (error) throw new Error(error.message);

    log("markBugFixed", { bug_id: data.id, version: data.fixed_version, user_id: context.userId });
    return { ok: true };
  });

// ---------------------------------------------------------------
// closeBug
// ---------------------------------------------------------------
export const closeBug = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("bugs")
      .update({ status: "closed" } as any)
      .eq("id", data.id);

    if (error) throw new Error(error.message);

    log("closeBug", { bug_id: data.id, user_id: context.userId });
    return { ok: true };
  });

// ---------------------------------------------------------------
// reopenBug
// ---------------------------------------------------------------
export const reopenBug = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("bugs")
      .update({ status: "in_progress" } as any)
      .eq("id", data.id);

    if (error) throw new Error(error.message);

    log("reopenBug", { bug_id: data.id, user_id: context.userId });
    return { ok: true };
  });

// ---------------------------------------------------------------
// listBugEvents
// ---------------------------------------------------------------
export const listBugEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ bugId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<BugEvent[]> => {
    const { data: evs, error } = await context.supabase
      .from("bug_events")
      .select("id, bug_id, type, description, metadata, created_by, created_at")
      .eq("bug_id", data.bugId)
      .order("created_at", { ascending: false });
    
    if (error) throw new Error(error.message);

    const evRows = (evs ?? []) as any[];
    const authorIds = Array.from(new Set(evRows.map((e) => e.created_by).filter(Boolean) as string[]));
    let names: Record<string, string | null> = {};
    
    if (authorIds.length > 0) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", authorIds);
      names = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name]));
    }

    return evRows.map((e) => ({
      ...e,
      created_by_name: e.created_by ? names[e.created_by] ?? null : null,
    }));
  });
