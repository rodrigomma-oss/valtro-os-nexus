/**
 * Valtro Briefing Engine — Templates (Sprint 2B.3.3)
 *
 * A lógica do Portal é orientada por Template, nunca por condicionais
 * espalhadas na UI. Cada Template define suas etapas e perguntas.
 *
 * Nesta Sprint apenas dois Templates: `loja` e `projeto`.
 * O mapeamento `template_type → template key` está em `resolveTemplate`.
 */
import type { TemplateType } from "@/types/briefing";

export type QuestionKind =
  | "text"
  | "textarea"
  | "select"
  | "multiselect";

export interface TemplateOption {
  value: string;
  label: string;
}

export interface TemplateQuestion {
  id: string;
  label: string;
  kind: QuestionKind;
  placeholder?: string;
  hint?: string;
  optional?: boolean;
  options?: TemplateOption[];
}

export interface TemplateStep {
  id: string;
  label: string;
  title: string;
  description: string;
  questions: TemplateQuestion[];
}

export interface BriefingTemplate {
  key: "loja" | "projeto";
  name: string;
  intro: {
    eyebrow: string;
    title: string;
    description: string;
  };
  steps: TemplateStep[];
}

// ---------------------------------------------------------------------------
// Template LOJA — para gestão de marketplaces (Shopee, ML, Amazon, etc.)
// ---------------------------------------------------------------------------
const templateLoja: BriefingTemplate = {
  key: "loja",
  name: "Briefing de Loja",
  intro: {
    eyebrow: "Briefing Valtro Labs · 10 a 15 minutos",
    title: "Vamos entender o momento da sua operação.",
    description:
      "Este briefing foi desenhado para captar, de forma objetiva, o essencial da sua operação. Com base nas suas respostas, nossa equipe prepara um retorno consultivo com direção clara.",
  },
  steps: [
    {
      id: "empresa",
      label: "Empresa",
      title: "Sobre a sua empresa",
      description: "Comece nos contando um pouco sobre você e o seu negócio.",
      questions: [
        { id: "nome", label: "Seu nome", kind: "text", placeholder: "Como podemos te chamar" },
        { id: "empresa", label: "Empresa", kind: "text", placeholder: "Nome da sua empresa" },
        { id: "segmento", label: "Segmento", kind: "text", placeholder: "Ex: moda, casa, eletrônicos" },
        {
          id: "tempoAtuacao",
          label: "Tempo de atuação",
          kind: "select",
          options: [
            { value: "menos-1", label: "Menos de 1 ano" },
            { value: "1-3", label: "1 a 3 anos" },
            { value: "3-5", label: "3 a 5 anos" },
            { value: "5+", label: "Mais de 5 anos" },
          ],
        },
        { id: "cidade", label: "Cidade", kind: "text", optional: true, placeholder: "Cidade" },
        { id: "estado", label: "Estado", kind: "text", optional: true, placeholder: "UF" },
      ],
    },
    {
      id: "loja",
      label: "Loja",
      title: "Sua operação de venda",
      description: "Onde você vende e qual o tamanho atual da operação.",
      questions: [
        {
          id: "marketplace",
          label: "Marketplace principal",
          kind: "select",
          options: [
            { value: "shopee", label: "Shopee" },
            { value: "mercado-livre", label: "Mercado Livre" },
            { value: "amazon", label: "Amazon" },
            { value: "magalu", label: "Magalu" },
            { value: "outros", label: "Outros" },
          ],
        },
        { id: "link", label: "Link da loja", kind: "text", optional: true, placeholder: "https://" },
        {
          id: "qtdProdutos",
          label: "Quantidade aproximada de produtos",
          kind: "select",
          options: [
            { value: "1-50", label: "1 a 50" },
            { value: "51-200", label: "51 a 200" },
            { value: "201-1000", label: "201 a 1.000" },
            { value: "1000+", label: "Mais de 1.000" },
          ],
        },
        {
          id: "faturamento",
          label: "Faturamento mensal aproximado",
          kind: "select",
          options: [
            { value: "ate-20", label: "Até R$ 20 mil" },
            { value: "20-50", label: "R$ 20 a 50 mil" },
            { value: "50-100", label: "R$ 50 a 100 mil" },
            { value: "100-300", label: "R$ 100 a 300 mil" },
            { value: "300+", label: "Acima de R$ 300 mil" },
          ],
        },
      ],
    },
    {
      id: "objetivos",
      label: "Objetivos",
      title: "O que você quer alcançar",
      description: "Selecione os objetivos que mais representam o seu momento.",
      questions: [
        {
          id: "objetivos",
          label: "Quais objetivos representam o seu momento?",
          kind: "multiselect",
          hint: "Selecione quantos quiser.",
          options: [
            { value: "aumentar-vendas", label: "Aumentar vendas" },
            { value: "melhorar-margem", label: "Melhorar margem" },
            { value: "organizar-anuncios", label: "Organizar anúncios" },
            { value: "escalar-operacao", label: "Escalar operação" },
            { value: "melhorar-posicionamento", label: "Melhorar posicionamento" },
            { value: "reduzir-custos", label: "Reduzir custos operacionais" },
          ],
        },
        {
          id: "objetivosOutro",
          label: "Outros objetivos",
          kind: "textarea",
          optional: true,
          placeholder: "Conte-nos algo específico que você quer alcançar",
        },
      ],
    },
    {
      id: "marketing",
      label: "Marketing",
      title: "Marketing e anúncios",
      description: "Como você atrai clientes hoje e onde investe.",
      questions: [
        {
          id: "usaAds",
          label: "Utiliza anúncios pagos no marketplace?",
          kind: "select",
          options: [
            { value: "sim", label: "Sim, ativamente" },
            { value: "as-vezes", label: "Às vezes" },
            { value: "nao", label: "Não" },
          ],
        },
        {
          id: "investimento",
          label: "Investimento mensal em anúncios",
          kind: "select",
          options: [
            { value: "0", label: "Não invisto hoje" },
            { value: "ate-1k", label: "Até R$ 1 mil" },
            { value: "1-5k", label: "R$ 1 a 5 mil" },
            { value: "5-15k", label: "R$ 5 a 15 mil" },
            { value: "15k+", label: "Acima de R$ 15 mil" },
          ],
        },
        {
          id: "campanhas",
          label: "Descreva brevemente suas campanhas atuais",
          kind: "textarea",
          optional: true,
          placeholder: "Formatos, produtos em destaque, resultados percebidos...",
        },
      ],
    },
    {
      id: "operacao",
      label: "Operação",
      title: "Operação e bastidores",
      description: "Como funciona o dia a dia da sua loja.",
      questions: [
        {
          id: "equipe",
          label: "Tamanho da equipe",
          kind: "select",
          options: [
            { value: "so-eu", label: "Só eu" },
            { value: "2-5", label: "2 a 5 pessoas" },
            { value: "6-15", label: "6 a 15 pessoas" },
            { value: "15+", label: "Mais de 15 pessoas" },
          ],
        },
        {
          id: "estoque",
          label: "Modelo de estoque",
          kind: "select",
          options: [
            { value: "proprio", label: "Estoque próprio" },
            { value: "fulfillment", label: "Fulfillment do marketplace" },
            { value: "dropshipping", label: "Dropshipping" },
            { value: "misto", label: "Misto" },
          ],
        },
        {
          id: "expedicao",
          label: "Modelo de expedição",
          kind: "select",
          options: [
            { value: "propria", label: "Expedição própria" },
            { value: "marketplace", label: "Coleta pelo marketplace" },
            { value: "terceirizada", label: "Terceirizada" },
          ],
        },
        {
          id: "dificuldades",
          label: "Principais dificuldades hoje",
          kind: "textarea",
          optional: true,
          placeholder: "Compartilhe o que mais tem tomado seu tempo ou gerado atrito",
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Template PROJETO — para consultorias / diagnósticos / projetos sob medida
// ---------------------------------------------------------------------------
const templateProjeto: BriefingTemplate = {
  key: "projeto",
  name: "Briefing de Projeto",
  intro: {
    eyebrow: "Briefing Valtro Labs · 5 a 10 minutos",
    title: "Conte-nos sobre o projeto que você quer tirar do papel.",
    description:
      "Este briefing captura o essencial do projeto para que nossa equipe possa preparar um retorno consultivo alinhado ao seu momento e aos seus objetivos.",
  },
  steps: [
    {
      id: "identificacao",
      label: "Identificação",
      title: "Sobre você",
      description: "Precisamos apenas do essencial para começar.",
      questions: [
        { id: "nome", label: "Seu nome", kind: "text", placeholder: "Como podemos te chamar" },
        { id: "empresa", label: "Empresa ou projeto", kind: "text", placeholder: "Nome da empresa ou do projeto" },
        { id: "papel", label: "Seu papel", kind: "text", optional: true, placeholder: "Ex: fundador, gestor, sócio" },
      ],
    },
    {
      id: "contexto",
      label: "Contexto",
      title: "O contexto atual",
      description: "Ajude-nos a entender o momento do projeto.",
      questions: [
        {
          id: "estagio",
          label: "Em que estágio está o projeto?",
          kind: "select",
          options: [
            { value: "ideia", label: "Ainda é uma ideia" },
            { value: "validacao", label: "Em validação" },
            { value: "operando", label: "Já opera, buscando evolução" },
            { value: "reposicionamento", label: "Em reposicionamento" },
          ],
        },
        {
          id: "descricao",
          label: "Descreva brevemente o projeto",
          kind: "textarea",
          placeholder: "O que ele faz, para quem, e como está hoje",
        },
      ],
    },
    {
      id: "objetivos",
      label: "Objetivos",
      title: "O que você quer alcançar",
      description: "O que caracteriza um bom resultado para você.",
      questions: [
        {
          id: "objetivo",
          label: "Objetivo principal",
          kind: "textarea",
          placeholder: "Onde você quer chegar nos próximos 6 a 12 meses",
        },
        {
          id: "prioridades",
          label: "Prioridades para os próximos passos",
          kind: "multiselect",
          hint: "Selecione as que fazem sentido.",
          options: [
            { value: "estrategia", label: "Estratégia e posicionamento" },
            { value: "marca", label: "Marca e identidade" },
            { value: "produto", label: "Produto e portfólio" },
            { value: "marketing", label: "Marketing e canais" },
            { value: "operacao", label: "Operação e processos" },
            { value: "tecnologia", label: "Tecnologia e plataforma" },
          ],
        },
      ],
    },
    {
      id: "expectativas",
      label: "Expectativas",
      title: "Como podemos ajudar",
      description: "O que você espera do trabalho conjunto.",
      questions: [
        {
          id: "prazo",
          label: "Prazo desejado para os primeiros resultados",
          kind: "select",
          options: [
            { value: "30", label: "Até 30 dias" },
            { value: "60-90", label: "60 a 90 dias" },
            { value: "3-6m", label: "3 a 6 meses" },
            { value: "sem-prazo", label: "Sem prazo definido" },
          ],
        },
        {
          id: "investimento",
          label: "Faixa de investimento considerada",
          kind: "select",
          optional: true,
          options: [
            { value: "ate-5k", label: "Até R$ 5 mil" },
            { value: "5-15k", label: "R$ 5 a 15 mil" },
            { value: "15-40k", label: "R$ 15 a 40 mil" },
            { value: "40k+", label: "Acima de R$ 40 mil" },
            { value: "avaliar", label: "Prefiro avaliar depois" },
          ],
        },
        {
          id: "observacoes",
          label: "Observações finais",
          kind: "textarea",
          optional: true,
          placeholder: "Algo mais que julgue importante compartilhar",
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Registry + resolver
// ---------------------------------------------------------------------------
export const BRIEFING_TEMPLATES = {
  loja: templateLoja,
  projeto: templateProjeto,
} as const;

export type TemplateKey = keyof typeof BRIEFING_TEMPLATES;

/**
 * Mapeia `template_type` (armazenado no token) → chave do Template.
 * Nesta Sprint só existem dois: `loja` e `projeto`.
 * Novos serviços só precisam adicionar um novo template e mapear aqui.
 */
export function resolveTemplateKey(templateType: TemplateType): TemplateKey {
  switch (templateType) {
    case "consultoria":
    case "custom":
      return "projeto";
    case "diagnostico":
    case "padrao":
    case "shopee":
    case "mercadolivre":
    case "amazon":
    case "multicanal":
    default:
      return "loja";
  }
}

export function getTemplate(templateType: TemplateType): BriefingTemplate {
  return BRIEFING_TEMPLATES[resolveTemplateKey(templateType)];
}

/**
 * Valida uma etapa contra os dados do cliente. Retorna null se OK,
 * ou uma mensagem amigável se algum campo obrigatório estiver vazio.
 */
export function validateTemplateStep(
  step: TemplateStep,
  data: Record<string, unknown>,
): string | null {
  for (const q of step.questions) {
    if (q.optional) continue;
    const value = data[q.id];
    if (q.kind === "multiselect") {
      const arr = Array.isArray(value) ? value : [];
      if (arr.length === 0) return `Selecione ao menos uma opção em "${q.label}".`;
    } else {
      if (typeof value !== "string" || value.trim() === "") {
        return `Preencha o campo "${q.label}" para continuar.`;
      }
    }
  }
  return null;
}
