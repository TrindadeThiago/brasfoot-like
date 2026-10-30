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

// 029 US5: manchetes em cartões, seções por clube e competição, painel de filtros e setas de rodada.
test("Notícias: setas de rodada, Do meu clube e uma competição, com as contagens (029)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await createCareer(page, "Ana Souza", 2);
  await simulate(page, 3);
  await page
    .getByRole("navigation", { name: t("nav.menu") })
    .getByRole("link", { name: t("nav.news") })
    .click();
  await expect(page.getByRole("heading", { name: t("news.page") })).toBeVisible();

  const articles = page.getByRole("article");
  await expect(articles.first()).toBeVisible();
  await expect(page.getByRole("region", { name: new RegExp(t("news.group.mine")) })).toBeVisible();

  const select = page.getByRole("combobox", { name: t("news.select") });
  const latest = await select.inputValue();
  const previous = page.getByRole("button", { name: t("news.prev") });
  await expect(page.getByRole("button", { name: t("news.next") })).toBeDisabled();
  await previous.click();
  expect(await select.inputValue()).not.toBe(latest);
  await page.getByRole("button", { name: t("news.next") }).click();
  expect(await select.inputValue()).toBe(latest);

  const total = await articles.count();
  await page.getByRole("button", { name: t("news.filter.mine") }).click();
  const mine = await articles.count();
  expect(mine).toBeGreaterThan(0);
  expect(mine).toBeLessThanOrEqual(total);
  await page.getByRole("button", { name: t("news.filter.all") }).click();
  expect(await articles.count()).toBe(total);

  const competition = page
    .getByRole("list")
    .filter({ has: page.getByRole("button", { name: /\(\d+\)$/ }) })
    .getByRole("button")
    .first();
  await competition.click();
  await expect(competition).toHaveAttribute("aria-pressed", "true");
});
