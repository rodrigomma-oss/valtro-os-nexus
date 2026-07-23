import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Search, SearchX } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { DataTable, type DataTableColumn } from "@/components/app/data-table";
import { StatCard } from "@/components/app/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listClients } from "@/lib/clients.functions";
import { getClientsOverview } from "@/lib/projects.functions";
import { cn } from "@/lib/utils";
import type { Client, ClientStatus } from "@/types/client";
import { CLIENT_STATUS_LABEL, CLIENT_STATUS_TONE } from "@/types/client";
import { formatPhone } from "@/lib/formatters";

export const Route = createFileRoute("/_authenticated/crm/clientes/")({
  component: ClientsList,
  head: () => ({
    meta: [
      { title: "Clientes — CRM Valtro Labs" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function ClientsList() {
  const navigate = useNavigate();
  const listFn = useServerFn(listClients);
  const overviewFn = useServerFn(getClientsOverview);

  const [statusFilter, setStatusFilter] = useState<ClientStatus | "todos">("todos");
  const [term, setTerm] = useState("");

  const clientsQuery = useQuery({
    queryKey: ["clients", statusFilter],
    queryFn: () =>
      listFn({ data: statusFilter === "todos" ? {} : { status: statusFilter } }),
  });
  const overviewQuery = useQuery({
    queryKey: ["clients-overview"],
    queryFn: () => overviewFn(),
    staleTime: 30_000,
  });

  const data = clientsQuery.data ?? [];
  const q = term.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      q.length === 0
        ? data
        : data.filter(
            (c) =>
              c.company_name.toLowerCase().includes(q) ||
              c.contact_name.toLowerCase().includes(q) ||
              (c.email ?? "").toLowerCase().includes(q) ||
              (c.city ?? "").toLowerCase().includes(q),
          ),
    [data, q],
  );

  const columns: DataTableColumn<Client>[] = [
    {
      key: "company",
      header: "Empresa",
      render: (c) => (
        <div>
          <p className="font-semibold text-foreground">{c.company_name}</p>
          <p className="text-xs text-muted-foreground">{c.contact_name}</p>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Telefone",
      render: (c) => (
        <span className="text-sm text-muted-foreground">
          {c.phone ? formatPhone(c.phone) : "—"}
        </span>
      ),
    },
    {
      key: "city",
      header: "Localização",
      render: (c) => (
        <span className="text-sm text-muted-foreground">
          {[c.city, c.state].filter(Boolean).join(" · ") || "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (c) => (
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
            CLIENT_STATUS_TONE[c.status],
          )}
        >
          {CLIENT_STATUS_LABEL[c.status]}
        </span>
      ),
    },
    {
      key: "owner",
      header: "Responsável",
      render: (c) => (
        <span className="text-sm text-muted-foreground">{c.owner_name ?? "—"}</span>
      ),
    },
  ];

  const overview = overviewQuery.data;

  return (
    <div className="p-6 md:p-10 space-y-6">
      <PageHeader
        title="Clientes"
        description="Base de clientes convertidos a partir de leads e oportunidades ganhas."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total" value={overview?.total ?? 0} hint="Base de clientes" />
        <StatCard label="Ativos" value={overview?.ativos ?? 0} hint="Em relacionamento" />
        <StatCard label="Inativos" value={overview?.inativos ?? 0} hint="Sem operação atual" />
        <StatCard
          label="Arquivados"
          value={overview?.arquivados ?? 0}
          hint="Fora do relacionamento"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            strokeWidth={1.75}
          />
          <Input
            placeholder="Buscar por empresa, contato, cidade..."
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ClientStatus | "todos")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
            <SelectItem value="arquivado">Arquivado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={clientsQuery.isLoading}
        getRowId={(c) => c.id}
        onRowClick={(c) => navigate({ to: "/crm/clientes/$id", params: { id: c.id } })}
        emptyState={
          q ? (
            <EmptyState
              icon={SearchX}
              title="Nenhum cliente para essa busca"
              description="Ajuste os filtros ou termos para encontrar clientes."
              action={
                <Button variant="outline" size="sm" onClick={() => setTerm("")}>
                  Limpar busca
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Building2}
              title="Nenhum cliente ainda"
              description="Clientes são criados automaticamente quando uma proposta é aprovada, ou manualmente a partir de um lead."
            />
          )
        }
      />
    </div>
  );
}
