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
import type { SyncableLeadField } from "@/lib/briefing-lead-sync";


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
    const { resolveConflictCore } = await import("@/lib/lead-conflicts.core");
    return resolveConflictCore(context.supabase as never, context.userId, data);
  });

