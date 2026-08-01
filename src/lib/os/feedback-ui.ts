import type {
  FeedbackStatus,
  FeedbackType,
  FeedbackSource,
  FeedbackPerceivedValue,
  FeedbackSubscriptionInterest,
  FeedbackEventType,
} from "@/types/feedback";

/** Rótulos e cores para Tipos de Feedback */
export const FEEDBACK_TYPE_LABEL: Record<FeedbackType, string> = {
  praise: "Elogio",
  suggestion: "Sugestão",
  complaint: "Reclamação",
  question: "Dúvida",
  usability: "Usabilidade",
  feature_request: "Solicitação de funcionalidade",
  pricing: "Preço",
  other: "Outro",
};

export const FEEDBACK_TYPE_ORDER: FeedbackType[] = [
  "praise",
  "suggestion",
  "complaint",
  "question",
  "usability",
  "feature_request",
  "pricing",
  "other",
];

/** Rótulos e cores para Origens de Feedback */
export const FEEDBACK_SOURCE_LABEL: Record<FeedbackSource, string> = {
  internal: "Interno",
  beta_portal: "Portal Beta",
  support: "Suporte",
  interview: "Entrevista",
  email: "E-mail",
  whatsapp: "WhatsApp",
  other: "Outro",
};

export const FEEDBACK_SOURCE_ORDER: FeedbackSource[] = [
  "internal",
  "beta_portal",
  "support",
  "interview",
  "email",
  "whatsapp",
  "other",
];

/** Rótulos e tons para Status de Feedback */
export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  new: "Novo",
  under_review: "Em análise",
  accepted: "Aceito",
  planned: "Planejado",
  implemented: "Implementado",
  dismissed: "Descartado",
  closed: "Encerrado",
};

export const FEEDBACK_STATUS_ORDER: FeedbackStatus[] = [
  "new",
  "under_review",
  "accepted",
  "planned",
  "implemented",
  "dismissed",
  "closed",
];

export const FEEDBACK_STATUS_TONE: Record<FeedbackStatus, "neutral" | "info" | "success" | "warning" | "error"> = {
  new: "info",
  under_review: "warning",
  accepted: "success",
  planned: "success",
  implemented: "success",
  dismissed: "neutral",
  closed: "neutral",
};

/** Rótulos para Valor Percebido */
export const FEEDBACK_VALUE_LABEL: Record<FeedbackPerceivedValue, string> = {
  very_low: "Muito baixo",
  low: "Baixo",
  medium: "Médio",
  high: "Alto",
  very_high: "Muito alto",
  not_informed: "Não informado",
};

export const FEEDBACK_VALUE_ORDER: FeedbackPerceivedValue[] = [
  "very_low",
  "low",
  "medium",
  "high",
  "very_high",
  "not_informed",
];

/** Rótulos para Interesse em Assinar */
export const FEEDBACK_INTEREST_LABEL: Record<FeedbackSubscriptionInterest, string> = {
  no: "Não",
  maybe: "Talvez",
  yes: "Sim",
  already_subscribed: "Já assinante",
  not_informed: "Não informado",
};

export const FEEDBACK_INTEREST_ORDER: FeedbackSubscriptionInterest[] = [
  "no",
  "maybe",
  "yes",
  "already_subscribed",
  "not_informed",
];

/** Máquina de Estados: Ações permitidas para cada status */
export interface FeedbackActionItem {
  kind: "status" | "fix" | "close" | "reopen" | "accepted" | "planned" | "implemented" | "dismissed";
  label: string;
  to: FeedbackStatus;
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost";
  confirm?: boolean;
}

