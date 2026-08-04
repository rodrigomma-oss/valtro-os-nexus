import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TechnicalLimitsSchema, FeatureFlagsSchema } from "./types";

export const getApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // We use a manual join strategy because api_applications references auth.users(id),
    // and there is no direct foreign key from api_applications to public.profiles.
    const { data: apps, error: appsError } = await supabaseAdmin
      .from("api_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (appsError) throw appsError;

    const creatorIds = [
      ...new Set((apps ?? []).map((app) => app.created_by).filter((id): id is string => !!id)),
    ];

    let profilesMap: Record<string, string> = {};
    if (creatorIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .in("id", creatorIds);

      profilesMap = (profiles || []).reduce((acc, p) => ({ ...acc, [p.id]: p.full_name }), {});
    }

    return (apps ?? []).map((app) => ({
      ...app,
      created_by_user: app.created_by
        ? { full_name: profilesMap[app.created_by] || "Usuário Desconhecido" }
        : null,
    }));
  });

export const getApplicationById = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("api_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  });

export const createApplicationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      displayName: z.string().min(3),
      productId: z.string().optional(),
      environment: z.enum(["development", "staging", "production"]),
      allowedScopes: z.array(z.string()),
    }),
  )
  .handler(async ({ data, context }) => {
    const { createApplication } = await import("./services.server");
    return createApplication({
      ...data,
      allowedScopes: data.allowedScopes as never,
      userId: context.userId,
    });
  });

export const updateApplicationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string(),
      displayName: z.string().min(3),
      environment: z.enum(["development", "staging", "production"]),
      allowedScopes: z.array(z.string()),
    }),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./services.server");
    await assertAdmin(context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("api_applications")
      .update({
        display_name: data.displayName,
        environment: data.environment,
        allowed_scopes: data.allowedScopes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (error) throw error;
  });

export const suspendApplicationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { suspendApplication } = await import("./services.server");
    return suspendApplication(data.id, context.userId);
  });

export const reactivateApplicationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./services.server");
    await assertAdmin(context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("api_applications")
      .update({
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (error) throw error;
  });

export const revokeApplicationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string(), reason: z.string() }))
  .handler(async ({ data, context }) => {
    const { revokeApplication } = await import("./services.server");
    return revokeApplication(data.id, data.reason, context.userId);
  });

export const updateSettingsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      applicationId: z.string(),
      settings: z.object({
        capabilities: z.array(z.string()).optional(),
        technicalLimits: TechnicalLimitsSchema.optional(),
        featureFlags: FeatureFlagsSchema.optional(),
        adminMessage: z.string().optional(),
      }),
    }),
  )
  .handler(async ({ data, context }) => {
    const { updateConsumerSettings } = await import("./services.server");
    return updateConsumerSettings(data.applicationId, data.settings as never, context.userId);
  });
