/**
 * Sprint 14.1 — Camada OAuth do Google Calendar (server-only).
 *
 * Modelo aprovado: agenda única da empresa ("Valtro Labs — CRM").
 * O `calendar_scope = 'empresa'` já está previsto na 14.0, então evoluir
 * para agenda por operador no futuro é apenas criar linhas com
 * `calendar_scope = 'usuario'` — sem refatoração destrutiva.
 *
 * Segurança do fluxo:
 * - `state` = base64url(nonce) + "." + HMAC-SHA256(nonce) assinado com a
 *   chave do servidor. O nonce é persistido com validade curta e consumo
 *   único, então nem um `state` válido pode ser reaproveitado (replay).
 * - Client ID/Secret são lidos de `process.env` dentro dos handlers.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events.owned",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
];

export const TARGET_CALENDAR_SUMMARY = "Valtro Labs — CRM";

const CALLBACK_PATH = "/api/public/google-calendar/callback";

/** Origens registradas no Google Cloud como Authorized redirect URIs. */
const ALLOWED_ORIGINS = [
  "https://valtrolabs.pro",
  "https://www.valtrolabs.pro",
  "https://valtro-vision-forge.lovable.app",
];

const CANONICAL_ORIGIN = "https://valtrolabs.pro";

export function resolveRedirectUri(requestOrigin: string | null | undefined): string {
  const origin = (requestOrigin ?? "").replace(/\/$/, "");
  const base = ALLOWED_ORIGINS.includes(origin) ? origin : CANONICAL_ORIGIN;
  return `${base}${CALLBACK_PATH}`;
}

export function redirectUriOrigin(redirectUri: string): string {
  try {
    return new URL(redirectUri).origin;
  } catch {
    return CANONICAL_ORIGIN;
  }
}

// ---------------------------------------------------------------
// state assinado + nonce
// ---------------------------------------------------------------
function stateKey(): Buffer {
  const raw = process.env.GOOGLE_CALENDAR_TOKEN_KEY;
  if (!raw) throw new Error("GOOGLE_CALENDAR_TOKEN_KEY não está configurado no servidor.");
  return Buffer.from(raw, "utf8");
}

export function createNonce(): string {
  return randomBytes(24).toString("base64url");
}

export function signState(nonce: string): string {
  const sig = createHmac("sha256", stateKey()).update(nonce).digest("base64url");
  return `${nonce}.${sig}`;
}

export function verifyState(state: string): string | null {
  const [nonce, sig] = state.split(".");
  if (!nonce || !sig) return null;
  const expected = createHmac("sha256", stateKey()).update(nonce).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return nonce;
}

// ---------------------------------------------------------------
// URLs e trocas de token
// ---------------------------------------------------------------
export function buildAuthorizationUrl(redirectUri: string, state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID não está configurado no servidor.");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_SCOPES.join(" "));
  // `offline` + `consent` garantem refresh_token mesmo em reconexões.
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  return url.toString();
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type: string;
  id_token?: string;
}

async function tokenRequest(body: Record<string, string>): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Credenciais do Google não estão configuradas no servidor.");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...body, client_id: clientId, client_secret: clientSecret }),
  });

  const text = await res.text();
  if (!res.ok) {
    // Nunca ecoamos client_secret/refresh_token; o corpo do Google traz
    // apenas o código de erro OAuth.
    throw new Error(`Google OAuth falhou [${res.status}]: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text) as GoogleTokenResponse;
}

export function exchangeCodeForTokens(code: string, redirectUri: string) {
  return tokenRequest({ code, redirect_uri: redirectUri, grant_type: "authorization_code" });
}

export function refreshAccessToken(refreshToken: string) {
  return tokenRequest({ refresh_token: refreshToken, grant_type: "refresh_token" });
}

export async function revokeToken(token: string): Promise<void> {
  try {
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
    });
  } catch (error) {
    // Revogação é best-effort: desconectar no CRM nunca pode falhar por
    // indisponibilidade do Google.
    console.error("[google-calendar] falha ao revogar token no Google", error);
  }
}

/** E-mail da conta autorizada, extraído do id_token (sem verificar assinatura: uso apenas informativo). */
export function readEmailFromIdToken(idToken: string | undefined): string | null {
  if (!idToken) return null;
  try {
    const payload = idToken.split(".")[1];
    const json = JSON.parse(Buffer.from(payload, "base64").toString("utf8")) as {
      email?: string;
    };
    return json.email ?? null;
  } catch {
    return null;
  }
}
