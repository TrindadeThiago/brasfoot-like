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
  const at = { season: league.number, round: playedRounds(league) };
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
  addLeagueClubs(
    board,
    world,
    league,
    finances,
    rules,
    createRng(`${careerSeed}:board:create:${league.number}`),
  );
  return board;
}

/** Diretorias e técnicos da IA dos clubes de uma liga, no quadro `board`. Altera `board`. */
function addLeagueClubs(
  board: BoardState,
  world: CompletedBank,
  league: LeagueSeason,
  finances: FinanceState,
  rules: ReturnType<typeof boardRules>,
  rng: ReturnType<typeof createRng>,
): void {
  const at = { season: league.number, round: playedRounds(league) };
  const over = isLeagueSeasonOver(league);
  const managerClubId = board.manager.clubId;
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
}

/**
 * Acrescenta ao quadro as diretorias e os técnicos da IA dos clubes de outra liga principal
 * (020): o mundo com vários países tem uma diretoria por clube de todos os países. Não altera a
 * entrada.
 */
export function extendBoard(
  board: BoardState,
  world: CompletedBank,
  league: LeagueSeason,
  finances: FinanceState,
  careerSeed: string,
): BoardState {
  const next = JSON.parse(JSON.stringify(board)) as BoardState;
  const rules = boardRules(world, league.competitionId);
  const rng = createRng(`${careerSeed}:board:create:${league.number}:${league.competitionId}`);
  addLeagueClubs(next, world, league, finances, rules, rng);
  return next;
}

/** Clube do jogador para as chamadas do motor: `""` quando desempregado (research.md R3). */
export function managerClubOf(board: BoardState): string {
  return board.manager.clubId ?? "";
}
