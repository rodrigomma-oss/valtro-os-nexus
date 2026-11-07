/**
 * Clientes — Server Functions (Sprint 12).
 * Reuso integral do modelo de RLS: leitura autenticada, escrita admin/operator.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Client, ClientStatus } from "@/types/client";

const CLIENT_STATUS_VALUES = ["ativo", "inativo", "arquivado"] as const satisfies readonly ClientStatus[];

const CLIENT_SELECT =
  "id, lead_id, company_name, contact_name, email, phone, city, state, segment, owner_id, status, notes, archived_at, created_by, created_at, updated_at";

interface RawClient {
  id: string;
  lead_id: string | null;
  company_name: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  segment: string | null;
  owner_id: string | null;
  status: ClientStatus;
  notes: string | null;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

async function hydrate(supabase: any, row: RawClient): Promise<Client> {
  let owner_name: string | null = null;
  if (row.owner_id) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", row.owner_id)
      .maybeSingle();
    owner_name = data?.full_name ?? null;
  }
  return { ...row, owner_name };
}

// ---------------------------------------------------------------
// listClients
// ---------------------------------------------------------------
export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        status: z.enum(CLIENT_STATUS_VALUES).optional(),
        q: z.string().trim().optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<Client[]> => {
    let q = context.supabase.from("clients").select(CLIENT_SELECT).order("created_at", { ascending: false });
    if (data.status) q = q.eq("status", data.status);
    if (data.q && data.q.length > 0) {
      const term = `%${data.q}%`;
      q = q.or(
        `company_name.ilike.${term},contact_name.ilike.${term},email.ilike.${term},city.ilike.${term}`,
      );
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as unknown as RawClient[];
    return await Promise.all(list.map((r) => hydrate(context.supabase, r)));
  });

// ---------------------------------------------------------------
// getClient
// ---------------------------------------------------------------
export const getClient = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<Client> => {
    const { data: row, error } = await context.supabase
      .from("clients")
      .select(CLIENT_SELECT)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Cliente não encontrado.");
    return hydrate(context.supabase, row as unknown as RawClient);
  });

// ---------------------------------------------------------------
// updateClient
// ---------------------------------------------------------------
export const updateClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        company_name: z.string().trim().min(2).max(200).optional(),
        contact_name: z.string().trim().min(2).max(200).optional(),
        email: z.string().email().nullable().optional(),
        phone: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        state: z.string().nullable().optional(),
        segment: z.string().nullable().optional(),
        owner_id: z.string().uuid().nullable().optional(),
        status: z.enum(CLIENT_STATUS_VALUES).optional(),
        notes: z.string().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase
      .from("clients")
      .update(patch as never)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------
// archiveClient
// ---------------------------------------------------------------
export const archiveClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("clients")
      .update({ status: "arquivado", archived_at: new Date().toISOString() } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------
// convertLeadToClient — idempotente via RPC SECURITY DEFINER
// ---------------------------------------------------------------
export const convertLeadToClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ lead_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ client_id: string }> => {
    const { data: id, error } = await (context.supabase as any).rpc("convert_lead_to_client", {
      _lead_id: data.lead_id,
    });
    if (error) throw new Error(error.message);
    return { client_id: id as string };
  });
