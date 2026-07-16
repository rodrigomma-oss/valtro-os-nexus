import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/layouts/app-layout";
import { PageHeader } from "@/components/app/page-header";

export const Route = createFileRoute("/briefing")({
  component: BriefingPage,
  head: () => ({
    meta: [
      { title: "Briefing — Valtro Labs" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function BriefingPage() {
  return (
    <AppLayout>
      <div className="p-6 md:p-10 space-y-6">
        <PageHeader
          title="Portal de Briefing"
          description="Tela em construção — o portal de diagnóstico será implementado nas próximas sprints."
        />
      </div>
    </AppLayout>
  );
}
