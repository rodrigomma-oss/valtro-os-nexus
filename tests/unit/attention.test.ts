/**
 * Sprint 13.7 — Testes do módulo de domínio da fila operacional.
 * Cobre: detecção, resolução, deduplicação, filtros, prioridade e CTA.
 */
import { describe, expect, it } from "vitest";
import {
  buildAttentionQueue,
  countAttention,
  filterAttention,
  type AttentionSource,
} from "@/lib/attention";

const NOW = new Date("2026-07-25T12:00:00.000Z");
const ago = (days: number) =>
  new Date(NOW.getTime() - days * 86_400_000).toISOString();

function source(partial: Partial<AttentionSource> = {}): AttentionSource {
  return {
    leads: [],
    proposals: [],
    clients: [{ id: "c1", company_name: "Cliente Um" }],
    projects: [],
    clientServices: [],
    onboardings: [],
    cycles: [],
    contractedProposalIds: [],
    now: NOW,
    ...partial,
  };
}

const recurring = {
  id: "cs1",
  client_id: "c1",
  name_snapshot: "Gestão Shopee",
  status: "ativo",
  billing_type_snapshot: "recorrente",
  billing_interval_snapshot: "monthly",
  contracted_at: ago(40),
  started_at: ago(40),
  updated_at: ago(40),
};

