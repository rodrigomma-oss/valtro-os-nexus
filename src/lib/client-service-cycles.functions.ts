/**
 * Sprint 13.6 — Ciclos e recorrência das contratações.
 *
 * Escopo estrito: períodos operacionais. Nenhuma cobrança, status de
 * pagamento, MRR ou renovação automática — isso é outro domínio.
 *
 * Invariantes garantidas aqui (e replicadas por triggers no banco):
 * 1. Elegibilidade: apenas `recorrente` + `monthly`.
 * 2. Snapshot: `amount_cents` copia `contracted_amount_cents` no momento
 *    da criação e nunca é recalculado a partir de `services`.
 * 3. Continuidade: `sequence` cresce de 1 em 1 e o período do próximo ciclo
 *    deriva do ciclo âncora (evita drift de datas).
 * 4. Status da contratação não muda porque um ciclo terminou.
 * 5. Sem DELETE — cancelar preserva o registro.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  computeNextCyclePeriod,
  cycleBlockedReason,
  defaultDueDate,
  isCycleTransitionAllowed,
  validatePaymentPayload,
  supportsCycles,
  toISODate,
  todayISO,
} from "@/lib/client-service-cycles";
import {
  CYCLE_PAYMENT_METHODS,
  CYCLE_STATUS_LABEL,
  type ClientServiceCycle,
  type ClientServiceCycleStatus,
  type CyclePaymentStatus,
} from "@/types/client-service";

const CYCLE_PAYMENT_STATUS_VALUES = [
  "pendente",
  "pago",
  "vencido",
  "dispensado",
] as const satisfies readonly CyclePaymentStatus[];

const CYCLE_SELECT =
  "id, client_service_id, sequence, period_start, period_end, due_date, amount_cents, status, started_at, completed_at, cancelled_at, created_by, created_at, updated_at, payment_status, paid_amount_cents, paid_at, payment_method, payment_notes, payment_registered_by";

const CYCLE_STATUS_VALUES = [
  "previsto",
  "ativo",
  "concluido",
  "cancelado",
] as const satisfies readonly ClientServiceCycleStatus[];

function normalizeCycle(row: any): ClientServiceCycle {
  return {
    ...row,
    sequence: Number(row.sequence),
    amount_cents: Number(row.amount_cents ?? 0),
    paid_amount_cents:
      row.paid_amount_cents === null || row.paid_amount_cents === undefined
        ? null
        : Number(row.paid_amount_cents),
  };
}

async function loadContract(supabase: any, id: string) {
  const { data, error } = await supabase
    .from("client_services")
    .select(
      "id, status, billing_type_snapshot, billing_interval_snapshot, contracted_amount_cents, started_at, contracted_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Contratação não encontrada.");
  return data as any;
}

// ============================================================
// listClientServiceCycles — leitura (authenticated)
// ============================================================
export const listClientServiceCycles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ client_service_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<ClientServiceCycle[]> => {
    const { data: rows, error } = await context.supabase
      .from("client_service_cycles")
      .select(CYCLE_SELECT)
      .eq("client_service_id", data.client_service_id)
      .order("sequence", { ascending: false });
    if (error) throw new Error(error.message);
    return ((rows ?? []) as any[]).map(normalizeCycle);
  });

export interface NextCyclePreview {
  supports_cycles: boolean;
  can_create: boolean;
  blocked_reason: string | null;
  sequence: number;
  period_start: string;
  period_end: string;
  amount_cents: number;
}

// ============================================================
// previewNextCycle — visibilidade antes da action manual
// ============================================================
export const previewNextCycle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ client_service_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<NextCyclePreview> => {
    const cs = await loadContract(context.supabase, data.client_service_id);

    const { data: rows, error } = await context.supabase
      .from("client_service_cycles")
      .select("sequence, period_start, period_end, status")
      .eq("client_service_id", data.client_service_id);
    if (error) throw new Error(error.message);
    const cycles = ((rows ?? []) as any[]).map((r) => ({
      ...r,
      sequence: Number(r.sequence),
    }));

    const supports = supportsCycles(cs);
    const blocked = cycleBlockedReason(cs, cycles);

    // Ciclos cancelados não contam para a continuidade do período, mas
    // ocupam sequência — por isso o cálculo usa todos os ciclos.
    const period = supports
      ? computeNextCyclePeriod(
          cycles,
          toISODate(cs.started_at ?? cs.contracted_at ?? todayISO()),
        )
      : { sequence: 0, period_start: todayISO(), period_end: todayISO() };

    return {
      supports_cycles: supports,
      can_create: blocked === null,
      blocked_reason: blocked,
      sequence: period.sequence,
      period_start: period.period_start,
      period_end: period.period_end,
      amount_cents: Number(cs.contracted_amount_cents ?? 0),
    };
  });

// ============================================================
// createNextCycle — action manual (primeiro ciclo e subsequentes)
// ============================================================
export const createNextCycle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        client_service_id: z.string().uuid(),
        /** Apenas para o primeiro ciclo; ignorado nos seguintes. */
        period_start: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
          .optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<ClientServiceCycle> => {
    const { supabase, userId } = context;
    const cs = await loadContract(supabase, data.client_service_id);

    const { data: rows, error: readErr } = await supabase
      .from("client_service_cycles")
      .select("sequence, period_start, period_end, status")
      .eq("client_service_id", data.client_service_id);
    if (readErr) throw new Error(readErr.message);
    const cycles = ((rows ?? []) as any[]).map((r) => ({
      ...r,
      sequence: Number(r.sequence),
    }));

    const blocked = cycleBlockedReason(cs, cycles);
    if (blocked) throw new Error(blocked);

    const fallback =
      cycles.length === 0
        ? (data.period_start ?? toISODate(cs.started_at ?? cs.contracted_at ?? todayISO()))
        : todayISO();
    const period = computeNextCyclePeriod(cycles, fallback);

    const { data: inserted, error } = await supabase
      .from("client_service_cycles")
      .insert({
        client_service_id: data.client_service_id,
        sequence: period.sequence,
        period_start: period.period_start,
        period_end: period.period_end,
        // Vencimento padrão: pagamento antes do início da execução do ciclo.
        due_date: defaultDueDate(period.period_start),
        // Snapshot: valor da contratação no momento da criação do ciclo.
        amount_cents: Number(cs.contracted_amount_cents ?? 0),
        status: "previsto",
        created_by: userId,
      } as any)
      .select(CYCLE_SELECT)
      .maybeSingle();

    if (error) {
      if ((error as any).code === "23505") {
        throw new Error("Já existe um ciclo para este período.");
      }
      throw new Error(error.message);
    }
    return normalizeCycle(inserted);
  });

