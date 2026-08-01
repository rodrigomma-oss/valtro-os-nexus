/**
 * VOS-001G — Dashboard Operacional do Beta Fechado.
 *
 * Camada de domínio PURA (sem I/O, sem Supabase, sem React).
 *
 * Princípios invioláveis (herdados da Sprint 13.7 / attention.ts):
 * 1. Nenhuma nova fonte de verdade. Todo indicador, pendência e prioridade é
 *    DERIVADO em runtime do estado real de tickets, bugs, feedback,
 *    participantes do beta e papéis internos. Nada é persistido, agregado em
 *    view/materialized view, cache ou tabela nova.
 * 2. Nenhuma regra financeira: apenas estado operacional já modelado.
 * 3. Uma entidade nunca aparece duplicada pela mesma regra — a chave do item é
 *    `kind:entity_id` e a deduplicação é aplicada no builder.
 * 4. Toda a lógica vive aqui; componentes apenas renderizam; server functions
 *    apenas leem via RLS e delegam a derivação para este módulo.
 */

// ============================================================
// Enums espelhados do banco (fonte: pg_enum)
// ============================================================

export type TicketStatus =
  | "open"
  | "waiting_customer"
  | "waiting_internal"
  | "resolved"
  | "closed"
  | "cancelled";
export type TicketPriority = "low" | "normal" | "high" | "urgent";

export type BugStatusLite =
  | "new"
  | "triage"
  | "confirmed"
  | "in_progress"
  | "in_testing"
  | "waiting_deploy"
  | "fixed"
  | "closed"
  | "wont_fix"
  | "duplicate"
  | "rejected";
export type BugSeverityLite = "low" | "normal" | "high" | "critical" | "blocker";

export type FeedbackStatusLite =
  | "new"
  | "under_review"
  | "accepted"
  | "planned"
  | "implemented"
  | "dismissed"
  | "closed";

export type ParticipantStatusLite =
  | "invited"
  | "accepted"
  | "active"
  | "inactive"
  | "removed"
  | "converted";

// ============================================================
// Conjuntos operacionais (o que ainda consome atenção)
// ============================================================

/** Chamados que continuam na operação (não encerrados nem cancelados). */
export const TICKET_OPEN_STATUSES: TicketStatus[] = [
  "open",
  "waiting_customer",
  "waiting_internal",
  "resolved",
];

/** Bugs que continuam na operação — `fixed` só sai da fila quando fechado. */
export const BUG_OPEN_STATUSES: BugStatusLite[] = [
  "new",
  "triage",
  "confirmed",
  "in_progress",
  "in_testing",
  "waiting_deploy",
  "fixed",
];

/** Feedback que ainda depende de decisão do time. */
export const FEEDBACK_PENDING_STATUSES: FeedbackStatusLite[] = ["new", "under_review"];

/** Feedback já decidido e em roadmap. */
export const FEEDBACK_ROADMAP_STATUSES: FeedbackStatusLite[] = ["accepted", "planned"];

export const BUG_CRITICAL_SEVERITIES: BugSeverityLite[] = ["critical", "blocker"];

// ============================================================
// Entradas cruas (DTOs de leitura — sempre serializáveis)
// ============================================================

