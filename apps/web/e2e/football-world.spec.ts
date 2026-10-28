import { expect, test } from "@playwright/test";
import { E2E_SEED, skipTips, t } from "./helpers";

// 024: o mundo padrão (15 países em cinco confederações) é gerado dentro do jogo e também pode ser
// baixado na página de Mods.
test("mundo padrão gerado no jogo: países por confederação, carreira e download (024)", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await skipTips(page);

  await page.goto("/mods/");
  const link = page.getByRole("link", { name: t("mods.world.download") });
  await expect(link).toHaveAttribute("href", "/mods/mundo-padrao.zip");
  const response = await page.request.get("/mods/mundo-padrao.zip");
  expect(response.ok()).toBe(true);
  expect((await response.body()).length).toBeGreaterThan(10_000);

  await page.goto("/nova-carreira/");
  await page.getByLabel(t("newCareer.managerName")).fill("Ana Souza");
  await page.getByText(t("newCareer.advanced")).click();
  await page.getByLabel(t("newCareer.seed")).fill(E2E_SEED);
  await page.getByRole("checkbox", { name: t("newCareer.noFiring") }).check();
  // Países reais, agrupados por confederação.
  const country = page.getByLabel(t("newCareer.country.filter"));
  await expect(country.locator("optgroup")).toHaveCount(5);
  await expect(country.locator("option", { hasText: "Brasil" })).toHaveCount(1);
  const row = page.locator("table tbody tr").first();
  const club = (await row.getByRole("img").getAttribute("aria-label")) ?? "";
  await row.click();
  await page.getByRole("button", { name: t("newCareer.confirm") }).click();
  await expect(page.getByRole("heading", { name: club })).toBeVisible({ timeout: 120_000 });
});
