/**
 * Domínio: Atendimento / Chamados — VOS-001C.
 */
import type { Database } from "@/integrations/supabase/types";

export type TicketStatus = Database["public"]["Enums"]["ticket_status"];
export type TicketPriority = Database["public"]["Enums"]["ticket_priority"];
export type TicketCategory = Database["public"]["Enums"]["ticket_category"];
export type TicketSource = Database["public"]["Enums"]["ticket_source"];
export type TicketEventType = Database["public"]["Enums"]["ticket_event_type"];

export interface Ticket {
  id: string;
  protocol: string;
  title: string;
  description: string | null;
  product_id: string | null;
  product_name: string | null;
  client_id: string | null;
  client_name: string | null;
  lead_id: string | null;
  lead_name: string | null;
  created_by: string | null;
  owner_id: string | null;
  owner_name: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  source: TicketSource;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface TicketEvent {
  id: string;
  ticket_id: string;
  type: TicketEventType;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

export const TICKET_STATUS_ORDER: TicketStatus[] = [
  "open",
  "waiting_customer",
  "waiting_internal",
  "resolved",
  "closed",
  "cancelled",
];

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Aberto",
  waiting_customer: "Aguardando cliente",
  waiting_internal: "Aguardando interno",
  resolved: "Resolvido",
  closed: "Encerrado",
  cancelled: "Cancelado",
};

export const TICKET_STATUS_TONE: Record<TicketStatus, { className: string; dot: string }> = {
  open: { className: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  waiting_customer: { className: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  waiting_internal: { className: "bg-cyan-50 text-cyan-700 border-cyan-200", dot: "bg-cyan-500" },
  resolved: { className: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  closed: { className: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
  cancelled: { className: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
};

export const TICKET_CLOSED_STATUSES: TicketStatus[] = ["closed", "cancelled"];

export const TICKET_PRIORITY_ORDER: TicketPriority[] = ["low", "normal", "high", "urgent"];

export const TICKET_PRIORITY_LABEL: Record<TicketPriority, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

export const TICKET_PRIORITY_TONE: Record<TicketPriority, string> = {
  low: "bg-slate-100 text-slate-600 border-slate-200",
  normal: "bg-blue-50 text-blue-700 border-blue-200",
  high: "bg-amber-50 text-amber-700 border-amber-200",
  urgent: "bg-rose-50 text-rose-700 border-rose-200",
};

export const TICKET_CATEGORY_ORDER: TicketCategory[] = [
  "support",
  "question",
  "commercial",
  "billing",
  "technical",
  "other",
];

export const TICKET_CATEGORY_LABEL: Record<TicketCategory, string> = {
  support: "Suporte",
  question: "Dúvida",
  commercial: "Comercial",
  billing: "Financeiro",
  technical: "Técnico",
  other: "Outro",
};

export const TICKET_SOURCE_LABEL: Record<TicketSource, string> = {
  admin: "Interno",
  portal: "Portal",
  email: "E-mail",
  api: "API",
};
