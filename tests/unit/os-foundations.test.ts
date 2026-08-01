import { describe, it, expect } from "vitest";
import { supabase } from "@/integrations/supabase/client";

/**
 * VOS-001B.2A-R1 — Fundação restaurada.
 *
 * As tabelas `saas_products` e `beta_programs` existem no banco e são legíveis
 * apenas por usuários autenticados (policies `TO authenticated`). Este teste roda
 * sem sessão, portanto valida justamente o contrato de segurança: a tabela existe
 * (sem erro de relação inexistente) e nenhum dado é exposto ao público.
 *
 * A conferência dos seeds (`valtro_pricing` e `valtro_pricing_closed_beta`)
 * é feita na homologação com sessão autenticada.
 */
describe("OS Foundations — SaaS Products & Beta Programs", () => {
  it("expõe a tabela saas_products sem vazar dados para o público", async () => {
    const { data, error } = await supabase.from("saas_products").select("code, name, status");

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("expõe a tabela beta_programs sem vazar dados para o público", async () => {
    const { data, error } = await supabase.from("beta_programs").select("code, name, status");

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("não permite escrita anônima em saas_products", async () => {
    const { error } = await supabase
      .from("saas_products")
      .insert({ code: "teste_anonimo", name: "Teste Anônimo" });

    expect(error).not.toBeNull();
  });
});
