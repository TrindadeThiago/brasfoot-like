import { autoLineup } from "../../../src/match/auto-lineup.js";
import { advanceMatch, startMatch } from "../../../src/match/engine.js";
import { FORMATION_IDS, type FormationId, type Posture } from "../../../src/match/formations.js";
import { createMetricsAccumulator, type MatchMetrics } from "../../../src/match/metrics.js";
import { matchResult } from "../../../src/match/result.js";
import type {
  Lineup,
  MatchInput,
  MatchResult,
  MatchState,
  TeamInput,
} from "../../../src/match/types.js";
import type { CompletedPlayer } from "../../../src/model/types.js";
import { createRng } from "../../../src/rng/xoshiro.js";
import { squadOf, testWorld } from "../helpers/teams.js";

const lineupCache = new Map<string, Lineup>();

/** Escalação automática (com cache) de um elenco num esquema e postura. */
export function lineupFor(
  key: string,
  squad: CompletedPlayer[],
  formation: FormationId,
  posture: Posture = "balanced",
): Lineup {
  const cacheKey = `${key}|${formation}|${posture}`;
  let lineup = lineupCache.get(cacheKey);
  if (!lineup) {
    const result = autoLineup({ squad, formation, posture, benchLimit: 7 });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    lineup = result.lineup;
    lineupCache.set(cacheKey, lineup);
  }
  return lineup;
}

/** Cópia de um elenco com outros ids e outro clube (para confrontos "time contra si mesmo"). */
export function cloneSquad(
  squad: CompletedPlayer[],
  prefix: string,
  clubId: string,
): CompletedPlayer[] {
  return squad.map((player) => ({ ...player, id: `${prefix}${player.id}`, clubId }));
}

export function team(
  clubId: string,
  squad: CompletedPlayer[],
  formation: FormationId = "4-4-2",
  posture: Posture = "balanced",
): TeamInput {
  return {
    clubId,
    squad,
    lineup: lineupFor(clubId + squad.length + (squad[0]?.id ?? ""), squad, formation, posture),
  };
}

export interface Injection {
  /** Minuto (1º tempo) em que a edição é aplicada. */
  minute: number;
  apply(state: MatchState): void;
}

/** Simula uma partida, opcionalmente editando o estado num minuto (situações raras forçadas). */
export function play(input: MatchInput, injection?: Injection): MatchResult {
  const started = startMatch(input);
  if (!started.ok) throw new Error(JSON.stringify(started.errors));
  let state = started.state;
  if (injection) {
    state = advanceMatch(state, { minutes: injection.minute });
    state = JSON.parse(JSON.stringify(state)) as MatchState;
    injection.apply(state);
  }
  return matchResult(advanceMatch(state, { toEnd: true }));
}

/**
 * Amostra "de campeonato": confrontos entre clubes da mesma divisão do banco padrão, esquemas
 * sorteados do catálogo, posturas equilibradas.
 */
export function runLeagueSample(n: number, seed: string): MatchMetrics {
  const world = testWorld();
  const divisions = world.competitions.flatMap((competition) => competition.divisions);
  const rng = createRng(seed);
  const metrics = createMetricsAccumulator();
  for (let index = 0; index < n; index++) {
    const division = divisions[index % divisions.length];
    if (!division) continue;
    const [homeId, awayId] = rng.shuffle(division.clubIds) as [string, string];
    const input: MatchInput = {
      home: team(homeId, squadOf(homeId), rng.pick(FORMATION_IDS)),
      away: team(awayId, squadOf(awayId), rng.pick(FORMATION_IDS)),
      seed: `${seed}:${index}`,
    };
    metrics.add(input, play(input));
  }
  return metrics.summary();
}

export interface PairedOutcome {
  /** Pontos de vista do time "A" (o que recebe o tratamento no cenário). */
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  matches: number;
}

export function emptyOutcome(): PairedOutcome {
  return { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, matches: 0 };
}

/** Soma o resultado do ponto de vista do time A (que pode ser mandante ou visitante). */
export function record(outcome: PairedOutcome, result: MatchResult, aIsHome: boolean): void {
  const goalsFor = aIsHome ? result.score.home : result.score.away;
  const goalsAgainst = aIsHome ? result.score.away : result.score.home;
  outcome.matches += 1;
  outcome.goalsFor += goalsFor;
  outcome.goalsAgainst += goalsAgainst;
  if (goalsFor > goalsAgainst) outcome.wins += 1;
  else if (goalsFor === goalsAgainst) outcome.draws += 1;
  else outcome.losses += 1;
}

export const rateOf = (outcome: PairedOutcome, key: "wins" | "draws" | "losses") =>
  outcome[key] / outcome.matches;
