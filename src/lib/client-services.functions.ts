/**
 * Contratações (client_services) — Server Functions (Sprint 13.3).
 *
 * Regras invioláveis desta camada:
 * 1. Snapshot: os valores comerciais são copiados na conversão e nunca
 *    recalculados a partir de `services` ou `proposal_items`.
 * 2. Idempotência: um `proposal_item_id` origina no máximo uma contratação
 *    (índice único no banco + verificação prévia aqui).
 * 3. Conversão manual e explícita: apenas propostas `aprovada` com cliente
 *    já convertido podem gerar contratações.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isTransitionAllowed } from "@/lib/client-service-transitions";
import { CLIENT_SERVICE_STATUS_LABEL } from "@/types/client-service";
import type {
  BillingInterval,
  ClientService,
  ClientServiceEvent,
  ClientServiceStatus,
  ContractCandidate,
  ContractPreview,
  GenerateContractsResult,
  ServiceBillingType,
} from "@/types/client-service";

const CLIENT_SERVICE_SELECT =
  "id, client_id, service_id, proposal_id, proposal_item_id, service_code_snapshot, name_snapshot, description_snapshot, billing_type_snapshot, billing_interval_snapshot, unit_price_cents, quantity, contracted_amount_cents, scope_snapshot, status, contracted_at, started_at, completed_at, cancelled_at, owner_id, created_by, created_at, updated_at";

const STATUS_VALUES = [
  "pendente",
  "ativo",
  "pausado",
  "concluido",
  "cancelado",
] as const satisfies readonly ClientServiceStatus[];

function num(v: number | string | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : parseFloat(v);
}

/** Converte reais (numeric do Postgres) para centavos inteiros. */
function toCents(v: number | string | null | undefined): number {
  return Math.max(0, Math.round(num(v) * 100));
}

function normalizeScope(v: unknown): Record<string, string | number | boolean | null> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, string | number | boolean | null>)
    : {};
}

function normalizeRow(row: any, proposalNumber: string | null = null): ClientService {
  return {
    ...row,
    quantity: num(row.quantity),
    unit_price_cents: Number(row.unit_price_cents ?? 0),
    contracted_amount_cents: Number(row.contracted_amount_cents ?? 0),
    scope_snapshot: normalizeScope(row.scope_snapshot),
    proposal_number: proposalNumber,
  };
}

// ============================================================
// listClientServices — contratações de um cliente
// ============================================================
export const listClientServices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ client_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<ClientService[]> => {
    const { data: rows, error } = await context.supabase
      .from("client_services")
      .select(CLIENT_SERVICE_SELECT)
      .eq("client_id", data.client_id)
      .order("contracted_at", { ascending: false });
    if (error) throw new Error(error.message);

    const list = (rows ?? []) as any[];
    const proposalIds = Array.from(
      new Set(list.map((r) => r.proposal_id).filter((v): v is string => !!v)),
    );

    const numbers = new Map<string, string>();
    if (proposalIds.length > 0) {
      const { data: props } = await context.supabase
        .from("proposals")
        .select("id, number")
        .in("id", proposalIds);
      for (const p of (props ?? []) as any[]) numbers.set(p.id, p.number);
    }

    return list.map((r) => normalizeRow(r, r.proposal_id ? numbers.get(r.proposal_id) ?? null : null));
  });

