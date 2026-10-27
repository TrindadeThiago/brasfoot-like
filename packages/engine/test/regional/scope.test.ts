import { describe, expect, it } from "vitest";
import type { CompletedBank } from "../../src/model/types";
import {
  isRegional,
  isRegionalOnly,
  regionalCompetitionOf,
  regionalCompetitions,
  regionalDivisionOf,
} from "../../src/regional/scope";
import { completeHiddenAttributes } from "../../src/worldgen/hidden";
import { generateWorldBank } from "../../src/worldgen/world-example";

/** Dois países; o primeiro ganha um estadual "Norte" com 1 clube nacional e 1 clube extra. */
function world(): { bank: CompletedBank; national: string; other: string; regionalId: string } {
  const base = completeHiddenAttributes(
    generateWorldBank({
      seed: "regional-scope",
      countries: 2,
      divisionsPerCountry: 2,
      clubsPerDivision: 12,
      cup: false,
    }),
    "regional-scope",
  );
  const league = base.competitions[0];
  if (!league) throw new Error("banco sem competição");
  const [national, other] = base.clubs.filter((club) => club.countryId === league.countryId);
  if (!national || !other) throw new Error("clubes insuficientes");
  const regional = {
    ...league,
    id: "estadual-teste",
    regional: { region: "Norte" },
    divisions: [
      { ...(league.divisions[0] as never as object), clubIds: [national.id] },
      { ...(league.divisions[1] as never as object), level: 2, clubIds: ["clube-regional"] },
    ],
  } as unknown as (typeof base.competitions)[number];
  const clubs = base.clubs.map((club) =>
    club.id === national.id ? { ...club, region: "Norte" } : club,
  );
  const extra = { ...other, id: "clube-regional", region: "Norte" };
  return {
    bank: { ...base, clubs: [...clubs, extra], competitions: [...base.competitions, regional] },
    national: national.id,
    other: other.id,
    regionalId: regional.id,
  };
}

describe("escopo regional (023 R1, R2, R4)", () => {
  const { bank, national, other, regionalId } = world();

  it("isRegional e regionalCompetitions só enxergam o estadual", () => {
    expect(regionalCompetitions(bank).map((entry) => entry.id)).toEqual([regionalId]);
    const league = bank.competitions[0];
    expect(isRegional(league as never)).toBe(false);
    const country = league?.countryId ?? "";
    expect(regionalCompetitions(bank, country)).toHaveLength(1);
    expect(regionalCompetitions(bank, "outro-pais")).toHaveLength(0);
  });

  it("regionalCompetitionOf liga o clube ao estadual pela região e pelo país", () => {
    expect(regionalCompetitionOf(bank, national)?.id).toBe(regionalId);
    expect(regionalCompetitionOf(bank, "clube-regional")?.id).toBe(regionalId);
    // Sem região, não há estadual.
    expect(regionalCompetitionOf(bank, other)).toBeUndefined();
  });

  it("regionalDivisionOf devolve a divisão do clube", () => {
    const competition = bank.competitions.find((entry) => entry.id === regionalId);
    expect(competition && regionalDivisionOf(competition, national)?.level).toBe(1);
    expect(competition && regionalDivisionOf(competition, "clube-regional")?.level).toBe(2);
    expect(competition && regionalDivisionOf(competition, other)).toBeUndefined();
  });

  it("isRegionalOnly: clube só do estadual sim; clube que também joga a liga não", () => {
    expect(isRegionalOnly(bank, "clube-regional")).toBe(true);
    expect(isRegionalOnly(bank, national)).toBe(false);
    expect(isRegionalOnly(bank, "inexistente")).toBe(false);
  });
});
