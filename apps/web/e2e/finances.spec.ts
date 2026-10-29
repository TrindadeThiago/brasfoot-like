import { expect, test } from "@playwright/test";
import { createCareer, simulateSeason, t } from "./helpers";

test("finanças: preço com estimativa, rodada em casa, crédito, obra e histórico na temporada seguinte", async ({
  page,
}) => {
  test.setTimeout(240_000);
  // Sem demissão: uma demissão na virada esconderia Finanças.
  await createCareer(page, "Ana Souza", 0, "Série A", { noFiring: true });
  await page.keyboard.press("6");
  await expect(page).toHaveURL(/financas/);

  await page.getByRole("tab", { name: t("finance.tab.gate") }).click();
  const ticket = page.getByRole("region", { name: t("finance.ticket.title") });
  const price = ticket.getByRole("spinbutton");
  await price.fill("20");
  await expect(ticket.getByText(/público estimado de/)).toBeVisible();
  await ticket.getByRole("button", { name: t("finance.ticket.apply") }).click();
  await expect(ticket.getByText(t("finance.ticket.applied"))).toBeVisible();

  await page.getByRole("tab", { name: t("finance.tab.credit") }).click();
  const credit = page.getByRole("region", { name: t("finance.credit.title") });
  await credit.getByRole("textbox").fill("500000");
  await credit.getByRole("button", { name: t("finance.credit.take") }).click();
  await expect(page.locator("dl").filter({ hasText: t("finance.debt") })).toContainText(
    /\$\s500\.000/,
  );
  await credit.getByRole("button", { name: t("finance.credit.settle") }).click();
  await expect(page.locator("dl").filter({ hasText: t("finance.debt") })).toContainText(
    /\$\s0(?![\d.])/,
  );

  await page.getByRole("tab", { name: t("finance.tab.stadium") }).click();
  const stadium = page.getByRole("region", { name: t("finance.stadium.title") });
  await stadium
    .getByRole("button", { name: /Contratar obra/ })
    .first()
    .click();
  await expect(stadium.getByText(/Obra em andamento/)).toBeVisible();

  await simulateSeason(page);
  await expect(page).toHaveURL(/fim-de-temporada/);
  await expect(page.getByText(/Premiação recebida/)).toBeVisible();
  await page.getByRole("button", { name: t("seasonEnd.next") }).click();
  await expect(page.getByText(/temporada 2028 · rodada 1 de 38/)).toBeVisible();

  await page.keyboard.press("6");
  await page.getByRole("tab", { name: t("finance.tab.history") }).click();
  const history = page.getByRole("table", { name: t("finance.history.title") });
  await expect(history.locator("tbody tr")).toHaveCount(1);
});
