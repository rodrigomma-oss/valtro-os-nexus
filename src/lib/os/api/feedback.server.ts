import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ApiPipelineError } from "./pipeline.server";

export const ExternalFeedbackCategorySchema = z.enum([
  "feature",
  "ui_improvement",
  "reports",
  "calculator",
  "products",
  "promotions",
  "other",
]);

export const FeedbackApiSchema = z.object({
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
  category: ExternalFeedbackCategorySchema,
  context: z.object({
    plan: z.string().max(100).optional(),
    app_version: z.string().max(50).optional(),
  }).optional(),
});

export type FeedbackApiInput = z.infer<typeof FeedbackApiSchema>;

/**
 * Mapeia a categoria externa para a taxonomia interna do Valtro OS.
 * Taxonomia interna: praise, suggestion, complaint, question, usability, feature_request, pricing, other
 */
function mapCategoryToInternal(external: z.infer<typeof ExternalFeedbackCategorySchema>): string {
  const mapping: Record<z.infer<typeof ExternalFeedbackCategorySchema>, string> = {
    feature: "feature_request",
    ui_improvement: "usability",
    reports: "suggestion",
    calculator: "suggestion",
    products: "suggestion",
    promotions: "suggestion",
    other: "other",
  };
  return mapping[external];
}

/**
 * Persiste um novo feedback originado via API.
 */
export async function createFeedbackFromApi(params: {
  input: FeedbackApiInput;
  applicationId: string;
  saasProductId: string;
  requestId: string;
}) {
  const { input, applicationId, saasProductId, requestId } = params;

  const metadata = {
    actor: input.actor,
    context: input.context,
    via_api: true,
    application_id: applicationId,
  };

  const { data, error } = await supabaseAdmin
    .from("feedback")
    .insert({
      title: input.title,
      description: input.description,
      saas_product_id: saasProductId,
      type: mapCategoryToInternal(input.category),
      status: "new",
      source: "other", // Origem externa genérica
      participant_name: input.contact?.name || null,
      participant_email: input.contact?.email || null,
      request_id: requestId,
      external_reference: input.external_reference,
      metadata: metadata,
      created_by: null, // Origem API não possui usuário OS associado
    .select("id, code, status, created_at")
    .single();

  if (error) {
    console.error("[CREATE_FEEDBACK_API_ERROR]", error);
    throw new ApiPipelineError("INTERNAL_ERROR", 500, "Falha ao criar feedback no domínio.");
  }

  return data;
}
