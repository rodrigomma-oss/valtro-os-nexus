import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type QueueTone = "primary" | "warning" | "success" | "info";

interface QueueCardProps {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  tone?: QueueTone;
  onClick?: () => void;
  index?: number;
}

const toneMap: Record<QueueTone, { icon: string; ring: string }> = {
  primary: { icon: "bg-primary/10 text-primary", ring: "hover:border-primary/40" },
  warning: { icon: "bg-warning/10 text-warning", ring: "hover:border-warning/40" },
  success: { icon: "bg-success/10 text-success", ring: "hover:border-success/40" },
  info: { icon: "bg-info/10 text-info", ring: "hover:border-info/40" },
};

export function QueueCard({ title, value, description, icon: Icon, tone = "primary", onClick, index = 0 }: QueueCardProps) {
  const t = toneMap[tone];
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      whileHover={{ y: -2 }}
      className={cn(
        "group text-left rounded-2xl border border-border bg-surface p-6 shadow-soft transition-all",
        "hover:shadow-md",
        t.ring,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className={cn("grid h-10 w-10 place-items-center rounded-xl", t.icon)}>
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <span className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">{value}</span>
      </div>
      <div className="mt-4 text-sm font-semibold text-foreground">{title}</div>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
    </motion.button>
  );
}
