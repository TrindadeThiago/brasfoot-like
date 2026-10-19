import { createLeagueSeason } from "../../src/career/league";
import { advanceLeague } from "../../src/career/league-round";
import type { LeagueSeason, LeagueSeasonOptions } from "../../src/career/types";
import type { CompletedBank } from "../../src/model/types";
import type { Fixture, MatchRecord } from "../../src/season/types";
import { testWorld } from "../season/helpers/world";

export { testWorld };

export function competitionId(world: CompletedBank = testWorld()): string {
  const competition = world.competitions[0];
  if (!competition) throw new Error("sem competição");
  return competition.id;
}

/** Clubes de um nível no banco. */
export function bankDivision(level: number, world: CompletedBank = testWorld()): string[] {
  const division = world.competitions[0]?.divisions.find((entry) => entry.level === level);
  if (!division) throw new Error(`sem divisão ${level}`);
  return [...division.clubIds];
}

export function newLeague(
  careerSeed: string,
  options: Partial<LeagueSeasonOptions> = {},
  world: CompletedBank = testWorld(),
): LeagueSeason {
  const result = createLeagueSeason(world, {
    competitionId: competitionId(world),
    careerSeed,
    ...options,
  });
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.league;
}

const played = new Map<string, LeagueSeason>();

/** Liga da primeira temporada jogada até o fim (memorizada por seed). */
export function playedLeague(careerSeed: string): LeagueSeason {
  const league = played.get(careerSeed);
  if (!league) {
    const result = advanceLeague(newLeague(careerSeed), testWorld(), { toEnd: true });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    played.set(careerSeed, result.league);
    return result.league;
  }
  return league;
}

/** Cópia do mundo de teste com uma edição (o original nunca muda). */
export function editedWorld(edit: (world: CompletedBank) => void): CompletedBank {
  const copy = JSON.parse(JSON.stringify(testWorld())) as CompletedBank;
  edit(copy);
  return copy;
}

const NO_STATS = {
  shots: 0,
  shotsOnTarget: 0,
  possession: 50,
  yellowCards: 0,
  redCards: 0,
  penalties: 0,
  penaltiesScored: 0,
};

/**
 * Liga encerrada com placares sintéticos (sem simular partidas): `score` decide cada jogo do
 * calendário. Útil para forçar empates e mundos com outras divisões.
 */
export function finishedLeague(
  league: LeagueSeason,
  score: (fixture: Fixture) => [number, number],
): LeagueSeason {
  return {
    ...league,
    divisions: league.divisions.map((season) => ({
      ...season,
      nextRound: season.calendar.length + 1,
      records: season.calendar.flatMap((round) =>
        round.fixtures.map((fixture): MatchRecord => {
          const [home, away] = score(fixture);
          return {
            round: round.number,
            home: fixture.home,
            away: fixture.away,
            score: { home, away },
            outcome: "finished",
            events: [],
            stats: { home: { ...NO_STATS }, away: { ...NO_STATS } },
            players: {},
            unavailable: { home: [], away: [] },
          };
        }),
      ),
    })),
  };
}

/** Mundo de teste com três divisões (14/13/13) e vagas 2↕2 e 3↕3. */
export function threeDivisionWorld(): CompletedBank {
  return editedWorld((world) => {
    const competition = world.competitions[0];
    if (!competition) return;
    const clubs = competition.divisions.flatMap((division) => division.clubIds);
    const base = competition.divisions[0];
    if (!base) return;
    competition.divisions = [
      {
        ...base,
        level: 1,
        name: "Primeira",
        clubIds: clubs.slice(0, 14),
        promotionSlots: 0,
        relegationSlots: 2,
      },
      {
        ...base,
        level: 2,
        name: "Segunda",
        clubIds: clubs.slice(14, 27),
        promotionSlots: 2,
        relegationSlots: 3,
      },
      {
        ...base,
        level: 3,
        name: "Terceira",
        clubIds: clubs.slice(27),
        promotionSlots: 3,
        relegationSlots: 0,
      },
    ];
  });
}

/** Mundo de teste com uma divisão só (os 20 clubes da Série A). */
export function singleDivisionWorld(): CompletedBank {
  return editedWorld((world) => {
    const competition = world.competitions[0];
    const top = competition?.divisions.find((division) => division.level === 1);
    if (competition && top) competition.divisions = [{ ...top, relegationSlots: 0 }];
  });
}
