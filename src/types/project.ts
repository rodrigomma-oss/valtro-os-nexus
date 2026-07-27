/**
 * Domínio: Projetos — Sprint 12.
 */
import type { Database } from "@/integrations/supabase/types";

export type ProjectStatus = Database["public"]["Enums"]["project_status"];
export type ProjectEventType = Database["public"]["Enums"]["project_event_type"];

export interface Project {
  id: string;
  client_id: string;
  client_name: string | null;
  /** Vínculo explícito com a contratação (Sprint 15.1). */
  client_service_id: string | null;
  proposal_id: string | null;
  proposal_number: string | null;
  code: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  owner_id: string | null;
  owner_name: string | null;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectEvent {
  id: string;
  project_id: string;
  type: ProjectEventType;
  description: string | null;
  metadata: Record<string, any> | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  nao_iniciado: "Não iniciado",
  planejamento: "Planejamento",
  em_desenvolvimento: "Em desenvolvimento",
  em_revisao: "Em revisão",
  aguardando_cliente: "Aguardando cliente",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const PROJECT_STATUS_TONE: Record<ProjectStatus, string> = {
  nao_iniciado: "bg-slate-50 text-slate-700 border-slate-200",
  planejamento: "bg-blue-50 text-blue-700 border-blue-200",
  em_desenvolvimento: "bg-indigo-50 text-indigo-700 border-indigo-200",
  em_revisao: "bg-amber-50 text-amber-700 border-amber-200",
  aguardando_cliente: "bg-amber-50 text-amber-700 border-amber-200",
  concluido: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelado: "bg-rose-50 text-rose-700 border-rose-200",
};

export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "nao_iniciado",
  "planejamento",
  "em_desenvolvimento",
  "em_revisao",
  "aguardando_cliente",
  "concluido",
  "cancelado",
];

export const PROJECT_ACTIVE_STATUSES: ProjectStatus[] = [
  "planejamento",
  "em_desenvolvimento",
  "em_revisao",
  "aguardando_cliente",
];

export interface ProjectsOverview {
  total: number;
  ativos: number;
  emDesenvolvimento: number;
  aguardandoCliente: number;
  concluidos: number;
  cancelados: number;
  atrasados: number;
}
