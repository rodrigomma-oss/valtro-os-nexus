import { describe, expect, it } from "vitest";
import {
  TICKET_CATEGORY_LABEL,
  TICKET_CATEGORY_ORDER,
  TICKET_CLOSED_STATUSES,
  TICKET_PRIORITY_LABEL,
  TICKET_PRIORITY_ORDER,
  TICKET_STATUS_LABEL,
  TICKET_STATUS_ORDER,
  TICKET_STATUS_TONE,
} from "@/types/ticket";

describe("VOS-001C — domínio de chamados", () => {
  it("cobre rótulo e tom visual para todos os status", () => {
    for (const status of TICKET_STATUS_ORDER) {
      expect(TICKET_STATUS_LABEL[status]).toBeTruthy();
      expect(TICKET_STATUS_TONE[status]?.className).toBeTruthy();
    }
  });

  it("cobre rótulos de prioridade e categoria", () => {
    for (const p of TICKET_PRIORITY_ORDER) expect(TICKET_PRIORITY_LABEL[p]).toBeTruthy();
    for (const c of TICKET_CATEGORY_ORDER) expect(TICKET_CATEGORY_LABEL[c]).toBeTruthy();
  });

  it("trata apenas encerrado/cancelado como estados finais", () => {
    expect(TICKET_CLOSED_STATUSES).toEqual(["closed", "cancelled"]);
    expect(TICKET_CLOSED_STATUSES).not.toContain("resolved");
  });
});

/**
 * Homologação VOS-001C — máquina de estados espelhada em teste.
 * Fonte de verdade: public.ticket_transition_allowed (trigger no banco).
 */
const ALLOWED: Record<string, string[]> = {
  open: ["waiting_customer", "waiting_internal", "resolved", "closed", "cancelled"],
  waiting_customer: ["open", "waiting_internal", "resolved", "closed", "cancelled"],
  waiting_internal: ["open", "waiting_customer", "resolved", "closed", "cancelled"],
  resolved: ["open", "closed", "cancelled"],
  closed: ["open"],
  cancelled: [],
};

describe("VOS-001C — máquina de estados de chamados", () => {
  it("cobre todos os status conhecidos", () => {
    expect(Object.keys(ALLOWED).sort()).toEqual([...TICKET_STATUS_ORDER].sort());
  });

  it("nunca permite transição para o mesmo status", () => {
    for (const [from, tos] of Object.entries(ALLOWED)) expect(tos).not.toContain(from);
  });

  it("trata cancelado como estado final e permite reabertura de encerrado", () => {
    expect(ALLOWED["cancelled"]).toEqual([]);
    expect(ALLOWED["closed"]).toEqual(["open"]);
    expect(ALLOWED["resolved"]).toContain("open");
  });

  it("não permite sair de encerrado direto para resolvido", () => {
    expect(ALLOWED["closed"]).not.toContain("resolved");
  });
});
