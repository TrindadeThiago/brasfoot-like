import { describe, expect, it } from "vitest";
import { advanceCareerDays } from "../../src/career/day";
import type { CareerSeasonState } from "../../src/career/season-state";
import type { CompletedBank } from "../../src/model/types";
import { foreignCount } from "../../src/world/foreign";
import { clubOfCountry, worldBank, worldState } from "../career/world-helpers";

const SEED = "ia-internacional";
const DAYS = 8;

function played(edit?: (world: CompletedBank) => void): {
  state: CareerSeasonState;
  world: CompletedBank;
} {
  const world = worldBank({ countries: 3, clubsPerDivision: 14 }, SEED);
  edit?.(world);
  const manager = clubOfCountry(world, 0);
  const done = advanceCareerDays(worldState(world, SEED, manager), { days: DAYS }, SEED, manager);
  if (!done.ok) throw new Error(JSON.stringify(done.error));
  return { state: done.state, world };
}

function international(state: CareerSeasonState) {
  const country = new Map(state.world.clubs.map((club) => [club.id, club.countryId]));
  return (state.market?.log ?? []).filter(
    (entry) =>
      entry.outcome === undefined &&
      entry.fromClubId !== undefined &&
      entry.toClubId !== undefined &&
      country.get(entry.fromClubId) !== country.get(entry.toClubId),
  );
}

function allowAbroad(world: CompletedBank, perClub: number): void {
  for (const competition of world.competitions) {
    competition.market = { ...competition.market, aiMarket: { maxInternationalPerClub: perClub } };
  }
}

describe("IA de transferências entre países (020 FR-012, R13)", () => {
  it("com o teto em zero a IA só compra no próprio país", () => {
    const { state } = played((world) => allowAbroad(world, 0));
    expect(international(state)).toHaveLength(0);
    expect((state.market?.log ?? []).length).toBeGreaterThan(0);
  });

  it("com teto maior a IA contrata de outros países, e nunca passa do teto por clube e janela", () => {
    const { state } = played((world) => allowAbroad(world, 2));
    const abroad = international(state);
    expect(abroad.length).toBeGreaterThan(0);
    const perBuyer = new Map<string, number>();
    for (const entry of abroad) {
      if (entry.kind === "free" || entry.toClubId === undefined) continue;
      perBuyer.set(entry.toClubId, (perBuyer.get(entry.toClubId) ?? 0) + 1);
    }
    expect(Math.max(0, ...perBuyer.values())).toBeLessThanOrEqual(2 * 2);
  });

  it("a IA respeita o limite de estrangeiros do país do comprador", () => {
    const { state, world } = played((bank) => {
      allowAbroad(bank, 3);
      for (const country of bank.countries) country.rules = { foreignLimit: 0 };
    });
    const before = new Map(world.clubs.map((club) => [club.id, foreignCount(world, club.id)]));
    for (const club of state.world.clubs) {
      expect(foreignCount(state.world, club.id), club.id).toBeLessThanOrEqual(
        before.get(club.id) ?? 0,
      );
    }
    expect(international(state).filter((entry) => entry.kind !== "free")).toHaveLength(0);
  });

  it("é determinística", () => {
    const run = () => JSON.stringify(played((world) => allowAbroad(world, 2)).state.market?.log);
    expect(run()).toBe(run());
  }, 60_000);
});
