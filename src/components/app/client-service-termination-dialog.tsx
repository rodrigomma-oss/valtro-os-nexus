/**
 * Fase 1A — diálogo de encerramento de contratação.
 *
 * Regras aplicadas:
 * - Motivo obrigatório (serviço concluído, cancelamento ou não renovação).
 * - Observação opcional.
 * - Responsável e data gravados pelo servidor (usuário autenticado + momento
 *   da confirmação).
 * - Resumo de pendências (ciclos em andamento, cobranças pendentes e outras
 *   contratações em andamento) exibido antes da confirmação.
 * - Pendências bloqueiam? Não: o encerramento é permitido e as cobranças são
 *   preservadas — apenas avisadas.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  previewServiceTermination,
  terminateService,
} from "@/lib/client-services.termination.functions";
import type { TerminateServiceResult } from "@/lib/client-services.termination.functions";
import {
  CLIENT_SERVICE_STATUS_LABEL,
  TERMINATION_REASON_LABEL,
  TERMINATION_REASONS,
} from "@/types/client-service";
import type { TerminationReason } from "@/types/client-service";

/** Formata valores em centavos (BRL) — sem depender do módulo financeiro. */
function formatCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents ?? 0) / 100);
}

const REASON_HINT: Record<TerminationReason, string> = {
  servico_concluido: "O serviço foi entregue e a contratação passa a “concluído”.",
  cancelamento: "A contratação é cancelada e passa a “cancelado”.",
  nao_renovacao:
    "Não houve renovação; a contratação passa a “cancelado” com o motivo registrado.",
};

export function ClientServiceTerminationDialog({
  serviceId,
  serviceName,
  open,
  onOpenChange,
  onTerminated,
}: {
  serviceId: string;
  serviceName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTerminated?: (result: TerminateServiceResult) => void;
}) {
  const [reason, setReason] = useState<TerminationReason>(TERMINATION_REASONS[0]);
  const [note, setNote] = useState("");

  const previewFn = useServerFn(previewServiceTermination);
  const terminateFn = useServerFn(terminateService);

  useEffect(() => {
    if (open) {
      setReason(TERMINATION_REASONS[0]);
      setNote("");
    }
  }, [open, serviceId]);

  const previewQuery = useQuery({
    queryKey: ["termination-preview", serviceId, reason],
    queryFn: () => previewFn({ data: { serviceId, reason } }),
    enabled: open,
    staleTime: 5_000,
  });

  const terminateMutation = useMutation({
    mutationFn: (vars: { serviceId: string; reason: TerminationReason; note: string }) =>
      terminateFn({ data: vars }),
    onSuccess: (result) => {
      toast.success(result.message);
      onOpenChange(false);
      onTerminated?.(result);
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível encerrar a contratação.",
      );
    },
  });

  const preview = previewQuery.data;
  const previewFailed = previewQuery.isError;
  // Sem o preview não é possível conferir as pendências: o encerramento fica
  // bloqueado até a consulta ser refeita com sucesso.
  const blocked = previewFailed || (preview ? !preview.canTerminate : false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Encerrar contratação</DialogTitle>
          <DialogDescription>
            {serviceName} — o encerramento usa os status existentes
            {" "}
            <strong>concluído</strong> ou <strong>cancelado</strong>. Ciclos,
            pagamentos, projetos e históricos são preservados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Motivo do encerramento</Label>
            <RadioGroup
              value={reason}
              onValueChange={(value) => setReason(value as TerminationReason)}
              className="gap-2"
            >
              {TERMINATION_REASONS.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2 rounded-md border border-border p-2.5"
                >
                  <RadioGroupItem value={item} id={`reason-${item}`} className="mt-0.5" />
                  <Label
                    htmlFor={`reason-${item}`}
                    className="flex-1 cursor-pointer text-sm font-normal"
                  >
                    <span className="block font-medium">
                      {TERMINATION_REASON_LABEL[item]}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {REASON_HINT[item]}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="termination-note">Observação (opcional)</Label>
            <Textarea
              id="termination-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Contexto do encerramento, combinados com o cliente…"
              maxLength={1000}
              rows={3}
            />
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
            <p className="text-sm font-medium">Pendências antes de confirmar</p>
            {previewQuery.isLoading && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Conferindo…
              </p>
            )}
            {previewFailed && (
              <div className="space-y-2">
                <p className="flex items-start gap-2 text-xs text-destructive">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Não foi possível conferir as pendências desta contratação. Por
                  segurança, o encerramento está bloqueado até a consulta ser
                  refeita com sucesso.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void previewQuery.refetch();
                  }}
                  disabled={previewQuery.isFetching}
                >
                  {previewQuery.isFetching ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Tentar novamente
                </Button>
              </div>
            )}
            {preview && (
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>
                  Status atual:{" "}
                  <strong className="text-foreground">
                    {CLIENT_SERVICE_STATUS_LABEL[preview.currentStatus]}
                  </strong>{" "}
                  → novo status:{" "}
                  <strong className="text-foreground">
                    {CLIENT_SERVICE_STATUS_LABEL[preview.targetStatus]}
                  </strong>
                </li>
                <li>Ciclos em andamento: {preview.openCycles}</li>
                <li>
                  Pagamentos pendentes: {preview.pendingPayments}
                  {preview.pendingPaymentsAmountCents > 0 && (
                    <>
                      {" "}
                      ({formatCents(preview.pendingPaymentsAmountCents)})
                    </>
                  )}
                </li>
                <li>
                  Outras contratações em andamento do cliente:{" "}
                  {preview.otherActiveServices}
                </li>
              </ul>
            )}
            {preview?.hasPending && (
              <p className="flex items-start gap-2 text-xs text-amber-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Há ciclos e/ou cobranças pendentes. Você pode concluir mesmo
                assim: as cobranças continuam registradas e não serão
                descartadas.
              </p>
            )}
            {preview && !preview.hasPending && (
              <p className="text-xs text-muted-foreground">
                Nenhuma pendência operacional encontrada para esta contratação.
              </p>
            )}
            {blocked && (
              <p className="flex items-start gap-2 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {preview?.blockedReason}
              </p>
            )}
            {preview?.suggestsClientDeactivation && (
              <p className="text-xs text-muted-foreground">
                Após o encerramento, este cliente ficará sem contratações em
                andamento e poderá ser marcado como Inativo.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={terminateMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() =>
              terminateMutation.mutate({
                serviceId,
                reason,
                note: note.trim(),
              })
            }
            disabled={
              blocked ||
              terminateMutation.isPending ||
              previewQuery.isLoading ||
              previewQuery.isFetching
            }
          >
            {terminateMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Confirmar encerramento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
