/**
 * Sprint 14.0 — Follow-ups como entidade própria.
 *
 * Princípios:
 * - O CRM é a fonte de verdade. Nenhuma chamada externa é feita aqui.
 * - Criar, reagendar, concluir e cancelar são operações distintas.
 * - O histórico é preservado: nada é apagado, apenas transicionado de status.
 * - A projeção para agenda externa é registrada em `calendar_sync_links`
 *   por gatilho no banco (fila), nunca de forma síncrona.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";
export const DEFAULT_DURATION_MINUTES = 30;

export type FollowUpStatus = "agendado" | "concluido" | "cancelado" | "reagendado";

export interface FollowUp {
  id: string;
  lead_id: string;
  scheduled_at: string;
  duration_minutes: number;
  timezone: string;
  reason: string | null;
  owner_id: string | null;
  owner_name: string | null;
  status: FollowUpStatus;
  outcome_notes: string | null;
  cancel_reason: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  rescheduled_from: string | null;
  rescheduled_to: string | null;
  created_at: string;
  updated_at: string;
}

interface FollowUpRow {
  id: string;
  lead_id: string;
  scheduled_at: string;
  duration_minutes: number;
  timezone: string;
  reason: string | null;
  owner_id: string | null;
  status: FollowUpStatus;
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
  "id, lead_id, scheduled_at, duration_minutes, timezone, reason, owner_id, status, outcome_notes, cancel_reason, completed_at, cancelled_at, rescheduled_from, rescheduled_to, created_at, updated_at, owner:profiles!follow_ups_owner_id_fkey(full_name)";

function mapRow(row: FollowUpRow): FollowUp {
  return {
    id: row.id,
    lead_id: row.lead_id,
    scheduled_at: row.scheduled_at,
    duration_minutes: row.duration_minutes,
    timezone: row.timezone,
    reason: row.reason,
    owner_id: row.owner_id,
    owner_name: row.owner?.full_name ?? null,
    status: row.status,
    outcome_notes: row.outcome_notes,
    cancel_reason: row.cancel_reason,
    completed_at: row.completed_at,
    cancelled_at: row.cancelled_at,
    rescheduled_from: row.rescheduled_from,
    rescheduled_to: row.rescheduled_to,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const scheduleShape = {
  scheduled_at: z.string().datetime({ offset: true }),
  duration_minutes: z.number().int().min(5).max(480).optional(),
  reason: z.string().trim().max(500).nullable().optional(),
  owner_id: z.string().uuid().nullable().optional(),
};

// -------------------------------------------------------------
// Leitura
// -------------------------------------------------------------
export const listLeadFollowUps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ lead_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<FollowUp[]> => {
    const { data: rows, error } = await context.supabase
      .from("follow_ups")
      .select(SELECT)
      .eq("lead_id", data.lead_id)
      .order("scheduled_at", { ascending: false })
      .returns<FollowUpRow[]>();
    if (error) throw new Error(error.message);
    return (rows ?? []).map(mapRow);
  });

// -------------------------------------------------------------
// Criar
// -------------------------------------------------------------
export const createFollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ lead_id: z.string().uuid(), ...scheduleShape }).parse(data),
  )
  .handler(async ({ data, context }): Promise<FollowUp> => {
    const { data: open, error: openError } = await context.supabase
      .from("follow_ups")
      .select("id")
      .eq("lead_id", data.lead_id)
      .eq("status", "agendado")
      .limit(1);
    if (openError) throw new Error(openError.message);
    if ((open ?? []).length > 0) {
      throw new Error(
        "Já existe um follow-up agendado para este lead. Use reagendar, concluir ou cancelar.",
      );
    }

    const { data: row, error } = await context.supabase
      .from("follow_ups")
      .insert({
        lead_id: data.lead_id,
        scheduled_at: data.scheduled_at,
        duration_minutes: data.duration_minutes ?? DEFAULT_DURATION_MINUTES,
        timezone: DEFAULT_TIMEZONE,
        reason: data.reason ?? null,
        owner_id: data.owner_id ?? null,
        created_by: context.userId,
      })
      .select(SELECT)
      .single<FollowUpRow>();
    if (error) throw new Error(error.message);
    return mapRow(row);
  });

// -------------------------------------------------------------
// Reagendar (preserva o registro original)
// -------------------------------------------------------------
export const rescheduleFollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), ...scheduleShape }).parse(data))
  .handler(async ({ data, context }): Promise<FollowUp> => {
    const { data: current, error: currentError } = await context.supabase
      .from("follow_ups")
      .select("id, lead_id, status, duration_minutes, reason, owner_id")
      .eq("id", data.id)
      .single<Pick<FollowUpRow, "id" | "lead_id" | "status" | "duration_minutes" | "reason" | "owner_id">>();
    if (currentError) throw new Error(currentError.message);
    if (current.status !== "agendado") {
      throw new Error("Somente follow-ups agendados podem ser reagendados.");
    }

    // 1) Fecha o atual como 'reagendado' para liberar a regra de único aberto.
    const { error: closeError } = await context.supabase
      .from("follow_ups")
      .update({ status: "reagendado" })
      .eq("id", current.id);
    if (closeError) throw new Error(closeError.message);

    // 2) Cria o novo, encadeado ao anterior.
    const { data: created, error: createError } = await context.supabase
      .from("follow_ups")
      .insert({
        lead_id: current.lead_id,
        scheduled_at: data.scheduled_at,
        duration_minutes: data.duration_minutes ?? current.duration_minutes,
        timezone: DEFAULT_TIMEZONE,
        reason: data.reason !== undefined ? data.reason : current.reason,
        owner_id: data.owner_id !== undefined ? data.owner_id : current.owner_id,
        rescheduled_from: current.id,
        created_by: context.userId,
      })
      .select(SELECT)
      .single<FollowUpRow>();
    if (createError) throw new Error(createError.message);

    // 3) Liga o anterior ao novo (encadeamento bidirecional do histórico).
    await context.supabase
      .from("follow_ups")
      .update({ rescheduled_to: created.id })
      .eq("id", current.id);

    return mapRow(created);
  });

// -------------------------------------------------------------
// Concluir
// -------------------------------------------------------------
export const completeFollowUp = createServerFn({ method: "POST" })
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
      .from("follow_ups")
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
export const cancelFollowUp = createServerFn({ method: "POST" })
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
      .from("follow_ups")
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
