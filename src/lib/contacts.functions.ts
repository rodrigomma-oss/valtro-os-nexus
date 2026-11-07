/**
 * Sprint 10 — Server functions do domínio de Contatos operacionais.
 * Todas as funções são autenticadas (requireSupabaseAuth). RLS controla a
 * autorização real; a validação Zod garante shape/limites.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  LeadContact,
  LeadContactChannel,
  LeadContactResult,
  LeadContactType,
} from "@/types/lead";

const CHANNEL_VALUES = [
  "whatsapp",
  "email",
  "telefone",
  "reuniao",
  "outro",
] as const satisfies readonly LeadContactChannel[];

const TYPE_VALUES = [
  "primeiro_contato",
  "follow_up",
  "envio_briefing",
  "lembrete",
  "apresentacao",
  "proposta",
  "outro",
] as const satisfies readonly LeadContactType[];

const RESULT_VALUES = [
  "sem_resposta",
  "respondido",
  "interessado",
  "nao_interessado",
  "agendado",
  "concluido",
] as const satisfies readonly LeadContactResult[];

interface RawContact {
  id: string;
  lead_id: string;
  channel: LeadContactChannel;
  type: LeadContactType;
  result: LeadContactResult;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  author: { full_name: string | null } | null;
}

const CONTACT_SELECT =
  "id, lead_id, channel, type, result, notes, created_by, created_at, updated_at, author:profiles!lead_contacts_created_by_profile_fkey(full_name)";

function mapContact(row: RawContact): LeadContact {
  return {
    id: row.id,
    lead_id: row.lead_id,
    channel: row.channel,
    type: row.type,
    result: row.result,
    notes: row.notes,
    created_by: row.created_by,
    created_by_name: row.author?.full_name ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// =============================================================
// listLeadContacts — viewer/operator/admin (conforme RLS)
// =============================================================
export const listLeadContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ lead_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("lead_contacts")
      .select(CONTACT_SELECT)
      .eq("lead_id", data.lead_id)
      .order("created_at", { ascending: false })
      .returns<RawContact[]>();
    if (error) throw new Error(error.message);
    return (rows ?? []).map(mapContact);
  });

// =============================================================
// createLeadContact — operator+ (RLS bloqueia viewer)
// =============================================================
const createContactSchema = z.object({
  lead_id: z.string().uuid(),
  channel: z.enum(CHANNEL_VALUES),
  type: z.enum(TYPE_VALUES),
  result: z.enum(RESULT_VALUES).default("sem_resposta"),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const createLeadContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => createContactSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("lead_contacts")
      .insert({
        lead_id: data.lead_id,
        channel: data.channel,
        type: data.type,
        result: data.result,
        notes: data.notes ?? null,
        created_by: context.userId,
      })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { id: row?.id ?? null };
  });

// =============================================================
// updateLeadContact — autor operator ou admin (RLS)
// =============================================================
const updateContactSchema = z.object({
  id: z.string().uuid(),
  channel: z.enum(CHANNEL_VALUES).optional(),
  type: z.enum(TYPE_VALUES).optional(),
  result: z.enum(RESULT_VALUES).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const updateLeadContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => updateContactSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase
      .from("lead_contacts")
      .update(patch)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =============================================================
// deleteLeadContact — autor operator ou admin (RLS)
// =============================================================
export const deleteLeadContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("lead_contacts")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
