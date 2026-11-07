/**
 * Domínio: Contratações (client_services) — Sprint 13.3.
 *
 * Uma contratação é o retrato (snapshot) imutável das condições comerciais
 * vigentes no momento em que a proposta aprovada foi convertida. As colunas
 * `service_id` / `proposal_item_id` são apenas referência de origem — nunca
 * fonte dinâmica de valores.
 */
import type { Database } from "@/integrations/supabase/types";

export type ClientServiceStatus = Database["public"]["Enums"]["client_service_status"];
export type BillingInterval = Database["public"]["Enums"]["billing_interval"];
export type ServiceBillingType = Database["public"]["Enums"]["service_billing_type"];

export interface ClientService {
  id: string;
  client_id: string;
  service_id: string | null;
  proposal_id: string | null;
  proposal_item_id: string | null;

  service_code_snapshot: string | null;
  name_snapshot: string;
  description_snapshot: string | null;
  billing_type_snapshot: ServiceBillingType;
  billing_interval_snapshot: BillingInterval | null;

  unit_price_cents: number;
  quantity: number;
  contracted_amount_cents: number;
  scope_snapshot: Record<string, string | number | boolean | null>;

  status: ClientServiceStatus;

  contracted_at: string;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;

  owner_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;

  /** Hidratado a partir de `proposals.number` (não persistido). */
  proposal_number: string | null;

  /**
   * Sprint 13.9 (P1-4) — hidratado a partir de `services.onboarding_template_key`.
   * Permite decidir na UI, sem consultas por linha, se a contratação possui
   * fluxo de onboarding. `null` = serviço sem onboarding.
   */
  onboarding_template_key: string | null;
}


export const CLIENT_SERVICE_STATUS_LABEL: Record<ClientServiceStatus, string> = {
  pendente: "Pendente",
  ativo: "Ativo",
  pausado: "Pausado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const CLIENT_SERVICE_STATUS_TONE: Record<ClientServiceStatus, string> = {
  pendente: "bg-slate-50 text-slate-700 border-slate-200",
  ativo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pausado: "bg-amber-50 text-amber-700 border-amber-200",
  concluido: "bg-blue-50 text-blue-700 border-blue-200",
  cancelado: "bg-rose-50 text-rose-700 border-rose-200",
};

export const BILLING_TYPE_LABEL: Record<ServiceBillingType, string> = {
  pontual: "Pontual",
  recorrente: "Recorrente",
};

export const BILLING_INTERVAL_LABEL: Record<BillingInterval, string> = {
  monthly: "Mensal",
};

/** Rótulos amigáveis para chaves de escopo conhecidas. */
export const SCOPE_KEY_LABEL: Record<string, string> = {
  max_products: "Produtos inclusos",
  max_campaigns: "Campanhas inclusas",
  max_hours: "Horas inclusas",
};

export function scopeKeyLabel(key: string): string {
  return SCOPE_KEY_LABEL[key] ?? key.replace(/_/g, " ");
}

/** Item de proposta candidato à geração de contratação. */
export interface ContractCandidate {
  proposal_item_id: string;
  service_id: string | null;
  service_code: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unit_price_cents: number;
  contracted_amount_cents: number;
  billing_type: ServiceBillingType;
  billing_interval: BillingInterval | null;
  scope: Record<string, string | number | boolean | null>;
  /** Item já originou uma contratação (idempotência). */
  already_contracted: boolean;
  /** Item sem SKU do catálogo — contratação customizada. */
  custom: boolean;
}

export interface ContractPreview {
  proposal_id: string;
  proposal_number: string;
  proposal_status: string;
  client_id: string | null;
  can_generate: boolean;
  blocked_reason: string | null;
  candidates: ContractCandidate[];
}

export interface GenerateContractsResult {
  created: { proposal_item_id: string; client_service_id: string; name: string }[];
  skipped: { proposal_item_id: string; name: string; reason: string }[];
}

// ============================================================
// Sprint 13.4 — Ciclo operacional / timeline
// ============================================================

export type ClientServiceEventType =
  Database["public"]["Enums"]["client_service_event_type"];

