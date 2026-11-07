/**
 * Sprint 13.6 — Cálculo de períodos dos ciclos recorrentes.
 *
 * Regras de negócio implementadas aqui (fonte única de verdade, usada pela
 * server function e pela UI de pré-visualização):
 *
 * 1. Somente contratações `recorrente` com `billing_interval_snapshot`
 *    definido possuem ciclos. Serviços pontuais ficam fora desta camada.
 * 2. O próximo período é derivado do ciclo âncora (sequence = 1) e da
 *    sequência, nunca da data atual — isso evita drift acumulado.
 * 3. Meses mais curtos são tratados por clamp (31/01 → 28/02), sem perder
 *    o dia âncora nos períodos seguintes (31/03 volta a ser dia 31).
 * 4. Nenhum valor é recalculado: `amount_cents` é snapshot do ciclo.
 *
 * Todas as datas trafegam como `YYYY-MM-DD` (DATE do Postgres), evitando
 * qualquer conversão de fuso horário.
 */
import type {
  ClientService,
  ClientServiceCycle,
  ClientServiceCycleStatus,
  CyclePaymentStatus,
} from "@/types/client-service";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseISODate(value: string): { y: number; m: number; d: number } {
  if (!ISO_DATE.test(value)) {
    throw new Error(`Data inválida (esperado YYYY-MM-DD): ${value}`);
  }
  const [y, m, d] = value.split("-").map((p) => Number.parseInt(p, 10));
  return { y, m, d };
}

