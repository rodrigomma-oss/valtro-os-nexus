/**
 * Domínio: Clientes — Sprint 12.
 */
import type { Database } from "@/integrations/supabase/types";

export type ClientStatus = Database["public"]["Enums"]["client_status"];

export interface Client {
  id: string;
  lead_id: string | null;
  company_name: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  segment: string | null;
  owner_id: string | null;
  owner_name: string | null;
  status: ClientStatus;
  notes: string | null;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  arquivado: "Arquivado",
};

export const CLIENT_STATUS_TONE: Record<ClientStatus, string> = {
  ativo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inativo: "bg-slate-50 text-slate-600 border-slate-200",
  arquivado: "bg-slate-50 text-slate-400 border-slate-200",
};
