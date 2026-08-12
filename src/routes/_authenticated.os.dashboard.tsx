import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, ArrowRight } from "lucide-react";
import {
  UserPlus,
  FileText,
  CheckCircle2,
  MessageSquare,
  Archive,
  ArrowRightCircle,
  AlertTriangle,
  Users,
  ChevronRight,
  Send,
  Undo2,
  Receipt,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { OperationHero } from "@/components/app/operations/operation-hero";
import { PipelineBoard } from "@/components/app/operations/pipeline-board";
import { MetricCard } from "@/components/app/operations/metric-card";
import { cn } from "@/lib/utils";
import { getOperationsOverview, type EventKind, type InboxItemDTO, type ActivityItemDTO, type PipelineStageDTO } from "@/lib/operations.functions";
import { getFollowUpsOverview } from "@/lib/leads.functions";
import { getProposalsOverview } from "@/lib/proposals.functions";
import { getProjectsOverview, getClientsOverview } from "@/lib/projects.functions";
import { CalendarClock, Phone as PhoneIcon, FolderKanban, Building2, AlertTriangle as AlertTriangleIcon, Layers, Repeat } from "lucide-react";
import { AttentionQueue } from "@/components/app/operations/attention-queue";
import { getAttentionOverview } from "@/lib/attention.functions";
import { getBetaOperationalOverview } from "@/lib/os/beta-dashboard.functions";
import {
  BetaAttentionList,
  BetaMetricGrid,
  BetaModuleGrid,
  BetaRiskBanner,
  BetaTimeline,
} from "@/components/app/operations/beta-ops-panel";

export const Route = createFileRoute("/_authenticated/os/dashboard")({
  component: CrmDashboard,
  head: () => ({
    meta: [
      { title: "Centro de Operações — Valtro Labs" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Tone = "info" | "warning" | "danger" | "success" | "primary";

const EVENT_ICON: Record<EventKind, LucideIcon> = {
  lead_criado: UserPlus,
  lead_arquivado: Archive,
  status_alterado: ArrowRightCircle,
  briefing_gerado: Send,
  briefing_reenviado: Send,
  briefing_revogado: AlertTriangle,
  briefing_iniciado: FileText,
  briefing_retomado: Undo2,
  briefing_concluido: CheckCircle2,
  observacao_adicionada: MessageSquare,
  observacao_removida: MessageSquare,
  proposta_criada: Receipt,
  proposta_status_alterado: ArrowRightCircle,
  proposta_aprovada: CheckCircle2,
  proposta_rejeitada: AlertTriangle,
};

const EVENT_TONE: Record<EventKind, Tone> = {
  lead_criado: "info",
  lead_arquivado: "warning",
  status_alterado: "info",
  briefing_gerado: "info",
  briefing_reenviado: "info",
  briefing_revogado: "danger",
  briefing_iniciado: "warning",
  briefing_retomado: "info",
  briefing_concluido: "success",
  observacao_adicionada: "info",
  observacao_removida: "warning",
  proposta_criada: "info",
  proposta_status_alterado: "info",
  proposta_aprovada: "success",
  proposta_rejeitada: "danger",
};

const PIPELINE_TONE: Record<PipelineStageDTO["id"], "info" | "primary" | "warning" | "success"> = {
  lead: "info",
  briefing: "primary",
  diagnostico: "warning",
  proposta: "primary",
  cliente: "success",
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

const dotMap: Record<Tone, string> = {
  info: "bg-info",
  warning: "bg-warning",
  danger: "bg-destructive",
  success: "bg-success",
  primary: "bg-primary",
};
const iconBgMap: Record<Tone, string> = {
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  success: "bg-success/10 text-success",
  primary: "bg-primary/10 text-primary",
};

function InboxList({ items, onOpen }: { items: InboxItemDTO[]; onOpen: (leadId: string) => void }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
        Nenhum evento recente. Novos eventos aparecerão aqui automaticamente.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border rounded-2xl border border-border bg-surface shadow-soft overflow-hidden">
      {items.map((it, i) => {
        const Icon = EVENT_ICON[it.type] ?? FileText;
        const tone = EVENT_TONE[it.type] ?? "info";
        return (
          <motion.li
            key={it.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
          >
            <button
              type="button"
              onClick={() => onOpen(it.lead_id)}
              className="group w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/40"
            >
              <span className={cn("h-2 w-2 shrink-0 rounded-full", dotMap[tone])} />
              <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", iconBgMap[tone])}>
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{it.title}</p>
                  <span className="text-xs text-muted-foreground shrink-0">· {relativeTime(it.created_at)}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{it.description}</p>
              </div>
              <div className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-primary shrink-0">
                Abrir lead
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}

function ActivityList({ items }: { items: ActivityItemDTO[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">Nenhuma atividade registrada ainda.</p>
    );
  }
  return (
    <ol className="relative pl-5">
      <span className="absolute left-[7px] top-2 bottom-2 w-px bg-border" aria-hidden />
      {items.map((it, i) => (
        <motion.li
          key={it.id}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className="relative pb-5 last:pb-0"
        >
          <span className="absolute -left-5 top-1.5 h-3 w-3 rounded-full bg-background border-2 border-primary" />
          <p className="text-sm text-foreground">
            <span className="font-medium">{it.who}</span>{" "}
            <span className="text-muted-foreground">{it.action}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{relativeTime(it.created_at)}</p>
        </motion.li>
      ))}
    </ol>
  );
}

function CrmDashboard() {
  const navigate = useNavigate();
  const getOverviewFn = useServerFn(getOperationsOverview);
  const getFollowUpsFn = useServerFn(getFollowUpsOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["operations-overview"],
    queryFn: () => getOverviewFn(),
    staleTime: 30_000,
  });
  const followUps = useQuery({
    queryKey: ["follow-ups-overview"],
    queryFn: () => getFollowUpsFn(),
    staleTime: 30_000,
  });
  const getProposalsFn = useServerFn(getProposalsOverview);
  const proposals = useQuery({
    queryKey: ["proposals-overview"],
    queryFn: () => getProposalsFn(),
    staleTime: 30_000,
  });
  const getProjectsFn = useServerFn(getProjectsOverview);
  const getClientsFn = useServerFn(getClientsOverview);
  const projects = useQuery({
    queryKey: ["projects-overview"],
    queryFn: () => getProjectsFn(),
    staleTime: 30_000,
  });
  const clients = useQuery({
    queryKey: ["clients-overview"],
    queryFn: () => getClientsFn(),
    staleTime: 30_000,
  });

  const getAttentionFn = useServerFn(getAttentionOverview);
  const attention = useQuery({
    queryKey: ["attention-overview"],
    queryFn: () => getAttentionFn(),
    staleTime: 30_000,
  });

  /**
   * VOS-001G — Operação do Beta Fechado.
   * Uma única leitura consolidada (tickets, bugs, feedback, participantes,
   * papéis internos e eventos), toda derivada em runtime via RLS.
   */
  const getBetaFn = useServerFn(getBetaOperationalOverview);
  const beta = useQuery({
    queryKey: ["beta-operational-overview"],
    queryFn: () => getBetaFn(),
    staleTime: 30_000,
  });


  const heroParts: string[] = [];
  if (data) {
    if (data.hero.leadsAguardandoContato)
      heroParts.push(`${data.hero.leadsAguardandoContato} lead(s) aguardando contato`);
    if (data.hero.briefingsAguardando)
      heroParts.push(`${data.hero.briefingsAguardando} briefing(s) aguardando retorno`);
    if (data.hero.briefingsConcluidos)
      heroParts.push(`${data.hero.briefingsConcluidos} briefing(s) concluído(s)`);
  }

  /**
   * Sprint 13.10 (item 2) — os antigos "queue cards" listavam as mesmas
   * pendências hoje derivadas em "Atenção necessária" (leads sem contato,
   * briefings enviados/concluídos). Manter duas listas concorrendo pela
   * atenção do operador é ruído: aqui eles passam a ser apenas
   * indicadores/atalhos de navegação. Nenhuma informação foi removida — todos
   * os números continuam visíveis e clicáveis, apenas deixam de competir com
   * a fila operacional.
   */
  const shortcutTiles = data
    ? [
        {
          id: "leads",
          label: "Leads aguardando contato",
          value: data.queue.leadsAguardandoContato,
          icon: UserPlus,
          tone: "info" as const,
          search: { view: "novos-do-site" as const },
        },
        {
          id: "briefings-enviados",
          label: "Briefings enviados",
          value: data.queue.briefingsEnviados,
          icon: Send,
          tone: "primary" as const,
          search: { view: "briefings-aguardando" as const },
        },
        {
          id: "briefings-concluidos",
          label: "Briefings concluídos",
          value: data.queue.briefingsConcluidos,
          icon: CheckCircle2,
          tone: "success" as const,
          search: { view: "briefings-concluidos" as const },
        },
        {
          id: "clientes",
          label: "Clientes ativos",
          value: data.queue.clientesAtivos,
          icon: Users,
          tone: "success" as const,
          search: undefined,
        },
      ]
    : [];

  return (
    <div className="p-6 md:p-10 space-y-12 max-w-[1400px] mx-auto">
      <PageHeader
        title="Centro de Operações"
        description="O que precisa da sua atenção agora — priorizado pela nossa metodologia consultiva."
        actions={
          <Link
            to="/os/comercial/leads"
            search={{ view: "novos-do-site" }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <UserPlus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Novos do site
          </Link>
        }
      />

      <OperationHero parts={heroParts} />

      <BetaRiskBanner
        counts={
          beta.data?.counts ?? {
            total: 0,
            critica: 0,
            atencao: 0,
            normal: 0,
            byModule: { chamados: 0, bugs: 0, feedback: 0, participantes: 0 },
          }
        }
      />

      <Section
        title="Operação do Beta Fechado"
        description="Indicadores derivados de chamados, bugs, feedback, participantes e usuários internos."
      >
        <BetaMetricGrid metrics={beta.data?.metrics ?? []} isLoading={beta.isLoading} />
      </Section>

      <Section
        title="Atenção necessária — Beta"
        description="Pendências derivadas em tempo real. Cada item abre a entidade de origem."
      >
        <BetaAttentionList
          items={beta.data?.attention ?? []}
          counts={
            beta.data?.counts ?? {
              total: 0,
              critica: 0,
              atencao: 0,
              normal: 0,
              byModule: { chamados: 0, bugs: 0, feedback: 0, participantes: 0 },
            }
          }
          isLoading={beta.isLoading}
        />
      </Section>

      <Section
        title="Módulos do beta"
        description="Situação consolidada por módulo — clique para abrir a lista completa."
      >
        <BetaModuleGrid modules={beta.data?.modules ?? []} />
      </Section>

      <Section
        title="Últimos eventos do beta"
        description="Timeline consolidada de chamados, bugs, feedback e participantes."
      >
        <BetaTimeline items={beta.data?.timeline ?? []} isLoading={beta.isLoading} />
      </Section>


      <Section
        title="Resumo operacional"
        description="Indicadores derivados do estado real das entidades."
      >
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <FollowUpTile
            label="Atenção necessária"
            value={attention.data?.summary.atencaoNecessaria ?? 0}
            tone="danger"
            icon={AlertTriangleIcon}
          />
          <FollowUpTile
            label="Onboardings pendentes"
            value={attention.data?.summary.onboardingsPendentes ?? 0}
            tone="warning"
            icon={Send}
          />
          <FollowUpTile
            label="Projetos ativos"
            value={attention.data?.summary.projetosAtivos ?? 0}
            tone="primary"
            icon={FolderKanban}
            to="/os/comercial/projetos"
          />
          <FollowUpTile
            label="Serviços ativos"
            value={attention.data?.summary.servicosAtivos ?? 0}
            tone="success"
            icon={Layers}
            to="/os/comercial/clientes"
          />
          <FollowUpTile
            label="Ciclos ativos"
            value={attention.data?.summary.ciclosAtivos ?? 0}
            tone="info"
            icon={Repeat}
          />
        </div>
      </Section>

      <Section
        title="Atenção necessária"
        description="Pendências derivadas em tempo real — cada item leva à entidade de origem."
      >
        <AttentionQueue
          items={attention.data?.items ?? []}
          counts={
            attention.data?.counts ?? {
              total: 0,
              critica: 0,
              atencao: 0,
              normal: 0,
              byCategory: {
                leads: 0,
                propostas: 0,
                onboarding: 0,
                projetos: 0,
                contratacoes: 0,
                ciclos: 0,
              },
            }
          }
          isLoading={attention.isLoading}
        />
      </Section>



      {shortcutTiles.length > 0 && (
        <Section
          title="Atalhos de navegação"
          description="Indicadores da base — as pendências ficam em “Atenção necessária”."
        >
          <div
            className="grid grid-cols-2 lg:grid-cols-4 gap-3"
            data-testid="dashboard-shortcuts"
          >
            {shortcutTiles.map((c) => (
              <FollowUpTile
                key={c.id}
                label={c.label}
                value={c.value}
                tone={c.tone}
                icon={c.icon}
                to="/os/comercial/leads"
                search={c.search}
              />
            ))}
          </div>
        </Section>
      )}

      {followUps.data && (
        <Section
          title="Central de comunicação"
          description="Follow-ups agendados e contatos operacionais."
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <FollowUpTile
              label="Vencidos"
              value={followUps.data.followUpsVencidos}
              tone="danger"
              icon={CalendarClock}
              to="/os/comercial/leads"
              search={{ view: "followups-vencidos" as const }}
            />
            <FollowUpTile
              label="Hoje"
              value={followUps.data.followUpsHoje}
              tone="primary"
              icon={CalendarClock}
              to="/os/comercial/leads"
              search={{ view: "followups-hoje" as const }}
            />
            <FollowUpTile
              label="Próximos 7 dias"
              value={followUps.data.followUpsProximos7}
              tone="info"
              icon={CalendarClock}
              to="/os/comercial/leads"
              search={{ view: "followups-proximos" as const }}
            />
            <FollowUpTile
              label="Contatos hoje"
              value={followUps.data.contatosHoje}
              tone="success"
              icon={PhoneIcon}
            />
          </div>
        </Section>
      )}

      {proposals.data && (
        <Section
          title="Propostas comerciais"
          description="Pipeline de oportunidades em elaboração e negociação."
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <FollowUpTile
              label="Em elaboração"
              value={proposals.data.em_elaboracao}
              tone="info"
              icon={Receipt}
            />
            <FollowUpTile
              label="Enviadas"
              value={proposals.data.enviadas}
              tone="primary"
              icon={Send}
            />
            <FollowUpTile
              label="Em negociação"
              value={proposals.data.em_negociacao}
              tone="warning"
              icon={ArrowRightCircle}
            />
            <FollowUpTile
              label="Aprovadas"
              value={proposals.data.aprovadas}
              tone="success"
              icon={CheckCircle2}
            />
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MetricCard
              index={0}
              label="Pipeline (valor)"
              value={new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                maximumFractionDigits: 0,
              }).format(proposals.data.pipeline_value)}
              hint="Somatório de propostas ativas"
              trend="neutral"
            />
            <MetricCard
              index={1}
              label="Conversão"
              value={`${proposals.data.conversion_rate}%`}
              hint="Aprovadas / total"
              trend={proposals.data.conversion_rate > 30 ? "up" : "neutral"}
            />
          </div>
        </Section>
      )}

      {(clients.data || projects.data) && (
        <Section
          title="Clientes & Projetos"
          description="Base de relacionamento e execução."
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <FollowUpTile
              label="Clientes ativos"
              value={clients.data?.ativos ?? 0}
              tone="success"
              icon={Building2}
              to="/os/comercial/clientes"
            />
            <FollowUpTile
              label="Projetos ativos"
              value={projects.data?.ativos ?? 0}
              tone="primary"
              icon={FolderKanban}
              to="/os/comercial/projetos"
            />
            <FollowUpTile
              label="Aguardando cliente"
              value={projects.data?.aguardandoCliente ?? 0}
              tone="warning"
              icon={FolderKanban}
              to="/os/comercial/projetos"
            />
            <FollowUpTile
              label="Projetos atrasados"
              value={projects.data?.atrasados ?? 0}
              tone="danger"
              icon={AlertTriangleIcon}
              to="/os/comercial/projetos"
            />
          </div>
        </Section>
      )}


      <Section title="Inbox operacional" description="Eventos mais recentes na sua base de leads.">
        <InboxList
          items={data?.inbox ?? []}
          onOpen={(id) => navigate({ to: "/os/comercial/leads/$id", params: { id }, search: { proposta: undefined, acao: undefined } })}
        />
      </Section>

      {data && data.pipeline.some((s) => s.count > 0) && (
        <Section title="Pipeline comercial" description="Distribuição real de leads por etapa.">
          <PipelineBoard
            stages={data.pipeline.map((s) => ({
              id: s.id,
              label: s.label,
              count: s.count,
              hint: s.hint,
              tone: PIPELINE_TONE[s.id],
            }))}
            onStageClick={() => navigate({ to: "/os/comercial/leads" })}
          />
        </Section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Section title="Últimas atividades" description="Timeline consolidada da operação.">
            <div className="rounded-2xl border border-border bg-surface shadow-soft p-6">
              <ActivityList items={data?.activities ?? []} />
            </div>
          </Section>
        </div>
        <div>
          <Section title="Indicadores" description="Leitura rápida da base atual.">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              <MetricCard
                index={0}
                label="Total de leads"
                value={data ? String(data.metrics.total) : isLoading ? "…" : "0"}
                hint="Base ativa"
                trend="neutral"
              />
              <MetricCard
                index={1}
                label="Novos"
                value={data ? String(data.metrics.novos) : "—"}
                hint="Aguardando abordagem"
                trend="neutral"
              />
              <MetricCard
                index={2}
                label="Em andamento"
                value={data ? String(data.metrics.emAndamento) : "—"}
                hint="Contato · qualificado · proposta"
                trend="neutral"
              />
              {data && data.metrics.briefingsEnviados > 0 && (
                <MetricCard
                  index={3}
                  label="Briefings enviados"
                  value={String(data.metrics.briefingsEnviados)}
                  hint="Ciclo total"
                  trend="neutral"
                />
              )}
              {data && data.metrics.briefingsConcluidos > 0 && (
                <MetricCard
                  index={4}
                  label="Briefings concluídos"
                  value={String(data.metrics.briefingsConcluidos)}
                  hint="Retornaram preenchidos"
                  trend="up"
                />
              )}
              {data && data.metrics.total > 0 && (
                <MetricCard
                  index={5}
                  label="Conversão"
                  value={`${data.metrics.conversao}%`}
                  hint={`${data.metrics.total > 0 ? Math.round((data.metrics.emAndamento / data.metrics.total) * 100) : 0}% em andamento`}
                  trend={data.metrics.conversao > 20 ? "up" : "neutral"}
                />
              )}
            </div>
          </Section>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        <Link to="/os/comercial/leads" className="text-primary hover:underline">
          Ver todos os leads →
        </Link>
      </div>
    </div>
  );
}

type TileTone = "primary" | "info" | "danger" | "success" | "warning";

const TILE_TONE: Record<TileTone, { bg: string; text: string; ring: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary", ring: "ring-primary/20" },
  info: { bg: "bg-info/10", text: "text-info", ring: "ring-info/20" },
  danger: { bg: "bg-destructive/10", text: "text-destructive", ring: "ring-destructive/20" },
  success: { bg: "bg-success/10", text: "text-success", ring: "ring-success/20" },
  warning: { bg: "bg-warning/10", text: "text-warning", ring: "ring-warning/20" },
};

function FollowUpTile({
  label,
  value,
  tone,
  icon: Icon,
  to,
  search,
}: {
  label: string;
  value: number;
  tone: TileTone;
  icon: LucideIcon;
  to?: string;
  search?: Record<string, string>;
}) {
  const t = TILE_TONE[tone];
  const inner = (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-4 shadow-soft h-full flex items-start gap-3 transition-colors",
        to ? "hover:bg-muted/40" : "",
      )}
    >
      <div className={cn("grid h-9 w-9 place-items-center rounded-xl ring-1", t.bg, t.text, t.ring)}>
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold text-foreground leading-tight mt-0.5">{value}</p>
      </div>
    </div>
  );
  if (!to) return inner;
  return (
    <Link
      to={to}
      search={search as never}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
    >
      {inner}
    </Link>
  );
}
