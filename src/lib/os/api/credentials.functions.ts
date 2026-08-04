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
    const { data, error } = await supabaseAdmin
      .from('api_credentials_safe')
      .select(`
        *,
        application:api_applications(display_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
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
