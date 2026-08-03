import * as crypto from 'node:crypto';

/**
 * Parâmetros para criação do Canonical Request.
 * RFC 3986 compatível para path e query.
 */
export interface CanonicalRequestParams {
  method: string;
  path: string;
  queryString?: string;
  contentType: string;
  timestamp: string;
  nonce: string;
  body: string | Buffer;
}

/**
 * Cria a string canônica para assinatura HMAC.
 * Protocolo: VALTRO-HMAC-SHA256-V1
 */
export function createCanonicalRequest(params: CanonicalRequestParams): string {
  const { method, path, queryString, contentType, timestamp, nonce, body } = params;

  // 1. Método em maiúsculas
  const canonicalMethod = method.toUpperCase();

  // 2. Case do path preservado, garantindo que comece com /
  const canonicalPath = path.startsWith('/') ? path : `/${path}`;

  // 3. Query string ordenada por nome e valor
  let canonicalQueryString = '';
  if (queryString) {
    const searchParams = new URLSearchParams(queryString);
    const keys = Array.from(new Set(searchParams.keys())).sort();
    const parts: string[] = [];
    
    for (const key of keys) {
      const values = searchParams.getAll(key).sort();
      for (const value of values) {
        // encodeURIComponent segue RFC 3986 de forma robusta
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
    }
    canonicalQueryString = parts.join('&');
  }

  // 4. Body SHA-256 (hexadecimal lowercase)
  const bodyBuffer = typeof body === 'string' ? Buffer.from(body, 'utf8') : body;
  const bodyHash = crypto.createHash('sha256').update(bodyBuffer).digest('hex').toLowerCase();

  // 5. Composição final com separação por \n
  return [
    'VALTRO-HMAC-SHA256-V1',
    timestamp,
    nonce,
    canonicalMethod,
    canonicalPath,
    canonicalQueryString,
    contentType.trim().toLowerCase(),
    bodyHash
  ].join('\n');
}
