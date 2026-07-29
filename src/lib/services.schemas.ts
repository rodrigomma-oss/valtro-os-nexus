/**
 * Sprint 15.2.3C — Schemas de entrada do catálogo comercial.
 *
 * Mantidos fora de `services.functions.ts` para que o módulo de server
 * functions permaneça um wrapper fino (regra de code-splitting do stack).
 */
import { z } from "zod";

const limitSchema = z.number().int().min(0).nullable().optional();

export const serviceInputSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(2).max(60),
  name: z.string().trim().min(2).max(160),
  category: z.string().min(1),
  description: z.string().trim().max(2000).nullable(),
  objective: z.string().trim().max(2000).nullable(),
  pricing_mode: z.enum(["fixo", "sob_consulta"]),
  default_price_cents: z.number().int().min(0).nullable(),
  billing_type: z.enum(["pontual", "recorrente"]),
  billing_interval: z.enum(["monthly"]).nullable(),
  offer_type: z.enum(["principal", "complementar", "recorrente"]),
  origin_service_id: z.string().uuid().nullable(),
  onboarding_template_key: z.string().trim().max(120).nullable(),
  sort_order: z.number().int().min(0).max(9999),
  active: z.boolean(),
  default_limits: z.object({
    max_products: limitSchema,
    max_campaigns: limitSchema,
    max_users: limitSchema,
  }),
});

export type ServiceInput = z.infer<typeof serviceInputSchema>;
