/**
 * Conflitos cadastrais (briefing → Lead) — server functions autenticadas.
 *
 * Leitura: qualquer usuário autenticado (RLS permite SELECT).
 * Resolução (aplicar/descartar): admin ou operator — validado no servidor
 * e reforçado pelas policies de UPDATE.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  SYNCABLE_LEAD_FIELDS,
  type SyncableLeadField,
} from "@/lib/briefing-lead-sync";

export interface LeadFieldConflict {
  id: string;
  lead_id: string;
  briefing_token_id: string | null;
  field: SyncableLeadField;
  current_value: string | null;
  briefing_value: string;
  status: "pendente" | "aceito" | "descartado";
  created_at: string;
}

const CONFLICT_SELECT =
  "id, lead_id, briefing_token_id, field, current_value, briefing_value, status, created_at";

export const listLeadFieldConflicts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ lead_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("lead_field_conflicts")
      .select(CONFLICT_SELECT)
      .eq("lead_id", data.lead_id)
      .eq("status", "pendente")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as LeadFieldConflict[];
  });

const resolveSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["aceitar", "descartar"]),
});

export const resolveLeadFieldConflict = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => resolveSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: roles, error: rolesErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (rolesErr) throw new Error(rolesErr.message);
    const canResolve = (roles ?? []).some(
      (r) => r.role === "admin" || r.role === "operator",
    );
    if (!canResolve) {
      throw new Error("Você não tem permissão para resolver divergências.");
    }

    const { data: conflict, error: readErr } = await context.supabase
      .from("lead_field_conflicts")
      .select(CONFLICT_SELECT)
      .eq("id", data.id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!conflict) throw new Error("Divergência não encontrada.");
    if (conflict.status !== "pendente") {
      throw new Error("Esta divergência já foi resolvida.");
    }

    const field = conflict.field as SyncableLeadField;
    if (!SYNCABLE_LEAD_FIELDS.includes(field)) {
      throw new Error("Campo não permitido para atualização.");
    }

    if (data.action === "aceitar") {
      const patch: Partial<Record<SyncableLeadField, string>> = {
        [field]: conflict.briefing_value,
      };
      const { error: updErr } = await context.supabase
        .from("leads")
        .update(patch)
        .eq("id", conflict.lead_id);
      if (updErr) throw new Error(updErr.message);


      await context.supabase.from("lead_events").insert({
        lead_id: conflict.lead_id,
        type: "cadastro_atualizado_por_briefing",
        description: "Divergência do briefing aplicada ao cadastro do Lead.",
        created_by: context.userId,
        metadata: {
          campos_atualizados: [field],
          briefing_token_id: conflict.briefing_token_id,
        },
      });
    }

    const { error: resErr } = await context.supabase
      .from("lead_field_conflicts")
      .update({
        status: data.action === "aceitar" ? "aceito" : "descartado",
        resolved_by: context.userId,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (resErr) throw new Error(resErr.message);

    return { ok: true, status: data.action === "aceitar" ? "aceito" : "descartado" };
  });
