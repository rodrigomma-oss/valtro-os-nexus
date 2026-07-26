/**
 * Sincronização cadastral Briefing → Lead (execução server-only).
 *
 * Chamado ao concluir o briefing no Portal Público (anônimo), por isso usa
 * `supabaseAdmin`. Nunca deve impedir a conclusão do briefing: toda falha é
 * capturada e apenas logada pelo chamador.
 */
import {
  buildBriefingLeadSyncPlan,
  type BriefingLeadSyncPlan,
  type LeadCadastro,
} from "@/lib/briefing-lead-sync";

export interface SyncResult {
  updated_fields: string[];
  conflict_fields: string[];
}

export async function syncLeadCadastroFromBriefing(params: {
  leadId: string;
  briefingTokenId: string;
  briefingData: Record<string, unknown> | null | undefined;
}): Promise<SyncResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: lead, error: leadErr } = await supabaseAdmin
    .from("leads")
    .select(
      "id, contact_name, company_name, email, phone, city, state, segment, instagram",
    )
    .eq("id", params.leadId)
    .maybeSingle();
  if (leadErr) throw new Error(leadErr.message);
  if (!lead) throw new Error("Lead não encontrado para sincronização.");

  const plan: BriefingLeadSyncPlan = buildBriefingLeadSyncPlan(
    lead as LeadCadastro,
    params.briefingData,
  );

  const updatedFields = Object.keys(plan.updates);

  // 1) Um único UPDATE para todos os campos liberados.
  if (updatedFields.length > 0) {
    const { error } = await supabaseAdmin
      .from("leads")
      .update(plan.updates)
      .eq("id", params.leadId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("lead_events").insert({
      lead_id: params.leadId,
      type: "cadastro_atualizado_por_briefing",
      description: "Cadastro do Lead atualizado com dados do briefing.",
      metadata: {
        campos_atualizados: updatedFields,
        briefing_token_id: params.briefingTokenId,
      },
    });
  }

  // 2) Conflitos: registrar pendências (sem sobrescrever o Lead).
  const conflictFields: string[] = [];
  for (const conflict of plan.conflicts) {
    // Mantém histórico: um único pendente por (lead, campo).
    const { data: existing } = await supabaseAdmin
      .from("lead_field_conflicts")
      .select("id")
      .eq("lead_id", params.leadId)
      .eq("field", conflict.field)
      .eq("status", "pendente")
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from("lead_field_conflicts")
        .update({
          current_value: conflict.current_value,
          briefing_value: conflict.briefing_value,
          briefing_token_id: params.briefingTokenId,
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("lead_field_conflicts")
        .insert({
          lead_id: params.leadId,
          briefing_token_id: params.briefingTokenId,
          field: conflict.field,
          current_value: conflict.current_value,
          briefing_value: conflict.briefing_value,
        });
      if (error) throw new Error(error.message);
    }
    conflictFields.push(conflict.field);
  }

  if (conflictFields.length > 0) {
    await supabaseAdmin.from("lead_events").insert({
      lead_id: params.leadId,
      type: "cadastro_conflito_por_briefing",
      description:
        "Dados do briefing divergem do cadastro atual e aguardam revisão.",
      metadata: {
        campos_em_conflito: conflictFields,
        briefing_token_id: params.briefingTokenId,
      },
    });
  }

  return { updated_fields: updatedFields, conflict_fields: conflictFields };
}
