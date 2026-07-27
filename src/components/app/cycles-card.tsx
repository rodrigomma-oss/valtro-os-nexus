/**
 * CyclesCard — Sprint 13.6.
 *
 * Seção "Ciclos" exibida apenas para contratações recorrentes. Mostra
 * competência, sequência, status, valor snapshot e datas operacionais, com
 * as ações contextuais válidas (iniciar, concluir, cancelar) e a action
 * manual de geração do próximo período.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, Loader2, Plus, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  createNextCycle,
  listClientServiceCycles,
  previewNextCycle,
  updateCycleStatus,
} from "@/lib/client-service-cycles.functions";
import {
  allowedCycleTransitions,
  cycleTransitionLabel,
  displayPaymentStatus,
  paymentDelta,
  periodLabel,
  shortDate,
  shouldWarnStartWithoutPayment,
} from "@/lib/client-service-cycles";
import {
  CYCLE_PAYMENT_METHOD_LABEL,
  CYCLE_PAYMENT_STATUS_LABEL,
  CYCLE_PAYMENT_STATUS_TONE,
  CYCLE_STATUS_LABEL,
  CYCLE_STATUS_TONE,
  type ClientServiceCycle,
  type ClientServiceCycleStatus,
} from "@/types/client-service";
import { CyclePaymentDialog } from "@/components/app/cycle-payment-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface CyclesCardProps {
  clientServiceId: string;
  /** admin/operator podem gerar ciclos e executar ações. */
  canWrite?: boolean;
}

function fmtCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtStamp(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function CyclesCard({ clientServiceId, canWrite = false }: CyclesCardProps) {
  const qc = useQueryClient();
  const listFn = useServerFn(listClientServiceCycles);
  const previewFn = useServerFn(previewNextCycle);
  const createFn = useServerFn(createNextCycle);

  const cyclesQuery = useQuery({
    queryKey: ["client-service-cycles", clientServiceId],
    queryFn: () => listFn({ data: { client_service_id: clientServiceId } }),
    staleTime: 30_000,
  });

  const previewQuery = useQuery({
    queryKey: ["client-service-cycle-preview", clientServiceId],
    queryFn: () => previewFn({ data: { client_service_id: clientServiceId } }),
    staleTime: 30_000,
  });


  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["client-service-cycles", clientServiceId] });
    qc.invalidateQueries({ queryKey: ["client-service-cycle-preview", clientServiceId] });
    qc.invalidateQueries({ queryKey: ["client-service-events", clientServiceId] });
  };

  const createMutation = useMutation({
    mutationFn: () => createFn({ data: { client_service_id: clientServiceId } }),
    onSuccess: (cycle) => {
      toast.success(`Ciclo #${cycle.sequence} criado.`);
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message || "Não foi possível criar o ciclo."),
  });

  const preview = previewQuery.data;
  const cycles = cyclesQuery.data ?? [];

  // Serviço pontual: a seção não é exibida como fluxo recorrente.
  if (previewQuery.isLoading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando ciclos…
      </div>
    );
  }
  if (!preview?.supports_cycles) return null;

  const isFirst = cycles.length === 0;

  return (
    <div
      className="mt-3 rounded-lg border border-border bg-muted/20 p-3"
      data-testid="cycles-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
        <span className="text-xs font-medium text-foreground">Ciclos</span>
        <span className="text-[11px] text-muted-foreground">
          {cycles.length} período{cycles.length === 1 ? "" : "s"} · mensal
        </span>

        {canWrite && (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            data-testid="cycle-create-action"
            disabled={!preview.can_create || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : isFirst ? (
              <Plus className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.75} />
            ) : (
              <RefreshCcw className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.75} />
            )}
            {isFirst ? "Iniciar ciclo" : "Criar próximo ciclo"}
          </Button>
        )}
      </div>

      {canWrite && preview.can_create && (
        <p className="mt-2 text-[11px] text-muted-foreground" data-testid="cycle-preview">
          Próximo: ciclo #{preview.sequence} ·{" "}
          {periodLabel(preview.period_start, preview.period_end)} ·{" "}
          {fmtCents(preview.amount_cents)}
        </p>
      )}
      {canWrite && !preview.can_create && preview.blocked_reason && (
        <p className="mt-2 text-[11px] text-muted-foreground" data-testid="cycle-blocked-reason">
          {preview.blocked_reason}
        </p>
      )}

      {cyclesQuery.isLoading ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando períodos…
        </div>
      ) : cycles.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground" data-testid="cycles-empty">
          Nenhum ciclo registrado para esta contratação.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {cycles.map((c) => (
            <CycleRow
              key={c.id}
              cycle={c}
              clientServiceId={clientServiceId}
              canWrite={canWrite}
              onChanged={invalidate}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CycleRow({
  cycle,
  canWrite,
  onChanged,
}: {
  cycle: ClientServiceCycle;
  clientServiceId: string;
  canWrite: boolean;
  onChanged: () => void;
}) {
  const updateFn = useServerFn(updateCycleStatus);
  const transitions = allowedCycleTransitions(cycle.status);
  // `vencido` é derivado na apresentação; o banco mantém `pendente`.
  const payment = displayPaymentStatus(cycle);
  const delta = paymentDelta(cycle);
  const [confirmStart, setConfirmStart] = useState(false);

  const statusMutation = useMutation({
    mutationFn: (status: ClientServiceCycleStatus) =>
      updateFn({ data: { id: cycle.id, status } }),
    onSuccess: (_r, status) => {
      toast.success(`Ciclo #${cycle.sequence}: ${CYCLE_STATUS_LABEL[status].toLowerCase()}.`);
      onChanged();
    },
    onError: (err: Error) => toast.error(err.message || "Não foi possível atualizar o ciclo."),
  });

  return (
    <li
      className="rounded-md border border-border bg-card p-2.5"
      data-testid="cycle-row"
      data-sequence={cycle.sequence}
      data-status={cycle.status}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-foreground">
              Ciclo #{cycle.sequence}
            </span>
            <span
              data-testid="cycle-status"
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                CYCLE_STATUS_TONE[cycle.status],
              )}
            >
              {CYCLE_STATUS_LABEL[cycle.status]}
            </span>
            <span
              data-testid="cycle-payment-status"
              data-payment-status={payment}
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                CYCLE_PAYMENT_STATUS_TONE[payment],
              )}
            >
              {CYCLE_PAYMENT_STATUS_LABEL[payment]}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground" data-testid="cycle-period">
            {periodLabel(cycle.period_start, cycle.period_end)}
          </p>
          <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
            <span>Início: {fmtStamp(cycle.started_at)}</span>
            <span>· Conclusão: {fmtStamp(cycle.completed_at)}</span>
            <span>· Cancelamento: {fmtStamp(cycle.cancelled_at)}</span>
            {cycle.due_date && <span>· Vencimento: {shortDate(cycle.due_date)}</span>}
          </div>
          {cycle.payment_status === "pago" && cycle.paid_amount_cents !== null && (
            <p className="mt-0.5 text-[11px] text-muted-foreground" data-testid="cycle-paid-info">
              Recebido {fmtCents(cycle.paid_amount_cents)}
              {cycle.paid_at ? ` em ${fmtStamp(cycle.paid_at)}` : ""}
              {cycle.payment_method
                ? ` · ${CYCLE_PAYMENT_METHOD_LABEL[cycle.payment_method] ?? cycle.payment_method}`
                : ""}
              {delta !== null && delta !== 0
                ? ` · ${delta > 0 ? "+" : "−"}${fmtCents(Math.abs(delta))} vs. previsto`
                : ""}
            </p>
          )}
          {cycle.payment_notes && (
            <p className="mt-0.5 text-[11px] text-muted-foreground" data-testid="cycle-payment-notes">
              {cycle.payment_notes}
            </p>
          )}
        </div>
        <div className="text-right text-xs font-semibold text-foreground" data-testid="cycle-amount">
          {fmtCents(cycle.amount_cents)}
        </div>
      </div>

      {canWrite && (transitions.length > 0 || cycle.status !== "cancelado") && (
        <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-2">
          {transitions.map((to) => (
            <Button
              key={to}
              size="sm"
              variant={to === "cancelado" ? "outline" : "default"}
              data-testid={`cycle-action-${to}`}
              disabled={statusMutation.isPending}
              onClick={() => {
                // Exceções comerciais existem: alerta, nunca bloqueio.
                if (to === "ativo" && shouldWarnStartWithoutPayment(cycle)) {
                  setConfirmStart(true);
                  return;
                }
                statusMutation.mutate(to);
              }}
            >
              {statusMutation.isPending && (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              )}
              {cycleTransitionLabel(cycle.status, to)}
            </Button>
          ))}
          {cycle.status !== "cancelado" && (
            <CyclePaymentDialog cycle={cycle} onSaved={onChanged} />
          )}
        </div>
      )}

      <AlertDialog open={confirmStart} onOpenChange={setConfirmStart}>
        <AlertDialogContent data-testid="cycle-start-payment-alert">
          <AlertDialogHeader>
            <AlertDialogTitle>Iniciar ciclo com pagamento pendente?</AlertDialogTitle>
            <AlertDialogDescription>
              O ciclo #{cycle.sequence} está com pagamento{" "}
              {CYCLE_PAYMENT_STATUS_LABEL[payment].toLowerCase()}. A operação é permitida,
              mas ficará registrada na timeline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              data-testid="cycle-start-confirm"
              onClick={() => statusMutation.mutate("ativo")}
            >
              Iniciar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
