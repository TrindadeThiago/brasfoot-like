import type { Competition, ModPackage } from "../model/types";

/**
 * Competição entre países (022 R1): sem `countryId`. Nunca é a principal de um país; as regras
 * econômicas vêm do país de cada clube.
 */
export function isInternational(competition: Pick<Competition, "countryId">): boolean {
  return competition.countryId === undefined;
}

/** A competição do id existe e é entre países? */
export function isInternationalCompetition(
  world: Pick<ModPackage, "competitions">,
  competitionId: string,
): boolean {
  const competition = world.competitions.find((entry) => entry.id === competitionId);
  return competition !== undefined && isInternational(competition);
}

/** As competições entre países do banco, na ordem do banco. */
export function internationalCompetitions(world: Pick<ModPackage, "competitions">): Competition[] {
  return world.competitions.filter(isInternational);
}

/** Países dos clubes da competição, na ordem do banco, sem repetição. */
export function participantCountries(
  world: Pick<ModPackage, "competitions" | "clubs" | "countries">,
  competitionId: string,
): string[] {
  const competition = world.competitions.find((entry) => entry.id === competitionId);
  if (!competition) return [];
  const clubs = new Set(competition.divisions.flatMap((division) => division.clubIds));
  const present = new Set(
    world.clubs.filter((club) => clubs.has(club.id)).map((club) => club.countryId),
  );
  return world.countries.map((country) => country.id).filter((id) => present.has(id));
}
