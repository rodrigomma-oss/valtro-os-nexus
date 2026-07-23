/**
 * Propostas Comerciais — Server Functions (Sprint 11).
 * RLS aplica: viewer/admin veem tudo; operator vê propostas dos próprios leads.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  Proposal,
  ProposalItem,
  ProposalMetrics,
  ProposalNegotiation,
  ProposalNegotiationType,
  ProposalStatus,
  ProposalWithDetails,
} from "@/types/proposal";

const PROPOSAL_STATUS_VALUES = [
  "rascunho",
  "em_elaboracao",
  "enviada",
  "em_negociacao",
  "aprovada",
  "rejeitada",
  "expirada",
  "cancelada",
] as const satisfies readonly ProposalStatus[];

const NEGOTIATION_TYPE_VALUES = [
  "contraproposta",
  "desconto",
  "alteracao",
  "observacao",
] as const satisfies readonly ProposalNegotiationType[];

const PROPOSAL_SELECT =
  "id, lead_id, number, title, status, total_amount, discount_amount, final_amount, issued_at, valid_until, owner_id, internal_notes, created_by, created_at, updated_at";

const ITEM_SELECT =
  "id, proposal_id, position, service_key, service_label, description, quantity, unit_price, subtotal, created_at, updated_at";

const NEGOTIATION_SELECT =
  "id, proposal_id, type, content, metadata, created_by, created_at";

interface RawProposal {
  id: string;
  lead_id: string;
  number: string;
  title: string;
  status: ProposalStatus;
  total_amount: number | string;
  discount_amount: number | string;
  final_amount: number | string;
  issued_at: string;
  valid_until: string | null;
  owner_id: string | null;
  internal_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function num(v: number | string | null | undefined) {
  if (v == null) return 0;
  return typeof v === "number" ? v : parseFloat(v);
}

async function hydrateProposal(
  supabase: any,
  row: RawProposal,
): Promise<Proposal> {
  let owner_name: string | null = null;
  if (row.owner_id) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", row.owner_id)
      .maybeSingle();
    owner_name = data?.full_name ?? null;
  }
  return {
    ...row,
    total_amount: num(row.total_amount),
    discount_amount: num(row.discount_amount),
    final_amount: num(row.final_amount),
    owner_name,
  };
}

// ============================================================
// listProposalsByLead
// ============================================================
export const listProposalsByLead = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ lead_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<Proposal[]> => {
    const { data: rows, error } = await context.supabase
      .from("proposals")
      .select(PROPOSAL_SELECT)
      .eq("lead_id", data.lead_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as unknown as RawProposal[];
    return await Promise.all(list.map((r) => hydrateProposal(context.supabase, r)));
  });

// ============================================================
// getProposal (with items + negotiations)
// ============================================================
export const getProposal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<ProposalWithDetails> => {
    const { data: p, error } = await context.supabase
      .from("proposals")
      .select(PROPOSAL_SELECT)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!p) throw new Error("Proposta não encontrada.");

    const [itemsRes, negRes] = await Promise.all([
      context.supabase
        .from("proposal_items")
        .select(ITEM_SELECT)
        .eq("proposal_id", data.id)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true }),
      context.supabase
        .from("proposal_negotiations")
        .select(NEGOTIATION_SELECT)
        .eq("proposal_id", data.id)
        .order("created_at", { ascending: false }),
    ]);
    if (itemsRes.error) throw new Error(itemsRes.error.message);
    if (negRes.error) throw new Error(negRes.error.message);

    const proposal = await hydrateProposal(context.supabase, p as unknown as RawProposal);

    const items: ProposalItem[] = (itemsRes.data ?? []).map((it: any) => ({
      ...it,
      quantity: num(it.quantity),
      unit_price: num(it.unit_price),
      subtotal: num(it.subtotal),
    }));

    const negRows = (negRes.data ?? []) as any[];
    const authorIds = Array.from(
      new Set(negRows.map((n) => n.created_by).filter(Boolean) as string[]),
    );
    let names: Record<string, string> = {};
    if (authorIds.length > 0) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", authorIds);
      names = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name]));
    }
    const negotiations: ProposalNegotiation[] = negRows.map((n) => ({
      ...n,
      created_by_name: n.created_by ? names[n.created_by] ?? null : null,
    }));

    return { proposal, items, negotiations };
  });

// ============================================================
// createProposal
// ============================================================
export const createProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        lead_id: z.string().uuid(),
        title: z.string().trim().min(2).max(200),
        valid_until: z.string().optional().nullable(),
        internal_notes: z.string().optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("proposals")
      .insert({
        lead_id: data.lead_id,
        title: data.title,
        valid_until: data.valid_until || null,
        internal_notes: data.internal_notes || null,
        owner_id: context.userId,
        created_by: context.userId,
        status: "rascunho" as ProposalStatus,
        number: "",
      } as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as { id: string }).id };
  });

// ============================================================
// updateProposal
// ============================================================
export const updateProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().trim().min(2).max(200).optional(),
        valid_until: z.string().nullable().optional(),
        internal_notes: z.string().nullable().optional(),
        discount_amount: z.number().min(0).optional(),
        owner_id: z.string().uuid().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase
      .from("proposals")
      .update(patch as any)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// updateProposalStatus
// ============================================================
export const updateProposalStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(PROPOSAL_STATUS_VALUES),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("proposals")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// duplicateProposal
// ============================================================
export const duplicateProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: src, error: readErr } = await context.supabase
      .from("proposals")
      .select("lead_id, title, valid_until, internal_notes, discount_amount")
      .eq("id", data.id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!src) throw new Error("Proposta não encontrada.");

    const { data: created, error: insErr } = await context.supabase
      .from("proposals")
      .insert({
        lead_id: (src as any).lead_id,
        title: `${(src as any).title} (cópia)`,
        valid_until: (src as any).valid_until,
        internal_notes: (src as any).internal_notes,
        discount_amount: (src as any).discount_amount,
        owner_id: context.userId,
        created_by: context.userId,
        status: "rascunho" as ProposalStatus,
        number: "",
      } as any)
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);

    const newId = (created as { id: string }).id;

    const { data: items, error: itErr } = await context.supabase
      .from("proposal_items")
      .select("position, service_key, service_label, description, quantity, unit_price")
      .eq("proposal_id", data.id);
    if (itErr) throw new Error(itErr.message);

    if (items && items.length > 0) {
      const { error: copyErr } = await context.supabase
        .from("proposal_items")
        .insert(
          items.map((it: any) => ({
            proposal_id: newId,
            position: it.position,
            service_key: it.service_key,
            service_label: it.service_label,
            description: it.description,
            quantity: it.quantity,
            unit_price: it.unit_price,
          })),
        );
      if (copyErr) throw new Error(copyErr.message);
    }

    return { id: newId };
  });

// ============================================================
// deleteProposal
// ============================================================
export const deleteProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("proposals")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// addProposalItem
// ============================================================
export const addProposalItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        proposal_id: z.string().uuid(),
        service_key: z.string().nullable().optional(),
        service_label: z.string().trim().min(1).max(200),
        description: z.string().nullable().optional(),
        quantity: z.number().positive(),
        unit_price: z.number().min(0),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: last } = await context.supabase
      .from("proposal_items")
      .select("position")
      .eq("proposal_id", data.proposal_id)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextPos = ((last as any)?.position ?? -1) + 1;

    const { error } = await context.supabase.from("proposal_items").insert({
      proposal_id: data.proposal_id,
      service_key: data.service_key ?? null,
      service_label: data.service_label,
      description: data.description ?? null,
      quantity: data.quantity,
      unit_price: data.unit_price,
      position: nextPos,
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// updateProposalItem
// ============================================================
export const updateProposalItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        service_label: z.string().trim().min(1).max(200).optional(),
        description: z.string().nullable().optional(),
        quantity: z.number().positive().optional(),
        unit_price: z.number().min(0).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase
      .from("proposal_items")
      .update(patch as any)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// removeProposalItem
// ============================================================
export const removeProposalItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("proposal_items")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// addNegotiationEntry
// ============================================================
export const addNegotiationEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        proposal_id: z.string().uuid(),
        type: z.enum(NEGOTIATION_TYPE_VALUES),
        content: z.string().trim().min(1).max(4000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("proposal_negotiations").insert({
      proposal_id: data.proposal_id,
      type: data.type,
      content: data.content,
      created_by: context.userId,
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// getProposalsOverview — Dashboard
// ============================================================
export const getProposalsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProposalMetrics> => {
    const { data, error } = await context.supabase
      .from("proposals")
      .select("status, final_amount");
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<{ status: ProposalStatus; final_amount: number | string }>;

    const count = (s: ProposalStatus) => rows.filter((r) => r.status === s).length;
    const em_elaboracao = count("rascunho") + count("em_elaboracao");
    const enviadas = count("enviada");
    const em_negociacao = count("em_negociacao");
    const aprovadas = count("aprovada");
    const rejeitadas = count("rejeitada");
    const expiradas = count("expirada");
    const canceladas = count("cancelada");

    const pipelineStatuses: ProposalStatus[] = [
      "rascunho",
      "em_elaboracao",
      "enviada",
      "em_negociacao",
    ];
    const pipeline_value = rows
      .filter((r) => pipelineStatuses.includes(r.status))
      .reduce((acc, r) => acc + num(r.final_amount), 0);

    const finalized = aprovadas + rejeitadas + expiradas + canceladas;
    const conversion_rate = finalized > 0 ? Math.round((aprovadas / finalized) * 100) : 0;

    return {
      em_elaboracao,
      enviadas,
      em_negociacao,
      aprovadas,
      pipeline_value,
      conversion_rate,
    };
  });
