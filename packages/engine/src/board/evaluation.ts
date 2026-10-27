import { clubDivision, divisionZones } from "../career/league";
import type { Rng } from "../rng/xoshiro";
import { clubReputation, coachReputation } from "./coaches";
import { currentPosition, financeMet } from "./goals";
import { reputationDelta } from "./reputation";
import { boardRules } from "./rules";
import type { Achievement, BoardContext, SeasonEvaluation } from "./types";

/** O técnico do clube ainda está na carência (não pode ser demitido). */
export function inGrace(context: BoardContext, clubId: string, round: number): boolean {
  const rules = boardRules(context.world, context.league.competitionId);
  const season = context.league.number;
  const club = context.board.clubs[clubId];
  if (club && club.hired.season === season && round - club.hired.round < rules.graceRounds) {
    return true;
  }
  const grace = context.board.manager.graceUntil;
  return (
    context.board.manager.clubId === clubId &&
    grace !== undefined &&
    (season < grace.season || (season === grace.season && round <= grace.round))
  );
}

/**
 * Demissão no meio da temporada (R8): confiança no limite mínimo, fora da carência. Clubes da IA
 * ainda passam por um sorteio (`rng`), para espalhar as trocas. Ignora "sem demissão".
 */
export function shouldFireMidSeason(
  context: BoardContext,
  clubId: string,
  round: number,
  rng?: Rng,
): boolean {
  const rules = boardRules(context.world, context.league.competitionId);
  const club = context.board.clubs[clubId];
  if (!club || club.confidence > rules.fireThreshold || inGrace(context, clubId, round)) {
    return false;
  }
  if (context.board.manager.clubId === clubId || !rng) return true;
  return rng.int(1, 100) <= rules.aiFireChancePct;
}

function achievementsOf(context: BoardContext, clubId: string, final: number): Achievement[] {
  const season = clubDivision(context.league, clubId);
  if (!season) return [];
  const zones = divisionZones(context.world, context.league.competitionId, season.divisionLevel);
  const size = season.clubIds.length;
  const achievements: Achievement[] = [];
  if (final === 1) achievements.push("title");
  if (zones.promotion > 0 && final <= zones.promotion) achievements.push("promotion");
  if (zones.relegation > 0 && final > size - zones.relegation) achievements.push("relegation");
  return achievements;
}

/**
 * Avaliação de fim de temporada do clube (R8, R9), ou nada se o clube não tem metas da
 * temporada. "Sem demissão" só vale para o clube do jogador e vira `wouldFire`.
 */
export function evaluateSeason(
  context: BoardContext,
  clubId: string,
  round: number,
): SeasonEvaluation | undefined {
  const rules = boardRules(context.world, context.league.competitionId);
  const club = context.board.clubs[clubId];
  const goals = club?.goals;
  if (!club || !goals || goals.season !== context.league.number) return undefined;
  const final = currentPosition(context, clubId);
  const sportMet = final <= goals.sport.position;
  const missBy = Math.max(0, final - goals.sport.position);
  const metFinance = financeMet(context, clubId, goals);
  const finalConfidence = Math.min(
    100,
    Math.max(
      0,
      club.confidence +
        (sportMet
          ? rules.sportMetBonus
          : -Math.min(rules.missCap, missBy * rules.missPerPosition)) +
        (metFinance ? rules.financeMetBonus : -rules.financeMissPenalty),
    ),
  );
  const isManager = context.board.manager.clubId === clubId;
  const fire = finalConfidence < rules.endFireThreshold && !inGrace(context, clubId, round);
  const decision = !fire
    ? "kept"
    : isManager && context.board.manager.noFiring
      ? "wouldFire"
      : "fired";
  const achievements = achievementsOf(context, clubId, final);
  if (goals.continental?.champion) achievements.push("continentalTitle");
  const reputation = coachReputation(context.board, context.world, clubId);
  const levels = context.league.divisions.map((season) => season.divisionLevel);
  const level = clubDivision(context.league, clubId)?.divisionLevel;
  const delta = reputationDelta(rules, {
    reputation,
    clubReputation: clubReputation(context.world, clubId),
    sportMet,
    missBy: sportMet
      ? 0
      : Math.max(0, final - Math.max(goals.sport.position, goals.sport.expectation)),
    overBy: Math.max(0, goals.sport.expectation - final),
    financeMet: metFinance,
    achievements,
    topDivision: level === Math.min(...levels),
    fired: decision === "fired",
  });
  return {
    ...(goals.continental ? { continental: goals.continental } : {}),
    ...(goals.regional ? { regional: goals.regional } : {}),
    season: context.league.number,
    clubId,
    sport: {
      tier: goals.sport.tier,
      required: goals.sport.position,
      final,
      met: sportMet,
      ...(goals.sport.competitionId ? { competitionId: goals.sport.competitionId } : {}),
    },
    finance: { kind: goals.finance.kind, met: metFinance },
    finalConfidence,
    decision,
    reputationBefore: reputation,
    reputationAfter: reputation + delta,
    achievements,
  };
}
