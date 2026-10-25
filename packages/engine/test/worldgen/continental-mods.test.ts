import { describe, expect, it } from "vitest";
import { competitionSeason, isCalendarOver } from "../../src/career/season-state";
import { ensureContracts } from "../../src/market/contracts";
import type { CompletedBank } from "../../src/model/types";
import { standings } from "../../src/season/standings";
import { CONTINENTAL_IDS } from "../../src/worldgen/continental";
import { completeHiddenAttributes } from "../../src/worldgen/hidden";
import { generateWorldBank, type WorldBankOptions } from "../../src/worldgen/world-example";
import { playDays } from "../career/continental-helpers";
import { worldState } from "../career/world-helpers";

function complete(options: WorldBankOptions): CompletedBank {
  const bank = completeHiddenAttributes(generateWorldBank(options), options.seed);
  return ensureContracts(bank, Number(bank.manifest.referenceDate.slice(0, 4)), options.seed);
}

/** Joga uma temporada num banco só de dados, sem mudar o motor, e devolve o fim dela. */
function season(world: CompletedBank, seed: string) {
  const major = world.competitions.find((entry) => entry.id === CONTINENTAL_IDS.major);
  const manager = major?.divisions[0]?.clubIds[0] ?? "";
  const state = worldState(world, seed, manager);
  return { state, end: playDays(state, "end", seed, manager) };
}

describe("dois continentes só com dados (022 US5, SC-006)", () => {
  it("4 países, formato curto (grupos + mata-mata), sem competição menor", () => {
    const world = complete({
      seed: "mod-curto",
      countries: 4,
      divisionsPerCountry: 1,
      clubsPerDivision: 8,
      cup: true,
      continental: "compact",
      continentalMinor: false,
    });
    expect(world.competitions.some((entry) => entry.id === CONTINENTAL_IDS.minor)).toBe(false);
    const { state, end } = season(world, "mod-curto");
    const before = competitionSeason(state, CONTINENTAL_IDS.major).divisions[0];
    expect(before?.stages?.map((stage) => stage.kind)).toEqual(["groups", "knockout"]);
    expect(before?.clubIds).toHaveLength(16);
    expect(isCalendarOver(end)).toBe(true);
    const after = competitionSeason(end, CONTINENTAL_IDS.major).divisions[0];
    expect(after && standings(after, end.world)[0]).toBeDefined();
  }, 300_000);

  it("6 países, formato longo (preliminar + grupos + mata-mata), com a menor ligada", () => {
    const world = complete({
      seed: "mod-longo",
      countries: 6,
      divisionsPerCountry: 1,
      clubsPerDivision: 12,
      cup: true,
      continental: "full",
    });
    const { state, end } = season(world, "mod-longo");
    const major = competitionSeason(state, CONTINENTAL_IDS.major).divisions[0];
    expect(major?.stages?.map((stage) => stage.kind)).toEqual(["knockout", "groups", "knockout"]);
    expect(major?.clubIds).toHaveLength(40);
    // 16 jogam a preliminar e 24 entram direto nos grupos (vagas por país, só dados).
    expect(major?.stages?.[0]?.clubIds).toHaveLength(16);
    const countries = new Set(
      (major?.clubIds ?? []).map(
        (id) => state.world.clubs.find((club) => club.id === id)?.countryId,
      ),
    );
    expect(countries.size).toBe(6);
    const minor = competitionSeason(end, CONTINENTAL_IDS.minor).divisions[0];
    expect(minor?.stages?.[1]?.incoming?.[0]?.clubIds).toHaveLength(8);
    expect(minor?.stages?.[1]?.clubIds).toHaveLength(16);
    expect(isCalendarOver(end)).toBe(true);
  }, 600_000);
});
