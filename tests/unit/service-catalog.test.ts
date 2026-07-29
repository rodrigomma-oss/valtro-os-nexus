import { describe, it, expect } from "vitest";
import {
  SERVICE_LIMIT_KEYS,
  SERVICE_OFFER_TYPE_LABEL,
  SERVICE_PRICING_MODE_LABEL,
  formatServiceLimits,
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
