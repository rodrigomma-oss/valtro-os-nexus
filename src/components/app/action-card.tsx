import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ActionCardProps {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * Card genérico com título, descrição, conteúdo e área de ações no rodapé.
 * Utilizado para blocos como "Observações" ou seções de detalhe do lead.
 */
export function ActionCard({
  title,
  description,
  children,
  actions,
  className,
}: ActionCardProps) {
  return (
    <Card className={cn("shadow-soft", className)}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </CardHeader>
      {children && <CardContent className="pt-0">{children}</CardContent>}
      {actions && (
        <div className="flex items-center justify-end gap-2 px-6 pb-6">
          {actions}
        </div>
      )}
    </Card>
  );
}
