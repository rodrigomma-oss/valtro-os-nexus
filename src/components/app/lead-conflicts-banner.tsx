/**
 * Faixa "Dados do briefing divergentes".
 *
 * Exibe as divergências pendentes entre o cadastro do Lead e o que o cliente
 * informou no briefing. Admin/operator podem Aplicar ou Descartar; viewer
 * apenas visualiza.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  listLeadFieldConflicts,
  resolveLeadFieldConflict,
} from "@/lib/lead-conflicts.functions";
import { LEAD_FIELD_LABEL, type SyncableLeadField } from "@/lib/briefing-lead-sync";
import { formatPhone } from "@/lib/formatters";

export interface LeadConflictsBannerProps {
  leadId: string;
  /** Somente admin/operator podem resolver. */
  canWrite: boolean;
}

function displayValue(field: SyncableLeadField, value: string | null) {
  if (!value) return "—";
  if (field === "phone") return formatPhone(value);
  if (field === "instagram") return `@${value.replace(/^@/, "")}`;
  return value;
}

export function LeadConflictsBanner({ leadId, canWrite }: LeadConflictsBannerProps) {
  const qc = useQueryClient();
  const listFn = useServerFn(listLeadFieldConflicts);
  const resolveFn = useServerFn(resolveLeadFieldConflict);

  const conflictsQuery = useQuery({
    queryKey: ["lead-field-conflicts", leadId],
    queryFn: () => listFn({ data: { lead_id: leadId } }),
  });

  const resolveMutation = useMutation({
    mutationFn: (vars: { id: string; action: "aceitar" | "descartar" }) =>
      resolveFn({ data: vars }),
    onSuccess: (_res, vars) => {
      toast.success(
        vars.action === "aceitar"
          ? "Dado do briefing aplicado ao Lead."
          : "Divergência descartada.",
      );
      qc.invalidateQueries({ queryKey: ["lead-field-conflicts", leadId] });
      qc.invalidateQueries({ queryKey: ["lead", leadId] });
    },
    onError: (err: Error) =>
      toast.error("Não foi possível resolver a divergência.", {
        description: err.message,
      }),
  });

  const conflicts = conflictsQuery.data ?? [];
  if (conflicts.length === 0) return null;

  return (
    <div
      data-testid="lead-conflicts-banner"
      className="rounded-xl border border-warning/40 bg-warning/10 p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Dados do briefing divergentes
            </h3>
            <p className="text-xs text-muted-foreground">
              O cliente informou valores diferentes do cadastro atual. Nada foi
              sobrescrito automaticamente.
            </p>
          </div>

          <ul className="space-y-3">
            {conflicts.map((c) => {
              const field = c.field as SyncableLeadField;
              return (
                <li
                  key={c.id}
                  data-testid={`lead-conflict-${c.field}`}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="grid flex-1 gap-2 sm:grid-cols-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Campo
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {LEAD_FIELD_LABEL[field] ?? c.field}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Valor atual
                      </p>
                      <p className="text-sm text-foreground">
                        {displayValue(field, c.current_value)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Informado no briefing
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {displayValue(field, c.briefing_value)}
                      </p>
                    </div>
                  </div>

                  {canWrite ? (
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        className="h-9 gap-1"
                        data-testid={`lead-conflict-apply-${c.field}`}
                        disabled={resolveMutation.isPending}
                        onClick={() =>
                          resolveMutation.mutate({ id: c.id, action: "aceitar" })
                        }
                      >
                        {resolveMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Aplicar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 gap-1"
                        data-testid={`lead-conflict-discard-${c.field}`}
                        disabled={resolveMutation.isPending}
                        onClick={() =>
                          resolveMutation.mutate({ id: c.id, action: "descartar" })
                        }
                      >
                        <X className="h-3.5 w-3.5" />
                        Descartar
                      </Button>
                    </div>
                  ) : (
                    <p className="shrink-0 text-xs text-muted-foreground">
                      Somente admin/operador podem resolver.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
