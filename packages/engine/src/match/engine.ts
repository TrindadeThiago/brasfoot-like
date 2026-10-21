import type { CompletedPlayer } from "../model/types";
import { createRng } from "../rng/xoshiro";
import type { MatchError } from "./errors";
import { emit, type MatchContext, newPlayerState, onFieldCount, playMinute } from "./minute";
import { registerPending, resolvePending } from "./pending";
import { matchResult } from "./result";
import { type ClockKey, minuteRng } from "./rng";
import { startShootout, takeKick } from "./shootout";
import { stoppageFor } from "./stoppage";
import { MATCH_TUNING } from "./tuning";
import type { MatchInput, MatchResult, MatchState, Side, TeamState } from "./types";
import { normalizeInput, validateMatchInput } from "./validate-input";

export type StartResult = { ok: true; state: MatchState } | { ok: false; errors: MatchError[] };
export type Advance = { minutes: number } | { toEnd: true };

function initialTeam(input: MatchInput, side: Side): TeamState {
  const lineup = input[side].lineup;
  const players: TeamState["players"] = {};
  for (const playerId of Object.values(lineup.starters)) players[playerId] = newPlayerState();
  return {
    formation: lineup.formation,
    posture: lineup.posture,
    onField: { ...lineup.starters },
    bench: [...lineup.bench],
    substitutionsUsed: 0,
    players,
    pending: [],
  };
}

/** Valida a entrada e prepara a partida, ainda não iniciada (FR-005, FR-021). */
export function startMatch(input: MatchInput): StartResult {
  const normalized = normalizeInput(input);
  const errors = validateMatchInput(normalized);
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    state: {
      input: normalized,
      status: "not_started",
      clock: { half: 1, minute: 0, stoppage: 0 },
      stoppage: {},
      score: { home: 0, away: 0 },
      teams: { home: initialTeam(normalized, "home"), away: initialTeam(normalized, "away") },
      events: [],
      possession: { home: 0, total: 0 },
    },
  };
}

function cloneTeam(team: TeamState): TeamState {
  const players: TeamState["players"] = {};
  for (const [id, player] of Object.entries(team.players)) players[id] = { ...player };
  return {
    ...team,
    onField: { ...team.onField },
    bench: [...team.bench],
    players,
    pending: team.pending.map((pending) => ({ ...pending })),
  };
}

/** Cópia de trabalho: a entrada é imutável e compartilhada; o resto é copiado. */
export function cloneState(state: MatchState): MatchState {
  return {
    ...state,
    clock: { ...state.clock },
    stoppage: { ...state.stoppage },
    score: { ...state.score },
    teams: { home: cloneTeam(state.teams.home), away: cloneTeam(state.teams.away) },
    events: [...state.events],
    possession: { ...state.possession },
    ...(state.regulationScore ? { regulationScore: { ...state.regulationScore } } : {}),
    ...(state.shootout
      ? {
          shootout: {
            ...state.shootout,
            order: { home: [...state.shootout.order.home], away: [...state.shootout.order.away] },
            kicks: [...state.shootout.kicks],
            score: { ...state.shootout.score },
          },
        }
      : {}),
  };
}

export function buildContext(state: MatchState): MatchContext {
  const players = new Map<string, CompletedPlayer>();
  for (const player of [...state.input.home.squad, ...state.input.away.squad]) {
    players.set(player.id, player);
  }
  return { seed: state.input.seed, root: createRng(state.input.seed), players, lineups: {} };
}

function isOver(state: MatchState): boolean {
  return state.status === "finished" || state.status === "abandoned";
}

function checkAbandonment(state: MatchState, clock: ClockKey): boolean {
  for (const side of ["home", "away"] as const) {
    if (onFieldCount(state, side) < MATCH_TUNING.minimumPlayers) {
      emit(state, clock, { type: "abandoned", side });
      state.status = "abandoned";
      return true;
    }
  }
  return false;
}

function nextClock(state: MatchState): ClockKey {
  const { half, minute, stoppage } = state.clock;
  if (state.status === "extra_first_half") {
    return { half: 3, minute: half === 3 ? minute + 1 : 91, stoppage: 0 };
  }
  if (state.status === "extra_half_time") return { half: 4, minute: 106, stoppage: 0 };
  if (state.status === "extra_second_half") return { half: 4, minute: minute + 1, stoppage: 0 };
  if (state.status === "not_started") return { half: 1, minute: 1, stoppage: 0 };
  if (state.status === "half_time") return { half: 2, minute: 46, stoppage: 0 };
  const end = half === 1 ? 45 : 90;
  if (minute < end) return { half, minute: minute + 1, stoppage: 0 };
  return { half, minute, stoppage: stoppage + 1 };
}

