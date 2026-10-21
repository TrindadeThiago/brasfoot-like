import type { Position } from "../model/catalogs";
import type { Rng } from "../rng/xoshiro";
import { emit, opponent } from "./minute";
import { SHOOTOUT_TUNING } from "./tuning";
import type { MatchState, ShootoutKick, ShootoutOutcome, ShootoutState, Side } from "./types";

export const SHOOTOUT_KICKS_PER_SIDE = SHOOTOUT_TUNING.capPerSide;

/** As cinco cobranças da série inicial de cada lado. */
const SERIES = 5;

/** Probabilidade de gol de uma cobrança, pela força do cobrador e do goleiro (R9). */
export function penaltyChance(kicker: number, keeper: number): number {
  const raw = SHOOTOUT_TUNING.base + (kicker - keeper) * SHOOTOUT_TUNING.slope;
  return Math.min(SHOOTOUT_TUNING.max, Math.max(SHOOTOUT_TUNING.min, raw));
}

/** Cobradores do lado: os que terminaram em campo, de linha por aptidão e o goleiro por último. */
export function shootoutOrder(state: MatchState, side: Side): string[] {
  const squad = new Map(state.input[side].squad.map((player) => [player.id, player]));
  const onField = Object.values(state.teams[side].onField).filter(
    (playerId): playerId is string => typeof playerId === "string",
  );
  const aptitude = (playerId: string) => {
    const player = squad.get(playerId);
    if (!player) return Number.NEGATIVE_INFINITY;
    return player.strength + SHOOTOUT_TUNING.aptitude[player.position as Position];
  };
  return [...onField].sort((a, b) => aptitude(b) - aptitude(a) || (a < b ? -1 : a > b ? 1 : 0));
}

export interface ShootoutProgress {
  score: Record<Side, number>;
  over: boolean;
  winner?: Side;
  /** Lado da próxima cobrança. */
  next: Side;
}

/**
 * Andamento da disputa pelas cobranças feitas (alternadas a partir de `first`): termina antes das
 * cinco quando o outro lado não alcança mais e, depois delas, quando os dois cobraram o mesmo
 * número de vezes e há diferença.
 */
export function shootoutProgress(kicks: readonly ShootoutKick[], first: Side): ShootoutProgress {
  const score: Record<Side, number> = { home: 0, away: 0 };
  const taken: Record<Side, number> = { home: 0, away: 0 };
  for (const kick of kicks) {
    taken[kick.side] += 1;
    if (kick.outcome === "goal") score[kick.side] += 1;
  }
  const second = opponent(first);
  const next = taken[first] <= taken[second] ? first : second;
  const left = (side: Side) => Math.max(0, SERIES - taken[side]);
  let winner: Side | undefined;
  for (const side of ["home", "away"] as const) {
    if (
      score[side] > score[opponent(side)] + left(opponent(side)) &&
      taken[opponent(side)] < SERIES
    ) {
      winner = side;
    }
  }
  if (!winner && taken.home === taken.away && taken.home >= SERIES && score.home !== score.away) {
    winner = score.home > score.away ? "home" : "away";
  }
  return { score, over: winner !== undefined, ...(winner ? { winner } : {}), next };
}

/** Força do goleiro que defende o gol do lado `defending` (em campo, senão o melhor do elenco). */
function keeperStrength(state: MatchState, defending: Side): number {
  const squad = new Map(state.input[defending].squad.map((player) => [player.id, player]));
  for (const playerId of Object.values(state.teams[defending].onField)) {
    const player = playerId ? squad.get(playerId) : undefined;
    if (player?.position === "GK") return player.strength;
  }
  const keepers = state.input[defending].squad.filter((player) => player.position === "GK");
  return keepers.length > 0 ? Math.max(...keepers.map((player) => player.strength)) : 40;
}

/** Prepara a disputa (cobradores e quem cobra primeiro) e passa a partida ao estado de pênaltis. */
export function startShootout(state: MatchState, root: Rng): void {
  const first: Side = root.fork("shootout:first").float() < 0.5 ? "home" : "away";
  const shootout: ShootoutState = {
    first,
    order: { home: shootoutOrder(state, "home"), away: shootoutOrder(state, "away") },
    kicks: [],
    score: { home: 0, away: 0 },
  };
  state.shootout = shootout;
  state.status = "penalties";
  emit(state, state.clock, { type: "shootout_start" });
}

/** Uma cobrança da disputa (um passo do relógio); encerra a partida quando há vencedor. */
export function takeKick(state: MatchState, root: Rng): void {
  const shootout = state.shootout;
  if (!shootout) throw new Error("sem disputa de pênaltis");
  const side = shootoutProgress(shootout.kicks, shootout.first).next;
  const order = shootout.order[side];
  const taken = shootout.kicks.filter((kick) => kick.side === side).length;
  const playerId = order[taken % Math.max(1, order.length)];
  if (playerId === undefined) throw new Error("sem cobrador");
  const kicker = state.input[side].squad.find((player) => player.id === playerId);
  const rng = root.fork(`shootout:${shootout.kicks.length}`);
  const chance = penaltyChance(kicker?.strength ?? 50, keeperStrength(state, opponent(side)));
  let outcome: ShootoutOutcome = "goal";
  if (rng.float() >= chance) {
    const roll = rng.float();
    outcome =
      roll < SHOOTOUT_TUNING.saved
        ? "saved"
        : roll < SHOOTOUT_TUNING.saved + SHOOTOUT_TUNING.post
          ? "post"
          : "off";
  }
  const kick: ShootoutKick = { order: shootout.kicks.length, side, playerId, outcome };
  shootout.kicks.push(kick);
  if (outcome === "goal") shootout.score[side] += 1;
  emit(state, state.clock, { type: "shootout_kick", side, playerId, outcome, order: kick.order });

  const progress = shootoutProgress(shootout.kicks, shootout.first);
  let winner = progress.winner;
  const cap = SHOOTOUT_KICKS_PER_SIDE;
  if (
    !winner &&
    shootout.kicks.filter((entry) => entry.side === "home").length >= cap &&
    shootout.kicks.filter((entry) => entry.side === "away").length >= cap
  ) {
    // Teto de segurança: nunca alcançado nas disputas reais, só garante o término.
    winner = root.fork("shootout:cap").float() < 0.5 ? "home" : "away";
  }
  if (!winner) return;
  emit(state, state.clock, { type: "shootout_end", winner });
  state.decision = {
    by: "penalties",
    winner,
    ...(state.regulationScore
      ? {
          extraTimeScore: {
            home: state.score.home - state.regulationScore.home,
            away: state.score.away - state.regulationScore.away,
          },
        }
      : {}),
    shootout: { kicks: [...shootout.kicks], score: { ...shootout.score } },
  };
  state.status = "finished";
}
