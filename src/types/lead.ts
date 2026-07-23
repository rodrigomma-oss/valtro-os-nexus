/**
 * Domínio: CRM Comercial.
 * Alinhado com o schema real (public.leads, lead_events, lead_notes).
 */

import type { Database } from "@/integrations/supabase/types";

export type LeadStatus = Database["public"]["Enums"]["lead_status"];
export type LeadSource = Database["public"]["Enums"]["lead_source"];
export type LeadEventType = Database["public"]["Enums"]["lead_event_type"];
export type LeadServiceType = Database["public"]["Enums"]["service_type"];

export type LeadContactChannel = Database["public"]["Enums"]["lead_contact_channel"];
export type LeadContactType = Database["public"]["Enums"]["lead_contact_type"];
export type LeadContactResult = Database["public"]["Enums"]["lead_contact_result"];

export interface Lead {
  id: string;
  company_name: string;
  contact_name: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  city: string | null;
  state: string | null;
  segment: string | null;
  source: LeadSource;
  status: LeadStatus;
  service_type: LeadServiceType;
  owner_id: string | null;
  owner_name: string | null;
  next_action: NextAction | null;
  triage_notes: string | null;
  triage_started_at: string | null;
  archived_at: string | null;
  next_follow_up_at: string | null;
  next_follow_up_reason: string | null;
  next_follow_up_owner_id: string | null;
  next_follow_up_owner_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadContact {
  id: string;
  lead_id: string;
  channel: LeadContactChannel;
  type: LeadContactType;
  result: LeadContactResult;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export const CONTACT_CHANNEL_LABEL: Record<LeadContactChannel, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  telefone: "Telefone",
  reuniao: "Reunião",
  outro: "Outro",
};

export const CONTACT_TYPE_LABEL: Record<LeadContactType, string> = {
  primeiro_contato: "Primeiro contato",
  follow_up: "Follow-up",
  envio_briefing: "Envio de briefing",
  lembrete: "Lembrete",
  apresentacao: "Apresentação",
  proposta: "Proposta",
  outro: "Outro",
};

export const CONTACT_RESULT_LABEL: Record<LeadContactResult, string> = {
  sem_resposta: "Sem resposta",
  respondido: "Respondido",
  interessado: "Interessado",
  nao_interessado: "Não interessado",
  agendado: "Agendado",
  concluido: "Concluído",
};

export type NextAction =
  | "entrar_em_contato"
  | "enviar_briefing_projeto"
  | "enviar_briefing_loja"
  | "apresentar_pricing"
  | "avaliar_parceria"
  | "preparar_proposta"
  | "aguardar_retorno"
  | "descartar";

export const NEXT_ACTION_LABEL: Record<NextAction, string> = {
  entrar_em_contato: "Entrar em contato",
  enviar_briefing_projeto: "Enviar briefing de projeto",
  enviar_briefing_loja: "Enviar briefing de loja",
  apresentar_pricing: "Apresentar Valtro Pricing",
  avaliar_parceria: "Avaliar parceria",
  preparar_proposta: "Preparar proposta",
  aguardar_retorno: "Aguardar retorno",
  descartar: "Descartar oportunidade",
};

export const INTEREST_LABEL: Record<LeadServiceType, string> = {
  nao_definido: "Não definido",
  desenvolvimento_projeto: "Desenvolvimento de Sistemas",
  gestao_shopee: "Gestão Shopee",
  gestao_mercadolivre: "Gestão Mercado Livre",
  gestao_amazon: "Gestão Amazon",
  gestao_multicanal: "Gestão Multicanal",
  consultoria: "Consultoria",
  diagnostico: "Análise de Loja",
  trafego_pago: "Valtro Pricing / Tráfego",
  outro: "Outro",
};

export interface LeadEvent {
  id: string;
  lead_id: string;
  type: LeadEventType;
  description: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  content: string;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  em_triagem: "Em triagem",
  contato: "Em contato",
  qualificado: "Qualificado",
  aguardando_briefing: "Aguardando briefing",
  briefing_enviado: "Briefing enviado",
  em_analise: "Em análise",
  proposta: "Proposta",
  ganho: "Convertido",
  perdido: "Perdido",
  descartado: "Descartado",
};

export const SOURCE_LABEL: Record<LeadSource, string> = {
  instagram: "Instagram",
  indicacao: "Indicação",
  site: "Site",
  google: "Google",
  evento: "Evento",
  outbound: "Outbound",
  diagnostico: "Diagnóstico",
  manual: "Manual",
};