/** Quem avança pelo agregado (gols e, se valer, gols fora) depois do placar atual, se alguém. */
function aggregateLeader(
  state: MatchState,
): { winner: Side; by: "aggregate" | "away-goals" } | undefined {
  const decider = state.input.decider;
  if (!decider) return undefined;
  const home = decider.before.home.goals + state.score.home;
  const away = decider.before.away.goals + state.score.away;
  if (home !== away) return { winner: home > away ? "home" : "away", by: "aggregate" };
  if (decider.awayGoals) {
    const homeAway = decider.before.home.awayGoals;
    const awayAway = decider.before.away.awayGoals + state.score.away;
    if (homeAway !== awayAway) {
      return { winner: homeAway > awayAway ? "home" : "away", by: "away-goals" };
    }
  }
  return undefined;
}

/** Fim dos 90 minutos de um jogo com `decider`: decide, joga a prorrogação ou vai aos pênaltis. */
function endRegulation(state: MatchState, context: MatchContext): void {
  const decider = state.input.decider;
  if (!decider) {
    state.status = "finished";
    return;
  }
  const leader = aggregateLeader(state);
  if (leader) {
    state.decision = { by: leader.by, winner: leader.winner };
    state.status = "finished";
    return;
  }
  if (decider.extraTime) {
    state.regulationScore = { ...state.score };
    state.extraTime = true;
    emit(state, state.clock, { type: "extra_time_start" });
    state.status = "extra_first_half";
    return;
  }
  startShootout(state, context.root);
}

/** Fim da prorrogação: decide pelo agregado ou vai aos pênaltis. */
function endExtraTime(state: MatchState, context: MatchContext): void {
  emit(state, state.clock, { type: "extra_time_end" });
  const leader = aggregateLeader(state);
  if (leader) {
    const regulation = state.regulationScore ?? { home: 0, away: 0 };
    state.decision = {
      by: "extra-time",
      winner: leader.winner,
      extraTimeScore: {
        home: state.score.home - regulation.home,
        away: state.score.away - regulation.away,
      },
    };
    state.status = "finished";
    return;
  }
  startShootout(state, context.root);
}

/** Um passo do relógio: um minuto regulamentar ou de acréscimo, com as transições de tempo. */
function tick(state: MatchState, context: MatchContext): void {
  if (isOver(state)) return;
  if (state.status === "penalties") {
    takeKick(state, context.root);
    return;
  }
  const clock = nextClock(state);

  if (state.status === "not_started") {
    emit(state, { half: 1, minute: 0, stoppage: 0 }, { type: "kickoff" });
    state.status = "first_half";
  } else if (state.status === "half_time") {
    emit(state, { half: 2, minute: 45, stoppage: 0 }, { type: "second_half" });
    state.status = "second_half";
  } else if (state.status === "extra_half_time") {
    state.status = "extra_second_half";
  }

  resolvePending(state, context, clock);
  if (checkAbandonment(state, clock)) return;

  playMinute(state, context, clock, registerPending);
  state.clock = { ...clock };
  if (checkAbandonment(state, clock)) return;

  if (clock.half >= 3) {
    // Prorrogação: dois tempos de 15 minutos, sem acréscimos (018 R8).
    if (clock.half === 3 && clock.minute === 105) {
      emit(state, clock, { type: "extra_half_time" });
      state.status = "extra_half_time";
    } else if (clock.half === 4 && clock.minute === 120) {
      endExtraTime(state, context);
    }
    return;
  }

  const half = clock.half as 1 | 2;
  const end = half === 1 ? 45 : 90;
  if (clock.minute !== end) return;
  const key = half === 1 ? "first" : "second";
  if (state.stoppage[key] === undefined) {
    const rng = minuteRng(context.root, { half, minute: end, stoppage: 0 }, "stoppage");
    state.stoppage[key] = stoppageFor(state.events, half, rng);
  }
  if (clock.stoppage >= (state.stoppage[key] ?? 0)) {
    if (half === 1) {
      emit(state, clock, { type: "half_time" });
      state.status = "half_time";
    } else {
      emit(state, clock, { type: "full_time" });
      endRegulation(state, context);
    }
  }
}

/**
 * Avança a partida N passos do relógio (minutos regulamentares ou de acréscimo) ou até o fim.
 * Função pura: devolve um novo estado (FR-021, FR-022).
 */
export function advanceMatch(state: MatchState, step: Advance): MatchState {
  if (isOver(state)) return state;
  if ("minutes" in step && (!Number.isInteger(step.minutes) || step.minutes < 1)) {
    throw new Error(`passo inválido: ${step.minutes}`);
  }
  const next = cloneState(state);
  const context = buildContext(next);
  if ("toEnd" in step) {
    while (!isOver(next)) tick(next, context);
  } else {
    for (let i = 0; i < step.minutes && !isOver(next); i++) tick(next, context);
  }
  return next;
}

export type SimulateResult =
  | { ok: true; result: MatchResult }
  | { ok: false; errors: MatchError[] };

/** Simula a partida inteira de uma vez — o mesmo motor da rodada ao vivo. */
export function simulateMatch(input: MatchInput): SimulateResult {
  const started = startMatch(input);
  if (!started.ok) return started;
  return { ok: true, result: matchResult(advanceMatch(started.state, { toEnd: true })) };
}
