import type { CompletedPlayer } from "../model/types";
import { slotValue } from "./auto-lineup";
import { slotPosition } from "./formations";
import { emit, type MatchContext, playerState, type RemovalHook } from "./minute";
import type { ClockKey } from "./rng";
import type { MatchState, PendingChange, Side } from "./types";

/** Lesão ou expulsão do goleiro deixam uma mudança pendente para o time (FR-025). */
export const registerPending: RemovalHook = (state, side, playerId, slotId, reason) => {
  const team = state.teams[side];
  if (reason === "injury") {
    team.pending.push({ reason: "injury", slotId, playerId });
  } else if (slotPosition(team.formation, slotId) === "GK") {
    team.pending.push({ reason: "goalkeeper_sent_off", slotId, playerId });
  }
};

function playerOf(context: MatchContext, playerId: string): CompletedPlayer | undefined {
  return context.players.get(playerId);
}

function canonical(a: CompletedPlayer, b: CompletedPlayer): number {
  return b.strength - a.strength || a.id.localeCompare(b.id);
}

/** Reserva disponível mais adequado para a vaga (mesmo critério da escalação automática). */
function bestReserve(state: MatchState, side: Side, context: MatchContext, slotId: string) {
  const team = state.teams[side];
  const position = slotPosition(team.formation, slotId);
  if (!position) return undefined;
  const unavailable = new Set(state.input[side].unavailable ?? []);
  return team.bench
    .map((playerId) => playerOf(context, playerId))
    .filter(
      (player): player is CompletedPlayer => player !== undefined && !unavailable.has(player.id),
    )
    .sort((a, b) => slotValue(b, position) - slotValue(a, position) || canonical(a, b))[0];
}

function substitute(
  state: MatchState,
  side: Side,
  clock: ClockKey,
  outId: string,
  inId: string,
  slotId: string,
): void {
  const team = state.teams[side];
  team.onField[slotId] = inId;
  team.bench = team.bench.filter((playerId) => playerId !== inId);
  team.substitutionsUsed += 1;
  playerState(state, side, inId).subbedIn = clock.minute;
  playerState(state, side, outId).subbedOut = clock.minute;
  emit(state, clock, { type: "substitution", side, outId, inId, slotId, automatic: true });
}

/** Sem troca possível, o jogador de linha mais adequado ao gol assume a meta. */
function moveToGoal(
  state: MatchState,
  side: Side,
  context: MatchContext,
  clock: ClockKey,
  slotId: string,
): void {
  const team = state.teams[side];
  const candidates = Object.entries(team.onField)
    .filter(([slot, playerId]) => slot !== slotId && playerId !== null)
    .map(([slot, playerId]) => ({ slot, player: playerOf(context, playerId as string) }))
    .filter(
      (entry): entry is { slot: string; player: CompletedPlayer } => entry.player !== undefined,
    )
    .sort(
      (a, b) =>
        slotValue(b.player, "GK") - slotValue(a.player, "GK") || canonical(a.player, b.player),
    );
  const chosen = candidates[0];
  if (!chosen) return;
  team.onField[slotId] = chosen.player.id;
  team.onField[chosen.slot] = null;
  emit(state, clock, {
    type: "reorganization",
    side,
    playerId: chosen.player.id,
    fromSlotId: chosen.slot,
    toSlotId: slotId,
  });
}

/** Jogador de linha cuja saída custa menos ao time (para abrir vaga ao goleiro reserva). */
function cheapestOutfield(
  state: MatchState,
  side: Side,
  context: MatchContext,
  keeperSlot: string,
) {
  const team = state.teams[side];
  return Object.entries(team.onField)
    .filter(([slot, playerId]) => slot !== keeperSlot && playerId !== null)
    .map(([slot, playerId]) => {
      const player = playerOf(context, playerId as string);
      const position = slotPosition(team.formation, slot);
      return { slot, player, value: player && position ? slotValue(player, position) : 0 };
    })
    .filter(
      (entry): entry is { slot: string; player: CompletedPlayer; value: number } =>
        entry.player !== undefined,
    )
    .sort((a, b) => a.value - b.value || a.player.id.localeCompare(b.player.id))[0];
}

function resolveOne(
  state: MatchState,
  side: Side,
  context: MatchContext,
  clock: ClockKey,
  pending: PendingChange,
): void {
  const team = state.teams[side];
  const isGoal = slotPosition(team.formation, pending.slotId) === "GK";
  const canSubstitute = team.substitutionsUsed < state.input.substitutionLimit;
  const reserve = canSubstitute ? bestReserve(state, side, context, pending.slotId) : undefined;

  if (pending.reason === "injury") {
    if (reserve) substitute(state, side, clock, pending.playerId, reserve.id, pending.slotId);
    else if (isGoal) moveToGoal(state, side, context, clock, pending.slotId);
    return;
  }

  // Goleiro expulso: entra o reserva mais adequado ao gol no lugar do jogador de linha que
  // menos faz falta; sem troca possível, um jogador de linha vai para o gol.
  const outfield = reserve ? cheapestOutfield(state, side, context, pending.slotId) : undefined;
  if (reserve && outfield && reserve.position === "GK") {
    team.onField[outfield.slot] = null;
    substitute(state, side, clock, outfield.player.id, reserve.id, pending.slotId);
  } else {
    moveToGoal(state, side, context, clock, pending.slotId);
  }
}

/**
 * Resolve, pela política padrão, as pendências que o controlador não decidiu antes deste passo.
 * Pendências cuja vaga já foi preenchida (ou deixou de existir) são descartadas.
 */
export function resolvePending(state: MatchState, context: MatchContext, clock: ClockKey): void {
  for (const side of ["home", "away"] as const) {
    const team = state.teams[side];
    const pending = team.pending;
    team.pending = [];
    for (const entry of pending) {
      if (!(entry.slotId in team.onField) || team.onField[entry.slotId] !== null) continue;
      resolveOne(state, side, context, clock, entry);
    }
  }
}
