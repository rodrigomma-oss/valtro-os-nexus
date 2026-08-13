/**
 * Sprint 14.1 — Worker da fila `calendar_sync_links`.
 *
 * O CRM é a fonte de verdade: este worker apenas projeta o estado atual dos
 * follow-ups no Google Calendar. Ele é assíncrono e idempotente, então pode
 * ser executado quantas vezes for necessário sem duplicar eventos.
 *
 * Mapeamento de estados:
 *   agendado   → evento criado/atualizado (confirmado)
 *   concluido  → MESMO evento permanece no Google (nunca excluído) e é
 *                atualizado via PATCH: título "✓ Follow-up · {lead}" e
 *                descrição com "Status no CRM: Concluído"
 *   cancelado  → evento removido do Google
 *   reagendado → o evento é herdado pelo follow-up sucessor (mesmo evento
 *                é atualizado); o link antigo apenas encerra como 'removido'
 *
 * Retry: backoff exponencial (1, 2, 4 … até 60 min), no máximo
 * MAX_ATTEMPTS tentativas antes de exigir retry manual.
 */
import {
  deleteEvent,
  getAccessToken,
  insertEvent,
  loadIntegration,
  patchEvent,
  type IntegrationRow,
} from "./client.server";

const MAX_ATTEMPTS = 8;
const BATCH_SIZE = 25;

export interface SyncResult {
  processed: number;
  synced: number;
  removed: number;
  failed: number;
  skipped: string | null;
}

interface LinkRow {
  id: string;
  entity_type: string;
  entity_id: string;
  external_event_id: string | null;
  sync_attempts: number;
  sync_status: string;
}

interface FollowUpRow {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  timezone: string;
  reason: string | null;
  status: "agendado" | "concluido" | "cancelado" | "reagendado";
  outcome_notes: string | null;
  cancel_reason: string | null;
  rescheduled_from: string | null;
  rescheduled_to: string | null;
  lead_id: string;
  lead?: { company_name: string | null; contact_name: string | null } | null;
}

interface ProjectMeetingRow {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  timezone: string;
  agenda: string | null;
  status: "agendado" | "concluido" | "cancelado" | "reagendado";
  outcome_notes: string | null;
  cancel_reason: string | null;
  rescheduled_from: string | null;
  rescheduled_to: string | null;
  project_id: string;
  project?: {
    name: string | null;
    code: string | null;
    client?: { company_name: string | null } | null;
  } | null;
}

/**
 * Recorte normalizado usado pela projeção: o worker só precisa do estado da
 * transição e do corpo do evento, independentemente da entidade de origem.
 */
interface SyncEntity {
  id: string;
  status: "agendado" | "concluido" | "cancelado" | "reagendado";
  rescheduled_from: string | null;
  rescheduled_to: string | null;
  event: {
    summary: string;
    description: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    status: "confirmed";
  };
}

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

/** Id determinístico no Google (charset base32hex) derivado da entidade. */
function deterministicEventId(entityId: string): string {
  return `vl${entityId.replace(/-/g, "").toLowerCase()}`;
}

function backoffMinutes(attempts: number): number {
  return Math.min(2 ** attempts, 60);
}

function window(scheduledAt: string, durationMinutes: number, timezone: string) {
  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return {
    start: { dateTime: start.toISOString(), timeZone: timezone },
    end: { dateTime: end.toISOString(), timeZone: timezone },
  };
}

function buildEvent(fu: FollowUpRow, crmOrigin: string) {
  const who = fu.lead?.company_name || fu.lead?.contact_name || "Lead";
  const done = fu.status === "concluido";

  const lines = [
    `Status no CRM: ${done ? "Concluído" : "Agendado"}`,
    fu.reason ? `Motivo: ${fu.reason}` : null,
    done && fu.outcome_notes ? `Resultado: ${fu.outcome_notes}` : null,
    `Lead no CRM: ${crmOrigin}/os/comercial/leads/${fu.lead_id}`,
    "",
    "Evento gerado pelo CRM Valtro Labs. O CRM é a fonte de verdade — edite o follow-up no CRM.",
  ].filter(Boolean) as string[];


  return {
    summary: `${done ? "✓ " : ""}Follow-up · ${who}`,
    description: lines.join("\n"),
    ...window(fu.scheduled_at, fu.duration_minutes, fu.timezone),
    status: "confirmed" as const,
  };
}

