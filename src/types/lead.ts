/**
 * Domínio: CRM Comercial.
 * Alinhado com o schema real (public.leads, lead_events, lead_notes).
 */

import type { Database } from "@/integrations/supabase/types";

export type LeadStatus = Database["public"]["Enums"]["lead_status"];
export type LeadSource = Database["public"]["Enums"]["lead_source"];
export type LeadEventType = Database["public"]["Enums"]["lead_event_type"];
export type LeadServiceType = Database["public"]["Enums"]["service_type"];

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
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

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
