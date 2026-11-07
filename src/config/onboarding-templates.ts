/**
 * Templates de Onboarding pós-venda — Sprint 13.5, simplificado na 15.1.1.
 *
 * PRINCÍPIO (decisão de produto): "informação conhecida não deve ser
 * solicitada novamente ao cliente". O onboarding é COMPLEMENTAR — só pergunta
 * o que depende do cliente e é necessário para iniciar a operação.
 *
 * Portanto NÃO perguntamos: identidade/contato (já está no Lead e no CRM),
 * dados públicos da loja, categorias, ticket médio, faturamento, situação de
 * Ads, campanhas, investimento histórico, impressões, cliques, CTR, CPC,
 * ROAS, ACOS, vendas ou pedidos. Tudo isso a Valtro Labs levanta direto na
 * Shopee.
 *
 * Regra de segurança (inalterada e reforçada): nenhuma pergunta solicita
 * senha, token, cookie ou código de acesso. O status do acesso pertence a
 * `project_operations.operational_access_status` e é controlado internamente.
 */
import type { QuestionKind, TemplateOption } from "@/config/briefing-templates";
import { formatProductItems, validateProductItems } from "@/lib/onboarding-products";

/** O onboarding estende o renderer do VBE com a lista estruturada de produtos. */
export type OnboardingQuestionKind = QuestionKind | "product_list";

export interface OnboardingQuestion {
  id: string;
  label: string;
  kind: OnboardingQuestionKind;
  placeholder?: string;
  hint?: string;
  optional?: boolean;
  options?: TemplateOption[];
}

export interface OnboardingStep {
  id: string;
  label: string;
  title: string;
  description: string;
  /** Etapa apenas de revisão: não coleta respostas novas. */
  reviewOnly?: boolean;
  questions: OnboardingQuestion[];
}

export interface OnboardingTemplate {
  key: string;
  name: string;
  intro: {
    eyebrow: string;
    title: string;
    description: string;
  };
  steps: OnboardingStep[];
}

/** Opções de dia da reunião — mapeáveis 1:1 para `meeting_weekday`. */
export const MEETING_DAY_OPTIONS: TemplateOption[] = [
  { value: "1", label: "Segunda-feira" },
  { value: "2", label: "Terça-feira" },
  { value: "3", label: "Quarta-feira" },
  { value: "4", label: "Quinta-feira" },
  { value: "5", label: "Sexta-feira" },
  { value: "sem_preferencia", label: "Sem preferência — a Valtro Labs sugere" },
];

