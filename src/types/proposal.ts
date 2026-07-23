/**
 * Domínio: Propostas Comerciais — Sprint 11.
 */
import type { Database } from "@/integrations/supabase/types";

export type ProposalStatus = Database["public"]["Enums"]["proposal_status"];
export type ProposalNegotiationType =
  Database["public"]["Enums"]["proposal_negotiation_type"];

export interface Proposal {
  id: string;
  lead_id: string;
  number: string;
  title: string;
  status: ProposalStatus;
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  issued_at: string;
  valid_until: string | null;
  owner_id: string | null;
  owner_name: string | null;
  internal_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProposalItem {
  id: string;
  proposal_id: string;
  position: number;
  service_key: string | null;
  service_label: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
  updated_at: string;
}

export interface ProposalNegotiation {
  id: string;
  proposal_id: string;
  type: ProposalNegotiationType;
  content: string;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = {
  rascunho: "Rascunho",
  em_elaboracao: "Em elaboração",
  enviada: "Enviada",
  em_negociacao: "Em negociação",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  expirada: "Expirada",
  cancelada: "Cancelada",
};

export const PROPOSAL_STATUS_TONE: Record<ProposalStatus, string> = {
  rascunho: "bg-slate-50 text-slate-700 border-slate-200",
  em_elaboracao: "bg-slate-50 text-slate-700 border-slate-200",
  enviada: "bg-blue-50 text-blue-700 border-blue-200",
  em_negociacao: "bg-amber-50 text-amber-700 border-amber-200",
  aprovada: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejeitada: "bg-rose-50 text-rose-700 border-rose-200",
  expirada: "bg-amber-50 text-amber-700 border-amber-200",
  cancelada: "bg-slate-50 text-slate-500 border-slate-200",
};

export const PROPOSAL_STATUS_ORDER: ProposalStatus[] = [
  "rascunho",
  "em_elaboracao",
  "enviada",
  "em_negociacao",
  "aprovada",
  "rejeitada",
  "expirada",
  "cancelada",
];

export const NEGOTIATION_TYPE_LABEL: Record<ProposalNegotiationType, string> = {
  contraproposta: "Contraproposta",
  desconto: "Desconto",
  alteracao: "Alteração",
  observacao: "Observação",
};

export interface ProposalWithDetails {
  proposal: Proposal;
  items: ProposalItem[];
  negotiations: ProposalNegotiation[];
}

export interface ProposalMetrics {
  em_elaboracao: number;
  enviadas: number;
  em_negociacao: number;
  aprovadas: number;
  pipeline_value: number;
  conversion_rate: number;
}
