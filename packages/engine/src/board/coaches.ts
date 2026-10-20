import type { CompletedBank } from "../model/types";
import { nameBankFor } from "../renewal/names";
import type { Rng } from "../rng/xoshiro";
import { playedRounds, seasonGoals } from "./goals";
import { clampReputation } from "./reputation";
import { boardRules } from "./rules";
import type { BoardContext, BoardState, Coach } from "./types";

/**
 * As funções deste arquivo alteram o `BoardState` recebido: são chamadas sobre um rascunho
 * (cópia) pelas funções públicas da diretoria.
 */

export function clubReputation(world: CompletedBank, clubId: string): number {
  return world.clubs.find((club) => club.id === clubId)?.reputation ?? 1;
}

export function nextId(board: BoardState, prefix: string): string {
  const id = `${prefix}-${board.nextSeq}`;
  board.nextSeq += 1;
  return id;
}

/** Técnico novo com nome do banco de nomes do país do clube e reputação perto da dele (R14). */
export function generateCoach(
  board: BoardState,
  world: CompletedBank,
  clubId: string,
  rng: Rng,
  spread: number,
): Coach {
  const club = world.clubs.find((entry) => entry.id === clubId);
  const names = nameBankFor(world, club?.countryId ?? "");
  const reputation = clampReputation(clubReputation(world, clubId) + rng.int(-spread, spread));
  const coach: Coach = {
    id: nextId(board, "coach"),
    name: `${rng.pick(names.firstNames)} ${rng.pick(names.surnames)}`,
    reputation,
    clubId: null,
  };
  board.coaches.push(coach);
  return coach;
}

export function coachOf(board: BoardState, clubId: string): Coach | undefined {
  const coachId = board.clubs[clubId]?.coachId;
  return coachId ? board.coaches.find((coach) => coach.id === coachId) : undefined;
}

/** Reputação de quem treina o clube: o jogador ou o técnico da IA. */
export function coachReputation(board: BoardState, world: CompletedBank, clubId: string): number {
  if (board.manager.clubId === clubId) return board.manager.reputation;
  return coachOf(board, clubId)?.reputation ?? clubReputation(world, clubId);
}

/** Mantém o pool de livres no limite: saem os de menor reputação (desempate pelo maior id). */
function trimPool(board: BoardState, max: number): void {
  const free = board.coaches
    .filter((coach) => coach.clubId === null)
    .sort((a, b) => a.reputation - b.reputation || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
  const excess = free.length - max;
  if (excess <= 0) return;
  const removed = new Set(free.slice(0, excess).map((coach) => coach.id));
  board.coaches = board.coaches.filter((coach) => !removed.has(coach.id));
}

/** Técnico da IA deixa o clube e vai para o pool de livres. */
export function releaseCoach(board: BoardState, coachId: string, maxFree: number): void {
  const coach = board.coaches.find((entry) => entry.id === coachId);
  if (!coach) return;
  const club = coach.clubId ? board.clubs[coach.clubId] : undefined;
  if (club) club.coachId = null;
  coach.clubId = null;
  trimPool(board, maxFree);
}

/**
 * Contrata um técnico da IA para o clube (R14): o livre de reputação mais próxima da do clube
 * dentro das margens, senão um novo. Metas de meio de temporada e confiança neutra.
 */
export function hireCoach(
  board: BoardState,
  context: Omit<BoardContext, "board">,
  clubId: string,
  rng: Rng,
): Coach {
  const rules = boardRules(context.world, context.league.competitionId);
  const reputation = clubReputation(context.world, clubId);
  const candidates = board.coaches
    .filter(
      (coach) =>
        coach.clubId === null &&
        coach.reputation >= reputation - rules.lowerMargin &&
        coach.reputation <= reputation + rules.upperMargin,
    )
    .sort(
      (a, b) =>
        Math.abs(a.reputation - reputation) - Math.abs(b.reputation - reputation) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
  const coach =
    candidates[0] ?? generateCoach(board, context.world, clubId, rng, rules.coachSpread);
  coach.clubId = clubId;
  const played = playedRounds(context.league);
  board.clubs[clubId] = {
    clubId,
    coachId: coach.id,
    goals: seasonGoals(context, clubId, coach.reputation, { midSeason: true }),
    confidence: rules.neutral,
    hired: { season: context.league.number, round: played },
    recent: [],
  };
  board.vacancies = board.vacancies.filter((vacancy) => vacancy.clubId !== clubId);
  return coach;
}
