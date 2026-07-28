/**
 * Ficha operacional do Produto Acompanhado — criação e edição.
 *
 * Seções: Visão geral, Custos, Estoque, Objetivo, Limitações, Observações.
 * O responsável específico é opcional: quando ausente, a operação considera
 * o responsável do Projeto (herança lógica, sem cópia de valor).
 */
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTrackedProduct, updateTrackedProduct } from "@/lib/tracked-products.functions";
import {
  CLASSIFICATION_HINT,
  CLASSIFICATION_LABEL,
  CLASSIFICATION_ORDER,
  PRIORITY_LABEL,
  PRIORITY_ORDER,
  STOCK_UNIT_LABEL,
  STOCK_UNIT_ORDER,
  bpsToPercentInput,
  percentToBps,
  type TrackedProduct,
  type TrackedProductClassification,
  type TrackedProductPriority,
  type TrackedProductStockUnit,
} from "@/types/tracked-product";

interface TrackedProductDialogProps {
  projectId: string;
  product: TrackedProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  name: string;
  external_reference: string;
  sku: string;
  listing_url: string;
  classification: TrackedProductClassification;
  priority: TrackedProductPriority;
  objective: string;
  product_cost: string;
  packaging_cost: string;
  taxes: string;
  tax_rate: string;
  other_costs: string;
  current_sale_price: string;
  stock_quantity: string;
  stock_unit: TrackedProductStockUnit;
  restock_lead_time_days: string;
  operational_limitations: string;
  notes: string;
}

const EMPTY: FormState = {
  name: "",
  external_reference: "",
  sku: "",
  listing_url: "",
  classification: "validacao",
  priority: "media",
  objective: "",
  product_cost: "",
  packaging_cost: "",
  taxes: "",
  tax_rate: "",
  other_costs: "",
  current_sale_price: "",
  stock_quantity: "",
  stock_unit: "unidade",
  restock_lead_time_days: "",
  operational_limitations: "",
  notes: "",
};


