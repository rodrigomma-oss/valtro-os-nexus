/**
 * Sprint 13.7 — Centro de Operações V2.
 *
 * Módulo de domínio (puro, sem I/O) que deriva a fila "Atenção necessária"
 * a partir do estado real das entidades já existentes.
 *
 * Princípios invioláveis desta camada:
 * 1. Nenhuma nova fonte de verdade. Nada é persistido: prioridade, pendência
 *    e tempo em situação são SEMPRE derivados em runtime.
 * 2. Nenhuma regra financeira (MRR, receita, inadimplência) — apenas estado
 *    operacional já definido nas sprints 1–13.6.
 * 3. Uma entidade nunca aparece duplicada pela mesma regra: a chave do item é
 *    `kind:entity_id`, e a deduplicação é aplicada no builder.
 * 4. Toda a lógica de prioridade vive aqui — componentes apenas renderizam.
 */

// ============================================================
// Tipos
// ============================================================

export type AttentionCategory =
  | "leads"
  | "propostas"
  | "onboarding"
  | "projetos"
  | "contratacoes"
  | "ciclos";

export type AttentionPriority = "critica" | "atencao" | "normal";

export type AttentionKind =
  | "lead_novo_sem_triagem"
  | "lead_em_triagem"
  | "lead_aguardando_briefing"
  | "lead_briefing_enviado"
  | "briefing_aguardando_analise"
  | "proposta_em_negociacao"
  | "proposta_aprovada_sem_contratacao"
  | "contratacao_pendente"
  | "onboarding_concluido_ativar_contratacao"
  | "contratacao_pausada"
  | "onboarding_pendente"
  | "onboarding_em_preenchimento"
  | "projeto_aguardando_cliente"
  | "projeto_atrasado"
  | "ciclo_ativo"
  | "ciclo_previsto_nao_iniciado"
  | "recorrente_sem_proximo_ciclo";

export interface AttentionCta {
  label: string;
  /** Rota TanStack de destino (entidade original). */
  to: string;
  params?: Record<string, string>;
  /**
   * Sprint 13.9 (P1-3) — deep-link para a contratação exata dentro da página
   * do cliente (`?cs=<client_service_id>`), preservando o contexto do item.
   */
  search?: Record<string, string>;
}


export interface AttentionItem {
  /** `kind:entity_id` — garante unicidade por regra + entidade. */
  id: string;
  kind: AttentionKind;
  category: AttentionCategory;
  /** Tipo da pendência (rótulo curto). */
  label: string;
  /** Cliente ou Lead relacionado. */
  subject: string;
  /** Serviço / projeto / proposta relacionado, quando aplicável. */
  detail: string | null;
  /** Desde quando a entidade está nesta situação (ISO). */
  since: string;
  priority: AttentionPriority;
  cta: AttentionCta;
}

export const ATTENTION_CATEGORY_LABEL: Record<AttentionCategory, string> = {
  leads: "Leads",
  propostas: "Propostas",
  onboarding: "Onboarding",
  projetos: "Projetos",
  contratacoes: "Contratações",
  ciclos: "Ciclos",
};

export const ATTENTION_PRIORITY_LABEL: Record<AttentionPriority, string> = {
  critica: "Crítica",
  atencao: "Atenção",
  normal: "Normal",
};

export const ATTENTION_PRIORITY_TONE: Record<AttentionPriority, string> = {
  critica: "bg-destructive/10 text-destructive border-destructive/20",
  atencao: "bg-warning/10 text-warning border-warning/20",
  normal: "bg-info/10 text-info border-info/20",
};

const PRIORITY_WEIGHT: Record<AttentionPriority, number> = {
  critica: 0,
  atencao: 1,
  normal: 2,
};

export const ATTENTION_CATEGORY_ORDER: AttentionCategory[] = [
  "leads",
  "propostas",
  "contratacoes",
  "onboarding",
  "projetos",
  "ciclos",
];

// ============================================================
// Entradas cruas (DTOs do banco, apenas as colunas necessárias)
// ============================================================

export interface RawLead {
  id: string;
  company_name: string;
  contact_name: string | null;
  status: string;
  updated_at: string;
  created_at: string;
}

export interface RawProposal {
  id: string;
  lead_id: string;
  number: string;
  title: string;
  status: string;
  valid_until: string | null;
  updated_at: string;
  created_at: string;
}

export interface RawClient {
  id: string;
  company_name: string;
}

export interface RawProject {
  id: string;
  client_id: string;
  code: string | null;
  name: string;
  status: string;
  due_date: string | null;
  updated_at: string;
}

