import type { LucideIcon } from "lucide-react";
import {
  FileText,
  Stethoscope,
  FileSignature,
  Users,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  ThumbsUp,
} from "lucide-react";

/* Hero summary */
export const operationSummary = {
  diagnosticosPendentes: 3,
  propostasPendentes: 2,
  briefingsHoje: 1,
};

/* Minha Fila */
export type QueueTone = "primary" | "warning" | "success" | "info";
export interface QueueCard {
  id: string;
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  tone: QueueTone;
}
export const queueCards: QueueCard[] = [
  { id: "briefing", title: "Aguardando Briefing", value: 4, description: "Leads que ainda precisam preencher o briefing inicial.", icon: FileText, tone: "info" },
  { id: "diag", title: "Diagnósticos Pendentes", value: 3, description: "Diagnósticos aguardando análise da equipe.", icon: Stethoscope, tone: "warning" },
  { id: "prop", title: "Propostas Pendentes", value: 2, description: "Propostas em elaboração ou revisão interna.", icon: FileSignature, tone: "primary" },
  { id: "clientes", title: "Clientes Ativos", value: 12, description: "Contas em andamento com contrato assinado.", icon: Users, tone: "success" },
];

/* Inbox */
export type InboxTone = "info" | "warning" | "danger" | "success";
export interface InboxItem {
  id: string;
  tone: InboxTone;
  icon: LucideIcon;
  title: string;
  description: string;
  time: string;
  actionLabel: string;
}
export const inboxItems: InboxItem[] = [
  { id: "1", tone: "info", icon: UserPlus, title: "Novo lead recebido", description: "Camila Duarte — Loja Bella Home", time: "há 12 min", actionLabel: "Abrir lead" },
  { id: "2", tone: "warning", icon: FileText, title: "Briefing concluído", description: "Rodrigo Farias finalizou o briefing", time: "há 42 min", actionLabel: "Revisar briefing" },
  { id: "3", tone: "danger", icon: AlertTriangle, title: "Diagnóstico próximo do prazo", description: "Ateliê Nórdico — vence hoje às 18h", time: "há 1h", actionLabel: "Priorizar" },
  { id: "4", tone: "success", icon: ThumbsUp, title: "Cliente aprovou proposta", description: "Studio Marta — plano Premium", time: "há 3h", actionLabel: "Iniciar onboarding" },
  { id: "5", tone: "info", icon: CheckCircle2, title: "Documentos recebidos", description: "Loja Verão — DRE e faturamento", time: "há 5h", actionLabel: "Visualizar" },
];

/* Pipeline */
export interface PipelineStage {
  id: string;
  label: string;
  count: number;
  tone: QueueTone;
  hint: string;
}
export const pipeline: PipelineStage[] = [
  { id: "lead", label: "Lead", count: 18, tone: "info", hint: "Entradas nas últimas 2 semanas" },
  { id: "briefing", label: "Briefing", count: 9, tone: "primary", hint: "Em preenchimento ou revisão" },
  { id: "diagnostico", label: "Diagnóstico", count: 5, tone: "warning", hint: "Em análise pela equipe" },
  { id: "proposta", label: "Proposta", count: 3, tone: "primary", hint: "Enviadas aguardando resposta" },
  { id: "cliente", label: "Cliente", count: 12, tone: "success", hint: "Contas ativas" },
];

/* Timeline */
export interface ActivityItem {
  id: string;
  who: string;
  action: string;
  time: string;
}
export const activities: ActivityItem[] = [
  { id: "a1", who: "João Prado", action: "iniciou o briefing", time: "agora" },
  { id: "a2", who: "Maria Alencar", action: "enviou documentos financeiros", time: "há 25 min" },
  { id: "a3", who: "Pedro Vinhas", action: "recebeu proposta comercial", time: "há 1h" },
  { id: "a4", who: "Studio Marta", action: "aprovou proposta Premium", time: "há 3h" },
  { id: "a5", who: "Camila Duarte", action: "foi adicionada como novo lead", time: "hoje, 09:12" },
  { id: "a6", who: "Loja Verão", action: "concluiu diagnóstico", time: "ontem" },
];

/* Agenda */
export type AgendaBucket = "hoje" | "amanha" | "proximos";
export interface AgendaEvent {
  id: string;
  time: string;
  title: string;
  detail: string;
  bucket: AgendaBucket;
}
export const agenda: AgendaEvent[] = [
  { id: "e1", time: "14:00", title: "Call de kickoff — Studio Marta", detail: "Meet · onboarding inicial", bucket: "hoje" },
  { id: "e2", time: "16:30", title: "Revisão de proposta — Ateliê Nórdico", detail: "Interna · equipe comercial", bucket: "hoje" },
  { id: "e3", time: "10:00", title: "Diagnóstico — Loja Bella Home", detail: "Apresentação de resultados", bucket: "amanha" },
  { id: "e4", time: "Qui, 09:30", title: "Follow-up — Camila Duarte", detail: "Retorno sobre briefing", bucket: "proximos" },
  { id: "e5", time: "Sex, 15:00", title: "Alinhamento semanal", detail: "Equipe comercial", bucket: "proximos" },
];

/* Metrics */
export interface Metric {
  id: string;
  label: string;
  value: string;
  hint: string;
  trend: "up" | "down" | "neutral";
}
export const metrics: Metric[] = [
  { id: "m1", label: "Tempo médio de resposta", value: "3h 42min", hint: "-12% vs. semana anterior", trend: "up" },
  { id: "m2", label: "Conversão lead → cliente", value: "28%", hint: "+4pp no mês", trend: "up" },
  { id: "m3", label: "Diagnósticos no mês", value: "17", hint: "9 concluídos", trend: "neutral" },
  { id: "m4", label: "Propostas emitidas", value: "11", hint: "5 aprovadas", trend: "up" },
  { id: "m5", label: "Receita estimada", value: "R$ 184k", hint: "Pipeline ponderado", trend: "neutral" },
];
