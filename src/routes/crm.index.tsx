import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";

export const Route = createFileRoute("/crm/")({
  component: CrmIndex,
});

function CrmIndex() {
  return (
    <div className="p-6 md:p-10 space-y-6">
      <PageHeader
        title="CRM"
        description="Tela em construção — módulo comercial em preparação."
      />
    </div>
  );
}
