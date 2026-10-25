import { describe, expect, it } from "vitest";
import { ensureContracts } from "../../src/market/contracts";
import { generateDefaultBank } from "../../src/worldgen/generate";
import { completeHiddenAttributes } from "../../src/worldgen/hidden";
import { allSeasons, playSeasons } from "./qualification-helpers";
import { worldBank } from "./world-helpers";

// 022 FR-026: sem competição entre países nada novo aparece no estado nem no histórico; os
// resultados idênticos aos de antes estão no snapshot de continental-baseline.test.ts (T001).
describe("compatibilidade sem competição entre países (022 US5)", () => {
  it("mundo de 3 países: nenhuma competição entre países, nenhum campo novo no estado", () => {
    const { seasons, history } = playSeasons(
      worldBank({ cup: true, qualification: true }),
      "compat-022",
      2,
    );
    for (const played of seasons) {
      expect(played.end.world.competitions.every((entry) => entry.countryId !== undefined)).toBe(
        true,
      );
      for (const league of allSeasons(played.end)) {
        for (const season of league.divisions) {
          expect(season.stages?.some((stage) => stage.incoming !== undefined) ?? false).toBe(false);
        }
      }
      const goals = Object.values(played.end.board?.clubs ?? {}).map(
        (club) => club.goals?.continental,
      );
      expect(goals.every((goal) => goal === undefined)).toBe(true);
    }
    expect(history.continentalHistory ?? []).toEqual([]);
  }, 300_000);

  it("o banco padrão de um país continua válido e sem regras continentais", () => {
    const bank = completeHiddenAttributes(
      generateDefaultBank({ seed: "compat-022" }),
      "compat-022",
    );
    const world = ensureContracts(
      bank,
      Number(bank.manifest.referenceDate.slice(0, 4)),
      "compat-022",
    );
    expect(world.competitions.every((entry) => entry.awards === undefined)).toBe(true);
    expect(
      world.competitions.every((entry) => entry.divisions.every((d) => d.dropIns === undefined)),
    ).toBe(true);
  });
});
