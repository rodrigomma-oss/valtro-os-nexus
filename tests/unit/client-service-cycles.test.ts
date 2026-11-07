/**
 * Sprint 13.6 — Testes unitários da camada de ciclos.
 *
 * Cobre as regras não-destrutivas (matemática de períodos, elegibilidade e
 * grafo de transições). Nenhum teste toca dados reais.
 */
import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonthsClamped,
  allowedCycleTransitions,
  computeNextCyclePeriod,
  cycleBlockedReason,
  isCycleTransitionAllowed,
  periodLabel,
  supportsCycles,
} from "@/lib/client-service-cycles";
import type { ClientServiceStatus } from "@/types/client-service";

const recurring = {
  billing_type_snapshot: "recorrente" as const,
  billing_interval_snapshot: "monthly" as const,
};
const oneOff = {
  billing_type_snapshot: "pontual" as const,
  billing_interval_snapshot: null,
};

function contract(status: ClientServiceStatus, recurringContract = true) {
  return { ...(recurringContract ? recurring : oneOff), status };
}

describe("elegibilidade", () => {
  it("contratação pontual não suporta ciclos", () => {
    expect(supportsCycles(oneOff)).toBe(false);
    expect(cycleBlockedReason(contract("ativo", false), [])).toMatch(/pontual/i);
  });

  it("recorrente mensal suporta ciclos", () => {
    expect(supportsCycles(recurring)).toBe(true);
    expect(cycleBlockedReason(contract("ativo"), [])).toBeNull();
  });

  it("recorrente sem periodicidade não suporta ciclos", () => {
    expect(
      supportsCycles({ billing_type_snapshot: "recorrente", billing_interval_snapshot: null }),
    ).toBe(false);
  });

  it("pendente, pausada, concluída e cancelada não geram novo ciclo", () => {
    expect(cycleBlockedReason(contract("pendente"), [])).toMatch(/Ative a contratação/i);
    expect(cycleBlockedReason(contract("pausado"), [])).toMatch(/pausada/i);
    expect(cycleBlockedReason(contract("concluido"), [])).toMatch(/encerrado/i);
    expect(cycleBlockedReason(contract("cancelado"), [])).toMatch(/encerrado/i);
  });

  it("ciclo em aberto bloqueia a criação do próximo", () => {
    expect(cycleBlockedReason(contract("ativo"), [{ status: "previsto" }])).toMatch(/em aberto/i);
    expect(cycleBlockedReason(contract("ativo"), [{ status: "ativo" }])).toMatch(/em aberto/i);
    expect(cycleBlockedReason(contract("ativo"), [{ status: "concluido" }])).toBeNull();
    expect(cycleBlockedReason(contract("ativo"), [{ status: "cancelado" }])).toBeNull();
  });
});

describe("matemática de períodos", () => {
  it("primeiro ciclo usa a data operacional informada", () => {
    expect(computeNextCyclePeriod([], "2026-07-25")).toEqual({
      sequence: 1,
      period_start: "2026-07-25",
      period_end: "2026-08-24",
    });
  });

  it("próximo ciclo deriva do anterior, sem drift", () => {
    const c1 = { sequence: 1, period_start: "2026-07-25", period_end: "2026-08-24" };
    const c2 = computeNextCyclePeriod([c1], "ignorado");
    expect(c2).toEqual({
      sequence: 2,
      period_start: "2026-08-25",
      period_end: "2026-09-24",
    });
    const c3 = computeNextCyclePeriod([c1, c2], "ignorado");
    expect(c3).toEqual({
      sequence: 3,
      period_start: "2026-09-25",
      period_end: "2026-10-24",
    });
  });

  it("mês curto sofre clamp mas o dia âncora é recuperado depois", () => {
    const c1 = { sequence: 1, period_start: "2026-01-31", period_end: "2026-02-27" };
    const c2 = computeNextCyclePeriod([c1], "x");
    expect(c2.period_start).toBe("2026-02-28"); // fevereiro não tem dia 31
    const c3 = computeNextCyclePeriod([c1, c2], "x");
    expect(c3.period_start).toBe("2026-03-31"); // volta ao dia âncora
  });

  it("ano bissexto é tratado corretamente", () => {
    expect(addMonthsClamped("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonthsClamped("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsClamped("2026-12-15", 1)).toBe("2027-01-15");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("sequência é sempre crescente e sem lacunas", () => {
    let cycles = [] as { sequence: number; period_start: string; period_end: string }[];
    for (let i = 1; i <= 14; i++) {
      const next = computeNextCyclePeriod(cycles, "2026-03-31");
      expect(next.sequence).toBe(i);
      cycles = [...cycles, next];
    }
    // 12 meses depois o dia âncora se mantém → sem drift acumulado.
    expect(cycles[12].period_start).toBe("2027-03-31");
    // Períodos nunca se sobrepõem nem deixam buracos.
    for (let i = 1; i < cycles.length; i++) {
      expect(cycles[i].period_start).toBe(addDays(cycles[i - 1].period_end, 1));
    }
    // Nenhum período duplicado.
    expect(new Set(cycles.map((c) => c.period_start)).size).toBe(cycles.length);
  });

  it("rótulo de competência é legível", () => {
    expect(periodLabel("2026-07-25", "2026-08-24")).toContain("25/07/2026");
    expect(periodLabel("2026-07-25", "2026-08-24")).toContain("24/08/2026");
  });
});

describe("transições de ciclo", () => {
  it("grafo permitido", () => {
    expect(allowedCycleTransitions("previsto")).toEqual(["ativo", "cancelado"]);
    expect(allowedCycleTransitions("ativo")).toEqual(["concluido", "cancelado"]);
    expect(allowedCycleTransitions("concluido")).toEqual([]);
    expect(allowedCycleTransitions("cancelado")).toEqual([]);
  });

  it("transições inválidas são rejeitadas", () => {
    expect(isCycleTransitionAllowed("previsto", "concluido")).toBe(false);
    expect(isCycleTransitionAllowed("concluido", "ativo")).toBe(false);
    expect(isCycleTransitionAllowed("cancelado", "ativo")).toBe(false);
    expect(isCycleTransitionAllowed("ativo", "ativo")).toBe(false);
    expect(isCycleTransitionAllowed("ativo", "concluido")).toBe(true);
  });
});
