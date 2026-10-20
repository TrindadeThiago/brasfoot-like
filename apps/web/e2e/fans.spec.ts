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

  await page.getByRole("link", { name: t("nav.calendar") }).click();
  await expect(page.getByRole("img", { name: /^Clássico/ }).first()).toBeVisible();

  await page.getByRole("link", { name: t("nav.career") }).click();
  await page.getByRole("tab", { name: t("career.tab.fans") }).click();
  await expect(page.getByRole("table", { name: t("fans.rivals.title") })).toBeVisible();
});
