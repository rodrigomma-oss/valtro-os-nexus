/**
 * Fase 1A — Gestão do ciclo de vida do cliente:
 * - Encerramento de contratações (com motivo, responsável, data, observação
 *   e conferência de pendências).
 * - Status Ativo / Inativo com ação manual e confirmação.
 * - Sugestão de inativação quando não restam contratações em andamento.
 *
 * Clientes Arquivados não têm o status alterado e nada é alterado
 * automaticamente.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Loader2, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  listManagedClientServices,
  ONGOING_CLIENT_SERVICE_STATUSES,
} from "@/lib/client-services.management.functions";
import { setClientStatus } from "@/lib/client-services.termination.functions";
import { ClientServiceTerminationDialog } from "@/components/app/client-service-termination-dialog";
import { CLIENT_STATUS_LABEL, CLIENT_STATUS_TONE } from "@/types/client";
import type { ClientStatus } from "@/types/client";
import {
  CLIENT_SERVICE_STATUS_LABEL,
  TERMINATION_REASON_LABEL,
} from "@/types/client-service";

export function ClientLifecycleCard({
  clientId,
  clientStatus,
  canWrite,
}: {
  clientId: string;
  clientStatus: ClientStatus;
  canWrite: boolean;
}) {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listManagedClientServices);
  const setStatusFn = useServerFn(setClientStatus);

  const [targetServiceId, setTargetServiceId] = useState<string | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<ClientStatus | null>(null);
  const [suggestDeactivation, setSuggestDeactivation] = useState(false);

  const servicesQuery = useQuery({
    queryKey: ["client-lifecycle-services", clientId],
    queryFn: () => listFn({ data: { clientId } }),
  });

  const services = useMemo(() => servicesQuery.data ?? [], [servicesQuery.data]);
  const ongoingServices = useMemo(
    () =>
      services.filter((service) =>
        (ONGOING_CLIENT_SERVICE_STATUSES as readonly string[]).includes(
          service.status,
        ),
      ),
    [services],
  );

  const targetService = services.find((service) => service.id === targetServiceId);

  const statusMutation = useMutation({
    mutationFn: (vars: { clientId: string; status: ClientStatus }) =>
      setStatusFn({ data: vars }),
    onSuccess: (result) => {
      const nextStatus =
        (result as { status?: ClientStatus } | undefined)?.status ??
        confirmStatus ??
        clientStatus;
      toast.success(`Cliente marcado como ${CLIENT_STATUS_LABEL[nextStatus]}.`);
      setConfirmStatus(null);
      // Invalida a família de queries do cliente (detalhe, listas e cartões),
      // que podem estar registradas com chaves diferentes da tela.
      queryClient.invalidateQueries({ queryKey: ["client"] });
      queryClient.invalidateQueries({
        queryKey: ["client-lifecycle-services", clientId],
      });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o status do cliente.",
      );
    },
  });

  const isArchived = clientStatus === "arquivado";
  const canDeactivate =
    canWrite && clientStatus === "ativo" && ongoingServices.length === 0;

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-base">Ciclo de vida do cliente</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Status do cliente
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                CLIENT_STATUS_TONE[clientStatus],
              )}
            >
              {CLIENT_STATUS_LABEL[clientStatus]}
            </span>
          </div>

          {canWrite && !isArchived && (
            <div className="flex items-center gap-2">
              {clientStatus === "ativo" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmStatus("inativo")}
                  disabled={!canDeactivate}
                  title={
                    canDeactivate
                      ? undefined
                      : "O cliente possui contratações em andamento (pendente, ativo ou pausado)."
                  }
                >
                  <PowerOff className="mr-2 h-4 w-4" strokeWidth={1.75} />
                  Marcar como Inativo
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmStatus("ativo")}
                >
                  <Power className="mr-2 h-4 w-4" strokeWidth={1.75} />
                  Reativar cliente
                </Button>
              )}
            </div>
          )}
        </div>

        {canWrite && clientStatus === "ativo" && ongoingServices.length > 0 && (
          <p className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-2.5 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            O cliente possui {ongoingServices.length} contratação(ões) em
            andamento (pendente, ativo ou pausado). A inativação fica disponível
            após o encerramento delas.
          </p>
        )}

        {suggestDeactivation && clientStatus === "ativo" && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-800">
              Este cliente não possui mais contratações em andamento. Você
              pode marcá-lo como Inativo — os históricos e as cobranças são
              preservados.
            </p>
            <Button size="sm" onClick={() => setConfirmStatus("inativo")}>
              <PowerOff className="mr-2 h-4 w-4" strokeWidth={1.75} />
              Marcar como Inativo
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Encerramento de contratações
          </p>

          {servicesQuery.isLoading && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando
              contratações…
            </p>
          )}

          {!servicesQuery.isLoading && services.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Este cliente ainda não possui contratações.
            </p>
          )}

          <ul className="space-y-2">
            {services.map((service) => (
              <li
                key={service.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{service.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Status: {CLIENT_SERVICE_STATUS_LABEL[service.status]}
                    {service.termination_reason && (
                      <>
                        {" · "}
                        Encerramento:{" "}
                        {TERMINATION_REASON_LABEL[service.termination_reason] ??
                          service.termination_reason}
                      </>
                    )}
                    {service.termination_reason && service.terminated_at && (
                      <>
                        {" · "}
                        encerrada em{" "}
                        {new Date(service.terminated_at).toLocaleDateString("pt-BR")}
                      </>
                    )}
                    {service.termination_note && (
                      <>
                        {" · "}
                        {service.termination_note}
                      </>
                    )}
                  </p>
                </div>
                {canWrite && service.canTerminate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTargetServiceId(service.id)}
                  >
                    Encerrar contratação
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>

      {targetService && (
        <ClientServiceTerminationDialog
          serviceId={targetService.id}
          serviceName={targetService.name}
          open={targetServiceId !== null}
          onOpenChange={(open) => {
            if (!open) setTargetServiceId(null);
          }}
          onTerminated={(result) => {
            setSuggestDeactivation(
              result?.suggestsClientDeactivation ?? false,
            );
            queryClient.invalidateQueries({
              queryKey: ["client-lifecycle-services", clientId],
            });
          }}
        />
      )}

      <Dialog
        open={confirmStatus !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmStatus(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmStatus === "inativo"
                ? "Marcar cliente como Inativo?"
                : "Reativar cliente?"}
            </DialogTitle>
            <DialogDescription>
              {confirmStatus === "inativo"
                ? "O cliente deixa de aparecer como ativo. Propostas, contratos, ciclos, projetos e pagamentos são preservados."
                : "O cliente volta a ser considerado ativo. O histórico permanece intacto."}
            </DialogDescription>
          </DialogHeader>
          {confirmStatus === "inativo" && ongoingServices.length > 0 && (
            <p className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Há {ongoingServices.length} contratação(ões) em andamento. A
              inativação será recusada pelo servidor.
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmStatus(null)}
              disabled={statusMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!confirmStatus) return;
                statusMutation.mutate({ clientId, status: confirmStatus });
              }}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
