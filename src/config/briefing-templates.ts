/**
 * Valtro Briefing Engine — Templates (Sprint 2B.3.3 / 2B.3.4)
 *
 * A lógica do Portal é orientada por Template, nunca por condicionais
 * espalhadas na UI. Cada Template define suas etapas e perguntas.
 *
 * Nesta Sprint apenas dois Templates: `loja` e `projeto`.
 * A cadeia é `service_type → template_type → template key`, centralizada
 * em `templateTypeForService` e `resolveTemplateKey`.
 */
import type { ServiceType, TemplateType } from "@/types/briefing";

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
  key: "loja" | "projeto" | "consultoria" | "diagnostico";
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
      label: "Seus dados",
      title: "Confirme seus dados",
      description:
        "Já coletamos algumas informações durante nosso atendimento. Confira os dados abaixo e faça alterações apenas se necessário.",
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
    eyebrow: "Briefing Valtro Labs · 8 a 10 minutos",
    title: "Vamos entender o projeto que você quer tirar do papel.",
    description:
      "Este é um briefing consultivo. Cada pergunta foi pensada para reduzir incertezas e permitir que nossa equipe prepare um retorno técnico alinhado ao seu momento, ao seu problema e ao que você quer alcançar.",
  },
  steps: [
    // -------- Seção 1: Confirme seus dados --------
    {
      id: "identificacao",
      label: "Seus dados",
      title: "Confirme seus dados",
      description:
        "Revise seus dados antes de continuar. Caso alguma informação esteja incorreta, você poderá alterá-la.",
      questions: [
        { id: "nome", label: "Nome completo", kind: "text", placeholder: "Como podemos te chamar" },
        { id: "empresa", label: "Empresa ou Projeto", kind: "text", placeholder: "Nome da empresa ou do projeto" },
        { id: "whatsapp", label: "WhatsApp", kind: "text", placeholder: "(00) 00000-0000" },
        { id: "email", label: "E-mail", kind: "text", placeholder: "voce@exemplo.com" },
        { id: "cidade", label: "Cidade", kind: "text", placeholder: "Cidade" },
        { id: "estado", label: "Estado", kind: "text", placeholder: "UF" },
      ],
    },
    // -------- Seção 2: Sobre o Projeto --------
    {
      id: "tipo_projeto",
      label: "Projeto",
      title: "Sobre o projeto",
      description: "Para começar, nos conte que tipo de projeto você tem em mente.",
      questions: [
        {
          id: "tipo_projeto",
          label: "Qual tipo de projeto deseja desenvolver?",
          kind: "select",
          options: [
            { value: "landing_page", label: "Landing Page" },
            { value: "site_institucional", label: "Site Institucional" },
            { value: "loja_virtual", label: "Loja Virtual" },
            { value: "sistema_web", label: "Sistema Web" },
            { value: "aplicativo", label: "Aplicativo" },
            { value: "automacao", label: "Automação" },
            { value: "integracao", label: "Integração entre Sistemas" },
            { value: "dashboard", label: "Dashboard" },
            { value: "ia", label: "Inteligência Artificial" },
            { value: "outro", label: "Outro" },
          ],
        },
        {
          id: "tipo_projeto_outro",
          label: "Se selecionou Outro, descreva",
          kind: "textarea",
          optional: true,
          hint: "Preencha apenas se marcou \"Outro\" acima.",
          placeholder: "Descreva o tipo de projeto que tem em mente",
        },
      ],
    },
    // -------- Seção 3: Entendendo a Necessidade --------
    {
      id: "necessidade",
      label: "Necessidade",
      title: "Entendendo a necessidade",
      description:
        "Esta é a parte mais importante do briefing. Quanto mais claro for o problema, mais precisa será nossa proposta.",
      questions: [
        {
          id: "descricao",
          label: "Descreva com suas palavras o que deseja desenvolver",
          kind: "textarea",
          placeholder: "Explique como se estivesse contando para alguém que nunca ouviu falar do projeto",
        },
        {
          id: "problema",
          label: "Qual problema esse projeto pretende resolver?",
          kind: "textarea",
          placeholder: "O que dói hoje? O que não funciona bem?",
        },
        {
          id: "objetivo_principal",
          label: "Qual é o principal objetivo deste projeto?",
          kind: "select",
          options: [
            { value: "vender_mais", label: "Vender mais" },
            { value: "automatizar", label: "Automatizar processos" },
            { value: "economizar_tempo", label: "Economizar tempo" },
            { value: "organizar", label: "Organizar informações" },
            { value: "atendimento", label: "Melhorar atendimento" },
            { value: "reduzir_custos", label: "Reduzir custos" },
            { value: "outro", label: "Outro" },
          ],
        },
        {
          id: "objetivo_outro",
          label: "Se selecionou Outro, descreva o objetivo",
          kind: "textarea",
          optional: true,
          hint: "Preencha apenas se marcou \"Outro\" acima.",
          placeholder: "Qual é o objetivo específico?",
        },
        {
          id: "processo_atual",
          label: "Como esse processo funciona atualmente?",
          kind: "textarea",
          hint: "Conte como essa atividade é realizada hoje (papel, planilhas, WhatsApp, outro sistema etc.).",
          placeholder: "Descreva o fluxo atual, mesmo que seja manual",
        },
      ],
    },
    // -------- Seção 4: Funcionalidades --------
    {
      id: "funcionalidades",
      label: "Funcionalidades",
      title: "Funcionalidades",
      description:
        "Selecione tudo que faz sentido para o seu projeto. Em seguida, destaque o que é indispensável já na primeira versão.",
      questions: [
        {
          id: "funcionalidades",
          label: "Quais funcionalidades você acredita que o projeto deve possuir?",
          kind: "multiselect",
          hint: "Selecione quantas quiser.",
          options: [
            { value: "login", label: "Login" },
            { value: "cadastro_usuarios", label: "Cadastro de usuários" },
            { value: "painel_admin", label: "Painel Administrativo" },
            { value: "dashboard", label: "Dashboard" },
            { value: "relatorios", label: "Relatórios" },
            { value: "int_whatsapp", label: "Integração WhatsApp" },
            { value: "int_stripe", label: "Integração Stripe" },
            { value: "int_mercadopago", label: "Integração Mercado Pago" },
            { value: "int_shopee", label: "Integração Shopee" },
            { value: "api", label: "API" },
            { value: "upload", label: "Upload de arquivos" },
            { value: "financeiro", label: "Controle Financeiro" },
            { value: "area_cliente", label: "Área do Cliente" },
            { value: "notificacoes", label: "Notificações" },
            { value: "outro", label: "Outro" },
          ],
        },
        {
          id: "funcionalidades_outro",
          label: "Se selecionou Outro, descreva",
          kind: "textarea",
          optional: true,
          hint: "Preencha apenas se marcou \"Outro\" acima.",
          placeholder: "Descreva outras funcionalidades desejadas",
        },
        {
          id: "funcionalidades_mvp",
          label: "Quais dessas funcionalidades são indispensáveis na primeira versão?",
          kind: "multiselect",
          hint: "Pense no MVP: o mínimo que precisa existir para o projeto entregar valor.",
          options: [
            { value: "login", label: "Login" },
            { value: "cadastro_usuarios", label: "Cadastro de usuários" },
            { value: "painel_admin", label: "Painel Administrativo" },
            { value: "dashboard", label: "Dashboard" },
            { value: "relatorios", label: "Relatórios" },
            { value: "int_whatsapp", label: "Integração WhatsApp" },
            { value: "int_stripe", label: "Integração Stripe" },
            { value: "int_mercadopago", label: "Integração Mercado Pago" },
            { value: "int_shopee", label: "Integração Shopee" },
            { value: "api", label: "API" },
            { value: "upload", label: "Upload de arquivos" },
            { value: "financeiro", label: "Controle Financeiro" },
            { value: "area_cliente", label: "Área do Cliente" },
            { value: "notificacoes", label: "Notificações" },
          ],
        },
      ],
    },
    // -------- Seção 5: Referências --------
    {
      id: "referencias",
      label: "Referências",
      title: "Referências",
      description:
        "Referências nos ajudam a entender o padrão de qualidade e a experiência que você imagina.",
      questions: [
        {
          id: "ref_sistema",
          label: "Existe algum sistema parecido com o que você imagina?",
          kind: "textarea",
          optional: true,
          placeholder: "Cole links ou cite nomes",
        },
        {
          id: "ref_visual",
          label: "Existe alguma referência visual que você goste?",
          kind: "textarea",
          optional: true,
          placeholder: "Links de sites, apps ou marcas",
        },
        {
          id: "ref_gosto",
          label: "O que você mais gosta nessas referências?",
          kind: "textarea",
          optional: true,
          placeholder: "Estilo visual, funcionalidades, fluxo, etc.",
        },
      ],
    },
    // -------- Seção 6: Situação Atual --------
    {
      id: "situacao",
      label: "Situação",
      title: "Situação atual",
      description: "Onde o projeto está hoje e quem vai usar o que estamos construindo.",
      questions: [
        {
          id: "existe",
          label: "O projeto já existe?",
          kind: "select",
          options: [
            { value: "ideia", label: "Ainda é apenas uma ideia" },
            { value: "sistema_antigo", label: "Existe um sistema antigo" },
            { value: "melhorias", label: "Precisa de melhorias" },
            { value: "do_zero", label: "Precisa ser desenvolvido do zero" },
            { value: "reconstruido", label: "Precisa ser reconstruído" },
          ],
        },
        {
          id: "usuarios",
          label: "Quem utilizará esse sistema?",
          kind: "multiselect",
          hint: "Selecione todos que se aplicam.",
          options: [
            { value: "apenas_eu", label: "Apenas eu" },
            { value: "equipe", label: "Minha equipe" },
            { value: "clientes", label: "Clientes" },
            { value: "fornecedores", label: "Fornecedores" },
            { value: "parceiros", label: "Parceiros" },
            { value: "publico", label: "Público em geral" },
          ],
        },
        {
          id: "volume_usuarios",
          label: "Quantas pessoas aproximadamente utilizarão o sistema?",
          kind: "select",
          options: [
            { value: "apenas_eu", label: "Apenas eu" },
            { value: "ate_5", label: "Até 5 usuários" },
            { value: "ate_20", label: "Até 20 usuários" },
            { value: "ate_100", label: "Até 100 usuários" },
            { value: "mais_100", label: "Mais de 100 usuários" },
          ],
        },
      ],
    },
    // -------- Seção 7: Materiais Disponíveis --------
    {
      id: "materiais",
      label: "Materiais",
      title: "Materiais disponíveis",
      description:
        "Ter esses itens em mãos acelera o início. Não se preocupe se ainda não tiver — indicamos o caminho.",
      questions: [
        {
          id: "materiais",
          label: "Você já possui:",
          kind: "multiselect",
          hint: "Selecione tudo que já está pronto ou disponível.",
          options: [
            { value: "logotipo", label: "Logotipo" },
            { value: "identidade_visual", label: "Identidade Visual" },
            { value: "dominio", label: "Domínio" },
            { value: "hospedagem", label: "Hospedagem" },
            { value: "textos", label: "Textos" },
            { value: "imagens", label: "Imagens" },
            { value: "manual_marca", label: "Manual da Marca" },
            { value: "nenhum", label: "Nenhum" },
          ],
        },
      ],
    },
    // -------- Seção 8: Prazo --------
    {
      id: "prazo",
      label: "Prazo",
      title: "Prazo",
      description: "Nos ajuda a organizar a proposta dentro da sua janela de tempo.",
      questions: [
        {
          id: "prazo",
          label: "Quando pretende iniciar?",
          kind: "select",
          options: [
            { value: "imediato", label: "Imediatamente" },
            { value: "30d", label: "Até 30 dias" },
            { value: "90d", label: "Até 90 dias" },
            { value: "pesquisando", label: "Ainda estou pesquisando" },
          ],
        },
      ],
    },
    // -------- Seção 9: Investimento --------
    {
      id: "investimento",
      label: "Investimento",
      title: "Investimento",
      description:
        "Uma faixa aproximada nos ajuda a desenhar a melhor proposta para o seu momento. Sem compromisso.",
      questions: [
        {
          id: "investimento",
          label: "Você já possui uma previsão de investimento?",
          kind: "select",
          options: [
            { value: "nao_defini", label: "Ainda não defini" },
            { value: "ate_2k", label: "Até R$ 2.000" },
            { value: "2k_5k", label: "Entre R$ 2.000 e R$ 5.000" },
            { value: "5k_10k", label: "Entre R$ 5.000 e R$ 10.000" },
            { value: "acima_10k", label: "Acima de R$ 10.000" },
            { value: "conversar", label: "Prefiro conversar antes" },
          ],
        },
      ],
    },
    // -------- Seção 10: Informações Adicionais --------
    {
      id: "adicional",
      label: "Adicional",
      title: "Informações adicionais",
      description: "Espaço livre para qualquer contexto que julgue importante.",
      questions: [
        {
          id: "observacoes",
          label: "Existe alguma informação importante que ainda não foi perguntada?",
          kind: "textarea",
          optional: true,
          placeholder: "Restrições, expectativas, contexto de negócio, decisões já tomadas...",
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

/**
 * Mapeia `service_type` (armazenado no Lead) → `template_type` do Briefing.
 * Ponto único de decisão — a UI nunca deve escolher template_type manualmente.
 */
export function templateTypeForService(service: ServiceType): TemplateType {
  switch (service) {
    case "desenvolvimento_projeto":
      return "custom";
    case "consultoria":
      return "consultoria";
    case "trafego_pago":
      return "custom";
    case "diagnostico":
      return "diagnostico";
    case "gestao_shopee":
      return "shopee";
    case "gestao_mercadolivre":
      return "mercadolivre";
    case "gestao_amazon":
      return "amazon";
    case "gestao_multicanal":
      return "multicanal";
    case "outro":
    case "nao_definido":
    default:
      return "padrao";
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
