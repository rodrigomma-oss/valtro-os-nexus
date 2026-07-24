import { test, expect, type Page, type Locator, type BrowserContext, type TestInfo } from "@playwright/test";

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

const TEMPLATE_KEYS = {
  Consultoria: "consultoria",
  "Desenvolvimento de Projeto": "projeto",
} as const;

type ServiceLabel = keyof typeof SERVICE_VALUES;
type PortalTerminalState =
  | "portal-welcome"
  | "portal-step"
  | "portal-success"
  | "portal-error-invalid"
  | "portal-error-revoked"
  | "portal-error-expired"
  | "portal-error-completed";

const PORTAL_TERMINAL_STATES: readonly PortalTerminalState[] = [
  "portal-welcome",
  "portal-step",
  "portal-success",
  "portal-error-invalid",
  "portal-error-revoked",
  "portal-error-expired",
  "portal-error-completed",
];

const PORTAL_ERROR_STATES = new Set<PortalTerminalState>([
  "portal-error-invalid",
  "portal-error-revoked",
  "portal-error-expired",
  "portal-error-completed",
]);

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
  const expectedServiceType = SERVICE_VALUES[service];
  const card = activeCardsForService(page, service).first();
  await expect(card).toBeVisible({ timeout: 15_000 });

  await expect(card).toHaveAttribute("data-service-type", expectedServiceType);
  await expect(card).toHaveAttribute("data-status", /^(pendente|ativo)$/);
  await expect(card).toHaveAttribute("data-token-id", /^[0-9a-f-]{36}$/i);

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
        `data-token-id=${tokenId ? maskUuid(tokenId) : "(null)"}.`,
    );
  }
  expect(url).toBeTruthy();
  expect(url).toMatch(/\/briefing\/[0-9a-f-]{36}$/i);
  return url;
}

interface PortalDiagnostics {
  consoleErrors: string[];
  pageErrors: string[];
  failedResponses: string[];
}

function attachPortalDiagnostics(page: Page): PortalDiagnostics {
  const diagnostics: PortalDiagnostics = {
    consoleErrors: [],
    pageErrors: [],
    failedResponses: [],
  };

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    diagnostics.consoleErrors.push(msg.text());
  });

  page.on("pageerror", (err) => {
    diagnostics.pageErrors.push(err.message);
  });

  page.on("response", (response) => {
    const status = response.status();
    if (status < 400) return;
    diagnostics.failedResponses.push(
      `${status} ${maskUrl(response.url())}`,
    );
  });

  return diagnostics;
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    u.pathname = maskToken(u.pathname);
    return maskUuid(u.toString());
  } catch {
    return maskUuid(maskToken(url));
  }
}

function maskUuid(value: string): string {
  return value.replace(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    (uuid) => `${uuid.slice(0, 4)}…${uuid.slice(-4)}`,
  );
}

async function findPortalState(page: Page): Promise<PortalTerminalState | null> {
  for (const state of PORTAL_TERMINAL_STATES) {
    if ((await page.getByTestId(state).count()) > 0) return state;
  }
  return null;
}

async function readPortalDiagnosticSummary(
  page: Page,
  state: PortalTerminalState | null,
  diagnostics: PortalDiagnostics,
): Promise<string> {
  const badge = page.getByTestId("portal-template-badge").first();
  const serviceType =
    (await badge.getAttribute("data-service-type").catch(() => null)) ??
    "(ausente)";
  const templateKey =
    (await badge.getAttribute("data-template-key").catch(() => null)) ??
    "(ausente)";
  const bodyText =
    (await page.locator("body").innerText().catch(() => ""))
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1_500) || "(body vazio)";
  const title = await page.title().catch(() => "(sem título)");

  return [
    `[portal-diagnostics] url=${maskUrl(page.url())}`,
    `[portal-diagnostics] title=${JSON.stringify(title)}`,
    `[portal-diagnostics] state=${state ?? "(nenhum)"}`,
    `[portal-diagnostics] data-service-type=${serviceType}`,
    `[portal-diagnostics] data-template-key=${templateKey}`,
    `[portal-diagnostics] consoleErrors=${maskUuid(JSON.stringify(diagnostics.consoleErrors))}`,
    `[portal-diagnostics] pageErrors=${maskUuid(JSON.stringify(diagnostics.pageErrors))}`,
    `[portal-diagnostics] failedResponses=${maskUuid(JSON.stringify(diagnostics.failedResponses))}`,
    `[portal-diagnostics] body=${maskUuid(JSON.stringify(bodyText))}`,
  ].join("\n");
}

/**
 * Captura artefatos de falha do Portal (screenshot + trace snippet).
 * Nomeados por teste via `testInfo.outputPath`, anexados ao HTML report.
 * Nunca lança — captura é best-effort e não deve mascarar a falha original.
 */
