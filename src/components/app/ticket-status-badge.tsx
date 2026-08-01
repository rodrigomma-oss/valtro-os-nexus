import { cn } from "@/lib/utils";
import type { TicketPriority, TicketStatus } from "@/types/ticket";
import {
  TICKET_PRIORITY_LABEL,
  TICKET_PRIORITY_TONE,
  TICKET_STATUS_LABEL,
  TICKET_STATUS_TONE,
} from "@/types/ticket";

/** Badge de status do chamado — mesmo padrão visual dos badges de lead/projeto. */
export function TicketStatusBadge({
  status,
  className,
}: {
  status: TicketStatus;
  className?: string;
}) {
  const tone = TICKET_STATUS_TONE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tone.className,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
      {TICKET_STATUS_LABEL[status]}
    </span>
  );
}

/** Badge de prioridade do chamado. */
export function TicketPriorityBadge({
  priority,
  className,
}: {
  priority: TicketPriority;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TICKET_PRIORITY_TONE[priority],
        className,
      )}
    >
      {TICKET_PRIORITY_LABEL[priority]}
    </span>
  );
}
