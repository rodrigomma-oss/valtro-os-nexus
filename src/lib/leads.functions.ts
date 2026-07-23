import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Lead, LeadEvent, LeadNote, LeadStatus, NextAction } from "@/types/lead";
import {
  INTEREST_LABEL,
  NEXT_ACTION_LABEL,
  STATUS_LABEL,
} from "@/types/lead";

// Skip Supabase's heavy select-string parsing at the type level.
const sel = (s: string): string => s;

const LEAD_STATUS_VALUES = [
  "novo",
  "em_triagem",
  "contato",
  "qualificado",
  "aguardando_briefing",
  "briefing_enviado",
  "em_analise",
  "proposta",
  "ganho",
  "perdido",
  "descartado",
] as const;

const LEAD_SOURCE_VALUES = [
  "instagram",
  "indicacao",
  "site",
  "google",
  "evento",
  "outbound",
  "diagnostico",
  "manual",
] as const;

const NEXT_ACTION_VALUES = [
  "entrar_em_contato",
  "enviar_briefing_projeto",
  "enviar_briefing_loja",
  "apresentar_pricing",
  "avaliar_parceria",
  "preparar_proposta",
  "aguardar_retorno",
  "descartar",
] as const;

interface RawLead {
  id: string;
  company_name: string;
  contact_name: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  city: string | null;
  state: string | null;
  segment: string | null;
  source: Lead["source"];
  status: LeadStatus;
  service_type: Lead["service_type"];
  owner_id: string | null;
  next_action: NextAction | null;
  triage_notes: string | null;
  triage_started_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  owner: { full_name: string | null } | null;
}

function mapLead(row: RawLead): Lead {
  return {
    id: row.id,
    company_name: row.company_name,
    contact_name: row.contact_name,
    phone: row.phone,
    email: row.email,
    instagram: row.instagram,
    city: row.city,
    state: row.state,
    segment: row.segment,
    source: row.source,
    status: row.status,
    service_type: row.service_type,
    owner_id: row.owner_id,
    owner_name: row.owner?.full_name ?? null,
    next_action: row.next_action,
    triage_notes: row.triage_notes,
    triage_started_at: row.triage_started_at,
    archived_at: row.archived_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const LEAD_SELECT = sel(
  "id, company_name, contact_name, phone, email, instagram, city, state, segment, source, status, service_type, owner_id, next_action, triage_notes, triage_started_at, archived_at, created_at, updated_at, owner:profiles!leads_owner_id_profile_fkey(full_name)",
);



// =============================================================
// listLeads
// =============================================================
export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        includeArchived: z.boolean().optional().default(false),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("leads").select(LEAD_SELECT);
    if (!data.includeArchived) q = q.is("archived_at", null);
    const { data: rows, error } = await q
      .order("created_at", { ascending: false })
      .returns<RawLead[]>();
    if (error) throw new Error(error.message);
    return (rows ?? []).map(mapLead);
  });

// =============================================================
// getLead (with events + notes)
// =============================================================
export const getLead = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: leadRow, error: leadErr } = await context.supabase
      .from("leads")
      .select(LEAD_SELECT)
      .eq("id", data.id)
      .maybeSingle()
      .returns<RawLead | null>();
    if (leadErr) throw new Error(leadErr.message);
    if (!leadRow) return null;

    const eventsSel = sel(
      "id, lead_id, type, description, created_by, created_at, author:profiles!lead_events_created_by_profile_fkey(full_name)",
    );
    const notesSel = sel(
      "id, lead_id, content, created_by, created_at, updated_at, author:profiles!lead_notes_created_by_profile_fkey(full_name)",
    );

    const [eventsRes, notesRes] = await Promise.all([
      context.supabase
        .from("lead_events")
        .select(eventsSel)
        .eq("lead_id", data.id)
        .order("created_at", { ascending: false })
        .returns<
          Array<{
            id: string;
            lead_id: string;
            type: LeadEvent["type"];
            description: string | null;
            created_by: string | null;
            created_at: string;
            author: { full_name: string | null } | null;
          }>
        >(),
      context.supabase
        .from("lead_notes")
        .select(notesSel)
        .eq("lead_id", data.id)
        .order("created_at", { ascending: false })
        .returns<
          Array<{
            id: string;
            lead_id: string;
            content: string;
            created_by: string | null;
            created_at: string;
            updated_at: string;
            author: { full_name: string | null } | null;
          }>
        >(),
    ]);
    if (eventsRes.error) throw new Error(eventsRes.error.message);
    if (notesRes.error) throw new Error(notesRes.error.message);

    const events: LeadEvent[] = (eventsRes.data ?? []).map((e) => ({
      id: e.id,
      lead_id: e.lead_id,
      type: e.type,
      description: e.description,
      created_by: e.created_by,
      created_by_name: e.author?.full_name ?? null,
      created_at: e.created_at,
    }));
    const notes: LeadNote[] = (notesRes.data ?? []).map((n) => ({
      id: n.id,
      lead_id: n.lead_id,
      content: n.content,
      created_by: n.created_by,
      created_by_name: n.author?.full_name ?? null,
      created_at: n.created_at,
      updated_at: n.updated_at,
    }));

    return { lead: mapLead(leadRow), events, notes };
  });

