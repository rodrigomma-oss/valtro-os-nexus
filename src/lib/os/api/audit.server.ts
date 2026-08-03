import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ApiAuthContext } from "./auth.server";

export interface AuditLogParams {
  context: ApiAuthContext;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  errorCode?: string;
  errorDetails?: string;
}

/**
 * Registra uma chamada de API para fins de auditoria e compliance.
 * Não armazena dados sensíveis (segredos, assinaturas ou corpos).
 */
export async function logApiRequest(params: AuditLogParams) {
  const { context, method, path, statusCode, durationMs, errorCode } = params;

  try {
    await (supabaseAdmin.from('api_audit_logs') as any).insert({
      application_id: context.applicationId,
      credential_id: context.credentialId,
      product_id: context.productId,
      environment: context.environment,
      method,
      path,
      status_code: statusCode,
      request_id: context.requestId,
      client_request_id: context.clientRequestId,
      ip: context.ip,
      user_agent: context.userAgent,
      scopes: context.scopes,
      error_code: errorCode,
      duration_ms: durationMs
    });
  } catch (err) {
    // Falha silenciosa na auditoria para não interromper a resposta, 
    // mas loga o erro internamente.
    console.error('[API_AUDIT_LOG_ERROR]', err);
  }
}

/**
 * Registra uma tentativa de acesso negado antes da criação do contexto total.
 */
export async function logUnauthorizedAccess(
  method: string, 
  path: string, 
  statusCode: number,
  errorCode: string,
  requestId: string,
  ip?: string
) {
  try {
    await (supabaseAdmin.from('api_audit_logs') as any).insert({
      method,
      path,
      status_code: statusCode,
      error_code: errorCode,
      request_id: requestId,
      ip,
      duration_ms: 0
    });
  } catch (err) {
    console.error('[API_AUDIT_LOG_UNAUTHORIZED_ERROR]', err);
  }
}
