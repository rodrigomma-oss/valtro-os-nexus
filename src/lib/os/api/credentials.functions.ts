import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getCredentials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Manual join to avoid relationship errors between api_credentials_safe and api_applications
    const { data: credentials, error: credentialsError } = await supabaseAdmin
      .from("api_credentials_safe")
      .select("*")
      .order("created_at", { ascending: false });

    if (credentialsError) throw credentialsError;

    const appIds = [
      ...new Set(
        (credentials ?? []).map((c) => c.application_id).filter((id): id is string => !!id),
      ),
    ];
    let appsMap: Record<string, any> = {};

    if (appIds.length > 0) {
      const { data: apps } = await supabaseAdmin
        .from("api_applications")
        .select("id, display_name")
        .in("id", appIds);

      appsMap = (apps || []).reduce((acc, a) => ({ ...acc, [a.id]: a }), {});
    }

    return (credentials ?? []).map((credential) => ({
      ...credential,
      application: credential.application_id ? appsMap[credential.application_id] : null,
    }));
  });

export const createCredentialFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ applicationId: z.string() }))
  .handler(async ({ data, context }) => {
    const { generateCredential } = await import("./services.server");
    return generateCredential(data.applicationId, context.userId);
  });

export const revokeCredentialFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ credentialId: z.string(), reason: z.string() }))
  .handler(async ({ data, context }) => {
    const { revokeCredential } = await import("./services.server");
    return revokeCredential(data.credentialId, data.reason, context.userId);
  });

export const rotateCredentialFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ credentialId: z.string(), applicationId: z.string() }))
  .handler(async ({ data, context }) => {
    const { revokeCredential, generateCredential } = await import("./services.server");

    // Revoga a antiga
    await revokeCredential(data.credentialId, "Rotacionada pelo administrador", context.userId);

    // Cria a nova
    return generateCredential(data.applicationId, context.userId);
  });

export const getAppCredentials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.string())
  .handler(async ({ data: appId, context }) => {
    const { listApplicationCredentials } = await import("./services.server");
    return listApplicationCredentials(appId, context.userId);
  });
