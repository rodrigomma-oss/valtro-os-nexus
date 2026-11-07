/**
 * Seção "Produtos Acompanhados" da ficha do Projeto — Sprint 15.2.
 *
 * O Projeto é o centro da operação: os produtos são a unidade de execução
 * e existem apenas em função dele. O limite exibido vem do snapshot da
 * contratação (nunca copiado) e o responsável é herdado logicamente do
 * projeto quando o produto não tem um específico.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Archive,
  ChevronDown,
  Loader2,
  Package,
  Pencil,
  Plus,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { TrackedProductDialog } from "@/components/app/tracked-product-dialog";
import { TrackedProductDetail } from "@/components/app/tracked-product-detail";
import {
  listTrackedProducts,
  setTrackedProductStatus,
} from "@/lib/tracked-products.functions";
import {
  classificationLabel,
  classificationTone,
  PRIORITY_LABEL,
  PRIORITY_TONE,
  stockUnitLabel,
  totalCostCents,
  type TrackedProduct,
} from "@/types/tracked-product";

interface TrackedProductsCardProps {
  projectId: string;
  canWrite: boolean;
}

function formatCents(value: number | null) {
  if (value === null) return "—";
  return (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function TrackedProductsCard({ projectId, canWrite }: TrackedProductsCardProps) {
  const qc = useQueryClient();
  const listFn = useServerFn(listTrackedProducts);
  const statusFn = useServerFn(setTrackedProductStatus);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TrackedProduct | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const query = useQuery({
    queryKey: ["tracked-products", projectId],
    queryFn: () => listFn({ data: { project_id: projectId } }),
  });

  const statusMutation = useMutation({
    mutationFn: (vars: { id: string; status: "ativo" | "arquivado" }) =>
      statusFn({ data: vars }),
    onSuccess: (_r, vars) => {
      toast.success(vars.status === "arquivado" ? "Produto arquivado." : "Produto reativado.");
      qc.invalidateQueries({ queryKey: ["tracked-products", projectId] });
      qc.invalidateQueries({ queryKey: ["tracked-product-events", vars.id] });
    },
    onError: (err: Error) =>
      toast.error("Não foi possível alterar a situação do produto.", {
        description: err.message,
      }),
  });

  const payload = query.data;
  const all = payload?.products ?? [];
  const visible = showArchived ? all : all.filter((p) => p.status === "ativo");
  const archivedCount = all.length - all.filter((p) => p.status === "ativo").length;

  const limit = payload?.contractedLimit ?? null;
  const activeCount = payload?.activeCount ?? 0;
  const overLimit = limit !== null && activeCount > limit;

  return (
    <Card className="shadow-soft">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" strokeWidth={1.75} />
            Produtos acompanhados
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeCount} ativo{activeCount === 1 ? "" : "s"}
            {limit !== null ? ` de ${limit} contratado${limit === 1 ? "" : "s"}` : " · limite não definido no contrato"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {archivedCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? "Ocultar arquivados" : `Ver arquivados (${archivedCount})`}
            </Button>
          )}
          {canWrite && (
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" strokeWidth={1.75} />
              Adicionar
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {overLimit && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Há {activeCount} produtos ativos e o contrato prevê {limit}. Alinhe o escopo com o
            cliente ou arquive produtos fora do acompanhamento.
          </div>
        )}

        {query.isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando produtos…
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nenhum produto acompanhado"
            description="Adicione os produtos que fazem parte da operação para consolidar custos, estoque e decisões no projeto."
          />
        ) : (
          <div className="space-y-2">
            {visible.map((p) => {
              const expanded = expandedId === p.id;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "rounded-lg border border-border bg-card transition-colors",
                    p.status === "arquivado" && "opacity-70",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-3 p-3">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : p.id)}
                      className="flex flex-1 min-w-0 items-center gap-3 text-left"
                      aria-expanded={expanded}
                    >
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                          expanded && "rotate-180",
                        )}
                        strokeWidth={1.75}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.sku ?? p.external_reference ?? "Sem referência"} ·{" "}
                          {p.stock_quantity === null
                            ? "estoque não informado"
                            : `${p.stock_quantity} ${stockUnitLabel(p.stock_unit).toLowerCase()} em estoque`}{" "}
                          · custo {formatCents(totalCostCents(p))}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={classificationTone(p.classification)}>
                        {classificationLabel(p.classification)}
                      </Badge>
                      <Badge variant="outline" className={PRIORITY_TONE[p.priority]}>
                        {PRIORITY_LABEL[p.priority]}
                      </Badge>
                      {p.status === "arquivado" && (
                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                          Arquivado
                        </Badge>
                      )}
                      {canWrite && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Editar ${p.name}`}
                            onClick={() => {
                              setEditing(p);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" strokeWidth={1.75} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={
                              p.status === "ativo"
                                ? `Arquivar ${p.name}`
                                : `Reativar ${p.name}`
                            }
                            disabled={statusMutation.isPending}
                            onClick={() =>
                              statusMutation.mutate({
                                id: p.id,
                                status: p.status === "ativo" ? "arquivado" : "ativo",
                              })
                            }
                          >
                            {p.status === "ativo" ? (
                              <Archive className="h-4 w-4" strokeWidth={1.75} />
                            ) : (
                              <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {expanded && (
                    <TrackedProductDetail
                      product={p}
                      projectId={projectId}
                      canWrite={canWrite}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <TrackedProductDialog
        projectId={projectId}
        product={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </Card>
  );
}
