import { describe, it, expect } from "vitest";
import {
  CLASSIFICATION_LABEL,
  CLASSIFICATION_ORDER,
  PRIORITY_ORDER,
  bpsToPercentInput,
  bpsToPercentLabel,
  classificationLabel,
  classificationTone,
  effectiveOwner,
  percentToBps,
  stockUnitLabel,
  totalCostCents,
} from "@/types/tracked-product";

describe("Sprint 15.2 — Produtos Acompanhados", () => {
  describe("classificação (preparada para evolução)", () => {
    it("mantém o conjunto operacional atual", () => {
      expect(CLASSIFICATION_ORDER).toEqual([
        "escala",
        "validacao",
        "rentabilidade",
        "liquidacao",
        "organico",
        "pausado",
      ]);
    });

    it("tem rótulo para toda classificação declarada", () => {
      for (const c of CLASSIFICATION_ORDER) {
        expect(CLASSIFICATION_LABEL[c]).toBeTruthy();
      }
    });

    it("não quebra com valor futuro ainda não mapeado no front", () => {
      expect(classificationLabel("nova_metodologia")).toBe("nova_metodologia");
      expect(classificationTone("nova_metodologia")).toContain("slate");
    });

    it("prioridade é um conjunto fechado e estável", () => {
      expect(PRIORITY_ORDER).toEqual(["alta", "media", "baixa"]);
    });
  });

  describe("custos", () => {
    it("retorna null quando nenhum custo foi informado", () => {
      expect(
        totalCostCents({
          product_cost_cents: null,
          packaging_cost_cents: null,
          taxes_cents: null,
          other_costs_cents: null,
        }),
      ).toBeNull();
    });

    it("soma apenas os componentes informados", () => {
      expect(
        totalCostCents({
          product_cost_cents: 1500,
          packaging_cost_cents: null,
          taxes_cents: 250,
          other_costs_cents: 100,
        }),
      ).toBe(1850);
    });

    it("trata zero como valor informado, não como ausência", () => {
      expect(
        totalCostCents({
          product_cost_cents: 0,
          packaging_cost_cents: null,
          taxes_cents: null,
          other_costs_cents: null,
        }),
      ).toBe(0);
    });
  });

  describe("responsável (herança lógica, sem cópia)", () => {
    it("usa o responsável específico quando definido", () => {
      const r = effectiveOwner("11111111-1111-1111-1111-111111111111", "Ana", "Rodrigo");
      expect(r).toEqual({ name: "Ana", inherited: false });
    });

    it("herda o responsável do projeto quando o produto não tem um", () => {
      const r = effectiveOwner(null, null, "Rodrigo");
      expect(r).toEqual({ name: "Rodrigo", inherited: true });
    });

    it("não inventa responsável quando nem o projeto tem um", () => {
      expect(effectiveOwner(null, null, null)).toEqual({ name: "—", inherited: true });
    });
  });

  describe("alíquota em basis points (percentual nunca vira dinheiro)", () => {
    it("converte percentuais válidos, inclusive os extremos", () => {
      expect(percentToBps("7")).toBe(700);
      expect(percentToBps("7,5")).toBe(750);
      expect(percentToBps("0")).toBe(0);
      expect(percentToBps("100")).toBe(10000);
    });

    it("rejeita entrada vazia ou fora do intervalo", () => {
      expect(percentToBps("")).toBeNull();
      expect(percentToBps("abc")).toBeNull();
      expect(percentToBps("-1")).toBeNull();
      expect(percentToBps("100.1")).toBeNull();
    });

    it("faz o caminho de volta para exibição e edição", () => {
      expect(bpsToPercentLabel(700)).toBe("7%");
      expect(bpsToPercentLabel(0)).toBe("0%");
      expect(bpsToPercentLabel(null)).toBe("—");
      expect(bpsToPercentInput(750)).toBe("7,5");
      expect(bpsToPercentInput(null)).toBe("");
    });
  });

  describe("unidade de estoque", () => {
    it("rotula as unidades conhecidas", () => {
      expect(stockUnitLabel("unidade")).toBe("Unidade");
      expect(stockUnitLabel("kit")).toBe("Kit");
    });

    it("não quebra com valores futuros ainda não mapeados", () => {
      expect(stockUnitLabel("caixa")).toBe("caixa");
    });
  });

  describe("custo total ignora preço de venda", () => {
    it("soma apenas as parcelas de custo", () => {
      expect(
        totalCostCents({
          product_cost_cents: 1000,
          packaging_cost_cents: 30,
          taxes_cents: 70,
          other_costs_cents: null,
          current_sale_price_cents: 9999,
        } as Parameters<typeof totalCostCents>[0]),
      ).toBe(1100);
    });
  });
});