export interface ClientServiceEvent {
  id: string;
  client_service_id: string;
  event_type: ClientServiceEventType;
  title: string;
  description: string | null;
  metadata: Record<string, string | number | boolean | null>;
  actor_id: string | null;
  created_at: string;
  /** Hidratado a partir de `profiles.full_name` (não persistido). */
  actor_name: string | null;
}

export const CLIENT_SERVICE_EVENT_LABEL: Record<ClientServiceEventType, string> = {
  created: "Criada",
  activated: "Ativada",
  paused: "Pausada",
  resumed: "Retomada",
  completed: "Concluída",
  cancelled: "Cancelada",
  status_changed: "Status alterado",
  note_added: "Nota",
  onboarding_created: "Onboarding criado",
  onboarding_sent: "Onboarding enviado",
  onboarding_started: "Onboarding iniciado",
  onboarding_completed: "Onboarding concluído",
  onboarding_revoked: "Onboarding revogado",
  cycle_created: "Ciclo criado",
  cycle_started: "Ciclo iniciado",
  cycle_completed: "Ciclo concluído",
  cycle_cancelled: "Ciclo cancelado",
  cycle_payment_registered: "Pagamento do ciclo",
};

// ============================================================
// Sprint 13.6 — Ciclos e recorrência (sem cobrança)
// ============================================================

export type ClientServiceCycleStatus =
  Database["public"]["Enums"]["client_service_cycle_status"];

/**
 * Sprint 13.7 — controle financeiro mínimo do ciclo.
 *
 * `vencido` existe no enum para evolução futura, mas nesta fase NÃO é
 * persistido automaticamente: o atraso é derivado na apresentação
 * (`pendente` + `due_date` < hoje).
 */
export type CyclePaymentStatus = Database["public"]["Enums"]["cycle_payment_status"];

/**
 * Período mensal de uma contratação recorrente. `amount_cents` é snapshot
 * do ciclo: nem o catálogo nem a contratação alteram ciclos existentes.
 * `paid_amount_cents` é exclusivamente o valor efetivamente recebido.
 */
export interface ClientServiceCycle {
  id: string;
  client_service_id: string;
  sequence: number;
  period_start: string; // YYYY-MM-DD
  period_end: string; // YYYY-MM-DD
  due_date: string | null;
  amount_cents: number;
  status: ClientServiceCycleStatus;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;

  // Financeiro (snapshot de recebimento — nunca altera `amount_cents`).
  payment_status: CyclePaymentStatus;
  paid_amount_cents: number | null;
  paid_at: string | null;
  payment_method: string | null;
  payment_notes: string | null;
  payment_registered_by: string | null;
}

export const CYCLE_STATUS_LABEL: Record<ClientServiceCycleStatus, string> = {
  previsto: "Previsto",
  ativo: "Ativo",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const CYCLE_STATUS_TONE: Record<ClientServiceCycleStatus, string> = {
  previsto: "bg-slate-50 text-slate-700 border-slate-200",
  ativo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  concluido: "bg-blue-50 text-blue-700 border-blue-200",
  cancelado: "bg-rose-50 text-rose-700 border-rose-200",
};

export const CYCLE_PAYMENT_STATUS_LABEL: Record<CyclePaymentStatus, string> = {
  pendente: "Pendente",
  pago: "Pago",
  vencido: "Vencido",
  dispensado: "Dispensado",
};

export const CYCLE_PAYMENT_STATUS_TONE: Record<CyclePaymentStatus, string> = {
  pendente: "bg-amber-50 text-amber-700 border-amber-200",
  pago: "bg-emerald-50 text-emerald-700 border-emerald-200",
  vencido: "bg-rose-50 text-rose-700 border-rose-200",
  dispensado: "bg-slate-50 text-slate-700 border-slate-200",
};

/** Formas de pagamento aceitas (lista fechada, sem módulo financeiro). */
export const CYCLE_PAYMENT_METHODS = [
  "pix",
  "boleto",
  "transferencia",
  "cartao",
  "dinheiro",
  "outro",
] as const;

export type CyclePaymentMethod = (typeof CYCLE_PAYMENT_METHODS)[number];

export const CYCLE_PAYMENT_METHOD_LABEL: Record<string, string> = {
  pix: "PIX",
  boleto: "Boleto",
  transferencia: "Transferência",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  outro: "Outro",
};

