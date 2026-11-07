/**
 * Fonte única de verdade das transições de status de uma contratação
 * (`client_services`). Usada pela UI e pelas server functions; o banco
 * replica exatamente o mesmo grafo em `client_service_transition_allowed`.
 */
import type { ClientServiceStatus } from "@/types/client-service";

export const CLIENT_SERVICE_TRANSITIONS: Record<
  ClientServiceStatus,
  readonly ClientServiceStatus[]
> = {
  pendente: ["ativo", "cancelado"],
  ativo: ["pausado", "concluido", "cancelado"],
  pausado: ["ativo", "cancelado"],
  concluido: [],
  cancelado: [],
};

/** Rótulo da ação (verbo) para cada transição válida. */
export const TRANSITION_ACTION_LABEL: Record<string, string> = {
  "pendente>ativo": "Ativar",
  "pendente>cancelado": "Cancelar",
  "ativo>pausado": "Pausar",
  "ativo>concluido": "Concluir",
  "ativo>cancelado": "Cancelar",
  "pausado>ativo": "Retomar",
  "pausado>cancelado": "Cancelar",
};

export function transitionLabel(
  from: ClientServiceStatus,
  to: ClientServiceStatus,
): string {
  return TRANSITION_ACTION_LABEL[`${from}>${to}`] ?? "Alterar status";
}

export function allowedTransitions(
  from: ClientServiceStatus,
): readonly ClientServiceStatus[] {
  return CLIENT_SERVICE_TRANSITIONS[from] ?? [];
}

export function isTransitionAllowed(
  from: ClientServiceStatus,
  to: ClientServiceStatus,
): boolean {
  if (from === to) return false;
  return allowedTransitions(from).includes(to);
}
