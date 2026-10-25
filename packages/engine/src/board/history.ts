import { clubDivision } from "../career/league";
import { currentPosition } from "./goals";
import type {
  BoardContext,
  BoardState,
  ManagerSeasonRecord,
  RoundRef,
  SeasonEvaluation,
  StintExit,
} from "./types";

/** Fecha a passagem atual do técnico (clube ou período sem clube). Altera o rascunho. */
export function closeStint(board: BoardState, at: RoundRef, exit?: StintExit): void {
  const current = board.history.stints.at(-1);
  if (!current || current.to) return;
  current.to = at;
  if (exit) current.exit = exit;
}

/** Abre uma passagem; `null` = período sem clube. Altera o rascunho. */
export function openStint(board: BoardState, clubId: string | null, at: RoundRef): void {
  board.history.stints.push({ clubId, from: at });
}

/**
 * Registro da temporada do técnico (US9): com avaliação quando ela existe; sem avaliação para o
 * clube deixado no meio da temporada; `clubId: null` para a temporada terminada sem clube.
 */
export function seasonRecord(
  context: Omit<BoardContext, "board">,
  board: BoardState,
  clubId: string | null,
  evaluation?: SeasonEvaluation,
): ManagerSeasonRecord {
  const base = {
    season: context.league.number,
    year: context.league.year,
    clubId,
    reputation: board.manager.reputation,
  };
  if (clubId === null) return { ...base, achievements: [] };
  const level = clubDivision(context.league, clubId)?.divisionLevel;
  return {
    ...base,
    ...(level !== undefined ? { level } : {}),
    position: evaluation?.sport.final ?? currentPosition(context, clubId),
    ...(evaluation
      ? {
          goals: {
            sportTier: evaluation.sport.tier,
            ...(evaluation.sport.competitionId
              ? { sportCompetitionId: evaluation.sport.competitionId }
              : {}),
            sportPosition: evaluation.sport.required,
            sportMet: evaluation.sport.met,
            financeKind: evaluation.finance.kind,
            financeMet: evaluation.finance.met,
          },
          decision: evaluation.decision,
          ...(evaluation.continental ? { continental: evaluation.continental } : {}),
        }
      : {}),
    achievements: evaluation?.achievements ?? [],
  };
}
