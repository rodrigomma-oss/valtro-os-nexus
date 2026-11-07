/**
 * VOS-001B.2A-R1 — Catálogo de produtos SaaS.
 *
 * Leitura do catálogo `saas_products` (produtos próprios da Valtro Labs),
 * distinto do catálogo comercial de serviços (`services`).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type SaasProductStatus = Database["public"]["Enums"]["saas_product_status"];

export interface SaasProduct {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: SaasProductStatus;
}

export const listSaasProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ activeOnly: z.boolean().optional() })
      .default({})
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<SaasProduct[]> => {
    let query = context.supabase
      .from("saas_products")
      .select("id, code, name, description, status")
      .order("name", { ascending: true });

    if (data.activeOnly) query = query.eq("status", "active");

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []) as SaasProduct[];
  });
