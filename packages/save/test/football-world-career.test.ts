import {
  DEFAULT_PROFILE,
  generateFootballWorld,
  isRegionalOnly,
  type ModPackage,
  regionalCompetitionOf,
} from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import { advanceCareerSeason, createSave, isCareerSeasonOver, type SaveFile } from "../src";
import { playDay } from "./fixtures";

// 024 (T036, T037): carreira no mundo compacto, de ponta a ponta no pacote de save.
const NOW = "2026-10-27T00:00:00.000Z";
const bank = structuredClone(
  generateFootballWorld(DEFAULT_PROFILE, "carreira-mundo"),
) as ModPackage;

function career(clubId: string): SaveFile {
  const created = createSave({
    id: "mundo",
    now: NOW,
    managerName: "Ana",
    clubId,
    seed: "carreira-mundo",
    defaultBank: bank,
    noFiring: true,
  });
  if (!created.ok) throw new Error(JSON.stringify(created.error));
  return created.save;
}

function playSeason(start: SaveFile): SaveFile {
  let save = start;
  while (!isCareerSeasonOver(save)) save = playDay(save);
  return save;
}

/** Clube da confederação que está na competição continental principal dela, no país dado. */
function continentalClub(countryId: string, confederation: string): string {
  const major = bank.competitions.find(
    (entry) => entry.id === `continental-${confederation}-maior`,
  );
  const ids = new Set(major?.divisions[0]?.clubIds ?? []);
  const club = bank.clubs.find((entry) => entry.countryId === countryId && ids.has(entry.id));
  if (!club) throw new Error(`sem clube de ${countryId} na ${confederation}`);
  return club.id;
}

describe("carreira no mundo compacto (024 US1)", () => {
  it("um clube brasileiro joga estadual, liga, copa e continental na mesma temporada", () => {
    const clubId = continentalClub("brasil", "conmebol");
    const save = career(clubId);
    expect(save.league.competitionId).toBe("liga-bra");
    const ids = [save.league, ...save.competitions].map((league) => league.competitionId);
    const estadual = regionalCompetitionOf(save.bank, clubId);
    expect(ids).toEqual(
      expect.arrayContaining(["copa-bra", estadual?.id, "continental-conmebol-maior"]),
    );
    const end = playSeason(save);
    const turned = advanceCareerSeason(end, NOW);
    if (!turned.ok) throw new Error(JSON.stringify(turned));
    expect(turned.save.league.number).toBe(2);
    expect(turned.save.regionalHistory?.length).toBeGreaterThan(0);
    expect(turned.save.continentalHistory?.length).toBeGreaterThan(0);
  }, 900_000);

  it("clube só regional não é escolhível", () => {
    const regional = bank.clubs.find((club) => isRegionalOnly(bank, club.id));
    expect(regional).toBeDefined();
    const created = createSave({
      id: "x",
      now: NOW,
      managerName: "Ana",
      clubId: regional?.id ?? "",
      seed: "x",
      defaultBank: bank,
    });
    expect(created.ok).toBe(false);
  });
});

describe("carreira em outros continentes (024 US1)", () => {
  it.each([
    ["inglaterra", "uefa"],
    ["egito", "caf"],
    ["japao", "afc"],
  ])(
    "um clube de %s joga liga, copa e a continental da %s",
    (country, confederation) => {
      const clubId = continentalClub(country, confederation);
      const save = career(clubId);
      const ids = [save.league, ...save.competitions].map((league) => league.competitionId);
      expect(ids).toContain(`continental-${confederation}-maior`);
      const end = playSeason(save);
      const turned = advanceCareerSeason(end, NOW);
      if (!turned.ok) throw new Error(JSON.stringify(turned));
      expect(
        turned.save.continentalHistory?.some(
          (entry) => entry.competitionId === `continental-${confederation}-maior`,
        ),
      ).toBe(true);
    },
    900_000,
  );
});
