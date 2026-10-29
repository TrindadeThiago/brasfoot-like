import { expect, type Page, test } from "@playwright/test";
import { E2E_SEED, skipTips, t } from "./helpers";

// 027 SC-001: com o mundo padrão, chega-se à classificação, ao chaveamento e à campanha de uma
// competição continental e de um estadual em no máximo dois cliques a partir da tela de Competição.

async function newDefaultCareer(page: Page): Promise<void> {
  await skipTips(page);
  await page.goto("/nova-carreira/");
  await page.getByLabel(t("newCareer.managerName")).fill("Ana Souza");
  await page.getByText(t("newCareer.advanced")).click();
  await page.getByLabel(t("newCareer.seed")).fill(E2E_SEED);
  await page.getByRole("checkbox", { name: t("newCareer.noFiring") }).check();
  await page.locator("table tbody tr").first().click();
  await page.getByRole("button", { name: t("newCareer.confirm") }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page
    .getByRole("navigation", { name: t("nav.menu") })
    .getByRole("link", { name: t("nav.competition") })
    .click();
}

/** Vai à competição cujo cartão tem o texto dado, com no máximo dois cliques (aba e cartão). */
async function openCard(page: Page, text: RegExp): Promise<number> {
  let clicks = 0;
  // Espera a lista aparecer antes de decidir em qual aba o cartão está.
  await expect(page.getByRole("tab", { name: t("competition.mine") })).toBeVisible();
  let card = page.locator("li", { hasText: text }).getByRole("link").first();
  if ((await card.count()) === 0) {
    await page.getByRole("tab", { name: t("competition.others") }).click();
    clicks += 1;
    card = page.locator("li", { hasText: text }).getByRole("link").first();
  }
  await card.click();
  clicks += 1;
  return clicks;
}

test("a competição continental e o estadual ficam a até dois cliques da tela de Competição (027)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await newDefaultCareer(page);

  const continental = await openCard(page, /Entre países/);
  expect(continental).toBeLessThanOrEqual(2);
  await expect(page).toHaveURL(/comp=/);
  await expect(
    page
      .getByRole("table")
      .or(page.getByRole("region", { name: t("cup.bracket") }))
      .first(),
  ).toBeVisible();

  await page
    .getByRole("navigation", { name: t("nav.menu") })
    .getByRole("link", { name: t("nav.competition") })
    .click();
  const regional = await openCard(page, /Campeonato Estadual de /);
  expect(regional).toBeLessThanOrEqual(2);
  await expect(page).toHaveURL(/comp=/);
  await expect(page.getByRole("navigation", { name: t("division.tabs.label") })).toBeVisible();
});
