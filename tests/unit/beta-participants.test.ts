import { describe, it, expect } from "vitest";
import {
  betaParticipantTransitionAllowed,
  betaParticipantNextStatuses,
  betaParticipantActionsFor,
  parseBetaParticipantSearch,
  translateBetaParticipantError,
  BETA_PARTICIPANT_TERMINAL_STATUS,
  BETA_PARTICIPANT_STATUS_LABEL,
  BETA_PARTICIPANT_INTEREST_LABEL,
} from "@/lib/os/beta-participants-ui";

describe("VOS-001F — máquina de estados dos participantes do beta", () => {
  it("permite o fluxo padrão convidado → aceito → ativo → convertido", () => {
    expect(betaParticipantTransitionAllowed("invited", "accepted")).toBe(true);
    expect(betaParticipantTransitionAllowed("accepted", "active")).toBe(true);
    expect(betaParticipantTransitionAllowed("active", "converted")).toBe(true);
  });

  it("bloqueia atalhos inválidos", () => {
    expect(betaParticipantTransitionAllowed("invited", "active")).toBe(false);
    expect(betaParticipantTransitionAllowed("invited", "converted")).toBe(false);
    expect(betaParticipantTransitionAllowed("accepted", "converted")).toBe(false);
  });

  it("bloqueia transição para o mesmo estado", () => {
    expect(betaParticipantTransitionAllowed("active", "active")).toBe(false);
  });

  it("trata convertido e removido como estados finais", () => {
    for (const s of BETA_PARTICIPANT_TERMINAL_STATUS) {
      expect(betaParticipantNextStatuses(s)).toHaveLength(0);
      expect(betaParticipantActionsFor(s)).toHaveLength(0);
    }
  });

  it("permite reativar participante inativo", () => {
    expect(betaParticipantTransitionAllowed("inactive", "active")).toBe(true);
    expect(betaParticipantActionsFor("inactive").some((a) => a.kind === "reopen")).toBe(true);
  });

  it("permite remoção a partir de qualquer estado não final", () => {
    for (const s of ["invited", "accepted", "active", "inactive"] as const) {
      expect(betaParticipantTransitionAllowed(s, "removed")).toBe(true);
    }
  });

  it("expõe rótulos em português para todas as situações e interesses", () => {
    expect(Object.values(BETA_PARTICIPANT_STATUS_LABEL)).toHaveLength(6);
    expect(BETA_PARTICIPANT_STATUS_LABEL.converted).toBe("Convertido");
    expect(BETA_PARTICIPANT_INTEREST_LABEL.already_customer).toBe("Já é cliente");
  });
});

describe("VOS-001F — busca e mensagens", () => {
  it("reconhece código BTP-000001", () => {
    expect(parseBetaParticipantSearch("btp-000001")).toEqual({ code: "BTP-000001" });
  });

  it("reconhece e-mail e texto livre", () => {
    expect(parseBetaParticipantSearch("Ana@Empresa.com")).toEqual({ email: "ana@empresa.com" });
    expect(parseBetaParticipantSearch("Ana Souza")).toEqual({ name: "Ana Souza" });
    expect(parseBetaParticipantSearch("   ")).toEqual({});
  });

  it("traduz erros do banco para linguagem operacional", () => {
    expect(translateBetaParticipantError("beta_participants_unique_email_per_program")).toContain(
      "Já existe um participante",
    );
    expect(translateBetaParticipantError("permission denied for table")).toContain("permissão");
    expect(translateBetaParticipantError(null)).toContain("Erro desconhecido");
  });
});
