import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  CircleCheck,
  History,
  RotateCcw,
  Ticket as TicketIcon,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { TimelineCard, type TimelineItem } from "@/components/app/timeline-card";
import { AttachmentsCard } from "@/components/app/attachments-card";
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/app/ticket-status-badge";
import {
  getTicket,
  updateTicket,
  assignTicket,
  closeTicket,
  reopenTicket,
} from "@/lib/tickets.functions";
import { listAssignableUsers } from "@/lib/leads.functions";
import { useCurrentRole } from "@/hooks/use-current-role";
import type { TicketPriority, TicketStatus } from "@/types/ticket";
import {
  TICKET_CATEGORY_LABEL,
  TICKET_CLOSED_STATUSES,
  TICKET_PRIORITY_LABEL,
  TICKET_PRIORITY_ORDER,
  TICKET_SOURCE_LABEL,
  TICKET_STATUS_LABEL,
  TICKET_STATUS_ORDER,
} from "@/types/ticket";

export const Route = createFileRoute("/_authenticated/os/atendimento/chamados/$id")({
  component: TicketDetail,
  head: () => ({
    meta: [
      { title: "Chamado — Valtro OS" },
      {
        name: "description",
        content: "Detalhe do chamado de atendimento com histórico imutável, responsável e anexos.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const NONE = "__none__";

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

function TicketDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { canWrite } = useCurrentRole();

  const getFn = useServerFn(getTicket);
  const updateFn = useServerFn(updateTicket);
  const assignFn = useServerFn(assignTicket);
  const closeFn = useServerFn(closeTicket);
  const reopenFn = useServerFn(reopenTicket);
  const usersFn = useServerFn(listAssignableUsers);

  const queryKey = ["ticket", id];
  const query = useQuery({ queryKey, queryFn: () => getFn({ data: { id } }) });
  const users = useQuery({
    queryKey: ["assignable-users"],
    queryFn: () => usersFn(),
    staleTime: 60_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey });
    qc.invalidateQueries({ queryKey: ["tickets"] });
  };

  const patchMutation = useMutation({
    mutationFn: (patch: { status?: TicketStatus; priority?: TicketPriority }) =>
      updateFn({ data: { id, ...patch } }),
    onSuccess: () => {
      toast.success("Chamado atualizado.");
      invalidate();
    },
    onError: (err: Error) => toast.error("Falha ao atualizar.", { description: err.message }),
  });

  const assignMutation = useMutation({
    mutationFn: (ownerId: string | null) => assignFn({ data: { id, owner_id: ownerId } }),
    onSuccess: () => {
      toast.success("Responsável atualizado.");
      invalidate();
    },
    onError: (err: Error) => toast.error("Falha ao atribuir.", { description: err.message }),
  });

  const closeMutation = useMutation({
    mutationFn: (status: "closed" | "cancelled") => closeFn({ data: { id, status } }),
    onSuccess: () => {
      toast.success("Chamado finalizado.");
      invalidate();
    },
    onError: (err: Error) => toast.error("Falha ao finalizar.", { description: err.message }),
  });

  const reopenMutation = useMutation({
    mutationFn: () => reopenFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Chamado reaberto.");
      invalidate();
    },
    onError: (err: Error) => toast.error("Falha ao reabrir.", { description: err.message }),
  });

  if (query.isLoading) {
    return (
      <div className="p-6 md:p-10 space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="p-6 md:p-10">
        <EmptyState
          icon={TicketIcon}
          title="Chamado não encontrado"
          description="O chamado pode ter sido removido ou você não tem permissão para visualizá-lo."
          action={
            <Button variant="outline" onClick={() => navigate({ to: "/os/atendimento/chamados" })}>
              Voltar para chamados
            </Button>
          }
        />
      </div>
    );
  }

  const { ticket, events } = query.data;
  const isFinal = TICKET_CLOSED_STATUSES.includes(ticket.status);

  const timelineItems: TimelineItem[] = events.map((e) => ({
    id: e.id,
    icon: History,
    title: e.created_by_name ?? "Sistema",
    description: e.description ?? e.type,
    date: fmtDateTime(e.created_at),
    tone: "default",
  }));

  return (
    <div className="p-6 md:p-10 space-y-6">
      <Link
        to="/os/atendimento/chamados"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Chamados
      </Link>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="text-muted-foreground">{ticket.protocol}</span>
            <span>{ticket.title}</span>
          </span>
        }
        description={ticket.description ?? "Sem descrição registrada."}
        actions={
          canWrite ? (
            <>
              {isFinal ? (
                <Button
                  variant="outline"
                  disabled={reopenMutation.isPending}
                  onClick={() => reopenMutation.mutate()}
                >
                  <RotateCcw className="h-4 w-4" /> Reabrir
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    disabled={closeMutation.isPending}
                    onClick={() => closeMutation.mutate("cancelled")}
                  >
                    <XCircle className="h-4 w-4" /> Cancelar
                  </Button>
                  <Button
                    disabled={closeMutation.isPending}
                    onClick={() => closeMutation.mutate("closed")}
                  >
                    <CircleCheck className="h-4 w-4" /> Encerrar
                  </Button>
                </>
              )}
            </>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <TicketStatusBadge status={ticket.status} />
        <TicketPriorityBadge priority={ticket.priority} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Informações</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <Field label="Categoria" value={TICKET_CATEGORY_LABEL[ticket.category]} />
              <Field label="Origem" value={TICKET_SOURCE_LABEL[ticket.source]} />
              <Field label="Produto" value={ticket.product_name ?? "—"} />
              <Field label="Responsável" value={ticket.owner_name ?? "Sem responsável"} />
              <Field label="Cliente" value={ticket.client_name ?? "—"} />
              <Field label="Lead" value={ticket.lead_name ?? "—"} />
              <Field label="Abertura" value={fmtDateTime(ticket.created_at)} />
              <Field
                label="Encerramento"
                value={ticket.closed_at ? fmtDateTime(ticket.closed_at) : "Em aberto"}
              />
            </CardContent>
          </Card>

          {canWrite && (
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-base">Gestão do chamado</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select
                    value={ticket.status}
                    onValueChange={(v) => patchMutation.mutate({ status: v as TicketStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_STATUS_ORDER.map((s) => (
                        <SelectItem key={s} value={s}>
                          {TICKET_STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Prioridade</Label>
                  <Select
                    value={ticket.priority}
                    onValueChange={(v) => patchMutation.mutate({ priority: v as TicketPriority })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_PRIORITY_ORDER.map((p) => (
                        <SelectItem key={p} value={p}>
                          {TICKET_PRIORITY_LABEL[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Responsável</Label>
                  <Select
                    value={ticket.owner_id ?? NONE}
                    onValueChange={(v) => assignMutation.mutate(v === NONE ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sem responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Sem responsável</SelectItem>
                      {(users.data ?? []).map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name ?? "Sem nome"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          <AttachmentsCard entityType="ticket" entityId={ticket.id} canWrite={canWrite} />
        </div>

        <div className="space-y-6">
          {timelineItems.length > 0 ? (
            <TimelineCard title="Histórico" items={timelineItems} />
          ) : (
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-base">Histórico</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <EmptyState
                  icon={History}
                  title="Sem eventos"
                  description="As movimentações do chamado aparecerão aqui automaticamente."
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
