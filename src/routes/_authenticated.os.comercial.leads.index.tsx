import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Plus,
  Search,
  SlidersHorizontal,
  Download,
  ChevronLeft,
  ChevronRight,
  Users,
  MoreHorizontal,
  Phone,
  Instagram,
  MapPin,
  X,
  SearchX,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { DataTable, type DataTableColumn } from "@/components/app/data-table";
import { StatusBadge } from "@/components/app/status-badge";
import { StatCard } from "@/components/app/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { NewLeadDialog } from "@/components/app/new-lead-dialog";
import { formatPhone } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  archiveLead,
  getMyRoles,
  listLeads,
} from "@/lib/leads.functions";
import type { Lead, LeadSource, LeadStatus } from "@/types/lead";
import { SOURCE_LABEL, STATUS_LABEL } from "@/types/lead";

type QuickView =
  | "novos-do-site"
  | "aguardando-triagem"
  | "sem-responsavel"
  | "briefings-aguardando"
  | "briefings-concluidos"
  | "followups-vencidos"
  | "followups-hoje"
  | "followups-proximos";

const QUICK_VIEWS: readonly QuickView[] = [
  "novos-do-site",
  "aguardando-triagem",
  "sem-responsavel",
  "briefings-aguardando",
  "briefings-concluidos",
  "followups-vencidos",
  "followups-hoje",
  "followups-proximos",
] as const;

