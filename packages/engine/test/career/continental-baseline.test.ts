import { describe, expect, it } from "vitest";
import { ensureContracts } from "../../src/market/contracts";
import { standings } from "../../src/season/standings";
import { completeHiddenAttributes } from "../../src/worldgen/hidden";
import { generateStagesBank } from "../../src/worldgen/stages-example";
import { allSeasons, playSeasons } from "./qualification-helpers";
import { worldBank } from "./world-helpers";

// Linha de base da 022 (FR-026): sem competição entre países a composição e as classificações
// finais não mudam. O snapshot é a referência de "nada mudou" para a compatibilidade.
function digest(state: Parameters<typeof allSeasons>[0], world: Parameters<typeof standings>[1]) {
  return allSeasons(state)
    .map((league) => ({
      competition: league.competitionId,
      divisions: league.divisions.map((season) => ({
        level: season.divisionLevel,
        clubs: [...season.clubIds].sort(),
        top: standings(season, world)
          .slice(0, 3)
          .map((row) => row.clubId),
      })),
    }))
    .sort((a, b) => a.competition.localeCompare(b.competition));
}

describe("sem competição entre países nada muda (baseline 022)", () => {
  it("banco de 3 países com copas e vagas: composição e topo de 3 temporadas", () => {
    const world = worldBank({ cup: true, qualification: true });
    const { seasons } = playSeasons(world, "baseline-022-world", 3);
    expect(seasons.map((entry) => digest(entry.end, entry.end.world))).toMatchSnapshot();
  }, 300_000);

  it("banco de 4 países de uma divisão: composição e topo de 3 temporadas", () => {
    const world = worldBank(
      { countries: 4, divisionsPerCountry: 1, clubsPerDivision: 12 },
      "baseline-022-four",
    );
    const { seasons } = playSeasons(world, "baseline-022-four", 3);
    expect(seasons.map((entry) => digest(entry.end, entry.end.world))).toMatchSnapshot();
  }, 300_000);

  it("banco de estágios: composição e topo de 3 temporadas", () => {
    const bank = completeHiddenAttributes(generateStagesBank(), "baseline-022-stages");
    const world = ensureContracts(
      bank,
      Number(bank.manifest.referenceDate.slice(0, 4)),
      "baseline-022-stages",
    );
    const { seasons } = playSeasons(world, "baseline-022-stages", 3, {
      manager: world.clubs[0]?.id ?? "",
    });
    expect(seasons.map((entry) => digest(entry.end, entry.end.world))).toMatchSnapshot();
  }, 300_000);
});
