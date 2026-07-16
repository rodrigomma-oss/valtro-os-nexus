import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { DataTable, type DataTableColumn } from "@/components/app/data-table";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
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
import { MOCK_LEADS } from "@/mocks/leads";
import type { Lead, LeadStatus } from "@/types/lead";

export const Route = createFileRoute("/crm/leads")({
  component: CrmLeads,
  head: () => ({
    meta: [
      { title: "Leads — CRM Valtro Labs" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const STATUS_OPTIONS: { value: LeadStatus | "todos"; label: string }[] = [
  { value: "todos", label: "Todos os status" },
  { value: "novo", label: "Novo" },
  { value: "contato", label: "Em contato" },
  { value: "qualificado", label: "Qualificado" },
  { value: "proposta", label: "Proposta" },
  { value: "ganho", label: "Ganho" },
  { value: "perdido", label: "Perdido" },
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "todos">("todos");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return MOCK_LEADS.filter((lead) => {
      const matchStatus =
        statusFilter === "todos" || lead.status === statusFilter;
      const matchTerm =
        term.length === 0 ||
        lead.empresa.toLowerCase().includes(term) ||
        lead.nome.toLowerCase().includes(term) ||
        lead.cidade.toLowerCase().includes(term);
      return matchStatus && matchTerm;
    });
  }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const columns: DataTableColumn<Lead>[] = [
    {
      key: "empresa",
      header: "Empresa",
      sortable: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">
            {row.empresa}
          </p>
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
            <Instagram className="h-3 w-3" strokeWidth={1.75} />
            {row.instagram}
          </p>
        </div>
      ),
    },
    {
      key: "contato",
      header: "Contato",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-foreground">{row.nome}</span>
      ),
    },
    {
      key: "telefone",
      header: "Telefone",
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Phone className="h-3.5 w-3.5" strokeWidth={1.75} />
          {row.telefone}
        </span>
      ),
    },
    {
      key: "cidade",
      header: "Cidade",
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
          {row.cidade}
        </span>
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
        <span className="text-sm text-muted-foreground">{row.responsavel}</span>
      ),
    },
    {
      key: "data",
      header: "Data",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {formatDate(row.dataCriacao)}
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
              aria-label={`Ações para ${row.empresa}`}
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
                  to: "/crm/leads/$id",
                  params: { id: row.id },
                })
              }
            >
              Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem disabled>Editar</DropdownMenuItem>
            <DropdownMenuItem disabled>Enviar briefing</DropdownMenuItem>
            <DropdownMenuItem disabled className="text-destructive">
              Arquivar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-10 space-y-6">
      <PageHeader
        title="Leads"
        description="Gerencie oportunidades comerciais, acompanhe status e responsáveis do funil da Valtro Labs."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" strokeWidth={1.75} />
              Exportar
            </Button>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" strokeWidth={2} />
              Novo Lead
            </Button>
          </>
        }
      />

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
            className="pl-9 bg-surface"
          />
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
          <Button variant="outline" size="icon" aria-label="Mais filtros">
            <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>
      </div>

      <DataTable<Lead>
        columns={columns}
        data={paginated}
        getRowId={(row) => row.id}
        onRowClick={(row) =>
          navigate({ to: "/crm/leads/$id", params: { id: row.id } })
        }
        emptyState={
          <EmptyState
            icon={Users}
            title="Nenhum lead encontrado"
            description="Ajuste os filtros ou cadastre um novo lead para começar a acompanhar o funil comercial."
          />
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm">
        <p className="text-muted-foreground">
          Mostrando{" "}
          <span className="font-medium text-foreground">
            {paginated.length}
          </span>{" "}
          de{" "}
          <span className="font-medium text-foreground">
            {filtered.length}
          </span>{" "}
          leads
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
    </div>
  );
}
