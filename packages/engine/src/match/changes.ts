import { cloneState } from "./engine.js";
import { type MatchError, matchError } from "./errors.js";
import { FORMATIONS } from "./formations.js";
import { emit, playerState } from "./minute.js";
import type { MatchChange, MatchState, Side } from "./types.js";

export type ChangeResult = { ok: true; state: MatchState } | { ok: false; error: MatchError };

function fail(error: MatchError): ChangeResult {
  return { ok: false, error };
}

function substitution(
  state: MatchState,
  side: Side,
  change: Extract<MatchChange, { type: "substitution" }>,
): ChangeResult {
  const team = state.teams[side];
  if (team.substitutionsUsed >= state.input.substitutionLimit) {
    return fail(matchError("change.limit_reached", { limit: state.input.substitutionLimit }, side));
  }
  // Quem sai está em campo, ou é o jogador de uma pendência (lesionado que já deixou o campo).
  const outSlot = Object.keys(team.onField).find((slot) => team.onField[slot] === change.out);
  const pending = team.pending.find((entry) => entry.playerId === change.out);
  if (outSlot === undefined && pending === undefined) {
    return fail(matchError("change.player_not_on_field", { playerId: change.out }, side));
  }
  if (!team.bench.includes(change.in)) {
    return fail(matchError("change.player_not_on_bench", { playerId: change.in }, side));
  }
  if ((state.input[side].unavailable ?? []).includes(change.in)) {
    return fail(matchError("change.player_unavailable", { playerId: change.in }, side));
  }
  const target = change.slotId ?? outSlot ?? pending?.slotId;
  if (target === undefined || !(target in team.onField)) {
    return fail(matchError("change.unknown_slot", { slotId: change.slotId ?? "" }, side));
  }
  const occupant = team.onField[target];
  if (occupant !== null && occupant !== change.out) {
    return fail(matchError("change.invalid_assignment", { formation: team.formation }, side));
  }

  const next = cloneState(state);
  const nextTeam = next.teams[side];
  if (outSlot !== undefined) nextTeam.onField[outSlot] = null;
  nextTeam.onField[target] = change.in;
  nextTeam.bench = nextTeam.bench.filter((playerId) => playerId !== change.in);
  nextTeam.substitutionsUsed += 1;
  nextTeam.pending = nextTeam.pending.filter(
    (entry) => entry.playerId !== change.out && entry.slotId !== target,
  );
  playerState(next, side, change.in).subbedIn = next.clock.minute;
  playerState(next, side, change.out).subbedOut = next.clock.minute;
  emit(next, next.clock, {
    type: "substitution",
    side,
    outId: change.out,
    inId: change.in,
    slotId: target,
    automatic: false,
  });
  return { ok: true, state: next };
}

function formation(
  state: MatchState,
  side: Side,
  change: Extract<MatchChange, { type: "formation" }>,
): ChangeResult {
  const team = state.teams[side];
  const invalid = () =>
    fail(matchError("change.invalid_assignment", { formation: change.formation }, side));
  const formationDef = FORMATIONS[change.formation];
  if (!formationDef) return invalid();
  const slots = formationDef.slots.map((slot) => slot.id);
  const keys = Object.keys(change.assignment);
  if (keys.length !== slots.length || !slots.every((slot) => slot in change.assignment)) {
    return invalid();
  }
  const current = Object.values(team.onField).filter(
    (playerId): playerId is string => playerId !== null,
  );
  const assigned = Object.values(change.assignment).filter(
    (playerId): playerId is string => playerId !== null,
  );
  const sameSet =
    assigned.length === current.length &&
    new Set(assigned).size === assigned.length &&
    assigned.every((playerId) => current.includes(playerId));
  if (!sameSet) return invalid();

  const next = cloneState(state);
  next.teams[side].formation = change.formation;
  next.teams[side].onField = { ...change.assignment };
  emit(next, next.clock, { type: "formation_change", side, formation: change.formation });
  return { ok: true, state: next };
}

/**
 * Aplica uma mudança de um time entre passos (FR-023). Nunca altera o estado recebido; mudanças
 * inválidas devolvem um erro codificado (FR-024).
 */
export function applyChange(state: MatchState, side: Side, change: MatchChange): ChangeResult {
  if (state.status === "not_started") return fail(matchError("change.not_started", {}, side));
  if (state.status === "finished" || state.status === "abandoned") {
    return fail(matchError("change.match_finished", {}, side));
  }
  switch (change.type) {
    case "substitution":
      return substitution(state, side, change);
    case "formation":
      return formation(state, side, change);
    case "posture": {
      const next = cloneState(state);
      next.teams[side].posture = change.posture;
      emit(next, next.clock, { type: "posture_change", side, posture: change.posture });
      return { ok: true, state: next };
    }
  }
}
