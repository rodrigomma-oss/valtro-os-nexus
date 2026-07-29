/**
 * Sprint 15.2.3C — Formulário único de cadastro e edição de serviços.
 *
 * O mesmo componente atende criação e edição: recebe `service` para editar
 * ou `null` para criar. Nenhuma regra de negócio nova — apenas espelha as
 * validações já garantidas no banco (Sprint 15.2.3B).
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { upsertService, type CatalogService } from "@/lib/services.functions";
import {
  SERVICE_OFFER_TYPE_LABEL,
  SERVICE_PRICING_MODE_LABEL,
} from "@/lib/service-catalog";
import { SERVICE_TYPE_LABEL, type ServiceType } from "@/types/briefing";
import { ONBOARDING_TEMPLATES } from "@/config/onboarding-templates";

const CATEGORY_OPTIONS = (Object.keys(SERVICE_TYPE_LABEL) as ServiceType[]).filter(
  (c) => c !== "nao_definido",
);

const ONBOARDING_OPTIONS = Object.keys(ONBOARDING_TEMPLATES);

const NONE = "__none__";

interface FormState {
  code: string;
  name: string;
  category: ServiceType;
  description: string;
  objective: string;
  pricingMode: "fixo" | "sob_consulta";
  price: string;
  billingType: "pontual" | "recorrente";
  offerType: "principal" | "complementar" | "recorrente";
  originServiceId: string;
  onboardingKey: string;
  sortOrder: string;
  active: boolean;
  maxProducts: string;
  maxCampaigns: string;
  maxUsers: string;
}

function emptyState(): FormState {
  return {
    code: "",
    name: "",
    category: "gestao_shopee",
    description: "",
    objective: "",
    pricingMode: "fixo",
    price: "",
    billingType: "pontual",
    offerType: "principal",
    originServiceId: NONE,
    onboardingKey: NONE,
    sortOrder: "0",
    active: true,
    maxProducts: "",
    maxCampaigns: "",
    maxUsers: "",
  };
}

function fromService(s: CatalogService): FormState {
  return {
    code: s.code,
    name: s.name,
    category: s.category as ServiceType,
    description: s.description ?? "",
    objective: s.objective ?? "",
    pricingMode: s.pricing_mode,
    price:
      s.default_price_cents == null ? "" : (s.default_price_cents / 100).toFixed(2),
    billingType: s.billing_type,
    offerType: s.offer_type,
    originServiceId: s.origin_service_id ?? NONE,
    onboardingKey: s.onboarding_template_key ?? NONE,
    sortOrder: String(s.sort_order ?? 0),
    active: s.active,
    maxProducts: s.default_limits.max_products?.toString() ?? "",
    maxCampaigns: s.default_limits.max_campaigns?.toString() ?? "",
    maxUsers: s.default_limits.max_users?.toString() ?? "",
  };
}

/** Converte campo numérico opcional: vazio = ilimitado (null). */
function optionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  /** `null` cria um novo serviço; um serviço existente entra em edição. */
  service: CatalogService | null;
  /** Catálogo completo, usado para escolher o serviço de origem. */
  catalog: CatalogService[];
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  catalog,
}: ServiceFormDialogProps) {
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertService);
  const [form, setForm] = useState<FormState>(emptyState);

  useEffect(() => {
    if (open) setForm(service ? fromService(service) : emptyState());
  }, [open, service]);

  const originOptions = useMemo(
    () => catalog.filter((s) => s.id !== service?.id),
    [catalog, service?.id],
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const mutation = useMutation({
    mutationFn: () => {
      const priceValue = Number.parseFloat(form.price.replace(",", "."));
      return upsertFn({
        data: {
          ...(service ? { id: service.id } : {}),
          code: form.code.trim(),
          name: form.name.trim(),
          category: form.category,
          description: form.description.trim() || null,
          objective: form.objective.trim() || null,
          pricing_mode: form.pricingMode,
          default_price_cents:
            form.pricingMode === "fixo" && Number.isFinite(priceValue)
              ? Math.round(priceValue * 100)
              : null,
          billing_type: form.billingType,
          billing_interval: form.billingType === "recorrente" ? "monthly" : null,
          offer_type: form.offerType,
          origin_service_id:
            form.originServiceId === NONE ? null : form.originServiceId,
          onboarding_template_key:
            form.onboardingKey === NONE ? null : form.onboardingKey,
          sort_order: optionalInt(form.sortOrder) ?? 0,
          active: form.active,
          default_limits: {
            max_products: optionalInt(form.maxProducts),
            max_campaigns: optionalInt(form.maxCampaigns),
            max_users: optionalInt(form.maxUsers),
          },
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services-catalog"] });
      toast.success(service ? "Serviço atualizado." : "Serviço criado.");
      onOpenChange(false);
    },
    onError: (err: Error) =>
      toast.error(err.message || "Não foi possível salvar o serviço."),
  });

  const canSubmit =
    form.name.trim().length >= 2 &&
    form.code.trim().length >= 2 &&
    (form.pricingMode === "sob_consulta" || form.price.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {service ? "Editar serviço" : "Novo serviço"}
          </DialogTitle>
          <DialogDescription>
            Estrutura comercial do catálogo. Campos de escopo vazios significam
            ilimitado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="service-name">Nome</Label>
            <Input
              id="service-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Gestão Shopee — Plano Essencial"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-code">Código (SKU)</Label>
            <Input
              id="service-code"
              value={form.code}
              onChange={(e) => set("code", e.target.value)}
              placeholder="SHOPEE-ESS"
            />
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select
              value={form.category}
              onValueChange={(v) => set("category", v as ServiceType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {SERVICE_TYPE_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="service-description">Descrição operacional</Label>
            <Textarea
              id="service-description"
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="O que é entregue ao cliente."
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="service-objective">Objetivo do serviço</Label>
            <Textarea
              id="service-objective"
              rows={2}
              value={form.objective}
              onChange={(e) => set("objective", e.target.value)}
              placeholder="Para que serve comercialmente."
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de cobrança</Label>
            <Select
              value={form.billingType}
              onValueChange={(v) =>
                set("billingType", v as FormState["billingType"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pontual">Pontual</SelectItem>
                <SelectItem value="recorrente">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de oferta</Label>
            <Select
              value={form.offerType}
              onValueChange={(v) => set("offerType", v as FormState["offerType"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.keys(SERVICE_OFFER_TYPE_LABEL) as FormState["offerType"][]
                ).map((o) => (
                  <SelectItem key={o} value={o}>
                    {SERVICE_OFFER_TYPE_LABEL[o]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Modo de precificação</Label>
            <Select
              value={form.pricingMode}
              onValueChange={(v) =>
                set("pricingMode", v as FormState["pricingMode"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.keys(
                    SERVICE_PRICING_MODE_LABEL,
                  ) as FormState["pricingMode"][]
                ).map((p) => (
                  <SelectItem key={p} value={p}>
                    {SERVICE_PRICING_MODE_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-price">Preço (R$)</Label>
            <Input
              id="service-price"
              inputMode="decimal"
              disabled={form.pricingMode === "sob_consulta"}
              value={form.pricingMode === "sob_consulta" ? "" : form.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder={
                form.pricingMode === "sob_consulta" ? "Sob consulta" : "1500,00"
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Serviço de origem</Label>
            <Select
              value={form.originServiceId}
              onValueChange={(v) => set("originServiceId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Nenhum</SelectItem>
                {originOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Onboarding</Label>
            <Select
              value={form.onboardingKey}
              onValueChange={(v) => set("onboardingKey", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Não possui" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Não possui</SelectItem>
                {ONBOARDING_OPTIONS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {ONBOARDING_TEMPLATES[key]?.name ?? key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Escopo (vazio = ilimitado)
            </Label>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="limit-products">Máximo de produtos</Label>
                <Input
                  id="limit-products"
                  inputMode="numeric"
                  value={form.maxProducts}
                  onChange={(e) => set("maxProducts", e.target.value)}
                  placeholder="Ilimitado"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="limit-campaigns">Máximo de campanhas</Label>
                <Input
                  id="limit-campaigns"
                  inputMode="numeric"
                  value={form.maxCampaigns}
                  onChange={(e) => set("maxCampaigns", e.target.value)}
                  placeholder="Ilimitado"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="limit-users">Máximo de usuários</Label>
                <Input
                  id="limit-users"
                  inputMode="numeric"
                  value={form.maxUsers}
                  onChange={(e) => set("maxUsers", e.target.value)}
                  placeholder="Ilimitado"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-order">Ordem de apresentação</Label>
            <Input
              id="service-order"
              inputMode="numeric"
              value={form.sortOrder}
              onChange={(e) => set("sortOrder", e.target.value)}
            />
          </div>

          <div className="flex items-end gap-3">
            <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              <Switch
                id="service-active"
                checked={form.active}
                onCheckedChange={(v) => set("active", v)}
              />
              <Label htmlFor="service-active" className="cursor-pointer">
                {form.active ? "Ativo" : "Inativo"}
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
          >
            {mutation.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
