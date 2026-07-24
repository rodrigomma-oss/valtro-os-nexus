import { test, expect, type Page, type Locator } from "@playwright/test";

/**
 * Sprint 12.0B / HOTFIX E2E — Templates especializados de Briefing.
 *
 * Estratégia de resiliência:
 *  - Locators re-consultados imediatamente antes de cada interação
 *    (evita "element detached from the DOM" causado por re-render do React
 *    após invalidateQueries).
 *  - Todos os locators críticos usam data-testid estáveis:
 *      briefing-card (com data-service-type + data-status)
 *      briefing-revoke-button
 *      briefing-copy-link-button
 *      briefing-status-badge
 *      new-briefing-dialog
 *      generate-briefing-button
 *  - Sem waitForTimeout e sem retries cegos: apenas expect.poll / toHaveCount.
 */

const LEAD_ID = process.env.TEST_LEAD_ID;
const HAS_AUTH = !!process.env.E2E_TEST_EMAIL && !!process.env.E2E_TEST_PASSWORD;

// service_type enum values usados nos data-service-type dos cards.
const SERVICE_VALUES = {
  Consultoria: "consultoria",
  "Desenvolvimento de Projeto": "desenvolvimento_projeto",
} as const;

type ServiceLabel = keyof typeof SERVICE_VALUES;

const ACTIVE_STATUS_SELECTOR =
  '[data-testid="briefing-card"][data-status="pendente"], [data-testid="briefing-card"][data-status="ativo"]';

function activeCardsForService(page: Page, service: ServiceLabel): Locator {
  const value = SERVICE_VALUES[service];
  return page.locator(
    `[data-testid="briefing-card"][data-service-type="${value}"]:is([data-status="pendente"], [data-status="ativo"])`,
  );
}

/**
 * Revoga todos os cards Pendente/Ativo do serviço, re-consultando o DOM
 * antes de cada clique para tolerar re-renders do React Query.
 */
async function revokeActiveBriefingsForService(
  page: Page,
  service: ServiceLabel,
): Promise<void> {
  page.removeAllListeners("dialog");
  page.on("dialog", (d) => {
    void d.accept();
  });

  await expect(page.getByText(/Histórico de Briefings/i)).toBeVisible();

  // Limite defensivo: no máximo 10 revogações por chamada.
  for (let i = 0; i < 10; i++) {
    const remaining = await activeCardsForService(page, service).count();
    if (remaining === 0) return;

    // Re-consulta o botão IMEDIATAMENTE antes de clicar.
    const revokeBtn = activeCardsForService(page, service)
      .first()
      .getByTestId("briefing-revoke-button");

    await revokeBtn.click();

    // Aguarda a contagem de cards ativos deste serviço diminuir.
    await expect
      .poll(() => activeCardsForService(page, service).count(), {
        timeout: 15_000,
      })
      .toBeLessThan(remaining);
  }

  await expect(activeCardsForService(page, service)).toHaveCount(0);
}

async function createBriefingForService(
  page: Page,
  service: ServiceLabel,
): Promise<void> {
  await page
    .getByRole("button", { name: /^(Novo briefing|Gerar Briefing)$/ })
    .first()
    .click();

  const dialog = page.getByTestId("new-briefing-dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("combobox").click();
  await page.getByRole("option", { name: service }).click();
  await dialog.getByTestId("generate-briefing-button").click();

  try {
    await expect(dialog).toBeHidden({ timeout: 15_000 });
  } catch (err) {
    const toastText = await page
      .locator("[data-sonner-toast], [role='status'], [role='alert']")
      .allTextContents()
      .catch(() => [] as string[]);
    throw new Error(
      `Modal permaneceu aberto após submit para "${service}". ` +
        `Toasts: ${JSON.stringify(toastText)}. Original: ${(err as Error).message}`,
    );
  }

  // Confirma que um novo card ativo do serviço apareceu.
  await expect(activeCardsForService(page, service).first()).toBeVisible({
    timeout: 15_000,
  });
}

async function copyPortalLink(
  page: Page,
  service: ServiceLabel,
): Promise<string> {
  const card = activeCardsForService(page, service).first();
  await expect(card).toBeVisible();
  await card.getByTestId("briefing-copy-link-button").click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toMatch(/\/briefing\/[0-9a-f-]{36}$/i);
  return url;
}

test.describe("Sprint 12.0B — Templates especializados de Briefing", () => {
  test.skip(
    !LEAD_ID || !HAS_AUTH,
    "Requer TEST_LEAD_ID e secrets E2E_TEST_EMAIL/E2E_TEST_PASSWORD.",
  );

  test("Consultoria e Projeto: rótulos e perguntas específicas do template", async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000);

    await page.context().grantPermissions([
      "clipboard-read",
      "clipboard-write",
    ]);

    await page.goto(`/crm/leads/${LEAD_ID}`, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/auth/);
    await expect(page.getByText(/Histórico de Briefings/i)).toBeVisible();

    // Sanidade: se o lead vier sujo de execuções anteriores, garantir estado limpo
    // para ambos os serviços que este teste toca.
    await revokeActiveBriefingsForService(page, "Consultoria");
    await revokeActiveBriefingsForService(page, "Desenvolvimento de Projeto");

    // ---- 1) Consultoria -------------------------------------------------
    await createBriefingForService(page, "Consultoria");
    const consultoriaUrl = await copyPortalLink(page, "Consultoria");

    const anonCtx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const portal = await anonCtx.newPage();
    await portal.goto(consultoriaUrl, { waitUntil: "domcontentloaded" });

    await assertPortalTemplate(portal, "Consultoria");

    await anonCtx.close();

    await revokeActiveBriefingsForService(page, "Consultoria");

    // ---- 2) Desenvolvimento de Projeto ----------------------------------
    await createBriefingForService(page, "Desenvolvimento de Projeto");
    const projetoUrl = await copyPortalLink(page, "Desenvolvimento de Projeto");

    const anonCtx2 = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const portal2 = await anonCtx2.newPage();
    await portal2.goto(projetoUrl, { waitUntil: "domcontentloaded" });

    await assertPortalTemplate(portal2, "Desenvolvimento de Projeto");

    await anonCtx2.close();

    // Cleanup final.
    await revokeActiveBriefingsForService(page, "Desenvolvimento de Projeto");
  });
});
