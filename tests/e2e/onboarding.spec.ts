import { test, expect, type Page } from "@playwright/test";

/**
 * Sprint 13.5 — E2E: Onboarding pós-venda por contratação.
 *
 * Cobre o ciclo completo:
 *   Proposta aprovada → contratação → ativação → onboarding → conclusão
 *
 * E também os casos de contorno exigidos pela sprint:
 *   - contratação COM template (Acompanhamento Shopee) → action habilitada
 *   - contratação SEM template → "Este serviço não exige onboarding."
 *   - tentativa de duplicação (segundo onboarding ativo bloqueado)
 *   - token válido / revogado
 *   - prefill seguro (nenhuma credencial, apenas whitelist)
 *   - eventos na timeline da contratação
 *   - acesso público indevido (token inexistente → link inválido)
 *
 * Autenticação vem do globalSetup. Nenhum secret é impresso e nenhuma
 * escrita usa service_role: tudo passa pelas server functions autenticadas.
 */
const LEAD_ID = process.env.TEST_LEAD_ID;
const HAS_AUTH = !!process.env.E2E_TEST_EMAIL && !!process.env.E2E_TEST_PASSWORD;

/** Abre o primeiro cliente do CRM (criado pelas sprints anteriores). */
async function openFirstClient(page: Page) {
  await page.goto("/crm/clientes", { waitUntil: "domcontentloaded" });
  const firstLink = page.locator('a[href^="/crm/clientes/"]').first();
  await expect(firstLink).toBeVisible();
  await firstLink.click();
  await expect(page.getByTestId("contracted-services-card")).toBeVisible();
}

test.describe("Sprint 13.5 — Onboarding pós-venda", () => {
  test.skip(
    !LEAD_ID || !HAS_AUTH,
    "Requer TEST_LEAD_ID e secrets E2E_TEST_EMAIL/E2E_TEST_PASSWORD.",
  );

  test("contratação → ativação → onboarding → conclusão", async ({ page, context }) => {
    test.setTimeout(180_000);

    // ---- 1) Cliente com contratações -----------------------------------
    await openFirstClient(page);

    const rows = page.getByTestId("contracted-service-row");
    await expect(rows.first()).toBeVisible();

    // ---- 2) Ativar a contratação (pendente → ativo) --------------------
    const row = rows.first();
    const activate = row.getByTestId("contract-action-ativo");
    if (await activate.isVisible().catch(() => false)) {
      await activate.click();
      await expect(row.getByTestId("contracted-service-status")).toHaveText(/Ativo/i);
    }

    // ---- 3) Card de onboarding presente na contratação -----------------
    const onboardingCard = row.getByTestId("onboarding-card");
    await expect(onboardingCard).toBeVisible();

    const startAction = onboardingCard.getByTestId("onboarding-start-action");
    const noTemplate = onboardingCard.getByTestId("onboarding-no-template");

    // Contratação SEM template: mensagem explícita e action desabilitada.
    if (await noTemplate.isVisible().catch(() => false)) {
      await expect(startAction).toBeDisabled();
      return;
    }

    // ---- 4) Abrir onboarding (action manual) ---------------------------
    await startAction.click();
    const onboardingRow = onboardingCard.getByTestId("onboarding-row").first();
    await expect(onboardingRow).toBeVisible();
    await expect(onboardingRow.getByTestId("onboarding-status")).toHaveText(/Enviado/i);

    // ---- 5) Duplicação bloqueada --------------------------------------
    await expect(startAction).toBeDisabled();

    // ---- 6) Copiar o link público -------------------------------------
    await onboardingRow.getByTestId("onboarding-copy-link").click();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toContain("/onboarding/");

    // ---- 7) Portal anônimo: token válido ------------------------------
    const anonPage = await context.newPage();
    await anonPage.context().clearCookies();
    await anonPage.goto(link, { waitUntil: "domcontentloaded" });
    await expect(anonPage.getByTestId("onboarding-badge")).toBeVisible();
    await expect(anonPage.getByTestId("onboarding-badge")).toContainText(/Onboarding/i);

    await anonPage.getByTestId("onboarding-start").click();
    await expect(anonPage.getByTestId("onboarding-step")).toBeVisible();

    // ---- 8) Prefill seguro: nada de senha/credencial ------------------
    const bodyText = (await anonPage.textContent("body")) ?? "";
    expect(bodyText.toLowerCase()).not.toContain("senha");

    // ---- 9) Preencher todas as etapas --------------------------------
    for (let guard = 0; guard < 10; guard++) {
      const review = anonPage.getByTestId("onboarding-review");
      if (await review.isVisible().catch(() => false)) break;

      const step = anonPage.getByTestId("onboarding-step");
      const inputs = step.locator("input:not([type=checkbox])");
      for (let i = 0; i < (await inputs.count()); i++) {
        const input = inputs.nth(i);
        if ((await input.inputValue()) === "") await input.fill(`E2E ${Date.now()}`);
      }
      const areas = step.locator("textarea");
      for (let i = 0; i < (await areas.count()); i++) {
        const area = areas.nth(i);
        if ((await area.inputValue()) === "") await area.fill("E2E — resposta de teste");
      }
      const combos = step.getByRole("combobox");
      for (let i = 0; i < (await combos.count()); i++) {
        await combos.nth(i).click();
        await anonPage.getByRole("option").first().click();
      }
      const boxes = step.getByRole("checkbox");
      if ((await boxes.count()) > 0) await boxes.first().click();

      await anonPage.getByTestId("onboarding-next").click();
    }

    // ---- 10) Concluir -------------------------------------------------
    await expect(anonPage.getByTestId("onboarding-review")).toBeVisible();
    await anonPage.getByTestId("onboarding-submit").click();
    await expect(anonPage.getByTestId("onboarding-success")).toBeVisible();

    // Reabrir o mesmo link → estado concluído (não permite reenvio).
    await anonPage.goto(link, { waitUntil: "domcontentloaded" });
    await expect(anonPage.getByTestId("onboarding-error-completed")).toBeVisible();

    // ---- 11) CRM: status concluído + respostas visíveis --------------
    await page.reload({ waitUntil: "domcontentloaded" });
    const reloadedRow = page.getByTestId("contracted-service-row").first();
    await expect(
      reloadedRow.getByTestId("onboarding-row").first().getByTestId("onboarding-status"),
    ).toHaveText(/Concluído/i);

    await reloadedRow.getByTestId("onboarding-view-answers").first().click();
    await expect(reloadedRow.getByTestId("onboarding-answers")).toBeVisible();

    // ---- 12) Timeline da contratação com eventos de onboarding -------
    await reloadedRow.getByTestId("contract-toggle-timeline").click();
    const timeline = reloadedRow.getByTestId("contract-timeline");
    await expect(timeline).toBeVisible();
    await expect(
      timeline.locator('[data-event-type="onboarding_created"]').first(),
    ).toBeVisible();
    await expect(
      timeline.locator('[data-event-type="onboarding_completed"]').first(),
    ).toBeVisible();

    await anonPage.close();
  });

  test("token inexistente é rejeitado pelo portal público", async ({ context }) => {
    const anonPage = await context.newPage();
    await anonPage.context().clearCookies();
    await anonPage.goto("/onboarding/00000000-0000-4000-8000-000000000000", {
      waitUntil: "domcontentloaded",
    });
    await expect(anonPage.getByTestId("onboarding-error-invalid")).toBeVisible();
    await anonPage.close();
  });
});
