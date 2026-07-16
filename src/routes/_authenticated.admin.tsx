import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/layouts/app-layout";
import { PageHeader } from "@/components/app/page-header";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin — Valtro Labs" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function AdminPage() {
  return (
    <AppLayout>
      <div className="p-6 md:p-10 space-y-6">
        <PageHeader
          title="Administração"
          description="Tela em construção — a área administrativa será implementada nas próximas sprints."
        />
      </div>
    </AppLayout>
  );
}
