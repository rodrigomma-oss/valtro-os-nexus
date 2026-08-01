/**
 * VOS-001G — Painel operacional do Beta Fechado.
 *
 * Componente estritamente de apresentação: toda derivação vem de
 * `@/lib/os/beta-dashboard`. Não edita entidades — apenas direciona o operador
 * para a entidade de origem (chamado, bug, feedback ou participante).
 */
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  AlertOctagon,
  AlertTriangle,
  Bug,
  ChevronRight,
  Inbox,
  LifeBuoy,
  MessageSquareHeart,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BETA_MODULE_LABEL,
  type BetaAttentionCounts,
  type BetaAttentionItem,
  type BetaAttentionModule,
  type BetaAttentionPriority,
  type BetaMetric,
  type BetaMetricTone,
  type BetaModuleSummary,
  type BetaTimelineItem,
} from "@/lib/os/beta-dashboard";

const TONE: Record<BetaMetricTone, { bg: string; text: string; ring: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary", ring: "ring-primary/20" },
  info: { bg: "bg-info/10", text: "text-info", ring: "ring-info/20" },
  success: { bg: "bg-success/10", text: "text-success", ring: "ring-success/20" },
  warning: { bg: "bg-warning/10", text: "text-warning", ring: "ring-warning/20" },
  danger: { bg: "bg-destructive/10", text: "text-destructive", ring: "ring-destructive/20" },
};

const MODULE_ICON: Record<BetaAttentionModule, LucideIcon> = {
  chamados: LifeBuoy,
  bugs: Bug,
  feedback: MessageSquareHeart,
  participantes: Users,
};

const PRIORITY_LABEL: Record<BetaAttentionPriority, string> = {
  critica: "Crítica",
  atencao: "Atenção",
  normal: "Normal",
};

const PRIORITY_CLASS: Record<BetaAttentionPriority, string> = {
  critica: "border-destructive/30 bg-destructive/10 text-destructive",
  atencao: "border-warning/30 bg-warning/10 text-warning",
  normal: "border-border bg-muted/60 text-muted-foreground",
};

const EVENT_LABEL: Record<string, string> = {
  created: "Registro criado",
  status_changed: "Situação alterada",
  owner_changed: "Responsável alterado",
  priority_changed: "Prioridade alterada",
  severity_changed: "Severidade alterada",
  category_changed: "Categoria alterada",
  note_added: "Observação adicionada",
  commented: "Comentário registrado",
  closed: "Encerrado",
  reopened: "Reaberto",
  confirmed: "Confirmado",
  fixed: "Correção concluída",
  rejected: "Rejeitado",
  accepted: "Aceito",
  planned: "Planejado",
  implemented: "Implementado",
  dismissed: "Descartado",
  invited: "Convite registrado",
  activated: "Ativado",
  deactivated: "Inativado",
  removed: "Removido",
  converted: "Convertido em cliente",
  interest_changed: "Interesse alterado",
  notes_changed: "Observações atualizadas",
  linked_user: "Usuário vinculado",
  linked_to_ticket: "Vinculado a chamado",
  linked_to_bug: "Vinculado a bug",
};

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

// ------------------------------------------------------------------
// Indicadores
// ------------------------------------------------------------------

export function BetaMetricGrid({
  metrics,
  isLoading,
}: {
  metrics: BetaMetric[];
  isLoading?: boolean;
}) {
  if (isLoading && metrics.length === 0) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3" aria-busy>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border border-border bg-surface animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3" data-testid="beta-metrics">
      {metrics.map((m, i) => {
        const t = TONE[m.tone];
        const inner = (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.25 }}
            className={cn(
              "h-full rounded-2xl border border-border bg-surface p-4 shadow-soft transition-colors",
              m.to && "hover:bg-muted/40",
            )}
          >
            <div
              className={cn(
                "grid h-9 w-9 place-items-center rounded-xl ring-1",
                t.bg,
                t.text,
                t.ring,
              )}
            >
              <span className="text-xs font-semibold tabular-nums">{m.value}</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground leading-tight">{m.label}</p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{m.hint}</p>
          </motion.div>
        );
        if (!m.to) return <div key={m.id}>{inner}</div>;
        return (
          <Link
            key={m.id}
            to={m.to}
            className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {inner}
          </Link>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------
// Fila de atenção
// ------------------------------------------------------------------

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-muted-foreground hover:bg-muted/50",
      )}
    >
      {children}
    </button>
  );
}

