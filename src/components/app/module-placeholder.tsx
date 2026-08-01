import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export interface ModulePlaceholderProps {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  icon: LucideIcon;
}

/**
 * Página-base de módulo do Valtro OS ainda não integrado ao banco.
 * Não expõe formulários, métricas ou ações que aparentem funcionar.
 */
export function ModulePlaceholder({
  title,
  description,
  emptyTitle,
  emptyDescription,
  icon,
}: ModulePlaceholderProps) {
  return (
    <div className="p-6 md:p-10 space-y-6">
      <PageHeader title={title} description={description} />
      <EmptyState icon={icon} title={emptyTitle} description={emptyDescription} />
      <p className="text-xs text-muted-foreground">
        Módulo em preparação — será configurado na próxima etapa do Valtro OS.
      </p>
    </div>
  );
}
