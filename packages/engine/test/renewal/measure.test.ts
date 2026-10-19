import { describe, expect, it } from "vitest";
import { initialRenewal, measureWorld } from "../../src/renewal/measure";
import { STAR_THRESHOLD } from "../../src/renewal/rules";
import { newLeague, testWorld } from "../career/helpers";

describe("medida do mundo e estado inicial (R1)", () => {
  it("mede força e idade dos jogadores da competição", () => {
    const league = newLeague("medida");
    const measure = measureWorld(testWorld(), league, testWorld().manifest.referenceDate);
    expect(measure.players).toBe(testWorld().players.length);
    expect(measure.mean).toBeCloseTo(59.1, 0);
    expect(measure.p50).toBe(59);
    expect(measure.p10).toBe(49);
    expect(measure.p90).toBe(68);
    expect(measure.max).toBe(82);
    expect(measure.stars).toBe(
      testWorld().players.filter((player) => player.strength >= STAR_THRESHOLD).length,
    );
    expect(measure.meanAge).toBeGreaterThan(24);
    expect(measure.meanAge).toBeLessThan(27);
  });

  it("estado inicial: próximo id depois do maior, regulador neutro", () => {
    const renewal = initialRenewal(testWorld());
    const max = Math.max(
      ...testWorld().players.map((player) => Number(player.id.split("-").at(-1))),
    );
    expect(renewal).toEqual({
      nextPlayerSeq: max + 1,
      regulator: { strengthOffset: 0, potentialBonus: 0 },
    });
  });
});
