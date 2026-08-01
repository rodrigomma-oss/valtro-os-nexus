import { createFileRoute } from "@tanstack/react-router";
import { Bug } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/module-placeholder";

export const Route = createFileRoute("/_authenticated/os/atendimento/bugs")({
  component: BugsPage,
  head: () => ({
    meta: [
      { title: "Bugs — Valtro OS" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function BugsPage() {
  return (
    <ModulePlaceholder
      icon={Bug}
      title="Bugs"
      description="Registre e acompanhe falhas técnicas identificadas nos produtos da Valtro Labs."
      emptyTitle="Nenhum bug registrado"
      emptyDescription="O módulo de gestão de bugs será configurado em uma próxima etapa."
    />
  );
}
