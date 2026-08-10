/**
 * Camada de apresentação e máquina de estados dos Participantes do Beta (VOS-001F).
 * Espelha exatamente os enums e transições do banco.
 */
import type {
  BetaParticipantStatus,
  BetaParticipantInterest,
  BetaParticipantEventType,
} from "@/types/beta-participant";

export const BETA_PARTICIPANT_STATUS_ORDER: BetaParticipantStatus[] = [
  "invited",
  "accepted",
  "active",
  "inactive",
  "converted",
  "removed",
];

export const BETA_PARTICIPANT_STATUS_LABEL: Record<BetaParticipantStatus, string> = {
  invited: "Convidado",
  accepted: "Aceito",
  active: "Ativo",
  inactive: "Inativo",
  removed: "Removido",
  converted: "Convertido",
};

export const BETA_PARTICIPANT_STATUS_TONE: Record<
  BetaParticipantStatus,
  "neutral" | "info" | "success" | "warning" | "error"
> = {
  invited: "info",
  accepted: "info",
  active: "success",
  inactive: "warning",
  removed: "neutral",
  converted: "success",
};

export const BETA_PARTICIPANT_INTEREST_ORDER: BetaParticipantInterest[] = [
  "yes",
  "maybe",
  "no",
  "already_customer",
  "unknown",
];

export const BETA_PARTICIPANT_INTEREST_LABEL: Record<BetaParticipantInterest, string> = {
  no: "Não",
  maybe: "Talvez",
  yes: "Sim",
  already_customer: "Já é cliente",
  unknown: "Não informado",
};

/** Situações finais — nenhuma transição é permitida a partir delas. */
export const BETA_PARTICIPANT_TERMINAL_STATUS: BetaParticipantStatus[] = ["converted", "removed"];

/** Máquina de estados — idêntica a beta_participant_transition_allowed no banco. */
const TRANSITIONS: Record<BetaParticipantStatus, BetaParticipantStatus[]> = {
  invited: ["accepted", "removed"],
  accepted: ["active", "inactive", "removed"],
  active: ["converted", "inactive", "removed"],
  inactive: ["active", "removed"],
  converted: [],
  removed: [],
};

export function betaParticipantTransitionAllowed(
  from: BetaParticipantStatus,
  to: BetaParticipantStatus,
): boolean {
  if (from === to) return false;
  return TRANSITIONS[from].includes(to);
}

export function betaParticipantNextStatuses(
  status: BetaParticipantStatus,
): BetaParticipantStatus[] {
  return [...TRANSITIONS[status]];
}

export interface BetaParticipantAction {
  kind: "status" | "convert" | "reopen" | "invite";
  label: string;
  to: BetaParticipantStatus;
  variant?: "default" | "outline" | "secondary" | "destructive";
  confirm?: boolean;
}

export function betaParticipantActionsFor(
  participant: { status: BetaParticipantStatus; invited_at?: string | null },
): BetaParticipantAction[] {
  const { status, invited_at } = participant;
  switch (status) {
    case "invited":
      const acts: BetaParticipantAction[] = [];
      if (!invited_at) {
        acts.push({ kind: "invite", label: "Registrar envio de convite", to: "invited", variant: "default" });
      }
      acts.push({ kind: "status", label: "Registrar aceite", to: "accepted", variant: invited_at ? "default" : "outline" });
      acts.push({ kind: "status", label: "Remover", to: "removed", variant: "destructive", confirm: true });
      return acts;
    case "accepted":
      return [
        { kind: "status", label: "Ativar", to: "active", variant: "default" },
        { kind: "status", label: "Inativar", to: "inactive", variant: "outline" },
        { kind: "status", label: "Remover", to: "removed", variant: "destructive", confirm: true },
      ];
    case "active":
      return [
        { kind: "convert", label: "Converter em cliente", to: "converted", variant: "default", confirm: true },
        { kind: "status", label: "Inativar", to: "inactive", variant: "outline" },
        { kind: "status", label: "Remover", to: "removed", variant: "destructive", confirm: true },
      ];
    case "inactive":
      return [
        { kind: "reopen", label: "Reativar", to: "active", variant: "default" },
        { kind: "status", label: "Remover", to: "removed", variant: "destructive", confirm: true },
      ];
    default:
      return [];
  }
}

export function describeBetaParticipantEvent(e: {
  type: BetaParticipantEventType;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}): string {
  if (e.description) return e.description;
  switch (e.type) {
    case "created":
      return "Participante cadastrado no programa beta.";
    case "invited":
      return "Convite registrado para o participante.";
    case "accepted":
      return "Participante aceitou o convite.";
    case "activated":
      return "Participante ativado no beta.";
    case "deactivated":
      return "Participante inativado.";
    case "removed":
      return "Participante removido do programa.";
    case "converted":
      return "Participante convertido em cliente.";
    case "interest_changed":
      return "Interesse em assinar alterado.";
    case "notes_changed":
      return "Observações atualizadas.";
    case "linked_user":
      return "Usuário do sistema vinculado ao participante.";
    case "reopened":
      return "Participante reativado no beta.";
    default:
      return "Evento registrado.";
  }
}

export function betaParticipantEventTone(
  type: BetaParticipantEventType,
): "default" | "success" | "warning" | "muted" {
  switch (type) {
    case "accepted":
    case "activated":
    case "converted":
    case "reopened":
      return "success";
    case "deactivated":
      return "warning";
    case "removed":
      return "muted";
    default:
      return "default";
  }
}

/** Busca textual: detecta código BTP-XXXXXX, e-mail ou texto livre. */
export function parseBetaParticipantSearch(term: string): {
  code?: string;
  email?: string;
  name?: string;
} {
  const clean = term.trim();
  if (!clean) return {};
  if (/^BTP-\d{6}$/i.test(clean)) return { code: clean.toUpperCase() };
  if (clean.includes("@")) return { email: clean.toLowerCase() };
  return { name: clean };
}

/** Traduz erros do banco em mensagens operacionais. */
export function translateBetaParticipantError(msg: string | null | undefined): string {
  if (!msg) return "Erro desconhecido ao processar o participante.";
  if (msg.includes("situação final")) return "Participante em situação final não permite novas alterações.";
  if (msg.includes("Transição de situação inválida"))
    return "Transição de situação não permitida para o estado atual.";
  if (msg.includes("código do participante é imutável")) return "O código do participante não pode ser alterado.";
  if (msg.includes("token de convite é imutável")) return "O token de convite não pode ser alterado.";
  if (msg.includes("não podem ser excluídos")) return "Participantes não podem ser excluídos; use a remoção.";
  if (msg.includes("beta_participants_unique_email_per_program"))
    return "Já existe um participante com este e-mail neste programa beta.";
  if (msg.includes("beta_participants_email_format")) return "Informe um e-mail válido.";
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Você não tem permissão para realizar esta ação.";
  return msg;
}