export interface RawTicketLite {
  id: string;
  protocol: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RawBugLite {
  id: string;
  code: string;
  title: string;
  status: BugStatusLite;
  severity: BugSeverityLite;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  fixed_at: string | null;
}

export interface RawFeedbackLite {
  id: string;
  code: string;
  title: string;
  status: FeedbackStatusLite;
  owner_id: string | null;
  participant_user_id: string | null;
  participant_email: string | null;
  created_at: string;
}

export interface RawParticipantLite {
  id: string;
  code: string;
  name: string;
  email: string;
  status: ParticipantStatusLite;
  user_id: string | null;
  created_at: string;
  accepted_at: string | null;
  activated_at: string | null;
}

export interface BetaDashboardInput {
  tickets: RawTicketLite[];
  bugs: RawBugLite[];
  feedback: RawFeedbackLite[];
  participants: RawParticipantLite[];
  /** Identificação (e-mail/user_id) de quem já registrou algum feedback. */
  feedbackAuthors: { participant_user_id: string | null; participant_email: string | null }[];
  internalUsers: number;
  now?: string;
}

// ============================================================
// Indicadores
// ============================================================

export type BetaMetricTone = "primary" | "info" | "success" | "warning" | "danger";

export interface BetaMetric {
  id: string;
  label: string;
  value: number;
  hint: string;
  tone: BetaMetricTone;
  /** Rota da entidade de origem — o dashboard nunca é destino final. */
  to?: string;
}

function count<T>(rows: T[], fn: (r: T) => boolean): number {
  let n = 0;
  for (const r of rows) if (fn(r)) n++;
  return n;
}

const isOpenTicket = (t: RawTicketLite) => TICKET_OPEN_STATUSES.includes(t.status);
const isOpenBug = (b: RawBugLite) => BUG_OPEN_STATUSES.includes(b.status);

export function buildBetaMetrics(input: BetaDashboardInput): BetaMetric[] {
  const { tickets, bugs, feedback, participants, internalUsers } = input;

  return [
    {
      id: "chamados_abertos",
      label: "Chamados abertos",
      value: count(tickets, isOpenTicket),
      hint: "Aberto, aguardando ou resolvido sem encerramento",
      tone: "primary",
      to: "/os/atendimento/chamados",
    },
    {
      id: "chamados_sem_responsavel",
      label: "Chamados sem responsável",
      value: count(tickets, (t) => isOpenTicket(t) && !t.owner_id),
      hint: "Nenhum operador assumiu o atendimento",
      tone: "danger",
      to: "/os/atendimento/chamados",
    },
    {
      id: "bugs_abertos",
      label: "Bugs abertos",
      value: count(bugs, isOpenBug),
      hint: "Do registro até o fechamento",
      tone: "warning",
      to: "/os/atendimento/bugs",
    },
    {
      id: "bugs_criticos",
      label: "Bugs críticos abertos",
      value: count(
        bugs,
        (b) => isOpenBug(b) && BUG_CRITICAL_SEVERITIES.includes(b.severity),
      ),
      hint: "Severidade crítica ou bloqueadora",
      tone: "danger",
      to: "/os/atendimento/bugs",
    },
    {
      id: "feedback_pendente",
      label: "Feedback pendente",
      value: count(feedback, (f) => FEEDBACK_PENDING_STATUSES.includes(f.status)),
      hint: "Novo ou em análise",
      tone: "info",
      to: "/os/atendimento/feedback",
    },
    {
      id: "feedback_roadmap",
      label: "Feedback em roadmap",
      value: count(feedback, (f) => FEEDBACK_ROADMAP_STATUSES.includes(f.status)),
      hint: "Aceito ou planejado",
      tone: "success",
      to: "/os/atendimento/feedback",
    },
    {
      id: "participantes_ativos",
      label: "Participantes ativos",
      value: count(participants, (p) => p.status === "active"),
      hint: "Usando o beta fechado",
      tone: "success",
      to: "/os/produtos/valtro-pricing/beta",
    },
    {
      id: "participantes_convidados",
      label: "Convites sem aceite",
      value: count(participants, (p) => p.status === "invited"),
      hint: "Convidados que ainda não aceitaram",
      tone: "warning",
      to: "/os/produtos/valtro-pricing/beta",
    },
    {
      id: "participantes_convertidos",
      label: "Convertidos em clientes",
      value: count(participants, (p) => p.status === "converted"),
      hint: "Resultado comercial do beta",
      tone: "primary",
      to: "/os/produtos/valtro-pricing/beta",
    },
    {
      id: "usuarios_internos",
      label: "Usuários internos",
      value: internalUsers,
      hint: "Com papel atribuído no Valtro OS",
      tone: "info",
      to: "/os/admin/usuarios",
    },
  ];
}

// ============================================================
// Fila de atenção operacional (cross-módulo)
// ============================================================

export type BetaAttentionPriority = "critica" | "atencao" | "normal";
export type BetaAttentionModule = "chamados" | "bugs" | "feedback" | "participantes";

export type BetaAttentionKind =
  | "ticket_sem_responsavel"
  | "ticket_urgente_aberto"
  | "ticket_parado"
  | "bug_critico_aberto"
  | "bug_sem_triagem"
  | "bug_corrigido_sem_fechamento"
  | "feedback_sem_analise"
  | "participante_convite_sem_aceite"
  | "participante_ativo_sem_feedback";

export interface BetaAttentionItem {
  key: string;
  kind: BetaAttentionKind;
  module: BetaAttentionModule;
  priority: BetaAttentionPriority;
  code: string;
  title: string;
  reason: string;
  /** Rota TanStack da entidade de origem. */
  to: string;
  params: Record<string, string>;
  /** Momento a partir do qual a pendência é contada. */
  since: string;
}

export interface BetaAttentionCounts {
  total: number;
  critica: number;
  atencao: number;
  normal: number;
  byModule: Record<BetaAttentionModule, number>;
}

const DAY_MS = 86_400_000;

export function daysSince(iso: string | null | undefined, now: number): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((now - t) / DAY_MS));
}

