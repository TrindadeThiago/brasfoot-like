import { generateWorldBank } from "@brasfoot-like/engine";
import { writeModPackage } from "@brasfoot-like/modkit";
import { expect, test } from "@playwright/test";
import { E2E_SEED, skipTips, t } from "./helpers";

// 021 (T055): vagas entre competições pela interface — zonas na tabela, supercopa no calendário e a
// origem dos participantes na página da competição.
const MOD_NAME = "Mundo com vagas (teste)";

/** Mundo de 2 países × 2 divisões de 8 clubes, com copa, supercopa e taça (gerado aqui). */
function worldMod(): Buffer {
  const bank = generateWorldBank({
    seed: "e2e-vagas",
    countries: 2,
    divisionsPerCountry: 2,
    clubsPerDivision: 8,
    cup: true,
    qualification: true,
    manifest: { id: "vagas-teste", name: MOD_NAME, author: "testes", version: "1.0.0" },
  });
  return Buffer.from(writeModPackage(bank));
}

test("vagas entre competições: zona na tabela, supercopa e origem dos participantes (021)", async ({
  page,
}) => {
  await skipTips(page);
  await page.goto("/mods/");
  await page.getByLabel(t("mods.load")).setInputFiles({
    name: "vagas.zip",
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
  const row = page.locator("table tbody tr").first();
  const club = (await row.getByRole("img").getAttribute("aria-label")) ?? "";
  await row.click();
  await page.getByRole("button", { name: t("newCareer.confirm") }).click();
  await expect(page.getByRole("heading", { name: club })).toBeVisible();

  // A tabela da liga do país marca as posições que dão vaga, com a legenda da competição.
  const menu = page.getByRole("navigation", { name: t("nav.menu") });
  await menu.getByRole("link", { name: t("nav.competition") }).click();
  const tabs = page.getByRole("navigation", { name: t("competition.select") });
  await tabs.getByRole("link").first().click();
  await expect(page.getByText(/^Vaga: /).first()).toBeVisible();
  await expect(page.getByText(/vaga em /).first()).toBeVisible();

  // A supercopa da primeira edição: a origem dos participantes é o banco inicial.
  const supercup = tabs.getByRole("link", { name: /Supercopa/ });
  if ((await supercup.count()) === 0) {
    await page.getByRole("tab", { name: t("competition.others") }).click();
  }
  await supercup.click();
  await expect(page.getByRole("region", { name: t("origin.title") })).toBeVisible();
  await expect(page.getByText(t("origin.bank")).first()).toBeVisible();
});
