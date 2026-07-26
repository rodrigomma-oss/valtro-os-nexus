/**
 * Sprint 14.1 — Cifragem dos tokens do Google.
 *
 * Princípio: nenhum token do Google pode existir em texto claro no banco.
 * Quem lê a tabela (inclusive um operador com acesso ao painel do banco)
 * enxerga apenas um blob opaco. A chave vive somente no ambiente do
 * servidor (`GOOGLE_CALENDAR_TOKEN_KEY`), nunca no bundle do navegador.
 *
 * Formato armazenado: base64( iv(12) | authTag(16) | ciphertext ).
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key(): Buffer {
  const raw = process.env.GOOGLE_CALENDAR_TOKEN_KEY;
  if (!raw) {
    throw new Error("GOOGLE_CALENDAR_TOKEN_KEY não está configurado no servidor.");
  }
  // O secret é gerado como string alfanumérica; derivamos 32 bytes estáveis.
  const buf = Buffer.from(raw, "utf8");
  if (buf.length === 32) return buf;
  const b64 = Buffer.from(raw, "base64");
  if (b64.length === 32) return b64;
  // Fallback determinístico para comprimentos diferentes de 32 bytes.
  const out = Buffer.alloc(32);
  buf.copy(out, 0, 0, Math.min(32, buf.length));
  for (let i = buf.length; i < 32; i += 1) out[i] = buf[i % buf.length] ^ (i + 7);
  return out;
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function decryptToken(stored: string): string {
  const buf = Buffer.from(stored, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
