import { expect, test } from "@playwright/test";
import { t } from "./helpers";

const NAME = t("app.name");

test("primeiro acesso: boas-vindas, dicas uma vez cada, sem repetir ao recarregar (016 US1)", async ({
  page,
}) => {
  await page.goto("/");
  const welcome = page.getByRole("complementary", {
    name: t("tips.welcome.title", { name: NAME }),
  });
  await expect(welcome).toBeVisible();
  await welcome.getByRole("button", { name: t("tips.start") }).click();
  await expect(page.getByRole("link", { name: t("opening.newCareer") })).toBeFocused();
  await page.keyboard.press("Enter");

  await page.getByLabel(t("newCareer.managerName")).fill("Ana Souza");
  const table = page.getByRole("table", {
    name: t("newCareer.clubsCaption", { division: "Série A" }),
  });
  await table.locator("tbody tr").nth(3).click();
  await page.getByRole("button", { name: t("newCareer.confirm") }).click();

  const home = page.getByRole("complementary", { name: t("tips.home.title") });
  await expect(home).toBeVisible();
  await home.getByRole("button", { name: t("tips.ok") }).click();
  await page.getByRole("link", { name: t("nav.lineup") }).click();
  const lineup = page.getByRole("complementary", { name: t("tips.lineup.title") });
  await expect(lineup).toBeVisible();
  await lineup.getByRole("button", { name: t("tips.ok") }).click();

  await page.reload();
  await expect(page.getByRole("complementary")).toHaveCount(0);
  await page.getByRole("link", { name: t("nav.home") }).click();
  await expect(page.getByRole("complementary")).toHaveCount(0);
});

test("quem já tem carreira não recebe a boas-vindas", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem(
      "brasfoot-like:preferences",
      JSON.stringify({ tips: { dismissed: [], skipAll: true } }),
    ),
  );
  await page.reload();
  await expect(page.getByRole("heading", { name: NAME })).toBeVisible();
  await expect(page.getByRole("complementary")).toHaveCount(0);
});
