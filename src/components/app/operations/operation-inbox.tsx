import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type InboxTone = "info" | "warning" | "danger" | "success";

interface InboxItem {
  id: string;
  tone: InboxTone;
  icon: LucideIcon;
  title: string;
  description: string;
  time: string;
  actionLabel: string;
}

interface OperationInboxProps {
  items: InboxItem[];
  onItemClick?: (id: string) => void;
}

const dotMap: Record<InboxTone, string> = {
  info: "bg-info",
  warning: "bg-warning",
  danger: "bg-destructive",
  success: "bg-success",
};
const iconBgMap: Record<InboxTone, string> = {
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  success: "bg-success/10 text-success",
};

export function OperationInbox({ items, onItemClick }: OperationInboxProps) {
  return (
    <ul className="divide-y divide-border rounded-2xl border border-border bg-surface shadow-soft overflow-hidden">
      {items.map((it, i) => (
        <motion.li
          key={it.id}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04, duration: 0.3 }}
        >
          <button
            type="button"
            onClick={() => onItemClick?.(it.id)}
            className="group w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/40"
          >
            <span className={cn("h-2 w-2 shrink-0 rounded-full", dotMap[it.tone])} />
            <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", iconBgMap[it.tone])}>
              <it.icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{it.title}</p>
              <p className="text-xs text-muted-foreground truncate">{it.description}</p>
            </div>
            <div className="hidden sm:flex flex-col items-end shrink-0">
              <span className="text-xs text-muted-foreground">{it.time}</span>
              <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                {it.actionLabel}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
          </button>
        </motion.li>
      ))}
    </ul>
  );
}
