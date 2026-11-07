import { expect, test, type Page } from "@playwright/test";

const HAS_AUTH = !!process.env.E2E_TEST_EMAIL && !!process.env.E2E_TEST_PASSWORD;
const FEEDBACK_CODES = ["FDB-000003", "FDB-000004", "FDB-000007"] as const;

async function openFeedbackList(page: Page) {
  await page.goto("/os/atendimento/feedback", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Feedback", exact: true })).toBeVisible();
  for (const code of FEEDBACK_CODES) {
    await expect(page.getByRole("link", { name: code, exact: true })).toBeVisible();
  }
}

async function expectFeedbackDetail(page: Page, code: string) {
  await expect(page).toHaveURL(/\/os\/atendimento\/feedback\/[0-9a-f-]+$/i);
  await expect(page.getByRole("heading", { name: code, exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Feedback", exact: true })).toHaveCount(0);
}

test.describe("OPS-INT-003 — rotas de Feedback", () => {
  test.skip(!HAS_AUTH, "Requer secrets E2E_TEST_EMAIL/E2E_TEST_PASSWORD.");

  test("código, acesso direto, reload e retorno mantêm lista e detalhe separados", async ({ page }) => {
    await openFeedbackList(page);

    const detailHref = await page
      .getByRole("link", { name: "FDB-000007", exact: true })
      .getAttribute("href");
    expect(detailHref).toMatch(/^\/os\/atendimento\/feedback\/[0-9a-f-]+$/i);

    await page.getByRole("link", { name: "FDB-000007", exact: true }).click();
    await expectFeedbackDetail(page, "FDB-000007");

    await page.reload({ waitUntil: "domcontentloaded" });
    await expectFeedbackDetail(page, "FDB-000007");

    await page.locator("main").getByRole("link", { name: "Feedback", exact: true }).click();
    await openFeedbackList(page);

    await page.goto(detailHref!, { waitUntil: "domcontentloaded" });
    await expectFeedbackDetail(page, "FDB-000007");
  });

  test("ação Abrir monta o detalhe dos três registros", async ({ page }) => {
    for (const code of FEEDBACK_CODES) {
      await openFeedbackList(page);
      const row = page.getByRole("row").filter({ hasText: code });
      await row.getByRole("button", { name: "Abrir", exact: true }).click();
      await expectFeedbackDetail(page, code);
    }
  });

  test("registro criado via API sem autor abre normalmente", async ({ page }) => {
    await openFeedbackList(page);
    const apiRow = page.getByRole("row").filter({ hasText: "Sistema/API" }).first();
    await expect(apiRow).toBeVisible();
    const code = (await apiRow.getByRole("link", { name: /^FDB-\d+$/ }).textContent())?.trim();
    expect(code).toMatch(/^FDB-\d+$/);
    await apiRow.getByRole("link", { name: code!, exact: true }).click();
    await expectFeedbackDetail(page, code!);
  });
});
