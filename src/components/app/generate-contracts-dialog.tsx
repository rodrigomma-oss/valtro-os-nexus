/**
 * GenerateContractsDialog — Sprint 13.3.
 *
 * Action manual e explícita que converte itens de uma proposta APROVADA em
 * contratações (`client_services`). O operador sempre vê exatamente o que
 * será criado antes de confirmar (nenhum item livre é convertido às cegas).
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  generateClientServices,
  previewProposalContracts,
} from "@/lib/client-services.functions";
import {
  BILLING_INTERVAL_LABEL,
  BILLING_TYPE_LABEL,
  scopeKeyLabel,
} from "@/types/client-service";

interface GenerateContractsDialogProps {
  proposalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function fmtCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function GenerateContractsDialog({
  proposalId,
  open,
  onOpenChange,
}: GenerateContractsDialogProps) {
  const qc = useQueryClient();
  const previewFn = useServerFn(previewProposalContracts);
  const generateFn = useServerFn(generateClientServices);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const previewQuery = useQuery({
    queryKey: ["contracts-preview", proposalId],
    queryFn: () => previewFn({ data: { proposal_id: proposalId } }),
    enabled: open,
  });
  const preview = previewQuery.data;

  // Pré-seleciona somente itens ainda não contratados.
  useEffect(() => {
    if (!preview) return;
    const next: Record<string, boolean> = {};
    for (const c of preview.candidates) next[c.proposal_item_id] = !c.already_contracted;
    setSelected(next);
  }, [preview]);

  const selectedIds = useMemo(
    () =>
      (preview?.candidates ?? [])
        .filter((c) => !c.already_contracted && selected[c.proposal_item_id])
        .map((c) => c.proposal_item_id),
    [preview, selected],
  );

  const generate = useMutation({
    mutationFn: () =>
      generateFn({ data: { proposal_id: proposalId, proposal_item_ids: selectedIds } }),
    onSuccess: (res) => {
      const created = res.created.length;
      const skipped = res.skipped.length;
      toast.success(
        created > 0
          ? `${created} contratação(ões) criada(s).`
          : "Nenhuma nova contratação criada.",
        skipped > 0 ? { description: `${skipped} item(ns) já possuíam contratação.` } : undefined,
      );
      qc.invalidateQueries({ queryKey: ["contracts-preview", proposalId] });
      if (preview?.client_id) {
        qc.invalidateQueries({ queryKey: ["client-services", preview.client_id] });
      }
      previewQuery.refetch();
    },
    onError: (err: Error) =>
      toast.error("Não foi possível gerar as contratações.", { description: err.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="generate-contracts-dialog">
        <DialogHeader>
          <DialogTitle>Gerar contratações</DialogTitle>
          <DialogDescription>
            Os valores abaixo são copiados como retrato da proposta. Alterações futuras no
            catálogo ou na proposta não alteram contratações já criadas.
          </DialogDescription>
        </DialogHeader>

        {previewQuery.isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando itens…
          </div>
        ) : !preview ? null : (
          <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
            {preview.blocked_reason && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.75} />
                <span data-testid="contracts-blocked-reason">{preview.blocked_reason}</span>
              </div>
            )}

            {preview.candidates.map((c) => {
              const scopeEntries = Object.entries(c.scope);
              return (
                <label
                  key={c.proposal_item_id}
                  className={cn(
                    "flex gap-3 rounded-xl border border-border bg-card p-3 cursor-pointer",
                    c.already_contracted && "opacity-70 cursor-default",
                  )}
                  data-testid="contract-candidate"
                >
                  <Checkbox
                    className="mt-0.5"
                    checked={c.already_contracted ? true : !!selected[c.proposal_item_id]}
                    disabled={c.already_contracted || !preview.can_generate}
                    onCheckedChange={(v) =>
                      setSelected((prev) => ({ ...prev, [c.proposal_item_id]: !!v }))
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{c.name}</span>
                      {c.custom && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                          Customizado
                        </span>
                      )}
                      {c.already_contracted && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                          Já contratado
                        </span>
                      )}
                    </div>
                    {c.description && (
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {c.description}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>
                        {c.quantity} × {fmtCents(c.unit_price_cents)}
                      </span>
                      <span>· {fmtCents(c.contracted_amount_cents)}</span>
                      <span>
                        ·{" "}
                        {BILLING_TYPE_LABEL[c.billing_type]}
                        {c.billing_interval
                          ? ` · ${BILLING_INTERVAL_LABEL[c.billing_interval]}`
                          : ""}
                      </span>
                      {scopeEntries.map(([k, v]) => (
                        <span key={k}>
                          · {scopeKeyLabel(k)}: {String(v)}
                        </span>
                      ))}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            onClick={() => generate.mutate()}
            disabled={!preview?.can_generate || selectedIds.length === 0 || generate.isPending}
            data-testid="confirm-generate-contracts"
          >
            {generate.isPending
              ? "Gerando…"
              : `Gerar ${selectedIds.length > 0 ? selectedIds.length : ""} contratação(ões)`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
