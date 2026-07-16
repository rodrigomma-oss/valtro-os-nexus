import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app/page-header";
import { OperationHero } from "@/components/app/operations/operation-hero";
import { QueueCard } from "@/components/app/operations/queue-card";
import { OperationInbox } from "@/components/app/operations/operation-inbox";
import { PipelineBoard } from "@/components/app/operations/pipeline-board";
import { ActivityTimeline } from "@/components/app/operations/activity-timeline";
import { AgendaCard } from "@/components/app/operations/agenda-card";
import { MetricCard } from "@/components/app/operations/metric-card";
import {
  operationSummary,
  queueCards,
  inboxItems,
  pipeline,
  activities,
  agenda,
  metrics,
} from "@/mocks/operations";
import { getLeadsKpis } from "@/lib/leads.functions";

export const Route = createFileRoute("/_authenticated/crm/dashboard")({
  component: CrmDashboard,
  head: () => ({
    meta: [
      { title: "Centro de Operações — Valtro Labs" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

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
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function CrmDashboard() {
  return (
    <div className="p-6 md:p-10 space-y-12 max-w-[1400px] mx-auto">
      <PageHeader
        title="Centro de Operações"
        description="O que precisa da sua atenção agora — priorizado pela nossa metodologia consultiva."
      />

      <OperationHero summary={operationSummary} />

      <Section
        title="Minha fila"
        description="Prioridades operacionais do time comercial para o turno atual."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {queueCards.map((c, i) => (
            <QueueCard
              key={c.id}
              title={c.title}
              value={c.value}
              description={c.description}
              icon={c.icon}
              tone={c.tone}
              index={i}
            />
          ))}
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Section
            title="Inbox operacional"
            description="Eventos que aguardam uma decisão sua."
          >
            <OperationInbox items={inboxItems} />
          </Section>
        </div>
        <div>
          <Section title="Agenda do dia" description="Compromissos e follow-ups programados.">
            <AgendaCard events={agenda} />
          </Section>
        </div>
      </div>

      <Section
        title="Pipeline comercial"
        description="Distribuição de leads por etapa do funil consultivo."
      >
        <PipelineBoard stages={pipeline} />
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Section
            title="Últimas atividades"
            description="Movimentações recentes registradas pelo time."
          >
            <div className="rounded-2xl border border-border bg-surface shadow-soft p-6">
              <ActivityTimeline items={activities} />
            </div>
          </Section>
        </div>
        <div>
          <Section title="Indicadores" description="Leitura rápida da semana.">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              {metrics.map((m, i) => (
                <MetricCard
                  key={m.id}
                  label={m.label}
                  value={m.value}
                  hint={m.hint}
                  trend={m.trend}
                  index={i}
                />
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
