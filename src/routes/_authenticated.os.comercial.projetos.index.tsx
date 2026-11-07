import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FolderKanban, Search, SearchX } from "lucide-react";
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
import { ProjectStatusBadge } from "@/components/app/project-status-badge";
import { listProjects, getProjectsOverview } from "@/lib/projects.functions";
import type { Project, ProjectStatus } from "@/types/project";
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_ORDER } from "@/types/project";

export const Route = createFileRoute("/_authenticated/os/comercial/projetos/")({
  component: ProjectsList,
  head: () => ({
    meta: [
      { title: "Projetos — CRM Valtro Labs" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function ProjectsList() {
  const navigate = useNavigate();
  const listFn = useServerFn(listProjects);
  const overviewFn = useServerFn(getProjectsOverview);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "todos">("todos");
  const [term, setTerm] = useState("");

  const projectsQuery = useQuery({
    queryKey: ["projects", statusFilter],
    queryFn: () => listFn({ data: statusFilter === "todos" ? {} : { status: statusFilter } }),
  });
  const overviewQuery = useQuery({
    queryKey: ["projects-overview"],
    queryFn: () => overviewFn(),
    staleTime: 30_000,
  });

  const data = projectsQuery.data ?? [];
  const q = term.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      q.length === 0
        ? data
        : data.filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              p.code.toLowerCase().includes(q) ||
              (p.client_name ?? "").toLowerCase().includes(q),
          ),
    [data, q],
  );

  const columns: DataTableColumn<Project>[] = [
    {
      key: "code",
      header: "Código",
      render: (p) => <span className="text-sm font-medium text-foreground">{p.code}</span>,
    },
    {
      key: "name",
      header: "Projeto",
      render: (p) => (
        <div>
          <p className="font-semibold text-foreground truncate">{p.name}</p>
          <p className="text-xs text-muted-foreground truncate">{p.client_name ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => <ProjectStatusBadge status={p.status} />,
    },
    {
      key: "owner",
      header: "Responsável",
      render: (p) => (
        <span className="text-sm text-muted-foreground">{p.owner_name ?? "—"}</span>
      ),
    },
    {
      key: "due",
      header: "Prazo",
      render: (p) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">{fmtDate(p.due_date)}</span>
      ),
    },
  ];

  const overview = overviewQuery.data;

  return (
    <div className="p-6 md:p-10 space-y-6">
      <PageHeader
        title="Projetos"
        description="Gestão de execução — todos os projetos vinculados a clientes."
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total" value={overview?.total ?? 0} hint="Projetos" />
        <StatCard label="Ativos" value={overview?.ativos ?? 0} hint="Em execução" />
        <StatCard
          label="Em desenvolvimento"
          value={overview?.emDesenvolvimento ?? 0}
          hint="Fase de build"
        />
        <StatCard
          label="Aguardando cliente"
          value={overview?.aguardandoCliente ?? 0}
          hint="Retorno pendente"
        />
        <StatCard
          label="Atrasados"
          value={overview?.atrasados ?? 0}
          hint="Prazo vencido"
          trend={overview && overview.atrasados > 0 ? "down" : "neutral"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            strokeWidth={1.75}
          />
          <Input
            placeholder="Buscar por nome, código ou cliente..."
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as ProjectStatus | "todos")}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {PROJECT_STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {PROJECT_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={projectsQuery.isLoading}
        getRowId={(p) => p.id}
        onRowClick={(p) => navigate({ to: "/os/comercial/projetos/$id", params: { id: p.id } })}
        emptyState={
          q ? (
            <EmptyState
              icon={SearchX}
              title="Nenhum projeto encontrado"
              description="Ajuste os filtros ou os termos de busca."
              action={
                <Button variant="outline" size="sm" onClick={() => setTerm("")}>
                  Limpar busca
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={FolderKanban}
              title="Nenhum projeto ainda"
              description="Projetos são criados a partir de propostas aprovadas ou manualmente no cliente."
            />
          )
        }
      />
    </div>
  );
}
