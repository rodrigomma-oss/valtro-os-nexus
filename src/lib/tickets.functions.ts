/**
 * Atendimento / Chamados — Server Functions (VOS-001C).
 *
 * Todas as funções usam a autenticação existente (requireSupabaseAuth) e
 * respeitam as policies de RLS (admin/operator escrevem, viewer apenas lê).
 * Não há caminho de DELETE — encerramento é feito por status.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Ticket, TicketEvent } from "@/types/ticket";

const STATUS = ["open", "waiting_customer", "waiting_internal", "resolved", "closed", "cancelled"] as const;
const PRIORITY = ["low", "normal", "high", "urgent"] as const;
const CATEGORY = ["support", "question", "commercial", "billing", "technical", "other"] as const;
const SOURCE = ["admin", "portal", "email", "api"] as const;

const TICKET_SELECT =
  "id, protocol, title, description, product_id, client_id, lead_id, created_by, owner_id, status, priority, category, source, created_at, updated_at, closed_at";

type RawTicket = Omit<Ticket, "product_name" | "client_name" | "lead_name" | "owner_name">;

function requestId(): string | null {
  try {
    return getRequestHeader("x-request-id") ?? null;
  } catch {
    return null;
  }
}

function log(action: string, payload: Record<string, unknown>) {
  console.info(
    JSON.stringify({ scope: "os.tickets", action, request_id: requestId(), ...payload }),
  );
}

async function hydrate(supabase: any, rows: RawTicket[]): Promise<Ticket[]> {
  const productIds = Array.from(new Set(rows.map((r) => r.product_id).filter(Boolean) as string[]));
  const clientIds = Array.from(new Set(rows.map((r) => r.client_id).filter(Boolean) as string[]));
  const leadIds = Array.from(new Set(rows.map((r) => r.lead_id).filter(Boolean) as string[]));
  const ownerIds = Array.from(new Set(rows.map((r) => r.owner_id).filter(Boolean) as string[]));

  const [products, clients, leads, owners] = await Promise.all([
    productIds.length
      ? supabase.from("services").select("id, name").in("id", productIds)
      : Promise.resolve({ data: [] }),
    clientIds.length
      ? supabase.from("clients").select("id, company_name").in("id", clientIds)
      : Promise.resolve({ data: [] }),
    leadIds.length
      ? supabase.from("leads").select("id, company_name").in("id", leadIds)
      : Promise.resolve({ data: [] }),
    ownerIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", ownerIds)
      : Promise.resolve({ data: [] }),
  ]);

  const pMap = new Map<string, string>((products.data ?? []).map((p: any) => [p.id, p.name]));
  const cMap = new Map<string, string>((clients.data ?? []).map((c: any) => [c.id, c.company_name]));
  const lMap = new Map<string, string>((leads.data ?? []).map((l: any) => [l.id, l.company_name]));
  const oMap = new Map<string, string | null>((owners.data ?? []).map((o: any) => [o.id, o.full_name]));

  return rows.map((r) => ({
    ...r,
    product_name: r.product_id ? pMap.get(r.product_id) ?? null : null,
    client_name: r.client_id ? cMap.get(r.client_id) ?? null : null,
    lead_name: r.lead_id ? lMap.get(r.lead_id) ?? null : null,
    owner_name: r.owner_id ? oMap.get(r.owner_id) ?? null : null,
  }));
}

// ---------------------------------------------------------------
// listTickets
// ---------------------------------------------------------------
export const listTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        status: z.enum(STATUS).optional(),
        priority: z.enum(PRIORITY).optional(),
        owner_id: z.string().uuid().optional(),
        product_id: z.string().uuid().optional(),
        q: z.string().trim().max(120).optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<Ticket[]> => {
    let query = context.supabase
      .from("tickets")
      .select(TICKET_SELECT)
      .order("updated_at", { ascending: false });

    if (data.status) query = query.eq("status", data.status);
    if (data.priority) query = query.eq("priority", data.priority);
    if (data.owner_id) query = query.eq("owner_id", data.owner_id);
    if (data.product_id) query = query.eq("product_id", data.product_id);
    if (data.q && data.q.length > 0) {
      const term = `%${data.q}%`;
      query = query.or(`title.ilike.${term},protocol.ilike.${term}`);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    log("listTickets", { count: rows?.length ?? 0, user_id: context.userId });
    return hydrate(context.supabase, (rows ?? []) as unknown as RawTicket[]);
  });

// ---------------------------------------------------------------
// getTicket (com timeline)
// ---------------------------------------------------------------
export const getTicket = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ ticket: Ticket; events: TicketEvent[] }> => {
    const { data: row, error } = await context.supabase
      .from("tickets")
      .select(TICKET_SELECT)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Chamado não encontrado.");

    const { data: evs, error: evErr } = await context.supabase
      .from("ticket_events")
      .select("id, ticket_id, type, description, metadata, created_by, created_at")
      .eq("ticket_id", data.id)
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

    const [ticket] = await hydrate(context.supabase, [row as unknown as RawTicket]);
    const events: TicketEvent[] = evRows.map((e) => ({
      ...e,
      created_by_name: e.created_by ? names[e.created_by] ?? null : null,
    }));
    log("getTicket", { ticket_id: data.id, user_id: context.userId });
    return { ticket: ticket!, events };
  });

// ---------------------------------------------------------------
// createTicket
// ---------------------------------------------------------------
export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        title: z.string().trim().min(4).max(200),
        description: z.string().trim().max(5000).optional().nullable(),
        product_id: z.string().uuid().nullable().optional(),
        category: z.enum(CATEGORY).default("support"),
        priority: z.enum(PRIORITY).default("normal"),
        client_id: z.string().uuid().nullable().optional(),
        lead_id: z.string().uuid().nullable().optional(),
        owner_id: z.string().uuid().nullable().optional(),
        source: z.enum(SOURCE).default("admin"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ id: string; protocol: string }> => {
    const { data: row, error } = await context.supabase
      .from("tickets")
      .insert({
        title: data.title,
        description: data.description ?? null,
        product_id: data.product_id ?? null,
        client_id: data.client_id ?? null,
        lead_id: data.lead_id ?? null,
        owner_id: data.owner_id ?? null,
        category: data.category,
        priority: data.priority,
        source: data.source,
        status: "open",
        created_by: context.userId,
      } as never)
      .select("id, protocol")
      .single();
    if (error) throw new Error(error.message);
    const created = row as unknown as { id: string; protocol: string };
    log("createTicket", { ticket_id: created.id, protocol: created.protocol, user_id: context.userId });
    return created;
  });

// ---------------------------------------------------------------
// updateTicket
// ---------------------------------------------------------------
export const updateTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().trim().min(4).max(200).optional(),
        description: z.string().trim().max(5000).nullable().optional(),
        product_id: z.string().uuid().nullable().optional(),
        client_id: z.string().uuid().nullable().optional(),
        lead_id: z.string().uuid().nullable().optional(),
        category: z.enum(CATEGORY).optional(),
        priority: z.enum(PRIORITY).optional(),
        status: z.enum(STATUS).optional(),
        owner_id: z.string().uuid().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("tickets").update(patch as never).eq("id", id);
    if (error) throw new Error(error.message);
    log("updateTicket", { ticket_id: id, fields: Object.keys(patch), user_id: context.userId });
    return { ok: true };
  });

// ---------------------------------------------------------------
// assignTicket
// ---------------------------------------------------------------
export const assignTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ id: z.string().uuid(), owner_id: z.string().uuid().nullable() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("tickets")
      .update({ owner_id: data.owner_id } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    log("assignTicket", { ticket_id: data.id, owner_id: data.owner_id, user_id: context.userId });
    return { ok: true };
  });

// ---------------------------------------------------------------
// closeTicket
// ---------------------------------------------------------------
export const closeTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["closed", "cancelled"]).default("closed"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("tickets")
      .update({ status: data.status } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    log("closeTicket", { ticket_id: data.id, status: data.status, user_id: context.userId });
    return { ok: true };
  });

// ---------------------------------------------------------------
// reopenTicket
// ---------------------------------------------------------------
export const reopenTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("tickets")
      .update({ status: "open" } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    log("reopenTicket", { ticket_id: data.id, user_id: context.userId });
    return { ok: true };
  });