describe("fila de atenção — detecção", () => {
  it("mostra briefing recebido aguardando análise", () => {
    const items = buildAttentionQueue(
      source({
        leads: [
          {
            id: "l1",
            company_name: "Loja X",
            contact_name: "Ana",
            status: "em_analise",
            updated_at: ago(4),
            created_at: ago(10),
          },
        ],
      }),
    );
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe("briefing_aguardando_analise");
    expect(items[0].priority).toBe("critica");
    expect(items[0].cta).toEqual({
      label: "Ver briefing",
      to: "/crm/leads/$id",
      params: { id: "l1" },
    });
  });

  it("entidade resolvida deixa de aparecer", () => {
    const items = buildAttentionQueue(
      source({
        leads: [
          {
            id: "l1",
            company_name: "Loja X",
            contact_name: null,
            status: "ganho",
            updated_at: ago(4),
            created_at: ago(10),
          },
        ],
      }),
    );
    expect(items).toHaveLength(0);
  });

  it("proposta aprovada sem contratação aparece e desaparece após contratar", () => {
    const proposals = [
      {
        id: "p1",
        lead_id: "l1",
        number: "PROP-2026-0001",
        title: "Projeto",
        status: "aprovada",
        valid_until: null,
        updated_at: ago(5),
        created_at: ago(9),
      },
    ];
    const withPending = buildAttentionQueue(source({ proposals }));
    expect(withPending.map((i) => i.kind)).toEqual(["proposta_aprovada_sem_contratacao"]);
    expect(withPending[0].priority).toBe("critica");

    const resolved = buildAttentionQueue(
      source({ proposals, contractedProposalIds: ["p1"] }),
    );
    expect(resolved).toHaveLength(0);
  });

  it("proposta vencida em negociação é crítica", () => {
    const [item] = buildAttentionQueue(
      source({
        proposals: [
          {
            id: "p2",
            lead_id: "l1",
            number: "PROP-2026-0002",
            title: "Consultoria",
            status: "em_negociacao",
            valid_until: "2026-07-01",
            updated_at: ago(1),
            created_at: ago(3),
          },
        ],
      }),
    );
    expect(item.priority).toBe("critica");
    expect(item.category).toBe("propostas");
  });

  it("contratação pausada aparece na categoria contratações", () => {
    const items = buildAttentionQueue(
      source({
        clientServices: [{ ...recurring, status: "pausado", updated_at: ago(20) }],
      }),
    );
    expect(items.map((i) => i.kind)).toEqual(["contratacao_pausada"]);
    expect(items[0].priority).toBe("atencao");
    expect(items[0].subject).toBe("Cliente Um");
  });

  it("contratação pendente é sinalizada", () => {
    const items = buildAttentionQueue(
      source({ clientServices: [{ ...recurring, status: "pendente", updated_at: ago(5) }] }),
    );
    expect(items.map((i) => i.kind)).toContain("contratacao_pendente");
    expect(items.every((i) => i.kind !== "recorrente_sem_proximo_ciclo")).toBe(true);
  });

  it("recorrente ativa sem nenhum ciclo é detectada", () => {
    const items = buildAttentionQueue(source({ clientServices: [recurring] }));
    expect(items.map((i) => i.kind)).toEqual(["recorrente_sem_proximo_ciclo"]);
    expect(items[0].label).toBe("Recorrente ativa sem nenhum ciclo");
    expect(items[0].cta.to).toBe("/crm/clientes/$id");
  });

  it("ciclo concluído sem próximo ciclo é detectado", () => {
    const items = buildAttentionQueue(
      source({
        clientServices: [recurring],
        cycles: [
          {
            id: "cy1",
            client_service_id: "cs1",
            sequence: 1,
            period_start: "2026-06-01",
            period_end: "2026-06-30",
            status: "concluido",
            updated_at: ago(8),
          },
        ],
      }),
    );
    expect(items.map((i) => i.kind)).toEqual(["recorrente_sem_proximo_ciclo"]);
    expect(items[0].label).toBe("Ciclo concluído sem próximo ciclo");
  });

  it("ciclo ativo aparece e não gera pendência de próximo ciclo", () => {
    const items = buildAttentionQueue(
      source({
        clientServices: [recurring],
        cycles: [
          {
            id: "cy2",
            client_service_id: "cs1",
            sequence: 2,
            period_start: "2026-07-01",
            period_end: "2026-07-31",
            status: "ativo",
            updated_at: ago(2),
          },
        ],
      }),
    );
    expect(items.map((i) => i.kind)).toEqual(["ciclo_ativo"]);
    expect(items[0].priority).toBe("normal");
  });

  it("serviço pontual nunca gera pendência de ciclo", () => {
    const items = buildAttentionQueue(
      source({
        clientServices: [
          {
            ...recurring,
            billing_type_snapshot: "pontual",
            billing_interval_snapshot: null,
          },
        ],
      }),
    );
    expect(items).toHaveLength(0);
  });

  it("onboarding pendente e em preenchimento são categorizados", () => {
    const items = buildAttentionQueue(
      source({
        clientServices: [{ ...recurring, billing_type_snapshot: "pontual", billing_interval_snapshot: null }],
        onboardings: [
          { id: "o1", client_service_id: "cs1", status: "enviado", updated_at: ago(6), created_at: ago(6) },
          { id: "o2", client_service_id: "cs1", status: "em_preenchimento", updated_at: ago(1), created_at: ago(3) },
        ],
      }),
    );
    expect(items.map((i) => i.kind).sort()).toEqual([
      "onboarding_em_preenchimento",
      "onboarding_pendente",
    ]);
    expect(items.find((i) => i.kind === "onboarding_pendente")!.priority).toBe("critica");
  });

  it("projeto atrasado tem precedência sobre aguardando cliente", () => {
    const items = buildAttentionQueue(
      source({
        projects: [
          {
            id: "pj1",
            client_id: "c1",
            code: "PROJ-2026-0001",
            name: "Site",
            status: "aguardando_cliente",
            due_date: "2026-07-01",
            updated_at: ago(3),
          },
        ],
      }),
    );
    expect(items.map((i) => i.kind)).toEqual(["projeto_atrasado"]);
    expect(items[0].priority).toBe("critica");
    expect(items[0].cta).toEqual({
      label: "Ver projeto",
      to: "/crm/projetos/$id",
      params: { id: "pj1" },
    });
  });

  it("projeto concluído não aparece", () => {
    const items = buildAttentionQueue(
      source({
        projects: [
          {
            id: "pj2",
            client_id: "c1",
            code: null,
            name: "Site",
            status: "concluido",
            due_date: "2026-01-01",
            updated_at: ago(3),
          },
        ],
      }),
    );
    expect(items).toHaveLength(0);
  });
});