// ============================================================
// updateCycleStatus — iniciar / concluir / cancelar
// ============================================================
export const updateCycleStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(CYCLE_STATUS_VALUES),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: current, error: readErr } = await supabase
      .from("client_service_cycles")
      .select("id, status, client_service_id")
      .eq("id", data.id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!current) throw new Error("Ciclo não encontrado.");

    const from = (current as any).status as ClientServiceCycleStatus;
    if (!isCycleTransitionAllowed(from, data.status)) {
      throw new Error(
        `Transição inválida: ${CYCLE_STATUS_LABEL[from]} → ${CYCLE_STATUS_LABEL[data.status]}.`,
      );
    }

    // Iniciar um ciclo exige contratação ativa; concluir/cancelar não altera
    // o status geral da contratação (regra 8 da sprint).
    if (data.status === "ativo") {
      const cs = await loadContract(supabase, (current as any).client_service_id);
      if (cs.status !== "ativo") {
        throw new Error("Somente contratações ativas podem iniciar um ciclo.");
      }
    }

    const { error } = await supabase
      .from("client_service_cycles")
      .update({ status: data.status } as any)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, from, to: data.status };
  });

// ============================================================
// registerCyclePayment — controle financeiro mínimo do ciclo
// ============================================================
/**
 * Registra/atualiza o pagamento de um ciclo.
 *
 * Não é módulo financeiro: nenhum recálculo, nenhuma cobrança, nenhum
 * lançamento contábil. `amount_cents` (previsto) permanece imutável;
 * `paid_amount_cents` guarda somente o valor efetivamente recebido.
 */
export const registerCyclePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        payment_status: z.enum(CYCLE_PAYMENT_STATUS_VALUES),
        paid_amount_cents: z.number().int().min(0).nullable().optional(),
        paid_at: z.string().min(1).nullable().optional(),
        payment_method: z.enum(CYCLE_PAYMENT_METHODS).nullable().optional(),
        payment_notes: z.string().max(500).nullable().optional(),
        due_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
          .nullable()
          .optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<ClientServiceCycle> => {
    const { supabase, userId } = context;

    const invalid = validatePaymentPayload({
      payment_status: data.payment_status,
      paid_amount_cents: data.paid_amount_cents ?? null,
    });
    if (invalid) throw new Error(invalid);

    const { data: current, error: readErr } = await supabase
      .from("client_service_cycles")
      .select("id, status, period_start")
      .eq("id", data.id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!current) throw new Error("Ciclo não encontrado.");

    const isPaid = data.payment_status === "pago";
    const patch: Record<string, unknown> = {
      payment_status: data.payment_status,
      // O trigger de coerência limpa estes campos quando não é "pago".
      paid_amount_cents: isPaid ? (data.paid_amount_cents ?? null) : null,
      paid_at: isPaid ? (data.paid_at ?? new Date().toISOString()) : null,
      payment_method: isPaid ? (data.payment_method ?? null) : null,
      payment_notes: data.payment_notes ?? null,
      payment_registered_by: userId,
    };
    if (data.due_date !== undefined) {
      patch.due_date = data.due_date ?? (current as any).period_start;
    }

    const { data: updated, error } = await supabase
      .from("client_service_cycles")
      .update(patch as any)
      .eq("id", data.id)
      .select(CYCLE_SELECT)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("Não foi possível registrar o pagamento.");
    return normalizeCycle(updated);
  });
