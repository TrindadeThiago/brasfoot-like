import type { Competition, CompletedBank, Country } from "../model/types";

/** O que as consultas de países leem do banco; serve a `ModPackage` e a `CompletedBank`. */
type Competitions = Pick<CompletedBank, "competitions">;
type Clubs = Pick<CompletedBank, "competitions" | "clubs" | "countries">;

/**
 * Competição principal do país (020 R1): a primeira competição do banco com aquele `countryId`
 * que não é regional (023 R1: o estadual nunca é a principal, qualquer que seja a ordem no banco).
 * Dela vêm as regras do país (economia, mercado, diretoria, torcida, manchetes, condição física).
 */
export function mainCompetitionOf(world: Competitions, countryId: string): Competition | undefined {
  return world.competitions.find(
    (competition) => competition.countryId === countryId && competition.regional === undefined,
  );
}

/** As competições principais, uma por país, na ordem do banco. */
export function mainCompetitions(world: Competitions): Competition[] {
  const seen = new Set<string>();
  const mains: Competition[] = [];
  for (const competition of world.competitions) {
    // Competição entre países (022) não é a principal de nenhum país.
    if (competition.countryId === undefined || seen.has(competition.countryId)) continue;
    // O estadual (023) não é a principal do país: a liga dele vem depois na lista.
    if (competition.regional !== undefined) continue;
    seen.add(competition.countryId);
    mains.push(competition);
  }
  return mains;
}

/** A competição é a principal do país dela (e não uma copa ou outra secundária)? */
export function isCountryMain(world: Competitions, competitionId: string): boolean {
  const competition = world.competitions.find((entry) => entry.id === competitionId);
  return (
    competition?.countryId !== undefined &&
    mainCompetitionOf(world, competition.countryId) === competition
  );
}

export function countryOf(
  world: Pick<CompletedBank, "clubs" | "countries">,
  clubId: string,
): Country | undefined {
  const club = world.clubs.find((entry) => entry.id === clubId);
  return club ? world.countries.find((country) => country.id === club.countryId) : undefined;
}

/**
 * Competição principal cujas regras valem num jogo (022 R1): a do país da competição; numa
 * competição entre países, a do país do mandante.
 */
export function matchRulesCompetition(
  world: Clubs,
  competitionId: string,
  homeClubId: string,
): Competition {
  const competition = world.competitions.find((entry) => entry.id === competitionId);
  const main =
    competition?.countryId !== undefined
      ? mainCompetitionOf(world, competition.countryId)
      : undefined;
  return main ?? rulesCompetitionOf(world, homeClubId);
}

/**
 * Competição de onde vêm as regras do clube: a principal do país dele; clube sem país ou país sem
 * competição usa a primeira competição do banco.
 */
export function rulesCompetitionOf(world: Clubs, clubId: string): Competition {
  const club = world.clubs.find((entry) => entry.id === clubId);
  const main = club ? mainCompetitionOf(world, club.countryId) : undefined;
  const fallback = main ?? world.competitions[0];
  if (!fallback) throw new Error("banco sem competições");
  return fallback;
}
