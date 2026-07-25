/**
 * ContractedServicesCard — Sprint 13.3 / 13.4.
 * Lista as contratações (client_services) de um cliente a partir dos
 * snapshots persistidos e expõe o ciclo operacional (ações válidas,
 * timeline e notas), separado da timeline comercial do Lead.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronDown,
  History,
  Loader2,
  PackageCheck,
  StickyNote,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { OnboardingCard } from "@/components/app/onboarding-card";
import { CyclesCard } from "@/components/app/cycles-card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  addClientServiceNote,
  listClientServiceEvents,
  listClientServices,
  updateClientServiceStatus,
} from "@/lib/client-services.functions";
import {
  allowedTransitions,
  transitionLabel,
} from "@/lib/client-service-transitions";
import {
  BILLING_INTERVAL_LABEL,
  BILLING_TYPE_LABEL,
  CLIENT_SERVICE_EVENT_LABEL,
  CLIENT_SERVICE_STATUS_LABEL,
  CLIENT_SERVICE_STATUS_TONE,
  scopeKeyLabel,
  type ClientService,
  type ClientServiceStatus,
} from "@/types/client-service";

interface ContractedServicesCardProps {
  clientId: string;
  /** admin/operator podem executar ações e adicionar notas. */
  canWrite?: boolean;
  /**
   * Sprint 13.9 (P1-3) — contratação vinda do Centro de Operações
   * (`/crm/clientes/$id?cs=<id>`): a linha é destacada e recebe scroll.
   */
  highlightServiceId?: string;
}


function fmtCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ContractedServicesCard({
  clientId,
  canWrite = false,
  highlightServiceId,
}: ContractedServicesCardProps) {
  const listFn = useServerFn(listClientServices);
  const query = useQuery({
    queryKey: ["client-services", clientId],
    queryFn: () => listFn({ data: { client_id: clientId } }),
    staleTime: 30_000,
  });

  const services = query.data ?? [];
  const summary = useMemo(() => {
    const recurring = services.filter((s) => s.billing_type_snapshot === "recorrente");
    return {
      count: services.length,
      active: services.filter((s) => s.status === "ativo").length,
      mrr: recurring
        .filter((s) => s.status === "ativo" || s.status === "pendente")
        .reduce((acc, s) => acc + s.contracted_amount_cents, 0),
    };
  }, [services]);

  return (
    <Card className="shadow-soft" data-testid="contracted-services-card">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Serviços contratados</CardTitle>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Contratações geradas a partir de propostas aprovadas. Os valores são o retrato
          comercial do momento da contratação.
        </p>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {services.length > 0 && (
          <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-muted/30 p-3 text-xs">
            <Stat label="Contratações" value={String(summary.count)} />
            <Stat label="Ativas" value={String(summary.active)} />
            <Stat label="Recorrência contratada" value={fmtCents(summary.mrr)} />
          </div>
        )}

        {query.isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando contratações…
          </div>
        ) : services.length === 0 ? (
          <EmptyState
            icon={PackageCheck}
            title="Nenhum serviço contratado."
            description="Gere as contratações a partir de uma proposta aprovada deste cliente."
          />
        ) : (
          <ul className="space-y-2">
            {services.map((s) => (
              <ContractRow
                key={s.id}
                service={s}
                clientId={clientId}
                canWrite={canWrite}
                highlighted={highlightServiceId === s.id}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}


function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function ContractRow({
  service: s,
  clientId,
  canWrite,
}: {
  service: ClientService;
  clientId: string;
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(false);
  const scopeEntries = Object.entries(s.scope_snapshot);
  const transitions = allowedTransitions(s.status);

  const qc = useQueryClient();
  const updateFn = useServerFn(updateClientServiceStatus);

  const statusMutation = useMutation({
    mutationFn: (status: ClientServiceStatus) => updateFn({ data: { id: s.id, status } }),
    onSuccess: (_res, status) => {
      toast.success(`Contratação: ${CLIENT_SERVICE_STATUS_LABEL[status].toLowerCase()}.`);
      qc.invalidateQueries({ queryKey: ["client-services", clientId] });
      qc.invalidateQueries({ queryKey: ["client-service-events", s.id] });
      // Elegibilidade de novo ciclo depende do status da contratação.
      qc.invalidateQueries({ queryKey: ["client-service-cycle-preview", s.id] });
    },
    onError: (err: Error) => toast.error(err.message || "Não foi possível alterar o status."),
  });

  return (
    <li className="rounded-xl border border-border bg-card p-3" data-testid="contracted-service-row">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">{s.name_snapshot}</span>
            <span
              data-testid="contracted-service-status"
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                CLIENT_SERVICE_STATUS_TONE[s.status],
              )}
            >
              {CLIENT_SERVICE_STATUS_LABEL[s.status]}
            </span>
            {!s.service_id && (
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                Customizado
              </span>
            )}
          </div>
          {s.description_snapshot && (
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {s.description_snapshot}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>
              {BILLING_TYPE_LABEL[s.billing_type_snapshot]}
              {s.billing_interval_snapshot
                ? ` · ${BILLING_INTERVAL_LABEL[s.billing_interval_snapshot]}`
                : ""}
            </span>
            <span>· Contratado em {fmtDate(s.contracted_at)}</span>
            {s.proposal_number && <span>· Origem {s.proposal_number}</span>}
            {scopeEntries.map(([k, v]) => (
              <span key={k}>
                · {scopeKeyLabel(k)}: {String(v)}
              </span>
            ))}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
            <span>Início: {fmtDate(s.started_at)}</span>
            <span>· Conclusão: {fmtDate(s.completed_at)}</span>
            <span>· Cancelamento: {fmtDate(s.cancelled_at)}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-foreground">
            {fmtCents(s.contracted_amount_cents)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {s.quantity} × {fmtCents(s.unit_price_cents)}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        {canWrite &&
          transitions.map((to) => (
            <Button
              key={to}
              size="sm"
              variant={to === "cancelado" ? "outline" : "default"}
              data-testid={`contract-action-${to}`}
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate(to)}
            >
              {statusMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {transitionLabel(s.status, to)}
            </Button>
          ))}
        {canWrite && transitions.length === 0 && (
          <span className="text-xs text-muted-foreground">
            Ciclo encerrado — nenhuma ação disponível.
          </span>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          data-testid="contract-toggle-timeline"
          onClick={() => setOpen((v) => !v)}
        >
          <History className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.75} />
          Timeline operacional
          <ChevronDown
            className={cn("h-3.5 w-3.5 ml-1.5 transition-transform", open && "rotate-180")}
            strokeWidth={1.75}
          />
        </Button>
      </div>

      <CyclesCard clientServiceId={s.id} canWrite={canWrite} />

      <OnboardingCard clientServiceId={s.id} canWrite={canWrite} />

      {open && <ContractTimeline serviceId={s.id} canWrite={canWrite} />}
    </li>
  );
}

function ContractTimeline({ serviceId, canWrite }: { serviceId: string; canWrite: boolean }) {
  const [note, setNote] = useState("");
  const qc = useQueryClient();
  const listEventsFn = useServerFn(listClientServiceEvents);
  const addNoteFn = useServerFn(addClientServiceNote);

  const eventsQuery = useQuery({
    queryKey: ["client-service-events", serviceId],
    queryFn: () => listEventsFn({ data: { client_service_id: serviceId } }),
  });

  const noteMutation = useMutation({
    mutationFn: (value: string) =>
      addNoteFn({ data: { client_service_id: serviceId, note: value } }),
    onSuccess: () => {
      setNote("");
      toast.success("Nota registrada na contratação.");
      qc.invalidateQueries({ queryKey: ["client-service-events", serviceId] });
    },
    onError: (err: Error) => toast.error(err.message || "Não foi possível registrar a nota."),
  });

  const events = eventsQuery.data ?? [];

  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3" data-testid="contract-timeline">
      {canWrite && (
        <div className="mb-3 space-y-2">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Registrar nota operacional…"
            className="min-h-[64px] text-sm bg-background"
            data-testid="contract-note-input"
          />
          <Button
            size="sm"
            disabled={note.trim().length < 3 || noteMutation.isPending}
            onClick={() => noteMutation.mutate(note.trim())}
            data-testid="contract-note-submit"
          >
            {noteMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <StickyNote className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.75} />
            )}
            Adicionar nota
          </Button>
        </div>
      )}

      {eventsQuery.isLoading ? (
        <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando timeline…
        </div>
      ) : events.length === 0 ? (
        <p className="py-2 text-xs text-muted-foreground">Nenhum evento registrado.</p>
      ) : (
        <ol className="space-y-2">
          {events.map((ev) => (
            <li
              key={ev.id}
              className="rounded-md border border-border bg-card p-2.5"
              data-testid="contract-timeline-event"
              data-event-type={ev.event_type}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-foreground">{ev.title}</span>
                <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {CLIENT_SERVICE_EVENT_LABEL[ev.event_type]}
                </span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {fmtDateTime(ev.created_at)}
                </span>
              </div>
              {ev.description && (
                <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground leading-relaxed">
                  {ev.description}
                </p>
              )}
              {ev.actor_name && (
                <p className="mt-1 text-[11px] text-muted-foreground">por {ev.actor_name}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
