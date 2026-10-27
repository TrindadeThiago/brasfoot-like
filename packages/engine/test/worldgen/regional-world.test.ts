import { describe, expect, it } from "vitest";
import { isRegional, isRegionalOnly, regionalCompetitionOf } from "../../src/regional/scope";
import { generateRegionalBank } from "../../src/worldgen/regional";

describe("banco de estaduais (023 R9)", () => {
  const bank = generateRegionalBank({ seed: "estaduais-1" });
  const estaduais = bank.competitions.filter(isRegional);

  it("tem 27 estaduais de duas divisões, de 12 e 8 clubes", () => {
    expect(estaduais).toHaveLength(27);
    for (const competition of estaduais) {
      expect(competition.divisions.map((division) => division.level)).toEqual([1, 2]);
      expect(competition.divisions[0]?.clubIds).toHaveLength(12);
      expect(competition.divisions[1]?.clubIds).toHaveLength(8);
      expect(competition.divisions[0]?.relegationSlots).toBe(2);
      expect(competition.divisions[1]?.promotionSlots).toBe(2);
    }
  });

  it("todo clube tem região e joga o estadual dela", () => {
    for (const club of bank.clubs) {
      expect(club.region).toBeDefined();
      expect(regionalCompetitionOf(bank, club.id)?.regional?.region).toBe(club.region);
    }
  });

  it("mantém a liga nacional de 2 divisões com 40 clubes, que também jogam o estadual", () => {
    const league = bank.competitions.find((competition) => !isRegional(competition));
    expect(league?.format.type).toBe("league");
    const national = league?.divisions.flatMap((division) => division.clubIds) ?? [];
    expect(national).toHaveLength(40);
    for (const id of national) {
      expect(isRegionalOnly(bank, id)).toBe(false);
      const competition = regionalCompetitionOf(bank, id);
      expect(competition?.divisions[0]?.clubIds).toContain(id);
    }
  });

  it("clubes regionais têm elenco menor que o nacional e a liga começa depois do estadual", () => {
    const regionalClub = bank.clubs.find((club) => isRegionalOnly(bank, club.id));
    const nationalClub = bank.clubs.find((club) => !isRegionalOnly(bank, club.id));
    const size = (id?: string) => bank.players.filter((player) => player.clubId === id).length;
    expect(size(regionalClub?.id)).toBeLessThan(size(nationalClub?.id));
    expect(size(regionalClub?.id)).toBeGreaterThanOrEqual(16);
    const league = bank.competitions.find((competition) => !isRegional(competition));
    expect(league?.schedule?.startWeek).toBeGreaterThan(estaduais[0]?.schedule?.startWeek ?? 0);
  });

  it("é determinístico pela seed", () => {
    const again = generateRegionalBank({ seed: "estaduais-1" });
    expect(JSON.stringify(again)).toBe(JSON.stringify(bank));
    const other = generateRegionalBank({ seed: "estaduais-2", states: 3 });
    expect(other.competitions.filter(isRegional)).toHaveLength(3);
  });
});
