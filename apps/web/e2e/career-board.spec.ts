import { expect, test } from "@playwright/test";
import { createCareer, simulate, t } from "./helpers";

test("diretoria: sem demissão na criação, metas, confiança e Carreira (012)", async ({ page }) => {
  await createCareer(page, "Ana Souza", 4, "Série A", { noFiring: true });

  const card = page.getByRole("region", { name: t("board.title") });
  await expect(card.getByText(t("board.goals"))).toBeVisible();
  await expect(card.getByText(t("board.noFiring"))).toBeVisible();
  await simulate(page, 3);
  await expect(card.getByText(t("board.noReasons"))).toHaveCount(0);

  await card.getByRole("link", { name: t("nav.career") }).click();
  await expect(page.getByRole("heading", { name: t("career.title") })).toBeVisible();
  await page.getByRole("tab", { name: t("career.tab.coaches") }).click();
  await expect(page.getByText(t("career.coaches.you", { name: "Ana Souza" }))).toBeVisible();
  await page.getByRole("tab", { name: t("career.tab.history") }).click();
  await expect(page.getByRole("table", { name: t("career.history.stints") })).toBeVisible();
});
