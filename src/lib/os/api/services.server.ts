/**
 * Serviços Administrativos Internos da API (Server-Only).
 * Acesso restrito a usuários com papel 'admin'.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateSecureId, generateHmacSecret, encryptSecret, decryptSecret } from "./crypto.server";

export type ApiApplicationEnvironment = 'development' | 'staging' | 'production';
export type ApiApplicationStatus = 'active' | 'suspended' | 'revoked';

export const ALLOWED_SCOPES = [
  'support:tickets:create',
  'support:tickets:read',
  'support:bugs:create',
  'support:feedback:create',
  'support:suggestions:create',
  'support:attachments:create',
] as const;

export type ApiScope = typeof ALLOWED_SCOPES[number];

interface CreateAppParams {
  displayName: string;
  productId?: string;
  environment: ApiApplicationEnvironment;
  allowedScopes: ApiScope[];
  userId: string;
}

/**
 * Cria uma nova aplicação cliente.
 */
export async function createApplication(params: CreateAppParams) {
  const { displayName, productId, environment, allowedScopes, userId } = params;

  // Valida escopos
  const invalidScopes = allowedScopes.filter(s => !ALLOWED_SCOPES.includes(s));
  if (invalidScopes.length > 0) {
    throw new Error(`Escopos inválidos: ${invalidScopes.join(', ')}`);
  }

  const clientId = generateSecureId('vlt_app_');

  const { data, error } = await supabaseAdmin
    .from('api_applications')
    .insert({
      client_id: clientId,
      display_name: displayName,
      product_id: productId,
      environment,
      allowed_scopes: allowedScopes,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Gera uma nova credencial para uma aplicação.
 * O segredo original é retornado apenas uma vez aqui.
 */
export async function generateCredential(applicationId: string, userId: string) {
  const { data: app, error: appError } = await supabaseAdmin
    .from('api_applications')
    .select('id, client_id')
    .eq('id', applicationId)
    .single();

  if (appError || !app) throw new Error('Aplicação não encontrada.');

  const keyId = generateSecureId('vlt_key_');
  const rawSecret = generateHmacSecret();
  
  // AAD canônico: application_id:key_id
  const aad = `${applicationId}:${keyId}`;
  const encrypted = await encryptSecret(rawSecret, aad);

  const { data: credential, error: credError } = await supabaseAdmin
    .from('api_credentials')
    .insert({
      application_id: applicationId,
      key_id: keyId,
      encrypted_secret: encrypted.ciphertext,
      encryption_iv: encrypted.iv,
      authentication_tag: encrypted.authTag,
      encryption_version: encrypted.version,
      master_key_version: encrypted.masterKeyVersion,
      status: 'active', // Ativa por padrão na criação interna
      activated_at: new Date().toISOString(),
      created_by: userId,
    })
    .select('id, key_id, status, created_at')
    .single();

  if (credError) throw credError;

  return {
    ...credential,
    secret: rawSecret, // RETORNADO APENAS UMA VEZ
  };
}

/**
 * Revoga uma aplicação e todas as suas credenciais.
 */
export async function revokeApplication(applicationId: string, reason: string, userId: string) {
  const { error } = await supabaseAdmin
    .from('api_applications')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revocation_reason: reason,
    })
    .eq('id', applicationId);

  if (error) throw error;

  // Revoga todas as credenciais ativas
  await supabaseAdmin
    .from('api_credentials')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revocation_reason: `Aplicação revogada: ${reason}`,
    })
    .eq('application_id', applicationId)
    .in('status', ['pending', 'active']);
}

/**
 * Revoga uma credencial específica.
 */
export async function revokeCredential(credentialId: string, reason: string, userId: string) {
  const { error } = await supabaseAdmin
    .from('api_credentials')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revocation_reason: reason,
    })
    .eq('id', credentialId);

  if (error) throw error;
}
