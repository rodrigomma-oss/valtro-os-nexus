/**
 * Onboarding simplificado do Acompanhamento Shopee — Sprint 15.1.1.
 *
 * Cobre as três garantias da adequação:
 * 1. o template não volta a perguntar o que já é conhecido;
 * 2. a lista de produtos é normalizada e limitada com segurança;
 * 3. o espelhamento em `project_operations` nunca sobrescreve o operador.
 */
import { describe, expect, it } from "vitest";
import {
  getOnboardingTemplate,
  onboardingAllowedKeys,
  onboardingProductKeys,
  validateOnboardingStep,
  formatOnboardingAnswer,
} from "@/config/onboarding-templates";
import {
  normalizeProductItems,
  resolveProductCap,
  validateProductItems,
  PRODUCT_HARD_CAP,
} from "@/lib/onboarding-products";
import {
  operationsPatchFromOnboarding,
  parseCurrencyToCents,
  parseMeetingWeekday,
} from "@/lib/onboarding-operations-sync";

const TEMPLATE = "acompanhamento_shopee";

describe("template simplificado", () => {
  it("tem exatamente 3 etapas, sendo a última somente revisão", () => {
    const t = getOnboardingTemplate(TEMPLATE)!;
    expect(t.steps.map((s) => s.id)).toEqual(["produtos", "ads_rotina", "revisao"]);
    expect(t.steps[2].reviewOnly).toBe(true);
    expect(t.steps[2].questions).toHaveLength(0);
  });

  it("não pergunta dados já conhecidos, públicos ou obteníveis na Shopee", () => {
    const removed = [
      "empresa", "nome", "email", "whatsapp", "loja_nome", "link_loja",
      "categorias", "ticket_medio", "faturamento", "situacao_ads",
      "campanhas_existentes", "investimento_mensal", "impressoes", "cliques",
      "ctr", "cpc", "roas", "acos", "vendas", "pedidos",
    ];
    const keys = onboardingAllowedKeys(TEMPLATE);
    for (const k of removed) expect(keys).not.toContain(k);
  });

  it("removeu por completo a etapa pública de acesso", () => {
    const t = getOnboardingTemplate(TEMPLATE)!;
    expect(t.steps.some((s) => s.id === "acessos")).toBe(false);
    const keys = onboardingAllowedKeys(TEMPLATE);
    for (const k of ["acessos_status", "observacoes_acesso", "senha", "token", "cookie"]) {
      expect(keys).not.toContain(k);
    }
  });

  it("coleta apenas o que depende do cliente", () => {
    expect(onboardingAllowedKeys(TEMPLATE).sort()).toEqual(
      [
        "ads_limite_autonomia",
        "ads_orcamento_mensal",
        "custo_por_pedido",
        "custos_nao_visiveis",
        "kits_combinacoes",
        "observacoes_operacionais",
        "produtos",
        "produtos_liquidar",
        "produtos_novos",
        "produtos_sem_reposicao",
        "reuniao_dia",
        "reuniao_horario",
      ].sort(),
    );
    expect(onboardingProductKeys(TEMPLATE)).toEqual(["produtos"]);
  });
});

