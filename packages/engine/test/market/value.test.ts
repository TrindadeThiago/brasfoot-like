import { describe, expect, it } from "vitest";
import { deriveMarketValue } from "../../src/derived/economy";
import { DEFAULT_MARKET } from "../../src/market/rules";
import { contractValuePct, marketValue } from "../../src/market/value";
import type { CompletedPlayer } from "../../src/model/types";
import { contractWorld, MANAGER, YEAR } from "./helpers";

const world = contractWorld();
const found = world.players.find((entry) => entry.clubId === MANAGER);
if (!found?.contract) throw new Error("sem jogador");
const player: CompletedPlayer = found;
const club = world.clubs.find((entry) => entry.id === MANAGER);
if (!club) throw new Error("sem clube");
const base = deriveMarketValue(player, club, world.manifest.referenceDate);

function withUntil(untilYear: number): CompletedPlayer {
  return { ...player, contract: { wage: 1, untilYear } };
}

describe("valor de mercado com contrato (R4, FR-009)", () => {
  it("fatores por anos restantes", () => {
    expect(contractValuePct(YEAR, YEAR, DEFAULT_MARKET)).toBe(60);
    expect(contractValuePct(YEAR + 1, YEAR, DEFAULT_MARKET)).toBe(85);
    expect(contractValuePct(YEAR + 2, YEAR, DEFAULT_MARKET)).toBe(100);
  });

  it("último ano < dois anos < três ou mais", () => {
    const last = marketValue(withUntil(YEAR), world, YEAR);
    const two = marketValue(withUntil(YEAR + 1), world, YEAR);
    const long = marketValue(withUntil(YEAR + 3), world, YEAR);
    expect(last).toBeLessThan(two);
    expect(two).toBeLessThan(long);
    expect(long).toBe(Math.round(base / 1000) * 1000);
  });

  it("emprestado vale pelo clube de origem", () => {
    const other = world.clubs.find((entry) => entry.id !== MANAGER);
    if (!other) throw new Error("sem outro clube");
    const loaned = {
      ...withUntil(YEAR + 3),
      clubId: other.id,
      contract: {
        wage: 1,
        untilYear: YEAR + 3,
        loan: { fromClubId: MANAGER, untilYear: YEAR },
      },
    };
    expect(marketValue(loaned, world, YEAR)).toBe(marketValue(withUntil(YEAR + 3), world, YEAR));
  });
});
