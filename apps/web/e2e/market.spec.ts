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
  const names = table.getByRole("button", { name: /^Detalhes de / });
  for (const index of [0, 1, 2]) {
    await names.nth(index).click();
    const modal = page.getByRole("dialog");
    await modal.getByRole("button", { name: t("market.modal.addCompare") }).click();
    await modal.getByRole("button", { name: t("common.close") }).click();
  }
  const tray = page.getByRole("region", { name: t("market.tray.label") });
  await tray.getByRole("button", { name: /Comparar selecionados/ }).click();
  const compare = page.getByRole("dialog", { name: t("market.compare.title") });
  await expect(compare).toBeVisible();
  await compare.getByRole("button", { name: t("common.close") }).click();

  // Compra: oferta alta o bastante para o clube aceitar, depois o contrato.
  const first = names.first();
  const name = ((await first.getAttribute("aria-label")) ?? "").replace(/^Detalhes de /, "");
  await first.click();
  await page
    .getByRole("dialog", { name })
    .getByRole("button", { name: t("market.action.offer") })
    .click();
  const dialog = page.getByRole("dialog", { name: t("market.dialog.buy", { name }) });
  await dialog.getByLabel(t("market.form.fee")).fill("3000000");
  await dialog.getByRole("button", { name: t("market.action.offer") }).click();
  await dialog.getByLabel(t("market.form.wage")).fill("900000");
  await dialog.getByRole("button", { name: t("market.action.propose") }).click();
  await expect(dialog.getByText(t("market.feedback.signed"))).toBeVisible();
  await dialog.getByRole("button", { name: t("common.close") }).click();
  await page
    .getByRole("dialog", { name })
    .getByRole("button", { name: t("common.close") })
    .click();

  // O reforço aparece no Elenco com contrato.
  await page.keyboard.press("2");
  await expect(page.getByRole("button", { name: t("lineup.detailsOf", { name }) })).toBeVisible();

  // Depois de quatro rodadas a janela fecha e a oferta é bloqueada.
  for (let round = 1; round <= 4; round++) await page.keyboard.press("d");
  await page.keyboard.press("m");
  await expect(page.getByText(/Janela fechada/)).toBeVisible();
  const closedFirst = page
    .getByRole("table", { name: t("market.resultsCaption") })
    .getByRole("button", { name: /^Detalhes de / })
    .first();
  const closedName = ((await closedFirst.getAttribute("aria-label")) ?? "").replace(
    /^Detalhes de /,
    "",
  );
  await closedFirst.click();
  await page
    .getByRole("dialog", { name: closedName })
    .getByRole("button", { name: t("market.action.offer") })
    .click();
  const closed = page.getByRole("dialog", { name: t("market.dialog.buy", { name: closedName }) });
  await closed.getByRole("button", { name: t("market.action.offer") }).click();
  await expect(closed.getByRole("alert")).toContainText(/janela/i);
  await closed.getByRole("button", { name: t("common.close") }).click();
  await page
    .getByRole("dialog", { name: closedName })
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