function formatISODate(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number): number {
  // `m` é 1-based; dia 0 do mês seguinte = último dia do mês corrente.
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Soma meses preservando o dia âncora, com clamp no último dia do mês. */
export function addMonthsClamped(dateISO: string, months: number): string {
  const { y, m, d } = parseISODate(dateISO);
  const total = (y * 12 + (m - 1)) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return formatISODate(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

/** Subtrai um dia de uma data ISO (usado para fechar o período). */
export function addDays(dateISO: string, days: number): string {
  const { y, m, d } = parseISODate(dateISO);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return formatISODate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** Data operacional de hoje (sem componente de hora, sem fuso). */
export function todayISO(): string {
  const now = new Date();
  return formatISODate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Converte um timestamptz/ISO qualquer para `YYYY-MM-DD`. */
export function toISODate(value: string): string {
  if (ISO_DATE.test(value)) return value;
  const dt = new Date(value);
  return formatISODate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

export interface CyclePeriod {
  sequence: number;
  period_start: string;
  period_end: string;
}

/**
 * Calcula o próximo período a partir dos ciclos existentes.
 *
 * @param cycles  Ciclos já persistidos da contratação (qualquer ordem).
 * @param fallbackStart Data usada como `period_start` quando ainda não há
 *                      ciclo algum (data operacional da contratação).
 */
export function computeNextCyclePeriod(
  cycles: readonly Pick<ClientServiceCycle, "sequence" | "period_start" | "period_end">[],
  fallbackStart: string,
): CyclePeriod {
  if (cycles.length === 0) {
    const start = toISODate(fallbackStart);
    return { sequence: 1, period_start: start, period_end: addDays(addMonthsClamped(start, 1), -1) };
  }

  const anchor = cycles.reduce((min, c) => (c.sequence < min.sequence ? c : min), cycles[0]);
  const maxSeq = cycles.reduce((max, c) => Math.max(max, c.sequence), 0);

  // Offset em meses relativo ao ciclo âncora → sem drift acumulado.
  const offset = maxSeq; // próximo ciclo é maxSeq + 1 → offset = maxSeq
  const start = addMonthsClamped(anchor.period_start, offset);
  const end = addDays(addMonthsClamped(anchor.period_start, offset + 1), -1);
  return { sequence: maxSeq + 1, period_start: start, period_end: end };
}

/** Contratação elegível a ciclos recorrentes (independente de status). */
export function supportsCycles(
  service: Pick<ClientService, "billing_type_snapshot" | "billing_interval_snapshot">,
): boolean {
  return (
    service.billing_type_snapshot === "recorrente" &&
    service.billing_interval_snapshot === "monthly"
  );
}

/**
 * Motivo pelo qual não é possível gerar um novo ciclo agora, ou `null`
 * quando a geração é permitida.
 */
export function cycleBlockedReason(
  service: Pick<
    ClientService,
    "billing_type_snapshot" | "billing_interval_snapshot" | "status"
  >,
  cycles: readonly Pick<ClientServiceCycle, "status">[],
): string | null {
  if (!supportsCycles(service)) {
    return "Serviço pontual — não possui ciclos recorrentes.";
  }
  if (service.status === "pausado") {
    return "Contratação pausada — retome antes de iniciar um novo ciclo.";
  }
  if (service.status === "concluido" || service.status === "cancelado") {
    return "Ciclo de vida encerrado — não é possível gerar novos ciclos.";
  }
  if (service.status === "pendente") {
    return "Ative a contratação para iniciar o primeiro ciclo.";
  }
  if (cycles.some((c) => c.status === "previsto" || c.status === "ativo")) {
    return "Existe um ciclo em aberto — conclua ou cancele antes de gerar o próximo.";
  }
  return null;
}

/** Transições válidas de um ciclo (espelham a validação do banco). */
export const CYCLE_TRANSITIONS: Record<
  ClientServiceCycleStatus,
  readonly ClientServiceCycleStatus[]
> = {
  previsto: ["ativo", "cancelado"],
  ativo: ["concluido", "cancelado"],
  concluido: [],
  cancelado: [],
};

export const CYCLE_TRANSITION_LABEL: Record<string, string> = {
  "previsto>ativo": "Iniciar ciclo",
  "previsto>cancelado": "Cancelar ciclo",
  "ativo>concluido": "Concluir ciclo",
  "ativo>cancelado": "Cancelar ciclo",
};

export function allowedCycleTransitions(
  from: ClientServiceCycleStatus,
): readonly ClientServiceCycleStatus[] {
  return CYCLE_TRANSITIONS[from] ?? [];
}

export function isCycleTransitionAllowed(
  from: ClientServiceCycleStatus,
  to: ClientServiceCycleStatus,
): boolean {
  return from !== to && allowedCycleTransitions(from).includes(to);
}

export function cycleTransitionLabel(
  from: ClientServiceCycleStatus,
  to: ClientServiceCycleStatus,
): string {
  return CYCLE_TRANSITION_LABEL[`${from}>${to}`] ?? "Alterar ciclo";
}

/** Rótulo de competência do período (ex.: "jul/2026 · 25/07 → 24/08"). */
export function periodLabel(period_start: string, period_end: string): string {
  const { y, m } = parseISODate(period_start);
  const month = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("pt-BR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${month} · ${shortDate(period_start)} → ${shortDate(period_end)}`;
}

export function shortDate(dateISO: string): string {
  const { y, m, d } = parseISODate(dateISO);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

// ============================================================
// Sprint 13.7 — Controle financeiro mínimo do ciclo
// ============================================================

/**
 * Status financeiro APRESENTADO ao operador.
 *
 * Regra desta fase: `vencido` nunca é persistido por passagem de tempo.
 * Um ciclo `pendente` com `due_date` anterior a hoje é exibido como
 * `vencido`, mas o estado no banco permanece `pendente` até ação humana
 * (ou automação futura). Isso evita cron e mutação implícita.
 */
export function displayPaymentStatus(
  cycle: Pick<ClientServiceCycle, "payment_status" | "due_date">,
  today: string = todayISO(),
): CyclePaymentStatus {
  if (cycle.payment_status === "pendente" && cycle.due_date && cycle.due_date < today) {
    return "vencido";
  }
  return cycle.payment_status;
}

/** Vencimento padrão do ciclo: pagamento antes do início da execução. */
export function defaultDueDate(period_start: string): string {
  return toISODate(period_start);
}

/** Diferença entre recebido e previsto (positivo = recebido a mais). */
export function paymentDelta(
  cycle: Pick<ClientServiceCycle, "amount_cents" | "paid_amount_cents" | "payment_status">,
): number | null {
  if (cycle.payment_status !== "pago" || cycle.paid_amount_cents === null) return null;
  return cycle.paid_amount_cents - cycle.amount_cents;
}

/**
 * Coerência dos campos financeiros — espelha o trigger do banco.
 * Retorna a mensagem de erro ou `null` quando o payload é válido.
 */
export function validatePaymentPayload(input: {
  payment_status: CyclePaymentStatus;
  paid_amount_cents?: number | null;
}): string | null {
  if (input.payment_status === "pago") {
    if (input.paid_amount_cents === null || input.paid_amount_cents === undefined) {
      return "Informe o valor recebido para marcar o ciclo como pago.";
    }
    if (!Number.isInteger(input.paid_amount_cents) || input.paid_amount_cents < 0) {
      return "Valor recebido inválido.";
    }
  }
  return null;
}

/**
 * Alerta (não bloqueante) ao iniciar um ciclo cujo pagamento não está
 * resolvido. Exceções comerciais são permitidas — por isso é confirmação,
 * nunca impedimento.
 */
export function shouldWarnStartWithoutPayment(
  cycle: Pick<ClientServiceCycle, "payment_status" | "due_date">,
): boolean {
  return cycle.payment_status !== "pago" && cycle.payment_status !== "dispensado";
}
