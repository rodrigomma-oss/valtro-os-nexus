/**
 * Domínio: Onboarding pós-venda por contratação — Sprint 13.5.
 *
 * O onboarding pertence à CONTRATAÇÃO (`client_services`), nunca ao cliente
 * genérico e nunca ao Lead. Ele reaproveita a infraestrutura de tokens
 * públicos validada no VBE, mas é conceitualmente independente do briefing
 * comercial (pré-venda).
 */
import type { Database } from "@/integrations/supabase/types";

export type OnboardingStatus = Database["public"]["Enums"]["onboarding_status"];
export type OnboardingTokenStatus = Database["public"]["Enums"]["token_status"];

export interface OnboardingTokenSummary {
  id: string;
  status: OnboardingTokenStatus;
  expires_at: string;
  last_access_at: string | null;
  revoked_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ClientServiceOnboarding {
  id: string;
  client_service_id: string;
  template_key: string;
  status: OnboardingStatus;
  owner_id: string | null;
  due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;

  /** Hidratado (não persistido). */
  owner_name: string | null;
  /** Token mais recente vinculado a este onboarding. */
  token: OnboardingTokenSummary | null;
}

export const ONBOARDING_STATUS_LABEL: Record<OnboardingStatus, string> = {
  pendente: "Pendente",
  enviado: "Enviado",
  em_preenchimento: "Em preenchimento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const ONBOARDING_STATUS_TONE: Record<OnboardingStatus, string> = {
  pendente: "bg-slate-50 text-slate-700 border-slate-200",
  enviado: "bg-blue-50 text-blue-700 border-blue-200",
  em_preenchimento: "bg-amber-50 text-amber-700 border-amber-200",
  concluido: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelado: "bg-rose-50 text-rose-700 border-rose-200",
};

/** Estados possíveis do portal público de onboarding. */
export type OnboardingPortalState =
  | "valido"
  | "expirado"
  | "revogado"
  | "concluido"
  | "invalido";

export interface OnboardingPortalPayload {
  state: OnboardingPortalState;
  onboarding: {
    token_id: string;
    template_key: string;
    /** Nome comercial do serviço contratado (snapshot). */
    service_name: string;
    /** Limite contratual de produtos (`scope_snapshot.max_products`). Ausente = sem limite. */
    products_limit: number | null;
    status: OnboardingStatus;
    expires_at: string;
    completed_at: string | null;
  } | null;
  response: {
    data: Record<string, any>;
    current_step: number;
    completed_at: string | null;
  } | null;
}

/** Situação da contratação em relação ao onboarding (UI interna). */
export interface OnboardingContext {
  client_service_id: string;
  template_key: string | null;
  can_start: boolean;
  blocked_reason: string | null;
}
