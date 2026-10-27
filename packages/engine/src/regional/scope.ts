import type { Competition, CompletedBank, Division } from "../model/types";

type Competitions = Pick<CompletedBank, "competitions">;
type WithClubs = Pick<CompletedBank, "competitions" | "clubs">;

/**
 * Competição regional, o estadual (023 R1): tem o bloco `regional`. Tem `countryId`, mas nunca é a
 * principal do país; as regras do país continuam vindo da principal.
 */
export function isRegional(competition: Pick<Competition, "regional">): boolean {
  return competition.regional !== undefined;
}

/** Os estaduais do banco, na ordem do banco; com `countryId`, só os daquele país. */
export function regionalCompetitions(world: Competitions, countryId?: string): Competition[] {
  return world.competitions.filter(
    (competition) =>
      isRegional(competition) && (countryId === undefined || competition.countryId === countryId),
  );
}

/** Estadual da região do clube, no país dele; nada se o país não declara estadual para a região. */
export function regionalCompetitionOf(world: WithClubs, clubId: string): Competition | undefined {
  const club = world.clubs.find((entry) => entry.id === clubId);
  if (!club || club.region === undefined) return undefined;
  return regionalCompetitions(world, club.countryId).find(
    (competition) => competition.regional?.region === club.region,
  );
}

/** Divisão do estadual em que o clube está; nada se ele não joga a competição. */
export function regionalDivisionOf(
  competition: Pick<Competition, "divisions">,
  clubId: string,
): Division | undefined {
  return competition.divisions.find((division) => division.clubIds.includes(clubId));
}

/**
 * Clube regional (023 R4): está numa divisão de estadual e em nenhuma divisão de competição não
 * regional. É derivado do banco, sem campo próprio: sobe de nível sozinho quando ganha uma vaga.
 */
export function isRegionalOnly(world: Competitions, clubId: string): boolean {
  let regional = false;
  for (const competition of world.competitions) {
    if (!competition.divisions.some((division) => division.clubIds.includes(clubId))) continue;
    if (!isRegional(competition)) return false;
    regional = true;
  }
  return regional;
}
