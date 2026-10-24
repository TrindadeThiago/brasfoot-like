import { describe, expect, it } from "vitest";
import type { CompletedBank } from "../../src/model/types";
import {
  countryOf,
  isCountryMain,
  mainCompetitionOf,
  mainCompetitions,
  rulesCompetitionOf,
} from "../../src/world/countries";
import { canSignForeign, foreignCount } from "../../src/world/foreign";
import { completeHiddenAttributes } from "../../src/worldgen/hidden";
import { generateWorldBank } from "../../src/worldgen/world-example";

function world(): CompletedBank {
  const bank = generateWorldBank({
    seed: "paises-1",
    countries: 3,
    divisionsPerCountry: 2,
    clubsPerDivision: 12,
    cup: true,
  });
  return completeHiddenAttributes(bank, "paises-1");
}

describe("países e regras (020 R1)", () => {
  const bank = world();
  const [first, second] = bank.countries;

  it("a principal do país é a primeira competição dele; copas não são principais", () => {
    expect(mainCompetitionOf(bank, first?.id ?? "")?.id).toMatch(/^liga-/);
    expect(mainCompetitions(bank)).toHaveLength(3);
    expect(
      mainCompetitions(bank).every((competition) => competition.format.type === "league"),
    ).toBe(true);
    const cup = bank.competitions.find((competition) => competition.format.type === "knockout");
    expect(isCountryMain(bank, cup?.id ?? "")).toBe(false);
    expect(isCountryMain(bank, mainCompetitionOf(bank, second?.id ?? "")?.id ?? "")).toBe(true);
  });

  it("as regras de um clube vêm da principal do país dele", () => {
    const club = bank.clubs.find((entry) => entry.countryId === second?.id);
    const rules = rulesCompetitionOf(bank, club?.id ?? "");
    expect(rules.countryId).toBe(second?.id);
    expect(rules.economy?.wageFactorPct).not.toBe(
      rulesCompetitionOf(bank, bank.clubs.find((entry) => entry.countryId === first?.id)?.id ?? "")
        .economy?.wageFactorPct,
    );
    expect(countryOf(bank, club?.id ?? "")?.id).toBe(second?.id);
  });

  it("clube desconhecido cai na primeira competição do banco", () => {
    expect(rulesCompetitionOf(bank, "inexistente").id).toBe(bank.competitions[0]?.id);
    expect(countryOf(bank, "inexistente")).toBeUndefined();
  });
});

describe("estrangeiros (020 FR-002a)", () => {
  function withForeigners(limit: number | undefined) {
    const bank = world();
    const [a, b] = bank.countries;
    if (!a || !b) throw new Error("países");
    const club = bank.clubs.find((entry) => entry.countryId === a.id);
    const squad = bank.players.filter((player) => player.clubId === club?.id);
    squad.slice(0, 2).forEach((player) => {
      player.nationalityId = b.id;
    });
    if (limit !== undefined) a.rules = { foreignLimit: limit };
    return { bank, clubId: club?.id ?? "" };
  }

  it("conta quem tem nacionalidade diferente da do clube", () => {
    expect(
      foreignCount(withForeigners(undefined).bank, withForeigners(undefined).clubId),
    ).toBeGreaterThanOrEqual(2);
  });

  it("sem limite declarado qualquer clube pode contratar estrangeiro", () => {
    const { bank, clubId } = withForeigners(undefined);
    expect(canSignForeign(bank, clubId)).toBe(true);
  });

  it("com limite, só contrata enquanto estiver abaixo dele", () => {
    const { bank, clubId } = withForeigners(2);
    const count = foreignCount(bank, clubId);
    expect(canSignForeign(bank, clubId)).toBe(count < 2);
    const roomy = withForeigners(25);
    expect(canSignForeign(roomy.bank, roomy.clubId)).toBe(true);
    const full = withForeigners(0);
    expect(canSignForeign(full.bank, full.clubId)).toBe(false);
  });

  it("jogador emprestado ao clube conta no clube que o usa", () => {
    const { bank, clubId } = withForeigners(1);
    const other = bank.players.find((player) => player.clubId !== clubId);
    if (!other) throw new Error("jogador");
    const before = foreignCount(bank, clubId);
    other.clubId = clubId;
    other.nationalityId = bank.countries[1]?.id ?? "";
    expect(foreignCount(bank, clubId)).toBe(before + 1);
  });
});
