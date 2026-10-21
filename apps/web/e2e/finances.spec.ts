import { expect, test } from "@playwright/test";
import { createCareer, t } from "./helpers";

test("finanças: preço com estimativa, rodada em casa, crédito, obra e histórico na temporada seguinte", async ({
  page,
}) => {
  test.setTimeout(240_000);
  // Sem demissão: a seed da carreira é aleatória e uma demissão na virada esconderia Finanças.
  await createCareer(page, "Ana Souza", 0, "Série A", { noFiring: true });
  await page.keyboard.press("6");
  await expect(page).toHaveURL(/financas/);

  const ticket = page.getByRole("region", { name: t("finance.ticket.title") });
  const price = ticket.getByRole("spinbutton");
  await price.fill("20");
  await expect(ticket.getByText(/público estimado de/)).toBeVisible();
  await ticket.getByRole("button", { name: t("finance.ticket.apply") }).click();
  await expect(ticket.getByText(t("finance.ticket.applied"))).toBeVisible();

  const credit = page.getByRole("region", { name: t("finance.credit.title") });
  await credit.getByRole("spinbutton").fill("500000");
  await credit.getByRole("button", { name: t("finance.credit.take") }).click();
  await expect(page.getByText(/Dívida: \$\s500\.000/)).toBeVisible();
  await credit.getByRole("button", { name: t("finance.credit.settle") }).click();
  await expect(page.getByText(/Dívida: \$\s0/)).toBeVisible();

  const stadium = page.getByRole("region", { name: t("finance.stadium.title") });
  await stadium
    .getByRole("button", { name: /Contratar obra/ })
    .first()
    .click();
  await expect(stadium.getByText(/Obra em andamento/)).toBeVisible();

  for (let round = 1; round <= 38; round++) await page.keyboard.press("d");
  await expect(page).toHaveURL(/fim-de-temporada/);
  await expect(page.getByText(/Premiação recebida/)).toBeVisible();
  await page.getByRole("button", { name: t("seasonEnd.next") }).click();
  await expect(page.getByText(/temporada 2028 · rodada 1 de 38/)).toBeVisible();

  await page.keyboard.press("6");
  const history = page.getByRole("table", { name: t("finance.history.title") });
  await expect(history.locator("tbody tr")).toHaveCount(1);
});