async function capturePortalFailureArtifacts(
  page: Page,
  label: string,
  diagnostics: PortalDiagnostics,
  state: PortalTerminalState | null,
): Promise<void> {
  const testInfo: TestInfo | undefined = (() => {
    try {
      return test.info();
    } catch {
      return undefined;
    }
  })();
  if (!testInfo) return;

  const safe = label.replace(/[^a-z0-9_-]+/gi, "_").toLowerCase();
  const shotPath = testInfo.outputPath(`portal-failure-${safe}.png`);
  const snippetPath = testInfo.outputPath(`portal-failure-${safe}.txt`);

  try {
    await page.screenshot({ path: shotPath, fullPage: false });
    await testInfo.attach(`portal-failure-${safe}.png`, {
      path: shotPath,
      contentType: "image/png",
    });
  } catch {
    /* best-effort */
  }

  try {
    const summary = await readPortalDiagnosticSummary(page, state, diagnostics);
    const domSnippet = maskUuid(
      (await page.content().catch(() => "(sem DOM)")).slice(0, 4_000),
    );
    const snippet = [
      `[capture] label=${label}`,
      `[capture] timestamp=${new Date().toISOString()}`,
      summary,
      `[capture] dom-snippet=${domSnippet}`,
    ].join("\n");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(snippetPath, snippet, "utf8");
    await testInfo.attach(`portal-failure-${safe}.txt`, {
      path: snippetPath,
      contentType: "text/plain",
    });
  } catch {
    /* best-effort */
  }
}

async function waitForPortalTerminalState(
  page: Page,
  diagnostics: PortalDiagnostics,
  label = "terminal-state",
): Promise<PortalTerminalState> {
  try {
    await expect
      .poll(() => findPortalState(page), { timeout: 20_000 })
      .not.toBeNull();
  } catch (err) {
    await capturePortalFailureArtifacts(page, label, diagnostics, null);
    const summary = await readPortalDiagnosticSummary(page, null, diagnostics);
    throw new Error(
      `Portal não saiu do estado de validação.\n${summary}\nOriginal: ${(err as Error).message}`,
    );
  }

  const state = await findPortalState(page);
  if (!state) {
    await capturePortalFailureArtifacts(page, label, diagnostics, null);
    const summary = await readPortalDiagnosticSummary(page, null, diagnostics);
    throw new Error(`Portal não saiu do estado de validação.\n${summary}`);
  }

  console.log(await readPortalDiagnosticSummary(page, state, diagnostics));
  return state;
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
  diagnostics: PortalDiagnostics,
): Promise<void> {
  const expectedServiceType = SERVICE_VALUES[service];
  const expectedTemplateKey = TEMPLATE_KEYS[service];
  const expected = new RegExp(`Briefing\\s·\\s${service}`, "i");
  const other: ServiceLabel =
    service === "Consultoria" ? "Desenvolvimento de Projeto" : "Consultoria";
  const forbidden = new RegExp(`Briefing\\s·\\s${other}`, "i");

  const badge = portal.getByTestId("portal-template-badge").first();

  try {
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute("data-service-type", expectedServiceType);
    await expect(badge).toHaveAttribute("data-template-key", expectedTemplateKey);
  } catch (err) {
    const state = await findPortalState(portal);
    await capturePortalFailureArtifacts(portal, `badge-${service}`, diagnostics, state);
    const summary = await readPortalDiagnosticSummary(portal, state, diagnostics);
    throw new Error(
      `Badge do Portal divergente para "${service}".\n${summary}\nOriginal: ${(err as Error).message}`,
    );
  }

  try {
    await expect(portal.getByText(expected).first()).toBeVisible();
    await expect(portal.getByText(forbidden)).toHaveCount(0);
  } catch (err) {
    const state = await findPortalState(portal);
    await capturePortalFailureArtifacts(portal, `text-${service}`, diagnostics, state);
    throw err;
  }
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
  diagnostics: PortalDiagnostics,
): Promise<PortalTerminalState> {
  const { ciUrl, pathname, sourceOrigin, baseOrigin } =
    buildCiPortalUrl(sourceAbsoluteUrl);

  // Log de diagnóstico (token mascarado).
  console.log(
    `[portal:${service}] source.origin=${sourceOrigin} ` +
      `base.origin=${baseOrigin} pathname=${maskToken(pathname)}`,
  );

  await page.goto(ciUrl, { waitUntil: "domcontentloaded" });

  expect(new URL(page.url()).origin).toBe(baseOrigin);

  const state = await waitForPortalTerminalState(page, diagnostics, `open-${service}`);

  if (PORTAL_ERROR_STATES.has(state)) {
    await capturePortalFailureArtifacts(page, `error-state-${service}`, diagnostics, state);
    const summary = await readPortalDiagnosticSummary(page, state, diagnostics);
    throw new Error(
      `Portal abriu em tela de erro para "${service}" ` +
        `(pathname=${maskToken(pathname)}).\n${summary}`,
    );
  }

  return state;
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
    const consultoriaDiagnostics = attachPortalDiagnostics(portal);
    await openPortalInCi(
      portal,
      consultoriaUrl,
      "Consultoria",
      consultoriaDiagnostics,
    );

    await assertPortalTemplate(portal, "Consultoria", consultoriaDiagnostics);

    await anonCtx.close();

    await revokeActiveBriefingsForService(page, "Consultoria");

    // ---- 2) Desenvolvimento de Projeto ----------------------------------
    await createBriefingForService(page, "Desenvolvimento de Projeto");
    const projetoUrl = await getPortalUrl(page, "Desenvolvimento de Projeto");

    const anonCtx2 = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const portal2 = await anonCtx2.newPage();
    const projetoDiagnostics = attachPortalDiagnostics(portal2);
    await openPortalInCi(
      portal2,
      projetoUrl,
      "Desenvolvimento de Projeto",
      projetoDiagnostics,
    );

    await assertPortalTemplate(
      portal2,
      "Desenvolvimento de Projeto",
      projetoDiagnostics,
    );

    await anonCtx2.close();

    // Cleanup final.
    await revokeActiveBriefingsForService(page, "Desenvolvimento de Projeto");
  });
});

