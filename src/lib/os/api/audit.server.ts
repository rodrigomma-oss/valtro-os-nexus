import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ApiAuthContext } from "./auth.server";

export interface AuditLogParams {
  context: ApiAuthContext;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  errorCode?: string;
}

export interface UnauthenticatedAuditLogParams {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  requestId: string;
  errorCode?: string;
  clientRequestId?: string;
  ip?: string;
  userAgent?: string;
}

/**
 * Registra uma chamada de API para fins de auditoria e compliance.
 * Não armazena dados sensíveis (segredos, assinaturas ou corpos).
 */
export async function logApiRequest(params: AuditLogParams) {
  const { context, method, path, statusCode, durationMs, errorCode } = params;

  try {
    const { error } = await supabaseAdmin.from("api_audit_logs").insert({
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
      scopes: [...context.scopes],
      error_code: errorCode,
      duration_ms: durationMs,
    });
    if (error) throw error;
  } catch (err) {
    // Falha silenciosa na auditoria para não interromper a resposta,
    // mas loga o erro internamente.
    console.error("[API_AUDIT_LOG_ERROR]", err);
  }
}

/**
 * Registra uma requisição sem contexto autenticado, inclusive acessos negados.
 */
export async function logUnauthenticatedApiRequest(params: UnauthenticatedAuditLogParams) {
  try {
    const { error } = await supabaseAdmin.from("api_audit_logs").insert({
      method: params.method,
      path: params.path,
      status_code: params.statusCode,
      error_code: params.errorCode,
      request_id: params.requestId,
      client_request_id: params.clientRequestId,
      ip: params.ip,
      user_agent: params.userAgent,
      duration_ms: params.durationMs,
    });
    if (error) throw error;
  } catch (err) {
    console.error("[API_AUDIT_LOG_UNAUTHENTICATED_ERROR]", err);
  }
}
