import {
  test,
  expect,
  type Page,
  type Locator,
  type BrowserContext,
  type TestInfo,
  type Response,
} from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

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
  | "portal-error-function"
  | "portal-error-invalid"
  | "portal-error-revoked"
  | "portal-error-expired"
  | "portal-error-completed";

const PORTAL_TERMINAL_STATES: readonly PortalTerminalState[] = [
  "portal-welcome",
  "portal-step",
  "portal-success",
  "portal-error-function",
  "portal-error-invalid",
  "portal-error-revoked",
  "portal-error-expired",
  "portal-error-completed",
];

const PORTAL_ERROR_STATES = new Set<PortalTerminalState>([
  "portal-error-function",
  "portal-error-invalid",
  "portal-error-revoked",
  "portal-error-expired",
  "portal-error-completed",
]);

interface GeneratedBriefingCard {
  tokenId: string;
  portalUrl: string;
  serviceType: string;
  status: string;
  card: Locator;
}

interface BriefingDatabaseState {
  exists: boolean;
  id: string | null;
  service_type: string | null;
  status: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  completed_at: string | null;
  is_accessible: boolean;
  is_unexpired: boolean;
}

interface CapturedValidationResponse {
  method: string;
  url: string;
  status: number;
  body: string;
}

function activeCardsForService(page: Page, service: ServiceLabel): Locator {
  const value = SERVICE_VALUES[service];
  return page.locator(
    `[data-testid="briefing-card"][data-service-type="${value}"]:is([data-status="pendente"], [data-status="ativo"])`,
  );
}

function cardsForService(page: Page, service: ServiceLabel): Locator {
  const value = SERVICE_VALUES[service];
  return page.locator(
    `[data-testid="briefing-card"][data-service-type="${value}"]`,
  );
}

function cardForServiceAndToken(
  page: Page,
  service: ServiceLabel,
  tokenId: string,
): Locator {
  const value = SERVICE_VALUES[service];
  return page.locator(
    `[data-testid="briefing-card"][data-service-type="${value}"][data-token-id="${tokenId}"]`,
  );
}

async function readTokenIds(locator: Locator): Promise<Set<string>> {
  const values = await locator.evaluateAll((nodes) =>
    nodes
      .map((node) => node.getAttribute("data-token-id"))
      .filter((value): value is string => Boolean(value)),
  );
  return new Set(values);
}

async function findNewActiveTokenId(
  page: Page,
  service: ServiceLabel,
  beforeTokenIds: Set<string>,
): Promise<string | null> {
  const cards = await activeCardsForService(page, service).evaluateAll(
    (nodes) =>
      nodes.map((node) => ({
        id: node.getAttribute("data-token-id"),
        status: node.getAttribute("data-status"),
      })),
  );

  const newIds = cards
    .filter(
      (card) =>
        card.id &&
        !beforeTokenIds.has(card.id) &&
        (card.status === "pendente" || card.status === "ativo"),
    )
    .map((card) => card.id as string);

  return newIds.length === 1 ? newIds[0] : null;
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
): Promise<GeneratedBriefingCard> {
  const beforeTokenIds = await readTokenIds(cardsForService(page, service));

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

  await expect
    .poll(() => findNewActiveTokenId(page, service, beforeTokenIds), {
      timeout: 15_000,
    })
    .not.toBeNull();

  const newTokenId = await findNewActiveTokenId(
    page,
    service,
    beforeTokenIds,
  );

  if (!newTokenId) {
    throw new Error(
      `Novo card ativo não identificado para "${service}". ` +
        `before=${maskUuid(JSON.stringify([...beforeTokenIds]))}`,
    );
  }

  const card = cardForServiceAndToken(page, service, newTokenId);
  await expect(card).toHaveCount(1);
  await expect(card).toBeVisible({ timeout: 15_000 });

  const generated = await readGeneratedBriefingCard(card, service);
  console.log(
    `[card:${service}] token=${maskUuid(generated.tokenId)} ` +
      `portal=${maskUrl(generated.portalUrl)} ` +
      `service_type=${generated.serviceType} status=${generated.status}`,
  );
  return generated;
}

