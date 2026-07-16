import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";

export const Route = createFileRoute("/crm/leads/$id")({
  component: CrmLeadDetail,
});

function CrmLeadDetail() {
  const { id } = Route.useParams();
  return (
    <div className="p-6 md:p-10 space-y-6">
      <PageHeader
        title={`Lead ${id}`}
        description="Tela em construção — detalhamento do lead será implementado na próxima sprint."
      />
    </div>
  );
}
