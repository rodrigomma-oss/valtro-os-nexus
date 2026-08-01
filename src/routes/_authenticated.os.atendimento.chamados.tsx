import { createFileRoute } from "@tanstack/react-router";
import { LifeBuoy } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/module-placeholder";

export const Route = createFileRoute("/_authenticated/os/atendimento/chamados")({
  component: ChamadosPage,
  head: () => ({
    meta: [
      { title: "Chamados — Valtro OS" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function ChamadosPage() {
  return (
    <ModulePlaceholder
      icon={LifeBuoy}
      title="Chamados"
      description="Acompanhe solicitações de atendimento, responsáveis, prioridades e histórico de resolução."
      emptyTitle="Nenhum chamado disponível"
      emptyDescription="O módulo de chamados será configurado na próxima etapa do Valtro OS."
    />
  );
}
