import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface FeatureCardProps {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/**
 * Card genérico de destaque (ícone + título + texto).
 * Segue o padrão visual institucional (branco, borda #E2E8F0, shadow-soft).
 */
export function FeatureCard({
  icon: Icon,
  title,
  description,
  className,
  children,
}: FeatureCardProps) {
  return (
    <div
      className={cn(
        "group rounded-2xl border border-border bg-background p-7 shadow-soft transition-all duration-200 hover:shadow-elevated hover:border-primary/30",
        className,
      )}
    >
      {Icon && (
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-soft text-primary transition-transform group-hover:scale-105">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      )}
      <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