// ============================================================
// previewProposalContracts — o que será criado (visibilidade obrigatória)
// ============================================================
export const previewProposalContracts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ proposal_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<ContractPreview> => {
    const { supabase } = context;

    const { data: proposal, error: pErr } = await supabase
      .from("proposals")
      .select("id, number, status, lead_id")
      .eq("id", data.proposal_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!proposal) throw new Error("Proposta não encontrada.");
    const p = proposal as any;

    // Cliente convertido a partir do lead da proposta.
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("lead_id", p.lead_id)
      .maybeSingle();
    const clientId = (client as any)?.id ?? null;

    const { data: items, error: iErr } = await supabase
      .from("proposal_items")
      .select("id, position, service_id, service_label, description, quantity, unit_price, subtotal")
      .eq("proposal_id", p.id)
      .order("position", { ascending: true });
    if (iErr) throw new Error(iErr.message);
    const itemRows = (items ?? []) as any[];

    // Catálogo apenas para preencher tipo de cobrança / escopo na conversão.
    const serviceIds = Array.from(
      new Set(itemRows.map((i) => i.service_id).filter((v): v is string => !!v)),
    );
    const services = new Map<string, any>();
    if (serviceIds.length > 0) {
      const { data: svc } = await supabase
        .from("services")
        .select("id, code, billing_type, billing_interval, default_limits")
        .in("id", serviceIds);
      for (const s of (svc ?? []) as any[]) services.set(s.id, s);
    }

    // Idempotência: itens que já originaram contratação.
    const existing = new Set<string>();
    if (itemRows.length > 0) {
      const { data: cs } = await supabase
        .from("client_services")
        .select("proposal_item_id")
        .in(
          "proposal_item_id",
          itemRows.map((i) => i.id),
        );
      for (const row of (cs ?? []) as any[]) {
        if (row.proposal_item_id) existing.add(row.proposal_item_id);
      }
    }

    const candidates: ContractCandidate[] = itemRows.map((item) => {
      const svc = item.service_id ? services.get(item.service_id) : null;
      const billingType: ServiceBillingType = svc?.billing_type ?? "pontual";
      const billingInterval: BillingInterval | null =
        billingType === "pontual" ? null : (svc?.billing_interval ?? "monthly");
      return {
        proposal_item_id: item.id,
        service_id: item.service_id ?? null,
        service_code: svc?.code ?? null,
        name: item.service_label,
        description: item.description ?? null,
        quantity: num(item.quantity),
        unit_price_cents: toCents(item.unit_price),
        contracted_amount_cents: toCents(item.subtotal),
        billing_type: billingType,
        billing_interval: billingInterval,
        scope: normalizeScope(svc?.default_limits),
        already_contracted: existing.has(item.id),
        custom: !item.service_id,
      };
    });

    let blocked: string | null = null;
    if (p.status !== "aprovada") blocked = "A proposta precisa estar aprovada.";
    else if (!clientId) blocked = "O lead ainda não foi convertido em cliente.";
    else if (candidates.length === 0) blocked = "A proposta não possui itens.";

    return {
      proposal_id: p.id,
      proposal_number: p.number,
      proposal_status: p.status,
      client_id: clientId,
      can_generate: blocked === null,
      blocked_reason: blocked,
      candidates,
    };
  });

// ============================================================
// generateClientServices — action manual e idempotente
// ============================================================
export const generateClientServices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        proposal_id: z.string().uuid(),
        proposal_item_ids: z.array(z.string().uuid()).min(1),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<GenerateContractsResult> => {
    const { supabase, userId } = context;

    const { data: proposal, error: pErr } = await supabase
      .from("proposals")
      .select("id, number, status, lead_id, owner_id")
      .eq("id", data.proposal_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!proposal) throw new Error("Proposta não encontrada.");
    const p = proposal as any;
    if (p.status !== "aprovada") {
      throw new Error("Apenas propostas aprovadas podem gerar contratações.");
    }

    const { data: client } = await supabase
      .from("clients")
      .select("id, owner_id")
      .eq("lead_id", p.lead_id)
      .maybeSingle();
    const c = client as any;
    if (!c?.id) {
      throw new Error("O lead desta proposta ainda não foi convertido em cliente.");
    }

    const { data: items, error: iErr } = await supabase
      .from("proposal_items")
      .select("id, service_id, service_label, description, quantity, unit_price, subtotal")
      .eq("proposal_id", p.id)
      .in("id", data.proposal_item_ids);
    if (iErr) throw new Error(iErr.message);
    const itemRows = (items ?? []) as any[];
    if (itemRows.length === 0) throw new Error("Nenhum item válido selecionado.");

    const serviceIds = Array.from(
      new Set(itemRows.map((i) => i.service_id).filter((v): v is string => !!v)),
    );
    const services = new Map<string, any>();
    if (serviceIds.length > 0) {
      const { data: svc } = await supabase
        .from("services")
        .select("id, code, billing_type, billing_interval, default_limits")
        .in("id", serviceIds);
      for (const s of (svc ?? []) as any[]) services.set(s.id, s);
    }

    const { data: existingRows } = await supabase
      .from("client_services")
      .select("id, proposal_item_id")
      .in(
        "proposal_item_id",
        itemRows.map((i) => i.id),
      );
    const existing = new Set(
      ((existingRows ?? []) as any[]).map((r) => r.proposal_item_id).filter(Boolean),
    );

    const result: GenerateContractsResult = { created: [], skipped: [] };

    for (const item of itemRows) {
      if (existing.has(item.id)) {
        result.skipped.push({
          proposal_item_id: item.id,
          name: item.service_label,
          reason: "Contratação já existente para este item.",
        });
        continue;
      }

      const svc = item.service_id ? services.get(item.service_id) : null;
      const billingType: ServiceBillingType = svc?.billing_type ?? "pontual";
      const billingInterval: BillingInterval | null =
        billingType === "pontual" ? null : (svc?.billing_interval ?? "monthly");

      const payload = {
        client_id: c.id,
        service_id: item.service_id ?? null,
        proposal_id: p.id,
        proposal_item_id: item.id,
        service_code_snapshot: svc?.code ?? null,
        name_snapshot: item.service_label,
        description_snapshot: item.description ?? null,
        billing_type_snapshot: billingType,
        billing_interval_snapshot: billingInterval,
        unit_price_cents: toCents(item.unit_price),
        quantity: num(item.quantity),
        contracted_amount_cents: toCents(item.subtotal),
        scope_snapshot: normalizeScope(svc?.default_limits),
        status: "pendente" as ClientServiceStatus,
        owner_id: p.owner_id ?? c.owner_id ?? null,
        created_by: userId,
      };

      const { data: inserted, error } = await supabase
        .from("client_services")
        .insert(payload as any)
        .select("id")
        .maybeSingle();

      if (error) {
        // 23505 = unique_violation → corrida com outra execução: idempotente.
        if ((error as any).code === "23505") {
          result.skipped.push({
            proposal_item_id: item.id,
            name: item.service_label,
            reason: "Contratação já existente para este item.",
          });
          continue;
        }
        throw new Error(error.message);
      }

      result.created.push({
        proposal_item_id: item.id,
        client_service_id: (inserted as any).id,
        name: item.service_label,
      });
    }

    return result;
  });

