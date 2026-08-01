/**
 * Máquina de estados de Bugs (espelha os triggers do banco — VOS-001D.1).
 * Fonte da verdade é o banco; este módulo existe para validação prévia e testes.
 */
import type { BugStatus } from "@/types/bug";

export const BUG_TRANSITIONS: Record<BugStatus, BugStatus[]> = {
  new: ["triage", "rejected"],
  triage: ["confirmed", "rejected"],
  confirmed: ["in_progress", "rejected"],
  in_progress: ["in_testing"],
  in_testing: ["fixed", "in_progress"],
  fixed: ["closed", "in_progress"],
  closed: ["in_progress"],
  rejected: [],
};

export const BUG_TERMINAL_STATUSES: BugStatus[] = ["rejected"];

export function canTransitionBug(from: BugStatus, to: BugStatus): boolean {
  if (from === to) return false;
  return BUG_TRANSITIONS[from]?.includes(to) ?? false;
}

/** `fixed` exige versão de correção informada. */
export function requiresFixedVersion(to: BugStatus): boolean {
  return to === "fixed";
}
