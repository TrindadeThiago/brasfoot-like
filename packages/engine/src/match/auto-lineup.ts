import type { Position } from "../model/catalogs.js";
import type { CompletedPlayer } from "../model/types.js";
import { type MatchError, matchError } from "./errors.js";
import { FORMATIONS, type FormationId, type Posture } from "./formations.js";
import { maximizeAssignment } from "./hungarian.js";
import { effectiveStrength, slotWeight } from "./strength.js";
import type { Lineup } from "./types.js";
import { DEFAULT_BENCH_LIMIT } from "./validate-input.js";

export interface AutoLineupOptions {
  squad: readonly CompletedPlayer[];
  formation: FormationId;
  posture?: Posture;
  unavailable?: readonly string[];
  benchLimit?: number;
}

export type AutoLineupResult = { ok: true; lineup: Lineup } | { ok: false; error: MatchError };

const STARTERS = 11;
const BENCH_SECTORS: readonly (readonly Position[])[] = [["CB", "FB"], ["DM", "MF"], ["FW"]];

/** Ordem canônica: mais forte primeiro, desempate pelo id (FR-030). */
function canonical(a: CompletedPlayer, b: CompletedPlayer): number {
  return b.strength - a.strength || a.id.localeCompare(b.id);
}

/** Valor de um jogador numa vaga — o mesmo critério da força efetiva do time. */
export function slotValue(player: CompletedPlayer, position: Position): number {
  return effectiveStrength(player, position) * slotWeight(position);
}

/**
 * Melhor escalação para um esquema: atribuição ótima dos titulares (nenhuma troca titular ↔
 * reserva melhora o time) e banco com cobertura de posições (FR-027 a FR-030).
 */
export function autoLineup(options: AutoLineupOptions): AutoLineupResult {
  const unavailable = new Set(options.unavailable ?? []);
  const available = options.squad.filter((player) => !unavailable.has(player.id)).sort(canonical);
  if (available.length < STARTERS) {
    return {
      ok: false,
      error: matchError("auto_lineup.not_enough_players", {
        available: available.length,
        required: STARTERS,
      }),
    };
  }

  const slots = FORMATIONS[options.formation].slots;
  const matrix = available.map((player) => slots.map((slot) => slotValue(player, slot.position)));
  const assignment = maximizeAssignment(matrix);
  const starters: Record<string, string> = {};
  const used = new Set<string>();
  slots.forEach((slot, column) => {
    const player = available[assignment[column] as number] as CompletedPlayer;
    starters[slot.id] = player.id;
    used.add(player.id);
  });

  const limit = options.benchLimit ?? DEFAULT_BENCH_LIMIT;
  const bench: string[] = [];
  const take = (predicate: (player: CompletedPlayer) => boolean) => {
    if (bench.length >= limit) return;
    const player = available.find((candidate) => !used.has(candidate.id) && predicate(candidate));
    if (player) {
      bench.push(player.id);
      used.add(player.id);
    }
  };
  take((player) => player.position === "GK");
  for (const positions of BENCH_SECTORS) take((player) => positions.includes(player.position));
  while (bench.length < limit && available.some((player) => !used.has(player.id))) {
    take(() => true);
  }

  return {
    ok: true,
    lineup: {
      formation: options.formation,
      posture: options.posture ?? "balanced",
      starters,
      bench,
    },
  };
}
