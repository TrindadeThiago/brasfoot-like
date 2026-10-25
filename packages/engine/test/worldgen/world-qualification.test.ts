import { describe, expect, it } from "vitest";
import { validateBank } from "../../src/validation/validate";
import { generateWorldBank } from "../../src/worldgen/world-example";

const OPTIONS = {
  seed: "mundo-vagas",
  countries: 3,
  divisionsPerCountry: 2,
  clubsPerDivision: 8,
  cup: true,
  qualification: true,
} as const;

describe("banco de teste com vagas entre competições (021 T026)", () => {
  const bank = generateWorldBank(OPTIONS);

  it("é válido e tem uma supercopa por país com copa", () => {
    expect(validateBank(JSON.parse(JSON.stringify(bank))).ok).toBe(true);
    const supercups = bank.competitions.filter((entry) => entry.id.startsWith("supercopa-"));
    expect(supercups).toHaveLength(OPTIONS.countries);
    for (const supercup of supercups) {
      const division = supercup.divisions[0];
      expect(division?.clubIds).toHaveLength(2);
      expect(division?.berths?.map((berth) => berth.id)).toEqual(["campeao-liga", "campeao-copa"]);
      const country = supercup.countryId;
      expect(
        division?.clubIds.every(
          (id) => bank.clubs.find((club) => club.id === id)?.countryId === country,
        ),
      ).toBe(true);
    }
  });

  it("é determinístico por seed", () => {
    expect(generateWorldBank(OPTIONS)).toEqual(bank);
    expect(generateWorldBank({ ...OPTIONS, seed: "outra" })).not.toEqual(bank);
  });

  it("sem a opção, o banco é o de antes", () => {
    const { qualification: _q, ...plain } = OPTIONS;
    const without = generateWorldBank(plain);
    expect(without.competitions.some((entry) => entry.id.startsWith("supercopa-"))).toBe(false);
    expect(without.competitions.some((c) => c.divisions.some((d) => d.berths))).toBe(false);
  });
});
