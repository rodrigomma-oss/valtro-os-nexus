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

async function getPortalUrl(
  page: Page,
  service: ServiceLabel,
): Promise<string> {
  const card = activeCardsForService(page, service).first();
  await expect(card).toBeVisible({ timeout: 15_000 });

  // Fonte determinística: atributo estável no card (não depende do clipboard,
  // que é instável em runners headless do GitHub Actions).
  await expect
    .poll(() => card.getAttribute("data-portal-url"), { timeout: 10_000 })
    .toMatch(/\/briefing\/[0-9a-f-]{36}$/i);

  const url = await card.getAttribute("data-portal-url");
  if (!url) {
    const tokenId = await card.getAttribute("data-token-id");
    throw new Error(
      `Portal URL não encontrada no card do serviço "${service}". ` +
        `data-token-id=${tokenId ?? "(null)"}.`,
    );
  }
  expect(url).toBeTruthy();
  expect(url).toMatch(/\/briefing\/[0-9a-f-]{36}$/i);
  return url;
}


/**
 * Fonte da verdade da seleção de template no Portal: o badge
 * "Briefing · <serviço>" renderizado tanto na Welcome screen quanto na
 * PortalProgress (quando `validateBriefingToken` pré-preenche `response.data`
 * a partir do Lead e o runner pula direto para a etapa 0). Verificar o badge
 * cobre ambos os caminhos sem depender de qual tela o Portal abriu.
 */
async function assertPortalTemplate(
  portal: Page,
  service: ServiceLabel,
): Promise<void> {
  const expected = new RegExp(`Briefing\\s·\\s${service}`, "i");
  const other: ServiceLabel =
    service === "Consultoria" ? "Desenvolvimento de Projeto" : "Consultoria";
  const forbidden = new RegExp(`Briefing\\s·\\s${other}`, "i");

  await expect(portal.getByText(expected).first()).toBeVisible({
    timeout: 20_000,
  });
  await expect(portal.getByText(forbidden)).toHaveCount(0);
}

function maskToken(pathname: string): string {
  const m = pathname.match(/\/briefing\/([0-9a-f-]+)/i);
  if (!m) return pathname;
  const t = m[1];
  const masked =
    t.length > 8 ? `${t.slice(0, 4)}…${t.slice(-4)}` : "****";
  return pathname.replace(t, masked);
}

/**
 * Reescreve a URL absoluta armazenada no card para o servidor local usado
 * pelo Playwright no CI (PLAYWRIGHT_BASE_URL). Sem isso, o teste abriria a
 * versão publicada em lovable.app em vez do código do commit em execução.
 */
function buildCiPortalUrl(sourceAbsoluteUrl: string): {
  ciUrl: string;
  pathname: string;
  sourceOrigin: string;
  baseOrigin: string;
} {
  const baseUrl =
    process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";
  const src = new URL(sourceAbsoluteUrl);
  const pathname = src.pathname;
  expect(pathname).toMatch(/^\/briefing\/[0-9a-f-]+$/i);
  const ciUrl = new URL(pathname, baseUrl).toString();
  return {
    ciUrl,
    pathname,
    sourceOrigin: src.origin,
    baseOrigin: new URL(baseUrl).origin,
  };
}

async function openPortalInCi(
  page: Page,
  sourceAbsoluteUrl: string,
  service: ServiceLabel,
): Promise<void> {
  const { ciUrl, pathname, sourceOrigin, baseOrigin } =
    buildCiPortalUrl(sourceAbsoluteUrl);

  // Log de diagnóstico (token mascarado).
  console.log(
    `[portal:${service}] source.origin=${sourceOrigin} ` +
      `base.origin=${baseOrigin} pathname=${maskToken(pathname)}`,
  );

  await page.goto(ciUrl, { waitUntil: "domcontentloaded" });

  expect(new URL(page.url()).origin).toBe(baseOrigin);

  // Aguarda o fim de "Validando seu acesso…" e detecta telas de erro
  // explicitamente, para não mascarar problemas como "badge não encontrado".
  const errorScreen = page.getByText(
    /acesso desativado|concluído|inválido|expirado|revogado/i,
  );
  const validating = page.getByText(/Validando seu acesso/i);

  await expect
    .poll(async () => (await validating.count()) === 0, { timeout: 20_000 })
    .toBe(true);

  if ((await errorScreen.count()) > 0) {
    const msg = (await errorScreen.first().textContent())?.trim();
    throw new Error(
      `Portal abriu em tela de erro para "${service}": "${msg}" ` +
        `(pathname=${maskToken(pathname)})`,
    );
  }
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
    const consultoriaUrl = await getPortalUrl(page, "Consultoria");

    const anonCtx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const portal = await anonCtx.newPage();
    await openPortalInCi(portal, consultoriaUrl, "Consultoria");

    await assertPortalTemplate(portal, "Consultoria");

    await anonCtx.close();

    await revokeActiveBriefingsForService(page, "Consultoria");

    // ---- 2) Desenvolvimento de Projeto ----------------------------------
    await createBriefingForService(page, "Desenvolvimento de Projeto");
    const projetoUrl = await getPortalUrl(page, "Desenvolvimento de Projeto");

    const anonCtx2 = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const portal2 = await anonCtx2.newPage();
    await openPortalInCi(portal2, projetoUrl, "Desenvolvimento de Projeto");

    await assertPortalTemplate(portal2, "Desenvolvimento de Projeto");

    await anonCtx2.close();

    // Cleanup final.
    await revokeActiveBriefingsForService(page, "Desenvolvimento de Projeto");
  });
});