function buildMeetingEvent(mt: ProjectMeetingRow, crmOrigin: string) {
  const who =
    mt.project?.client?.company_name || mt.project?.name || mt.project?.code || "Projeto";
  const done = mt.status === "concluido";

  const lines = [
    `Status no CRM: ${done ? "Concluída" : "Agendada"}`,
    mt.project?.name ? `Projeto: ${mt.project.name}` : null,
    mt.agenda ? `Pauta: ${mt.agenda}` : null,
    done && mt.outcome_notes ? `Resultado: ${mt.outcome_notes}` : null,
    `Projeto no CRM: ${crmOrigin}/os/comercial/projetos/${mt.project_id}`,
    "",
    "Evento gerado pelo CRM Valtro Labs. O CRM é a fonte de verdade — edite a reunião no CRM.",
  ].filter(Boolean) as string[];

  return {
    summary: `${done ? "✓ " : ""}Reunião · ${who}`,
    description: lines.join("\n"),
    ...window(mt.scheduled_at, mt.duration_minutes, mt.timezone),
    status: "confirmed" as const,
  };
}

/** Carrega a entidade do link e normaliza para a projeção. */
async function loadEntity(
  admin: Admin,
  link: LinkRow,
  crmOrigin: string,
): Promise<SyncEntity | null> {
  if (link.entity_type === "project_meeting") {
    const { data, error } = await admin
      .from("project_meetings")
      .select(
        "id, scheduled_at, duration_minutes, timezone, agenda, status, outcome_notes, cancel_reason, rescheduled_from, rescheduled_to, project_id, project:projects!project_meetings_project_id_fkey(name, code, client:clients!projects_client_id_fkey(company_name))",
      )
      .eq("id", link.entity_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const row = data as unknown as ProjectMeetingRow;
    return {
      id: row.id,
      status: row.status,
      rescheduled_from: row.rescheduled_from,
      rescheduled_to: row.rescheduled_to,
      event: buildMeetingEvent(row, crmOrigin),
    };
  }

  const { data, error } = await admin
    .from("follow_ups")
    .select(
      "id, scheduled_at, duration_minutes, timezone, reason, status, outcome_notes, cancel_reason, rescheduled_from, rescheduled_to, lead_id, lead:leads!follow_ups_lead_id_fkey(company_name, contact_name)",
    )
    .eq("id", link.entity_id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as unknown as FollowUpRow;
  return {
    id: row.id,
    status: row.status,
    rescheduled_from: row.rescheduled_from,
    rescheduled_to: row.rescheduled_to,
    event: buildEvent(row, crmOrigin),
  };
}


async function markFailure(admin: Admin, link: LinkRow, message: string) {
  const attempts = link.sync_attempts + 1;
  await admin
    .from("calendar_sync_links")
    .update({
      sync_status: "falha",
      sync_attempts: attempts,
      last_error: message.slice(0, 500),
      last_attempt_at: new Date().toISOString(),
      next_attempt_at: new Date(
        Date.now() + (attempts >= MAX_ATTEMPTS ? 24 * 60 : backoffMinutes(attempts)) * 60_000,
      ).toISOString(),
    })
    .eq("id", link.id);
}

async function processLink(
  admin: Admin,
  integration: IntegrationRow,
  accessToken: string,
  link: LinkRow,
  crmOrigin: string,
): Promise<"synced" | "removed"> {
  const calendarId = integration.calendar_id!;

  const entity = await loadEntity(admin, link, crmOrigin);

  const now = new Date().toISOString();

  // Entidade removida do CRM → remove o evento e encerra o link.
  if (!entity) {
    if (link.external_event_id) await deleteEvent(accessToken, calendarId, link.external_event_id);
    await admin
      .from("calendar_sync_links")
      .update({ sync_status: "removido", last_error: null, last_synced_at: now, last_attempt_at: now })
      .eq("id", link.id);
    return "removed";
  }

  // ---- Encerramento: cancelado, ou reagendado com sucessor ----
  if (entity.status === "cancelado" || entity.status === "reagendado") {
    const transfersEvent = entity.status === "reagendado" && entity.rescheduled_to !== null;
    if (link.external_event_id && !transfersEvent) {
      await deleteEvent(accessToken, calendarId, link.external_event_id);
    }
    await admin
      .from("calendar_sync_links")
      .update({
        sync_status: "removido",
        external_event_id: transfersEvent ? link.external_event_id : null,
        last_error: null,
        last_synced_at: now,
        last_attempt_at: now,
        sync_attempts: 0,
      })
      .eq("id", link.id);
    return "removed";
  }

  // ---- Herança do evento em reagendamentos (mesmo evento é atualizado) ----
  let eventId = link.external_event_id;
  if (!eventId && entity.rescheduled_from) {
    const { data: parent } = await admin
      .from("calendar_sync_links")
      .select("external_event_id")
      .eq("entity_type", link.entity_type)
      .eq("entity_id", entity.rescheduled_from)
      .maybeSingle();
    eventId = (parent as { external_event_id: string | null } | null)?.external_event_id ?? null;
  }

  const followUp = entity;
  const body = entity.event;

  let result: { id: string; htmlLink: string | null };

  if (eventId) {
    const patched = await patchEvent(accessToken, calendarId, eventId, body);
    result =
      patched === "gone"
        ? await (async () => {
            const created = await insertEvent(accessToken, calendarId, {
              ...body,
              id: deterministicEventId(followUp.id),
            });
            return created === "conflict"
              ? { id: deterministicEventId(followUp.id), htmlLink: null }
              : created;
          })()
        : patched;
  } else {
    const wanted = deterministicEventId(followUp.id);
    const created = await insertEvent(accessToken, calendarId, { ...body, id: wanted });
    if (created === "conflict") {
      // Evento já existe (execução anterior): apenas reconcilia.
      const patched = await patchEvent(accessToken, calendarId, wanted, body);
      result = patched === "gone" ? { id: wanted, htmlLink: null } : patched;
    } else {
      result = created;
    }
  }

  await admin
    .from("calendar_sync_links")
    .update({
      sync_status: "sincronizado",
      calendar_id: calendarId,
      external_event_id: result.id,
      external_html_link: result.htmlLink,
      last_error: null,
      last_synced_at: now,
      last_attempt_at: now,
      sync_attempts: 0,
      next_attempt_at: now,
    })
    .eq("id", link.id);

  return "synced";
}

/**
 * Processa a fila. Nunca lança: devolve sempre um resumo, porque este worker
 * é disparado em paralelo às ações do CRM e não pode quebrar a interface.
 */
export async function runCalendarSyncWorker(crmOrigin: string): Promise<SyncResult> {
  const empty: SyncResult = { processed: 0, synced: 0, removed: 0, failed: 0, skipped: null };
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");

  let integration: IntegrationRow | null;
  try {
    integration = await loadIntegration(admin);
  } catch (error) {
    return { ...empty, skipped: (error as Error).message };
  }

  if (!integration || integration.status !== "conectado") {
    return { ...empty, skipped: "Integração com o Google Calendar não está conectada." };
  }
  if (!integration.calendar_id) {
    return { ...empty, skipped: "Nenhuma agenda selecionada para a integração." };
  }

  const { data: links, error } = await admin
    .from("calendar_sync_links")
    .select("id, entity_id, external_event_id, sync_attempts, sync_status")
    .in("sync_status", ["pendente", "falha"])
    .lte("next_attempt_at", new Date().toISOString())
    .lt("sync_attempts", MAX_ATTEMPTS)
    .order("next_attempt_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) return { ...empty, skipped: error.message };

  const rows = (links ?? []) as LinkRow[];
  if (rows.length === 0) return empty;

  let accessToken: string;
  try {
    accessToken = await getAccessToken(admin, integration);
  } catch (err) {
    const message = (err as Error).message;
    await admin
      .from("calendar_integrations")
      .update({ status: "erro", last_error: message.slice(0, 500) })
      .eq("id", integration.id);
    return { ...empty, skipped: message };
  }

  const result: SyncResult = { ...empty };
  for (const link of rows) {
    result.processed += 1;
    try {
      const outcome = await processLink(admin, integration, accessToken, link, crmOrigin);
      if (outcome === "synced") result.synced += 1;
      else result.removed += 1;
    } catch (err) {
      result.failed += 1;
      const message = (err as Error).message;
      console.error("[google-calendar] falha ao sincronizar link", link.id, message);
      await markFailure(admin, link, message);
    }
  }

  return result;
}