const PRIORITY_WEIGHT: Record<BetaAttentionPriority, number> = {
  critica: 0,
  atencao: 1,
  normal: 2,
};

export function buildBetaAttentionQueue(input: BetaDashboardInput): BetaAttentionItem[] {
  const now = new Date(input.now ?? new Date().toISOString()).getTime();
  const items: BetaAttentionItem[] = [];
  const push = (item: BetaAttentionItem) => {
    if (items.some((i) => i.key === item.key)) return;
    items.push(item);
  };

  // ---- Chamados ------------------------------------------------
  for (const t of input.tickets) {
    if (!isOpenTicket(t)) continue;
    const urgent = t.priority === "urgent" || t.priority === "high";

    if (!t.owner_id) {
      push({
        key: `ticket_sem_responsavel:${t.id}`,
        kind: "ticket_sem_responsavel",
        module: "chamados",
        priority: urgent ? "critica" : "atencao",
        code: t.protocol,
        title: t.title,
        reason: "Chamado aberto sem responsável definido",
        to: "/os/atendimento/chamados/$id",
        params: { id: t.id },
        since: t.created_at,
      });
      continue;
    }

    if (t.priority === "urgent" && t.status !== "resolved") {
      push({
        key: `ticket_urgente_aberto:${t.id}`,
        kind: "ticket_urgente_aberto",
        module: "chamados",
        priority: "critica",
        code: t.protocol,
        title: t.title,
        reason: "Chamado urgente ainda em aberto",
        to: "/os/atendimento/chamados/$id",
        params: { id: t.id },
        since: t.created_at,
      });
      continue;
    }

    if (t.status === "waiting_internal" && daysSince(t.updated_at, now) >= 3) {
      push({
        key: `ticket_parado:${t.id}`,
        kind: "ticket_parado",
        module: "chamados",
        priority: "atencao",
        code: t.protocol,
        title: t.title,
        reason: "Aguardando ação interna há 3 dias ou mais",
        to: "/os/atendimento/chamados/$id",
        params: { id: t.id },
        since: t.updated_at,
      });
    }
  }

  // ---- Bugs ----------------------------------------------------
  for (const b of input.bugs) {
    if (!isOpenBug(b)) continue;

    if (BUG_CRITICAL_SEVERITIES.includes(b.severity) && b.status !== "fixed") {
      push({
        key: `bug_critico_aberto:${b.id}`,
        kind: "bug_critico_aberto",
        module: "bugs",
        priority: "critica",
        code: b.code,
        title: b.title,
        reason: "Bug crítico sem correção concluída",
        to: "/os/atendimento/bugs/$id",
        params: { id: b.id },
        since: b.created_at,
      });
      continue;
    }

    if (b.status === "new" && daysSince(b.created_at, now) >= 1) {
      push({
        key: `bug_sem_triagem:${b.id}`,
        kind: "bug_sem_triagem",
        module: "bugs",
        priority: "atencao",
        code: b.code,
        title: b.title,
        reason: "Registrado há mais de 1 dia sem triagem",
        to: "/os/atendimento/bugs/$id",
        params: { id: b.id },
        since: b.created_at,
      });
      continue;
    }

    if (b.status === "fixed" && daysSince(b.fixed_at ?? b.updated_at, now) >= 7) {
      push({
        key: `bug_corrigido_sem_fechamento:${b.id}`,
        kind: "bug_corrigido_sem_fechamento",
        module: "bugs",
        priority: "normal",
        code: b.code,
        title: b.title,
        reason: "Corrigido há 7 dias ou mais sem fechamento",
        to: "/os/atendimento/bugs/$id",
        params: { id: b.id },
        since: b.fixed_at ?? b.updated_at,
      });
    }
  }

  // ---- Feedback ------------------------------------------------
  for (const f of input.feedback) {
    if (f.status !== "new") continue;
    if (daysSince(f.created_at, now) < 3) continue;
    push({
      key: `feedback_sem_analise:${f.id}`,
      kind: "feedback_sem_analise",
      module: "feedback",
      priority: "atencao",
      code: f.code,
      title: f.title,
      reason: "Feedback sem análise há 3 dias ou mais",
      to: "/os/atendimento/feedback/$id",
      params: { id: f.id },
      since: f.created_at,
    });
  }

  // ---- Participantes ------------------------------------------
  const authorEmails = new Set(
    input.feedbackAuthors
      .map((a) => a.participant_email?.toLowerCase())
      .filter(Boolean) as string[],
  );
  const authorUserIds = new Set(
    input.feedbackAuthors.map((a) => a.participant_user_id).filter(Boolean) as string[],
  );

  for (const p of input.participants) {
    if (p.status === "invited" && daysSince(p.created_at, now) >= 7) {
      push({
        key: `participante_convite_sem_aceite:${p.id}`,
        kind: "participante_convite_sem_aceite",
        module: "participantes",
        priority: "atencao",
        code: p.code,
        title: p.name,
        reason: "Convite sem aceite há 7 dias ou mais",
        to: "/os/produtos/valtro-pricing/beta/$id",
        params: { id: p.id },
        since: p.created_at,
      });
      continue;
    }

    if (p.status === "active") {
      const gaveFeedback =
        authorEmails.has(p.email.toLowerCase()) ||
        (p.user_id ? authorUserIds.has(p.user_id) : false);
      const since = p.activated_at ?? p.accepted_at ?? p.created_at;
      if (!gaveFeedback && daysSince(since, now) >= 14) {
        push({
          key: `participante_ativo_sem_feedback:${p.id}`,
          kind: "participante_ativo_sem_feedback",
          module: "participantes",
          priority: "normal",
          code: p.code,
          title: p.name,
          reason: "Ativo há 14 dias ou mais sem feedback registrado",
          to: "/os/produtos/valtro-pricing/beta/$id",
          params: { id: p.id },
          since,
        });
      }
    }
  }

  return items.sort((a, b) => {
    const w = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (w !== 0) return w;
    return new Date(a.since).getTime() - new Date(b.since).getTime();
  });
}

