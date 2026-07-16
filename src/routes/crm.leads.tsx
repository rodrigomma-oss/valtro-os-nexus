import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";

export const Route = createFileRoute("/crm/leads")({
  component: CrmLeads,
});

function CrmLeads() {
  return (
    <div className="p-6 md:p-10 space-y-6">
      <PageHeader
        title="Leads"
        description="Tela em construção — a listagem de leads será implementada na próxima sprint."
      />
    </div>
  );
}
