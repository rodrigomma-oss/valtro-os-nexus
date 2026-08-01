import { test, expect } from "@playwright/test";

/**
 * Sprint 10 — E2E: fluxo copiar mensagem → prompt → registrar contato.
 *
 * Autenticação vem do globalSetup (signInWithPassword do usuário E2E),
 * que preenche o storageState injetado pelo playwright.config.ts.
 *
 * Skippa gracefully quando faltam TEST_LEAD_ID ou os secrets de login
 * (ex.: pull requests de forks).
 */
const LEAD_ID = process.env.TEST_LEAD_ID;
const HAS_AUTH = !!process.env.E2E_TEST_EMAIL && !!process.env.E2E_TEST_PASSWORD;

test.describe("Central de comunicação — copiar & registrar", () => {
  test.skip(
    !LEAD_ID || !HAS_AUTH,
    "Requer TEST_LEAD_ID e secrets E2E_TEST_EMAIL/E2E_TEST_PASSWORD.",
  );

  test("copia a mensagem e registra o contato no histórico", async ({
    page,
  }) => {
    await page.goto(`/os/comercial/leads/${LEAD_ID}`, { waitUntil: "networkidle" });

    // Abre o composer
    await page.getByRole("button", { name: "Comunicação" }).first().click();
    const composer = page.getByRole("dialog", { name: /central de comunicação/i });
    await expect(composer).toBeVisible();

    // Copia a mensagem renderizada
    await composer.getByRole("button", { name: "Copiar mensagem" }).click();

    // Verifica o conteúdo do clipboard
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText.length).toBeGreaterThan(20);
    expect(clipboardText).not.toContain("{{");

    // Prompt "Registrar esta ação no histórico?"
    const prompt = page.getByRole("alertdialog");
    await expect(prompt).toBeVisible();
    await prompt.getByRole("button", { name: "Registrar" }).click();

    // NewContactDialog abre com defaults do template
    const registerDialog = page.getByRole("dialog", { name: /registrar contato/i });
    await expect(registerDialog).toBeVisible();

    // Confirma a criação
    await registerDialog
      .getByRole("button", { name: "Registrar contato" })
      .click();

    // Toast de sucesso
    await expect(page.getByText("Contato registrado.")).toBeVisible();
  });
});