export function countBetaAttention(items: BetaAttentionItem[]): BetaAttentionCounts {
  const counts: BetaAttentionCounts = {
    total: items.length,
    critica: 0,
    atencao: 0,
    normal: 0,
    byModule: { chamados: 0, bugs: 0, feedback: 0, participantes: 0 },
  };
  for (const i of items) {
    counts[i.priority] += 1;
    counts.byModule[i.module] += 1;
  }
  return counts;
}

// ============================================================
// Resumo por módulo
// ============================================================

export interface BetaModuleSummary {
  id: BetaAttentionModule;
  label: string;
  description: string;
  to: string;
  total: number;
  breakdown: { label: string; value: number; tone: BetaMetricTone }[];
}

export function buildBetaModuleSummaries(input: BetaDashboardInput): BetaModuleSummary[] {
  const { tickets, bugs, feedback, participants } = input;

  return [
    {
      id: "chamados",
      label: "Chamados",
      description: "Atendimento aos participantes do beta.",
      to: "/os/atendimento/chamados",
      total: count(tickets, isOpenTicket),
      breakdown: [
        { label: "Abertos", value: count(tickets, (t) => t.status === "open"), tone: "primary" },
        {
          label: "Aguardando cliente",
          value: count(tickets, (t) => t.status === "waiting_customer"),
          tone: "warning",
        },
        {
          label: "Aguardando interno",
          value: count(tickets, (t) => t.status === "waiting_internal"),
          tone: "info",
        },
        {
          label: "Resolvidos",
          value: count(tickets, (t) => t.status === "resolved"),
          tone: "success",
        },
      ],
    },
    {
      id: "bugs",
      label: "Bugs",
      description: "Defeitos reportados no produto.",
      to: "/os/atendimento/bugs",
      total: count(bugs, isOpenBug),
      breakdown: [
        { label: "Novos", value: count(bugs, (b) => b.status === "new"), tone: "info" },
        {
          label: "Em triagem",
          value: count(bugs, (b) => b.status === "triage" || b.status === "confirmed"),
          tone: "warning",
        },
        {
          label: "Em correção",
          value: count(
            bugs,
            (b) =>
              b.status === "in_progress" ||
              b.status === "in_testing" ||
              b.status === "waiting_deploy",
          ),
          tone: "primary",
        },
        {
          label: "Corrigidos",
          value: count(bugs, (b) => b.status === "fixed"),
          tone: "success",
        },
      ],
    },
    {
      id: "feedback",
      label: "Feedback",
      description: "Percepção de valor e pedidos dos participantes.",
      to: "/os/atendimento/feedback",
      total: count(feedback, (f) => FEEDBACK_PENDING_STATUSES.includes(f.status)),
      breakdown: [
        { label: "Novos", value: count(feedback, (f) => f.status === "new"), tone: "info" },
        {
          label: "Em análise",
          value: count(feedback, (f) => f.status === "under_review"),
          tone: "warning",
        },
        {
          label: "Aceitos",
          value: count(feedback, (f) => f.status === "accepted"),
          tone: "success",
        },
        {
          label: "Planejados",
          value: count(feedback, (f) => f.status === "planned"),
          tone: "primary",
        },
      ],
    },
    {
      id: "participantes",
      label: "Participantes",
      description: "Base do beta fechado do Valtro Pricing.",
      to: "/os/produtos/valtro-pricing/beta",
      total: count(participants, (p) => p.status === "active"),
      breakdown: [
        {
          label: "Convidados",
          value: count(participants, (p) => p.status === "invited"),
          tone: "warning",
        },
        {
          label: "Aceitos",
          value: count(participants, (p) => p.status === "accepted"),
          tone: "info",
        },
        {
          label: "Ativos",
          value: count(participants, (p) => p.status === "active"),
          tone: "success",
        },
        {
          label: "Convertidos",
          value: count(participants, (p) => p.status === "converted"),
          tone: "primary",
        },
      ],
    },
  ];
}