export interface RawClientService {
  id: string;
  client_id: string;
  name_snapshot: string;
  status: string;
  billing_type_snapshot: string;
  billing_interval_snapshot: string | null;
  contracted_at: string;
  started_at: string | null;
  updated_at: string;
}

export interface RawOnboarding {
  id: string;
  client_service_id: string;
  status: string;
  updated_at: string;
  created_at: string;
}

export interface RawCycle {
  id: string;
  client_service_id: string;
  sequence: number;
  period_start: string;
  period_end: string;
  status: string;
  updated_at: string;
}

export interface AttentionSource {
  leads: readonly RawLead[];
  proposals: readonly RawProposal[];
  clients: readonly RawClient[];
  projects: readonly RawProject[];
  clientServices: readonly RawClientService[];
  onboardings: readonly RawOnboarding[];
  cycles: readonly RawCycle[];
  /** `proposal_id` das propostas que já geraram contratação. */
  contractedProposalIds: readonly string[];
  /** Referência temporal (injetável para testes determinísticos). */
  now?: Date;
}

// ============================================================
// Helpers de tempo — sem fuso, sem dependência externa
// ============================================================

export function daysSince(iso: string, now: Date): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((now.getTime() - then) / 86_400_000));
}

/** `true` quando a data (YYYY-MM-DD ou ISO) já passou em relação a `now`. */
export function isPast(dateISO: string | null, now: Date): boolean {
  if (!dateISO) return false;
  const ts = new Date(dateISO.length === 10 ? `${dateISO}T23:59:59` : dateISO).getTime();
  if (Number.isNaN(ts)) return false;
  return ts < now.getTime();
}

/** Escala de prioridade por tempo em situação (regra objetiva e central). */
function byAge(days: number, criticalAt: number, warnAt: number): AttentionPriority {
  if (days >= criticalAt) return "critica";
  if (days >= warnAt) return "atencao";
  return "normal";
}

// ============================================================
// Builder
// ============================================================

