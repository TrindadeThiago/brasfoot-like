import { expect, test } from "@playwright/test";
import { createCareer, simulateSeason, t } from "./helpers";

// 027 US4 / FR-024: o Histórico explica o vazio antes da primeira temporada encerrada e, depois
// dela, lista a temporada, abre a classificação final e percorre as abas.
test("Histórico: vazio explicativo, temporada encerrada e classificação final (027)", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await createCareer(page, "Ana Souza", 1);
  const menu = page.getByRole("navigation", { name: t("nav.menu") });

  await menu.getByRole("link", { name: t("nav.history") }).click();
  await expect(page.getByText(t("history.empty"))).toBeVisible();
  for (const tab of ["titles", "scorers", "records", "clubs"]) {
    await page.getByRole("tab", { name: t(`history.tab.${tab}`) }).click();
    await expect(page.getByText(t(`history.empty.${tab}`))).toBeVisible();
  }
  await expect(page.getByRole("link", { name: t("history.managerLink") })).toBeVisible();

  await menu.getByRole("link", { name: t("nav.home") }).click();
  await simulateSeason(page);
  await expect(page).toHaveURL(/fim-de-temporada/);
  await page.getByRole("link", { name: t("nav.home"), exact: true }).click();
  await page.getByRole("button", { name: t("home.nextSeason") }).click();
  await menu.getByRole("link", { name: t("nav.history") }).click();

  const table = page.getByRole("table", { name: t("history.caption") });
  await expect(table).toBeVisible();
  await table.getByRole("link").first().click();
  await expect(page).toHaveURL(/[?&]t=1/);
  await expect(page.getByRole("table").first()).toBeVisible();
  await page.getByRole("link", { name: t("history.back") }).click();
  await page.getByRole("tab", { name: t("history.tab.titles") }).click();
  await expect(page.getByRole("tabpanel")).toBeVisible();
});