// ============================================================
// Timeline consolidada (eventos append-only já existentes)
// ============================================================

export interface RawBetaEvent {
  id: string;
  module: BetaAttentionModule;
  entity_id: string;
  type: string;
  description: string | null;
  created_at: string;
  actor_name: string | null;
}

export interface BetaTimelineItem extends RawBetaEvent {
  code: string;
  entity_title: string;
  to: string;
  params: Record<string, string>;
}

const MODULE_ROUTE: Record<BetaAttentionModule, string> = {
  chamados: "/os/atendimento/chamados/$id",
  bugs: "/os/atendimento/bugs/$id",
  feedback: "/os/atendimento/feedback/$id",
  participantes: "/os/produtos/valtro-pricing/beta/$id",
};

export const BETA_MODULE_LABEL: Record<BetaAttentionModule, string> = {
  chamados: "Chamados",
  bugs: "Bugs",
  feedback: "Feedback",
  participantes: "Participantes",
};

/**
 * Une eventos de vários módulos em uma única timeline ordenada, resolvendo
 * código e título da entidade a partir de um índice já carregado em memória
 * (sem consulta por linha).
 */
export function mergeBetaTimeline(
  events: RawBetaEvent[],
  index: Record<string, { code: string; title: string } | undefined>,
  limit = 20,
): BetaTimelineItem[] {
  return events
    .filter((e) => index[e.entity_id])
    .map((e) => {
      const ref = index[e.entity_id]!;
      return {
        ...e,
        code: ref.code,
        entity_title: ref.title,
        to: MODULE_ROUTE[e.module],
        params: { id: e.entity_id },
      };
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

// ============================================================
// Agregado final
// ============================================================

export interface BetaOperationalOverview {
  metrics: BetaMetric[];
  attention: BetaAttentionItem[];
  counts: BetaAttentionCounts;
  modules: BetaModuleSummary[];
  timeline: BetaTimelineItem[];
  generated_at: string;
}

export function buildBetaOverview(
  input: BetaDashboardInput,
  timeline: BetaTimelineItem[],
): BetaOperationalOverview {
  const attention = buildBetaAttentionQueue(input);
  return {
    metrics: buildBetaMetrics(input),
    attention,
    counts: countBetaAttention(attention),
    modules: buildBetaModuleSummaries(input),
    timeline,
    generated_at: input.now ?? new Date().toISOString(),
  };
}
