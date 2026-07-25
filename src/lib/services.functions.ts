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
import type { Database } from "@/integrations/supabase/types";

export type ServiceBillingType = Database["public"]["Enums"]["service_billing_type"];
export type ServiceCategory = Database["public"]["Enums"]["service_type"];

export interface CatalogService {
  id: string;
  code: string;
  name: string;
  category: ServiceCategory;
  description: string | null;
  default_price_cents: number | null;
  billing_type: ServiceBillingType;
  active: boolean;
  default_limits: Record<string, string | number | boolean | null>;
  briefing_template_key: string | null;
  onboarding_template_key: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const SERVICE_SELECT =
  "id, code, name, category, description, default_price_cents, billing_type, active, default_limits, briefing_template_key, onboarding_template_key, sort_order, created_at, updated_at";

function normalize(row: any): CatalogService {
  return {
    ...row,
    default_limits:
      row.default_limits && typeof row.default_limits === "object"
        ? (row.default_limits as Record<string, unknown>)
        : {},
  };
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
