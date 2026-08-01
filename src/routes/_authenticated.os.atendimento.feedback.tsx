import { createFileRoute } from "@tanstack/react-router";
import { MessageSquareHeart } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/module-placeholder";

export const Route = createFileRoute("/_authenticated/os/atendimento/feedback")({
  component: FeedbackPage,
  head: () => ({
    meta: [
      { title: "Feedback — Valtro OS" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function FeedbackPage() {
  return (
    <ModulePlaceholder
      icon={MessageSquareHeart}
      title="Feedback"
      description="Centralize percepções, sugestões e interesse comercial dos participantes dos produtos."
      emptyTitle="Nenhum feedback registrado"
      emptyDescription="O módulo de feedback será configurado em uma próxima etapa."
    />
  );
}
