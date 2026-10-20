import { expect, test } from "@playwright/test";
import { createCareer, simulate, t } from "./helpers";

test("manchetes: cartão na Início, página Notícias e abas do Histórico (014)", async ({ page }) => {
  await createCareer(page, "Ana Souza", 2);
  await simulate(page, 2);
  const card = page.getByRole("region", { name: new RegExp(t("news.title")) });
  await expect(card.getByRole("listitem").first()).toBeVisible();

  await card.getByRole("link", { name: t("news.seeAll") }).click();
  await expect(page.getByRole("heading", { name: t("news.page") })).toBeVisible();
  await expect(page.getByRole("combobox", { name: t("news.select") })).toBeVisible();

  await page.getByRole("link", { name: t("nav.history") }).click();
  for (const tab of ["titles", "scorers", "records", "clubs"]) {
    await page.getByRole("tab", { name: t(`history.tab.${tab}`) }).click();
  }
  await expect(page.getByRole("link", { name: t("history.managerLink") })).toBeVisible();
});
