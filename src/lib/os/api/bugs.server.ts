import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ApiPipelineError } from "./pipeline.server";

export const ExternalBugCategorySchema = z.enum([
  "calculator",
  "products",
  "promotions",
  "login",
  "signup",
  "mobile",
  "other",
]);

export const BugApiSchema = z.object({
  external_reference: z.string().uuid(),
  actor: z.object({
    source: z.literal("valtro-pricing"),
    external_user_id: z.string().uuid(),
  }),
  contact: z.object({
    name: z.string().max(100).optional(),
    email: z.string().email().max(255).optional(),
  }).optional(),
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(5000),
  category: ExternalBugCategorySchema,
  context: z.object({
    route: z.string().max(1024).optional(),
    user_agent: z.string().max(1024).optional(),
    viewport: z.object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }).optional(),
    plan: z.string().max(100).optional(),
    app_version: z.string().max(50).optional(),
  }).optional(),
});

export type BugApiInput = z.infer<typeof BugApiSchema>;

/**
 * Mapeia a categoria externa para a taxonomia interna do Valtro OS.
 */
function mapCategoryToInternal(external: z.infer<typeof ExternalBugCategorySchema>): string {
  const mapping: Record<z.infer<typeof ExternalBugCategorySchema>, string> = {
    calculator: "backend",
    products: "backend",
    promotions: "backend",
    login: "security",
    signup: "security",
    mobile: "frontend",
    other: "other",
  };
  return mapping[external];
}

/**
 * Persiste um novo bug originado via API.
 */
export async function createBugFromApi(params: {
  input: BugApiInput;
  applicationId: string;
  saasProductId: string;
  requestId: string;
}) {
  const { input, applicationId, saasProductId, requestId } = params;

  // Persistência da Identidade Externa:
  // Usamos 'metadata' para armazenar o contexto do ator e contato,
  // e 'external_reference' para o ID único da origem.
  const metadata = {
    actor: input.actor,
    contact: input.contact,
    context: input.context,
    via_api: true,
    application_id: applicationId,
  };

  const { data, error } = await supabaseAdmin
    .from("bugs")
    .insert({
      title: input.title,
      description: input.description,
      saas_product_id: saasProductId,
      category: mapCategoryToInternal(input.category),
      severity: "normal",
      status: "new",
      environment: "production",
      request_id: requestId,
      metadata: metadata,
      // O campo reported_by interno fica nulo ou associado a um 'API System User' se existisse.
      // Aqui mantemos nulo para indicar origem externa via API sem usuário OS.
    } as any)
    .select("id, code, status, created_at")
    .single();

  if (error) {
    console.error("[CREATE_BUG_API_ERROR]", error);
    throw new ApiPipelineError("INTERNAL_ERROR", 500, "Falha ao criar bug no domínio.");
  }

  return data;
}
