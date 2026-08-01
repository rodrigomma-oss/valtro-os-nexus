import { createFileRoute } from "@tanstack/react-router";
import { FlaskConical } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/module-placeholder";

export const Route = createFileRoute("/_authenticated/os/produtos/valtro-pricing/beta")({
  component: BetaPage,
  head: () => ({
    meta: [
      { title: "Beta Fechado — Valtro Pricing — Valtro OS" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function BetaPage() {
  return (
    <ModulePlaceholder
      icon={FlaskConical}
      title="Beta Fechado — Valtro Pricing"
      description="Acompanhe participantes, convites, ativação e evolução do Beta Fechado do Valtro Pricing."
      emptyTitle="Nenhum participante cadastrado"
      emptyDescription="A gestão dos participantes do beta será configurada em uma próxima etapa."
    />
  );
}
