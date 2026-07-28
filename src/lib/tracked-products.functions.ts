/**
 * Produtos Acompanhados — server functions (Sprint 15.2).
 *
 * Toda leitura/escrita passa pelo cliente autenticado (RLS aplica-se como o
 * usuário). Escrita é restrita a admin/operator pelas policies; `viewer`
 * recebe erro do banco. Nenhuma referência a cliente/contratação é gravada:
 * o vínculo é exclusivamente `project_id`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { TrackedProduct, TrackedProductEvent } from "@/types/tracked-product";
import { CLASSIFICATION_ORDER, PRIORITY_ORDER } from "@/types/tracked-product";

const PRODUCT_SELECT =
  "id, project_id, name, external_reference, sku, listing_url, classification, priority, objective, status, position, owner_id, product_cost_cents, packaging_cost_cents, taxes_cents, tax_rate_bps, other_costs_cents, current_sale_price_cents, stock_quantity, stock_unit, restock_lead_time_days, operational_limitations, notes, archived_at, archived_by, created_by, created_at, updated_at";

const EVENT_SELECT =
  "id, tracked_product_id, project_id, event_type, title, description, metadata, actor_id, created_at";

const classificationSchema = z.enum(
  CLASSIFICATION_ORDER as unknown as [string, ...string[]],
);
const prioritySchema = z.enum(PRIORITY_ORDER as unknown as [string, ...string[]]);
const stockUnitSchema = z.enum(STOCK_UNIT_ORDER as unknown as [string, ...string[]]);

/** Texto opcional: string vazia vira null para não poluir a ficha. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "" ? null : v));

/** Apenas HTTPS: nenhuma consulta é feita à URL, mas evitamos esquemas inseguros. */
const httpsUrl = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((v) => v.startsWith("https://"), "O link do anúncio deve começar com https://")
  .nullable()
  .optional()
  .transform((v) => (v === undefined ? undefined : v === "" ? null : v));

const optionalInt = z.number().int().min(0).nullable().optional();
/** Alíquota em basis points: 0–10000 (0% a 100%). */
const optionalBps = z.number().int().min(0).max(10000).nullable().optional();

/** Violação do índice único parcial de SKU dentro do projeto. */
function translateDbError(message: string, code?: string): Error {
  if (code === "23505" && message.includes("idx_ptp_project_sku_unique")) {
    return new Error("Já existe um produto com este SKU neste projeto.");
  }
  return new Error(message);
}


export interface TrackedProductsPayload {
  products: TrackedProduct[];
  /** Limite comercial de produtos ativos, lido do snapshot da contratação. */
  contractedLimit: number | null;
  activeCount: number;
  projectOwnerId: string | null;
}

export const listTrackedProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ project_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<TrackedProductsPayload> => {
    const supabase = context.supabase;

    const { data: project, error: pErr } = await supabase
      .from("projects")
      .select("id, owner_id, client_service_id")
      .eq("id", data.project_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!project) throw new Error("Projeto não encontrado.");

    const { data: rows, error } = await supabase
      .from("project_tracked_products")
      .select(PRODUCT_SELECT)
      .eq("project_id", data.project_id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const products = (rows ?? []) as unknown as TrackedProduct[];

    // Limite comercial vem SEMPRE do snapshot da contratação — nunca copiado.
    let contractedLimit: number | null = null;
    const clientServiceId = (project as { client_service_id: string | null }).client_service_id;
    if (clientServiceId) {
      const { data: cs, error: csErr } = await supabase
        .from("client_services")
        .select("scope_snapshot")
        .eq("id", clientServiceId)
        .maybeSingle();
      if (csErr) throw new Error(csErr.message);
      const raw = (cs as { scope_snapshot?: Record<string, unknown> } | null)?.scope_snapshot
        ?.max_products;
      const n = Number(raw);
      contractedLimit = raw === null || raw === undefined || !Number.isFinite(n) ? null : n;
    }

    return {
      products,
      contractedLimit,
      activeCount: products.filter((p) => p.status === "ativo").length,
      projectOwnerId: (project as { owner_id: string | null }).owner_id,
    };
  });

export const getTrackedProductEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ tracked_product_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<TrackedProductEvent[]> => {
    const { data: rows, error } = await context.supabase
      .from("project_tracked_product_events")
      .select(EVENT_SELECT)
      .eq("tracked_product_id", data.tracked_product_id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as TrackedProductEvent[];
  });

const createSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().trim().min(2).max(200),
  external_reference: optionalText(120),
  classification: classificationSchema,
  priority: prioritySchema.default("media"),
  objective: optionalText(2000),
  owner_id: z.string().uuid().nullable().optional(),
  product_cost_cents: optionalInt,
  packaging_cost_cents: optionalInt,
  taxes_cents: optionalInt,
  other_costs_cents: optionalInt,
  stock_quantity: optionalInt,
  restock_lead_time_days: optionalInt,
  operational_limitations: optionalText(2000),
  notes: optionalText(4000),
});

export const createTrackedProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => createSchema.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;

    // Posição no fim da lista, sem depender de contagem no cliente.
    const { data: last, error: lErr } = await supabase
      .from("project_tracked_products")
      .select("position")
      .eq("project_id", data.project_id)
      .order("position", { ascending: false })
      .limit(1);
    if (lErr) throw new Error(lErr.message);
    const nextPosition = ((last ?? [])[0] as { position?: number } | undefined)?.position;

    const { data: row, error } = await supabase
      .from("project_tracked_products")
      .insert({
        ...data,
        position: typeof nextPosition === "number" ? nextPosition + 1 : 0,
        created_by: context.userId,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as { id: string }).id };
  });

const updateSchema = createSchema
  .omit({ project_id: true })
  .partial()
  .extend({ id: z.string().uuid() });

export const updateTrackedProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => updateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await context.supabase
      .from("project_tracked_products")
      .update(patch as never)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Arquivar/reativar. Não existe DELETE: o banco bloqueia por trigger e a
 * transição gera evento automático na timeline do produto.
 */
export const setTrackedProductStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ id: z.string().uuid(), status: z.enum(["ativo", "arquivado"]) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("project_tracked_products")
      .update({ status: data.status } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addTrackedProductNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        tracked_product_id: z.string().uuid(),
        project_id: z.string().uuid(),
        content: z.string().trim().min(2).max(2000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("project_tracked_product_events")
      .insert({
        tracked_product_id: data.tracked_product_id,
        project_id: data.project_id,
        event_type: "observacao_adicionada",
        title: "Observação adicionada",
        description: data.content,
        actor_id: context.userId,
      } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