export function buildAttentionQueue(source: AttentionSource): AttentionItem[] {
  const now = source.now ?? new Date();
  const items: AttentionItem[] = [];

  const clientName = new Map(source.clients.map((c) => [c.id, c.company_name]));
  const leadName = new Map(source.leads.map((l) => [l.id, l.company_name]));
  const contracted = new Set(source.contractedProposalIds);

  const push = (item: AttentionItem) => items.push(item);

  // ---------- Leads ----------
  // Sprint 13.10 (P1-2): estágios iniciais do lead entram na fila operacional
  // para que não dependam exclusivamente dos cards legados do dashboard.
  //
  // Invariantes desta seção:
  // - O `switch` sobre `status` garante NO MÁXIMO uma regra por lead (sem
  //   duplicidade e sem concorrência entre regras).
  // - Nenhum SLA é inventado: a prioridade é derivada apenas do tempo em
  //   situação (`byAge`), que já é o critério central desta camada.
  // - Ao avançar de estado (ex.: `novo` → `contato`), o `status` deixa de casar
  //   com a regra anterior e a pendência desaparece automaticamente.
  for (const lead of source.leads) {
    const leadCta = (label: string): AttentionCta => ({
      label,
      to: "/crm/leads/$id",
      params: { id: lead.id },
    });

    switch (lead.status) {
      case "novo": {
        // Referência = criação: o que importa é o tempo sem triagem.
        const days = daysSince(lead.created_at, now);
        push({
          id: `lead_novo_sem_triagem:${lead.id}`,
          kind: "lead_novo_sem_triagem",
          category: "leads",
          label: "Lead novo aguardando triagem",
          subject: lead.company_name,
          detail: lead.contact_name,
          since: lead.created_at,
          priority: byAge(days, 2, 1),
          cta: leadCta("Triar lead"),
        });
        break;
      }
      case "em_triagem": {
        const days = daysSince(lead.updated_at, now);
        push({
          id: `lead_em_triagem:${lead.id}`,
          kind: "lead_em_triagem",
          category: "leads",
          label: "Triagem em aberto",
          subject: lead.company_name,
          detail: lead.contact_name,
          since: lead.updated_at,
          priority: byAge(days, 5, 2),
          cta: leadCta("Concluir triagem"),
        });
        break;
      }
      case "aguardando_briefing": {
        const days = daysSince(lead.updated_at, now);
        push({
          id: `lead_aguardando_briefing:${lead.id}`,
          kind: "lead_aguardando_briefing",
          category: "leads",
          label: "Aguardando envio do briefing",
          subject: lead.company_name,
          detail: lead.contact_name,
          since: lead.updated_at,
          priority: byAge(days, 3, 1),
          cta: leadCta("Enviar briefing"),
        });
        break;
      }
      case "briefing_enviado": {
        const days = daysSince(lead.updated_at, now);
        push({
          id: `lead_briefing_enviado:${lead.id}`,
          kind: "lead_briefing_enviado",
          category: "leads",
          label: "Briefing enviado aguardando cliente",
          subject: lead.company_name,
          detail: lead.contact_name,
          since: lead.updated_at,
          priority: byAge(days, 7, 3),
          cta: leadCta("Acompanhar briefing"),
        });
        break;
      }
      case "em_analise": {
        const days = daysSince(lead.updated_at, now);
        push({
          id: `briefing_aguardando_analise:${lead.id}`,
          kind: "briefing_aguardando_analise",
          category: "leads",
          label: "Briefing recebido aguardando análise",
          subject: lead.company_name,
          detail: lead.contact_name,
          since: lead.updated_at,
          priority: byAge(days, 3, 1),
          cta: leadCta("Ver briefing"),
        });
        break;
      }
      default:
        break;
    }
  }

  // ---------- Propostas ----------
  for (const p of source.proposals) {
    const subject = leadName.get(p.lead_id) ?? "Lead";
    const days = daysSince(p.updated_at, now);

    if (p.status === "em_negociacao" || p.status === "enviada") {
      const expired = isPast(p.valid_until, now);
      push({
        id: `proposta_em_negociacao:${p.id}`,
        kind: "proposta_em_negociacao",
        category: "propostas",
        label: p.status === "enviada" ? "Proposta enviada sem retorno" : "Proposta em negociação",
        subject,
        detail: `${p.number} · ${p.title}`,
        since: p.updated_at,
        priority: expired ? "critica" : byAge(days, 14, 7),
        // Deep-link: abre a proposta correta já no drawer (sem procurar na lista).
        cta: {
          label: "Ver proposta",
          to: "/crm/leads/$id",
          params: { id: p.lead_id },
          search: { proposta: p.id },
        },
      });
      continue;
    }

    if (p.status === "aprovada" && !contracted.has(p.id)) {
      push({
        id: `proposta_aprovada_sem_contratacao:${p.id}`,
        kind: "proposta_aprovada_sem_contratacao",
        category: "propostas",
        label: "Proposta aprovada sem contratação",
        subject,
        detail: `${p.number} · ${p.title}`,
        since: p.updated_at,
        priority: days >= 2 ? "critica" : "atencao",
        // Sprint 13.10 (P1-5): o CTA leva à proposta correta com o drawer aberto
        // e o fluxo "Gerar contratações" em contexto. Nada é gerado
        // automaticamente — a confirmação segue manual e explícita.
        cta: {
          label: "Gerar contratações",
          to: "/crm/leads/$id",
          params: { id: p.lead_id },
          search: { proposta: p.id, acao: "contratacoes" },
        },
      });
    }
  }

  // ---------- Contratações ----------
  const onboardingsByService = new Map<string, RawOnboarding[]>();
  for (const o of source.onboardings) {
    const list = onboardingsByService.get(o.client_service_id) ?? [];
    list.push(o);
    onboardingsByService.set(o.client_service_id, list);
  }
  const cyclesByService = new Map<string, RawCycle[]>();
  for (const c of source.cycles) {
    const list = cyclesByService.get(c.client_service_id) ?? [];
    list.push(c);
    cyclesByService.set(c.client_service_id, list);
  }

  for (const cs of source.clientServices) {
    const subject = clientName.get(cs.client_id) ?? "Cliente";
    const days = daysSince(cs.updated_at, now);
    const serviceOnboardings = onboardingsByService.get(cs.id) ?? [];
    const cta: AttentionCta = {
      label: "Ver contratação",
      to: "/crm/clientes/$id",
      params: { id: cs.client_id },
      search: { cs: cs.id },
    };

    if (cs.status === "pendente") {
      // P1-7: quando o cliente já concluiu o onboarding, a pendência deixa de
      // ser "aguardando informações" e passa a ser uma ação do operador.
      const onboardingDone = serviceOnboardings.find((o) => o.status === "concluido");
      if (onboardingDone) {
        const dDays = daysSince(onboardingDone.updated_at, now);
        push({
          id: `onboarding_concluido_ativar_contratacao:${cs.id}`,
          kind: "onboarding_concluido_ativar_contratacao",
          category: "contratacoes",
          label: "Onboarding concluído — ativar contratação",
          subject,
          detail: cs.name_snapshot,
          since: onboardingDone.updated_at,
          priority: dDays >= 1 ? "critica" : "atencao",
          cta,
        });
      } else {
        push({
          id: `contratacao_pendente:${cs.id}`,
          kind: "contratacao_pendente",
          category: "contratacoes",
          label: "Contratação pendente de ativação",
          subject,
          detail: cs.name_snapshot,
          since: cs.updated_at,
          priority: days >= 3 ? "critica" : "atencao",
          cta,
        });
      }
    }

    if (cs.status === "pausado") {
      push({
        id: `contratacao_pausada:${cs.id}`,
        kind: "contratacao_pausada",
        category: "contratacoes",
        label: "Contratação pausada",
        subject,
        detail: cs.name_snapshot,
        since: cs.updated_at,
        priority: byAge(days, 30, 14),
        cta,
      });
    }

    // ---------- Onboarding (derivado da contratação) ----------
    for (const o of serviceOnboardings) {
      const oDays = daysSince(o.updated_at, now);
      const onboardingCta: AttentionCta = {
        label: "Ver onboarding",
        to: "/crm/clientes/$id",
        params: { id: cs.client_id },
        search: { cs: cs.id },
      };

      if (o.status === "pendente" || o.status === "enviado") {
        push({
          id: `onboarding_pendente:${o.id}`,
          kind: "onboarding_pendente",
          category: "onboarding",
          label:
            o.status === "pendente"
              ? "Onboarding criado e não enviado"
              : "Onboarding enviado aguardando cliente",
          subject,
          detail: cs.name_snapshot,
          since: o.updated_at,
          priority: byAge(oDays, 5, 2),
          cta: onboardingCta,
        });
      } else if (o.status === "em_preenchimento") {
        push({
          id: `onboarding_em_preenchimento:${o.id}`,
          kind: "onboarding_em_preenchimento",
          category: "onboarding",
          label: "Onboarding em preenchimento",
          subject,
          detail: cs.name_snapshot,
          since: o.updated_at,
          priority: byAge(oDays, 14, 7),
          cta: onboardingCta,
        });
      }
    }

    // ---------- Ciclos (uso estritamente operacional) ----------
    const isRecurring =
      cs.billing_type_snapshot === "recorrente" && cs.billing_interval_snapshot === "monthly";
    if (!isRecurring) continue;

    const cycles = cyclesByService.get(cs.id) ?? [];
    const open = cycles.filter((c) => c.status === "previsto" || c.status === "ativo");
    const active = cycles.find((c) => c.status === "ativo");
    const cycleCta: AttentionCta = {
      label: "Ver ciclo",
      to: "/crm/clientes/$id",
      params: { id: cs.client_id },
      search: { cs: cs.id },
    };

    if (active) {
      push({
        id: `ciclo_ativo:${active.id}`,
        kind: "ciclo_ativo",
        category: "ciclos",
        label: isPast(active.period_end, now)
          ? "Ciclo ativo com período encerrado"
          : "Ciclo ativo em execução",
        subject,
        detail: `${cs.name_snapshot} · ciclo #${active.sequence}`,
        since: active.updated_at,
        priority: isPast(active.period_end, now) ? "atencao" : "normal",
        cta: cycleCta,
      });
    }

    // P1-1: ciclo criado e nunca iniciado. Sem esta regra o período fica
    // invisível no Centro de Operações até alguém abrir o cliente.
    for (const previsto of cycles.filter((c) => c.status === "previsto")) {
      const pDays = daysSince(previsto.updated_at, now);
      push({
        id: `ciclo_previsto_nao_iniciado:${previsto.id}`,
        kind: "ciclo_previsto_nao_iniciado",
        category: "ciclos",
        label: isPast(previsto.period_start, now)
          ? "Ciclo previsto com período já iniciado"
          : "Ciclo previsto aguardando início",
        subject,
        detail: `${cs.name_snapshot} · ciclo #${previsto.sequence}`,
        since: previsto.updated_at,
        priority: isPast(previsto.period_start, now) ? "critica" : byAge(pDays, 5, 2),
        cta: cycleCta,
      });
    }

    // Recorrente ativa sem ciclo em aberto: cobre tanto "nunca gerou ciclo"
    // quanto "último ciclo concluído sem próximo".
    if (cs.status === "ativo" && open.length === 0) {
      const anchor = cycles.length === 0 ? (cs.started_at ?? cs.contracted_at) : latestUpdate(cycles);
      const aDays = daysSince(anchor, now);
      push({
        id: `recorrente_sem_proximo_ciclo:${cs.id}`,
        kind: "recorrente_sem_proximo_ciclo",
        category: "ciclos",
        label:
          cycles.length === 0
            ? "Recorrente ativa sem nenhum ciclo"
            : "Ciclo concluído sem próximo ciclo",
        subject,
        detail: cs.name_snapshot,
        since: anchor,
        priority: aDays >= 5 ? "critica" : "atencao",
        cta: cycleCta,
      });
    }

  }

  // ---------- Projetos ----------
  for (const pj of source.projects) {
    if (pj.status === "concluido" || pj.status === "cancelado") continue;
    const subject = clientName.get(pj.client_id) ?? "Cliente";
    const detail = pj.code ? `${pj.code} · ${pj.name}` : pj.name;
    const cta: AttentionCta = {
      label: "Ver projeto",
      to: "/crm/projetos/$id",
      params: { id: pj.id },
    };

    // Atraso tem precedência: a mesma entidade não deve gerar duas linhas
    // concorrentes para o mesmo problema de execução.
    if (isPast(pj.due_date, now)) {
      push({
        id: `projeto_atrasado:${pj.id}`,
        kind: "projeto_atrasado",
        category: "projetos",
        label: "Projeto atrasado",
        subject,
        detail,
        since: pj.due_date ?? pj.updated_at,
        priority: "critica",
        cta,
      });
      continue;
    }

    if (pj.status === "aguardando_cliente") {
      push({
        id: `projeto_aguardando_cliente:${pj.id}`,
        kind: "projeto_aguardando_cliente",
        category: "projetos",
        label: "Projeto aguardando cliente",
        subject,
        detail,
        since: pj.updated_at,
        priority: byAge(daysSince(pj.updated_at, now), 14, 7),
        cta,
      });
    }
  }

  return sortAttention(dedupe(items));
}

