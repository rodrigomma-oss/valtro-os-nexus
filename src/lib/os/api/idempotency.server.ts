import * as crypto from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ApiPipelineError } from "./pipeline.server";

export interface IdempotencyRecord {
  status: 'processing' | 'completed' | 'failed';
  responseStatus?: number;
  responseBody?: any;
  responseHeaders?: any;
}

/**
 * Calcula um hash determinístico para o payload.
 */
export function calculatePayloadHash(body: any): string {
  const content = body === undefined || body === null ? "" : JSON.stringify(body);
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Tenta adquirir ou recuperar um registro de idempotência.
 * Implementa a lógica de concorrência e detecção de conflito.
 */
export async function acquireIdempotency(params: {
  applicationId: string;
  idempotencyKey: string;
  method: string;
  path: string;
  payloadHash: string;
  requestId: string;
}): Promise<IdempotencyRecord | null> {
  const { applicationId, idempotencyKey, method, path, payloadHash, requestId } = params;

  // 1. Validar formato UUID da chave
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(idempotencyKey)) {
    throw new ApiPipelineError("VALIDATION_ERROR", 422, "Chave de idempotência inválida. Deve ser um UUID v4.", {
      "x-idempotency-key": "Formato inválido."
    });
  }

  // 2. Tentar inserir o registro (Atomicidade via DB)
  // Se já existir, a constraint UNIQUE (application_id, idempotency_key) falhará.
  const { data: existing, error: insertError } = await supabaseAdmin
    .from("api_idempotency_keys")
    .insert({
      application_id: applicationId,
      idempotency_key: idempotencyKey,
      method,
      path,
      payload_hash: payloadHash,
      request_id: requestId,
      status: 'processing'
    })
    .select()
    .maybeSingle();

  if (insertError) {
    // 23505 = Unique Violation
    if (insertError.code === "23505") {
      // 3. Registro já existe, buscar para validar conflito ou retornar resultado
      const { data: record, error: selectError } = await supabaseAdmin
        .from("api_idempotency_keys")
        .select("*")
        .eq("application_id", applicationId)
        .eq("idempotency_key", idempotencyKey)
        .single();

      if (selectError || !record) {
        throw new Error("Falha ao recuperar registro de idempotência existente.");
      }

      // 4. Validar se a operação é idêntica (Method + Path + Payload)
      if (record.method !== method || record.path !== path || record.payload_hash !== payloadHash) {
        throw new ApiPipelineError(
          "IDEMPOTENCY_KEY_CONFLICT",
          409,
          "Chave de idempotência já utilizada para uma operação ou payload diferente."
        );
      }

      // 5. Se estiver em processamento, indicar que há outra requisição ativa
      if (record.status === 'processing') {
        throw new ApiPipelineError(
          "PROCESSING",
          409,
          "A operação já está sendo processada. Tente novamente em alguns segundos.",
          undefined,
          { "Retry-After": "5" }
        );
      }

      // 6. Se falhou (5xx), permitimos tentar novamente removendo o registro ou resetando
      // Para o MVP, se falhou a gente deixa tentar de novo limpando o anterior
      if (record.status === 'failed') {
        await supabaseAdmin
          .from("api_idempotency_keys")
          .delete()
          .eq("id", record.id);
        
        // Recursão simples para tentar adquirir novamente após limpeza
        return acquireIdempotency(params);
      }

      // 7. Retornar dados para replay
      return {
        status: record.status,
        responseStatus: record.response_status,
        responseBody: record.response_body,
        responseHeaders: record.response_headers
      };
    }

    throw insertError;
  }

  // Novo registro criado com sucesso
  return null;
}

/**
 * Salva o resultado final da operação para futuros replays.
 */
export async function commitIdempotency(params: {
  applicationId: string;
  idempotencyKey: string;
  status: 'completed' | 'failed';
  responseStatus: number;
  responseBody: any;
  responseHeaders: any;
}) {
  const { applicationId, idempotencyKey, status, responseStatus, responseBody, responseHeaders } = params;

  const { error } = await supabaseAdmin
    .from("api_idempotency_keys")
    .update({
      status,
      response_status: responseStatus,
      response_body: responseBody,
      response_headers: responseHeaders,
      updated_at: new Date().toISOString()
    })
    .eq("application_id", applicationId)
    .eq("idempotency_key", idempotencyKey);

  if (error) {
    console.error("[IDEMPOTENCY_COMMIT_ERROR]", { applicationId, idempotencyKey, error });
  }
}
