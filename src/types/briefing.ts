/**
 * Domínio: Valtro Briefing Engine (VBE) — Sprint 2B.3.1
 * Tipos alinhados com o schema real (public.briefing_tokens, enums correlatos).
 */

import type { Database } from "@/integrations/supabase/types";

export type ServiceType = Database["public"]["Enums"]["service_type"];
export type TokenStatus = Database["public"]["Enums"]["token_status"];
export type TemplateType = Database["public"]["Enums"]["template_type"];

export interface BriefingToken {
  id: string;
  lead_id: string;
  service_type: ServiceType;
  template_type: TemplateType;
  status: TokenStatus;
  created_by: string | null;
  created_at: string;
  expires_at: string;
  last_access_at: string | null;
  revoked_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export const SERVICE_TYPE_LABEL: Record<ServiceType, string> = {
  nao_definido: "Não definido",
  desenvolvimento_projeto: "Desenvolvimento de Projeto",
  gestao_shopee: "Gestão Shopee",
  gestao_mercadolivre: "Gestão Mercado Livre",
  gestao_amazon: "Gestão Amazon",
  gestao_multicanal: "Gestão Multicanal",
  consultoria: "Consultoria",
  diagnostico: "Diagnóstico / Otimização de Loja",
  trafego_pago: "Tráfego Pago",
  outro: "Outro",
};

export const TOKEN_STATUS_LABEL: Record<TokenStatus, string> = {
  pendente: "Pendente",
  ativo: "Ativo",
  concluido: "Concluído",
  expirado: "Expirado",
  revogado: "Revogado",
};

export const TEMPLATE_TYPE_LABEL: Record<TemplateType, string> = {
  padrao: "Padrão",
  shopee: "Shopee",
  mercadolivre: "Mercado Livre",
  amazon: "Amazon",
  multicanal: "Multicanal",
  consultoria: "Consultoria",
  diagnostico: "Diagnóstico",
  custom: "Personalizado",
};