// ============================================================
// updateClientServiceStatus — ciclo de vida (sem DELETE físico)
// ============================================================
export const updateClientServiceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(STATUS_VALUES),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: current, error: readErr } = await supabase
      .from("client_services")
      .select("id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!current) throw new Error("Contratação não encontrada.");

    const from = (current as any).status as ClientServiceStatus;
    // Validação central — mesma regra aplicada na UI e no banco.
    if (!isTransitionAllowed(from, data.status)) {
      throw new Error(
        `Transição inválida: ${CLIENT_SERVICE_STATUS_LABEL[from]} → ${CLIENT_SERVICE_STATUS_LABEL[data.status]}.`,
      );
    }

    const { error } = await supabase
      .from("client_services")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, from, to: data.status };
  });

// ============================================================
// listClientServiceEvents — timeline operacional (somente leitura)
// ============================================================
export const listClientServiceEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ client_service_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<ClientServiceEvent[]> => {
    const { data: rows, error } = await context.supabase
      .from("client_service_events")
      .select("id, client_service_id, event_type, title, description, metadata, actor_id, created_at")
      .eq("client_service_id", data.client_service_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const list = (rows ?? []) as any[];
    const actorIds = Array.from(
      new Set(list.map((r) => r.actor_id).filter((v): v is string => !!v)),
    );
    const names = new Map<string, string>();
    if (actorIds.length > 0) {
      const { data: profiles } = await context.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", actorIds);
      for (const p of (profiles ?? []) as any[]) names.set(p.id, p.full_name);
    }

    return list.map((r) => ({
      ...r,
      metadata:
        r.metadata && typeof r.metadata === "object" && !Array.isArray(r.metadata)
          ? (r.metadata as Record<string, unknown>)
          : {},
      actor_name: r.actor_id ? (names.get(r.actor_id) ?? null) : null,
    })) as ClientServiceEvent[];
  });

// ============================================================
// addClientServiceNote — nota operacional manual
// ============================================================
export const addClientServiceNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        client_service_id: z.string().uuid(),
        note: z.string().trim().min(3).max(2000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("client_service_events").insert({
      client_service_id: data.client_service_id,
      event_type: "note_added",
      title: "Nota operacional",
      description: data.note,
      actor_id: context.userId,
      // metadata intencionalmente vazio: nada sensível é persistido aqui.
      metadata: {},
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