async function getPortalUrl(
  page: Page,
  service: ServiceLabel,
  tokenId: string,
): Promise<string> {
  const card = cardForServiceAndToken(page, service, tokenId);
  const generated = await readGeneratedBriefingCard(card, service);
  return generated.portalUrl;
}

async function readGeneratedBriefingCard(
  card: Locator,
  service: ServiceLabel,
): Promise<GeneratedBriefingCard> {
  const expectedServiceType = SERVICE_VALUES[service];
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

  const tokenId = await card.getAttribute("data-token-id");
  const serviceType = await card.getAttribute("data-service-type");
  const status = await card.getAttribute("data-status");
  if (!tokenId || !serviceType || !status) {
    throw new Error(
      `Card de briefing incompleto para "${service}". ` +
        `token=${tokenId ? maskUuid(tokenId) : "(null)"} ` +
        `service_type=${serviceType ?? "(null)"} status=${status ?? "(null)"}`,
    );
  }

  const routeToken = new URL(url).pathname.split("/").pop();
  console.log(
    `[card-compare:${service}] cardToken=${maskUuid(tokenId)} routeToken=${routeToken ? maskUuid(routeToken) : "(null)"}`,
  );
  expect(routeToken).toBe(tokenId);

  return {
    tokenId,
    portalUrl: url,
    serviceType,
    status,
    card,
  };
}

interface PortalDiagnostics {
  consoleErrors: string[];
  pageErrors: string[];
  failedResponses: string[];
  validationResponses: CapturedValidationResponse[];
  pendingValidationCaptures: Promise<void>[];
}

function attachPortalDiagnostics(page: Page): PortalDiagnostics {
  const diagnostics: PortalDiagnostics = {
    consoleErrors: [],
    pageErrors: [],
    failedResponses: [],
    validationResponses: [],
    pendingValidationCaptures: [],
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
    if (isValidationRelatedResponse(response)) {
      diagnostics.pendingValidationCaptures.push(
        captureValidationResponse(response, diagnostics),
      );
    }
    if (status < 400) return;
    diagnostics.failedResponses.push(
      `${status} ${maskUrl(response.url())}`,
    );
  });

  return diagnostics;
}

function isValidationRelatedResponse(response: Response): boolean {
  const url = response.url();
  return (
    url.includes("validateBriefingToken") ||
    url.includes("briefing_tokens") ||
    url.includes("functions/v1") ||
    url.includes("rest/v1") ||
    url.includes("/rpc") ||
    url.includes("/_server")
  );
}

async function captureValidationResponse(
  response: Response,
  diagnostics: PortalDiagnostics,
): Promise<void> {
  try {
    const request = response.request();
    const body = await response.text().catch(() => "(body indisponível)");
    diagnostics.validationResponses.push({
      method: request.method(),
      url: maskUrl(response.url()),
      status: response.status(),
      body: maskUuid(maskToken(body)).replace(/\s+/g, " ").slice(0, 1_200),
    });
  } catch {
    /* best-effort */
  }
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
  await Promise.allSettled(diagnostics.pendingValidationCaptures);

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
    `[portal-diagnostics] validationResponses=${JSON.stringify(diagnostics.validationResponses)}`,
    `[portal-diagnostics] body=${maskUuid(JSON.stringify(bodyText))}`,
  ].join("\n");
}

