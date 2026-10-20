import { isLeagueSeasonOver } from "../career/league";
import { createRng } from "../rng/xoshiro";
import {
  clubReputation,
  coachOf,
  coachReputation,
  hireCoach,
  nextId,
  releaseCoach,
} from "./coaches";
import { confidenceChange } from "./confidence";
import { evaluateSeason, shouldFireMidSeason } from "./evaluation";
import { closeStint, openStint, seasonRecord } from "./history";
import { considerVacancies, expireOffers, pruneOffers } from "./offers";
import { reputationDelta } from "./reputation";
import { boardRules } from "./rules";
import type { BoardContext, BoardState, BoardUpdate, RoundRef } from "./types";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function scopeOf(context: BoardContext) {
  return {
    world: context.world,
    league: context.league,
    finances: context.finances,
    careerSeed: context.careerSeed,
  };
}

function openVacancy(board: BoardState, clubId: string, at: RoundRef): void {
  if (board.vacancies.some((vacancy) => vacancy.clubId === clubId)) return;
  board.vacancies.push({
    id: nextId(board, "vacancy"),
    clubId,
    season: at.season,
    round: at.round,
    considered: false,
  });
}

/** Jogador perde o clube (demissão): passagem fechada, vaga aberta, aviso. Altera o rascunho. */
export function fireManager(
  board: BoardState,
  at: RoundRef,
  reputationAfter: number,
): string | undefined {
  const clubId = board.manager.clubId;
  if (clubId === null) return undefined;
  board.manager.reputation = reputationAfter;
  board.manager.clubId = null;
  board.manager.firedBy = { clubId, season: at.season };
  delete board.manager.hired;
  delete board.manager.graceUntil;
  const club = board.clubs[clubId];
  if (club) club.recent = [];
  closeStint(board, at, "fired");
  openStint(board, null, at);
  openVacancy(board, clubId, at);
  board.notice = { kind: "fired", clubId, ...at };
  return clubId;
}

/** Técnico da IA demitido: reputação revista, vai para o pool, vaga aberta. Altera o rascunho. */
function fireCoach(board: BoardState, context: BoardContext, clubId: string, at: RoundRef): void {
  const rules = boardRules(context.world, context.league.competitionId);
  const coach = coachOf(board, clubId);
  if (!coach) return;
  coach.reputation += reputationDelta(rules, {
    reputation: coach.reputation,
    clubReputation: clubReputation(context.world, clubId),
    fired: true,
  });
  releaseCoach(board, coach.id, rules.maxFreeCoaches);
  openVacancy(board, clubId, at);
}

/**
 * Diretoria depois de uma rodada fechada (research.md R2): confiança de todos os clubes,
 * demissões, avaliação quando a liga termina, vagas preenchidas pela IA, propostas ao jogador e
 * expirações. Clubes em ordem de id; não altera a entrada.
 */
export function boardAfterRound(context: BoardContext, round: number): BoardUpdate {
  const rules = boardRules(context.world, context.league.competitionId);
  const board = clone(context.board);
  const season = context.league.number;
  const at = { season, round };
  const seed = `${context.careerSeed}:board:${season}:${round}`;
  const clubIds = Object.keys(board.clubs).sort();
  const managerClubId = board.manager.clubId;

  for (const clubId of clubIds) {
    const club = board.clubs[clubId];
    if (!club || (club.coachId === null && clubId !== managerClubId)) continue;
    const reputation = coachReputation(board, context.world, clubId);
    const change = confidenceChange({ ...context, board }, clubId, round, reputation);
    club.confidence = change.value;
    if (clubId === managerClubId) {
      club.recent = [...club.recent, change].slice(-rules.keepRecent);
    }
  }

  let managerReleased: string | undefined;
  const live = { ...context, board };
  if (isLeagueSeasonOver(context.league)) {
    for (const clubId of clubIds) {
      const club = board.clubs[clubId];
      if (!club || (club.coachId === null && clubId !== managerClubId)) continue;
      const evaluation = evaluateSeason(live, clubId, round);
      if (!evaluation) continue;
      club.confidence = evaluation.finalConfidence;
      if (clubId === managerClubId) {
        board.evaluation = evaluation;
        board.manager.reputation = evaluation.reputationAfter;
        board.history.seasons.push(seasonRecord(context, board, clubId, evaluation));
        if (evaluation.decision === "fired") {
          managerReleased = fireManager(board, at, evaluation.reputationAfter);
        }
        continue;
      }
      const coach = coachOf(board, clubId);
      if (!coach) continue;
      coach.reputation = evaluation.reputationAfter;
      if (evaluation.decision === "fired") {
        releaseCoach(board, coach.id, rules.maxFreeCoaches);
        openVacancy(board, clubId, at);
      }
    }
    if (managerClubId === null) board.history.seasons.push(seasonRecord(context, board, null));
    considerVacancies(board, scopeOf(context), createRng(`${seed}:offers`));
  } else {
    for (const clubId of clubIds) {
      const club = board.clubs[clubId];
      if (!club) continue;
      if (clubId === managerClubId) {
        if (board.manager.noFiring || !shouldFireMidSeason(live, clubId, round)) continue;
        const delta = reputationDelta(rules, {
          reputation: board.manager.reputation,
          clubReputation: clubReputation(context.world, clubId),
          fired: true,
        });
        board.history.seasons.push(seasonRecord(context, board, clubId));
        managerReleased = fireManager(board, at, board.manager.reputation + delta);
        continue;
      }
      if (club.coachId === null) continue;
      if (shouldFireMidSeason(live, clubId, round, createRng(`${seed}:fire:${clubId}`))) {
        fireCoach(board, context, clubId, at);
      }
    }
    expireOffers(board, season, round);
    const scope = scopeOf(context);
    const waiting = [...board.vacancies]
      .filter(
        (vacancy) =>
          vacancy.offerId === undefined &&
          vacancy.considered &&
          (vacancy.season < season || round - vacancy.round >= rules.vacancyRounds),
      )
      .sort((a, b) => (a.clubId < b.clubId ? -1 : a.clubId > b.clubId ? 1 : 0));
    for (const vacancy of waiting) {
      hireCoach(board, scope, vacancy.clubId, createRng(`${seed}:hire:${vacancy.clubId}`));
    }
    considerVacancies(board, scope, createRng(`${seed}:offers`));
  }
  pruneOffers(board, season);
  return { board, ...(managerReleased ? { managerReleased } : {}) };
}
