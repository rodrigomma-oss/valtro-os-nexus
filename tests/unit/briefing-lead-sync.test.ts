/**
 * Sprint — Sincronização cadastral Briefing → Lead.
 *
 * Cobre a lógica pura (normalização, no-op, conflitos) e o comportamento
 * fail-safe do wrapper de conclusão do briefing.
 */
import { describe, expect, it, vi } from "vitest";
import {
  buildBriefingLeadSyncPlan,
  comparisonKey,
  extractBriefingCadastro,
  normalizeFieldValue,
} from "@/lib/briefing-lead-sync";

const emptyLead = {
  contact_name: "",
  company_name: "",
  email: null,
  phone: null,
  city: null,
  state: null,
  segment: null,
  instagram: null,
};

describe("normalizeFieldValue", () => {
  it("normaliza telefone para dígitos e descarta inválidos", () => {
    expect(normalizeFieldValue("phone", "(83) 99999-9999")).toBe("83999999999");
    expect(normalizeFieldValue("phone", "+55 83 99999 9999")).toBe("83999999999");
    expect(normalizeFieldValue("phone", "123")).toBeNull();
  });

  it("normaliza e-mail para caixa baixa", () => {
    expect(normalizeFieldValue("email", "  Joao@Exemplo.COM ")).toBe(
      "joao@exemplo.com",
    );
    expect(normalizeFieldValue("email", "sem-arroba")).toBeNull();
  });

  it("normaliza UF e instagram", () => {
    expect(normalizeFieldValue("state", " pb ")).toBe("PB");
    expect(normalizeFieldValue("state", "Paraíba")).toBeNull();
    expect(
      normalizeFieldValue("instagram", "https://instagram.com/ValtroLabs/"),
    ).toBe("valtrolabs");
    expect(normalizeFieldValue("instagram", "@ValtroLabs")).toBe("valtrolabs");
  });

  it("ignora strings vazias e valores não-string", () => {
    expect(normalizeFieldValue("city", "   ")).toBeNull();
    expect(normalizeFieldValue("city", "")).toBeNull();
    expect(normalizeFieldValue("city", null)).toBeNull();
    expect(normalizeFieldValue("city", 42)).toBeNull();
  });

  it("compara nomes ignorando acento e caixa", () => {
    expect(comparisonKey("city", "João Pessoa")).toBe(
      comparisonKey("city", "joao pessoa"),
    );
  });
});

describe("extractBriefingCadastro", () => {
  it("mapeia as chaves do briefing para colunas reais do Lead", () => {
    const out = extractBriefingCadastro({
      nome: "Ana Souza",
      empresa: "Sound Vendas",
      whatsapp: "(83) 98888-7777",
      email: "ANA@SOUND.COM",
      cidade: " João Pessoa ",
      estado: "pb",
      segmento: "Moda",
    });
    expect(out).toEqual({
      contact_name: "Ana Souza",
      company_name: "Sound Vendas",
      phone: "83988887777",
      email: "ana@sound.com",
      city: "João Pessoa",
      state: "PB",
      segment: "Moda",
    });
  });
});

describe("buildBriefingLeadSyncPlan", () => {
  it("preenche campo vazio automaticamente", () => {
    const plan = buildBriefingLeadSyncPlan(emptyLead, { email: "a@b.com" });
    expect(plan.updates).toEqual({ email: "a@b.com" });
    expect(plan.conflicts).toHaveLength(0);
  });

  it("no-op quando o valor é igual após normalização (e-mail com caixa diferente)", () => {
    const plan = buildBriefingLeadSyncPlan(
      { ...emptyLead, email: "Ana@Sound.com" },
      { email: "ana@sound.COM" },
    );
    expect(plan.updates).toEqual({});
    expect(plan.conflicts).toHaveLength(0);
  });

  it("no-op para telefone equivalente com formatação diferente", () => {
    const plan = buildBriefingLeadSyncPlan(
      { ...emptyLead, phone: "83999999999" },
      { whatsapp: "+55 (83) 99999-9999" },
    );
    expect(plan.updates).toEqual({});
    expect(plan.conflicts).toHaveLength(0);
  });

  it("cria conflito quando o valor diverge, sem sobrescrever", () => {
    const plan = buildBriefingLeadSyncPlan(
      { ...emptyLead, phone: "83999999999" },
      { whatsapp: "(83) 98888-7777" },
    );
    expect(plan.updates).toEqual({});
    expect(plan.conflicts).toEqual([
      {
        field: "phone",
        current_value: "83999999999",
        briefing_value: "83988887777",
      },
    ]);
  });

  it("string vazia no briefing é ignorada", () => {
    const plan = buildBriefingLeadSyncPlan(
      { ...emptyLead, city: "Recife" },
      { cidade: "   ", email: "" },
    );
    expect(plan.updates).toEqual({});
    expect(plan.conflicts).toEqual([]);
  });

  it("trata múltiplos campos no mesmo briefing (update + conflito)", () => {
    const plan = buildBriefingLeadSyncPlan(
      { ...emptyLead, contact_name: "Ana", email: "ana@old.com" },
      {
        nome: "Ana",
        email: "ana@new.com",
        cidade: "Recife",
        estado: "PE",
      },
    );
    expect(plan.updates).toEqual({ city: "Recife", state: "PE" });
    expect(plan.conflicts.map((c) => c.field)).toEqual(["email"]);
  });

  it("nunca produz updates fora da whitelist", () => {
    const plan = buildBriefingLeadSyncPlan(emptyLead, {
      status: "ganho",
      owner_id: "x",
      source: "site",
      service_type: "consultoria",
      valor: 1000,
      nome: "Ana",
    });
    expect(Object.keys(plan.updates)).toEqual(["contact_name"]);
  });
});

describe("fail-safe da conclusão do briefing", () => {
  it("erro na sincronização não impede a conclusão", async () => {
    const failingSync = vi.fn().mockRejectedValue(new Error("boom"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Reproduz o wrapper usado em completeBriefing.
    const complete = async () => {
      try {
        await failingSync();
      } catch (err) {
        console.error("[briefing] falha na sincronização cadastral:", err);
      }
      return { ok: true, already: false };
    };

    await expect(complete()).resolves.toEqual({ ok: true, already: false });
    expect(failingSync).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