// =============================================================
// createLead
// =============================================================
const SERVICE_TYPE_VALUES = [
  "nao_definido",
  "desenvolvimento_projeto",
  "gestao_shopee",
  "gestao_mercadolivre",
  "gestao_amazon",
  "gestao_multicanal",
  "consultoria",
  "diagnostico",
  "trafego_pago",
  "outro",
] as const;

const createLeadSchema = z.object({
  company_name: z.string().trim().min(1, "Empresa é obrigatória"),
  contact_name: z.string().trim().min(1, "Contato é obrigatório"),
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")).nullable(),
  instagram: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  state: z.string().trim().optional().nullable(),
  segment: z.string().trim().optional().nullable(),
  source: z.enum(LEAD_SOURCE_VALUES).default("manual"),
  status: z.enum(LEAD_STATUS_VALUES).default("novo"),
  service_type: z.enum(SERVICE_TYPE_VALUES).default("nao_definido"),
});

export const createLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => createLeadSchema.parse(data))
  .handler(async ({ data, context }) => {
    const insert = {
      company_name: data.company_name,
      contact_name: data.contact_name,
      phone: data.phone || null,
      email: data.email ? data.email : null,
      instagram: data.instagram || null,
      city: data.city || null,
      state: data.state || null,
      segment: data.segment || null,
      source: data.source,
      status: data.status,
      service_type: data.service_type,
      owner_id: context.userId,
      created_by: context.userId,
    };
    const { data: row, error } = await context.supabase
      .from("leads")
      .insert(insert)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { id: row?.id ?? null };
  });

// =============================================================
// updateLead (fields + status)
// =============================================================
const updateLeadSchema = z.object({
  id: z.string().uuid(),
  company_name: z.string().trim().min(1).optional(),
  contact_name: z.string().trim().min(1).optional(),
  phone: z.string().trim().nullable().optional(),
  email: z.string().trim().email().nullable().or(z.literal("")).optional(),
  instagram: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  state: z.string().trim().nullable().optional(),
  segment: z.string().trim().nullable().optional(),
  source: z.enum(LEAD_SOURCE_VALUES).optional(),
  status: z.enum(LEAD_STATUS_VALUES).optional(),
});

export const updateLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => updateLeadSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("leads").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =============================================================
// archiveLead (soft delete)
// =============================================================
export const archiveLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("leads")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =============================================================
// Notes
// =============================================================
export const addLeadNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        lead_id: z.string().uuid(),
        content: z.string().trim().min(1, "Escreva uma observação"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("lead_notes").insert({
      lead_id: data.lead_id,
      content: data.content,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    // registra evento
    await context.supabase.from("lead_events").insert({
      lead_id: data.lead_id,
      type: "observacao_adicionada",
      description: "Observação adicionada.",
      created_by: context.userId,
    });
    return { ok: true };
  });

export const deleteLeadNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ id: z.string().uuid(), lead_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("lead_notes")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("lead_events").insert({
      lead_id: data.lead_id,
      type: "observacao_removida",
      description: "Observação removida.",
      created_by: context.userId,
    });
    return { ok: true };
  });

// =============================================================
// KPIs (dashboard operations)
// =============================================================
export const getLeadsKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("leads")
      .select("status")
      .is("archived_at", null)
      .returns<Array<{ status: LeadStatus }>>();
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const by = (s: LeadStatus) => rows.filter((r) => r.status === s).length;
    const total = rows.length;
    const novos = by("novo");
    const emTriagem = by("em_triagem");
    const emAndamento =
      by("contato") + by("qualificado") + by("proposta") +
      by("aguardando_briefing") + by("briefing_enviado") + by("em_analise");
    const ganhos = by("ganho");
    const conversao = total > 0 ? Math.round((ganhos / total) * 100) : 0;
    return { total, novos, emTriagem, emAndamento, ganhos, conversao };
  });

// =============================================================
// Sprint 9 — Triagem comercial
// =============================================================

const SERVICE_TYPE_VALUES_TRIAGE = [
  "nao_definido",
  "desenvolvimento_projeto",
  "gestao_shopee",
  "gestao_mercadolivre",
  "gestao_amazon",
  "gestao_multicanal",
  "consultoria",
  "diagnostico",
  "trafego_pago",
  "outro",
] as const;

async function insertEvent(
  supabase: any,
  leadId: string,
  type: string,
  description: string,
  createdBy: string,
  metadata?: Record<string, unknown>,
) {
  await supabase.from("lead_events").insert({
    lead_id: leadId,
    type,
    description,
    created_by: createdBy,
    metadata: metadata ?? null,
  });
}

