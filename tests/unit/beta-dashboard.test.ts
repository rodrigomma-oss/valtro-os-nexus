/**
 * VOS-001G — Dashboard Operacional do Beta Fechado.
 * Testes do domínio puro: indicadores, fila de atenção, resumo por módulo e timeline.
 */
import { describe, it, expect } from "vitest";
import {
  buildBetaAttentionQueue,
  buildBetaMetrics,
  buildBetaModuleSummaries,
  buildBetaOverview,
  countBetaAttention,
  daysSince,
  mergeBetaTimeline,
  type BetaDashboardInput,
  type RawBetaEvent,
} from "@/lib/os/beta-dashboard";

const NOW = "2026-03-20T12:00:00.000Z";
const daysAgo = (n: number) =>
  new Date(new Date(NOW).getTime() - n * 86_400_000).toISOString();

function input(partial: Partial<BetaDashboardInput> = {}): BetaDashboardInput {
  return {
    tickets: [],
    bugs: [],
    feedback: [],
    participants: [],
    feedbackAuthors: [],
    internalUsers: 0,
    now: NOW,
    ...partial,
  };
}

const ticket = (o: Partial<BetaDashboardInput["tickets"][number]> = {}) => ({
  id: "t1",
  protocol: "TCK-000001",
  title: "Erro ao salvar",
  status: "open" as const,
  priority: "normal" as const,
  owner_id: "u1",
  created_at: daysAgo(1),
  updated_at: daysAgo(1),
  ...o,
});

const bug = (o: Partial<BetaDashboardInput["bugs"][number]> = {}) => ({
  id: "b1",
  code: "BUG-000001",
  title: "Cálculo incorreto",
  status: "confirmed" as const,
  severity: "normal" as const,
  owner_id: null,
  created_at: daysAgo(2),
  updated_at: daysAgo(2),
  fixed_at: null,
  ...o,
});

const fb = (o: Partial<BetaDashboardInput["feedback"][number]> = {}) => ({
  id: "f1",
  code: "FDB-000001",
  title: "Faltou exportar CSV",
  status: "new" as const,
  owner_id: null,
  participant_user_id: null,
  participant_email: "p@ex.com",
  created_at: daysAgo(5),
  ...o,
});

const part = (o: Partial<BetaDashboardInput["participants"][number]> = {}) => ({
  id: "p1",
  code: "BTP-000001",
  name: "Ana",
  email: "Ana@Ex.com",
  status: "active" as const,
  user_id: null,
  created_at: daysAgo(30),
  accepted_at: daysAgo(29),
  activated_at: daysAgo(28),
  ...o,
});

describe("daysSince", () => {
  it("retorna 0 para valores nulos ou inválidos", () => {
    expect(daysSince(null, Date.now())).toBe(0);
    expect(daysSince("banana", Date.now())).toBe(0);
  });
  it("calcula dias inteiros", () => {
    expect(daysSince(daysAgo(3), new Date(NOW).getTime())).toBe(3);
  });
});

describe("buildBetaMetrics", () => {
  it("expõe os 10 indicadores operacionais com rota de origem", () => {
    const metrics = buildBetaMetrics(input({ internalUsers: 4 }));
    expect(metrics).toHaveLength(10);
    expect(metrics.every((m) => typeof m.to === "string" && m.to.startsWith("/os/"))).toBe(true);
    expect(metrics.find((m) => m.id === "usuarios_internos")?.value).toBe(4);
  });

  it("conta apenas estados operacionais abertos", () => {
    const metrics = buildBetaMetrics(
      input({
        tickets: [
          ticket({ id: "a", status: "open", owner_id: null }),
          ticket({ id: "b", status: "closed" }),
          ticket({ id: "c", status: "cancelled" }),
        ],
        bugs: [
          bug({ id: "b1", severity: "critical" }),
          bug({ id: "b2", status: "closed", severity: "blocker" }),
        ],
        feedback: [
          fb({ id: "f1", status: "new" }),
          fb({ id: "f2", status: "accepted" }),
          fb({ id: "f3", status: "closed" }),
        ],
        participants: [
          part({ id: "p1", status: "active" }),
          part({ id: "p2", status: "invited" }),
          part({ id: "p3", status: "converted" }),
        ],
      }),
    );
    const by = Object.fromEntries(metrics.map((m) => [m.id, m.value]));
    expect(by["chamados_abertos"]).toBe(1);
    expect(by["chamados_sem_responsavel"]).toBe(1);
    expect(by["bugs_abertos"]).toBe(1);
    expect(by["bugs_criticos"]).toBe(1);
    expect(by["feedback_pendente"]).toBe(1);
    expect(by["feedback_roadmap"]).toBe(1);
    expect(by["participantes_ativos"]).toBe(1);
    expect(by["participantes_convidados"]).toBe(1);
    expect(by["participantes_convertidos"]).toBe(1);
  });
});

