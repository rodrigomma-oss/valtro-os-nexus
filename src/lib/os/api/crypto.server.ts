/**
 * Módulo Criptográfico Server-Only para API v1.
 * Implementa AES-256-GCM para segredos HMAC em repouso.
 */
import * as crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Recomendado para GCM
const AUTH_TAG_LENGTH = 16;
const SECRET_BYTE_LENGTH = 32; // HMAC-SHA256 secret size

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
  version: number;
  masterKeyVersion: string;
}

/**
 * Obtém a chave mestra de criptografia do ambiente.
 */
function getMasterKey(): Buffer {
  const rawKey = process.env.API_MASTER_ENCRYPTION_KEY || process.env.VITE_API_MASTER_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error('API_MASTER_ENCRYPTION_KEY não configurada no ambiente.');
  }

  // A chave deve ter 32 bytes para AES-256
  const key = Buffer.from(rawKey, 'hex');
  if (key.length !== 32) {
    throw new Error('API_MASTER_ENCRYPTION_KEY deve ser uma string hex de 32 bytes (64 caracteres).');
  }
  return key;
}

/**
 * Gera um segredo HMAC aleatório de 32 bytes (CSPRNG).
 */
export function generateHmacSecret(): string {
  return crypto.randomBytes(SECRET_BYTE_LENGTH).toString('hex');
}

/**
 * Criptografa o segredo HMAC usando AES-256-GCM.
 * @param secret Segredo HMAC em texto puro
 * @param aad Dados Adicionais Autenticados (ex: application_id:key_id)
 */
export async function encryptSecret(secret: string, aad: string): Promise<EncryptedPayload> {
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  cipher.setAAD(Buffer.from(aad, 'utf8'));

  const encrypted = Buffer.concat([
    cipher.update(secret, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    version: 1,
    masterKeyVersion: process.env.API_MASTER_KEY_VERSION || 'v1',
  };
}

/**
 * Descriptografa o segredo HMAC para validação.
 */
export async function decryptSecret(payload: EncryptedPayload, aad: string): Promise<string> {
  const masterKey = getMasterKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    masterKey,
    Buffer.from(payload.iv, 'base64'),
    { authTagLength: AUTH_TAG_LENGTH }
  );

  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
  decipher.setAAD(Buffer.from(aad, 'utf8'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Gera um identificador aleatório seguro para client_id ou key_id.
 */
export function generateSecureId(prefix: 'vlt_app_' | 'vlt_key_'): string {
  const bytes = crypto.randomBytes(12); // 12 bytes = 24 caracteres hex
  return `${prefix}${bytes.toString('hex')}`;
}

/**
 * Compara dois buffers ou strings de forma segura contra timing attacks.
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}