// Inicia a triagem: seta status=em_triagem e triage_started_at=now(), se ainda não iniciada
export const startTriage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: current, error: readErr } = await context.supabase
      .from("leads")
      .select("id, status, triage_started_at")
      .eq("id", data.id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!current) throw new Error("Lead não encontrado.");

    const patch: Record<string, unknown> = {};
    if (!current.triage_started_at) patch.triage_started_at = new Date().toISOString();
    if (current.status === "novo") patch.status = "em_triagem";
    if (Object.keys(patch).length === 0) return { ok: true, already: true };

    const { error } = await context.supabase
      .from("leads")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await insertEvent(
      context.supabase,
      data.id,
      "triagem_iniciada",
      "Triagem comercial iniciada.",
      context.userId,
    );
    return { ok: true };
  });

// Atualiza campos de triagem: next_action, triage_notes, service_type (interesse), owner_id
const updateTriageSchema = z.object({
  id: z.string().uuid(),
  next_action: z.enum(NEXT_ACTION_VALUES).nullable().optional(),
  triage_notes: z.string().trim().nullable().optional(),
  service_type: z.enum(SERVICE_TYPE_VALUES_TRIAGE).optional(),
  owner_id: z.string().uuid().nullable().optional(),
});

export const updateTriage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => updateTriageSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    if (Object.keys(patch).length === 0) return { ok: true };

    const { data: before, error: readErr } = await context.supabase
      .from("leads")
      .select("service_type, next_action, owner_id")
      .eq("id", id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!before) throw new Error("Lead não encontrado.");

    const { error } = await context.supabase.from("leads").update(patch).eq("id", id);
    if (error) throw new Error(error.message);

    // Eventos de auditoria (mensagens amigáveis)
    if (patch.service_type && patch.service_type !== before.service_type) {
      await insertEvent(
        context.supabase,
        id,
        "interesse_alterado",
        `Interesse alterado de "${INTEREST_LABEL[before.service_type as keyof typeof INTEREST_LABEL] ?? before.service_type}" para "${INTEREST_LABEL[patch.service_type]}".`,
        context.userId,
        { from: before.service_type, to: patch.service_type },
      );
    }
    if (patch.next_action !== undefined && patch.next_action !== before.next_action) {
      const label = patch.next_action ? NEXT_ACTION_LABEL[patch.next_action] : "—";
      await insertEvent(
        context.supabase,
        id,
        "proxima_acao_alterada",
        `Próxima ação definida: ${label}.`,
        context.userId,
        { from: before.next_action, to: patch.next_action },
      );
    }
    if (patch.owner_id !== undefined && patch.owner_id !== before.owner_id) {
      await insertEvent(
        context.supabase,
        id,
        "responsavel_alterado",
        patch.owner_id ? "Responsável atualizado." : "Responsável removido.",
        context.userId,
        { from: before.owner_id, to: patch.owner_id },
      );
    }
    return { ok: true };
  });

// Descartar oportunidade
export const discardLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        reason: z.string().trim().max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("leads")
      .update({ status: "descartado", next_action: "descartar" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await insertEvent(
      context.supabase,
      data.id,
      "oportunidade_descartada",
      data.reason
        ? `Oportunidade descartada durante a triagem: ${data.reason}`
        : "Oportunidade descartada durante a triagem.",
      context.userId,
    );
    return { ok: true };
  });

// Converter (marcar como ganho)
export const convertLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("leads")
      .update({ status: "ganho" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await insertEvent(
      context.supabase,
      data.id,
      "oportunidade_convertida",
      "Oportunidade convertida.",
      context.userId,
    );
    return { ok: true };
  });

// Lista de usuários atribuíveis (operator/admin) — para o seletor de responsável
export const listAssignableUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("user_id, role, profile:profiles!user_roles_user_id_fkey(id, full_name)")
      .in("role", ["admin", "operator"])
      .returns<
        Array<{
          user_id: string;
          role: string;
          profile: { id: string; full_name: string | null } | null;
        }>
      >();
    if (error) throw new Error(error.message);
    const map = new Map<string, { id: string; full_name: string | null }>();
    for (const r of data ?? []) {
      if (r.profile) map.set(r.profile.id, r.profile);
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.full_name ?? "").localeCompare(b.full_name ?? ""),
    );
  });

// Referências auxiliares (para não deixar imports não-utilizados)
void STATUS_LABEL;

// =============================================================
// Current user role (for UI gating)
// =============================================================
export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const roles = (data ?? []).map((r) => r.role);
    return {
      roles,
      isAdmin: roles.includes("admin"),
      isOperator: roles.includes("operator"),
      isViewer: roles.includes("viewer"),
      canWrite: roles.includes("admin") || roles.includes("operator"),
    };
  });