/** Aceita "12,90" e "12.90"; retorna centavos ou null quando vazio. */
function toCents(value: string): number | null {
  const raw = value.trim().replace(/\./g, "").replace(",", ".");
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function fromCents(value: number | null): string {
  if (value === null || value === undefined) return "";
  return (value / 100).toFixed(2).replace(".", ",");
}

function toInt(value: string): number | null {
  const raw = value.trim();
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.trunc(n);
}

export function TrackedProductDialog({
  projectId,
  product,
  open,
  onOpenChange,
}: TrackedProductDialogProps) {
  const qc = useQueryClient();
  const createFn = useServerFn(createTrackedProduct);
  const updateFn = useServerFn(updateTrackedProduct);
  const [form, setForm] = useState<FormState>(EMPTY);

  useEffect(() => {
    if (!open) return;
    setForm(
      product
        ? {
            name: product.name,
            external_reference: product.external_reference ?? "",
            sku: product.sku ?? "",
            listing_url: product.listing_url ?? "",
            classification: product.classification,
            priority: product.priority,
            objective: product.objective ?? "",
            product_cost: fromCents(product.product_cost_cents),
            packaging_cost: fromCents(product.packaging_cost_cents),
            taxes: fromCents(product.taxes_cents),
            tax_rate: bpsToPercentInput(product.tax_rate_bps),
            other_costs: fromCents(product.other_costs_cents),
            current_sale_price: fromCents(product.current_sale_price_cents),
            stock_quantity:
              product.stock_quantity === null ? "" : String(product.stock_quantity),
            stock_unit: product.stock_unit ?? "unidade",
            restock_lead_time_days:
              product.restock_lead_time_days === null
                ? ""
                : String(product.restock_lead_time_days),
            operational_limitations: product.operational_limitations ?? "",
            notes: product.notes ?? "",
          }
        : EMPTY,
    );
  }, [open, product]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["tracked-products", projectId] });
    if (product) {
      qc.invalidateQueries({ queryKey: ["tracked-product-events", product.id] });
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        external_reference: form.external_reference.trim() || null,
        sku: form.sku.trim() || null,
        listing_url: form.listing_url.trim() || null,
        classification: form.classification,
        priority: form.priority,
        objective: form.objective.trim() || null,
        product_cost_cents: toCents(form.product_cost),
        packaging_cost_cents: toCents(form.packaging_cost),
        taxes_cents: toCents(form.taxes),
        tax_rate_bps: percentToBps(form.tax_rate),
        other_costs_cents: toCents(form.other_costs),
        current_sale_price_cents: toCents(form.current_sale_price),
        stock_quantity: toInt(form.stock_quantity),
        stock_unit: form.stock_unit,
        restock_lead_time_days: toInt(form.restock_lead_time_days),
        operational_limitations: form.operational_limitations.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (product) {
        return updateFn({ data: { id: product.id, ...payload } });
      }
      return createFn({ data: { project_id: projectId, ...payload } });
    },
    onSuccess: () => {
      toast.success(product ? "Produto atualizado." : "Produto adicionado ao acompanhamento.");
      invalidate();
      onOpenChange(false);
    },
    onError: (err: Error) =>
      toast.error("Não foi possível salvar o produto.", { description: err.message }),
  });

  const nameInvalid = form.name.trim().length < 2;
  // Validação local espelha o CHECK do banco: apenas HTTPS é aceito.
  const urlInvalid =
    form.listing_url.trim() !== "" && !/^https:\/\/\S+$/i.test(form.listing_url.trim());
  const taxRateInvalid = form.tax_rate.trim() !== "" && percentToBps(form.tax_rate) === null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Editar produto" : "Adicionar produto"}</DialogTitle>
          <DialogDescription>
            Dados operacionais do produto. Informações comerciais do contrato e do ciclo
            permanecem nas suas respectivas áreas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Section title="Visão geral">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome do produto" htmlFor="tp-name" className="md:col-span-2">
                <Input
                  id="tp-name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Ex.: Fone Bluetooth TWS Pro"
                />
              </Field>
              <Field label="SKU" htmlFor="tp-sku" hint="Único dentro deste projeto.">
                <Input
                  id="tp-sku"
                  value={form.sku}
                  onChange={(e) => set("sku", e.target.value)}
                  placeholder="Ex.: SV-FONE-001"
                />
              </Field>
              <Field label="Outra referência" htmlFor="tp-ref">
                <Input
                  id="tp-ref"
                  value={form.external_reference}
                  onChange={(e) => set("external_reference", e.target.value)}
                  placeholder="Código interno ou do marketplace"
                />
              </Field>
              <Field
                label="Link do anúncio"
                htmlFor="tp-listing"
                className="md:col-span-2"
                hint={urlInvalid ? "Informe um endereço iniciado por https://" : undefined}
              >
                <Input
                  id="tp-listing"
                  inputMode="url"
                  value={form.listing_url}
                  onChange={(e) => set("listing_url", e.target.value)}
                  placeholder="https://…"
                  aria-invalid={urlInvalid}
                />
              </Field>

              <Field label="Prioridade" htmlFor="tp-priority">
                <Select
                  value={form.priority}
                  onValueChange={(v) => set("priority", v as TrackedProductPriority)}
                >
                  <SelectTrigger id="tp-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_ORDER.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORITY_LABEL[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label="Classificação operacional"
                htmlFor="tp-classification"
                className="md:col-span-2"
                hint={CLASSIFICATION_HINT[form.classification]}
              >
                <Select
                  value={form.classification}
                  onValueChange={(v) => set("classification", v as TrackedProductClassification)}
                >
                  <SelectTrigger id="tp-classification">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASSIFICATION_ORDER.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CLASSIFICATION_LABEL[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <Section title="Custos (por unidade)">
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Produto (R$)" htmlFor="tp-cost">
                <Input
                  id="tp-cost"
                  inputMode="decimal"
                  value={form.product_cost}
                  onChange={(e) => set("product_cost", e.target.value)}
                  placeholder="0,00"
                />
              </Field>
              <Field label="Embalagem (R$)" htmlFor="tp-pack">
                <Input
                  id="tp-pack"
                  inputMode="decimal"
                  value={form.packaging_cost}
                  onChange={(e) => set("packaging_cost", e.target.value)}
                  placeholder="0,00"
                />
              </Field>
              <Field label="Impostos (R$)" htmlFor="tp-tax">
                <Input
                  id="tp-tax"
                  inputMode="decimal"
                  value={form.taxes}
                  onChange={(e) => set("taxes", e.target.value)}
                  placeholder="0,00"
                />
              </Field>
              <Field label="Outros (R$)" htmlFor="tp-other">
                <Input
                  id="tp-other"
                  inputMode="decimal"
                  value={form.other_costs}
                  onChange={(e) => set("other_costs", e.target.value)}
                  placeholder="0,00"
                />
              </Field>
            </div>
          </Section>

          <Section title="Estoque">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Quantidade atual" htmlFor="tp-stock">
                <Input
                  id="tp-stock"
                  inputMode="numeric"
                  value={form.stock_quantity}
                  onChange={(e) => set("stock_quantity", e.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field label="Prazo de reposição (dias)" htmlFor="tp-lead">
                <Input
                  id="tp-lead"
                  inputMode="numeric"
                  value={form.restock_lead_time_days}
                  onChange={(e) => set("restock_lead_time_days", e.target.value)}
                  placeholder="0"
                />
              </Field>
            </div>
          </Section>

          <Section title="Contexto operacional">
            <div className="space-y-4">
              <Field label="Objetivo do produto" htmlFor="tp-objective">
                <Textarea
                  id="tp-objective"
                  rows={2}
                  value={form.objective}
                  onChange={(e) => set("objective", e.target.value)}
                  placeholder="O que se espera deste produto no período."
                />
              </Field>
              <Field label="Limitações operacionais" htmlFor="tp-limits">
                <Textarea
                  id="tp-limits"
                  rows={2}
                  value={form.operational_limitations}
                  onChange={(e) => set("operational_limitations", e.target.value)}
                  placeholder="Restrições de estoque, prazo, fornecedor, margem."
                />
              </Field>
              <Field label="Observações" htmlFor="tp-notes">
                <Textarea
                  id="tp-notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </Field>
            </div>
          </Section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={nameInvalid || mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {product ? "Salvar alterações" : "Adicionar produto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
