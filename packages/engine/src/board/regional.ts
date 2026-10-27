import type { LeagueSeason } from "../career/types";
import { reachedAtLeast, reachedByClub } from "../continental/reached";
import { campaignStatuses } from "../continental/status";
import type { Reached } from "../continental/types";
import type { CompletedBank } from "../model/types";
import { isRegional } from "../regional/scope";
import { regionalWeightFor } from "../regional/weight";
import { rulesCompetitionOf } from "../world/countries";
import { boardRules } from "./rules";
import type { BoardContext, BoardState, ConfidenceFactor, SeasonGoals } from "./types";

/**
 * Meta do estadual da diretoria (023 R7, R8): o clube de uma divisão do estadual recebe, além da
 * meta de liga, uma fase a alcançar pelo tercil da reputação entre os clubes da divisão: o de cima
 * espera chegar à final, o do meio ao mata-mata; o de baixo não recebe meta (passar do grupo seria
 * quase certo). A meta vale pelo peso do estadual para o clube e é avaliada quando a campanha do
 * clube termina (eliminação ou título).
 */

type RegionalGoal = NonNullable<SeasonGoals["regional"]>;

/** Os estaduais da carreira, na ordem do banco, com a temporada de cada um. */
function regionalSeasons(
  world: Pick<CompletedBank, "competitions">,
  leagues: readonly LeagueSeason[],
): LeagueSeason[] {
  return world.competitions.flatMap((competition) =>
    isRegional(competition)
      ? leagues.filter((league) => league.competitionId === competition.id)
      : [],
  );
}

/** Etapa do mata-mata final e quantas fases ele tem. */
function knockoutShape(
  division: LeagueSeason["divisions"][number],
): { knockout: number; phases: number } | undefined {
  const knockout = [...(division.stages ?? [])]
    .reverse()
    .find((stage) => stage.kind === "knockout");
  if (!knockout) return undefined;
  return { knockout: knockout.index + 1, phases: knockout.bracket?.phases.length ?? 1 };
}

export function regionalGoal(
  world: CompletedBank,
  leagues: readonly LeagueSeason[],
  clubId: string,
): RegionalGoal | undefined {
  const club = world.clubs.find((entry) => entry.id === clubId);
  if (!club) return undefined;
  for (const league of regionalSeasons(world, leagues)) {
    const competition = world.competitions.find((entry) => entry.id === league.competitionId);
    const division = league.divisions.find((season) => season.clubIds.includes(clubId));
    if (!competition || !division) continue;
    const weight = regionalWeightFor(club, competition);
    const shape = knockoutShape(division);
    if (weight === 0 || !shape) return undefined;
    const reputation = (id: string) =>
      world.clubs.find((entry) => entry.id === id)?.reputation ?? 0;
    const ranked = [...division.clubIds].sort(
      (a, b) => reputation(b) - reputation(a) || (a < b ? -1 : 1),
    );
    const position = ranked.indexOf(clubId) + 1;
    const rules = boardRules(world, rulesCompetitionOf(world, clubId).id);
    const total = division.clubIds.length;
    const target: Reached | undefined =
      position * 100 <= rules.regionalTopPct * total
        ? { stage: shape.knockout, phase: shape.phases }
        : position * 100 <= rules.regionalMidPct * total
          ? { stage: shape.knockout }
          : undefined;
    if (!target) return undefined;
    return { competitionId: league.competitionId, level: division.divisionLevel, target, weight };
  }
  return undefined;
}

export function evaluateRegional(
  goal: Pick<RegionalGoal, "target">,
  reached: Reached | undefined,
): "met" | "missed" {
  return reached && reachedAtLeast(reached, goal.target) ? "met" : "missed";
}

/** Dá a meta do estadual aos clubes da diretoria que o disputam. Não altera a entrada. */
export function withRegionalGoals(
  board: BoardState,
  world: CompletedBank,
  leagues: readonly LeagueSeason[],
): BoardState {
  if (regionalSeasons(world, leagues).length === 0) return board;
  const next = JSON.parse(JSON.stringify(board)) as BoardState;
  for (const clubId of Object.keys(next.clubs).sort()) {
    const club = next.clubs[clubId];
    if (!club?.goals) continue;
    const goal = regionalGoal(world, leagues, clubId);
    if (goal) club.goals.regional = goal;
    else delete club.goals.regional;
  }
  return next;
}

/**
 * Fecha a meta do estadual dos clubes cuja campanha terminou hoje: grava a fase alcançada e o
 * resultado e move a confiança pelo peso (só a do técnico entra em `recent`). Não altera a entrada.
 */
export function boardAfterRegional(
  context: BoardContext,
  leagues: readonly LeagueSeason[],
  round: number,
): BoardState {
  let board: BoardState | undefined;
  for (const league of regionalSeasons(context.world, leagues)) {
    for (const season of league.divisions) {
      const statuses = campaignStatuses(context.world, season);
      let reached: Map<string, Reached> | undefined;
      for (const clubId of [...season.clubIds].sort()) {
        const goal = (board ?? context.board).clubs[clubId]?.goals?.regional;
        const status = statuses.get(clubId);
        if (!goal || goal.result || goal.competitionId !== league.competitionId) continue;
        if (goal.level !== season.divisionLevel) continue;
        if (status !== "eliminated" && status !== "champion") continue;
        board ??= JSON.parse(JSON.stringify(context.board)) as BoardState;
        reached ??= reachedByClub(context.world, season);
        const club = board.clubs[clubId];
        const target = club?.goals?.regional;
        if (!club || !target) continue;
        const reachedNow = reached.get(clubId);
        const result = evaluateRegional(target, reachedNow);
        if (reachedNow) target.reached = reachedNow;
        target.result = result;
        if (status === "champion") target.champion = true;
        const rules = boardRules(context.world, rulesCompetitionOf(context.world, clubId).id);
        const base = result === "met" ? rules.regionalMet : -rules.regionalMiss;
        const amount = Math.trunc((base * target.weight) / 100);
        const kind: ConfidenceFactor = result === "met" ? "regionalMet" : "regionalMiss";
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
  }
  return board ?? context.board;
}
