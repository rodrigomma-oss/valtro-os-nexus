import { test, expect, type BrowserContext, type Page } from "@playwright/test";

/**
 * Sprint 10 — E2E: fluxo copiar mensagem → prompt → registrar contato.
 *
 * Requer:
 *   TEST_LEAD_ID                              uuid de um lead existente
 *   LOVABLE_BROWSER_SUPABASE_STORAGE_KEY      chave localStorage do supabase-js
 *   LOVABLE_BROWSER_SUPABASE_SESSION_JSON     session JSON serializado
 *   LOVABLE_BROWSER_SUPABASE_COOKIES_JSON     (opcional) cookies @supabase/ssr
 *
 * Skippa gracefully quando as variáveis não estão presentes (CI sem sessão).
 */
const LEAD_ID = process.env.TEST_LEAD_ID;
const STORAGE_KEY = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
const SESSION_JSON = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
const COOKIES_JSON = process.env.LOVABLE_BROWSER_SUPABASE_COOKIES_JSON;

async function restoreSupabaseSession(context: BrowserContext, page: Page) {
  if (COOKIES_JSON) {
    const cookies = JSON.parse(COOKIES_JSON) as Array<Record<string, unknown>>;
    for (const c of cookies) c.url = "http://localhost:8080";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await context.addCookies(cookies as any);
  }
  await page.goto("/", { waitUntil: "domcontentloaded" });
  if (STORAGE_KEY && SESSION_JSON) {
    await page.evaluate(
      ([k, v]) => window.localStorage.setItem(k, v),
      [STORAGE_KEY, SESSION_JSON] as const,
    );
  }
}

test.describe("Central de comunicação — copiar & registrar", () => {
  test.skip(
    !LEAD_ID || !STORAGE_KEY || !SESSION_JSON,
    "Requer TEST_LEAD_ID e sessão Supabase injetada.",
  );

  test("copia a mensagem e registra o contato no histórico", async ({
    context,
    page,
  }) => {
    await restoreSupabaseSession(context, page);
    await page.goto(`/crm/leads/${LEAD_ID}`, { waitUntil: "networkidle" });

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

    // Histórico de contatos passa a exibir ao menos 1 registro
    const historico = page
      .getByRole("region", { name: /histórico de contatos/i })
      .or(page.locator("text=Histórico de contatos").locator("xpath=ancestor::*[self::section or self::div][1]"));
    await expect(historico.first()).toBeVisible();
  });
});
