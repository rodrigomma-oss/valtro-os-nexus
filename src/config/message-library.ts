/**
 * Sprint 10 — Biblioteca de mensagens comerciais.
 * Conteúdo estático versionado. Placeholders suportados:
 *   {{nome}} {{empresa}} {{tipo_interesse}} {{link_briefing}} {{responsavel}} {{data}}
 * A renderização ocorre em `src/lib/templates.ts`.
 */
import type {
  LeadContactChannel,
  LeadContactType,
} from "@/types/lead";

export type MessageCategory =
  | "desenvolvimento"
  | "analise_loja"
  | "valtro_pricing"
  | "parcerias";

export const MESSAGE_CATEGORY_LABEL: Record<MessageCategory, string> = {
  desenvolvimento: "Desenvolvimento",
  analise_loja: "Análise de Loja",
  valtro_pricing: "Valtro Pricing",
  parcerias: "Parcerias",
};

export interface MessageTemplate {
  id: string;
  category: MessageCategory;
  label: string;
  channelDefault: LeadContactChannel;
  typeDefault: LeadContactType;
  body: string;
}

export const MESSAGE_LIBRARY: MessageTemplate[] = [
  // ── Desenvolvimento ──────────────────────────────────────────
  {
    id: "dev-primeiro-contato",
    category: "desenvolvimento",
    label: "Primeiro contato",
    channelDefault: "whatsapp",
    typeDefault: "primeiro_contato",
    body:
      `Olá, {{nome}}! Aqui é {{responsavel}}, da Valtro Labs.\n\n` +
      `Recebemos seu interesse em {{tipo_interesse}} para a {{empresa}}. ` +
      `Trabalhamos com um processo consultivo curto para entender o escopo do seu projeto e propor o melhor caminho.\n\n` +
      `Podemos avançar por aqui mesmo?`,
  },
  {
    id: "dev-envio-briefing",
    category: "desenvolvimento",
    label: "Envio do briefing",
    channelDefault: "whatsapp",
    typeDefault: "envio_briefing",
    body:
      `Olá, {{nome}}! Preparamos um briefing técnico para entendermos o projeto da {{empresa}} em detalhes.\n\n` +
      `Segue o link para preenchimento:\n{{link_briefing}}\n\n` +
      `Assim que retornar, a nossa equipe monta a proposta.`,
  },
  {
    id: "dev-lembrete",
    category: "desenvolvimento",
    label: "Lembrete de briefing",
    channelDefault: "whatsapp",
    typeDefault: "lembrete",
    body:
      `Oi, {{nome}}! Passando aqui apenas para lembrar do briefing da {{empresa}}.\n\n` +
      `Fica aberto neste link: {{link_briefing}}\n\n` +
      `Se precisar de ajuda para preencher, é só me chamar. 🙂`,
  },
  {
    id: "dev-agradecimento",
    category: "desenvolvimento",
    label: "Agradecimento",
    channelDefault: "whatsapp",
    typeDefault: "outro",
    body:
      `Obrigado pelo briefing, {{nome}}! ✨\n\n` +
      `Já estamos analisando com o time técnico e retornamos com a proposta em breve.`,
  },

  // ── Análise de Loja ──────────────────────────────────────────
  {
    id: "analise-primeiro-contato",
    category: "analise_loja",
    label: "Primeiro contato",
    channelDefault: "whatsapp",
    typeDefault: "primeiro_contato",
    body:
      `Olá, {{nome}}! Aqui é {{responsavel}}, da Valtro Labs.\n\n` +
      `Vi que a {{empresa}} tem interesse em uma análise de loja. Trabalhamos com um raio-x consultivo para entender oportunidades reais de otimização.\n\n` +
      `Podemos iniciar o levantamento?`,
  },
  {
    id: "analise-solicitacao-dados",
    category: "analise_loja",
    label: "Solicitação de dados",
    channelDefault: "email",
    typeDefault: "envio_briefing",
    body:
      `Olá, {{nome}}!\n\n` +
      `Para iniciarmos a análise da {{empresa}}, precisamos dos dados iniciais. Segue o briefing:\n{{link_briefing}}\n\n` +
      `Qualquer dúvida no preenchimento, é só chamar por aqui.`,
  },
  {
    id: "analise-entrega",
    category: "analise_loja",
    label: "Entrega da análise",
    channelDefault: "email",
    typeDefault: "apresentacao",
    body:
      `Olá, {{nome}}! Sua análise da {{empresa}} está pronta.\n\n` +
      `Podemos agendar uma reunião de apresentação em {{data}}? Levamos as principais oportunidades e um plano de ação priorizado.`,
  },
  {
    id: "analise-otimizacao",
    category: "analise_loja",
    label: "Oferta de otimização",
    channelDefault: "whatsapp",
    typeDefault: "proposta",
    body:
      `{{nome}}, com base na análise, mapeamos ganhos rápidos para a {{empresa}}.\n\n` +
      `Preparei um plano de otimização com prioridade e prazos. Posso te enviar a proposta?`,
  },

  // ── Valtro Pricing ───────────────────────────────────────────
  {
    id: "pricing-apresentacao",
    category: "valtro_pricing",
    label: "Apresentação",
    channelDefault: "whatsapp",
    typeDefault: "apresentacao",
    body:
      `Olá, {{nome}}! Aqui é {{responsavel}}, da Valtro Labs.\n\n` +
      `Somos criadores da Valtro Pricing, plataforma de reprecificação e inteligência competitiva para marketplaces. ` +
      `Pelo que vi da {{empresa}}, faz muito sentido conversarmos.`,
  },
  {
    id: "pricing-demo",
    category: "valtro_pricing",
    label: "Convite para demonstração",
    channelDefault: "whatsapp",
    typeDefault: "apresentacao",
    body:
      `{{nome}}, que tal uma demo curta da Valtro Pricing para a {{empresa}}?\n\n` +
      `Em 20 minutos mostro como o motor de precificação decide preços em tempo real. Podemos em {{data}}?`,
  },
  {
    id: "pricing-trial",
    category: "valtro_pricing",
    label: "Trial",
    channelDefault: "email",
    typeDefault: "outro",
    body:
      `Olá, {{nome}}!\n\n` +
      `Preparamos um trial da Valtro Pricing para a {{empresa}}. Você terá acesso guiado a todo o motor de precificação. ` +
      `Confirma se posso liberar seu acesso ainda hoje?`,
  },
  {
    id: "pricing-followup",
    category: "valtro_pricing",
    label: "Follow-up",
    channelDefault: "whatsapp",
    typeDefault: "follow_up",
    body:
      `Oi, {{nome}}! Voltando aqui sobre a Valtro Pricing.\n\n` +
      `Conseguiu avaliar com o time da {{empresa}}? Fico à disposição para tirar dúvidas ou apresentar de novo.`,
  },

  // ── Parcerias ────────────────────────────────────────────────
  {
    id: "parceria-primeiro-contato",
    category: "parcerias",
    label: "Primeiro contato",
    channelDefault: "email",
    typeDefault: "primeiro_contato",
    body:
      `Olá, {{nome}}!\n\n` +
      `Aqui é {{responsavel}}, da Valtro Labs. Vi que a {{empresa}} tem uma proposta interessante e gostaria de explorar caminhos de parceria com a gente.\n\n` +
      `Faz sentido marcarmos uma conversa inicial?`,
  },
  {
    id: "parceria-reuniao",
    category: "parcerias",
    label: "Reunião",
    channelDefault: "email",
    typeDefault: "apresentacao",
    body:
      `Oi, {{nome}}! Podemos agendar uma reunião em {{data}} para conversarmos sobre a parceria com a {{empresa}}?\n\n` +
      `Trago material da Valtro Labs e das nossas frentes ativas para alinharmos os pontos de conexão.`,
  },
  {
    id: "parceria-retorno",
    category: "parcerias",
    label: "Retorno",
    channelDefault: "whatsapp",
    typeDefault: "follow_up",
    body:
      `{{nome}}, tudo bem? Estou retomando o contato sobre a parceria com a {{empresa}}.\n\n` +
      `Conseguiu discutir internamente? Estou à disposição para uma nova conversa.`,
  },
];

export function templatesByCategory(category: MessageCategory) {
  return MESSAGE_LIBRARY.filter((t) => t.category === category);
}

export function findTemplate(id: string) {
  return MESSAGE_LIBRARY.find((t) => t.id === id) ?? null;
}
