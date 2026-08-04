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
    // We use a manual join strategy because api_applications references auth.users(id),
    // and there is no direct foreign key from api_applications to public.profiles.
    const { data: apps, error: appsError } = await supabaseAdmin
      .from('api_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (appsError) throw appsError;

    // Fetch creators profiles separately to avoid invalid relationship join errors
    const creatorIds = [...new Set(apps.map(app => app.created_by).filter((id): id is string => !!id))];
    
    let profilesMap: Record<string, string> = {};
    if (creatorIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .in('id', creatorIds);
      
      profilesMap = (profiles || []).reduce((acc, p) => ({ ...acc, [p.id]: p.full_name }), {});
    }

    return apps.map(app => ({
      ...app,
      created_by_user: app.created_by ? { full_name: profilesMap[app.created_by] || 'Usuário Desconhecido' } : null
    }));
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

export const reactivateApplicationFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const { data: { user } } = await (supabaseAdmin.auth as any).getUser();
    if (!user) throw new Error("Não autorizado");
    
    const { error } = await supabaseAdmin
      .from('api_applications')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id);

    if (error) throw error;
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
