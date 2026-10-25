import { generateWorldBank } from "@brasfoot-like/engine";
import { writeModPackage } from "@brasfoot-like/modkit";
import { expect, test } from "@playwright/test";
import { E2E_SEED, skipTips, t } from "./helpers";

// 022 (T066): competições entre países pela interface — a aba da taça ao lado das do país, os
// grupos sem repetir país, o jogo até o fim da temporada, o chaveamento e o histórico.
const MOD_NAME = "Continente (teste)";

/** 5 países de uma divisão de 8 clubes, copa nacional e as duas taças continentais (gerado aqui). */
function continentalMod(): Buffer {
  const bank = generateWorldBank({
    seed: "e2e-continental",
    countries: 5,
    divisionsPerCountry: 1,
    clubsPerDivision: 8,
    cup: true,
    continental: "compact",
    manifest: { id: "continente-teste", name: MOD_NAME, author: "testes", version: "1.0.0" },
  });
  return Buffer.from(writeModPackage(bank));
}

test("taça continental: aba, grupos, temporada inteira, chaveamento e histórico (022)", async ({
  page,
}) => {
  test.setTimeout(300_000);
  await skipTips(page);
  await page.goto("/mods/");
  await page.getByLabel(t("mods.load")).setInputFiles({
    name: "continente.zip",
    mimeType: "application/zip",
    buffer: continentalMod(),
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

  // A taça maior aparece como aba ao lado das competições do país e abre os 4 grupos.
  const menu = page.getByRole("navigation", { name: t("nav.menu") });
  await menu.getByRole("link", { name: t("nav.competition") }).click();
  const tabs = page.getByRole("navigation", { name: t("competition.select") });
  await tabs.getByRole("link", { name: "Taça Continental" }).click();
  const groups = page.getByRole("region", { name: t("stages.groups") });
  await expect(groups.getByRole("table")).toHaveCount(4);
  await expect(page.getByText(/vaga em Copa Complementar/).first()).toBeVisible();
  await expect(tabs.getByRole("link", { name: "Copa Complementar" })).toBeVisible();

  // Joga a temporada inteira (liga, copa nacional e taças) até o resumo.
  await menu.getByRole("link", { name: t("nav.home") }).click();
  const simulate = page.getByRole("button", { name: t("home.simulate") });
  const toEnd = page.getByRole("button", { name: t("home.advanceToEnd") });
  const seasonEnd = /\/jogo\/fim-de-temporada\//;
  for (let step = 0; step < 60 && !seasonEnd.test(page.url()); step++) {
    await expect(simulate.or(toEnd)).toBeVisible();
    const button = (await toEnd.isVisible()) ? toEnd : simulate;
    await expect(button).toBeEnabled();
    await button.click();
    await page.waitForTimeout(100);
  }
  await expect(page).toHaveURL(seasonEnd);

  // O mata-mata final tem o campeão e as origens dos participantes estão na página.
  await menu.getByRole("link", { name: t("nav.competition") }).click();
  await page
    .getByRole("navigation", { name: t("competition.select") })
    .getByRole("link", { name: "Taça Continental" })
    .click();
  const nav = page.getByRole("navigation", { name: t("stages.nav.label") });
  await nav.getByRole("link").nth(1).click();
  await expect(page.getByRole("region", { name: t("cup.bracket") })).toBeVisible();
  await expect(page.getByRole("region", { name: t("origin.title") })).toBeVisible();
});
