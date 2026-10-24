import type { CompletedBank } from "../model/types";

/** Jogadores do elenco do clube com nacionalidade diferente da do clube (emprestados incluídos). */
export function foreignCount(world: CompletedBank, clubId: string): number {
  const club = world.clubs.find((entry) => entry.id === clubId);
  if (!club) return 0;
  return world.players.filter(
    (player) => player.clubId === clubId && player.nationalityId !== club.countryId,
  ).length;
}

/** O clube pode receber mais um estrangeiro? Sem limite declarado no país, sempre. */
export function canSignForeign(world: CompletedBank, clubId: string): boolean {
  const club = world.clubs.find((entry) => entry.id === clubId);
  const limit = world.countries.find((country) => country.id === club?.countryId)?.rules
    ?.foreignLimit;
  return limit === undefined || foreignCount(world, clubId) < limit;
}
