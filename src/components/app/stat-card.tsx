import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

/**
 * Card estatístico placeholder para dashboards do CRM/Admin.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend = "neutral",
  className,
}: StatCardProps) {
  const trendColor =
    trend === "up"
      ? "text-success"
      : trend === "down"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-6 shadow-soft",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
        {Icon && (
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-primary">
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </div>
        )}
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
      {hint && <div className={cn("mt-2 text-xs", trendColor)}>{hint}</div>}
    </div>
  );
}
