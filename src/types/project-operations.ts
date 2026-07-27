/**
 * Domínio: operação contínua do Projeto — Sprint 15.1.
 *
 * `project_operations` guarda EXCLUSIVAMENTE informações operacionais que
 * não possuem entidade de origem no CRM. Nada de identidade do cliente,
 * preço contratado, cobrança, período ou status financeiro: esses dados
 * pertencem a `clients`, `client_services` e `client_service_cycles` e são
 * lidos por join na Visão Geral.
 *
 * IMPORTANTE (política de segurança do serviço): nenhum campo aqui pode
 * armazenar credencial da Shopee (senha, token, cookie, código). O CRM
 * registra apenas o STATUS do acesso.
 */
import type { Database } from "@/integrations/supabase/types";
import type { BillingInterval, ClientServiceStatus, ServiceBillingType } from "./client-service";
import type { OnboardingStatus } from "./onboarding";
import type { ClientServiceCycle } from "./client-service";

export type OperationalAccessStatus = Database["public"]["Enums"]["shopee_access_status"];

export interface ProjectOperations {
  id: string;
  project_id: string;
  operational_access_status: OperationalAccessStatus;
  operational_access_notes: string | null;
  current_objective: string | null;
  ads_monthly_budget_cents: number | null;
  /** Rótulo na UI: "Limite de investimento sem autorização". */
  ads_autonomy_limit_cents: number | null;
  meeting_weekday: number | null;
  next_meeting_at: string | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export const ACCESS_STATUS_LABEL: Record<OperationalAccessStatus, string> = {
  nao_solicitado: "Não solicitado",
  pendente: "Pendente",
  ativo: "Ativo",
  revogado: "Revogado",
};

export const ACCESS_STATUS_TONE: Record<OperationalAccessStatus, string> = {
  nao_solicitado: "bg-slate-50 text-slate-700 border-slate-200",
  pendente: "bg-amber-50 text-amber-700 border-amber-200",
  ativo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  revogado: "bg-rose-50 text-rose-700 border-rose-200",
};

export const ACCESS_STATUS_ORDER: OperationalAccessStatus[] = [
  "nao_solicitado",
  "pendente",
  "ativo",
  "revogado",
];

export const WEEKDAY_LABEL: Record<number, string> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

/** Recorte da contratação exibido na Visão Geral (somente leitura). */
export interface OverviewContract {
  id: string;
  name_snapshot: string;
  description_snapshot: string | null;
  status: ClientServiceStatus;
  billing_type_snapshot: ServiceBillingType;
  billing_interval_snapshot: BillingInterval | null;
  contracted_amount_cents: number;
  scope_snapshot: Record<string, string | number | boolean | null>;
}

export interface OverviewOnboarding {
  id: string;
  status: OnboardingStatus;
  template_key: string;
  completed_at: string | null;
}

export interface ProjectOverview {
  operations: ProjectOperations | null;
  contract: OverviewContract | null;
  cycle: ClientServiceCycle | null;
  onboarding: OverviewOnboarding | null;
}

/**
 * Limite comercial de produtos — lido do snapshot da contratação, nunca
 * copiado para o Projeto e nunca com fallback fixo. Ausente = "Não definido".
 */
export function contractedProductsLimit(
  scope: Record<string, string | number | boolean | null> | null | undefined,
): number | null {
  const raw = scope?.max_products;
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