export function BetaAttentionList({
  items,
  counts,
  isLoading,
}: {
  items: BetaAttentionItem[];
  counts: BetaAttentionCounts;
  isLoading?: boolean;
}) {
  const [module, setModule] = useState<BetaAttentionModule | "todos">("todos");
  const [priority, setPriority] = useState<BetaAttentionPriority | "todas">("todas");

  const visible = useMemo(
    () =>
      items.filter(
        (i) =>
          (module === "todos" || i.module === module) &&
          (priority === "todas" || i.priority === priority),
      ),
    [items, module, priority],
  );

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft" aria-busy>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-soft">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
        <Chip active={module === "todos"} onClick={() => setModule("todos")}>
          Todos · {counts.total}
        </Chip>
        {(Object.keys(BETA_MODULE_LABEL) as BetaAttentionModule[]).map((m) => (
          <Chip key={m} active={module === m} onClick={() => setModule(m)}>
            {BETA_MODULE_LABEL[m]} · {counts.byModule[m]}
          </Chip>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />
        {(["todas", "critica", "atencao", "normal"] as const).map((p) => (
          <Chip key={p} active={priority === p} onClick={() => setPriority(p)}>
            {p === "todas" ? "Todas" : PRIORITY_LABEL[p]}
            {p !== "todas" ? ` · ${counts[p]}` : ""}
          </Chip>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-10 text-center">
          <ShieldCheck className="h-6 w-6 text-success" strokeWidth={1.75} aria-hidden />
          <p className="text-sm font-medium text-foreground">Nada exige atenção agora</p>
          <p className="text-xs text-muted-foreground">
            Nenhuma pendência derivada nos módulos do beta fechado.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border" data-testid="beta-attention-queue">
          {visible.map((item) => {
            const Icon = MODULE_ICON[item.module];
            return (
              <li key={item.key}>
                <Link
                  to={item.to}
                  params={item.params as never}
                  className="flex items-start gap-3 p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                          PRIORITY_CLASS[item.priority],
                        )}
                      >
                        {PRIORITY_LABEL[item.priority]}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">{item.code}</span>
                      <span className="text-xs text-muted-foreground">
                        {BETA_MODULE_LABEL[item.module]}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-foreground">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.reason} · {relative(item.since)}
                    </p>
                  </div>
                  <ChevronRight
                    className="mt-2 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Resumo por módulo
// ------------------------------------------------------------------

export function BetaModuleGrid({ modules }: { modules: BetaModuleSummary[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {modules.map((m) => {
        const Icon = MODULE_ICON[m.id];
        return (
          <Link
            key={m.id}
            to={m.to}
            className="group rounded-2xl border border-border bg-surface p-5 shadow-soft transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </div>
              <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                {m.total}
              </span>
            </div>
            <p className="mt-4 text-sm font-semibold text-foreground">{m.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{m.description}</p>
            <dl className="mt-4 space-y-1.5">
              {m.breakdown.map((b) => (
                <div key={b.label} className="flex items-center justify-between text-xs">
                  <dt className="text-muted-foreground">{b.label}</dt>
                  <dd className={cn("font-semibold tabular-nums", TONE[b.tone].text)}>{b.value}</dd>
                </div>
              ))}
            </dl>
          </Link>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------
// Timeline
// ------------------------------------------------------------------

export function BetaTimeline({
  items,
  isLoading,
}: {
  items: BetaTimelineItem[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft" aria-busy>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-10 text-center shadow-soft">
        <Inbox className="h-6 w-6 text-muted-foreground" strokeWidth={1.75} aria-hidden />
        <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
      </div>
    );
  }

  return (
    <ul
      className="divide-y divide-border rounded-2xl border border-border bg-surface shadow-soft"
      data-testid="beta-timeline"
    >
      {items.map((e) => {
        const Icon = MODULE_ICON[e.module];
        return (
          <li key={`${e.module}:${e.id}`}>
            <Link
              to={e.to}
              params={e.params as never}
              className="flex items-start gap-3 p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">
                  <span className="font-mono text-xs text-muted-foreground">{e.code}</span>{" "}
                  {e.description ?? EVENT_LABEL[e.type] ?? "Evento registrado"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {e.entity_title}
                  {e.actor_name ? ` · ${e.actor_name}` : ""} · {relative(e.created_at)}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// ------------------------------------------------------------------
// Destaque de risco
// ------------------------------------------------------------------

export function BetaRiskBanner({ counts }: { counts: BetaAttentionCounts }) {
  if (counts.total === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/5 p-4">
        <ShieldCheck className="h-5 w-5 text-success" strokeWidth={1.75} aria-hidden />
        <p className="text-sm text-foreground">
          Nenhuma pendência aberta nos módulos do beta fechado.
        </p>
      </div>
    );
  }

  const Icon = counts.critica > 0 ? AlertOctagon : AlertTriangle;
  const tone = counts.critica > 0 ? "destructive" : "warning";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-4",
        tone === "destructive"
          ? "border-destructive/30 bg-destructive/5"
          : "border-warning/30 bg-warning/5",
      )}
    >
      <Icon
        className={cn("h-5 w-5", tone === "destructive" ? "text-destructive" : "text-warning")}
        strokeWidth={1.75}
        aria-hidden
      />
      <p className="text-sm text-foreground">
        {counts.critica > 0
          ? `${counts.critica} pendência(s) crítica(s) e ${counts.total} no total exigem sua atenção no beta fechado.`
          : `${counts.total} pendência(s) aguardam ação no beta fechado.`}
      </p>
    </div>
  );
}
