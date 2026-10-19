import { describe, expect, it } from "vitest";
import { DEFAULT_ECONOMY, divisionEconomy, economyRules } from "../../src/finance/rules";
import { competitionId, editedWorld, testWorld } from "../career/helpers";

function withoutEconomy() {
  return editedWorld((world) => {
    const competition = world.competitions[0];
    if (competition) delete competition.economy;
  });
}

describe("regras econômicas (R11)", () => {
  it("sem economy no mod, valem os padrões do motor", () => {
    expect(economyRules(withoutEconomy(), competitionId())).toEqual(DEFAULT_ECONOMY);
  });

  it("economy parcial completa o resto com os padrões", () => {
    const world = editedWorld((w) => {
      const competition = w.competitions[0];
      if (!competition) return;
      competition.economy = {
        crisisRounds: 4,
        divisions: [{ level: 2, referencePrice: 99 }],
      };
    });
    const rules = economyRules(world, competitionId());
    expect(rules.crisisRounds).toBe(4);
    expect(rules.priceRange).toEqual(DEFAULT_ECONOMY.priceRange);
    expect(divisionEconomy(rules, 2).referencePrice).toBe(99);
    expect(divisionEconomy(rules, 2).sponsorship).toEqual(
      divisionEconomy(DEFAULT_ECONOMY, 2).sponsorship,
    );
    expect(divisionEconomy(rules, 1)).toEqual(divisionEconomy(DEFAULT_ECONOMY, 1));
  });

  it("nível sem entrada usa o último nível conhecido", () => {
    expect(divisionEconomy(DEFAULT_ECONOMY, 5)).toEqual({
      ...divisionEconomy(DEFAULT_ECONOMY, 2),
      level: 5,
    });
  });

  it("o banco padrão grava a economia explícita, igual aos padrões", () => {
    const economy = testWorld().competitions[0]?.economy;
    expect(economy).toBeDefined();
    expect(economyRules(testWorld(), competitionId())).toEqual(DEFAULT_ECONOMY);
  });
});
