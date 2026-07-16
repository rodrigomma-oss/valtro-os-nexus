import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";

export const Route = createFileRoute("/crm/dashboard")({
  component: CrmDashboard,
});

function CrmDashboard() {
  return (
    <div className="p-6 md:p-10 space-y-6">
      <PageHeader
        title="Dashboard"
        description="Tela em construção — indicadores do CRM serão exibidos aqui."
      />
    </div>
  );
}
