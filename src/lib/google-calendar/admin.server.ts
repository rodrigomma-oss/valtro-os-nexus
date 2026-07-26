/**
 * Sprint 14.1 — Casos de uso administrativos da integração (server-only).
 *
 * Toda operação exige papel `admin`: a integração é uma credencial da
 * empresa, não um recurso por usuário. A verificação usa o cliente do
 * usuário (`has_role`), nunca o service role — decidir permissão com
 * service role seria auto-autorização.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

import { loadIntegration, listCalendars, getAccessToken } from "./client.server";
import {
  buildAuthorizationUrl,
  createNonce,
  resolveRedirectUri,
  revokeToken,
  signState,
  TARGET_CALENDAR_SUMMARY,
} from "./oauth.server";
import { decryptToken } from "./crypto.server";

type UserClient = SupabaseClient<Database>;

export interface CronRunSummary {
  processed: number;
  synced: number;
  removed: number;
  failed: number;
  skipped: string | null;
}

export interface IntegrationStatus {
  connected: boolean;
  status: "conectado" | "desconectado" | "erro" | "nunca_conectado";
  calendar_id: string | null;
  calendar_summary: string | null;
  account_email: string | null;
  connected_at: string | null;
  last_error: string | null;
  target_calendar: string;
  /** Telemetria do agendamento automático (a cada 2 minutos). */
  last_cron_run_at: string | null;
  last_cron_result: CronRunSummary | null;
  worker_running: boolean;
  queue: { pendente: number; sincronizado: number; falha: number; removido: number };
  failures: Array<{
    id: string;
    entity_id: string;
    sync_attempts: number;
    last_error: string | null;
    last_attempt_at: string | null;
  }>;
}

export async function assertAdmin(supabase: UserClient, userId: string): Promise<void> {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Apenas administradores podem gerenciar integrações.");
}

export async function readStatus(supabase: UserClient): Promise<IntegrationStatus> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const integration = await loadIntegration(supabaseAdmin);

  const { data: links } = await supabase
    .from("calendar_sync_links")
    .select("id, entity_id, sync_status, sync_attempts, last_error, last_attempt_at");

  const rows = links ?? [];
  const queue = { pendente: 0, sincronizado: 0, falha: 0, removido: 0 };
  for (const row of rows) {
    const key = row.sync_status as keyof typeof queue;
    if (key in queue) queue[key] += 1;
  }

  return {
    connected: integration?.status === "conectado",
    status: integration ? integration.status : "nunca_conectado",
    calendar_id: integration?.calendar_id ?? null,
    calendar_summary: integration?.calendar_summary ?? null,
    account_email: integration?.google_account_email ?? null,
    connected_at: integration?.connected_at ?? null,
    last_error: integration?.last_error ?? null,
    target_calendar: TARGET_CALENDAR_SUMMARY,
    queue,
    failures: rows
      .filter((r) => r.sync_status === "falha")
      .slice(0, 20)
      .map((r) => ({
        id: r.id,
        entity_id: r.entity_id,
        sync_attempts: r.sync_attempts,
        last_error: r.last_error,
        last_attempt_at: r.last_attempt_at,
      })),
  };
}

export async function startAuthorization(userId: string, origin: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const redirectUri = resolveRedirectUri(origin);
  const nonce = createNonce();

  const { error } = await supabaseAdmin.from("calendar_oauth_states").insert({
    nonce,
    created_by: userId,
    redirect_uri: redirectUri,
    expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  });
  if (error) throw new Error(error.message);

  return buildAuthorizationUrl(redirectUri, signState(nonce));
}

export async function disconnectIntegration(): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const integration = await loadIntegration(supabaseAdmin);
  if (!integration) return;

  // Revogar é best-effort — desconectar no CRM sempre conclui.
  if (integration.refresh_token_ciphertext) {
    try {
      await revokeToken(decryptToken(integration.refresh_token_ciphertext));
    } catch (error) {
      console.error("[google-calendar] revogação falhou", error);
    }
  }

  await supabaseAdmin
    .from("calendar_integrations")
    .update({
      status: "desconectado",
      access_token_ciphertext: null,
      refresh_token_ciphertext: null,
      access_token_expires_at: null,
      calendar_id: null,
      calendar_summary: null,
      granted_scopes: null,
      last_error: null,
      disconnected_at: new Date().toISOString(),
    })
    .eq("id", integration.id);

  // Follow-ups permanecem intactos; apenas a projeção é encerrada.
  await supabaseAdmin
    .from("calendar_sync_links")
    .update({ sync_status: "pendente", sync_attempts: 0, last_error: null })
    .in("sync_status", ["falha"]);
}

export interface AvailableCalendar {
  id: string;
  summary: string;
  selected: boolean;
}

export async function fetchAvailableCalendars(): Promise<AvailableCalendar[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const integration = await loadIntegration(supabaseAdmin);
  if (!integration || integration.status === "desconectado") {
    throw new Error("Conecte uma conta Google antes de listar agendas.");
  }
  const token = await getAccessToken(supabaseAdmin, integration);
  const calendars = await listCalendars(token);
  return calendars.map((c) => ({
    id: c.id,
    summary: c.summary ?? c.id,
    selected: c.id === integration.calendar_id,
  }));
}

export async function selectCalendar(calendarId: string, summary: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const integration = await loadIntegration(supabaseAdmin);
  if (!integration) throw new Error("Integração não encontrada.");

  const changed = integration.calendar_id !== calendarId;
  await supabaseAdmin
    .from("calendar_integrations")
    .update({ calendar_id: calendarId, calendar_summary: summary, last_error: null })
    .eq("id", integration.id);

  if (changed) {
    // Trocar de agenda invalida os ids de evento anteriores.
    await supabaseAdmin
      .from("calendar_sync_links")
      .update({
        sync_status: "pendente",
        external_event_id: null,
        external_html_link: null,
        sync_attempts: 0,
        last_error: null,
        next_attempt_at: new Date().toISOString(),
      })
      .neq("sync_status", "removido");
  }
}

export async function requeueFailures(linkId?: string): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let query = supabaseAdmin
    .from("calendar_sync_links")
    .update({
      sync_status: "pendente",
      sync_attempts: 0,
      last_error: null,
      next_attempt_at: new Date().toISOString(),
    })
    .eq("sync_status", "falha");
  if (linkId) query = query.eq("id", linkId);

  const { data, error } = await query.select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).length;
}
