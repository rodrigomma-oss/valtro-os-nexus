/**
 * Sprint 14.1 — Acesso à API do Google Calendar (server-only).
 *
 * Regras invioláveis:
 * - Nada aqui é chamado no caminho crítico de escrita de um follow-up.
 * - Toda falha vira estado na fila (`calendar_sync_links`), nunca exceção
 *   que suba até o CRM.
 * - Tokens são lidos/gravados sempre cifrados.
 */
import { decryptToken, encryptToken } from "./crypto.server";
import { refreshAccessToken } from "./oauth.server";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export interface IntegrationRow {
  id: string;
  calendar_id: string | null;
  calendar_summary: string | null;
  google_account_email: string | null;
  granted_scopes: string | null;
  access_token_ciphertext: string | null;
  refresh_token_ciphertext: string | null;
  access_token_expires_at: string | null;
  status: "conectado" | "desconectado" | "erro";
  last_error: string | null;
  connected_at: string | null;
  updated_at: string;
  /** Telemetria/lease do agendamento automático. */
  worker_running_until: string | null;
  last_cron_run_at: string | null;
  last_cron_result: unknown;
}

export const INTEGRATION_SELECT =
  "id, calendar_id, calendar_summary, google_account_email, granted_scopes, access_token_ciphertext, refresh_token_ciphertext, access_token_expires_at, status, last_error, connected_at, updated_at, worker_running_until, last_cron_run_at, last_cron_result";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

export async function loadIntegration(admin: Admin): Promise<IntegrationRow | null> {
  const { data, error } = await admin
    .from("calendar_integrations")
    .select(INTEGRATION_SELECT)
    .eq("provider", "google")
    .eq("calendar_scope", "empresa")
    .is("calendar_owner_id", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as IntegrationRow | null) ?? null;
}

/**
 * Devolve um access token válido, renovando de forma transparente quando
 * faltarem menos de 90s para expirar.
 */
export async function getAccessToken(admin: Admin, integration: IntegrationRow): Promise<string> {
  const expiresAt = integration.access_token_expires_at
    ? new Date(integration.access_token_expires_at).getTime()
    : 0;

  if (integration.access_token_ciphertext && expiresAt - Date.now() > 90_000) {
    return decryptToken(integration.access_token_ciphertext);
  }

  if (!integration.refresh_token_ciphertext) {
    throw new Error("Integração sem refresh token. Reconecte a conta Google.");
  }

  const refreshed = await refreshAccessToken(decryptToken(integration.refresh_token_ciphertext));
  const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await admin
    .from("calendar_integrations")
    .update({
      access_token_ciphertext: encryptToken(refreshed.access_token),
      access_token_expires_at: newExpiry,
      ...(refreshed.refresh_token
        ? { refresh_token_ciphertext: encryptToken(refreshed.refresh_token) }
        : {}),
      status: "conectado",
      last_error: null,
    })
    .eq("id", integration.id);

  integration.access_token_ciphertext = encryptToken(refreshed.access_token);
  integration.access_token_expires_at = newExpiry;
  return refreshed.access_token;
}

async function callGoogle(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: string }> {
  const res = await fetch(`${CALENDAR_API}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
  });
  return { status: res.status, body: await res.text() };
}

export interface CalendarListEntry {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole: string;
}

export async function listCalendars(accessToken: string): Promise<CalendarListEntry[]> {
  const { status, body } = await callGoogle(
    accessToken,
    "/users/me/calendarList?minAccessRole=writer&maxResults=250",
  );
  if (status !== 200) throw new Error(`Google calendarList [${status}]: ${body.slice(0, 300)}`);
  const parsed = JSON.parse(body) as { items?: CalendarListEntry[] };
  return parsed.items ?? [];
}

export interface GoogleEventBody {
  id?: string;
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  status?: "confirmed" | "cancelled";
}

export interface GoogleEventResult {
  id: string;
  htmlLink: string | null;
}

export async function insertEvent(
  accessToken: string,
  calendarId: string,
  body: GoogleEventBody,
): Promise<GoogleEventResult | "conflict"> {
  const { status, body: raw } = await callGoogle(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    { method: "POST", body: JSON.stringify(body) },
  );
  if (status === 409) return "conflict";
  if (status < 200 || status >= 300) {
    throw new Error(`Google events.insert [${status}]: ${raw.slice(0, 300)}`);
  }
  const parsed = JSON.parse(raw) as { id: string; htmlLink?: string };
  return { id: parsed.id, htmlLink: parsed.htmlLink ?? null };
}

export async function patchEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  body: Partial<GoogleEventBody>,
): Promise<GoogleEventResult | "gone"> {
  const { status, body: raw } = await callGoogle(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
  if (status === 404 || status === 410) return "gone";
  if (status < 200 || status >= 300) {
    throw new Error(`Google events.patch [${status}]: ${raw.slice(0, 300)}`);
  }
  const parsed = JSON.parse(raw) as { id: string; htmlLink?: string };
  return { id: parsed.id, htmlLink: parsed.htmlLink ?? null };
}

export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const { status, body } = await callGoogle(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE" },
  );
  // 404/410 = já removido: remoção é idempotente.
  if (status === 404 || status === 410 || (status >= 200 && status < 300)) return;
  throw new Error(`Google events.delete [${status}]: ${body.slice(0, 300)}`);
}
