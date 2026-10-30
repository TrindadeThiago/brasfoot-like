import { expect, test } from "@playwright/test";
import { createCareer, simulate, t } from "./helpers";

test("torcida: cartão na Início, clássicos no calendário e rivais na Carreira (013)", async ({
  page,
}) => {
  await createCareer(page, "Ana Souza", 3);
  const card = page.getByRole("region", { name: t("fans.title") });
  await expect(card).toBeVisible();
  await simulate(page, 2);
  await expect(card.getByText(t("fans.noReasons"))).toHaveCount(0);

  // O menu, e não a página: a Início também tem links e pode mostrar um clássico (próximo jogo).
  const menu = page.getByRole("navigation", { name: t("nav.menu") });
  await menu.getByRole("link", { name: t("nav.calendar") }).click();
  await expect(page).toHaveURL(/\/jogo\/calendario\//);
  // O calendário é mensal (027): procura o clássico mês a mês.
  const months = page.getByRole("navigation", { name: t("calendar.months") }).getByRole("button");
  const total = await months.count();
  let found = false;
  for (let index = 0; index < total && !found; index++) {
    await months.nth(index).click();
    // O clássico está no texto do dia (leitor de tela) e no painel do dia (027).
    found = (await page.locator(".visually-hidden", { hasText: "(Clássico)" }).count()) > 0;
  }
  expect(found).toBe(true);

  await menu.getByRole("link", { name: t("nav.career") }).click();
  await expect(page).toHaveURL(/\/jogo\/carreira\//);
  await page.getByRole("tab", { name: t("career.tab.fans") }).click();
  await expect(page.getByRole("table", { name: t("fans.rivals.title") })).toBeVisible();
  // A faixa e a tendência vêm em texto (029).
  const fans = page.getByRole("region", { name: t("fans.title") });
  await expect(fans.getByRole("meter")).toHaveAttribute(
    "aria-valuetext",
    /Revoltada|Insatisfeita|Neutra|Animada|Eufórica/,
  );
  await expect(fans.getByText(/Em alta|Em queda|Estável/)).toBeVisible();
});
