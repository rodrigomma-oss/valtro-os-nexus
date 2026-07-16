import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
}

/**
 * Cabeçalho padrão de seção institucional. Reutiliza a tipografia
 * e espaçamentos do Design System da Valtro Labs.
 */
export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow && (
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </div>
      )}
      <h2 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight text-foreground">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
