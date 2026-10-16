import { type MatchError, matchError } from "./errors.js";
import { FORMATION_IDS, FORMATIONS, type FormationId } from "./formations.js";
import { type MatchInput, type NormalizedMatchInput, SIDES, type Side } from "./types.js";

const OPTION_RANGES = {
  substitutionLimit: [0, 11],
  benchLimit: [0, 23],
} as const;

export const DEFAULT_SUBSTITUTION_LIMIT = 5;
export const DEFAULT_BENCH_LIMIT = 12;

export function normalizeInput(input: MatchInput): NormalizedMatchInput {
  return {
    ...input,
    neutral: input.neutral ?? false,
    substitutionLimit: input.substitutionLimit ?? DEFAULT_SUBSTITUTION_LIMIT,
    benchLimit: input.benchLimit ?? DEFAULT_BENCH_LIMIT,
  };
}

function validateTeam(
  input: NormalizedMatchInput,
  side: Side,
  otherPlayers: Set<string>,
): MatchError[] {
  const errors: MatchError[] = [];
  const team = input[side];
  const lineup = team.lineup;
  if (!(FORMATION_IDS as readonly string[]).includes(lineup.formation)) {
    return [matchError("lineup.unknown_formation", { formation: lineup.formation }, side)];
  }
  const slots = FORMATIONS[lineup.formation as FormationId].slots.map((slot) => slot.id);
  const filled = Object.keys(lineup.starters);
  const sameSlots =
    filled.length === slots.length && slots.every((slot) => lineup.starters[slot] !== undefined);
  if (!sameSlots) {
    errors.push(
      matchError(
        "lineup.slots_mismatch",
        { expected: slots.length, received: filled.length },
        side,
      ),
    );
  }
  if (lineup.bench.length > input.benchLimit) {
    errors.push(
      matchError(
        "lineup.bench_too_large",
        { count: lineup.bench.length, max: input.benchLimit },
        side,
      ),
    );
  }
  const squad = new Set(team.squad.map((player) => player.id));
  const unavailable = new Set(team.unavailable ?? []);
  const seen = new Set<string>();
  for (const playerId of [...Object.values(lineup.starters), ...lineup.bench]) {
    if (seen.has(playerId)) {
      errors.push(matchError("lineup.duplicate_player", { playerId }, side));
      continue;
    }
    seen.add(playerId);
    if (!squad.has(playerId)) {
      errors.push(matchError("lineup.player_not_in_squad", { playerId }, side));
    } else if (otherPlayers.has(playerId)) {
      errors.push(matchError("lineup.player_in_both_teams", { playerId }, side));
    } else if (unavailable.has(playerId)) {
      errors.push(matchError("lineup.player_unavailable", { playerId }, side));
    }
  }
  return errors;
}

/** Validação da entrada antes da simulação (FR-005). Devolve todos os erros encontrados. */
export function validateMatchInput(input: NormalizedMatchInput): MatchError[] {
  const errors: MatchError[] = [];
  if (input.home.clubId === input.away.clubId) {
    errors.push(matchError("input.same_club", { clubId: input.home.clubId }));
  }
  for (const [option, [min, max]] of Object.entries(OPTION_RANGES)) {
    const value = input[option as keyof typeof OPTION_RANGES];
    if (!Number.isInteger(value) || value < min || value > max) {
      errors.push(matchError("input.invalid_option", { option, value, min, max }));
    }
  }
  const lineupPlayers = (side: Side) =>
    new Set([...Object.values(input[side].lineup.starters), ...input[side].lineup.bench]);
  const homePlayers = lineupPlayers("home");
  for (const side of SIDES) {
    errors.push(...validateTeam(input, side, side === "away" ? homePlayers : new Set()));
  }
  return errors;
}
