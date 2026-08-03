/**
 * Serviços Administrativos Internos da API (Server-Only).
 * Acesso restrito a usuários com papel 'admin' e MFA AAL2.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateSecureId, generateHmacSecret, encryptSecret } from "./crypto.server";
import { 
  ApiCapability, 
  ApiVersionStatus, 
  TechnicalLimits, 
  FeatureFlags,
  API_CAPABILITIES,
  API_VERSION_STATUS 
} from "./types";

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

/**
 * Garante que o usuário tem papel admin e nível de autenticação AAL2.
 */
async function enforceAdminAAL2() {
  const { data: { session }, error } = await (supabaseAdmin.auth as any).getSession();
  if (error || !session) throw new Error('Não autenticado.');
  
  const { data: roleData } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .eq('role', 'admin')
    .single();

  if (!roleData) throw new Error('Acesso negado: Administradores apenas.');
  
  if (session.user.app_metadata?.aal !== 'aal2') {
    // Nota: Em desenvolvimento/preview o Lovable pode não injetar AAL2 por padrão.
    // Em produção, isso é mandatório.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MFA AAL2 exigido para operações administrativas de API.');
    }
  }
}

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
  await enforceAdminAAL2();
  const { displayName, productId, environment, allowedScopes, userId } = params;

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
 */
export async function generateCredential(applicationId: string, userId: string) {
  await enforceAdminAAL2();
  const { data: app, error: appError } = await (supabaseAdmin.from('api_applications') as any)
    .select('id, client_id')
    .eq('id', applicationId)
    .single();

  if (appError || !app) throw new Error('Aplicação não encontrada.');

  const keyId = generateSecureId('vlt_key_');
  const rawSecret = generateHmacSecret();
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
      status: 'active',
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
    secret: rawSecret,
  };
}

/**
 * Atualiza configurações do consumidor.
 */
export async function updateConsumerSettings(
  applicationId: string, 
  settings: {
    capabilities?: ApiCapability[];
    featureFlags?: FeatureFlags;
    technicalLimits?: TechnicalLimits;
    minApiVersionId?: string;
    maxApiVersionId?: string;
    preferredApiVersionId?: string;
    adminMessage?: string;
  }
) {
  await enforceAdminAAL2();
  
  if (settings.capabilities) {
    const invalid = settings.capabilities.filter(c => !API_CAPABILITIES.includes(c));
    if (invalid.length > 0) throw new Error(`Capacidades inválidas: ${invalid.join(', ')}`);
  }

  const { error } = await (supabaseAdmin.from('api_applications') as any)
    .update({
      capabilities: settings.capabilities,
      feature_flags: settings.featureFlags,
      technical_limits: settings.technicalLimits,
      min_api_version_id: settings.minApiVersionId,
      max_api_version_id: settings.maxApiVersionId,
      preferred_api_version_id: settings.preferredApiVersionId,
      admin_message: settings.adminMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId);

  if (error) throw error;
}

/**
 * Suspende uma aplicação.
 */
export async function suspendApplication(applicationId: string, userId: string) {
  await enforceAdminAAL2();
  const { error } = await (supabaseAdmin.from('api_applications') as any)
    .update({ 
      status: 'suspended',
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId);

  if (error) throw error;
}

/**
 * Revoga uma aplicação permanentemente.
 */
export async function revokeApplication(applicationId: string, reason: string, userId: string) {
  await enforceAdminAAL2();
  const { error } = await (supabaseAdmin.from('api_applications') as any)
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revocation_reason: reason,
    })
    .eq('id', applicationId);

  if (error) throw error;

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
 * Revoga uma credencial específica.
 */
export async function revokeCredential(credentialId: string, reason: string, userId: string) {
  await enforceAdminAAL2();
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
  await enforceAdminAAL2();
  const { data, error } = await (supabaseAdmin.from('api_credentials_safe') as any)
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}


