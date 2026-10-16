import { describe, expect, it } from "vitest";
import {
  clubSchema,
  competitionSchema,
  countrySchema,
  manifestSchema,
  playerSchema,
} from "../../src/model/schemas";
import { at, makeValidBank } from "../helpers/build-bank";

function customCodes(result: { success: boolean; error?: { issues: unknown[] } }): unknown[] {
  return (result.error?.issues ?? []).map((issue) => {
    const { code, params } = issue as { code: string; params?: { code?: string } };
    return params?.code ?? code;
  });
}

describe("schemas aceitam o banco válido", () => {
  it("cada entidade de makeValidBank passa", () => {
    const bank = makeValidBank();
    expect(manifestSchema.safeParse(bank.manifest).success).toBe(true);
    for (const country of bank.countries)
      expect(countrySchema.safeParse(country).success).toBe(true);
    for (const competition of bank.competitions)
      expect(competitionSchema.safeParse(competition).success).toBe(true);
    for (const club of bank.clubs) expect(clubSchema.safeParse(club).success).toBe(true);
    for (const player of bank.players) expect(playerSchema.safeParse(player).success).toBe(true);
  });

  it("hidden pode estar ausente, parcial ou completo", () => {
    const player = at(makeValidBank().players, 0);
    expect(playerSchema.safeParse({ ...player, hidden: {} }).success).toBe(true);
    expect(playerSchema.safeParse({ ...player, hidden: { potential: 70 } }).success).toBe(true);
    expect(
      playerSchema.safeParse({
        ...player,
        hidden: { potential: 70, temperament: 10, injuryProneness: 90 },
      }).success,
    ).toBe(true);
  });
});

describe("schemas rejeitam valores inválidos com o código do projeto", () => {
  const player = at(makeValidBank().players, 0);
  const club = at(makeValidBank().clubs, 0);
  const manifest = makeValidBank().manifest;

  it.each([
    [{ ...player, strength: 0 }, "schema.out_of_range"],
    [{ ...player, strength: 101 }, "schema.out_of_range"],
    [{ ...player, hidden: { potential: 0 } }, "schema.out_of_range"],
    [{ ...player, birthDate: "2001-02-30" }, "schema.invalid_format"],
    [{ ...player, id: "Jogador 1" }, "schema.invalid_format"],
    [{ ...player, name: "" }, "schema.invalid_length"],
    [{ ...player, displayName: "x".repeat(31) }, "schema.invalid_length"],
    [{ ...player, traits: ["finisher", "pace", "wall"] }, "schema.invalid_length"],
  ])("jogador %#", (input, expected) => {
    expect(customCodes(playerSchema.safeParse(input))).toContain(expected);
  });

  it.each([
    [{ ...club, abbreviation: "ab" }, "schema.invalid_format"],
    [{ ...club, colors: { primary: "#12345", secondary: "#FFFFFF" } }, "schema.invalid_format"],
    [{ ...club, crest: { ...club.crest, colors: ["#112233"] } }, "schema.invalid_length"],
    [{ ...club, crest: { ...club.crest, initials: "ABCDE" } }, "schema.invalid_length"],
    [{ ...club, stadiumCapacity: 999 }, "schema.out_of_range"],
    [{ ...club, reputation: 100.5 }, "invalid_type"],
  ])("clube %#", (input, expected) => {
    expect(customCodes(clubSchema.safeParse(input))).toContain(expected);
  });

  it.each([
    [{ ...manifest, version: "1.0" }, "schema.invalid_format"],
    [{ ...manifest, referenceDate: "2027/01/01" }, "schema.invalid_format"],
  ])("manifesto %#", (input, expected) => {
    expect(customCodes(manifestSchema.safeParse(input))).toContain(expected);
  });

  it("valores fora do catálogo geram invalid_value", () => {
    expect(customCodes(playerSchema.safeParse({ ...player, position: "GOL" }))).toContain(
      "invalid_value",
    );
    expect(customCodes(playerSchema.safeParse({ ...player, traits: ["voador"] }))).toContain(
      "invalid_value",
    );
  });
});
