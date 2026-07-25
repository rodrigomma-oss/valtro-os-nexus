/**
 * Sprint 13.7 — Camada de leitura operacional do Centro de Operações.
 *
 * Estratégia de consulta (auditada para evitar N+1):
 * - 8 consultas de largura fixa, executadas em paralelo, cada uma filtrada
 *   pelos estados que realmente podem exigir atenção.
 * - Nenhuma consulta por item/linha: a correlação (contratação → onboarding,
 *   contratação → ciclos, proposta → contratação) é feita em memória via Map/Set.
 * - Nenhuma view, materialized view, RPC ou tabela de cache: não há benefício
 *   arquitetural claro neste volume e a sprint proíbe nova fonte de verdade.
 *
 * RLS: todas as leituras usam `context.supabase` (sessão do usuário), portanto
 * `viewer` continua somente leitura e nada é exposto publicamente.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildAttentionQueue,
  countAttention,
  type AttentionCounts,
  type AttentionItem,
  type RawClient,
  type RawClientService,
  type RawCycle,
  type RawLead,
  type RawOnboarding,
  type RawProject,
  type RawProposal,
} from "@/lib/attention";

export interface OperationsSummary {
  atencaoNecessaria: number;
  onboardingsPendentes: number;
  projetosAtivos: number;
  servicosAtivos: number;
  ciclosAtivos: number;
}

export interface AttentionOverview {
  items: AttentionItem[];
  counts: AttentionCounts;
  summary: OperationsSummary;
  generated_at: string;
}

const ACTIVE_PROJECT_STATUSES = [
  "nao_iniciado",
  "planejamento",
  "em_desenvolvimento",
  "em_revisao",
  "aguardando_cliente",
];


export const getAttentionOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AttentionOverview> => {
    const { supabase } = context;

    const [
      leadsRes,
      proposalsRes,
      clientsRes,
      projectsRes,
      servicesRes,
      onboardingsRes,
      cyclesRes,
      contractedRes,
    ] = await Promise.all([
      supabase
        .from("leads")
        .select("id, company_name, contact_name, status, updated_at, created_at")
        .is("archived_at", null)
        .in("status", ["em_analise"])
        .returns<RawLead[]>(),
      supabase
        .from("proposals")
        .select("id, lead_id, number, title, status, valid_until, updated_at, created_at")
        .in("status", ["enviada", "em_negociacao", "aprovada"])
        .returns<RawProposal[]>(),
      supabase.from("clients").select("id, company_name").returns<RawClient[]>(),
      supabase
        .from("projects")
        .select("id, client_id, code, name, status, due_date, updated_at")
        .not("status", "in", "(concluido,cancelado)")
        .returns<RawProject[]>(),
      supabase
        .from("client_services")
        .select(
          "id, client_id, name_snapshot, status, billing_type_snapshot, billing_interval_snapshot, contracted_at, started_at, updated_at",
        )
        .in("status", ["pendente", "ativo", "pausado"])
        .returns<RawClientService[]>(),
      supabase
        .from("client_service_onboardings")
        // `concluido` entra porque sinaliza a ação "ativar contratação" (P1-7).
        .select("id, client_service_id, status, updated_at, created_at")
        .in("status", ["pendente", "enviado", "em_preenchimento", "concluido"])
        .returns<RawOnboarding[]>(),

      supabase
        .from("client_service_cycles")
        .select("id, client_service_id, sequence, period_start, period_end, status, updated_at")
        .in("status", ["previsto", "ativo", "concluido"])
        .returns<RawCycle[]>(),
      supabase
        .from("client_services")
        .select("proposal_id")
        .not("proposal_id", "is", null)
        .returns<Array<{ proposal_id: string | null }>>(),
    ]);

    for (const res of [
      leadsRes,
      proposalsRes,
      clientsRes,
      projectsRes,
      servicesRes,
      onboardingsRes,
      cyclesRes,
      contractedRes,
    ]) {
      if (res.error) throw new Error(res.error.message);
    }

    const leads = leadsRes.data ?? [];
    const proposals = proposalsRes.data ?? [];
    const clients = clientsRes.data ?? [];
    const projects = projectsRes.data ?? [];
    const clientServices = servicesRes.data ?? [];
    const onboardings = onboardingsRes.data ?? [];
    const cycles = cyclesRes.data ?? [];

    const items = buildAttentionQueue({
      leads,
      proposals,
      clients,
      projects,
      clientServices,
      onboardings,
      cycles,
      contractedProposalIds: (contractedRes.data ?? [])
        .map((r) => r.proposal_id)
        .filter((v): v is string => Boolean(v)),
    });

    const counts = countAttention(items);

    return {
      items,
      counts,
      summary: {
        atencaoNecessaria: counts.critica + counts.atencao,
        onboardingsPendentes: onboardings.filter(
          (o) => o.status === "pendente" || o.status === "enviado",
        ).length,
        projetosAtivos: projects.filter((p) => ACTIVE_PROJECT_STATUSES.includes(p.status)).length,
        servicosAtivos: clientServices.filter((s) => s.status === "ativo").length,
        ciclosAtivos: cycles.filter((c) => c.status === "ativo").length,
      },
      generated_at: new Date().toISOString(),
    };
  });
