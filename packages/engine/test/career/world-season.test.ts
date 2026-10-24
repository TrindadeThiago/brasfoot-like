import { describe, expect, it } from "vitest";
import { createCareerSeason } from "../../src/career/season-state";
import { isCountryMain, mainCompetitionOf } from "../../src/world/countries";
import { generateDefaultBank } from "../../src/worldgen/generate";
import { completeHiddenAttributes } from "../../src/worldgen/hidden";
import { clubOfCountry, worldBank, worldState } from "./world-helpers";

describe("temporada de vários países (020 R2)", () => {
  const world = worldBank({ cup: true });

  it("a liga em foco é a principal do país do clube; as demais ficam em competitions, em ordem do banco", () => {
    for (const index of [0, 1, 2]) {
      const club = clubOfCountry(world, index);
      const seasons = createCareerSeason(world, { careerSeed: "s", focusClubId: club });
      if (!seasons.ok) throw new Error("falhou");
      const country = world.countries[index];
      expect(seasons.league.competitionId).toBe(mainCompetitionOf(world, country?.id ?? "")?.id);
      const ids = [
        seasons.league.competitionId,
        ...seasons.competitions.map((c) => c.competitionId),
      ];
      expect([...ids].sort()).toEqual(world.competitions.map((c) => c.id).sort());
      const others = seasons.competitions.map((entry) => entry.competitionId);
      expect(others).toEqual(
        world.competitions.map((c) => c.id).filter((id) => id !== seasons.league.competitionId),
      );
    }
  });

  it("o calendário único tem as rodadas de todas as competições de todos os países", () => {
    const state = worldState(world, "s", clubOfCountry(world, 1));
    const slots = state.calendar.days.flatMap((day) => day.slots.map((slot) => slot.competitionId));
    for (const competition of world.competitions) {
      expect(slots).toContain(competition.id);
    }
    const first = state.calendar.days[0]?.slots.map((slot) => slot.competitionId) ?? [];
    expect(first.filter((id) => isCountryMain(world, id))).toHaveLength(3);
  });

  it("as seeds das competições não dependem do país do técnico", () => {
    const seedsOf = (club: string) => {
      const seasons = createCareerSeason(world, { careerSeed: "s", focusClubId: club });
      if (!seasons.ok) throw new Error("falhou");
      return Object.fromEntries(
        [seasons.league, ...seasons.competitions].map((entry) => [entry.competitionId, entry.seed]),
      );
    };
    expect(seedsOf(clubOfCountry(world, 0))).toEqual(seedsOf(clubOfCountry(world, 2)));
  });

  it("o banco de um país é idêntico ao de antes (sem foco, foco no único país)", () => {
    const bank = completeHiddenAttributes(generateDefaultBank({ seed: "um-pais", cup: true }), "x");
    const legacy = createCareerSeason(bank, { careerSeed: "um-pais" });
    const focused = createCareerSeason(bank, {
      careerSeed: "um-pais",
      focusClubId: bank.clubs[5]?.id ?? "",
    });
    expect(JSON.stringify(focused)).toBe(JSON.stringify(legacy));
  });
});
