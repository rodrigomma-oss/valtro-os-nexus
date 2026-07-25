/**
 * Templates de Onboarding pós-venda — Sprint 13.5.
 *
 * Reaproveitamos os TIPOS de pergunta/etapa do VBE (renderer compartilhado),
 * mas o catálogo é separado: briefing (pré-venda) e onboarding (pós-venda)
 * não se acoplam conceitualmente.
 *
 * Regra de segurança: nenhuma pergunta solicita senha ou credencial. Acesso
 * é tratado sempre como STATUS, nunca como credencial.
 */
import type { TemplateQuestion, TemplateStep } from "@/config/briefing-templates";

export interface OnboardingTemplate {
  key: string;
  name: string;
  intro: {
    eyebrow: string;
    title: string;
    description: string;
  };
  steps: TemplateStep[];
}

// ---------------------------------------------------------------------------
// Template piloto: acompanhamento_shopee
// ---------------------------------------------------------------------------
const acompanhamentoShopee: OnboardingTemplate = {
  key: "acompanhamento_shopee",
  name: "Onboarding · Acompanhamento e Gestão Shopee",
  intro: {
    eyebrow: "Onboarding operacional · 8 a 12 minutos",
    title: "Vamos preparar a execução da sua conta",
    description:
      "Este formulário coleta apenas as informações operacionais necessárias para iniciarmos a gestão da sua loja. Nunca pedimos senhas — acessos são tratados como status.",
  },
  steps: [
    {
      id: "loja",
      label: "Loja",
      title: "Identificação da loja",
      description: "Confirme os dados da operação que vamos acompanhar.",
      questions: [
        { id: "empresa", label: "Empresa", kind: "text", placeholder: "Razão social ou nome fantasia" },
        { id: "loja_nome", label: "Nome da loja na Shopee", kind: "text", placeholder: "Como a loja aparece no marketplace" },
        {
          id: "link_loja",
          label: "Link da loja",
          kind: "text",
          placeholder: "https://shopee.com.br/sua-loja",
          hint: "Cole o endereço público da loja.",
        },
        { id: "nome", label: "Responsável pela operação", kind: "text", placeholder: "Quem acompanha o dia a dia" },
        { id: "whatsapp", label: "WhatsApp do responsável", kind: "text", placeholder: "(00) 00000-0000" },
        { id: "email", label: "E-mail do responsável", kind: "text", placeholder: "nome@empresa.com" },
      ],
    },
    {
      id: "catalogo",
      label: "Catálogo",
      title: "Produtos e capacidade",
      description: "Precisamos entender o que priorizar e o que a operação sustenta.",
      questions: [
        {
          id: "produtos_prioritarios",
          label: "Produtos / SKUs prioritários",
          kind: "textarea",
          placeholder: "Liste os produtos que devem receber foco imediato",
        },
        { id: "categorias", label: "Categorias principais", kind: "text", placeholder: "Ex.: casa, eletrônicos, moda" },
        { id: "ticket_medio", label: "Ticket médio atual", kind: "text", optional: true, placeholder: "Ex.: R$ 89" },
        {
          id: "estoque_capacidade",
          label: "Capacidade de estoque / reposição",
          kind: "select",
          options: [
            { value: "estoque_amplo", label: "Estoque amplo — suporta crescimento" },
            { value: "estoque_moderado", label: "Estoque moderado — crescimento gradual" },
            { value: "estoque_limitado", label: "Estoque limitado — risco de ruptura" },
            { value: "sob_demanda", label: "Produção / reposição sob demanda" },
          ],
        },
        {
          id: "reposicao_prazo",
          label: "Prazo médio de reposição",
          kind: "text",
          optional: true,
          placeholder: "Ex.: 7 dias",
        },
      ],
    },
    {
      id: "ads",
      label: "Ads",
      title: "Situação atual de Ads",
      description: "Mapear o histórico evita recomeçar o que já funciona.",
      questions: [
        {
          id: "situacao_ads",
          label: "Situação atual de Shopee Ads",
          kind: "select",
          options: [
            { value: "nunca_usou", label: "Nunca utilizamos" },
            { value: "ativo", label: "Campanhas ativas hoje" },
            { value: "pausado", label: "Já usamos, hoje está pausado" },
            { value: "nao_sei", label: "Não sei informar" },
          ],
        },
        {
          id: "campanhas_existentes",
          label: "Campanhas existentes",
          kind: "textarea",
          optional: true,
          placeholder: "Descreva as campanhas ativas ou pausadas e resultados percebidos",
        },
        {
          id: "investimento_mensal",
          label: "Investimento mensal previsto em Ads",
          kind: "text",
          optional: true,
          placeholder: "Ex.: R$ 1.500",
        },
        {
          id: "objetivo_principal",
          label: "Objetivos imediatos (próximos 30 a 60 dias)",
          kind: "textarea",
          placeholder: "Ex.: aumentar faturamento mantendo margem, girar estoque parado…",
        },
      ],
    },
    {
      id: "acessos",
      label: "Acessos",
      title: "Responsáveis e status de acessos",
      description:
        "Marque apenas o STATUS de cada acesso. Não envie senhas por este formulário — a liberação é feita pelos painéis oficiais.",
      questions: [
        {
          id: "acessos_status",
          label: "Status dos acessos",
          kind: "multiselect",
          hint: "Nunca solicitamos senha. Se algo ainda não estiver liberado, deixe desmarcado.",
          options: [
            { value: "painel_shopee_liberado", label: "Painel Shopee — acesso liberado" },
            { value: "shopee_ads_liberado", label: "Shopee Ads — acesso liberado" },
            { value: "relatorios_liberados", label: "Relatórios / exportações liberados" },
            { value: "planilha_produtos", label: "Planilha de produtos compartilhada" },
            { value: "acesso_pendente", label: "Ainda há acessos pendentes" },
          ],
        },
        {
          id: "responsaveis_internos",
          label: "Responsáveis internos envolvidos",
          kind: "textarea",
          placeholder: "Quem responde por estoque, atendimento e financeiro",
        },
        {
          id: "observacoes_acesso",
          label: "Observações operacionais",
          kind: "textarea",
          optional: true,
          placeholder: "Restrições, prazos, particularidades da operação",
        },
      ],
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
  return template.steps.flatMap((s: TemplateStep) =>
    s.questions.map((q: TemplateQuestion) => q.id),
  );
}

export function validateOnboardingStep(
  step: TemplateStep,
  data: Record<string, unknown>,
): string | null {
  for (const q of step.questions) {
    if (q.optional) continue;
    const value = data[q.id];
    if (q.kind === "multiselect") {
      const arr = Array.isArray(value) ? value : [];
      if (arr.length === 0) return `Selecione ao menos uma opção em "${q.label}".`;
    } else if (typeof value !== "string" || value.trim() === "") {
      return `Preencha o campo "${q.label}" para continuar.`;
    }
  }
  return null;
}
