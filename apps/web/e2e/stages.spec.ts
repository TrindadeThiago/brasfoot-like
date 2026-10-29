import { generateStagesBank } from "@brasfoot-like/engine";
import { writeModPackage } from "@brasfoot-like/modkit";
import { expect, test } from "@playwright/test";
import { E2E_SEED, skipTips, t } from "./helpers";

// 019 (T081): a quarta divisão em fases pela interface — grupos, classificação geral, mata-mata
// com a origem das vagas e a posição final no resumo da temporada.
const MOD_NAME = "Fases (teste)";
const DIVISION = "Série B";

/** O mod de exemplo das fases, gerado aqui (sem arquivo binário no repositório). */
function stagesMod(): Buffer {
  const bank = generateStagesBank({
    seed: "e2e-fases",
    topClubs: 8,
    manifest: { id: "fases-teste", name: MOD_NAME, author: "testes", version: "1.0.0" },
  });
  return Buffer.from(writeModPackage(bank));
}

test("divisão em grupos e mata-mata: tabelas, chaveamento e posição final (019)", async ({
  page,
}) => {
  await skipTips(page);
  await page.goto("/mods/");
  await page.getByLabel(t("mods.load")).setInputFiles({
    name: "fases.zip",
    mimeType: "application/zip",
    buffer: stagesMod(),
  });
  await expect(page.getByText(t("mods.loaded", { name: MOD_NAME }))).toBeVisible();

  await page.goto("/nova-carreira/");
  await page.getByLabel(t("newCareer.bank")).selectOption({ label: MOD_NAME });
  await page.getByLabel(t("newCareer.managerName")).fill("Ana Souza");
  await page.getByText(t("newCareer.advanced")).click();
  await page.getByLabel(t("newCareer.seed")).fill(E2E_SEED);
  await page.getByRole("checkbox", { name: t("newCareer.noFiring") }).check();
  await page.getByLabel(t("newCareer.division.filter")).selectOption({ label: DIVISION });
  const table = page.getByRole("table", {
    name: t("newCareer.clubsCaption", { division: DIVISION }),
  });
  const row = table.locator("tbody tr").first();
  const club = (await row.getByRole("img").getAttribute("aria-label")) ?? "";
  await row.click();
  await page.getByRole("button", { name: t("newCareer.confirm") }).click();
  await expect(page.getByRole("heading", { name: club })).toBeVisible();

  // Os grupos: uma tabela por grupo, a classificação geral e a navegação por fase.
  const menu = page.getByRole("navigation", { name: t("nav.menu") });
  await menu.getByRole("link", { name: t("nav.competition") }).click();
  const groups = page.getByRole("region", { name: t("stages.groups") });
  await expect(groups.getByRole("table")).toHaveCount(4);
  await expect(page.getByRole("table", { name: t("stages.overall.caption") })).toBeVisible();
  const nav = page.getByRole("navigation", { name: t("stages.nav.label") });
  await expect(nav.getByRole("link")).toHaveCount(2);

  // Joga a temporada: dia a dia até o clube terminar, depois "avançar até o fim".
  await menu.getByRole("link", { name: t("nav.home") }).click();
  const simulate = page.getByRole("button", { name: t("home.simulate") });
  const toEnd = page.getByRole("button", { name: t("home.advanceToEnd") });
  const seasonEnd = /\/jogo\/fim-de-temporada\//;
  for (let step = 0; step < 40 && !seasonEnd.test(page.url()); step++) {
    await expect(simulate.or(toEnd)).toBeVisible();
    const button = (await toEnd.isVisible()) ? toEnd : simulate;
    await expect(button).toBeEnabled();
    await button.click();
    await page.waitForTimeout(100);
  }
  // Ao acabar a temporada o jogo leva ao resumo.
  await expect(page).toHaveURL(seasonEnd);
  await expect(page.getByRole("heading", { name: /encerrada/ })).toBeVisible();

  // O resumo é tela de foco (025): volta-se ao Início para usar a barra lateral.
  await page.getByRole("link", { name: t("nav.home"), exact: true }).click();
  // O mata-mata tem a origem das vagas.
  await menu.getByRole("link", { name: t("nav.competition") }).click();
  await nav.getByRole("link").nth(1).click();
  const bracket = page.getByRole("region", { name: t("cup.bracket") });
  await expect(bracket).toBeVisible();
  await expect(bracket).toContainText(/º do Grupo [A-D]/);

  // O resumo da temporada traz a posição final dos 20 clubes.
  await menu.getByRole("link", { name: t("nav.home") }).click();
  await page.getByRole("link", { name: t("home.seasonEndLink") }).click();
  await expect(page).toHaveURL(seasonEnd);
  const final = page.getByRole("region", {
    name: t("stages.finalPositions", { division: DIVISION }),
  });
  await expect(final.getByRole("listitem")).toHaveCount(20);
});
