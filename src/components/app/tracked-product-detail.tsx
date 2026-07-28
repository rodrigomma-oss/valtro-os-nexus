/**
 * Ficha expandida do Produto Acompanhado: custos, estoque, contexto e a
 * linha do tempo própria do produto (separada da timeline do Projeto).
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  addTrackedProductNote,
  getTrackedProductEvents,
} from "@/lib/tracked-products.functions";
import { totalCostCents, type TrackedProduct } from "@/types/tracked-product";

interface TrackedProductDetailProps {
  product: TrackedProduct;
  projectId: string;
  canWrite: boolean;
}

function money(value: number | null) {
  if (value === null || value === undefined) return "—";
  return (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TrackedProductDetail({
  product,
  projectId,
  canWrite,
}: TrackedProductDetailProps) {
  const qc = useQueryClient();
  const eventsFn = useServerFn(getTrackedProductEvents);
  const noteFn = useServerFn(addTrackedProductNote);
  const [note, setNote] = useState("");

  const eventsQuery = useQuery({
    queryKey: ["tracked-product-events", product.id],
    queryFn: () => eventsFn({ data: { tracked_product_id: product.id } }),
  });

  const noteMutation = useMutation({
    mutationFn: () =>
      noteFn({
        data: {
          tracked_product_id: product.id,
          project_id: projectId,
          content: note.trim(),
        },
      }),
    onSuccess: () => {
      setNote("");
      toast.success("Observação registrada.");
      qc.invalidateQueries({ queryKey: ["tracked-product-events", product.id] });
    },
    onError: (err: Error) =>
      toast.error("Não foi possível registrar a observação.", { description: err.message }),
  });

  return (
    <div className="border-t border-border px-4 py-4 space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Block title="Custos por unidade">
          <Row label="Produto" value={money(product.product_cost_cents)} />
          <Row label="Embalagem" value={money(product.packaging_cost_cents)} />
          <Row label="Impostos" value={money(product.taxes_cents)} />
          <Row label="Outros" value={money(product.other_costs_cents)} />
          <Row label="Total" value={money(totalCostCents(product))} strong />
        </Block>

        <Block title="Estoque e reposição">
          <Row
            label="Quantidade atual"
            value={product.stock_quantity === null ? "—" : String(product.stock_quantity)}
          />
          <Row
            label="Prazo de reposição"
            value={
              product.restock_lead_time_days === null
                ? "—"
                : `${product.restock_lead_time_days} dia${product.restock_lead_time_days === 1 ? "" : "s"}`
            }
          />
          <Row
            label="Responsável"
            value={product.owner_id ? "Específico do produto" : "Responsável do projeto"}
          />
        </Block>
      </div>

      {(product.objective || product.operational_limitations || product.notes) && (
        <div className="grid gap-4 md:grid-cols-3">
          {product.objective && <Text title="Objetivo" value={product.objective} />}
          {product.operational_limitations && (
            <Text title="Limitações operacionais" value={product.operational_limitations} />
          )}
          {product.notes && <Text title="Observações" value={product.notes} />}
        </div>
      )}

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Histórico do produto
        </p>

        {canWrite && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Textarea
              rows={1}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Registrar uma observação operacional…"
              className="min-h-[40px]"
              aria-label="Nova observação"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={note.trim().length < 2 || noteMutation.isPending}
              onClick={() => noteMutation.mutate()}
            >
              {noteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MessageSquarePlus className="h-4 w-4 mr-2" strokeWidth={1.75} />
              )}
              Registrar
            </Button>
          </div>
        )}

        {eventsQuery.isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando histórico…</p>
        ) : (eventsQuery.data ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum registro ainda.</p>
        ) : (
          <ul className="space-y-2">
            {(eventsQuery.data ?? []).map((e) => (
              <li key={e.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0">
                  <p className="text-foreground">{e.title}</p>
                  {e.description && (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {e.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">{fmtDateTime(e.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold text-foreground" : "text-foreground"}>{value}</span>
    </div>
  );
}

function Text({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        {title}
      </p>
      <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>
    </div>
  );
}
