import { expect, test } from "@playwright/test";
import { createCareer, simulate, skipTips, t } from "./helpers";

test("criar carreira, recarregar e continuar na mesma rodada (SC-002)", async ({ page }) => {
  const club = await createCareer(page, "Ana Souza", 2);
  await simulate(page, 3);
  await expect(
    page.getByText(t("header.progress", { year: 2027, round: 4, total: 38, division: "Série A" })),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText(t("header.progress", { year: 2027, round: 4, total: 38, division: "Série A" })),
  ).toBeVisible();
  await skipTips(page);
  await page.goto("/");
  await page.getByRole("link", { name: new RegExp(t("opening.continue")) }).click();
  await expect(page.getByRole("heading", { name: club })).toBeVisible();
  await expect(
    page.getByText(t("header.progress", { year: 2027, round: 4, total: 38, division: "Série A" })),
  ).toBeVisible();
});

test("duas carreiras coexistem e apagar uma mantém a outra (SC-003)", async ({ page }) => {
  const first = await createCareer(page, "Ana Souza", 0);
  const second = await createCareer(page, "Bia Lima", 5);
  await page.goto("/carreiras/");
  const items = page.getByRole("listitem");
  await expect(items).toHaveCount(2);
  await items
    .filter({ hasText: second })
    .getByRole("button", { name: t("saves.delete") })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: t("saves.delete") })
    .click();
  await expect(items).toHaveCount(1);
  await items
    .filter({ hasText: first })
    .getByRole("link", { name: t("saves.continue") })
    .click();
  await expect(page.getByRole("heading", { name: first })).toBeVisible();
});
