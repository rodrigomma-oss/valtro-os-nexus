/**
 * Sprint — Sincronização do Centro de Operações.
 * Retorna dados reais para o Dashboard (`/crm/dashboard`).
 * Fonte de verdade: tabelas `leads`, `lead_events`, `briefing_tokens`.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { LeadStatus } from "@/types/lead";
import type { TokenStatus } from "@/types/briefing";

export type EventKind =
  | "lead_criado"
  | "lead_arquivado"
  | "status_alterado"
  | "briefing_gerado"
  | "briefing_reenviado"
  | "briefing_revogado"
  | "briefing_iniciado"
  | "briefing_retomado"
  | "briefing_concluido"
  | "observacao_adicionada"
  | "observacao_removida";

export interface InboxItemDTO {
  id: string;
  type: EventKind;
  title: string;
  description: string;
  created_at: string;
  lead_id: string;
}

export interface ActivityItemDTO {
  id: string;
  who: string;
  action: string;
  created_at: string;
  lead_id: string;
}

export interface PipelineStageDTO {
  id: "lead" | "briefing" | "diagnostico" | "proposta" | "cliente";
  label: string;
  count: number;
  hint: string;
}

export interface OperationsOverview {
  hero: {
    briefingsAguardando: number;
    briefingsConcluidos: number;
    leadsAguardandoContato: number;
  };
  queue: {
    leadsAguardandoContato: number;
    briefingsEnviados: number;
    briefingsConcluidos: number;
    clientesAtivos: number;
  };
  inbox: InboxItemDTO[];
  pipeline: PipelineStageDTO[];
  activities: ActivityItemDTO[];
  metrics: {
    total: number;
    novos: number;
    emAndamento: number;
    briefingsEnviados: number;
    briefingsConcluidos: number;
    conversao: number;
  };
}

const EVENT_TITLE: Record<EventKind, string> = {
  lead_criado: "Novo lead criado",
  lead_arquivado: "Lead arquivado",
  status_alterado: "Status alterado",
  briefing_gerado: "Briefing enviado",
  briefing_reenviado: "Briefing reenviado",
  briefing_revogado: "Briefing revogado",
  briefing_iniciado: "Briefing iniciado",
  briefing_retomado: "Briefing retomado",
  briefing_concluido: "Briefing concluído",
  observacao_adicionada: "Nova observação",
  observacao_removida: "Observação removida",
};

const EVENT_ACTION: Record<EventKind, string> = {
  lead_criado: "foi cadastrado no CRM",
  lead_arquivado: "foi arquivado",
  status_alterado: "teve o status alterado",
  briefing_gerado: "recebeu um briefing",
  briefing_reenviado: "recebeu novo envio de briefing",
  briefing_revogado: "teve o briefing revogado",
  briefing_iniciado: "iniciou o briefing",
  briefing_retomado: "retomou o briefing",
  briefing_concluido: "concluiu o briefing",
  observacao_adicionada: "recebeu uma observação",
  observacao_removida: "teve uma observação removida",
};

export const getOperationsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OperationsOverview> => {
    const { supabase } = context;

    const [leadsRes, tokensRes, eventsRes] = await Promise.all([
      supabase
        .from("leads")
        .select("id, company_name, status")
        .is("archived_at", null)
        .returns<Array<{ id: string; company_name: string; status: LeadStatus }>>(),
      supabase
        .from("briefing_tokens")
        .select("id, status")
        .returns<Array<{ id: string; status: TokenStatus }>>(),
      supabase
        .from("lead_events")
        .select(
          "id, lead_id, type, description, created_at, lead:leads!lead_events_lead_id_fkey(company_name)",
        )
        .order("created_at", { ascending: false })
        .limit(30)
        .returns<
          Array<{
            id: string;
            lead_id: string;
            type: EventKind;
            description: string | null;
            created_at: string;
            lead: { company_name: string | null } | null;
          }>
        >(),
    ]);

    if (leadsRes.error) throw new Error(leadsRes.error.message);
    if (tokensRes.error) throw new Error(tokensRes.error.message);
    if (eventsRes.error) throw new Error(eventsRes.error.message);

    const leads = leadsRes.data ?? [];
    const tokens = tokensRes.data ?? [];
    const events = eventsRes.data ?? [];

    const byStatus = (s: LeadStatus) => leads.filter((l) => l.status === s).length;
    const total = leads.length;
    const novos = byStatus("novo");
    const emAndamento = byStatus("contato") + byStatus("qualificado") + byStatus("proposta");
    const ganhos = byStatus("ganho");
    const conversao = total > 0 ? Math.round((ganhos / total) * 100) : 0;

    const briefingsAguardando = tokens.filter(
      (t) => t.status === "ativo" || t.status === "pendente",
    ).length;
    const briefingsConcluidos = tokens.filter((t) => t.status === "concluido").length;
    const briefingsEnviados = tokens.filter((t) => t.status !== "revogado").length;

    const inbox: InboxItemDTO[] = events.slice(0, 8).map((e) => ({
      id: e.id,
      type: e.type,
      title: EVENT_TITLE[e.type] ?? "Evento",
      description: e.lead?.company_name ?? e.description ?? "—",
      created_at: e.created_at,
      lead_id: e.lead_id,
    }));

    const activities: ActivityItemDTO[] = events.slice(0, 10).map((e) => ({
      id: e.id,
      who: e.lead?.company_name ?? "Lead",
      action: EVENT_ACTION[e.type] ?? "registrou evento",
      created_at: e.created_at,
      lead_id: e.lead_id,
    }));

    const pipeline: PipelineStageDTO[] = [
      { id: "lead", label: "Lead", count: byStatus("novo"), hint: "Aguardando primeiro contato" },
      { id: "briefing", label: "Briefing", count: byStatus("contato"), hint: "Em relacionamento inicial" },
      { id: "diagnostico", label: "Diagnóstico", count: byStatus("qualificado"), hint: "Qualificados em análise" },
      { id: "proposta", label: "Proposta", count: byStatus("proposta"), hint: "Aguardando resposta" },
      { id: "cliente", label: "Cliente", count: ganhos, hint: "Contas ativas" },
    ];

    return {
      hero: {
        briefingsAguardando,
        briefingsConcluidos,
        leadsAguardandoContato: novos,
      },
      queue: {
        leadsAguardandoContato: novos,
        briefingsEnviados,
        briefingsConcluidos,
        clientesAtivos: ganhos,
      },
      inbox,
      pipeline,
      activities,
      metrics: {
        total,
        novos,
        emAndamento,
        briefingsEnviados,
        briefingsConcluidos,
        conversao,
      },
    };
  });