// ---------------------------------------------------------------------------
// Template piloto: acompanhamento_shopee
// ---------------------------------------------------------------------------
const acompanhamentoShopee: OnboardingTemplate = {
  key: "acompanhamento_shopee",
  name: "Onboarding · Acompanhamento e Gestão Shopee",
  intro: {
    eyebrow: "Onboarding operacional · 5 minutos",
    title: "Só o que depende de você para começarmos",
    description:
      "Já temos os dados da sua empresa e conseguimos levantar as informações da loja direto na Shopee. Aqui pedimos apenas o que não conseguimos ver de fora: custos, capacidade de reposição e as regras do investimento em Ads. Nunca solicitamos senha ou código de acesso.",
  },
  steps: [
    {
      id: "produtos",
      label: "Produtos",
      title: "Produtos e custos",
      description:
        "Liste os produtos que entram no acompanhamento inicial. O custo de aquisição é o dado que não conseguimos obter pela Shopee e é o que permite avaliar margem real.",
      questions: [
        {
          id: "produtos",
          label: "Produtos considerados no acompanhamento",
          kind: "product_list",
          hint: "Informe pelo menos o nome e o custo unitário de cada produto.",
        },
        {
          id: "produtos_liquidar",
          label: "Existem produtos que você deseja apenas liquidar?",
          kind: "textarea",
          optional: true,
          placeholder: "Produtos para girar estoque, mesmo com margem menor",
        },
        {
          id: "produtos_novos",
          label: "Existem produtos novos que gostaria de priorizar ou testar?",
          kind: "textarea",
          optional: true,
          placeholder: "Lançamentos ou itens que ainda não foram trabalhados",
        },
        {
          id: "produtos_sem_reposicao",
          label: "Existem produtos que não pretende repor?",
          kind: "textarea",
          optional: true,
          placeholder: "Itens em descontinuação",
        },
        {
          id: "kits_combinacoes",
          label: "Existem kits ou combinações de produtos que gostaria que avaliássemos?",
          kind: "textarea",
          optional: true,
          placeholder: "Combos, múltiplos, brindes",
        },
        {
          id: "custo_por_pedido",
          label: "Existe custo de embalagem ou outro custo por pedido que devemos considerar?",
          kind: "textarea",
          optional: true,
          placeholder: "Ex.: R$ 1,80 de embalagem por pedido",
        },
        {
          id: "custos_nao_visiveis",
          label:
            "Existem impostos ou outros custos relevantes que não conseguimos visualizar pela Shopee?",
          kind: "textarea",
          optional: true,
          placeholder: "Regime tributário, comissões de terceiros, frete próprio",
        },
      ],
    },
    {
      id: "ads_rotina",
      label: "Ads e rotina",
      title: "Ads e rotina de trabalho",
      description:
        "Define o quanto podemos investir e com que autonomia, além do ritmo do acompanhamento.",
      questions: [
        {
          id: "ads_orcamento_mensal",
          label: "Orçamento mensal disponível para Shopee Ads",
          kind: "text",
          placeholder: "Ex.: R$ 1.500,00",
        },
        {
          id: "ads_limite_autonomia",
          label: "Limite de investimento que podemos usar sem solicitar nova autorização",
          kind: "text",
          placeholder: "Ex.: R$ 500,00",
          hint: "Acima desse valor, pedimos sua aprovação antes de investir.",
        },
        {
          id: "reuniao_dia",
          label: "Melhor dia para a reunião semanal",
          kind: "select",
          options: MEETING_DAY_OPTIONS,
        },
        {
          id: "reuniao_horario",
          label: "Melhor horário",
          kind: "text",
          optional: true,
          placeholder: "Ex.: 14h às 16h",
        },
        {
          id: "observacoes_operacionais",
          label: "Observações operacionais adicionais",
          kind: "textarea",
          optional: true,
          placeholder: "Restrições, prazos, particularidades da operação",
        },
      ],
    },
    {
      id: "revisao",
      label: "Revisão",
      title: "Revise antes de enviar",
      description: "Confira as informações. Nenhuma pergunta nova nesta etapa.",
      reviewOnly: true,
      questions: [],
    },
  ],
};

export const ONBOARDING_TEMPLATES: Record<string, OnboardingTemplate> = {
  acompanhamento_shopee: acompanhamentoShopee,
};

export function getOnboardingTemplate(key: string): OnboardingTemplate | null {
  return ONBOARDING_TEMPLATES[key] ?? null;
}

/** Whitelist explícita: apenas ids de perguntas do template são persistidos. */
export function onboardingAllowedKeys(key: string): string[] {
  const template = getOnboardingTemplate(key);
  if (!template) return [];
  return template.steps.flatMap((s) => s.questions.map((q) => q.id));
}

/** Perguntas do tipo lista de produtos (tratamento estruturado na sanitização). */
export function onboardingProductKeys(key: string): string[] {
  const template = getOnboardingTemplate(key);
  if (!template) return [];
  return template.steps.flatMap((s) =>
    s.questions.filter((q) => q.kind === "product_list").map((q) => q.id),
  );
}

export function validateOnboardingStep(
  step: OnboardingStep,
  data: Record<string, unknown>,
  options?: { productsLimit?: number | null },
): string | null {
  for (const q of step.questions) {
    const value = data[q.id];

    if (q.kind === "product_list") {
      const error = validateProductItems(value, {
        required: !q.optional,
        limit: options?.productsLimit ?? null,
      });
      if (error) return error;
      continue;
    }

    if (q.optional) continue;

    if (q.kind === "multiselect") {
      const arr = Array.isArray(value) ? value : [];
      if (arr.length === 0) return `Selecione ao menos uma opção em "${q.label}".`;
    } else if (typeof value !== "string" || value.trim() === "") {
      return `Preencha o campo "${q.label}" para continuar.`;
    }
  }
  return null;
}

/** Formata a resposta de uma pergunta para leitura humana (UI interna e revisão). */
export function formatOnboardingAnswer(q: OnboardingQuestion, value: unknown): string {
  if (q.kind === "product_list") return formatProductItems(value);
  if (value === undefined || value === null || value === "") return "—";
  if (q.kind === "multiselect") {
    const arr: string[] = Array.isArray(value) ? (value as string[]) : [];
    if (arr.length === 0) return "—";
    return arr.map((v) => q.options?.find((o) => o.value === v)?.label ?? v).join(", ");
  }
  if (q.kind === "select") {
    return q.options?.find((o) => o.value === value)?.label ?? String(value);
  }
  return String(value);
}
