import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
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
  ShieldAlert,
  ArrowRight,
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
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const Route = createFileRoute("/_authenticated/os/dashboard")({
  component: DashboardPage,
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

function DashboardPage() {
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);

  useEffect(() => {
    const checkSecurity = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.app_metadata?.provider === 'google' || user?.app_metadata?.providers?.includes('google')) {
        setShowSecurityWarning(true);
      }
    };
    checkSecurity();
  }, []);

  return (
    <div className="space-y-6">
      {showSecurityWarning && (
        <div className="px-6 pt-6">
          <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-500">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle className="font-semibold">Segurança da Conta</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <span>
                Você está acessando via Google. Recomendamos configurar uma <strong>senha local</strong> para garantir o acesso em qualquer situação.
              </span>
              <Link 
                to="/os/configuracoes/seguranca" 
                className="text-sm font-bold flex items-center gap-1 hover:underline shrink-0"
              >
                Configurar agora <ArrowRight className="h-3 w-3" />
              </Link>
            </AlertDescription>
          </Alert>
        </div>
      )}
      <CrmDashboard />
    </div>
  );
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

  if (isLoading) {
    return (
      <div className="p-8 space-y-8 animate-pulse">
        <div className="h-48 bg-muted rounded-3xl" />
        <div className="grid gap-6 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-10 max-w-[1600px] mx-auto">
      <PageHeader
        title="Centro de Operações"
        description="Gestão integrada de leads, briefings, projetos e portfólio."
      />

      <OperationHero
        title="Operações em tempo real"
        subtitle={heroParts.length > 0 ? heroParts.join(" · ") : "Sua plataforma está operando normalmente."}
      />

      {beta.data?.hasActiveBeta && (
        <Section
          title="Beta Fechado"
          description="Gestão operacional do programa de early-access."
        >
          <div className="space-y-6">
            <BetaMetricGrid
              participants={beta.data.metrics.participants}
              activeTickets={beta.data.metrics.activeTickets}
              criticalBugs={beta.data.metrics.criticalBugs}
              feedbackCount={beta.data.metrics.feedbackCount}
            />
            
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <BetaRiskBanner bugs={beta.data.bugs} />
                <BetaModuleGrid />
                <BetaAttentionList items={beta.data.attention} />
              </div>
              <div>
                <BetaTimeline events={beta.data.events} />
              </div>
            </div>
          </div>
        </Section>
      )}

      <Section
        title="Pipeline de Atendimento"
        description="Distribuição de leads e briefings por estágio operacional."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {data?.pipeline.map((stage) => (
            <PipelineBoard
              key={stage.id}
              label={stage.label}
              count={stage.count}
              tone={PIPELINE_TONE[stage.id] ?? "info"}
            />
          ))}
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-10">
          <Section
            title="Atenção Prioritária"
            description="Itens que exigem ação imediata para evitar atrasos."
          >
            <AttentionQueue
              items={attention.data?.items ?? []}
              isLoading={attention.isLoading}
            />
          </Section>

          <Section
            title="Eventos Recentes"
            description="Atividades consolidadas do pipeline nas últimas 24h."
          >
            <InboxList items={data?.inbox ?? []} onOpen={(id) => navigate({ to: `/os/comercial/leads/${id}` })} />
          </Section>
        </div>

        <aside className="space-y-10">
          <Section title="Métricas de Funil">
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-1">
              <MetricCard
                label="Taxa de Conversão"
                value={`${data?.metrics.conversionRate.toFixed(1)}%`}
                trend={data?.metrics.conversionTrend ?? 0}
                icon={Repeat}
              />
              <MetricCard
                label="Tempo Médio de Resposta"
                value={data?.metrics.avgResponseTime ?? "0h"}
                trend={0}
                icon={CalendarClock}
              />
            </div>
          </Section>

          <Section title="Follow-ups">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl border border-border bg-surface">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-warning/10 text-warning">
                    <PhoneIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Aguardando</p>
                    <p className="text-xs text-muted-foreground">{followUps.data?.pending ?? 0} leads para contatar</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/os/comercial/leads" })}>
                  Ver todos
                </Button>
              </div>
            </div>
          </Section>

          <Section title="Operação">
            <div className="grid gap-3">
              {[
                { label: "Propostas Ativas", value: proposals.data?.activeCount ?? 0, icon: Receipt, to: "/os/comercial/leads" },
                { label: "Projetos em Curso", value: projects.data?.activeCount ?? 0, icon: FolderKanban, to: "/os/comercial/projetos" },
                { label: "Clientes Ativos", value: clients.data?.activeCount ?? 0, icon: Building2, to: "/os/comercial/clientes" },
              ].map((it) => (
                <button
                  key={it.label}
                  onClick={() => navigate({ to: it.to as any })}
                  className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <it.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{it.label}</span>
                  </div>
                  <span className="text-sm font-semibold">{it.value}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Logs de Sistema">
            <ActivityList items={data?.activity ?? []} />
          </Section>
        </aside>
      </div>
    </div>
  );
}
