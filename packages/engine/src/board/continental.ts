import type { LeagueSeason } from "../career/types";
import { reachedAtLeast, reachedByClub } from "../continental/reached";
import { campaignStatuses } from "../continental/status";
import type { Reached } from "../continental/types";
import type { CompletedBank } from "../model/types";
import { rulesCompetitionOf } from "../world/countries";
import { boardRules } from "./rules";
import type { BoardContext, BoardState, ConfidenceFactor, SeasonGoals } from "./types";

/**
 * Meta continental da diretoria (022 R6): o clube que disputa uma competição entre países recebe,
 * além da meta de liga, uma fase a alcançar, pelo tercil da reputação entre os participantes. A
 * meta é avaliada quando a campanha do clube termina (eliminação ou título).
 */

type ContinentalGoal = NonNullable<SeasonGoals["continental"]>;

/** Competições entre países da carreira, na ordem do banco, com a temporada de cada uma. */
function internationalSeasons(
  world: Pick<CompletedBank, "competitions">,
  leagues: readonly LeagueSeason[],
): LeagueSeason[] {
  return world.competitions.flatMap((competition) =>
    competition.countryId === undefined
      ? leagues.filter((league) => league.competitionId === competition.id)
      : [],
  );
}

/** Etapa do mata-mata final e quantas fases ele tem; a primeira etapa de pontos. */
function shapeOf(league: LeagueSeason): { knockout: number; phases: number; points: number } {
  const season = league.divisions[0];
  const stages = season?.stages ?? [];
  if (stages.length === 0) {
    return { knockout: 1, phases: season?.bracket?.phases.length ?? 1, points: 1 };
  }
  const knockout = [...stages].reverse().find((stage) => stage.kind === "knockout");
  const points = stages.find((stage) => stage.kind !== "knockout");
  return {
    knockout: (knockout?.index ?? stages.length - 1) + 1,
    phases: knockout?.bracket?.phases.length ?? 1,
    points: (points?.index ?? 0) + 1,
  };
}

export function continentalGoal(
  world: CompletedBank,
  leagues: readonly LeagueSeason[],
  clubId: string,
): ContinentalGoal | undefined {
  for (const league of internationalSeasons(world, leagues)) {
    const clubs = league.divisions[0]?.clubIds ?? [];
    if (!clubs.includes(clubId)) continue;
    const reputation = (id: string) => world.clubs.find((club) => club.id === id)?.reputation ?? 0;
    const ranked = [...clubs].sort((a, b) => reputation(b) - reputation(a) || (a < b ? -1 : 1));
    const position = ranked.indexOf(clubId) + 1;
    const rules = boardRules(world, rulesCompetitionOf(world, clubId).id);
    const shape = shapeOf(league);
    const target: Reached =
      position * 100 <= rules.continentalTopPct * clubs.length
        ? { stage: shape.knockout, phase: Math.max(1, shape.phases - 1) }
        : position * 100 <= rules.continentalMidPct * clubs.length
          ? { stage: shape.knockout }
          : { stage: shape.points };
    return { competitionId: league.competitionId, target };
  }
  return undefined;
}

export function evaluateContinental(
  goal: Pick<ContinentalGoal, "target">,
  reached: Reached | undefined,
): "met" | "missed" {
  return reached && reachedAtLeast(reached, goal.target) ? "met" : "missed";
}

/** Dá a meta continental aos clubes da diretoria que disputam a competição. Não altera a entrada. */
export function withContinentalGoals(
  board: BoardState,
  world: CompletedBank,
  leagues: readonly LeagueSeason[],
): BoardState {
  if (internationalSeasons(world, leagues).length === 0) return board;
  const next = JSON.parse(JSON.stringify(board)) as BoardState;
  for (const clubId of Object.keys(next.clubs).sort()) {
    const club = next.clubs[clubId];
    if (!club?.goals) continue;
    const goal = continentalGoal(world, leagues, clubId);
    if (goal) club.goals.continental = goal;
    else delete club.goals.continental;
  }
  return next;
}

/**
 * Fecha a meta continental dos clubes cuja campanha terminou hoje: grava a fase alcançada e o
 * resultado e move a confiança (só a do técnico entra em `recent`). Não altera a entrada.
 */
export function boardAfterContinental(
  context: BoardContext,
  leagues: readonly LeagueSeason[],
  round: number,
): BoardState {
  const seasons = internationalSeasons(context.world, leagues);
  if (seasons.length === 0) return context.board;
  let board: BoardState | undefined;
  for (const league of seasons) {
    const season = league.divisions[0];
    if (!season) continue;
    const statuses = campaignStatuses(context.world, season);
    let reached: Map<string, Reached> | undefined;
    for (const clubId of [...season.clubIds].sort()) {
      const goal = (board ?? context.board).clubs[clubId]?.goals?.continental;
      const status = statuses.get(clubId);
      if (!goal || goal.result || goal.competitionId !== league.competitionId) continue;
      if (status !== "eliminated" && status !== "champion") continue;
      board ??= JSON.parse(JSON.stringify(context.board)) as BoardState;
      reached ??= reachedByClub(context.world, season);
      const club = board.clubs[clubId];
      const target = club?.goals?.continental;
      if (!club || !target) continue;
      const result = evaluateContinental(target, reached.get(clubId));
      const reachedNow = reached.get(clubId);
      if (reachedNow) target.reached = reachedNow;
      target.result = result;
      if (status === "champion") target.champion = true;
      const rules = boardRules(context.world, rulesCompetitionOf(context.world, clubId).id);
      const amount = result === "met" ? rules.continentalMet : -rules.continentalMiss;
      const kind: ConfidenceFactor = result === "met" ? "continentalMet" : "continentalMiss";
      const managerClubId = board.manager.clubId ?? "";
      if (amount === 0 || (club.coachId === null && clubId !== managerClubId)) continue;
      const value = Math.min(100, Math.max(0, club.confidence + amount));
      if (clubId === managerClubId) {
        club.recent = [
          ...club.recent,
          {
            season: context.league.number,
            round,
            delta: value - club.confidence,
            value,
            factors: [{ kind, amount }],
          },
        ].slice(-rules.keepRecent);
      }
      club.confidence = value;
    }
  }
  return board ?? context.board;
}
