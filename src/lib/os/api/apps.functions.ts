import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { 
  createApplication, 
  suspendApplication, 
  revokeApplication, 
  updateConsumerSettings,
  ALLOWED_SCOPES,
  ApiScope
} from "./services.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { API_CAPABILITIES, TechnicalLimitsSchema, FeatureFlagsSchema } from "./types";

export const getApplications = createServerFn({ method: "GET" })
  .handler(async () => {
    // Note: We join with profiles to get creator information since api_applications.created_by 
    // references auth.users which is typically linked to public.profiles by ID.
    const { data, error } = await supabaseAdmin
      .from('api_applications')
      .select(`
        *,
        created_by_user:profiles(full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  });

export const getApplicationById = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { data, error } = await supabaseAdmin
      .from('api_applications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  });

export const createApplicationFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    displayName: z.string().min(3),
    productId: z.string().optional(),
    environment: z.enum(['development', 'staging', 'production']),
    allowedScopes: z.array(z.string())
  }))
  .handler(async ({ data, context }) => {
    const { data: { user } } = await (supabaseAdmin.auth as any).getUser();
    if (!user) throw new Error("Não autorizado");

    return createApplication({
      ...data,
      allowedScopes: data.allowedScopes as ApiScope[],
      userId: user.id
    });
  });

export const updateApplicationFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    id: z.string(),
    displayName: z.string().min(3),
    environment: z.enum(['development', 'staging', 'production']),
    allowedScopes: z.array(z.string())
  }))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from('api_applications')
      .update({
        display_name: data.displayName,
        environment: data.environment,
        allowed_scopes: data.allowedScopes,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.id);

    if (error) throw error;
  });

export const suspendApplicationFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const { data: { user } } = await (supabaseAdmin.auth as any).getUser();
    if (!user) throw new Error("Não autorizado");
    return suspendApplication(data.id, user.id);
  });

export const revokeApplicationFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), reason: z.string() }))
  .handler(async ({ data }) => {
    const { data: { user } } = await (supabaseAdmin.auth as any).getUser();
    if (!user) throw new Error("Não autorizado");
    return revokeApplication(data.id, data.reason, user.id);
  });

export const updateSettingsFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    applicationId: z.string(),
    settings: z.object({
      capabilities: z.array(z.string()).optional(),
      technicalLimits: TechnicalLimitsSchema.optional(),
      featureFlags: FeatureFlagsSchema.optional(),
      adminMessage: z.string().optional()
    })
  }))
  .handler(async ({ data }) => {
    return updateConsumerSettings(data.applicationId, data.settings as any);
  });
