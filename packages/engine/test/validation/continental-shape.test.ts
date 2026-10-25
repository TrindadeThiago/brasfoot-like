import { describe, expect, it } from "vitest";
import { validateBank } from "../../src/validation/validate";
import { continentalPackage } from "../fixtures/continental-bank";

const issues = (bank: ReturnType<typeof continentalPackage>) => {
  const result = validateBank(bank);
  return {
    ok: result.ok,
    errors: result.ok ? [] : result.errors.map((issue) => issue.code),
    warnings: result.warnings.map((issue) => issue.code),
  };
};

describe("forma da competição entre países (022)", () => {
  it("um banco com competição sem país é válido e não dispara as regras de país", () => {
    const result = issues(continentalPackage());
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.errors).not.toContain("competition.club_outside_main");
    expect(result.errors).not.toContain("unique.duplicate_club_in_country");
  });

  it("recusa mais de uma divisão ou formato de liga: continental.shape", () => {
    const divisions = issues(
      continentalPackage((_, competition) => {
        competition.divisions.push({ ...(competition.divisions[0] as object) } as never);
      }),
    );
    expect(divisions.errors).toContain("continental.shape");

    const league = issues(
      continentalPackage((bank, competition) => {
        const main = bank.competitions[0];
        if (!main) throw new Error("sem principal");
        competition.format = main.format;
      }),
    );
    expect(league.errors).toContain("continental.shape");
  });

  it("não pode ser a primeira competição do banco: continental.shape", () => {
    const first = issues(
      continentalPackage((bank, competition) => {
        bank.competitions = [
          competition,
          ...bank.competitions.filter((entry) => entry !== competition),
        ];
      }),
    );
    expect(first.errors).toContain("continental.shape");
  });

  it("recusa clubes de um país só: continental.single_country", () => {
    const result = issues(
      continentalPackage((bank, competition) => {
        const main = bank.competitions[0];
        const division = competition.divisions[0];
        if (!main || !division) throw new Error("sem divisão");
        division.clubIds = [...(main.divisions[0]?.clubIds ?? [])].sort().slice(0, 8);
      }),
    );
    expect(result.errors).toContain("continental.single_country");
  });

  it("recusa clube fora de qualquer liga principal: continental.club_without_league", () => {
    const result = issues(
      continentalPackage((bank, competition) => {
        const division = competition.divisions[0];
        const source = bank.clubs[0];
        if (!division || !source) throw new Error("sem clube");
        bank.clubs.push({ ...source, id: "clube-sem-liga", abbreviation: "ZZZ" });
        division.clubIds = [...division.clubIds.slice(1), "clube-sem-liga"];
      }),
    );
    expect(result.errors).toContain("continental.club_without_league");
  });

  it("avisa de regras econômicas declaradas na competição: continental.rules_ignored", () => {
    const result = issues(
      continentalPackage((_, competition) => {
        competition.economy = { fansBase: 1000 };
      }),
    );
    expect(result.ok).toBe(true);
    expect(result.warnings).toContain("continental.rules_ignored");
  });
});
