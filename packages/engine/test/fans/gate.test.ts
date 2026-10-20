import { describe, expect, it } from "vitest";
import { gateMoodFactor } from "../../src/fans/mood";
import { DEFAULT_FANS } from "../../src/fans/rules";
import { gateFor, nextHomeGateEstimate } from "../../src/finance/gate";
import { economyRules } from "../../src/finance/rules";
import { fansCareer, MANAGER, playFans, withMood } from "./helpers";

describe("humor no público (013 R5)", () => {
  const career = fansCareer();
  const season = career.league.divisions[0];
  const fixture = season?.calendar[0]?.fixtures[0];
  if (!fixture) throw new Error("sem jogo");

  it("fator 1 no neutro, 0,70 a 1,30 nos extremos", () => {
    expect(gateMoodFactor(DEFAULT_FANS, 50)).toBe(1);
    expect(gateMoodFactor(DEFAULT_FANS, 0)).toBeCloseTo(0.7);
    expect(gateMoodFactor(DEFAULT_FANS, 100)).toBeCloseTo(1.3);
  });

  it("humor alto lota mais que humor baixo; sem humor, igual ao de antes", () => {
    // Ingresso caro: o estádio não lota e o humor aparece no público.
    const price = economyRules(career.world, career.league.competitionId).priceRange.max;
    const base = gateFor(career.finances, career.league, career.world, fixture, price);
    const neutral = gateFor(career.finances, career.league, career.world, fixture, price, {
      mood: 50,
    });
    const low = gateFor(career.finances, career.league, career.world, fixture, price, { mood: 10 });
    const high = gateFor(career.finances, career.league, career.world, fixture, price, {
      mood: 90,
    });
    expect(neutral).toEqual(base);
    expect(low.attendance).toBeLessThan(high.attendance);
    expect(high.attendance).toBeLessThanOrEqual(high.capacity);
  });

  it("a estimativa do próximo jogo usa o humor", () => {
    const price = career.finances.clubs[MANAGER]?.ticketPrice ?? 1;
    const low = nextHomeGateEstimate(
      career.finances,
      career.league,
      career.world,
      MANAGER,
      price,
      withMood(career, MANAGER, 5).fans,
    );
    const high = nextHomeGateEstimate(
      career.finances,
      career.league,
      career.world,
      MANAGER,
      price,
      withMood(career, MANAGER, 95).fans,
    );
    expect(low?.attendance).toBeLessThanOrEqual(high?.attendance ?? 0);
  });

  it("torcida revoltada esvazia o estádio: público médio cai ≥ 5% (SC-001)", () => {
    const played = playFans(fansCareer(), { rounds: 4 });
    const home = played.league.divisions
      .flatMap((entry) => entry.calendar.slice(4))
      .flatMap((round) => round.fixtures)
      .filter((entry) => entry.home === MANAGER)
      .slice(0, 3);
    const price = economyRules(played.world, played.league.competitionId).priceRange.max;
    const average = (mood: number) =>
      home.reduce(
        (sum, entry) =>
          sum +
          gateFor(played.finances, played.league, played.world, entry, price, {
            noise: false,
            mood,
          }).attendance,
        0,
      ) / home.length;
    const before = average(DEFAULT_FANS.neutral);
    const after = average(DEFAULT_FANS.neutral - 25);
    const capacity = played.finances.clubs[MANAGER]?.capacity ?? 0;
    expect(before).toBeLessThan(capacity);
    expect(after).toBeLessThanOrEqual(before * 0.95);
  });
});