async function readBriefingDatabaseState(
  tokenId: string,
): Promise<BriefingDatabaseState> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;

  if (!supabaseUrl || !publishableKey || !email || !password) {
    throw new Error("[db-check] Ambiente E2E autenticado indisponível.");
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (authError) throw new Error("[db-check] Falha ao autenticar consulta E2E.");

  const { data, error } = await supabase
    .from("briefing_tokens")
    .select("id, service_type, status, expires_at, revoked_at, completed_at")
    .eq("id", tokenId)
    .maybeSingle();

  await supabase.auth.signOut().catch(() => undefined);

  if (error) {
    throw new Error(
      `[db-check] Erro ao consultar briefing_tokens.id=${maskUuid(tokenId)}: ${error.code ?? "unknown"}`,
    );
  }

  if (!data) {
    return {
      exists: false,
      id: null,
      service_type: null,
      status: null,
      expires_at: null,
      revoked_at: null,
      completed_at: null,
      is_accessible: false,
      is_unexpired: false,
    };
  }

  const expiresAt = new Date(data.expires_at).getTime();
  return {
    exists: true,
    id: data.id,
    service_type: data.service_type,
    status: data.status,
    expires_at: data.expires_at,
    revoked_at: data.revoked_at,
    completed_at: data.completed_at,
    is_accessible:
      (data.status === "pendente" || data.status === "ativo") &&
      !data.revoked_at &&
      !data.completed_at,
    is_unexpired: Number.isFinite(expiresAt) && expiresAt > Date.now(),
  };
}

