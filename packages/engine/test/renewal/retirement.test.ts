import { describe, expect, it } from "vitest";
import { ageOn } from "../../src/calendar/date";
import type { CompletedBank } from "../../src/model/types";
import { retirementChance, retirePlayers } from "../../src/renewal/retirement";
import { RETIREMENT_RULES } from "../../src/renewal/rules";
import { editedWorld, newLeague, testWorld } from "../career/helpers";

const DATE = testWorld().manifest.referenceDate;

/** Mundo em que todo jogador tem a idade pedida na data de referência. */
function agedWorld(age: number): CompletedBank {
  const year = Number(DATE.slice(0, 4)) - age;
  return editedWorld((world) => {
    for (const player of world.players) player.birthDate = `${year}-01-01`;
  });
}

describe("aposentadoria (US2, R5)", () => {
  it("chance zero abaixo da idade mínima, crescente depois, certa na idade máxima", () => {
    expect(retirementChance(RETIREMENT_RULES.minAge - 1)).toBe(0);
    expect(retirementChance(34)).toBeLessThan(retirementChance(36));
    expect(retirementChance(RETIREMENT_RULES.certainAge)).toBe(1);
  });

  it("ninguém abaixo de 33 se aposenta; 38+ sempre", () => {
    const league = newLeague("aposentadoria");
    const young = retirePlayers(agedWorld(32), league, "s", 1, DATE);
    expect(young.retired).toEqual([]);
    expect(young.world.players).toHaveLength(testWorld().players.length);
    const old = retirePlayers(agedWorld(38), league, "s", 1, DATE);
    expect(
      old.world.players.filter((player) =>
        league.divisions.some((s) => s.clubIds.includes(player.clubId)),
      ),
    ).toEqual([]);
  });

  it("mais velhos se aposentam com mais frequência", () => {
    const league = newLeague("frequencia");
    const share = (age: number) => {
      const world = agedWorld(age);
      return retirePlayers(world, league, "s", 1, DATE).retired.length / world.players.length;
    };
    expect(share(36)).toBeGreaterThan(share(34));
  });

  it("aposentados saem do mundo, com cópia dos dados; determinística", () => {
    const league = newLeague("saida");
    const first = retirePlayers(testWorld(), league, "s", 1, DATE);
    const again = retirePlayers(testWorld(), league, "s", 1, DATE);
    expect(again).toEqual(first);
    for (const ref of first.retired) {
      expect(first.world.players.some((player) => player.id === ref.playerId)).toBe(false);
      const before = testWorld().players.find((player) => player.id === ref.playerId);
      expect(ref).toMatchObject({ displayName: before?.displayName, strength: before?.strength });
      expect(ref.age).toBe(ageOn(before?.birthDate ?? "", DATE));
      expect(ref.age).toBeGreaterThanOrEqual(RETIREMENT_RULES.minAge);
    }
  });
});
