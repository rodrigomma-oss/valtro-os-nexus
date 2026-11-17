import { useEffect } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { setBreadcrumbLabel } from "@/lib/breadcrumb-store";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, Building2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { ClientInfoCard } from "@/components/app/client-info-card";
import { ProjectsCard } from "@/components/app/projects-card";
import { ContractedServicesCard } from "@/components/app/contracted-services-card";
import { ClientLifecycleCard } from "@/components/app/client-lifecycle-card";
import { getClient } from "@/lib/clients.functions";
import { getMyRoles } from "@/lib/leads.functions";

export const Route = createFileRoute("/_authenticated/os/comercial/clientes/$id")({
  component: ClientDetail,
  /**
   * Sprint 13.9 (P1-3) — `?cs=<client_service_id>` chega do Centro de
   * Operações e destaca a contratação exata que originou a pendência.
   */
  validateSearch: (search: Record<string, unknown>): { cs?: string } => ({
    cs: typeof search.cs === "string" && search.cs.length > 0 ? search.cs : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Cliente — CRM Valtro Labs" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function ClientDetail() {
  const { id } = Route.useParams();
  const { cs } = Route.useSearch();
  const getClientFn = useServerFn(getClient);
  const getRolesFn = useServerFn(getMyRoles);

  const clientQuery = useQuery({
    queryKey: ["client", id],
    queryFn: () => getClientFn({ data: { id } }),
  });
  const rolesQuery = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => getRolesFn(),
    staleTime: 60_000,
  });

  const clientName = clientQuery.data?.company_name;
  useEffect(() => {
    if (clientName) setBreadcrumbLabel(id, clientName);
  }, [id, clientName]);




  if (clientQuery.isLoading) {
    return (
      <div className="p-10 flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando cliente…
      </div>
    );
  }
  const client = clientQuery.data;
  if (!client) throw notFound();

  const canWrite = rolesQuery.data?.canWrite ?? false;

  return (
    <div className="p-6 md:p-10 space-y-6">
      <PageHeader
        title={client.company_name}
        description={`Cliente${client.city ? " · " + client.city : ""}`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/os/comercial/clientes" search={{}}>
                <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.75} />
                Voltar
              </Link>
            </Button>
            {client.lead_id && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  to="/os/comercial/leads/$id"
                  params={{ id: client.lead_id }}
                  search={{ proposta: undefined, acao: undefined }}
                  className="gap-2"
                >
                  <Building2 className="h-4 w-4" strokeWidth={1.75} />
                  Ver lead de origem
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ClientInfoCard client={client} />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <ClientLifecycleCard
            clientId={client.id}
            clientStatus={client.status}
            canWrite={canWrite}
          />

          <ContractedServicesCard
            clientId={client.id}
            canWrite={canWrite}
            highlightServiceId={cs}
          />

          <ProjectsCard clientId={client.id} canWrite={canWrite} />
        </div>
      </div>
    </div>
  );
}
