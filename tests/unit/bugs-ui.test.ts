import { describe, expect, it } from "vitest";
import {
  BUG_ENVIRONMENT_ORDER,
  BUG_SEVERITY_ORDER,
  BUG_STATUS_ORDER,
  bugActionsFor,
  bugEnvironmentLabel,
  bugEventTone,
  describeBugEvent,
  parseBugSearch,
  translateBugError,
} from "@/lib/os/bugs-ui";
import { canTransitionBug } from "@/lib/os/bugs-state";
import type { BugStatus } from "@/types/bug";

describe("bugs-ui — status expostos na interface (VOS-001D.2)", () => {
  it("não expõe status legados", () => {
    expect(BUG_STATUS_ORDER).toEqual([
      "new",
      "triage",
      "confirmed",
      "in_progress",
      "in_testing",
      "fixed",
      "closed",
      "rejected",
    ]);
    for (const legacy of ["waiting_deploy", "wont_fix", "duplicate"]) {
      expect(BUG_STATUS_ORDER).not.toContain(legacy as BugStatus);
    }
  });

  it("não oferece severidade legada (blocker)", () => {
    expect(BUG_SEVERITY_ORDER).not.toContain("blocker");
  });

  it("oferece os quatro ambientes conhecidos", () => {
    expect(BUG_ENVIRONMENT_ORDER).toHaveLength(4);
    expect(bugEnvironmentLabel("staging")).toBe("Homologação");
    expect(bugEnvironmentLabel(null)).toBe("Desconhecido");
    expect(bugEnvironmentLabel("qualquer")).toBe("Desconhecido");
  });
});

describe("bugs-ui — ações por status", () => {
  it("apresenta apenas transições válidas na máquina de estados", () => {
    for (const status of BUG_STATUS_ORDER) {
      for (const action of bugActionsFor(status)) {
        expect(canTransitionBug(status, action.to)).toBe(true);
      }
    }
  });

  it("rejeitado é terminal na interface", () => {
    expect(bugActionsFor("rejected")).toHaveLength(0);
  });

  it("fluxo principal expõe os rótulos aprovados", () => {
    expect(bugActionsFor("new").map((a) => a.label)).toContain("Enviar para triagem");
    expect(bugActionsFor("triage").map((a) => a.label)).toContain("Confirmar");
    expect(bugActionsFor("confirmed").map((a) => a.label)).toContain("Iniciar desenvolvimento");
    expect(bugActionsFor("in_progress").map((a) => a.label)).toContain("Enviar para teste");
    expect(bugActionsFor("in_testing").map((a) => a.kind)).toContain("fixed");
    expect(bugActionsFor("fixed").map((a) => a.kind)).toContain("close");
    expect(bugActionsFor("closed").map((a) => a.kind)).toContain("reopen");
  });

  it("rejeição e reabertura exigem confirmação", () => {
    expect(bugActionsFor("new").find((a) => a.kind === "reject")?.confirm).toBe(true);
    expect(bugActionsFor("closed").find((a) => a.kind === "reopen")?.confirm).toBe(true);
  });
});

describe("bugs-ui — timeline legível", () => {
  it("traduz status_changed com valor anterior e novo", () => {
    expect(
      describeBugEvent({ type: "status_changed", metadata: { from: "new", to: "triage" } }),
    ).toBe("Status alterado: Novo → Triagem");
  });

  it("nunca expõe UUID nem JSON cru", () => {
    const text = describeBugEvent({
      type: "owner_changed",
      metadata: { to: "8f14e45f-ceea-467a-9f6b-4d3f8a1b2c3d" },
    });
    expect(text).toBe("Responsável alterado");
    expect(text).not.toContain("{");
  });

  it("mapeia todos os eventos do módulo", () => {
    const types = [
      "created",
      "status_changed",
      "severity_changed",
      "category_changed",
      "owner_changed",
      "affected_version_changed",
      "fixed_version_changed",
      "request_id_changed",
      "linked_to_ticket",
      "confirmed",
      "fixed",
      "reopened",
      "closed",
      "rejected",
    ] as const;
    for (const type of types) {
      const label = describeBugEvent({ type, metadata: {} });
      expect(label).not.toBe("Movimentação registrada");
      expect(["default", "success", "warning", "muted"]).toContain(bugEventTone(type));
    }
  });
});

describe("bugs-ui — busca e erros", () => {
  it("detecta código, request id e texto livre", () => {
    expect(parseBugSearch("BUG-000001")).toEqual({ code: "BUG-000001" });
    expect(parseBugSearch("8f14e45f-ceea-467a-9f6b-4d3f8a1b2c3d")).toEqual({
      request_id: "8f14e45f-ceea-467a-9f6b-4d3f8a1b2c3d",
    });
    expect(parseBugSearch("estoque negativo")).toEqual({ q: "estoque negativo" });
    expect(parseBugSearch("   ")).toEqual({});
  });

  it("traduz erros técnicos em mensagens operacionais", () => {
    expect(translateBugError("invalid status transition new -> fixed")).toMatch(/não é permitida/);
    expect(translateBugError("fixed_version is required")).toMatch(/versão corrigida/);
    expect(translateBugError("new row violates row-level security policy")).toMatch(/permissão/);
    expect(translateBugError("Bug não encontrado.")).toMatch(/não encontrado/i);
    expect(translateBugError("Failed to fetch")).toMatch(/conexão/);
    expect(translateBugError(null)).toMatch(/Tente novamente/);
    expect(translateBugError("stack trace at Object.<anonymous>")).not.toContain("stack");
  });
});
