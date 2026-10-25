import { describe, expect, it } from "vitest";
import { ensureContracts } from "../../src/market/contracts";
import { completeHiddenAttributes } from "../../src/worldgen/hidden";
import { generateStagesBank } from "../../src/worldgen/stages-example";
import { allSeasons, playSeasons } from "./qualification-helpers";
import { worldBank } from "./world-helpers";

// Linha de base da 021 (FR-022): sem `berths` a composição e as classificações finais não mudam.
function digest(state: Parameters<typeof allSeasons>[0]) {
  return allSeasons(state)
    .map((league) => ({
      competition: league.competitionId,
      divisions: league.divisions.map((season) => [
        season.divisionLevel,
        [...season.clubIds].sort(),
      ]),
    }))
    .sort((a, b) => a.competition.localeCompare(b.competition));
}

describe("composição sem vagas entre competições (baseline 021)", () => {
  it("banco de 3 países: composição de 3 temporadas", () => {
    const { seasons } = playSeasons(worldBank(), "baseline-021", 3);
    expect(seasons.map((entry) => digest(entry.start))).toMatchSnapshot();
  }, 300_000);

  it("banco de estágios: composição de 3 temporadas", () => {
    const bank = completeHiddenAttributes(generateStagesBank(), "baseline-stages");
    const world = ensureContracts(
      bank,
      Number(bank.manifest.referenceDate.slice(0, 4)),
      "baseline-stages",
    );
    const { seasons } = playSeasons(world, "baseline-stages", 3, {
      manager: world.clubs[0]?.id ?? "",
    });
    expect(seasons.map((entry) => digest(entry.start))).toMatchSnapshot();
  }, 300_000);
});
