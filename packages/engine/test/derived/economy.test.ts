import { describe, expect, it } from "vitest";
import { deriveMarketValue, deriveWage } from "../../src/derived/economy";
import type { Club, CompletedPlayer } from "../../src/model/types";
import { at, makeValidBank } from "../helpers/build-bank";

const REFERENCE = "2027-01-01";
const base = makeValidBank();
const club: Club = { ...at(base.clubs, 0), reputation: 70 };

function player(strength: number, birthDate = "2000-06-01", potential = 100): CompletedPlayer {
  return {
    ...at(base.players, 5),
    strength,
    birthDate,
    hidden: { potential: Math.max(potential, strength), temperament: 50, injuryProneness: 50 },
  };
}

describe("salário e valor de mercado derivados (FR-016)", () => {
  it("são positivos e arredondados", () => {
    for (let strength = 1; strength <= 100; strength++) {
      const wage = deriveWage(player(strength), club, REFERENCE);
      const value = deriveMarketValue(player(strength), club, REFERENCE);
      expect(wage).toBeGreaterThan(0);
      expect(wage % 100).toBe(0);
      expect(value).toBeGreaterThan(0);
      expect(value % 1000).toBe(0);
    }
  });

  it("não diminuem quando a força aumenta", () => {
    for (let strength = 2; strength <= 100; strength++) {
      expect(deriveWage(player(strength), club, REFERENCE)).toBeGreaterThanOrEqual(
        deriveWage(player(strength - 1), club, REFERENCE),
      );
      expect(deriveMarketValue(player(strength), club, REFERENCE)).toBeGreaterThanOrEqual(
        deriveMarketValue(player(strength - 1), club, REFERENCE),
      );
    }
  });

  it("são determinísticos", () => {
    expect(deriveMarketValue(player(70), club, REFERENCE)).toBe(
      deriveMarketValue(player(70), club, REFERENCE),
    );
  });

  it("jovem de alto potencial vale mais que veterano de mesma força", () => {
    const young = player(65, "2007-03-01", 85);
    const veteran = player(65, "1995-03-01", 65);
    expect(deriveMarketValue(young, club, REFERENCE)).toBeGreaterThan(
      deriveMarketValue(veteran, club, REFERENCE),
    );
  });

  it("craques valem muito mais que medianos", () => {
    expect(deriveMarketValue(player(88), club, REFERENCE)).toBeGreaterThan(
      3 * deriveMarketValue(player(60), club, REFERENCE),
    );
  });
});
