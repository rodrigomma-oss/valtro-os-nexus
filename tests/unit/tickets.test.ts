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