async function assertBriefingDatabaseState(
  tokenId: string,
  service: ServiceLabel,
): Promise<BriefingDatabaseState> {
  const expectedServiceType = SERVICE_VALUES[service];
  const dbState = await readBriefingDatabaseState(tokenId);
  console.log(
    `[db-check:${service}] token=${maskUuid(tokenId)} exists=${dbState.exists} ` +
      `service_type=${dbState.service_type ?? "(null)"} status=${dbState.status ?? "(null)"} ` +
      `accessible=${dbState.is_accessible} unexpired=${dbState.is_unexpired} ` +
      `revoked=${dbState.revoked_at ? "true" : "false"} completed=${dbState.completed_at ? "true" : "false"}`,
  );

  expect(dbState.exists).toBe(true);
  expect(dbState.id).toBe(tokenId);
  expect(dbState.service_type).toBe(expectedServiceType);
  expect(dbState.status).toMatch(/^(pendente|ativo)$/);
  expect(dbState.is_accessible).toBe(true);
  expect(dbState.is_unexpired).toBe(true);
  expect(dbState.revoked_at).toBeNull();
  expect(dbState.completed_at).toBeNull();
  return dbState;
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
  targetUrl: string;
  realPathname: string;
  maskedPathname: string;
  sourceOrigin: string;
  baseOrigin: string;
} {
  const baseUrl =
    process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";
  const src = new URL(sourceAbsoluteUrl);

  // realPathname carrega o token UUID completo e é usado APENAS para navegação.
  const realPathname = src.pathname;

  // Guardrails anti-regressão: garantir que a máscara de log jamais vaze
  // para a URL de navegação (o caractere "…" é U+2026 / %E2%80%A6).
  expect(realPathname).toMatch(
    /^\/briefing\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  );
  expect(realPathname).not.toContain("\u2026");
  expect(realPathname).not.toContain("%E2%80%A6");

  const targetUrl = new URL(realPathname, baseUrl).toString();

  // Confirma que a URL final também está limpa (mesmo após URL parsing).
  expect(decodeURIComponent(new URL(targetUrl).pathname)).not.toContain(
    "\u2026",
  );

  // maskedPathname é usado EXCLUSIVAMENTE em logs, mensagens de erro
  // e anexos de diagnóstico — nunca em page.goto.
  const maskedPathname = maskToken(realPathname);

  return {
    targetUrl,
    realPathname,
    maskedPathname,
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
  const { targetUrl, maskedPathname, sourceOrigin, baseOrigin } =
    buildCiPortalUrl(sourceAbsoluteUrl);

  // Log de diagnóstico — SEMPRE mascarado. Nunca imprimir o token real.
  console.log(
    `[portal:${service}] source.origin=${sourceOrigin} ` +
      `base.origin=${baseOrigin} pathname=${maskedPathname}`,
  );

  // Navegação usa o pathname REAL (token completo) via targetUrl.
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

  expect(new URL(page.url()).origin).toBe(baseOrigin);

  const state = await waitForPortalTerminalState(page, diagnostics, `open-${service}`);

  if (PORTAL_ERROR_STATES.has(state)) {
    await capturePortalFailureArtifacts(page, `error-state-${service}`, diagnostics, state);
    const summary = await readPortalDiagnosticSummary(page, state, diagnostics);
    throw new Error(
      `Portal abriu em tela de erro para "${service}" ` +
        `(pathname=${maskedPathname}).\n${summary}`,
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
    const consultoriaCard = await createBriefingForService(page, "Consultoria");
    const consultoriaUrl = await getPortalUrl(
      page,
      "Consultoria",
      consultoriaCard.tokenId,
    );
    await assertBriefingDatabaseState(consultoriaCard.tokenId, "Consultoria");

    const anonCtx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    await startPortalTracing(anonCtx, "consultoria");
    const portal = await anonCtx.newPage();
    const consultoriaDiagnostics = attachPortalDiagnostics(portal);
    try {
      await openPortalInCi(
        portal,
        consultoriaUrl,
        "Consultoria",
        consultoriaDiagnostics,
      );
      await assertPortalTemplate(portal, "Consultoria", consultoriaDiagnostics);
    } catch (err) {
      await stopPortalTracing(anonCtx, "consultoria", true);
      await anonCtx.close();
      throw err;
    }
    await stopPortalTracing(anonCtx, "consultoria", false);
    await anonCtx.close();

    await revokeActiveBriefingsForService(page, "Consultoria");

    // ---- 2) Desenvolvimento de Projeto ----------------------------------
    const projetoCard = await createBriefingForService(
      page,
      "Desenvolvimento de Projeto",
    );
    const projetoUrl = await getPortalUrl(
      page,
      "Desenvolvimento de Projeto",
      projetoCard.tokenId,
    );
    await assertBriefingDatabaseState(
      projetoCard.tokenId,
      "Desenvolvimento de Projeto",
    );

    const anonCtx2 = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    await startPortalTracing(anonCtx2, "projeto");
    const portal2 = await anonCtx2.newPage();
    const projetoDiagnostics = attachPortalDiagnostics(portal2);
    try {
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
    } catch (err) {
      await stopPortalTracing(anonCtx2, "projeto", true);
      await anonCtx2.close();
      throw err;
    }
    await stopPortalTracing(anonCtx2, "projeto", false);
    await anonCtx2.close();

    // Cleanup final.
    await revokeActiveBriefingsForService(page, "Desenvolvimento de Projeto");
  });
});

/**
 * Playwright tracing por contexto anônimo: gravamos snapshots + screenshots
 * durante toda a jornada e, em caso de falha, exportamos o zip e anexamos
 * ao relatório. Em sucesso, o trace é descartado para não inflar artefatos.
 */
async function startPortalTracing(
  context: BrowserContext,
  label: string,
): Promise<void> {
  try {
    await context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: false,
      title: `portal-${label}`,
    });
  } catch {
    /* best-effort */
  }
}

async function stopPortalTracing(
  context: BrowserContext,
  label: string,
  onFailure: boolean,
): Promise<void> {
  const testInfo = (() => {
    try {
      return test.info();
    } catch {
      return undefined;
    }
  })();
  if (!onFailure || !testInfo) {
    try {
      await context.tracing.stop();
    } catch {
      /* best-effort */
    }
    return;
  }
  try {
    const tracePath = testInfo.outputPath(`portal-trace-${label}.zip`);
    await context.tracing.stop({ path: tracePath });
    await testInfo.attach(`portal-trace-${label}.zip`, {
      path: tracePath,
      contentType: "application/zip",
    });
  } catch {
    /* best-effort */
  }
}

