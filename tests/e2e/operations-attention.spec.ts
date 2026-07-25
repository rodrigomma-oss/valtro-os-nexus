/**
 * Sprint 13.7 — Centro de Operações V2 (fila "Atenção necessária").
 *
 * Spec versionada para execução na infraestrutura dev/E2E (ainda adiada).
 * Valida apenas observabilidade: presença da fila, filtros e CTA para a
 * entidade original. Nenhuma escrita é executada pela fila.
 */
import { test, expect } from "@playwright/test";

test.describe("Centro de Operações — Atenção necessária", () => {
  test("renderiza a fila com filtros de categoria e prioridade", async ({ page }) => {
    await page.goto("/crm/dashboard");

    const queue = page.getByTestId("attention-queue");
    await expect(queue).toBeVisible();

    await expect(page.getByTestId("attn-filter-todos")).toBeVisible();
    for (const c of ["leads", "propostas", "contratacoes", "onboarding", "projetos", "ciclos"]) {
      await expect(page.getByTestId(`attn-filter-${c}`)).toBeVisible();
    }
    await expect(page.getByTestId("attn-priority-critica")).toBeVisible();
  });

  test("filtro por categoria restringe os itens exibidos", async ({ page }) => {
    await page.goto("/crm/dashboard");
    await page.getByTestId("attention-queue").waitFor();

    await page.getByTestId("attn-filter-ciclos").click();
    const items = page.getByTestId("attention-item");
    const count = await items.count();
    for (let i = 0; i < count; i += 1) {
      const kind = await items.nth(i).getAttribute("data-kind");
      expect(["ciclo_ativo", "recorrente_sem_proximo_ciclo"]).toContain(kind);
    }
  });

  test("filtro de prioridade mantém apenas itens críticos", async ({ page }) => {
    await page.goto("/crm/dashboard");
    await page.getByTestId("attention-queue").waitFor();

    await page.getByTestId("attn-priority-critica").click();
    const items = page.getByTestId("attention-item");
    const count = await items.count();
    for (let i = 0; i < count; i += 1) {
      await expect(items.nth(i)).toHaveAttribute("data-priority", "critica");
    }
  });

  test("CTA leva à entidade de origem", async ({ page }) => {
    await page.goto("/crm/dashboard");
    await page.getByTestId("attention-queue").waitFor();

    const first = page.getByTestId("attention-item").first();
    if ((await page.getByTestId("attention-item").count()) === 0) {
      await expect(page.getByTestId("attention-empty")).toBeVisible();
      return;
    }
    const kind = await first.getAttribute("data-kind");
    await first.getByRole("link").click();
    await expect(page).toHaveURL(
      kind?.startsWith("projeto")
        ? /\/crm\/projetos\//
        : kind?.startsWith("briefing") || kind?.startsWith("proposta")
          ? /\/crm\/leads\//
          : /\/crm\/clientes\//,
    );
  });
});
