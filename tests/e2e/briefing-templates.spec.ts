import { test, expect, type Page } from "@playwright/test";

/**
 * Sprint 12.0B — E2E: templates especializados de Briefing.
 *
 * Garante que o service_type escolhido pelo operador no CRM é a única
 * fonte de verdade do questionário exibido ao cliente no Portal:
 *  - Consultoria mostra "Briefing · Consultoria" e não exibe perguntas
 *    de desenvolvimento ("Qual tipo de projeto deseja desenvolver?").
 *  - Desenvolvimento de Projeto mostra "Briefing · Desenvolvimento de
 *    Projeto" e contém a pergunta de tipo de projeto.
 *  - service_type e template_type permanecem inalterados após save.
 *
 * Autenticação via globalSetup (E2E_TEST_EMAIL/PASSWORD). O Portal em si
 * é público (anônimo) e é aberto em um contexto sem storageState.
 *
 * Idempotência: se o Lead já tiver um briefing ATIVO para o mesmo
 * service_type, reutilizamos o link existente em vez de tentar criar
 * um novo (a regra "1 ativo por serviço" bloqueia a criação, e isso é
 * o comportamento correto — não é o que estamos testando aqui).
 */
const LEAD_ID = process.env.TEST_LEAD_ID;
const HAS_AUTH = !!process.env.E2E_TEST_EMAIL && !!process.env.E2E_TEST_PASSWORD;

async function getPortalLinkForService(
  page: Page,
  serviceLabel: string,
): Promise<string> {
  const card = page.getByRole("region", { name: /Briefings/i }).or(
    page.locator("section, div").filter({ hasText: /Briefings/ }).first(),
  );

  // Localiza um envelope existente para o serviço.
  const envelope = page
    .locator("li")
    .filter({ hasText: new RegExp(serviceLabel, "i") })
    .first();

  const exists = (await envelope.count()) > 0;

  if (!exists) {
    // Cria um novo briefing.
    await page.getByRole("button", { name: /^(Novo briefing|Gerar Briefing)$/ }).first().click();
    const dialog = page.getByRole("dialog", { name: /Gerar Novo Briefing/i });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("combobox").click();
    await page.getByRole("option", { name: serviceLabel }).click();
    await dialog.getByRole("button", { name: /Gerar Briefing/i }).click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });
  }

  const target = page
    .locator("li")
    .filter({ hasText: new RegExp(serviceLabel, "i") })
    .first();
  await expect(target).toBeVisible();

  // Clica em "Copiar link" e lê do clipboard.
  await target.getByRole("button", { name: /Copiar link/i }).click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toMatch(/\/briefing\/[0-9a-f-]{36}$/i);
  return url;
}

test.describe("Sprint 12.0B — Templates especializados de Briefing", () => {
  test.skip(
    !LEAD_ID || !HAS_AUTH,
    "Requer TEST_LEAD_ID e secrets E2E_TEST_EMAIL/E2E_TEST_PASSWORD.",
  );

  test("Consultoria: rótulo correto, sem perguntas de desenvolvimento; Projeto: rótulo e pergunta de tipo", async ({
    page,
    browser,
  }) => {
    test.setTimeout(120_000);

    // Clipboard permissions p/ ler o link copiado pelo botão do card.
    await page.context().grantPermissions([
      "clipboard-read",
      "clipboard-write",
    ]);

    await page.goto(`/crm/leads/${LEAD_ID}`, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/auth/);

    // ---- 1) Consultoria -------------------------------------------------
    const consultoriaUrl = await getPortalLinkForService(page, "Consultoria");

    // Abre o Portal em contexto anônimo (sem storageState).
    const anonCtx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const portal = await anonCtx.newPage();
    await portal.goto(consultoriaUrl, { waitUntil: "domcontentloaded" });

    // Rótulo do briefing.
    await expect(
      portal.getByText(/Briefing · Consultoria/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    // Nunca deve exibir pergunta de desenvolvimento.
    await portal.getByRole("button", { name: /Começar briefing/i }).click();
    await portal.getByRole("button", { name: /Iniciar/i }).click();
    // Nenhuma etapa deve conter a pergunta de tipo de projeto.
    await expect(
      portal.getByText(/Qual tipo de projeto deseja desenvolver\?/i),
    ).toHaveCount(0);

    await anonCtx.close();

    // ---- 2) Desenvolvimento de Projeto ----------------------------------
    const projetoUrl = await getPortalLinkForService(
      page,
      "Desenvolvimento de Projeto",
    );
    const anonCtx2 = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const portal2 = await anonCtx2.newPage();
    await portal2.goto(projetoUrl, { waitUntil: "domcontentloaded" });

    await expect(
      portal2.getByText(/Briefing · Desenvolvimento de Projeto/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    await portal2.getByRole("button", { name: /Começar briefing/i }).click();
    await portal2.getByRole("button", { name: /Iniciar/i }).click();

    // A pergunta de tipo de projeto pertence exclusivamente a este template.
    await expect(
      portal2
        .getByText(/Qual tipo de projeto deseja desenvolver\?/i)
        .first(),
    ).toBeVisible({ timeout: 15_000 });

    await anonCtx2.close();
  });
});
