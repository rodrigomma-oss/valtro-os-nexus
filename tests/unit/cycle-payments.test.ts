/**
 * Sprint 13.7 — Controle financeiro básico dos ciclos.
 *
 * Testes puros da camada de regras: derivação visual de "vencido",
 * coerência dos campos financeiros e regra do alerta não bloqueante.
 * Nenhum teste toca dados reais.
 */
import { describe, expect, it } from "vitest";
import {
  defaultDueDate,
  displayPaymentStatus,
  paymentDelta,
  shouldWarnStartWithoutPayment,
  validatePaymentPayload,
} from "@/lib/client-service-cycles";
import type { CyclePaymentStatus } from "@/types/client-service";

const TODAY = "2026-07-27";

function cycle(payment_status: CyclePaymentStatus, due_date: string | null = TODAY) {
  return { payment_status, due_date };
}

describe("vencimento padrão", () => {
  it("usa period_start (pagamento antes da execução), não +7 dias", () => {
    expect(defaultDueDate("2026-07-25")).toBe("2026-07-25");
  });
});

describe("derivação visual de vencido", () => {
  it("pendente com vencimento passado é apresentado como vencido", () => {
    expect(displayPaymentStatus(cycle("pendente", "2026-07-26"), TODAY)).toBe("vencido");
  });

  it("pendente no dia do vencimento continua pendente", () => {
    expect(displayPaymentStatus(cycle("pendente", TODAY), TODAY)).toBe("pendente");
  });

  it("pendente sem vencimento continua pendente", () => {
    expect(displayPaymentStatus(cycle("pendente", null), TODAY)).toBe("pendente");
  });

  it("pago e dispensado nunca viram vencido", () => {
    expect(displayPaymentStatus(cycle("pago", "2020-01-01"), TODAY)).toBe("pago");
    expect(displayPaymentStatus(cycle("dispensado", "2020-01-01"), TODAY)).toBe("dispensado");
  });

  it("estado persistido não é mutado pela derivação", () => {
    const c = cycle("pendente", "2020-01-01");
    displayPaymentStatus(c, TODAY);
    expect(c.payment_status).toBe("pendente");
  });
});

describe("coerência dos campos financeiros", () => {
  it("pago exige valor recebido", () => {
    expect(validatePaymentPayload({ payment_status: "pago", paid_amount_cents: null })).toMatch(
      /valor recebido/i,
    );
    expect(validatePaymentPayload({ payment_status: "pago", paid_amount_cents: 0 })).toBeNull();
    expect(validatePaymentPayload({ payment_status: "pago", paid_amount_cents: 50000 })).toBeNull();
  });

  it("valores inválidos são rejeitados", () => {
    expect(validatePaymentPayload({ payment_status: "pago", paid_amount_cents: -1 })).toMatch(
      /inválido/i,
    );
    expect(validatePaymentPayload({ payment_status: "pago", paid_amount_cents: 10.5 })).toMatch(
      /inválido/i,
    );
  });

  it("pendente e dispensado não exigem valor", () => {
    expect(validatePaymentPayload({ payment_status: "pendente" })).toBeNull();
    expect(validatePaymentPayload({ payment_status: "dispensado" })).toBeNull();
  });
});

describe("valor recebido vs. previsto", () => {
  const base = { amount_cents: 100_000 };

  it("previsto permanece intacto quando o recebido diverge", () => {
    expect(
      paymentDelta({ ...base, paid_amount_cents: 90_000, payment_status: "pago" }),
    ).toBe(-10_000);
    expect(
      paymentDelta({ ...base, paid_amount_cents: 120_000, payment_status: "pago" }),
    ).toBe(20_000);
    expect(
      paymentDelta({ ...base, paid_amount_cents: 100_000, payment_status: "pago" }),
    ).toBe(0);
  });

  it("sem pagamento não há delta", () => {
    expect(paymentDelta({ ...base, paid_amount_cents: null, payment_status: "pendente" })).toBeNull();
    expect(
      paymentDelta({ ...base, paid_amount_cents: null, payment_status: "dispensado" }),
    ).toBeNull();
  });
});

describe("alerta ao iniciar ciclo", () => {
  it("alerta quando o pagamento não está resolvido", () => {
    expect(shouldWarnStartWithoutPayment(cycle("pendente"))).toBe(true);
    expect(shouldWarnStartWithoutPayment(cycle("vencido"))).toBe(true);
  });

  it("não alerta quando pago ou dispensado", () => {
    expect(shouldWarnStartWithoutPayment(cycle("pago"))).toBe(false);
    expect(shouldWarnStartWithoutPayment(cycle("dispensado"))).toBe(false);
  });
});
