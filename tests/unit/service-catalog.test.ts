import { describe, it, expect } from "vitest";
import {
  SERVICE_LIMIT_KEYS,
  SERVICE_OFFER_TYPE_LABEL,
  SERVICE_PRICING_MODE_LABEL,
  formatServiceLimits,
  describeServiceLimits,
  formatServicePrice,
  formatServiceBilling,
  formatServiceObjective,
  formatOnboardingPresence,
  summarizeCatalog,
} from "@/lib/service-catalog";

describe("Sprint 15.2.3B — estrutura comercial do catálogo", () => {
  it("expõe o contrato fechado de limites", () => {
    expect(SERVICE_LIMIT_KEYS).toEqual(["max_products", "max_campaigns", "max_users"]);
  });

  it("formata limites conhecidos em texto legível", () => {
    expect(formatServiceLimits({ max_products: 10, max_users: 3 })).toBe(
      "Produtos: 10 · Usuários: 3",
    );
  });

  it("retorna traço quando não há limites definidos", () => {
    expect(formatServiceLimits({})).toBe("—");
    expect(formatServiceLimits(null)).toBe("—");
  });

  it("rotula tipo de oferta e modelo de precificação", () => {
    expect(SERVICE_OFFER_TYPE_LABEL.complementar).toBe("Complementar");
    expect(SERVICE_PRICING_MODE_LABEL.sob_consulta).toBe("Sob consulta");
  });
});

describe("Sprint 15.2.3C — apresentação do catálogo", () => {
  it("descreve limites em linguagem natural", () => {
    expect(describeServiceLimits({ max_products: 10, max_campaigns: 5 })).toEqual([
      "Até 10 produtos",
      "Até 5 campanhas",
    ]);
  });

  it("trata ausência de limites como escopo ilimitado", () => {
    expect(describeServiceLimits({})).toEqual(["Escopo ilimitado"]);
    expect(describeServiceLimits(null)).toEqual(["Escopo ilimitado"]);
  });

  it("trata sob consulta como estado oficial de preço", () => {
    expect(formatServicePrice("sob_consulta", 15000)).toBe("Sob consulta");
    expect(formatServicePrice("fixo", null)).toBe("Sob consulta");
    expect(formatServicePrice("fixo", 150000)).toContain("1.500,00");
  });

  it("rotula cobrança sem enum técnico", () => {
    expect(formatServiceBilling("recorrente", "monthly")).toBe("Mensal");
    expect(formatServiceBilling("pontual", null)).toBe("Pontual");
  });

  it("nunca deixa objetivo ou onboarding vazios", () => {
    expect(formatServiceObjective("  ")).toBe("Objetivo não definido");
    expect(formatServiceObjective("Escalar vendas")).toBe("Escalar vendas");
    expect(formatOnboardingPresence(null)).toBe("Não possui");
    expect(formatOnboardingPresence("shopee")).toBe("Configurado");
  });

  it("calcula indicadores dinamicamente", () => {
    const base = {
      default_limits: {},
      billing_type: "pontual",
      billing_interval: null,
    } as never;
    const summary = summarizeCatalog([
      { ...base, active: true, offer_type: "principal" },
      { ...base, active: false, offer_type: "complementar" },
      { ...base, active: true, offer_type: "recorrente" },
    ] as never);
    expect(summary).toEqual({
      total: 3,
      active: 2,
      inactive: 1,
      principal: 1,
      complementar: 1,
      recorrente: 1,
    });
  });
});
