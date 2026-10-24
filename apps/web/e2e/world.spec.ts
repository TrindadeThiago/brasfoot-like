import { generateWorldBank } from "@brasfoot-like/engine";
import { writeModPackage } from "@brasfoot-like/modkit";
import { expect, test } from "@playwright/test";
import { E2E_SEED, skipTips, t } from "./helpers";

// 020 (T072): um mundo de três países pela interface — escolha de clube por país, jogar o primeiro
// dia, consultar a liga de outro país e filtrar o mercado por país.
const MOD_NAME = "Mundo (teste)";

/** Mundo de 3 países × 2 divisões de 10 clubes, gerado aqui (sem arquivo binário no repositório). */
function worldMod(): Buffer {
  const bank = generateWorldBank({
    seed: "e2e-mundo",
    countries: 3,
    divisionsPerCountry: 2,
    clubsPerDivision: 10,
    manifest: { id: "mundo-teste", name: MOD_NAME, author: "testes", version: "1.0.0" },
  });
  return Buffer.from(writeModPackage(bank));
}

test("mundo de vários países: nova carreira em outro país, ligas alheias e mercado (020)", async ({
  page,
}) => {
  await skipTips(page);
  await page.goto("/mods/");
  await page.getByLabel(t("mods.load")).setInputFiles({
    name: "mundo.zip",
    mimeType: "application/zip",
    buffer: worldMod(),
  });
  await expect(page.getByText(t("mods.loaded", { name: MOD_NAME }))).toBeVisible();

  await page.goto("/nova-carreira/");
  await page.getByLabel(t("newCareer.bank")).selectOption({ label: MOD_NAME });
  await page.getByLabel(t("newCareer.managerName")).fill("Ana Souza");
  await page.getByText(t("newCareer.advanced")).click();
  await page.getByLabel(t("newCareer.seed")).fill(E2E_SEED);
  await page.getByRole("checkbox", { name: t("newCareer.noFiring") }).check();

  // O filtro de país: três países mais "todos"; escolhe o terceiro.
  const country = page.getByLabel(t("newCareer.country.filter"));
  await expect(country.locator("option")).toHaveCount(4);
  const third = await country.locator("option").nth(2).textContent();
  await country.selectOption({ label: third ?? "" });
  await expect(page.getByRole("status").filter({ hasText: /10 clubes/ })).toBeVisible();
  const row = page.locator("table tbody tr").first();
  const club = (await row.getByRole("img").getAttribute("aria-label")) ?? "";
  await row.click();
  await page.getByRole("button", { name: t("newCareer.confirm") }).click();
  await expect(page.getByRole("heading", { name: club })).toBeVisible();

  // Joga o primeiro dia.
  await page.getByRole("button", { name: t("home.simulate") }).click();
  await page.waitForTimeout(300);

  // A competição: o seletor de país mostra a liga do técnico e permite ver a de outro país.
  const menu = page.getByRole("navigation", { name: t("nav.menu") });
  await menu.getByRole("link", { name: t("nav.competition") }).click();
  const select = page.getByLabel(t("competition.country"));
  await expect(select.locator("option")).toHaveCount(3);
  const first = await select.locator("option").first().textContent();
  await select.selectOption({ label: first ?? "" });
  await expect(page.getByRole("table").first()).toBeVisible();

  // O mercado filtra por país.
  await menu.getByRole("link", { name: t("nav.market") }).click();
  await expect(page.getByLabel(t("market.filter.country"))).toBeVisible();
});
