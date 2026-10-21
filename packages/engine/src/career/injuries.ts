import type { CompletedBank } from "../model/types";
import type { PlayerStatus, Season } from "../season/types";
import { clubDivision } from "./league";
import type { LeagueSeason } from "./types";

function injuryIn(league: LeagueSeason, clubId: string, playerId: string): number {
  return clubDivision(league, clubId)?.status[playerId]?.injury ?? 0;
}

/**
 * Lesões valem para todas as competições (017 R6): copia o tempo de lesão dos jogadores dos
 * `clubIds` de `from` para `to`, que guarda a própria situação de cartões. Devolve `to` sem
 * alterar a entrada (e o mesmo objeto, se nada mudou).
 */
export function syncInjuries(
  from: LeagueSeason,
  to: LeagueSeason,
  world: Pick<CompletedBank, "players">,
  clubIds: ReadonlySet<string>,
): LeagueSeason {
  const changes = new Map<number, Record<string, PlayerStatus>>();
  for (const player of world.players) {
    if (!clubIds.has(player.clubId)) continue;
    const season = clubDivision(to, player.clubId);
    if (!season) continue;
    const injury = injuryIn(from, player.clubId, player.id);
    const current = changes.get(season.divisionLevel)?.[player.id] ?? season.status[player.id];
    if ((current?.injury ?? 0) === injury) continue;
    const status = changes.get(season.divisionLevel) ?? { ...season.status };
    status[player.id] = { yellows: 0, suspension: 0, ...current, injury };
    changes.set(season.divisionLevel, status);
  }
  if (changes.size === 0) return to;
  return {
    ...to,
    divisions: to.divisions.map((season) => {
      const status = changes.get(season.divisionLevel);
      return status ? { ...season, status } : season;
    }),
  };
}

/** Clubes que jogam a rodada `round` da competição. */
export function clubsInRound(league: LeagueSeason, round: number): Set<string> {
  const clubs = new Set<string>();
  for (const season of league.divisions) {
    for (const fixture of season.calendar[round - 1]?.fixtures ?? []) {
      clubs.add(fixture.home);
      clubs.add(fixture.away);
    }
  }
  return clubs;
}

/**
 * A `Season` do clube numa competição com as lesões da principal aplicadas (017 R6), para
 * conferir quem pode ser escalado no próximo jogo dele nela.
 */
export function availabilitySeason(
  principal: LeagueSeason,
  league: LeagueSeason,
  world: Pick<CompletedBank, "players">,
  clubId: string,
): Season | undefined {
  const synced =
    league.competitionId === principal.competitionId
      ? league
      : syncInjuries(principal, league, world, new Set([clubId]));
  return clubDivision(synced, clubId);
}
