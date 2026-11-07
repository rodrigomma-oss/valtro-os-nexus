/**
 * Sprint 13.1 — Catálogo de serviços (SKU).
 *
 * Server functions para leitura do catálogo e toggle admin de status.
 * O enum `service_type` (categoria) permanece intacto: esta camada é
 * um catálogo comercial separado.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { serviceInputSchema } from "@/lib/services.schemas";
import type { Database } from "@/integrations/supabase/types";

export type ServiceBillingType = Database["public"]["Enums"]["service_billing_type"];
export type ServiceCategory = Database["public"]["Enums"]["service_type"];

export type ServicePricingMode = Database["public"]["Enums"]["service_pricing_mode"];
export type ServiceOfferType = Database["public"]["Enums"]["service_offer_type"];

/**
 * Contrato fechado dos limites de um serviço (Sprint 15.2.3B).
 * O banco recusa qualquer chave fora desta lista.
 */
export interface ServiceDefaultLimits {
  max_products?: number | null;
  max_campaigns?: number | null;
  max_users?: number | null;
}

export interface CatalogService {
  id: string;
  code: string;
  name: string;
  category: ServiceCategory;
  /** Descrição operacional (o que é entregue). */
  description: string | null;
  /** Objetivo comercial (para que serve) — distinto da descrição. */
  objective: string | null;
  default_price_cents: number | null;
  pricing_mode: ServicePricingMode;
  offer_type: ServiceOfferType;
  origin_service_id: string | null;
  billing_type: ServiceBillingType;
  billing_interval: Database["public"]["Enums"]["billing_interval"] | null;
  active: boolean;
  default_limits: ServiceDefaultLimits;
  onboarding_template_key: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const SERVICE_SELECT =
  "id, code, name, category, description, objective, default_price_cents, pricing_mode, offer_type, origin_service_id, billing_type, billing_interval, active, default_limits, onboarding_template_key, sort_order, created_at, updated_at";


/** Normaliza os limites para o contrato conhecido, ignorando chaves legadas. */
function normalizeLimits(raw: unknown): ServiceDefaultLimits {
  if (!raw || typeof raw !== "object") return {};
  const src = raw as Record<string, unknown>;
  const out: ServiceDefaultLimits = {};
  for (const key of ["max_products", "max_campaigns", "max_users"] as const) {
    const value = src[key];
    if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
  }
  return out;
}

function normalize(row: any): CatalogService {
  return { ...row, default_limits: normalizeLimits(row.default_limits) };
}


export const listServices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CatalogService[]> => {
    const { data, error } = await context.supabase
      .from("services")
      .select(SERVICE_SELECT)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(normalize);
  });

export const toggleServiceActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("services")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Sprint 15.2.3C — Cadastro/edição do catálogo pelo mesmo formulário.
 * A escrita continua governada pela RLS (`services_insert_admin` /
 * `services_update_admin`) e pelas validações de banco da Sprint 15.2.3B:
 * nenhuma regra de negócio é duplicada aqui.
 */
export type { ServiceInput } from "@/lib/services.schemas";

export const upsertService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => serviceInputSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { id, default_limits, ...rest } = data;

    // Remove chaves vazias para respeitar o contrato fechado do banco.
    const limits: Record<string, number> = {};
    for (const key of ["max_products", "max_campaigns", "max_users"] as const) {
      const value = default_limits[key];
      if (typeof value === "number") limits[key] = value;
    }

    const payload = {
      ...rest,
      category: rest.category as ServiceCategory,
      default_price_cents:
        rest.pricing_mode === "sob_consulta" ? null : rest.default_price_cents,
      billing_interval:
        rest.billing_type === "recorrente" ? (rest.billing_interval ?? "monthly") : null,
      default_limits: limits,
    };

    if (id) {
      const { data: row, error } = await context.supabase
        .from("services")
        .update(payload)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: row.id };
    }

    const { data: row, error } = await context.supabase
      .from("services")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });
