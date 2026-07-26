/**
 * Núcleo testável da resolução de divergências cadastrais.
 *
 * Recebe um client Supabase (autenticado como o usuário) para permitir
 * testes com um fake, sem I/O real.
 */
import { SYNCABLE_LEAD_FIELDS, type SyncableLeadField } from "@/lib/briefing-lead-sync";

export type ResolveAction = "aceitar" | "descartar";

export interface ConflictRow {
  id: string;
  lead_id: string;
  briefing_token_id: string | null;
  field: string;
  current_value: string | null;
  briefing_value: string;
  status: "pendente" | "aceito" | "descartado";
  created_at: string;
}

/** Subconjunto mínimo do client Supabase usado aqui. */
export interface MinimalSupabase {
  from: (table: string) => any;
}

export async function resolveConflictCore(
  supabase: MinimalSupabase,
  userId: string,
  input: { id: string; action: ResolveAction },
): Promise<{ ok: true; status: "aceito" | "descartado" }> {
  const { data: roles, error: rolesErr } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (rolesErr) throw new Error(rolesErr.message);
  const canResolve = (roles ?? []).some(
    (r: { role: string }) => r.role === "admin" || r.role === "operator",
  );
  if (!canResolve) {
    throw new Error("Você não tem permissão para resolver divergências.");
  }

  const { data: conflict, error: readErr } = await supabase
    .from("lead_field_conflicts")
    .select("*")
    .eq("id", input.id)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!conflict) throw new Error("Divergência não encontrada.");
  if ((conflict as ConflictRow).status !== "pendente") {
    throw new Error("Esta divergência já foi resolvida.");
  }

  const row = conflict as ConflictRow;
  const field = row.field as SyncableLeadField;
  if (!SYNCABLE_LEAD_FIELDS.includes(field)) {
    throw new Error("Campo não permitido para atualização.");
  }

  if (input.action === "aceitar") {
    const patch: Partial<Record<SyncableLeadField, string>> = {
      [field]: row.briefing_value,
    };
    const { error: updErr } = await supabase
      .from("leads")
      .update(patch)
      .eq("id", row.lead_id);
    if (updErr) throw new Error(updErr.message);

    await supabase.from("lead_events").insert({
      lead_id: row.lead_id,
      type: "cadastro_atualizado_por_briefing",
      description: "Divergência do briefing aplicada ao cadastro do Lead.",
      created_by: userId,
      metadata: {
        campos_atualizados: [field],
        briefing_token_id: row.briefing_token_id,
      },
    });
  }

  const status = input.action === "aceitar" ? "aceito" : "descartado";
  const { error: resErr } = await supabase
    .from("lead_field_conflicts")
    .update({
      status,
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", input.id);
  if (resErr) throw new Error(resErr.message);

  return { ok: true, status };
}
