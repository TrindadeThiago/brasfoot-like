import { describe, expect, it } from "vitest";
import { aiMarketRules, DEFAULT_AI_MARKET } from "../../../src/market/ai/rules";
import { validateBank } from "../../../src/validation/validate";
import { competitionId } from "../../career/helpers";
import { editedWorld, testWorld } from "../helpers";

describe("regras da IA de mercado (R12)", () => {
  it("sem aiMarket devolve os padrões", () => {
    expect(aiMarketRules(testWorld(), competitionId())).toEqual(DEFAULT_AI_MARKET);
  });

  it("campos do mod substituem só os informados", () => {
    const world = editedWorld((draft) => {
      const competition = draft.competitions[0];
      if (competition) competition.market = { aiMarket: { minGain: 5, positionMax: { GK: 3 } } };
    });
    const rules = aiMarketRules(world, competitionId(world));
    expect(rules.minGain).toBe(5);
    expect(rules.positionMax.GK).toBe(3);
    expect(rules.positionMax.FW).toBe(DEFAULT_AI_MARKET.positionMax.FW);
    expect(rules.weakGap).toBe(DEFAULT_AI_MARKET.weakGap);
    expect(
      validateBank({
        manifest: world.manifest,
        countries: world.countries,
        competitions: world.competitions,
        clubs: world.clubs,
        players: world.players,
      }).ok,
    ).toBe(true);
  });
});
