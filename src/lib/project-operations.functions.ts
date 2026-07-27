/**
 * Visão Geral operacional do Projeto — Sprint 15.1.
 *
 * Princípio: dados comerciais vêm da Contratação, financeiros do Ciclo,
 * identidade do Cliente e apenas o que não tem origem fica em
 * `project_operations`. Nada é duplicado.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ACCESS_STATUS_ORDER, type ProjectOverview } from "@/types/project-operations";

const OPS_SELECT =
  "id, project_id, operational_access_status, operational_access_notes, current_objective, ads_monthly_budget_cents, ads_autonomy_limit_cents, meeting_weekday, meeting_preferred_time, meeting_preference_declared, next_meeting_at, notes, created_by, updated_by, created_at, updated_at";

const CONTRACT_SELECT =
  "id, name_snapshot, description_snapshot, status, billing_type_snapshot, billing_interval_snapshot, contracted_amount_cents, scope_snapshot";

const CYCLE_SELECT =
  "id, client_service_id, sequence, period_start, period_end, due_date, amount_cents, status, started_at, completed_at, cancelled_at, created_by, created_at, updated_at, payment_status, paid_amount_cents, paid_at, payment_method, payment_notes, payment_registered_by";

/**
 * Ciclo "atual": o `ativo` de maior sequência; na ausência dele, o
 * `previsto` mais próximo. Ciclos concluídos/cancelados não são exibidos
 * como atuais.
 */
function pickCurrentCycle(rows: any[]): any | null {
  const ativo = rows.filter((c) => c.status === "ativo").sort((a, b) => b.sequence - a.sequence)[0];
  if (ativo) return ativo;
  const previsto = rows
    .filter((c) => c.status === "previsto")
    .sort((a, b) => a.sequence - b.sequence)[0];
  return previsto ?? null;
}

export const getProjectOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ project_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<ProjectOverview> => {
    const supabase = context.supabase;

    const { data: project, error: pErr } = await supabase
      .from("projects")
      .select("id, client_service_id")
      .eq("id", data.project_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!project) throw new Error("Projeto não encontrado.");

    const { data: opsRow, error: oErr } = await supabase
      .from("project_operations")
      .select(OPS_SELECT)
      .eq("project_id", data.project_id)
      .maybeSingle();
    if (oErr) throw new Error(oErr.message);

    const clientServiceId = (project as any).client_service_id as string | null;
    let contract: any = null;
    let cycle: any = null;
    let onboarding: any = null;

    if (clientServiceId) {
      const { data: c, error: cErr } = await supabase
        .from("client_services")
        .select(CONTRACT_SELECT)
        .eq("id", clientServiceId)
        .maybeSingle();
      if (cErr) throw new Error(cErr.message);
      contract = c ?? null;

      const { data: cycles, error: cyErr } = await supabase
        .from("client_service_cycles")
        .select(CYCLE_SELECT)
        .eq("client_service_id", clientServiceId);
      if (cyErr) throw new Error(cyErr.message);
      cycle = pickCurrentCycle((cycles ?? []) as any[]);
      if (cycle) {
        cycle = {
          ...cycle,
          sequence: Number(cycle.sequence),
          amount_cents: Number(cycle.amount_cents ?? 0),
          paid_amount_cents:
            cycle.paid_amount_cents === null || cycle.paid_amount_cents === undefined
              ? null
              : Number(cycle.paid_amount_cents),
        };
      }

      const { data: onb, error: onErr } = await supabase
        .from("client_service_onboardings")
        .select("id, status, template_key, completed_at")
        .eq("client_service_id", clientServiceId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (onErr) throw new Error(onErr.message);
      onboarding = (onb ?? [])[0] ?? null;
    }

    return {
      operations: (opsRow as any) ?? null,
      contract,
      cycle,
      onboarding,
    };
  });

const opsPayload = z.object({
  project_id: z.string().uuid(),
  operational_access_status: z.enum(ACCESS_STATUS_ORDER as unknown as [string, ...string[]]),
  operational_access_notes: z.string().trim().max(2000).nullable().optional(),
  current_objective: z.string().trim().max(2000).nullable().optional(),
  ads_monthly_budget_cents: z.number().int().min(0).nullable().optional(),
  ads_autonomy_limit_cents: z.number().int().min(0).nullable().optional(),
  meeting_weekday: z.number().int().min(0).max(6).nullable().optional(),
  meeting_preferred_time: z.string().trim().max(60).nullable().optional(),
  meeting_preference_declared: z.boolean().optional(),
  next_meeting_at: z.string().datetime({ offset: true }).nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
});

/**
 * Cria ou atualiza o registro operacional do projeto. Escrita restrita a
 * admin/operator pelas policies — o `viewer` recebe erro do banco.
 */
export const upsertProjectOperations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => opsPayload.parse(data))
  .handler(async ({ data, context }) => {
    const { project_id, ...patch } = data;
    const supabase = context.supabase;

    const { data: existing, error: exErr } = await supabase
      .from("project_operations")
      .select("id")
      .eq("project_id", project_id)
      .maybeSingle();
    if (exErr) throw new Error(exErr.message);

    if (existing) {
      const { error } = await supabase
        .from("project_operations")
        .update({ ...patch, updated_by: context.userId } as never)
        .eq("id", (existing as { id: string }).id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    const { error } = await supabase.from("project_operations").insert({
      project_id,
      ...patch,
      created_by: context.userId,
      updated_by: context.userId,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
