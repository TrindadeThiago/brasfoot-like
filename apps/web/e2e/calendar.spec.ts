import { generateDefaultBank } from "@brasfoot-like/engine";
import { writeModPackage } from "@brasfoot-like/modkit";
import { expect, test } from "@playwright/test";
import { createCareer, skipTips, t } from "./helpers";

const MOD_NAME = "Duas competições (teste)";
const TOURNAMENT = "Torneio de Teste";

/**
 * Mod de teste da 017 (research.md R14): o mundo padrão mais um torneio de pontos corridos com os
 * 20 clubes da Série A, às quartas-feiras, a cada duas semanas. Gerado aqui, sem arquivo binário
 * no repositório.
 */
function twoCompetitionsMod(): Buffer {
  const base = generateDefaultBank({
    seed: "e2e-calendario",
    manifest: { id: "duas-competicoes", name: MOD_NAME, author: "testes", version: "1.0.0" },
  });
  const [league] = base.competitions;
  if (!league) throw new Error("sem competição");
  const bank = {
    ...base,
    competitions: [
      league,
      {
        id: "torneio-teste",
        countryId: league.countryId,
        name: TOURNAMENT,
        format: { ...league.format, rounds: 1 },
        divisions: [
          {
            level: 1,
            name: "Divisão única",
            clubIds: [...(league.divisions[0]?.clubIds ?? [])],
            promotionSlots: 0,
            relegationSlots: 0,
          },
        ],
        schedule: { weekday: 3, startWeek: 1, everyWeeks: 2 },
      },
    ],
  };
  return Buffer.from(writeModPackage(bank));
}

test("duas competições: avançar alterna domingo e quarta, calendário filtra, abas e condição (017)", async ({
  page,
}) => {
  await skipTips(page);
  await page.goto("/mods/");
  await page.getByLabel(t("mods.load")).setInputFiles({
    name: "duas-competicoes.zip",
    mimeType: "application/zip",
    buffer: twoCompetitionsMod(),
  });
  await expect(page.getByText(t("mods.loaded", { name: MOD_NAME }))).toBeVisible();

  await page.goto("/nova-carreira/");
  await page.getByLabel(t("newCareer.bank")).selectOption({ label: MOD_NAME });
  await page.getByLabel(t("newCareer.managerName")).fill("Ana Souza");
  await page.getByText(t("newCareer.advanced")).click();
  await page.getByLabel(t("newCareer.seed")).fill("e2e");
  await page.getByRole("checkbox", { name: t("newCareer.noFiring") }).check();
  const table = page.getByRole("table", {
    name: t("newCareer.clubsCaption", { division: "Série A" }),
  });
  const row = table.locator("tbody tr").first();
  const club = (await row.getByRole("img").getAttribute("aria-label")) ?? "";
  await row.click();
  await page.getByRole("button", { name: t("newCareer.confirm") }).click();
  await expect(page.getByRole("heading", { name: club })).toBeVisible();

  // Próximo compromisso: domingo, depois domingo, depois a quarta do torneio.
  const card = page.getByRole("region", { name: t("home.nextMatch") });
  await expect(card).toContainText("domingo, 3 de janeiro de 2027");
  await page.getByRole("button", { name: t("home.simulate") }).click();
  await expect(card).toContainText("domingo, 10 de janeiro de 2027");
  await page.getByRole("button", { name: t("home.simulate") }).click();
  await expect(card).toContainText("quarta-feira, 13 de janeiro de 2027");
  await expect(card).toContainText(TOURNAMENT);

  const menu = page.getByRole("navigation", { name: t("nav.menu") });

  // Calendário do clube: as duas competições por data, com filtro.
  await menu.getByRole("link", { name: t("nav.calendar") }).click();
  await expect(page).toHaveURL(/\/jogo\/calendario\//);
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(38 + 19);
  await page.getByLabel(t("calendar.filter")).selectOption({ label: TOURNAMENT });
  await expect(rows).toHaveCount(19);
  await page.getByLabel(t("calendar.filter")).selectOption({ label: t("calendar.all") });
  await expect(rows).toHaveCount(38 + 19);

  // Abas por competição na tabela.
  await menu.getByRole("link", { name: t("nav.competition") }).click();
  const tabs = page.getByRole("navigation", { name: t("competition.select") });
  await expect(tabs.getByRole("link")).toHaveCount(2);
  await tabs.getByRole("link", { name: TOURNAMENT }).click();
  await expect(
    page.getByRole("table", { name: t("competition.caption", { division: "Divisão única" }) }),
  ).toBeVisible();

  // Condição física dos titulares depois de jogos em sequência.
  await menu.getByRole("link", { name: t("nav.lineup") }).click();
  const pitch = page.getByRole("region", { name: t("lineup.pitch") });
  const meters = pitch.getByRole("meter", { name: t("fitness.label") });
  await expect(meters).toHaveCount(11);
  const levels = await meters.evaluateAll((nodes) =>
    nodes.map((node) => Number(node.getAttribute("aria-valuenow"))),
  );
  expect(Math.min(...levels)).toBeLessThan(100);
});

test("banco padrão: liga e copa, seletor de competição e calendário só com a liga no início (017, 018)", async ({
  page,
}) => {
  await createCareer(page, "Ana Souza", 3);
  const menu = page.getByRole("navigation", { name: t("nav.menu") });
  await menu.getByRole("link", { name: t("nav.competition") }).click();
  await expect(page.getByRole("navigation", { name: t("division.tabs.label") })).toBeVisible();
  await expect(page.getByRole("navigation", { name: t("competition.select") })).toBeVisible();
  await menu.getByRole("link", { name: t("nav.calendar") }).click();
  await expect(page.getByLabel(t("calendar.filter"))).toHaveCount(0);
  await expect(page.locator("tbody tr")).toHaveCount(38);
});
