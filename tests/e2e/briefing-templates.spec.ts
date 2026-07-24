import { test, expect, type Page } from "@playwright/test";

/**
 * Sprint 12.0B / HOTFIX E2E — Templates especializados de Briefing.
 *
 * Torna o teste idempotente: se o Lead já possui briefings ativos/pendentes
 * (pendente|ativo), revoga-os pela própria UI antes de tentar criar um novo
 * para o mesmo serviço. A regra "1 ativo por serviço" continua intacta.
 *
 * Diagnóstico: se após clicar em "Gerar Briefing" o modal permanecer aberto,
 * capturamos o toast/erro visível e falhamos com mensagem informativa, em
 * vez de simplesmente aguardar o fechamento.
 */
const LEAD_ID = process.env.TEST_LEAD_ID;
const HAS_AUTH = !!process.env.E2E_TEST_EMAIL && !!process.env.E2E_TEST_PASSWORD;

/**
 * Revoga todos os envelopes ativos (Pendente|Ativo) do serviço informado,
 * usando o botão "Revogar" do próprio card. O botão dispara window.confirm,
 * então registramos um handler de diálogo que aceita automaticamente.
 */
async function revokeActiveBriefingsForService(
  page: Page,
  serviceLabel: string,
): Promise<void> {
  // Aceita todo window.confirm subsequente (idempotente — reinstala a cada call).
  page.removeAllListeners("dialog");
  page.on("dialog", (d) => {
    void d.accept();
  });

  // Garante que a lista carregou.
  await expect(page.getByText(/Histórico de Briefings/i)).toBeVisible();

  // Enquanto houver envelope do serviço em Pendente/Ativo com botão "Revogar", revoga.
  // Limite de segurança para evitar loop infinito.
  for (let i = 0; i < 10; i++) {
    const envelope = page
      .locator("li")
      .filter({ hasText: new RegExp(serviceLabel, "i") })
      .filter({ hasText: /Pendente|Ativo/ })
      .filter({ has: page.getByRole("button", { name: /Revogar/i }) })
      .first();

    if ((await envelope.count()) === 0) return;

    await envelope.getByRole("button", { name: /Revogar/i }).click();

    // Confirmação visual: o envelope específico muda para "Revogado"
    // (ou o botão Revogar desse envelope some).
    await expect
      .poll(
        async () =>
          page
            .locator("li")
            .filter({ hasText: new RegExp(serviceLabel, "i") })
            .filter({ hasText: /Pendente|Ativo/ })
            .filter({ has: page.getByRole("button", { name: /Revogar/i }) })
            .count(),
        { timeout: 15_000 },
      )
      .toBeLessThan(i + 1 + 1); // decrementa a cada passagem
  }
}

async function createBriefingForService(
  page: Page,
  serviceLabel: string,
): Promise<void> {
  await page
    .getByRole("button", { name: /^(Novo briefing|Gerar Briefing)$/ })
    .first()
    .click();

  const dialog = page.getByRole("dialog", { name: /Gerar Novo Briefing/i });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("combobox").click();
  await page.getByRole("option", { name: serviceLabel }).click();
  await dialog.getByRole("button", { name: /Gerar Briefing/i }).click();

  // Diagnóstico: se em 15s não fechar, capturar toast/erro visível e falhar informativo.
  try {
    await expect(dialog).toBeHidden({ timeout: 15_000 });
  } catch (err) {
    const toastText = await page
      .locator("[data-sonner-toast], [role='status'], [role='alert']")
      .allTextContents()
      .catch(() => [] as string[]);
    throw new Error(
      `Modal "Gerar Novo Briefing" permaneceu aberto após submit para "${serviceLabel}". ` +
        `Toasts/mensagens visíveis: ${JSON.stringify(toastText)}. ` +
        `Causa original: ${(err as Error).message}`,
    );
  }
}

async function copyPortalLink(
  page: Page,
  serviceLabel: string,
): Promise<string> {
  const target = page
    .locator("li")
    .filter({ hasText: new RegExp(serviceLabel, "i") })
    .filter({ hasText: /Pendente|Ativo/ })
    .first();
  await expect(target).toBeVisible();

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

    // ---- 1) Consultoria -------------------------------------------------
    await revokeActiveBriefingsForService(page, "Consultoria");
    await createBriefingForService(page, "Consultoria");
    const consultoriaUrl = await copyPortalLink(page, "Consultoria");

    const anonCtx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const portal = await anonCtx.newPage();
    await portal.goto(consultoriaUrl, { waitUntil: "domcontentloaded" });

    await expect(
      portal.getByText(/Briefing · Consultoria/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    await portal.getByRole("button", { name: /Começar briefing/i }).click();
    await portal.getByRole("button", { name: /Iniciar/i }).click();

    await expect(
      portal.getByText(/Qual tipo de projeto deseja desenvolver\?/i),
    ).toHaveCount(0);

    await anonCtx.close();

    // Revoga o briefing de Consultoria antes de seguir.
    await revokeActiveBriefingsForService(page, "Consultoria");

    // ---- 2) Desenvolvimento de Projeto ----------------------------------
    await revokeActiveBriefingsForService(page, "Desenvolvimento de Projeto");
    await createBriefingForService(page, "Desenvolvimento de Projeto");
    const projetoUrl = await copyPortalLink(page, "Desenvolvimento de Projeto");

    const anonCtx2 = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const portal2 = await anonCtx2.newPage();
    await portal2.goto(projetoUrl, { waitUntil: "domcontentloaded" });

    await expect(
      portal2.getByText(/Briefing · Desenvolvimento de Projeto/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    await portal2.getByRole("button", { name: /Começar briefing/i }).click();
    await portal2.getByRole("button", { name: /Iniciar/i }).click();

    await expect(
      portal2
        .getByText(/Qual tipo de projeto deseja desenvolver\?/i)
        .first(),
    ).toBeVisible({ timeout: 15_000 });

    await anonCtx2.close();

    // Cleanup: revoga o briefing de Projeto criado.
    await revokeActiveBriefingsForService(page, "Desenvolvimento de Projeto");
  });
});
