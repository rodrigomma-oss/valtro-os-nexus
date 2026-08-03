import * as crypto from 'node:crypto';
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { decryptSecret, EncryptedPayload, secureCompare } from "./crypto.server";
import { createCanonicalRequest } from "./canonical.server";

export interface ApiAuthContext {
  applicationId: string;
  clientId: string;
  productId?: string;
  environment: string;
  credentialId: string;
  keyId: string;
  scopes: string[];
  requestId: string;
  clientRequestId?: string;
  requestTimestamp: string;
  ip?: string;
  userAgent?: string;
}

export interface AuthError {
  code: string;
  message: string;
  status: number;
}

const TIMESTAMP_WINDOW_MS = 15 * 60 * 1000; // 15 minutos

/**
 * Middleware central de autenticação HMAC para API v1.
 */
export async function authenticateRequest(request: Request): Promise<{ context: ApiAuthContext } | { error: AuthError }> {
  const requestId = crypto.randomUUID();
  const timestamp = request.headers.get('x-valtro-timestamp');
  const nonce = request.headers.get('x-valtro-nonce');
  const keyId = request.headers.get('x-valtro-key-id');
  const signature = request.headers.get('x-valtro-signature');
  const clientRequestId = request.headers.get('x-valtro-request-id') || undefined;

  // 1. Validar headers obrigatórios
  if (!timestamp || !nonce || !keyId || !signature) {
    return { 
      error: { 
        code: 'MISSING_HEADERS', 
        message: 'Headers de autenticação ausentes (timestamp, nonce, key-id, signature).', 
        status: 401 
      } 
    };
  }

  // 2. Validar janela de timestamp
  const now = Date.now();
  const requestTs = parseInt(timestamp, 10);
  if (isNaN(requestTs) || Math.abs(now - requestTs) > TIMESTAMP_WINDOW_MS) {
    return { 
      error: { 
        code: 'INVALID_TIMESTAMP', 
        message: 'Timestamp fora da janela permitida ou formato inválido.', 
        status: 401 
      } 
    };
  }

  // 3. Validar formato do nonce
  if (nonce.length < 16 || nonce.length > 64) {
    return { 
      error: { 
        code: 'INVALID_NONCE', 
        message: 'Nonce deve ter entre 16 e 64 caracteres.', 
        status: 401 
      } 
    };
  }

  // 4. Localizar Credencial e Aplicação
  const { data: credential, error: credError } = await (supabaseAdmin
    .from('api_credentials') as any)
    .select(`
      *,
      api_applications (
        id,
        client_id,
        product_id,
        environment,
        status,
        allowed_scopes
      )
    `)
    .eq('key_id', keyId)
    .eq('status', 'active')
    .single();

  if (credError || !credential) {
    return { 
      error: { 
        code: 'INVALID_CREDENTIAL', 
        message: 'Credencial inválida, expirada ou revogada.', 
        status: 401 
      } 
    };
  }

  const app = credential.api_applications;
  if (app.status !== 'active') {
    return { 
      error: { 
        code: 'APPLICATION_SUSPENDED', 
        message: 'Aplicação suspensa ou revogada.', 
        status: 403 
      } 
    };
  }

  // 5. Reconstruir Canonical Request e Validar Assinatura
  try {
    const body = await request.clone().arrayBuffer();
    const url = new URL(request.url);
    
    const canonical = createCanonicalRequest({
      method: request.method,
      path: url.pathname,
      queryString: url.search.substring(1),
      contentType: request.headers.get('content-type') || 'application/json',
      timestamp,
      nonce,
      body: Buffer.from(body)
    });

    // Descriptografar Segredo
    const aad = `${app.id}:${credential.key_id}`;
    const encrypted: EncryptedPayload = {
      ciphertext: credential.encrypted_secret,
      iv: credential.encryption_iv,
      authTag: credential.authentication_tag,
      version: credential.encryption_version,
      masterKeyVersion: credential.master_key_version
    };

    const secret = await decryptSecret(encrypted, aad);

    // Calcular Assinatura Esperada
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(canonical)
      .digest('hex')
      .toLowerCase();

    // Comparação segura
    if (!secureCompare(signature.toLowerCase(), expectedSignature)) {
      return { 
        error: { 
          code: 'INVALID_SIGNATURE', 
          message: 'Assinatura HMAC inválida.', 
          status: 401 
        } 
      };
    }

    // 6. Registrar Nonce (Prevenção de Replay) - Atômico via DB
    const expiresAt = new Date(requestTs + TIMESTAMP_WINDOW_MS).toISOString();
    const { error: nonceError } = await (supabaseAdmin.from('api_request_nonces' as any) as any)
      .insert({
        credential_id: credential.id,
        nonce,
        expires_at: expiresAt
      });

    if (nonceError) {
      // Se for erro de duplicidade (23505), é um ataque de replay
      if ((nonceError as any).code === '23505') {
        return { 
          error: { 
            code: 'REPLAY_ATTACK', 
            message: 'Nonce já utilizado.', 
            status: 401 
          } 
        };
      }
      throw nonceError;
    }

    // 7. Montar Contexto Autenticado (Imutável)
    const context: ApiAuthContext = Object.freeze({
      applicationId: app.id,
      clientId: app.client_id,
      productId: app.product_id,
      environment: app.environment,
      credentialId: credential.id,
      keyId: credential.key_id,
      scopes: app.allowed_scopes || [],
      requestId,
      clientRequestId,
      requestTimestamp: timestamp,
      ip: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    });

    return { context };

  } catch (err) {
    console.error('[API_AUTH_INTERNAL_ERROR]', err);
    return { 
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Erro interno no processamento da autenticação.', 
        status: 500 
      } 
    };
  }
}

/**
 * Valida se o contexto possui o escopo necessário.
 */
export function authorize(context: ApiAuthContext, requiredScope: string): boolean {
  return context.scopes.includes(requiredScope);
}