export function feedbackActionsFor(status: FeedbackStatus): FeedbackActionItem[] {
  switch (status) {
    case "new":
      return [
        { kind: "status", label: "Colocar em análise", to: "under_review" },
        { kind: "dismissed", label: "Descartar", to: "dismissed", variant: "destructive", confirm: true },
      ];
    case "under_review":
      return [
        { kind: "accepted", label: "Aceitar", to: "accepted", variant: "default" },
        { kind: "dismissed", label: "Descartar", to: "dismissed", variant: "destructive", confirm: true },
      ];
    case "accepted":
      return [
        { kind: "planned", label: "Planejar", to: "planned", variant: "default" },
        { kind: "dismissed", label: "Descartar", to: "dismissed", variant: "destructive", confirm: true },
      ];
    case "planned":
      return [
        { kind: "implemented", label: "Marcar como implementado", to: "implemented", variant: "default" },
        { kind: "dismissed", label: "Descartar", to: "dismissed", variant: "destructive", confirm: true },
      ];
    case "implemented":
      return [
        { kind: "close", label: "Encerrar", to: "closed", variant: "default" },
        { kind: "status", label: "Reavaliar", to: "under_review", variant: "outline" },
      ];
    case "dismissed":
      return [
        { kind: "status", label: "Reavaliar", to: "under_review", variant: "outline" },
      ];
    case "closed":
      return [];
    default:
      return [];
  }
}

/** Descrição textual para eventos da Timeline */
export function describeFeedbackEvent(e: { event_type: FeedbackEventType; metadata: any }): string {
  const meta = e.metadata || {};
  switch (e.event_type) {
    case "created":
      return "Feedback registrado no sistema.";
    case "status_changed":
      return `Status alterado de "${FEEDBACK_STATUS_LABEL[meta.from as FeedbackStatus]}" para "${FEEDBACK_STATUS_LABEL[meta.to as FeedbackStatus]}".`;
    case "type_changed":
      return `Tipo alterado de "${FEEDBACK_TYPE_LABEL[meta.from as FeedbackType]}" para "${FEEDBACK_TYPE_LABEL[meta.to as FeedbackType]}".`;
    case "owner_changed":
      return meta.to ? "Responsável atribuído ao feedback." : "Responsável removido.";
    case "perceived_value_changed":
      return `Valor percebido alterado para "${FEEDBACK_VALUE_LABEL[meta.to as FeedbackPerceivedValue]}".`;
    case "subscription_interest_changed":
      return `Interesse em assinar alterado para "${FEEDBACK_INTEREST_LABEL[meta.to as FeedbackSubscriptionInterest]}".`;
    case "desired_feature_changed":
      return "Funcionalidade desejada atualizada.";
    case "linked_to_ticket":
      return "Vínculo criado com um chamado.";
    case "linked_to_bug":
      return "Vínculo criado com um bug.";
    case "accepted":
      return "Feedback aceito pelo time de produto.";
    case "planned":
      return "Feedback incluído no planejamento.";
    case "implemented":
      return "Feedback marcado como implementado.";
    case "dismissed":
      return "Feedback descartado.";
    case "closed":
      return "Feedback encerrado.";
    case "reopened":
      return "Feedback reaberto para análise.";
    default:
      return "Evento registrado.";
  }
}

/** Tom visual para eventos da Timeline */
export function feedbackEventTone(type: FeedbackEventType): "neutral" | "info" | "success" | "warning" | "error" {
  switch (type) {
    case "created":
      return "info";
    case "accepted":
    case "planned":
    case "implemented":
      return "success";
    case "dismissed":
    case "closed":
      return "neutral";
    case "reopened":
      return "warning";
    default:
      return "neutral";
  }
}

/** Parser simples para busca textual (pode ser expandido para suportar prefixos se necessário) */
export function parseFeedbackSearch(term: string) {
  const clean = term.trim();
  if (!clean) return {};
  
  // Se parecer um código FDB-XXXXXX
  if (/^FDB-\d{6}$/i.test(clean)) {
    return { code: clean.toUpperCase() };
  }
  
  // Se for um e-mail
  if (clean.includes("@")) {
    return { participant_email: clean.toLowerCase() };
  }

  return { text: clean };
}

/** Tradução de erros comuns do banco para mensagens amigáveis */
export function translateFeedbackError(msg: string | null): string {
  if (!msg) return "Erro desconhecido ao processar feedback.";
  if (msg.includes("Invalid feedback status transition")) return "Transição de status não permitida para o estado atual.";
  if (msg.includes("Cannot transition from closed state")) return "Feedback encerrado não permite novas alterações.";
  if (msg.includes("Feedback code is immutable")) return "O código do feedback não pode ser alterado.";
  if (msg.includes("permission denied")) return "Você não tem permissão para realizar esta ação.";
  return msg;
}
