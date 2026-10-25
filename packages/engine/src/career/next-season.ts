import { managerClubOf } from "../board/create";
import type { QualificationRecord } from "../qualification/types";
import type { CareerSeasonState } from "./season-state";
import { seasonTurnover } from "./turnover";
import type { SeasonHistoryEntry, TurnoverResult } from "./types";

/** Histórico acumulado da carreira, fora do estado da temporada (liga do técnico, outras ligas e copas). */
export interface CareerHistory {
  history: SeasonHistoryEntry[];
  competitionHistory: SeasonHistoryEntry[];
  cupHistory: NonNullable<Extract<TurnoverResult, { ok: true }>["cupHistory"]>;
  /** Classificações entre competições, uma por temporada (021). */
  qualificationHistory?: QualificationRecord[];
}

export const EMPTY_HISTORY: CareerHistory = { history: [], competitionHistory: [], cupHistory: [] };

export type NextSeason =
  | { ok: true; state: CareerSeasonState; history: CareerHistory }
  | { ok: false; error: Extract<TurnoverResult, { ok: false }>["error"] };

/**
 * Vira a temporada de uma carreira encerrada (`isCalendarOver`) e devolve o estado da próxima, no
 * primeiro dia, com a condição física zerada (017 FR-022). Pura: simulações e testes usam o mesmo
 * caminho do save.
 */
export function startNextSeason(
  end: CareerSeasonState,
  careerSeed: string,
  history: CareerHistory = EMPTY_HISTORY,
  managerClubId?: string,
): NextSeason {
  const turned = seasonTurnover(end.league, end.world, history.history, {
    careerSeed,
    finances: end.finances,
    managerClubId: managerClubId ?? (end.board ? managerClubOf(end.board) : ""),
    ...(end.renewal ? { renewal: end.renewal } : {}),
    ...(end.market ? { market: end.market } : {}),
    ...(end.board ? { board: end.board } : {}),
    ...(end.fans ? { fans: end.fans } : {}),
    ...(end.news ? { news: end.news } : {}),
    competitions: end.competitions,
    calendar: end.calendar,
    competitionHistory: history.competitionHistory,
    cupHistory: history.cupHistory,
    ...(history.qualificationHistory ? { qualificationHistory: history.qualificationHistory } : {}),
  });
  if (!turned.ok) return turned;
  return {
    ok: true,
    state: {
      league: turned.league,
      competitions: turned.competitions ?? [],
      calendar: turned.calendar ?? end.calendar,
      fitness: { players: {} },
      finances: turned.finances ?? end.finances,
      world: turned.world,
      ...(turned.renewal
        ? { renewal: turned.renewal }
        : end.renewal
          ? { renewal: end.renewal }
          : {}),
      ...(turned.market ? { market: turned.market } : end.market ? { market: end.market } : {}),
      ...(turned.board ? { board: turned.board } : end.board ? { board: end.board } : {}),
      ...(turned.fans ? { fans: turned.fans } : end.fans ? { fans: end.fans } : {}),
      ...(turned.news ? { news: turned.news } : end.news ? { news: end.news } : {}),
    },
    history: {
      history: turned.history,
      competitionHistory: turned.competitionHistory ?? history.competitionHistory,
      cupHistory: turned.cupHistory ?? history.cupHistory,
      ...((turned.qualificationHistory ?? history.qualificationHistory)
        ? { qualificationHistory: turned.qualificationHistory ?? history.qualificationHistory }
        : {}),
    },
  };
}