describe("fila de atenção — invariantes", () => {
  const full = source({
    leads: [
      {
        id: "l1",
        company_name: "Loja X",
        contact_name: "Ana",
        status: "em_analise",
        updated_at: ago(2),
        created_at: ago(9),
      },
    ],
    clientServices: [recurring],
    projects: [
      {
        id: "pj1",
        client_id: "c1",
        code: "PROJ-1",
        name: "Site",
        status: "aguardando_cliente",
        due_date: null,
        updated_at: ago(10),
      },
    ],
  });

  it("não duplica a mesma entidade pela mesma regra", () => {
    const items = buildAttentionQueue(full);
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ordena por prioridade e depois pelo mais antigo", () => {
    const items = buildAttentionQueue(full);
    const weights = { critica: 0, atencao: 1, normal: 2 } as const;
    const seq = items.map((i) => weights[i.priority]);
    expect([...seq].sort((a, b) => a - b)).toEqual(seq);
  });

  it("filtros por categoria e prioridade funcionam", () => {
    const items = buildAttentionQueue(full);
    expect(filterAttention(items, { category: "ciclos" }).every((i) => i.category === "ciclos")).toBe(
      true,
    );
    expect(filterAttention(items, { category: "todos", priority: "todas" })).toHaveLength(
      items.length,
    );
    const criticas = filterAttention(items, { priority: "critica" });
    expect(criticas.every((i) => i.priority === "critica")).toBe(true);
  });

  it("contagens conferem com os itens", () => {
    const items = buildAttentionQueue(full);
    const counts = countAttention(items);
    expect(counts.total).toBe(items.length);
    expect(counts.critica + counts.atencao + counts.normal).toBe(items.length);
    expect(
      Object.values(counts.byCategory).reduce((a, b) => a + b, 0),
    ).toBe(items.length);
  });
});

// ============================================================
// Sprint 13.9 — hardening operacional
// ============================================================

describe("Sprint 13.9 — novas regras", () => {
  it("P1-1: ciclo previsto e nunca iniciado aparece na fila", () => {
    const items = buildAttentionQueue(
      source({
        clientServices: [recurring],
        cycles: [
          {
            id: "cy1",
            client_service_id: "cs1",
            sequence: 1,
            period_start: "2026-08-01",
            period_end: "2026-08-31",
            status: "previsto",
            updated_at: ago(3),
          },
        ],
      }),
    );
    const previsto = items.find((i) => i.kind === "ciclo_previsto_nao_iniciado");
    expect(previsto).toBeDefined();
    expect(previsto!.category).toBe("ciclos");
    expect(previsto!.priority).toBe("atencao");
    // Ciclo em aberto: não há "sem próximo ciclo" concorrente.
    expect(items.some((i) => i.kind === "recorrente_sem_proximo_ciclo")).toBe(false);
  });

  it("P1-1: período já iniciado sem start eleva para crítica", () => {
    const items = buildAttentionQueue(
      source({
        clientServices: [recurring],
        cycles: [
          {
            id: "cy1",
            client_service_id: "cs1",
            sequence: 1,
            period_start: "2026-07-01",
            period_end: "2026-07-31",
            status: "previsto",
            updated_at: ago(1),
          },
        ],
      }),
    );
    expect(items.find((i) => i.kind === "ciclo_previsto_nao_iniciado")!.priority).toBe(
      "critica",
    );
  });

  it("P1-7: onboarding concluído troca a pendência por 'ativar contratação'", () => {
    const items = buildAttentionQueue(
      source({
        clientServices: [{ ...recurring, status: "pendente", updated_at: ago(10) }],
        onboardings: [
          {
            id: "ob1",
            client_service_id: "cs1",
            status: "concluido",
            updated_at: ago(2),
            created_at: ago(9),
          },
        ],
      }),
    );
    const item = items.find(
      (i) => i.kind === "onboarding_concluido_ativar_contratacao",
    );
    expect(item).toBeDefined();
    expect(item!.priority).toBe("critica");
    expect(items.some((i) => i.kind === "contratacao_pendente")).toBe(false);
    // Onboarding concluído não gera pendência de onboarding.
    expect(items.some((i) => i.category === "onboarding")).toBe(false);
  });

  it("P1-3: CTAs de contratação/ciclo levam o deep-link da contratação", () => {
    const items = buildAttentionQueue(
      source({ clientServices: [{ ...recurring, status: "pausado", updated_at: ago(20) }] }),
    );
    const item = items.find((i) => i.kind === "contratacao_pausada")!;
    expect(item.cta.search).toEqual({ cs: "cs1" });
  });
});
