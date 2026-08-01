import { test, expect, type Page } from "@playwright/test";

/**
 * Sprint 13.6 — E2E: ciclos e recorrência das contratações.
 *
 * Cobre o que só é observável na aplicação rodando:
 *   - serviço pontual não exibe a seção "Ciclos";
 *   - recorrente ativa gera o primeiro ciclo;
 *   - próximo ciclo continua o período anterior (sem drift);
 *   - iniciar/concluir ciclo não altera o status da contratação;
 *   - contratação pausada bloqueia novo ciclo;
 *   - eventos aparecem na timeline operacional.
 *
 * Autenticação vem do globalSetup. Nenhuma escrita usa service_role.
 */
const HAS_AUTH = !!process.env.E2E_TEST_EMAIL && !!process.env.E2E_TEST_PASSWORD;

async function openClientWithContracts(page: Page) {
  await page.goto("/os/comercial/clientes", { waitUntil: "domcontentloaded" });
  const firstLink = page.locator('a[href^="/os/comercial/clientes/"]').first();
  await expect(firstLink).toBeVisible();
  await firstLink.click();
  await expect(page.getByTestId("contracted-services-card")).toBeVisible();
}

test.describe("Sprint 13.6 — Ciclos das contratações", () => {
  test.skip(!HAS_AUTH, "Requer secrets E2E_TEST_EMAIL/E2E_TEST_PASSWORD.");

  test("recorrente ativa: primeiro ciclo, próximo ciclo e timeline", async ({ page }) => {
    test.setTimeout(180_000);

    await openClientWithContracts(page);
    const rows = page.getByTestId("contracted-service-row");
    await expect(rows.first()).toBeVisible();

    // Localiza uma contratação recorrente (a seção Ciclos só existe nelas).
    const total = await rows.count();
    let target: ReturnType<Page["getByTestId"]> | null = null;
    for (let i = 0; i < total; i++) {
      const row = rows.nth(i);
      if (await row.getByTestId("cycles-card").isVisible().catch(() => false)) {
        target = row;
        break;
      }
      // Serviço pontual: nunca renderiza a seção de ciclos.
      await expect(row.getByTestId("cycles-card")).toHaveCount(0);
    }
    test.skip(!target, "Nenhuma contratação recorrente disponível no ambiente.");
    const row = target!;

    // Ativa a contratação se ainda estiver pendente.
    const activate = row.getByTestId("contract-action-ativo");
    if (await activate.isVisible().catch(() => false)) {
      await activate.click();
      await expect(row.getByTestId("contracted-service-status")).toHaveText(/Ativo/i);
    }

    const cycles = row.getByTestId("cycles-card");
    await expect(cycles).toBeVisible();

    // ---- primeiro ciclo -------------------------------------------------
    const createAction = cycles.getByTestId("cycle-create-action");
    if (await createAction.isEnabled()) {
      await createAction.click();
      await expect(cycles.getByTestId("cycle-row").first()).toBeVisible();
    }
    const first = cycles.getByTestId("cycle-row").first();
    await expect(first.getByTestId("cycle-status")).toHaveText(/Previsto|Ativo|Concluído/i);
    const firstPeriod = (await first.getByTestId("cycle-period").textContent()) ?? "";
    expect(firstPeriod).toMatch(/\d{2}\/\d{2}\/\d{4} → \d{2}\/\d{2}\/\d{4}/);

    // ---- ciclo em aberto bloqueia o próximo ----------------------------
    await expect(createAction).toBeDisabled();
    await expect(cycles.getByTestId("cycle-blocked-reason")).toContainText(/em aberto/i);

    // ---- iniciar + concluir o ciclo ------------------------------------
    const startBtn = first.getByTestId("cycle-action-ativo");
    if (await startBtn.isVisible().catch(() => false)) await startBtn.click();
    await expect(first.getByTestId("cycle-status")).toHaveText(/Ativo/i);
    await first.getByTestId("cycle-action-concluido").click();
    await expect(first.getByTestId("cycle-status")).toHaveText(/Concluído/i);

    // Ciclo concluído NÃO conclui a contratação.
    await expect(row.getByTestId("contracted-service-status")).toHaveText(/Ativo/i);

    // ---- próximo ciclo continua o período anterior ---------------------
    await expect(createAction).toBeEnabled();
    const previewText = (await cycles.getByTestId("cycle-preview").textContent()) ?? "";
    const nextStart = previewText.match(/(\d{2}\/\d{2}\/\d{4}) →/)?.[1];
    const prevEnd = firstPeriod.match(/→ (\d{2}\/\d{2}\/\d{4})/)?.[1];
    expect(nextStart).toBeTruthy();
    expect(prevEnd).toBeTruthy();
    // Início do próximo = dia seguinte ao fim do anterior.
    const toDate = (br: string) => {
      const [d, m, y] = br.split("/").map(Number);
      return Date.UTC(y, m - 1, d);
    };
    expect(toDate(nextStart!) - toDate(prevEnd!)).toBe(86_400_000);

    await createAction.click();
    await expect(cycles.getByTestId("cycle-row")).toHaveCount(2);

    // ---- timeline registra os eventos de ciclo -------------------------
    await row.getByTestId("contract-toggle-timeline").click();
    const timeline = row.getByTestId("contract-timeline");
    await expect(timeline).toBeVisible();
    for (const type of ["cycle_created", "cycle_started", "cycle_completed"]) {
      await expect(timeline.locator(`[data-event-type="${type}"]`).first()).toBeVisible();
    }

    // ---- contratação pausada não inicia novo ciclo ---------------------
    await row.getByTestId("contract-action-pausado").click();
    await expect(row.getByTestId("contracted-service-status")).toHaveText(/Pausado/i);
    await expect(cycles.getByTestId("cycle-create-action")).toBeDisabled();
    // Ciclos históricos permanecem intactos.
    await expect(cycles.getByTestId("cycle-row")).toHaveCount(2);

    // restaura o estado operacional
    await row.getByTestId("contract-action-ativo").click();
    await expect(row.getByTestId("contracted-service-status")).toHaveText(/Ativo/i);
  });
});
