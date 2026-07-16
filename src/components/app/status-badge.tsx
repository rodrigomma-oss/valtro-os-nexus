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
  proposta: {
    label: "Proposta",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dot: "bg-indigo-500",
  },
  ganho: {
    label: "Ganho",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  perdido: {
    label: "Perdido",
    className: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
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
