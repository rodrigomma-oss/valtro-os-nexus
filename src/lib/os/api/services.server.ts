/**
 * Serviços Administrativos Internos da API (Server-Only).
 * Acesso restrito a usuários com papel 'admin'.
 * 
 * SECURITY: Estas funções usam supabaseAdmin e devem ser chamadas
 * apenas em contextos autenticados após verificação de has_role('admin').
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateSecureId, generateHmacSecret, encryptSecret } from "./crypto.server";

export type ApiApplicationEnvironment = 'development' | 'staging' | 'production';

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
  const invalidScopes = allowedScopes.filter(s => !ALLOWED_SCOPES.includes(s as any));
  if (invalidScopes.length > 0) {
    throw new Error(`Escopos inválidos: ${invalidScopes.join(', ')}`);
  }

  const clientId = generateSecureId('vlt_app_');

  const { data, error } = await (supabaseAdmin.from('api_applications') as any)
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
  const { data: app, error: appError } = await (supabaseAdmin.from('api_applications') as any)
    .select('id, client_id')
    .eq('id', applicationId)
    .single();

  if (appError || !app) throw new Error('Aplicação não encontrada.');

  const keyId = generateSecureId('vlt_key_');
  const rawSecret = generateHmacSecret();
  
  // AAD canônico: application_id:key_id
  const aad = `${applicationId}:${keyId}`;
  const encrypted = await encryptSecret(rawSecret, aad);

  const { data: credential, error: credError } = await (supabaseAdmin.from('api_credentials') as any)
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
    id: credential.id,
    key_id: credential.key_id,
    status: credential.status,
    created_at: credential.created_at,
    secret: rawSecret, // RETORNADO APENAS UMA VEZ
  };
}

/**
 * Suspende uma aplicação (bloqueia temporariamente).
 */
export async function suspendApplication(applicationId: string, userId: string) {
  const { error } = await (supabaseAdmin.from('api_applications') as any)
    .update({ 
      status: 'suspended',
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId);

  if (error) throw error;
}

/**
 * Revoga uma aplicação e todas as suas credenciais de forma permanente.
 */
export async function revokeApplication(applicationId: string, reason: string, userId: string) {
  const { error } = await (supabaseAdmin.from('api_applications') as any)
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revocation_reason: reason,
    })
    .eq('id', applicationId);

  if (error) throw error;

  // Revoga todas as credenciais ativas/pendentes
  await (supabaseAdmin.from('api_credentials') as any)
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revocation_reason: `Aplicação revogada: ${reason}`,
    })
    .eq('application_id', applicationId)
    .in('status', ['pending', 'active']);
}

/**
 * Ativa uma credencial pendente.
 */
export async function activateCredential(credentialId: string, userId: string) {
  const { error } = await (supabaseAdmin.from('api_credentials') as any)
    .update({ 
      status: 'active',
      activated_at: new Date().toISOString()
    })
    .eq('id', credentialId);

  if (error) throw error;
}

/**
 * Revoga uma credencial específica de forma permanente.
 */
export async function revokeCredential(credentialId: string, reason: string, userId: string) {
  const { error } = await (supabaseAdmin.from('api_credentials') as any)
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revocation_reason: reason,
    })
    .eq('id', credentialId);

  if (error) throw error;
}

/**
 * Lista credenciais de uma aplicação (sem o segredo).
 */
export async function listApplicationCredentials(applicationId: string) {
  const { data, error } = await (supabaseAdmin.from('api_credentials_safe') as any)
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