export const Route = createFileRoute("/_authenticated/os/comercial/leads/")({
  component: CrmLeads,
  validateSearch: (s: Record<string, unknown>): { view?: QuickView } => ({
    view: QUICK_VIEWS.includes(s.view as QuickView)
      ? (s.view as QuickView)
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Leads — CRM Valtro Labs" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const STATUS_ORDER: LeadStatus[] = [
  "novo",
  "em_triagem",
  "contato",
  "qualificado",
  "aguardando_briefing",
  "briefing_enviado",
  "em_analise",
  "proposta",
  "ganho",
  "perdido",
  "descartado",
];

const STATUS_OPTIONS: { value: LeadStatus | "todos"; label: string }[] = [
  { value: "todos", label: "Todos os status" },
  ...STATUS_ORDER.map((v) => ({ value: v, label: STATUS_LABEL[v] })),
];

const SOURCE_ORDER: LeadSource[] = [
  "site",
  "instagram",
  "indicacao",
  "google",
  "evento",
  "outbound",
  "diagnostico",
  "manual",
];

const SOURCE_OPTIONS: { value: LeadSource | "todas"; label: string }[] = [
  { value: "todas", label: "Todas as origens" },
  ...SOURCE_ORDER.map((v) => ({ value: v, label: SOURCE_LABEL[v] })),
];

const PAGE_SIZE = 8;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function CrmLeads() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const listLeadsFn = useServerFn(listLeads);
  const getMyRolesFn = useServerFn(getMyRoles);
  const archiveLeadFn = useServerFn(archiveLead);

  const leadsQuery = useQuery({
    queryKey: ["leads"],
    queryFn: () => listLeadsFn({ data: { includeArchived: false } }),
  });
  const rolesQuery = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => getMyRolesFn(),
    staleTime: 60_000,
  });

  const search_ = Route.useSearch();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "todos">("todos");
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "todas">("todas");
  const [quickView, setQuickView] = useState<QuickView | null>(
    search_.view ?? null,
  );
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  const canWrite = rolesQuery.data?.canWrite ?? false;
  const isAdmin = rolesQuery.data?.isAdmin ?? false;
  const leads = leadsQuery.data ?? [];

  const term = search.trim().toLowerCase();
  const hasFilters =
    term.length > 0 ||
    statusFilter !== "todos" ||
    sourceFilter !== "todas" ||
    quickView !== null;

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      const matchStatus =
        statusFilter === "todos" || lead.status === statusFilter;
      const matchSource =
        sourceFilter === "todas" || lead.source === sourceFilter;
      const matchTerm =
        term.length === 0 ||
        lead.company_name.toLowerCase().includes(term) ||
        lead.contact_name.toLowerCase().includes(term) ||
        (lead.city ?? "").toLowerCase().includes(term);
      const now = Date.now();
      const startToday = new Date();
      startToday.setHours(0, 0, 0, 0);
      const endToday = startToday.getTime() + 24 * 60 * 60 * 1000;
      const in7 = startToday.getTime() + 7 * 24 * 60 * 60 * 1000;
      const followAt = lead.next_follow_up_at ? new Date(lead.next_follow_up_at).getTime() : null;
      const matchQuick =
        quickView === null ||
        (quickView === "novos-do-site" &&
          lead.source === "site" &&
          lead.status === "novo") ||
        (quickView === "aguardando-triagem" &&
          ["novo", "em_triagem"].includes(lead.status)) ||
        (quickView === "sem-responsavel" && !lead.owner_id) ||
        (quickView === "briefings-aguardando" &&
          lead.status === "briefing_enviado") ||
        (quickView === "briefings-concluidos" &&
          lead.status === "em_analise") ||
        (quickView === "followups-vencidos" &&
          followAt !== null &&
          followAt < startToday.getTime()) ||
        (quickView === "followups-hoje" &&
          followAt !== null &&
          followAt >= startToday.getTime() &&
          followAt < endToday) ||
        (quickView === "followups-proximos" &&
          followAt !== null &&
          followAt >= endToday &&
          followAt < in7);
      void now;
      return matchStatus && matchSource && matchTerm && matchQuick;
    });
  }, [leads, term, statusFilter, sourceFilter, quickView]);

  const kpis = useMemo(() => {
    const total = leads.length;
    const novos = leads.filter((l) => l.status === "novo").length;
    const emTriagem = leads.filter((l) => l.status === "em_triagem").length;
    const emAndamento = leads.filter((l) =>
      [
        "contato",
        "qualificado",
        "aguardando_briefing",
        "briefing_enviado",
        "em_analise",
        "proposta",
      ].includes(l.status),
    ).length;
    const ganhos = leads.filter((l) => l.status === "ganho").length;
    const conversao = total > 0 ? Math.round((ganhos / total) * 100) : 0;
    return { total, novos, emTriagem, emAndamento, ganhos, conversao };
  }, [leads]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("todos");
    setSourceFilter("todas");
    setQuickView(null);
    setPage(1);
  };

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveLeadFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Lead arquivado.");
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["leads-kpis"] });
    },
    onError: (err: Error) =>
      toast.error("Não foi possível arquivar.", { description: err.message }),
  });

  const columns: DataTableColumn<Lead>[] = [
    {
      key: "empresa",
      header: "Empresa",
      sortable: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">
            {row.company_name}
          </p>
          {row.instagram && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
              <Instagram className="h-3 w-3" strokeWidth={1.75} />
              {row.instagram}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "contato",
      header: "Contato",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-foreground">{row.contact_name}</span>
      ),
    },
    {
      key: "telefone",
      header: "Telefone",
      render: (row) =>
        row.phone ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5" strokeWidth={1.75} />
            {formatPhone(row.phone)}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: "cidade",
      header: "Cidade",
      render: (row) =>
        row.city ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
            {row.city}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "responsavel",
      header: "Responsável",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.owner_name ?? "—"}
        </span>
      ),
    },
    {
      key: "data",
      header: "Data",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: "acoes",
      header: <span className="sr-only">Ações</span>,
      className: "w-12 text-right",
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
              aria-label={`Ações para ${row.company_name}`}
            >
              <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem
              onClick={() =>
                navigate({
                  to: "/os/comercial/leads/$id",
                  params: { id: row.id },
                })
              }
            >
              Ver detalhes
            </DropdownMenuItem>
            {(canWrite || isAdmin) && (
              <DropdownMenuItem
                onClick={() => {
                  if (confirm(`Arquivar o lead "${row.company_name}"?`)) {
                    archiveMutation.mutate(row.id);
                  }
                }}
                className="text-destructive"
              >
                <Archive className="h-4 w-4 mr-2" strokeWidth={1.75} />
                Arquivar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const loading = leadsQuery.isLoading;

  const emptyState = hasFilters ? (
    <EmptyState
      icon={SearchX}
      title="Nenhum lead corresponde aos filtros"
      description={
        term
          ? `Não encontramos leads para "${search.trim()}". Ajuste a busca ou remova filtros para ver mais resultados.`
          : "Nenhum lead corresponde a este status no momento."
      }
      action={
        <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2">
          <X className="h-4 w-4" />
          Limpar filtros
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={Users}
      title="Nenhum lead cadastrado ainda"
      description="Cadastre o primeiro lead para começar a acompanhar oportunidades no funil consultivo da Valtro Labs."
      action={
        canWrite ? (
          <Button size="sm" className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo lead
          </Button>
        ) : undefined
      }
    />
  );

  return (
    <div className="p-6 md:p-10 space-y-6">
      <PageHeader
        title="Leads"
        description="Acompanhe oportunidades, status e responsáveis do funil comercial da Valtro Labs."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2" disabled>
              <Download className="h-4 w-4" strokeWidth={1.75} />
              Exportar
            </Button>
            {canWrite && (
              <Button
                size="sm"
                className="gap-2"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                Novo lead
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total de leads" value={kpis.total} hint="Base ativa" />
        <StatCard label="Novos" value={kpis.novos} hint="Aguardando abordagem" />
        <StatCard
          label="Em triagem"
          value={kpis.emTriagem}
          hint="Validação comercial em curso"
        />
        <StatCard
          label="Em andamento"
          value={kpis.emAndamento}
          hint="Contato, qualificado, briefing ou proposta"
        />
        <StatCard
          label="Conversão"
          value={`${kpis.conversao}%`}
          hint={`${kpis.ganhos} ganhos`}
          trend={kpis.conversao > 20 ? "up" : "neutral"}
        />
      </div>

      {/* Quick views */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground mr-1">
          Visões rápidas:
        </span>
        {[
          { key: "novos-do-site", label: "Novos do site" },
          { key: "aguardando-triagem", label: "Aguardando triagem" },
          { key: "sem-responsavel", label: "Sem responsável" },
          { key: "briefings-aguardando", label: "Briefings aguardando" },
          { key: "briefings-concluidos", label: "Briefings concluídos" },
          { key: "followups-vencidos", label: "Follow-ups vencidos" },
          { key: "followups-hoje", label: "Follow-ups hoje" },
          { key: "followups-proximos", label: "Follow-ups próximos 7 dias" },
        ].map((v) => {
          const active = quickView === v.key;
          return (
            <button
              key={v.key}
              type="button"
              onClick={() => {
                setQuickView(active ? null : (v.key as typeof quickView));
                setPage(1);
              }}
              className={
                "rounded-full border px-3 py-1 text-xs transition-colors " +
                (active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-surface text-muted-foreground border-border hover:text-foreground")
              }
            >
              {v.label}
            </button>
          );
        })}
      </div>


      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            strokeWidth={1.75}
          />
          <Input
            type="search"
            placeholder="Buscar por empresa, contato ou cidade..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 pr-9 bg-surface"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as LeadStatus | "todos");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px] bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sourceFilter}
            onValueChange={(value) => {
              setSourceFilter(value as LeadSource | "todas");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[170px] bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" aria-label="Mais filtros" disabled>
            <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>
      </div>

      {!loading && hasFilters && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "lead encontrado" : "leads encontrados"}
            {term && (
              <>
                {" "}para{" "}
                <span className="font-medium text-foreground">
                  “{search.trim()}”
                </span>
              </>
            )}
            {statusFilter !== "todos" && (
              <>
                {" "}· status{" "}
                <span className="font-medium text-foreground">
                  {STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label}
                </span>
              </>
            )}
          </p>
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 h-8">
            <X className="h-3.5 w-3.5" />
            Limpar
          </Button>
        </div>
      )}

      {loading ? (
        <LeadsSkeleton />
      ) : leadsQuery.isError ? (
        <EmptyState
          icon={SearchX}
          title="Não foi possível carregar leads"
          description={
            leadsQuery.error instanceof Error
              ? leadsQuery.error.message
              : "Tente novamente em instantes."
          }
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => leadsQuery.refetch()}
            >
              Tentar novamente
            </Button>
          }
        />
      ) : (
        <DataTable<Lead>
          columns={columns}
          data={paginated}
          getRowId={(row) => row.id}
          onRowClick={(row) =>
            navigate({ to: "/os/comercial/leads/$id", params: { id: row.id } })
          }
          emptyState={emptyState}
        />
      )}

      {!loading && filtered.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm">
          <p className="text-muted-foreground">
            Mostrando{" "}
            <span className="font-medium text-foreground">
              {paginated.length}
            </span>{" "}
            de{" "}
            <span className="font-medium text-foreground">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "lead" : "leads"}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              Anterior
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === currentPage ? "default" : "outline"}
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Próximo
              <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </div>
        </div>
      )}

      <NewLeadDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

function LeadsSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-surface shadow-soft overflow-hidden">
      <div className="border-b border-border px-4 py-3 flex gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-3 flex-1 rounded bg-muted animate-pulse" />
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, r) => (
        <div
          key={r}
          className="border-b border-border last:border-0 px-4 py-4 flex gap-4"
        >
          {Array.from({ length: 6 }).map((_, c) => (
            <div
              key={c}
              className="h-3 flex-1 rounded bg-muted/70 animate-pulse"
              style={{ animationDelay: `${(r * 6 + c) * 30}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
