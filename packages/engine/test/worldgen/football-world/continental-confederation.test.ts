import { describe, expect, it } from "vitest";
import { CONTINENTAL_IDS, continentalCompetitions } from "../../../src/worldgen/continental";
import { generateWorldBank } from "../../../src/worldgen/world-example";

describe("continentais generalizadas (024 R7)", () => {
  const bank = generateWorldBank({
    seed: "confederacao",
    countries: 5,
    divisionsPerCountry: 1,
    clubsPerDivision: 8,
    cup: true,
    continental: "compact",
  });

  it("regressão: o banco de teste da 022 mantém os ids e os nomes de antes", () => {
    const ids = bank.competitions.filter((c) => c.countryId === undefined).map((c) => c.id);
    expect(ids).toEqual([CONTINENTAL_IDS.major, CONTINENTAL_IDS.minor]);
    expect(bank.competitions.find((c) => c.id === CONTINENTAL_IDS.major)?.name).toBe(
      "Taça Continental",
    );
  });

  it("ids e nomes por confederação entram na competição e na ligação entre as duas", () => {
    const national = bank.competitions.filter((c) => c.countryId !== undefined);
    const made = continentalCompetitions(
      {
        size: "compact",
        ids: { major: "continental-xyz-maior", minor: "continental-xyz-menor" },
        names: { major: "Taça Continental XYZ", minor: "Copa Complementar XYZ" },
        countries: bank.countries,
        competitions: national,
        clubs: bank.clubs,
        scales: bank.countries.map(() => 1),
      },
      { minor: true },
    );
    expect(made.map((c) => c.id)).toEqual(["continental-xyz-maior", "continental-xyz-menor"]);
    expect(made[0]?.name).toBe("Taça Continental XYZ");
    const dropIn = made[1]?.divisions[0]?.dropIns?.[0];
    expect(dropIn?.source.competitionId).toBe("continental-xyz-maior");
    const forbid = made[1]?.divisions[0]?.berths?.flatMap((b) => b.forbid ?? []);
    expect(forbid?.every((ref) => ref.competitionId === "continental-xyz-maior")).toBe(true);
  });
});
