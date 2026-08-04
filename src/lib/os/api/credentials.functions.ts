import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { 
  generateCredential, 
  revokeCredential, 
  listApplicationCredentials 
} from "./services.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getCredentials = createServerFn({ method: "GET" })
  .handler(async () => {
    // Manual join to avoid relationship errors between api_credentials_safe and api_applications
    const { data: credentials, error: credentialsError } = await supabaseAdmin
      .from('api_credentials_safe')
      .select('*')
      .order('created_at', { ascending: false });

    if (credentialsError) throw credentialsError;

    // Fetch associated applications
    const appIds = [...new Set(credentials.map(c => c.application_id).filter((id): id is string => !!id))];
    let appsMap: Record<string, any> = {};

    if (appIds.length > 0) {
      const { data: apps } = await supabaseAdmin
        .from('api_applications')
        .select('id, display_name')
        .in('id', appIds);

      appsMap = (apps || []).reduce((acc, a) => ({ ...acc, [a.id]: a }), {});
    }

    return credentials.map(credential => ({
      ...credential,
      application: credential.application_id ? appsMap[credential.application_id] : null
    }));
  });

export const createCredentialFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ applicationId: z.string() }))
  .handler(async ({ data }) => {
    const { data: { user } } = await (supabaseAdmin.auth as any).getUser();
    if (!user) throw new Error("Não autorizado");
    return generateCredential(data.applicationId, user.id);
  });

export const revokeCredentialFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ credentialId: z.string(), reason: z.string() }))
  .handler(async ({ data }) => {
    const { data: { user } } = await (supabaseAdmin.auth as any).getUser();
    if (!user) throw new Error("Não autorizado");
    return revokeCredential(data.credentialId, data.reason, user.id);
  });

export const rotateCredentialFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ credentialId: z.string(), applicationId: z.string() }))
  .handler(async ({ data }) => {
    const { data: { user } } = await (supabaseAdmin.auth as any).getUser();
    if (!user) throw new Error("Não autorizado");
    
    // Revoga a antiga
    await revokeCredential(data.credentialId, "Rotacionada pelo administrador", user.id);
    
    // Cria a nova
    return generateCredential(data.applicationId, user.id);
  });

export const getAppCredentials = createServerFn({ method: "GET" })
  .inputValidator(z.string())
  .handler(async ({ data: appId }) => {
    return listApplicationCredentials(appId);
  });
