import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/types/lead";

const STATUS_STYLES: Record<
  LeadStatus,
  { label: string; className: string; dot: string }
> = {
  novo: {
    label: "Novo",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  em_triagem: {
    label: "Em triagem",
    className: "bg-sky-50 text-sky-700 border-sky-200",
    dot: "bg-sky-500",
  },
  contato: {
    label: "Em contato",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  qualificado: {
    label: "Qualificado",
    className: "bg-violet-50 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
  },
  aguardando_briefing: {
    label: "Aguardando briefing",
    className: "bg-cyan-50 text-cyan-700 border-cyan-200",
    dot: "bg-cyan-500",
  },
  briefing_enviado: {
    label: "Briefing enviado",
    className: "bg-teal-50 text-teal-700 border-teal-200",
    dot: "bg-teal-500",
  },
  em_analise: {
    label: "Em análise",
    className: "bg-purple-50 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
  },
  proposta: {
    label: "Proposta",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dot: "bg-indigo-500",
  },
  ganho: {
    label: "Convertido",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  perdido: {
    label: "Perdido",
    className: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
  descartado: {
    label: "Descartado",
    className: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
};

export interface StatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

/**
 * Badge de status de lead com dot indicador + rótulo em português.
 * Reutilizável em tabelas, cards de detalhe e filtros.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        style.className,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {style.label}
    </span>
  );
}
