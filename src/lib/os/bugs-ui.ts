/**
 * VOS-001D.2 — Camada de apresentação do módulo de Bugs.
 * Rótulos, tons, ações válidas por status, tradução de eventos e de erros do banco.
 * Nenhuma regra nova: espelha a máquina de estados já validada em `bugs-state.ts`.
 */
import type {
  BugCategory,
  BugEnvironment,
  BugEvent,
  BugEventType,
  BugSeverity,
  BugStatus,
} from "@/types/bug";

/** Status exibidos na interface — legados (waiting_deploy, wont_fix, duplicate) ficam de fora. */
export const BUG_STATUS_ORDER: BugStatus[] = [
  "new",
  "triage",
  "confirmed",
  "in_progress",
  "in_testing",
  "fixed",
  "closed",
  "rejected",
];

export const BUG_STATUS_LABEL: Record<BugStatus, string> = {
  new: "Novo",
  triage: "Triagem",
  confirmed: "Confirmado",
  in_progress: "Em desenvolvimento",
  in_testing: "Em teste",
  fixed: "Corrigido",
  closed: "Fechado",
  rejected: "Rejeitado",
};

export const BUG_STATUS_TONE: Record<BugStatus, { className: string; dot: string }> = {
  new: { className: "border-border bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  triage: { className: "border-sky-200 bg-sky-50 text-sky-800", dot: "bg-sky-600" },
  confirmed: { className: "border-indigo-200 bg-indigo-50 text-indigo-800", dot: "bg-indigo-600" },
  in_progress: { className: "border-primary/25 bg-primary/10 text-primary", dot: "bg-primary" },
  in_testing: { className: "border-amber-200 bg-amber-50 text-amber-800", dot: "bg-amber-600" },
  fixed: { className: "border-emerald-200 bg-emerald-50 text-emerald-800", dot: "bg-emerald-600" },
  closed: { className: "border-border bg-surface text-foreground", dot: "bg-foreground/60" },
  rejected: { className: "border-rose-200 bg-rose-50 text-rose-800", dot: "bg-rose-600" },
};

/** Severidades selecionáveis. `blocker` é legado e não é oferecido. */
export const BUG_SEVERITY_ORDER: BugSeverity[] = ["low", "normal", "high", "critical"];

export const BUG_SEVERITY_LABEL: Record<BugSeverity, string> = {
  low: "Baixa",
  normal: "Média",
  high: "Alta",
  critical: "Crítica",
  blocker: "Bloqueador",
};

export const BUG_SEVERITY_TONE: Record<BugSeverity, string> = {
  low: "border-border bg-muted text-muted-foreground",
  normal: "border-sky-200 bg-sky-50 text-sky-800",
  high: "border-amber-200 bg-amber-50 text-amber-900",
  critical: "border-rose-200 bg-rose-50 text-rose-800",
  blocker: "border-rose-300 bg-rose-100 text-rose-900",
};

export const BUG_CATEGORY_ORDER: BugCategory[] = [
  "ui_ux",
  "frontend",
  "backend",
  "security",
  "performance",
  "localization",
  "data_integrity",
  "other",
];

export const BUG_CATEGORY_LABEL: Record<BugCategory, string> = {
  ui_ux: "Interface / UX",
  frontend: "Frontend",
  backend: "Backend",
  security: "Segurança",
  performance: "Performance",
  localization: "Localização",
  data_integrity: "Integridade de dados",
  other: "Outros",
};

export const BUG_ENVIRONMENT_ORDER: BugEnvironment[] = [
  "development",
  "staging",
  "production",
  "local",
];

export const BUG_ENVIRONMENT_LABEL: Record<BugEnvironment, string> = {
  development: "Desenvolvimento",
  staging: "Homologação",
  production: "Produção",
  local: "Local",
};

export function bugEnvironmentLabel(env: string | null | undefined): string {
  if (!env) return "Desconhecido";
  return BUG_ENVIRONMENT_LABEL[env as BugEnvironment] ?? "Desconhecido";
}

// ---------------------------------------------------------------
// Ações de status disponíveis por estado atual
// ---------------------------------------------------------------
export type BugActionKind = "status" | "fixed" | "close" | "reopen" | "reject";

export interface BugAction {
  kind: BugActionKind;
  label: string;
  to: BugStatus;
  /** Exige confirmação explícita do operador. */
  confirm?: boolean;
  variant?: "default" | "outline" | "destructive";
}

export const BUG_ACTIONS: Record<BugStatus, BugAction[]> = {
  new: [
    { kind: "status", label: "Enviar para triagem", to: "triage" },
    { kind: "reject", label: "Rejeitar", to: "rejected", confirm: true, variant: "outline" },
  ],
  triage: [
    { kind: "status", label: "Confirmar", to: "confirmed" },
    { kind: "reject", label: "Rejeitar", to: "rejected", confirm: true, variant: "outline" },
  ],
  confirmed: [
    { kind: "status", label: "Iniciar desenvolvimento", to: "in_progress" },
    { kind: "reject", label: "Rejeitar", to: "rejected", confirm: true, variant: "outline" },
  ],
  in_progress: [{ kind: "status", label: "Enviar para teste", to: "in_testing" }],
  in_testing: [
    { kind: "fixed", label: "Marcar como corrigido", to: "fixed" },
    {
      kind: "status",
      label: "Retornar para desenvolvimento",
      to: "in_progress",
      variant: "outline",
    },
  ],
  fixed: [
    { kind: "close", label: "Fechar", to: "closed" },
    {
      kind: "reopen",
      label: "Reabrir para desenvolvimento",
      to: "in_progress",
      confirm: true,
      variant: "outline",
    },
  ],
  closed: [
    { kind: "reopen", label: "Reabrir", to: "in_progress", confirm: true, variant: "outline" },
  ],
  rejected: [],
};

export function bugActionsFor(status: BugStatus): BugAction[] {
  return BUG_ACTIONS[status] ?? [];
}

// ---------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------
export const BUG_EVENT_LABEL: Record<BugEventType, string> = {
  created: "Bug registrado",
  status_changed: "Status alterado",
  severity_changed: "Severidade alterada",
  category_changed: "Categoria alterada",
  environment_changed: "Ambiente alterado",
  owner_changed: "Responsável alterado",
  assigned: "Responsável atribuído",
  commented: "Comentário registrado",
  affected_version_changed: "Versão afetada alterada",
  fixed_version_changed: "Versão corrigida alterada",
  request_id_changed: "Request ID alterado",
  linked_to_ticket: "Vinculado a chamado",
  fixed: "Marcado como corrigido",
  confirmed: "Bug confirmado",
  reopened: "Bug reaberto",
  rejected: "Bug rejeitado",
  closed: "Bug fechado",
};

function humanValue(type: BugEventType, raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const value = String(raw);
  if (type === "status_changed") return BUG_STATUS_LABEL[value as BugStatus] ?? value;
  if (type === "severity_changed") return BUG_SEVERITY_LABEL[value as BugSeverity] ?? value;
  if (type === "category_changed") return BUG_CATEGORY_LABEL[value as BugCategory] ?? value;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return null;
  return value;
}

/** Descrição legível de um evento — nunca expõe JSON cru nem UUIDs. */
export function describeBugEvent(event: Pick<BugEvent, "type" | "metadata">): string {
  const label = BUG_EVENT_LABEL[event.type] ?? "Movimentação registrada";
  const meta = (event.metadata ?? {}) as Record<string, unknown>;
  const before = humanValue(event.type, meta["from"] ?? meta["before"] ?? meta["old"]);
  const after = humanValue(event.type, meta["to"] ?? meta["after"] ?? meta["new"]);

  if (before && after) return `${label}: ${before} → ${after}`;
  if (after) return `${label}: ${after}`;
  if (before) return `${label} (anterior: ${before})`;
  return label;
}

export function bugEventTone(type: BugEventType): "default" | "success" | "warning" | "muted" {
  if (type === "fixed" || type === "closed" || type === "confirmed") return "success";
  if (type === "rejected" || type === "reopened") return "warning";
  if (type === "created") return "default";
  return "muted";
}

// ---------------------------------------------------------------
// Tradução de erros
// ---------------------------------------------------------------
/** Converte mensagens técnicas (banco/rede/HTTP) em mensagens operacionais. */
export function translateBugError(message: string | null | undefined): string {
  const raw = (message ?? "").toLowerCase();
  if (!raw) return "Não foi possível concluir a operação. Tente novamente.";
  if (raw.includes("transi") || raw.includes("invalid status"))
    return "Esta transição de status não é permitida para o estado atual do bug.";
  if (raw.includes("fixed_version"))
    return "Informe a versão corrigida antes de marcar o bug como corrigido.";
  if (raw.includes("unauthorized") || raw.includes("401"))
    return "Sua sessão expirou. Faça login novamente para continuar.";
  if (raw.includes("permission") || raw.includes("row-level") || raw.includes("403"))
    return "Você não tem permissão para executar esta ação.";
  if (raw.includes("não encontrado") || raw.includes("not found") || raw.includes("404"))
    return "Registro não encontrado. Ele pode ter sido alterado por outro usuário.";
  if (raw.includes("foreign key") || raw.includes("violates"))
    return "Há um vínculo inválido nos dados informados. Revise produto e chamado relacionado.";
  if (raw.includes("delete")) return "A exclusão de bugs não é permitida.";
  if (raw.includes("failed to fetch") || raw.includes("network"))
    return "Falha de comunicação com o servidor. Verifique sua conexão e tente novamente.";
  if (raw.includes("500") || raw.includes("internal"))
    return "Erro interno do servidor. Tente novamente em instantes.";
  return "Não foi possível concluir a operação. Revise os dados e tente novamente.";
}

/** Interpreta o termo de busca: código, Request ID ou texto livre. */
export function parseBugSearch(term: string): {
  code?: string;
  request_id?: string;
  q?: string;
} {
  const value = term.trim();
  if (!value) return {};
  if (/^bug-?\d*/i.test(value)) return { code: value };
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
    return { request_id: value };
  return { q: value };
}