describe("buildBetaAttentionQueue", () => {
  it("prioriza chamado urgente sem responsável como crítico", () => {
    const items = buildBetaAttentionQueue(
      input({ tickets: [ticket({ owner_id: null, priority: "urgent" })] }),
    );
    expect(items).toHaveLength(1);
    expect(items[0]!.kind).toBe("ticket_sem_responsavel");
    expect(items[0]!.priority).toBe("critica");
    expect(items[0]!.to).toBe("/os/atendimento/chamados/$id");
  });

  it("não duplica a mesma entidade em regras concorrentes do mesmo módulo", () => {
    const items = buildBetaAttentionQueue(
      input({
        tickets: [
          ticket({
            owner_id: null,
            priority: "urgent",
            status: "waiting_internal",
            updated_at: daysAgo(10),
          }),
        ],
      }),
    );
    expect(items).toHaveLength(1);
  });

  it("marca bug crítico aberto como crítico e ignora bug fechado", () => {
    const items = buildBetaAttentionQueue(
      input({
        bugs: [
          bug({ id: "x", severity: "blocker" }),
          bug({ id: "y", severity: "critical", status: "closed" }),
        ],
      }),
    );
    expect(items.map((i) => i.kind)).toEqual(["bug_critico_aberto"]);
  });

  it("cobra triagem de bug novo somente após 1 dia", () => {
    expect(
      buildBetaAttentionQueue(input({ bugs: [bug({ status: "new", created_at: NOW })] })),
    ).toHaveLength(0);
    expect(
      buildBetaAttentionQueue(input({ bugs: [bug({ status: "new", created_at: daysAgo(2) })] }))[0]!
        .kind,
    ).toBe("bug_sem_triagem");
  });

  it("cobra fechamento de bug corrigido após 7 dias", () => {
    const items = buildBetaAttentionQueue(
      input({ bugs: [bug({ status: "fixed", fixed_at: daysAgo(9) })] }),
    );
    expect(items[0]!.kind).toBe("bug_corrigido_sem_fechamento");
    expect(items[0]!.priority).toBe("normal");
  });

  it("cobra análise de feedback novo após 3 dias", () => {
    expect(
      buildBetaAttentionQueue(input({ feedback: [fb({ created_at: daysAgo(1) })] })),
    ).toHaveLength(0);
    expect(
      buildBetaAttentionQueue(input({ feedback: [fb({ created_at: daysAgo(4) })] }))[0]!.kind,
    ).toBe("feedback_sem_analise");
  });

  it("cobra convite sem aceite após 7 dias", () => {
    const items = buildBetaAttentionQueue(
      input({ participants: [part({ status: "invited", created_at: daysAgo(8) })] }),
    );
    expect(items[0]!.kind).toBe("participante_convite_sem_aceite");
  });

  it("cruza participante ativo com feedback registrado (case-insensitive)", () => {
    const semFeedback = buildBetaAttentionQueue(input({ participants: [part()] }));
    expect(semFeedback[0]!.kind).toBe("participante_ativo_sem_feedback");

    const comFeedback = buildBetaAttentionQueue(
      input({
        participants: [part()],
        feedbackAuthors: [{ participant_user_id: null, participant_email: "ANA@ex.com" }],
      }),
    );
    expect(comFeedback).toHaveLength(0);
  });

  it("ordena por prioridade e depois pelo item mais antigo", () => {
    const items = buildBetaAttentionQueue(
      input({
        bugs: [
          bug({ id: "b_new", status: "new", created_at: daysAgo(3) }),
          bug({ id: "b_crit", severity: "critical", created_at: daysAgo(1) }),
        ],
        participants: [part()],
      }),
    );
    expect(items.map((i) => i.priority)).toEqual(["critica", "atencao", "normal"]);
  });
});

