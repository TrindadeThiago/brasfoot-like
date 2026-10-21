import { expect, test } from "@playwright/test";
import { createCareer, skipTips, t } from "./helpers";

test("tema claro e velocidade rápida persistem e valem na rodada ao vivo (016 US2)", async ({
  page,
}) => {
  await skipTips(page);
  await page.goto("/");
  await page.getByRole("link", { name: t("nav.settings") }).click();
  await expect(page.getByRole("heading", { name: t("settings.title") })).toBeVisible();
  await page.getByLabel(t("settings.theme")).selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByLabel(t("settings.speed")).selectOption("fast");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByLabel(t("settings.speed"))).toHaveValue("fast");

  await createCareer(page, "Ana Souza", 2);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: t("home.playLive") }).click();
  await expect(page.getByLabel(t("round.speed"))).toHaveValue("fast");
});
