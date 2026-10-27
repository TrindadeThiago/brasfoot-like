import { generateRegionalBank } from "@brasfoot-like/engine";
import { writeModPackage } from "@brasfoot-like/modkit";
import { expect, test } from "@playwright/test";
import { E2E_SEED, skipTips, t } from "./helpers";

// 023 (T046): estadual pela interface — a aba do estadual ao lado das nacionais, as duas divisões e a
// fase de grupos, antes da liga.
const MOD_NAME = "Estaduais (teste)";

/** País com liga de duas divisões e 3 estaduais de duas divisões (gerado aqui). */
function regionalMod(): Buffer {
  const bank = generateRegionalBank({
    seed: "e2e-estadual",
    states: 3,
    manifest: { id: "estaduais-teste", name: MOD_NAME, author: "testes", version: "1.0.0" },
  });
  return Buffer.from(writeModPackage(bank));
}

test("estadual: aba, duas divisões e fase de grupos (023)", async ({ page }) => {
  test.setTimeout(180_000);
  await skipTips(page);
  await page.goto("/mods/");
  await page.getByLabel(t("mods.load")).setInputFiles({
    name: "estaduais.zip",
    mimeType: "application/zip",
    buffer: regionalMod(),
  });
  await expect(page.getByText(t("mods.loaded", { name: MOD_NAME }))).toBeVisible();

  await page.goto("/nova-carreira/");
  await page.getByLabel(t("newCareer.bank")).selectOption({ label: MOD_NAME });
  await page.getByLabel(t("newCareer.managerName")).fill("Ana Souza");
  await page.getByText(t("newCareer.advanced")).click();
  await page.getByLabel(t("newCareer.seed")).fill(E2E_SEED);
  await page.getByRole("checkbox", { name: t("newCareer.noFiring") }).check();
  const row = page.locator("table tbody tr").first();
  const club = (await row.getByRole("img").getAttribute("aria-label")) ?? "";
  await row.click();
  await page.getByRole("button", { name: t("newCareer.confirm") }).click();
  await expect(page.getByRole("heading", { name: club })).toBeVisible();

  // Só o estadual da região do clube aparece ao lado da liga nacional.
  const menu = page.getByRole("navigation", { name: t("nav.menu") });
  await menu.getByRole("link", { name: t("nav.competition") }).click();
  const tabs = page.getByRole("navigation", { name: t("competition.select") });
  await expect(tabs.getByRole("link")).toHaveCount(2);
  await tabs.getByRole("link", { name: /^Campeonato de / }).click();

  // As duas divisões do estadual e os grupos da fase inicial.
  const divisions = page.getByRole("navigation", { name: t("division.tabs.label") });
  await expect(divisions.getByRole("link")).toHaveCount(2);
  const groups = page.getByRole("region", { name: t("stages.groups") });
  await expect(groups.getByRole("table").first()).toBeVisible();
});
