import { expect, test } from "@playwright/test";
import { createCareer, t } from "./helpers";

test("mercado: busca, comparação, compra com contrato, elenco, janela fechada e resumo da janela", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await createCareer(page, "Ana Souza", 0);
  await page.keyboard.press("m");
  await expect(page).toHaveURL(/mercado/);
  await expect(page.getByRole("heading", { name: t("market.title") })).toBeVisible();
  await expect(page.getByText(/Janela aberta/)).toBeVisible();

  // Busca: meio-campistas fracos (ofertas baratas) e comparação de três.
  await page.getByLabel(t("market.filter.position")).selectOption("MF");
  await page.getByLabel(t("market.filter.strengthMax")).fill("48");
  const table = page.getByRole("table", { name: t("market.resultsCaption") });
  await expect(table.locator("tbody tr").first()).toBeVisible();
  const boxes = table.getByRole("checkbox");
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  await boxes.nth(2).check();
  await page.getByRole("button", { name: /Comparar selecionados/ }).click();
  await expect(page.getByRole("region", { name: t("market.compare.title") })).toBeVisible();
  await page
    .getByRole("region", { name: t("market.compare.title") })
    .getByRole("button")
    .click();

  // Compra: oferta alta o bastante para o clube aceitar, depois o contrato.
  const row = table.locator("tbody tr").first();
  const name = (await row.getByRole("cell").nth(1).textContent()) ?? "";
  await row.getByRole("button", { name: t("market.action.offer") }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(t("market.form.fee")).fill("3000000");
  await dialog.getByRole("button", { name: t("market.action.offer") }).click();
  await dialog.getByLabel(t("market.form.wage")).fill("900000");
  await dialog.getByRole("button", { name: t("market.action.propose") }).click();
  await expect(dialog.getByText(t("market.feedback.signed"))).toBeVisible();
  await dialog.getByRole("button", { name: t("common.close") }).click();

  // O reforço aparece no Elenco com contrato.
  await page.keyboard.press("2");
  await expect(page.getByRole("button", { name: t("lineup.detailsOf", { name }) })).toBeVisible();

  // Depois de quatro rodadas a janela fecha e a oferta é bloqueada.
  for (let round = 1; round <= 4; round++) await page.keyboard.press("d");
  await page.keyboard.press("m");
  await expect(page.getByText(/Janela fechada/)).toBeVisible();
  const closedRow = page
    .getByRole("table", { name: t("market.resultsCaption") })
    .locator("tbody tr")
    .first();
  await closedRow.getByRole("button", { name: t("market.action.offer") }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: t("market.action.offer") })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(/janela/i);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: t("common.close") })
    .click();

  // A janela fechada gera o resumo das transferências da IA (011).
  await page.getByRole("tab", { name: t("market.tab.report") }).click();
  await expect(page.getByRole("heading", { name: /Janela do início da temporada/ })).toBeVisible();
  await expect(
    page
      .getByRole("table", { name: t("market.report.highlights") })
      .locator("tbody tr")
      .first(),
  ).toBeVisible();
});
