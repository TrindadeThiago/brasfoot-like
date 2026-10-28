import { expect, test } from "@playwright/test";
import { E2E_SEED, skipTips, t } from "./helpers";

// 024 (T054): o mundo é gerado dentro do jogo, em três tamanhos; o jogador escolhe na nova carreira e
// os mesmos mundos podem ser baixados na página de Mods.
test("mundo reduzido gerado no jogo: países por confederação, carreira e download dos três mundos (024)", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await skipTips(page);

  await page.goto("/mods/");
  for (const size of ["reduzido", "medio", "completo"] as const) {
    const link = page.getByRole("link", { name: t(`mods.world.download.${size}`) });
    await expect(link).toHaveAttribute("href", `/mods/mundo-${size}.zip`);
    const response = await page.request.get(`/mods/mundo-${size}.zip`);
    expect(response.ok()).toBe(true);
    expect((await response.body()).length).toBeGreaterThan(10_000);
  }

  await page.goto("/nova-carreira/");
  await page.getByLabel(t("newCareer.bank")).selectOption({ label: t("newCareer.world.reduzido") });
  await expect(page.getByText(t("newCareer.world.reduzido.help"))).toBeVisible();
  await page.getByLabel(t("newCareer.managerName")).fill("Ana Souza");
  await page.getByText(t("newCareer.advanced")).click();
  await page.getByLabel(t("newCareer.seed")).fill(E2E_SEED);
  await page.getByRole("checkbox", { name: t("newCareer.noFiring") }).check();
  // Países reais, agrupados por confederação.
  const country = page.getByLabel(t("newCareer.country.filter"));
  await expect(country.locator("optgroup")).toHaveCount(6);
  await expect(country.locator("option", { hasText: "Brasil" })).toHaveCount(1);
  const row = page.locator("table tbody tr").first();
  const club = (await row.getByRole("img").getAttribute("aria-label")) ?? "";
  await row.click();
  await page.getByRole("button", { name: t("newCareer.confirm") }).click();
  await expect(page.getByRole("heading", { name: club })).toBeVisible({ timeout: 120_000 });
});