function latestUpdate(cycles: readonly RawCycle[]): string {
  return cycles.reduce(
    (acc, c) => (new Date(c.updated_at).getTime() > new Date(acc).getTime() ? c.updated_at : acc),
    cycles[0].updated_at,
  );
}

/** Remove itens repetidos pela mesma regra + entidade. */
export function dedupe(items: readonly AttentionItem[]): AttentionItem[] {
  const seen = new Set<string>();
  const out: AttentionItem[] = [];
  for (const it of items) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
  }
  return out;
}

/** Prioridade desc, depois mais antigo primeiro. */
export function sortAttention(items: readonly AttentionItem[]): AttentionItem[] {
  return [...items].sort((a, b) => {
    const w = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (w !== 0) return w;
    return new Date(a.since).getTime() - new Date(b.since).getTime();
  });
}

export interface AttentionFilter {
  category?: AttentionCategory | "todos";
  priority?: AttentionPriority | "todas";
}

export function filterAttention(
  items: readonly AttentionItem[],
  filter: AttentionFilter,
): AttentionItem[] {
  return items.filter((it) => {
    if (filter.category && filter.category !== "todos" && it.category !== filter.category) {
      return false;
    }
    if (filter.priority && filter.priority !== "todas" && it.priority !== filter.priority) {
      return false;
    }
    return true;
  });
}

export interface AttentionCounts {
  total: number;
  critica: number;
  atencao: number;
  normal: number;
  byCategory: Record<AttentionCategory, number>;
}

export function countAttention(items: readonly AttentionItem[]): AttentionCounts {
  const byCategory = {
    leads: 0,
    propostas: 0,
    onboarding: 0,
    projetos: 0,
    contratacoes: 0,
    ciclos: 0,
  } as Record<AttentionCategory, number>;
  let critica = 0;
  let atencao = 0;
  let normal = 0;
  for (const it of items) {
    byCategory[it.category] += 1;
    if (it.priority === "critica") critica += 1;
    else if (it.priority === "atencao") atencao += 1;
    else normal += 1;
  }
  return { total: items.length, critica, atencao, normal, byCategory };
}

/** Tempo em situação, legível (pt-BR). */
export function timeInSituation(iso: string, now: Date = new Date()): string {
  const ms = now.getTime() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "—";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `há ${Math.max(1, min)} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d}d`;
  return `há ${Math.floor(d / 30)} mês(es)`;
}
