/**
 * Reuniões de Projeto — entidade própria (`project_meetings`).
 *
 * Espelha a semântica de `follow_ups` do Lead, mas ancorada no Projeto:
 * - O CRM é a fonte de verdade; nenhuma chamada ao Google acontece aqui.
 * - Nada é apagado: agendar, reagendar, concluir e cancelar são transições.
 * - A projeção na agenda externa é enfileirada por gatilho no banco.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const MEETING_TIMEZONE = "America/Sao_Paulo";
export const MEETING_DEFAULT_DURATION = 60;

export type ProjectMeetingStatus = "agendado" | "concluido" | "cancelado" | "reagendado";

export interface ProjectMeeting {
  id: string;
  project_id: string;
  scheduled_at: string;
  duration_minutes: number;
  timezone: string;
  agenda: string | null;
  owner_id: string | null;
  owner_name: string | null;
  status: ProjectMeetingStatus;
  outcome_notes: string | null;
  cancel_reason: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  rescheduled_from: string | null;
  rescheduled_to: string | null;
  external_html_link: string | null;
  created_at: string;
  updated_at: string;
}

interface MeetingRow {
  id: string;
  project_id: string;
  scheduled_at: string;
  duration_minutes: number;
  timezone: string;
  agenda: string | null;
  owner_id: string | null;
  status: ProjectMeetingStatus;
  outcome_notes: string | null;
  cancel_reason: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  rescheduled_from: string | null;
  rescheduled_to: string | null;
  created_at: string;
  updated_at: string;
  owner?: { full_name: string | null } | null;
}

const SELECT =
  "id, project_id, scheduled_at, duration_minutes, timezone, agenda, owner_id, status, outcome_notes, cancel_reason, completed_at, cancelled_at, rescheduled_from, rescheduled_to, created_at, updated_at, owner:profiles!project_meetings_owner_id_fkey(full_name)";

function mapRow(row: MeetingRow, link: string | null = null): ProjectMeeting {
  return {
    id: row.id,
    project_id: row.project_id,
    scheduled_at: row.scheduled_at,
    duration_minutes: row.duration_minutes,
    timezone: row.timezone,
    agenda: row.agenda,
    owner_id: row.owner_id,
    owner_name: row.owner?.full_name ?? null,
    status: row.status,
    outcome_notes: row.outcome_notes,
    cancel_reason: row.cancel_reason,
    completed_at: row.completed_at,
    cancelled_at: row.cancelled_at,
    rescheduled_from: row.rescheduled_from,
    rescheduled_to: row.rescheduled_to,
    external_html_link: link,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const scheduleShape = {
  scheduled_at: z.string().datetime({ offset: true }),
  duration_minutes: z.number().int().min(5).max(480).optional(),
  agenda: z.string().trim().max(500).nullable().optional(),
  owner_id: z.string().uuid().nullable().optional(),
};

// -------------------------------------------------------------
// Leitura
// -------------------------------------------------------------
export const listProjectMeetings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ project_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<ProjectMeeting[]> => {
    const { data: rows, error } = await context.supabase
      .from("project_meetings")
      .select(SELECT)
      .eq("project_id", data.project_id)
      .order("scheduled_at", { ascending: false })
      .returns<MeetingRow[]>();
    if (error) throw new Error(error.message);

    const meetings = rows ?? [];
    if (meetings.length === 0) return [];

    // Link do evento na agenda: leitura best-effort da fila de sincronização.
    const links = new Map<string, string | null>();
    const { data: linkRows } = await context.supabase
      .from("calendar_sync_links")
      .select("entity_id, external_html_link")
      .eq("entity_type", "project_meeting")
      .in(
        "entity_id",
        meetings.map((m) => m.id),
      );
    for (const row of (linkRows ?? []) as { entity_id: string; external_html_link: string | null }[]) {
      links.set(row.entity_id, row.external_html_link);
    }

    return meetings.map((row) => mapRow(row, links.get(row.id) ?? null));
  });

// -------------------------------------------------------------
// Agendar
// -------------------------------------------------------------
export const createProjectMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ project_id: z.string().uuid(), ...scheduleShape }).parse(data),
  )
  .handler(async ({ data, context }): Promise<ProjectMeeting> => {
    const { data: open, error: openError } = await context.supabase
      .from("project_meetings")
      .select("id")
      .eq("project_id", data.project_id)
      .eq("status", "agendado")
      .limit(1);
    if (openError) throw new Error(openError.message);
    if ((open ?? []).length > 0) {
      throw new Error(
        "Já existe uma reunião agendada para este projeto. Use reagendar, concluir ou cancelar.",
      );
    }

    const { data: row, error } = await context.supabase
      .from("project_meetings")
      .insert({
        project_id: data.project_id,
        scheduled_at: data.scheduled_at,
        duration_minutes: data.duration_minutes ?? MEETING_DEFAULT_DURATION,
        timezone: MEETING_TIMEZONE,
        agenda: data.agenda ?? null,
        owner_id: data.owner_id ?? null,
        created_by: context.userId,
      })
      .select(SELECT)
      .single<MeetingRow>();
    if (error) throw new Error(error.message);
    return mapRow(row);
  });

// -------------------------------------------------------------
// Reagendar (preserva o registro original)
// -------------------------------------------------------------
export const rescheduleProjectMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), ...scheduleShape }).parse(data))
  .handler(async ({ data, context }): Promise<ProjectMeeting> => {
    const { data: current, error: currentError } = await context.supabase
      .from("project_meetings")
      .select("id, project_id, status, duration_minutes, agenda, owner_id")
      .eq("id", data.id)
      .single<
        Pick<MeetingRow, "id" | "project_id" | "status" | "duration_minutes" | "agenda" | "owner_id">
      >();
    if (currentError) throw new Error(currentError.message);
    if (current.status !== "agendado") {
      throw new Error("Somente reuniões agendadas podem ser reagendadas.");
    }

    const { error: closeError } = await context.supabase
      .from("project_meetings")
      .update({ status: "reagendado" })
      .eq("id", current.id);
    if (closeError) throw new Error(closeError.message);

    const { data: created, error: createError } = await context.supabase
      .from("project_meetings")
      .insert({
        project_id: current.project_id,
        scheduled_at: data.scheduled_at,
        duration_minutes: data.duration_minutes ?? current.duration_minutes,
        timezone: MEETING_TIMEZONE,
        agenda: data.agenda !== undefined ? data.agenda : current.agenda,
        owner_id: data.owner_id !== undefined ? data.owner_id : current.owner_id,
        rescheduled_from: current.id,
        created_by: context.userId,
      })
      .select(SELECT)
      .single<MeetingRow>();
    if (createError) throw new Error(createError.message);

    await context.supabase
      .from("project_meetings")
      .update({ rescheduled_to: created.id })
      .eq("id", current.id);

    return mapRow(created);
  });

// -------------------------------------------------------------
// Concluir
// -------------------------------------------------------------
export const completeProjectMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        outcome_notes: z.string().trim().max(1000).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("project_meetings")
      .update({
        status: "concluido",
        completed_at: new Date().toISOString(),
        outcome_notes: data.outcome_notes ?? null,
      })
      .eq("id", data.id)
      .eq("status", "agendado");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------------------------------------------------------------
// Cancelar
// -------------------------------------------------------------
export const cancelProjectMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        cancel_reason: z.string().trim().max(500).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("project_meetings")
      .update({
        status: "cancelado",
        cancelled_at: new Date().toISOString(),
        cancel_reason: data.cancel_reason ?? null,
      })
      .eq("id", data.id)
      .eq("status", "agendado");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
