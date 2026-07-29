/**
 * NewBriefingDialog — Modal "Gerar Novo Briefing" (Sprint 2C.2).
 *
 * O operador seleciona apenas o Serviço. O Template correspondente é
 * resolvido no servidor via `templateTypeForService`.
 *
 * Sprint 15.2.3A — as opções vêm exclusivamente da tabela `services`
 * (catálogo comercial oficial). Não existe mais lista fixa local.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listServices } from "@/lib/services.functions";
import { serviceCategoryOptions } from "@/lib/service-catalog";
import type { ServiceType } from "@/types/briefing";

interface NewBriefingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultService?: ServiceType;
  submitting?: boolean;
  onSubmit: (service: Exclude<ServiceType, "nao_definido">) => void;
}

export function NewBriefingDialog({
  open,
  onOpenChange,
  defaultService,
  submitting,
  onSubmit,
}: NewBriefingDialogProps) {
  const initial =
    defaultService && defaultService !== "nao_definido"
      ? defaultService
      : undefined;
  const [service, setService] = useState<
    Exclude<ServiceType, "nao_definido"> | undefined
  >(initial);

  const listServicesFn = useServerFn(listServices);
  const servicesQuery = useQuery({
    queryKey: ["services-catalog", "active"],
    queryFn: () => listServicesFn(),
    enabled: open,
    staleTime: 60_000,
  });

  const options = useMemo(
    () => serviceCategoryOptions(servicesQuery.data ?? []),
    [servicesQuery.data],
  );

  useEffect(() => {
    if (open) setService(initial);
  }, [open, initial]);

  const canSubmit = !!service && !submitting;


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="new-briefing-dialog">
        <DialogHeader>
          <DialogTitle>Gerar Novo Briefing</DialogTitle>
          <DialogDescription>
            Selecione qual serviço será iniciado para este cliente. O sistema
            escolherá automaticamente o Template correspondente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="briefing-service">
            Serviço <span className="text-destructive">*</span>
          </Label>
          <Select
            value={service}
            onValueChange={(v) =>
              setService(v as Exclude<ServiceType, "nao_definido">)
            }
          >
            <SelectTrigger id="briefing-service">
              <SelectValue placeholder="Selecione o serviço…" />
            </SelectTrigger>
            <SelectContent>
              {BRIEFING_SERVICE_CATALOG.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {service && (
            <p className="text-xs text-muted-foreground pt-1">
              {
                BRIEFING_SERVICE_CATALOG.find((o) => o.value === service)
                  ?.description
              }
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => service && onSubmit(service)}
            disabled={!canSubmit}
            className="gap-2"
            data-testid="generate-briefing-button"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
            ) : (
              <Plus className="h-4 w-4" strokeWidth={1.75} />
            )}
            Gerar Briefing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