describe("countBetaAttention", () => {
  it("agrega por prioridade e por módulo", () => {
    const items = buildBetaAttentionQueue(
      input({
        tickets: [ticket({ owner_id: null })],
        bugs: [bug({ severity: "critical" })],
      }),
    );
    const counts = countBetaAttention(items);
    expect(counts.total).toBe(2);
    expect(counts.critica).toBe(1);
    expect(counts.atencao).toBe(1);
    expect(counts.byModule.chamados).toBe(1);
    expect(counts.byModule.bugs).toBe(1);
    expect(counts.byModule.feedback).toBe(0);
  });
});

describe("buildBetaModuleSummaries", () => {
  it("gera 4 módulos com rota e desdobramento", () => {
    const mods = buildBetaModuleSummaries(input({ tickets: [ticket()], bugs: [bug()] }));
    expect(mods.map((m) => m.id)).toEqual(["chamados", "bugs", "feedback", "participantes"]);
    expect(mods[0]!.total).toBe(1);
    expect(mods[0]!.breakdown).toHaveLength(4);
    expect(mods.every((m) => m.to.startsWith("/os/"))).toBe(true);
  });
});

describe("mergeBetaTimeline", () => {
  const events: RawBetaEvent[] = [
    {
      id: "e1",
      module: "bugs",
      entity_id: "b1",
      type: "created",
      description: null,
      created_at: daysAgo(2),
      actor_name: "Ana",
    },
    {
      id: "e2",
      module: "chamados",
      entity_id: "t1",
      type: "status_changed",
      description: null,
      created_at: daysAgo(1),
      actor_name: null,
    },
    {
      id: "e3",
      module: "feedback",
      entity_id: "desconhecido",
      type: "created",
      description: null,
      created_at: NOW,
      actor_name: null,
    },
  ];

  it("ordena por data desc, resolve código e descarta entidades fora do escopo do usuário", () => {
    const merged = mergeBetaTimeline(events, {
      b1: { code: "BUG-000001", title: "Cálculo" },
      t1: { code: "TCK-000001", title: "Erro" },
    });
    expect(merged.map((m) => m.id)).toEqual(["e2", "e1"]);
    expect(merged[0]!.code).toBe("TCK-000001");
    expect(merged[0]!.to).toBe("/os/atendimento/chamados/$id");
    expect(merged[0]!.params).toEqual({ id: "t1" });
  });

  it("respeita o limite informado", () => {
    const merged = mergeBetaTimeline(events, { b1: { code: "B", title: "x" }, t1: { code: "T", title: "y" } }, 1);
    expect(merged).toHaveLength(1);
  });
});

describe("buildBetaOverview", () => {
  it("consolida indicadores, fila, contagens, módulos e timeline", () => {
    const overview = buildBetaOverview(
      input({ tickets: [ticket({ owner_id: null })], internalUsers: 3 }),
      [],
    );
    expect(overview.metrics).toHaveLength(10);
    expect(overview.attention).toHaveLength(1);
    expect(overview.counts.total).toBe(1);
    expect(overview.modules).toHaveLength(4);
    expect(overview.timeline).toEqual([]);
    expect(overview.generated_at).toBe(NOW);
  });
});
