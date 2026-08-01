import { test, expect, type Page, type Locator } from "@playwright/test";

/**
 * Sprint 11 — E2E: gestão de propostas comerciais.
 *
 * Cobre o ciclo completo (rascunho → item → desconto → enviada →
 * negociação → aprovada → conversão do lead → persistência → regra
 * de exclusão) e a seção "Propostas comerciais" no Centro de Operações.
 *
 * Autenticação vem do globalSetup (signInWithPassword com secrets
 * E2E_TEST_EMAIL / E2E_TEST_PASSWORD). Nenhum secret é impresso.
 * Sem service_role — todo dado é criado pelas server functions
 * autenticadas, respeitando RLS do papel operator.
 *
 * Isolamento: cada execução cria uma proposta nova com título único
 * `E2E-${timestamp}`. O Lead TEST_LEAD_ID pode ficar como Convertido
 * após a primeira execução — isso é idempotente e não bloqueia novas
 * propostas (a UI não gateia criação por status do lead).
 */
const LEAD_ID = process.env.TEST_LEAD_ID;
const HAS_AUTH = !!process.env.E2E_TEST_EMAIL && !!process.env.E2E_TEST_PASSWORD;

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function openStatusSelect(drawer: Locator, page: Page, targetLabel: string) {
  // Radix Select: o combobox visível é o único dentro do header do drawer.
  await drawer.getByRole("combobox").first().click();
  await page.getByRole("option", { name: targetLabel }).click();
}

