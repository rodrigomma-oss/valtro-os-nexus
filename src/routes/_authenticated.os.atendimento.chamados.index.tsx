import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LifeBuoy, Plus, Search, SearchX } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { DataTable, type DataTableColumn } from "@/components/app/data-table";
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
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/app/ticket-status-badge";
import { NewTicketDialog } from "@/components/app/new-ticket-dialog";
import { listTickets } from "@/lib/tickets.functions";
import { listServices } from "@/lib/services.functions";
import { listAssignableUsers } from "@/lib/leads.functions";
import { useCurrentRole } from "@/hooks/use-current-role";
import type { Ticket, TicketPriority, TicketStatus } from "@/types/ticket";
import {
  TICKET_PRIORITY_LABEL,
  TICKET_PRIORITY_ORDER,
  TICKET_STATUS_LABEL,
  TICKET_STATUS_ORDER,
} from "@/types/ticket";

export const Route = createFileRoute("/_authenticated/os/atendimento/chamados/")({
  component: TicketsList,
  head: () => ({
    meta: [
      { title: "Chamados — Valtro OS" },
      {
        name: "description",
        content: "Gestão de chamados de atendimento do Valtro OS: protocolo, status, prioridade e responsável.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const ALL = "todos";

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TicketsList() {
  const navigate = useNavigate();
  const { canWrite } = useCurrentRole();
  const listFn = useServerFn(listTickets);
  const servicesFn = useServerFn(listServices);
  const usersFn = useServerFn(listAssignableUsers);

  const [term, setTerm] = useState("");
  const [status, setStatus] = useState<TicketStatus | typeof ALL>(ALL);
  const [priority, setPriority] = useState<TicketPriority | typeof ALL>(ALL);
  const [owner, setOwner] = useState<string>(ALL);
  const [product, setProduct] = useState<string>(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);

  const ticketsQuery = useQuery({
    queryKey: ["tickets", status, priority, owner, product],
    queryFn: () =>
      listFn({
        data: {
          ...(status === ALL ? {} : { status }),
          ...(priority === ALL ? {} : { priority }),
          ...(owner === ALL ? {} : { owner_id: owner }),
          ...(product === ALL ? {} : { product_id: product }),
        },
      }),
  });
  const services = useQuery({ queryKey: ["services"], queryFn: () => servicesFn(), staleTime: 60_000 });
  const users = useQuery({
    queryKey: ["assignable-users"],
    queryFn: () => usersFn(),
    staleTime: 60_000,
  });

  const data = ticketsQuery.data ?? [];
  const q = term.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      q.length === 0
        ? data
        : data.filter(
            (t) =>
              t.title.toLowerCase().includes(q) ||
              t.protocol.toLowerCase().includes(q) ||
              (t.client_name ?? "").toLowerCase().includes(q),
          ),
    [data, q],
  );

  const columns: DataTableColumn<Ticket>[] = [
    {
      key: "protocol",
      header: "Protocolo",
      render: (t) => (
        <span className="whitespace-nowrap text-sm font-medium text-foreground">{t.protocol}</span>
      ),
    },
    {
      key: "title",
      header: "Chamado",
      render: (t) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{t.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {t.client_name ?? t.lead_name ?? "Sem vínculo"}
          </p>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (t) => <TicketStatusBadge status={t.status} /> },
    {
      key: "priority",
      header: "Prioridade",
      render: (t) => <TicketPriorityBadge priority={t.priority} />,
    },
    {
      key: "owner",
      header: "Responsável",
      render: (t) => (
        <span className="text-sm text-muted-foreground">{t.owner_name ?? "—"}</span>
      ),
    },
    {
      key: "product",
      header: "Produto",
      render: (t) => (
        <span className="text-sm text-muted-foreground">{t.product_name ?? "—"}</span>
      ),
    },
    {
      key: "updated",
      header: "Atualização",
      render: (t) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {fmtDateTime(t.updated_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Ações",
      className: "text-right",
      render: (t) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            navigate({ to: "/os/atendimento/chamados/$id", params: { id: t.id } });
          }}
        >
          Abrir
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-10 space-y-6">
      <PageHeader
        title="Chamados"
        description="Solicitações de atendimento com protocolo, responsável, prioridade e histórico completo."
        actions={
          canWrite ? (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Novo chamado
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por protocolo, título ou cliente…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as TicketStatus | typeof ALL)}>
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os status</SelectItem>
            {TICKET_STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {TICKET_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority | typeof ALL)}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as prioridades</SelectItem>
            {TICKET_PRIORITY_ORDER.map((p) => (
              <SelectItem key={p} value={p}>
                {TICKET_PRIORITY_LABEL[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={owner} onValueChange={setOwner}>
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os responsáveis</SelectItem>
            {(users.data ?? []).map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.full_name ?? "Sem nome"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={product} onValueChange={setProduct}>
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Produto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os produtos</SelectItem>
            {(services.data ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={ticketsQuery.isLoading}
        getRowId={(t) => t.id}
        onRowClick={(t) => navigate({ to: "/os/atendimento/chamados/$id", params: { id: t.id } })}
        emptyState={
          q.length > 0 || status !== ALL || priority !== ALL ? (
            <EmptyState
              icon={SearchX}
              title="Nenhum chamado encontrado"
              description="Ajuste a busca ou os filtros aplicados."
            />
          ) : (
            <EmptyState
              icon={LifeBuoy}
              title="Nenhum chamado registrado"
              description="Abra o primeiro chamado para começar a acompanhar solicitações de atendimento."
              action={
                canWrite ? (
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4" /> Novo chamado
                  </Button>
                ) : undefined
              }
            />
          )
        }
      />

      <NewTicketDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(id) => navigate({ to: "/os/atendimento/chamados/$id", params: { id } })}
      />
    </div>
  );
}
