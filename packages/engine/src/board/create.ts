import { isLeagueSeasonOver, leagueTotalRounds } from "../career/league";
import type { LeagueSeason } from "../career/types";
import type { FinanceState } from "../finance/types";
import type { CompletedBank } from "../model/types";
import { createRng } from "../rng/xoshiro";
import { generateCoach } from "./coaches";
import { playedRounds, seasonGoals } from "./goals";
import { boardRules } from "./rules";
import type { BoardState } from "./types";

export interface CreateBoardManager {
  clubId: string;
  noFiring: boolean;
  reputation?: number;
  /** Carência até o fim da temporada atual (saves migrados, research.md R12). */
  graceToSeasonEnd?: boolean;
}

/**
 * Diretorias de todos os clubes da competição, técnicos da IA e metas da temporada atual (com a
 * regra de meio de temporada se ela já começou; nenhuma se já terminou). Sem `manager`, todos os
 * clubes são da IA (simulações).
 */
export function createBoard(
  world: CompletedBank,
  league: LeagueSeason,
  finances: FinanceState,
  careerSeed: string,
  manager?: CreateBoardManager,
): BoardState {
  const rules = boardRules(world, league.competitionId);
  const played = playedRounds(league);
  const at = { season: league.number, round: played };
  const over = isLeagueSeasonOver(league);
  const managerClubId = manager?.clubId ?? null;
  const board: BoardState = {
    manager: {
      reputation: manager?.reputation ?? rules.initialReputation,
      noFiring: manager?.noFiring ?? false,
      clubId: managerClubId,
      hired: at,
      ...(manager?.graceToSeasonEnd
        ? { graceUntil: { season: league.number, round: leagueTotalRounds(league) } }
        : {}),
    },
    clubs: {},
    coaches: [],
    vacancies: [],
    offers: [],
    history: { stints: [{ clubId: managerClubId, from: at }], seasons: [] },
    nextSeq: 1,
  };
  const rng = createRng(`${careerSeed}:board:create:${league.number}`);
  const context = { world, league, finances };
  const clubIds = league.divisions.flatMap((season) => season.clubIds).sort();
  for (const clubId of clubIds) {
    const isManager = clubId === managerClubId;
    const coach = isManager
      ? undefined
      : generateCoach(board, world, clubId, rng.fork(clubId), rules.coachSpread);
    if (coach) coach.clubId = clubId;
    const reputation = isManager ? board.manager.reputation : (coach?.reputation ?? 1);
    board.clubs[clubId] = {
      clubId,
      coachId: coach?.id ?? null,
      ...(over ? {} : { goals: seasonGoals(context, clubId, reputation, { midSeason: true }) }),
      confidence: rules.neutral,
      hired: at,
      recent: [],
    };
  }
  return board;
}

/** Clube do jogador para as chamadas do motor: `""` quando desempregado (research.md R3). */
export function managerClubOf(board: BoardState): string {
  return board.manager.clubId ?? "";
}