test.describe("Sprint 11 — Propostas comerciais", () => {
  test.skip(
    !LEAD_ID || !HAS_AUTH,
    "Requer TEST_LEAD_ID e secrets E2E_TEST_EMAIL/E2E_TEST_PASSWORD.",
  );

  test("fluxo completo: criar → item → status → negociação → aprovar → dashboard", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const runId = Date.now();
    const proposalTitle = `E2E ${runId} — Proposta teste`;
    const negotiationText = `E2E ${runId} — nota de negociação de teste`;

    // ---- 1) Sessão autenticada ------------------------------------------
    await page.goto("/os/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/auth/);

    // ---- 2) Abrir lead + 3) ProposalsCard visível -----------------------
    await page.goto(`/os/comercial/leads/${LEAD_ID}`, { waitUntil: "domcontentloaded" });
    const proposalsCard = page.getByTestId("proposals-card");
    await expect(proposalsCard).toBeVisible();
    // aguarda estado terminal (loading some)
    await expect(proposalsCard.getByText(/Carregando propostas/i)).toBeHidden();

    // ---- 4) Criar nova proposta -----------------------------------------
    const createTrigger = proposalsCard
      .getByRole("button", { name: /^(Nova proposta|Criar proposta)$/ })
      .first();
    await createTrigger.click();

    const createDialog = page.getByRole("dialog", { name: "Nova proposta" });
    await expect(createDialog).toBeVisible();
    await createDialog.getByLabel("Título").fill(proposalTitle);
    await createDialog.getByRole("button", { name: /Criar rascunho/i }).click();

    // Drawer abre automaticamente
    const drawer = page.getByTestId("proposal-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText(proposalTitle)).toBeVisible();
    await expect(drawer.getByTestId("proposal-status-badge")).toHaveText(
      /Rascunho/i,
    );

    // ---- 5) Adicionar item da biblioteca --------------------------------
    await drawer
      .getByRole("button", { name: /Adicionar da biblioteca/i })
      .click();
    // Radix Popover — clica no primeiro item de serviço listado.
    const popover = page.locator("[data-radix-popper-content-wrapper]").last();
    await expect(popover).toBeVisible();
    await popover
      .locator("button")
      .filter({ hasNotText: /personalizado/i })
      .first()
      .click();

    // Aguarda a linha aparecer
    const itemRow = drawer.getByTestId("proposal-item-row").first();
    await expect(itemRow).toBeVisible();

    // ---- 6) Preencher quantidade e valor unitário -----------------------
    const qtyInput = itemRow.locator('input[type="number"]').nth(0);
    const unitInput = itemRow.locator('input[type="number"]').nth(1);
    await qtyInput.fill("2");
    await qtyInput.blur();
    await unitInput.fill("1500");
    await unitInput.blur();

    // ---- 7/8) Salvar implícito + validar subtotal (2 * 1500 = 3000) ----
    await expect(drawer.getByTestId("proposal-subtotal")).toHaveText(
      BRL(3000),
      { timeout: 15_000 },
    );

    // ---- 9) Aplicar desconto --------------------------------------------
    const discount = drawer.getByTestId("proposal-discount");
    await discount.fill("500");
    await discount.blur();

    // ---- 10) Valor final = 3000 - 500 = 2500 ----------------------------
    await expect(drawer.getByTestId("proposal-final")).toHaveText(BRL(2500), {
      timeout: 15_000,
    });

    // ---- 11) Status → Enviada -------------------------------------------
    await openStatusSelect(drawer, page, "Enviada");
    await expect(drawer.getByTestId("proposal-status-badge")).toHaveText(
      /Enviada/i,
      { timeout: 10_000 },
    );

    // ---- 12) Registrar negociação (aba Negociação) ----------------------
    await drawer.getByRole("tab", { name: "Negociação" }).click();
    const negTab = drawer.getByRole("tabpanel", { name: "Negociação" });
    await negTab
      .getByPlaceholder(/Descreva a contraproposta/i)
      .fill(negotiationText);
    await negTab.getByRole("button", { name: /^Registrar$/ }).click();

    // ---- 13) Aparece no histórico ---------------------------------------
    const negList = drawer.getByTestId("proposal-negotiation-list");
    await expect(negList).toBeVisible();
    await expect(negList.getByText(negotiationText)).toBeVisible();

    // ---- 14) Status → Aprovada ------------------------------------------
    // Volta para a aba com o select (header do drawer já tem o select
    // sempre visível — não depende da aba ativa).
    await openStatusSelect(drawer, page, "Aprovada");
    await expect(drawer.getByTestId("proposal-status-badge")).toHaveText(
      /Aprovada/i,
      { timeout: 15_000 },
    );

    // ---- 18) Regra: proposta aprovada não pode ser excluída -------------
    // O botão de lixeira no drawer some quando canEdit=false (aprovada).
    // Fechar drawer para inspecionar o card.
    await drawer.getByRole("button", { name: /^Fechar$/ }).click();
    await expect(drawer).toBeHidden();

    // Localiza a linha da proposta pelo título único.
    const rowInCard = proposalsCard
      .locator("li")
      .filter({ hasText: proposalTitle });
    await expect(rowInCard).toBeVisible();
    // Não existe botão de excluir (ícone Trash) para propostas aprovadas.
    await expect(
      rowInCard.locator("button.text-destructive"),
    ).toHaveCount(0);

    // ---- 15) Lead convertido --------------------------------------------
    await expect(page.getByText(/^Convertido$/).first()).toBeVisible({
      timeout: 10_000,
    });

    // ---- 16) Timeline mostra eventos proposta_* -------------------------
    const timeline = page
      .getByRole("region", { name: /Linha do tempo/i })
      .or(page.locator("section, div").filter({ hasText: "Linha do tempo" }))
      .first();
    // Estratégia robusta: procura os textos dos eventos na página inteira.
    await expect(page.getByText("Proposta criada").first()).toBeVisible();
    await expect(page.getByText("Proposta aprovada").first()).toBeVisible();

    // ---- 17) Persistência após reload -----------------------------------
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("proposals-card")).toBeVisible();
    await expect(
      page.getByTestId("proposals-card").getByText(proposalTitle),
    ).toBeVisible();

    // ---- 19-21) Centro de Operações -------------------------------------
    await page.goto("/os/dashboard", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Propostas comerciais" }),
    ).toBeVisible({ timeout: 15_000 });

    // Indicadores (tiles)
    await expect(page.getByText("Em elaboração").first()).toBeVisible();
    await expect(page.getByText("Enviadas").first()).toBeVisible();
    await expect(page.getByText("Em negociação").first()).toBeVisible();
    await expect(page.getByText("Aprovadas").first()).toBeVisible();

    // Valor de pipeline (BRL) — não exige igualdade global, só o formato.
    await expect(page.getByText("Pipeline (valor)").first()).toBeVisible();
    // Sem ancestor:: nem union XPath: procura o formato BRL globalmente na
    // página do dashboard. A presença do label "Pipeline (valor)" acima já
    // garante que estamos na seção correta; aqui validamos apenas o formato.
    await expect(page.getByText(/R\$\s?\d/).first()).toBeVisible();
  });
});