describe("lista de produtos", () => {
  const item = (nome: string) => ({ nome, custo_unitario: "R$ 10,00" });

  it("descarta chaves desconhecidas e linhas vazias", () => {
    const out = normalizeProductItems([
      { nome: " Caneca ", custo_unitario: "R$ 9,90", hack: "<script>", senha: "123" },
      { nome: "", custo_unitario: "" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      nome: "Caneca",
      custo_unitario: "R$ 9,90",
      estoque: "",
      prazo_reposicao: "",
      limitacao_fornecimento: "",
      observacao: "",
    });
    expect(Object.keys(out[0])).not.toContain("senha");
  });

  it("respeita o limite contratual e não usa fallback fixo quando ausente", () => {
    expect(resolveProductCap(3)).toBe(3);
    expect(resolveProductCap(null)).toBe(PRODUCT_HARD_CAP);
    const five = [1, 2, 3, 4, 5].map((n) => item(`P${n}`));
    expect(normalizeProductItems(five, 3)).toHaveLength(3);
    expect(normalizeProductItems(five, null)).toHaveLength(5);
  });

  it("valida obrigatoriedade, nome, custo e excedente do plano", () => {
    expect(validateProductItems([], { required: true })).toMatch(/ao menos um produto/);
    expect(validateProductItems([], { required: false })).toBeNull();
    expect(validateProductItems([{ nome: "", custo_unitario: "", estoque: "10" }], { required: true }))
      .toMatch(/nome do produto/);
    expect(validateProductItems([{ nome: "Caneca", custo_unitario: "" }], { required: true }))
      .toMatch(/custo unitário/);
    expect(validateProductItems([item("A"), item("B")], { required: true, limit: 1 }))
      .toMatch(/até 1 produto/);
    expect(validateProductItems([item("A")], { required: true, limit: 1 })).toBeNull();
  });

  it("valida a etapa de produtos pelo template", () => {
    const step = getOnboardingTemplate(TEMPLATE)!.steps[0];
    expect(validateOnboardingStep(step, {})).toMatch(/ao menos um produto/);
    expect(validateOnboardingStep(step, { produtos: [item("Caneca")] })).toBeNull();
  });

  it("formata os produtos para leitura do operador", () => {
    const q = getOnboardingTemplate(TEMPLATE)!.steps[0].questions[0];
    expect(formatOnboardingAnswer(q, [])).toBe("—");
    expect(formatOnboardingAnswer(q, [{ nome: "Caneca", custo_unitario: "R$ 9,90" }]))
      .toBe("1. Caneca · custo R$ 9,90");
  });
});

describe("espelhamento em project_operations", () => {
  it("converte valores monetários em centavos", () => {
    expect(parseCurrencyToCents("R$ 1.500,00")).toBe(150000);
    expect(parseCurrencyToCents("1500")).toBe(150000);
    expect(parseCurrencyToCents("1.500")).toBe(150000);
    expect(parseCurrencyToCents("1500.50")).toBe(150050);
    expect(parseCurrencyToCents("R$ 89,90")).toBe(8990);
    expect(parseCurrencyToCents("não sei")).toBeNull();
    expect(parseCurrencyToCents(undefined)).toBeNull();
  });

  it("mapeia o dia da reunião e ignora 'sem preferência'", () => {
    expect(parseMeetingWeekday("3")).toBe(3);
    expect(parseMeetingWeekday("sem_preferencia")).toBeNull();
    expect(parseMeetingWeekday("9")).toBeNull();
  });

  it("preenche apenas campos vazios da operação", () => {
    const answers = {
      ads_orcamento_mensal: "R$ 1.500,00",
      ads_limite_autonomia: "R$ 500",
      reuniao_dia: "2",
      reuniao_horario: "14h",
      observacoes_operacionais: "Não anunciar aos domingos.",
    };
    expect(operationsPatchFromOnboarding(answers, null)).toEqual({
      ads_monthly_budget_cents: 150000,
      ads_autonomy_limit_cents: 50000,
      meeting_weekday: 2,
      notes: "Melhor horário informado no onboarding: 14h. Não anunciar aos domingos.",
    });
  });

  it("nunca sobrescreve valores já definidos pelo operador", () => {
    const patch = operationsPatchFromOnboarding(
      { ads_orcamento_mensal: "R$ 1.500,00", ads_limite_autonomia: "R$ 500", reuniao_dia: "2" },
      {
        ads_monthly_budget_cents: 999900,
        ads_autonomy_limit_cents: null,
        meeting_weekday: 5,
        notes: "definido pelo operador",
      },
    );
    expect(patch).toEqual({ ads_autonomy_limit_cents: 50000 });
  });

  it("não produz patch quando não há respostas aproveitáveis", () => {
    expect(operationsPatchFromOnboarding({ ads_orcamento_mensal: "" }, null)).toEqual({});
  });
});
