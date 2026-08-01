/**
 * VOS-001G — Leitura operacional do Beta Fechado (server-only).
 *
 * Estratégia de consulta (auditada para evitar N+1):
 * - 5 consultas de largura fixa para o estado das entidades (tickets, bugs,
 *   feedback, participantes, papéis internos) + 4 consultas de eventos
 *   limitadas, todas executadas em paralelo.
 * - Nenhuma consulta por item/linha: a correlação (evento → entidade,
 *   participante → feedback) é feita em memória via Map/Set.
 * - Nenhuma view, materialized view, RPC, cache ou tabela nova: os indicadores
 *   são derivados em runtime em `@/lib/os/beta-dashboard`.
 *
 * RLS: todas as leituras usam o client da sessão (`context.supabase`), portanto
 * `viewer` permanece somente leitura e nada é exposto publicamente. Nenhuma
 * leitura usa service_role.
 */
import {
  buildBetaOverview,
  mergeBetaTimeline,
  type BetaDashboardInput,
  type BetaOperationalOverview,
  type RawBetaEvent,
  type RawBugLite,
  type RawFeedbackLite,
  type RawParticipantLite,
  type RawTicketLite,
} from "@/lib/os/beta-dashboard";

const TICKET_SELECT = "id, protocol, title, status, priority, owner_id, created_at, updated_at";
const BUG_SELECT =
  "id, code, title, status, severity, owner_id, created_at, updated_at, fixed_at";
const FEEDBACK_SELECT =
  "id, code, title, status, owner_id, participant_user_id, participant_email, created_at";
const PARTICIPANT_SELECT =
  "id, code, name, email, status, user_id, created_at, accepted_at, activated_at";

const EVENT_LIMIT = 15;

type AnyClient = {
  from: (table: string) => any;
};

export async function readBetaOverview(supabase: AnyClient): Promise<BetaOperationalOverview> {
  const [tickets, bugs, feedback, participants, roles] = await Promise.all([
    supabase.from("tickets").select(TICKET_SELECT).order("created_at", { ascending: false }).limit(500),
    supabase.from("bugs").select(BUG_SELECT).order("created_at", { ascending: false }).limit(500),
    supabase.from("feedback").select(FEEDBACK_SELECT).order("created_at", { ascending: false }).limit(500),
    supabase
      .from("beta_participants")
      .select(PARTICIPANT_SELECT)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("user_roles").select("user_id"),
  ]);

  const firstError = [tickets, bugs, feedback, participants, roles].find((r: any) => r.error);
  if (firstError?.error) throw new Error(firstError.error.message);

  const ticketRows = (tickets.data ?? []) as RawTicketLite[];
  const bugRows = (bugs.data ?? []) as RawBugLite[];
  const feedbackRows = (feedback.data ?? []) as RawFeedbackLite[];
  const participantRows = (participants.data ?? []) as RawParticipantLite[];
  const internalUsers = new Set(((roles.data ?? []) as { user_id: string }[]).map((r) => r.user_id))
    .size;

  const input: BetaDashboardInput = {
    tickets: ticketRows,
    bugs: bugRows,
    feedback: feedbackRows,
    participants: participantRows,
    feedbackAuthors: feedbackRows.map((f) => ({
      participant_user_id: f.participant_user_id,
      participant_email: f.participant_email,
    })),
    internalUsers,
    now: new Date().toISOString(),
  };

  const timeline = await readBetaTimeline(supabase, input);
  return buildBetaOverview(input, timeline);
}

async function readBetaTimeline(supabase: AnyClient, input: BetaDashboardInput) {
  const [ticketEvents, bugEvents, feedbackEvents, participantEvents] = await Promise.all([
    supabase
      .from("ticket_events")
      .select("id, ticket_id, type, description, created_by, created_at")
      .order("created_at", { ascending: false })
      .limit(EVENT_LIMIT),
    supabase
      .from("bug_events")
      .select("id, bug_id, type, description, created_by, created_at")
      .order("created_at", { ascending: false })
      .limit(EVENT_LIMIT),
    supabase
      .from("feedback_events")
      .select("id, feedback_id, event_type, actor_id, created_at")
      .order("created_at", { ascending: false })
      .limit(EVENT_LIMIT),
    supabase
      .from("beta_participant_events")
      .select("id, beta_participant_id, type, description, created_by, created_at")
      .order("created_at", { ascending: false })
      .limit(EVENT_LIMIT),
  ]);

  const raw: RawBetaEvent[] = [
    ...((ticketEvents.data ?? []) as any[]).map((e) => ({
      id: e.id,
      module: "chamados" as const,
      entity_id: e.ticket_id,
      type: e.type,
      description: e.description ?? null,
      created_at: e.created_at,
      actor_name: null,
      actor_id: e.created_by as string | null,
    })),
    ...((bugEvents.data ?? []) as any[]).map((e) => ({
      id: e.id,
      module: "bugs" as const,
      entity_id: e.bug_id,
      type: e.type,
      description: e.description ?? null,
      created_at: e.created_at,
      actor_name: null,
      actor_id: e.created_by as string | null,
    })),
    ...((feedbackEvents.data ?? []) as any[]).map((e) => ({
      id: e.id,
      module: "feedback" as const,
      entity_id: e.feedback_id,
      type: e.event_type,
      description: null,
      created_at: e.created_at,
      actor_name: null,
      actor_id: e.actor_id as string | null,
    })),
    ...((participantEvents.data ?? []) as any[]).map((e) => ({
      id: e.id,
      module: "participantes" as const,
      entity_id: e.beta_participant_id,
      type: e.type,
      description: e.description ?? null,
      created_at: e.created_at,
      actor_name: null,
      actor_id: e.created_by as string | null,
    })),
  ];

  // Índice de entidades já carregadas — evita qualquer consulta por evento.
  const index: Record<string, { code: string; title: string } | undefined> = {};
  for (const t of input.tickets) index[t.id] = { code: t.protocol, title: t.title };
  for (const b of input.bugs) index[b.id] = { code: b.code, title: b.title };
  for (const f of input.feedback) index[f.id] = { code: f.code, title: f.title };
  for (const p of input.participants) index[p.id] = { code: p.code, title: p.name };

  const actorIds = Array.from(
    new Set(raw.map((e: any) => e.actor_id).filter(Boolean) as string[]),
  );
  let actorNames: Record<string, string | null> = {};
  if (actorIds.length > 0) {
    const { data } = await supabase.from("profiles").select("id, full_name").in("id", actorIds);
    actorNames = Object.fromEntries(((data ?? []) as any[]).map((p) => [p.id, p.full_name]));
  }

  const withActors = raw.map((e: any) => ({
    ...e,
    actor_name: e.actor_id ? actorNames[e.actor_id] ?? null : null,
  })) as RawBetaEvent[];

  return mergeBetaTimeline(withActors, index, 20);
}
