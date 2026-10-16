import { slotValue } from "../match/auto-lineup";
import { FORMATIONS, type FormationId } from "../match/formations";
import { maximizeAssignment } from "../match/hungarian";
import type { Lineup } from "../match/types";
import type { CompletedPlayer } from "../model/types";
import { SEASON_BENCH_LIMIT } from "../season/lineups";
import type { Place } from "./types";

function canonical(a: CompletedPlayer, b: CompletedPlayer): number {
  return b.strength - a.strength || a.id.localeCompare(b.id);
}

/**
 * Mesmos titulares nas vagas do novo esquema, pela atribuição ótima da escalação automática
 * (research.md R5). Banco e postura não mudam.
 */
export function changeFormation(
  lineup: Lineup,
  formation: FormationId,
  squad: readonly CompletedPlayer[],
): Lineup {
  if (lineup.formation === formation) return lineup;
  const byId = new Map(squad.map((player) => [player.id, player]));
  const players = Object.values(lineup.starters)
    .map((id) => byId.get(id))
    .filter((player): player is CompletedPlayer => player !== undefined)
    .sort(canonical);
  const slots = FORMATIONS[formation].slots;
  const starters: Record<string, string> = {};
  if (players.length >= slots.length) {
    const matrix = players.map((player) => slots.map((slot) => slotValue(player, slot.position)));
    maximizeAssignment(matrix).forEach((row, column) => {
      starters[(slots[column] as (typeof slots)[number]).id] = (players[row] as CompletedPlayer).id;
    });
  } else {
    const matrix = slots.map((slot) => players.map((player) => slotValue(player, slot.position)));
    maximizeAssignment(matrix).forEach((row, column) => {
      starters[(slots[row] as (typeof slots)[number]).id] = (players[column] as CompletedPlayer).id;
    });
  }
  // Ordem das vagas do esquema, para a escalação ser comparável.
  const ordered: Record<string, string> = {};
  for (const slot of slots) {
    const playerId = starters[slot.id];
    if (playerId !== undefined) ordered[slot.id] = playerId;
  }
  return { ...lineup, formation, starters: ordered };
}

function occupant(lineup: Lineup, place: Place): string | undefined {
  if (place.kind === "slot") return lineup.starters[place.slotId];
  if (place.kind === "bench") return lineup.bench[place.index];
  const inLineup =
    Object.values(lineup.starters).includes(place.playerId) ||
    lineup.bench.includes(place.playerId);
  return inLineup ? undefined : place.playerId;
}

/**
 * Move o jogador de `from` para `to`; se `to` estiver ocupado, os dois trocam de lugar. Uma
 * posição livre do banco (índice ≥ tamanho) acrescenta ao fim.
 */
export function placePlayer(
  lineup: Lineup,
  from: Place,
  to: Place,
): { ok: true; lineup: Lineup } | { ok: false; code: "bench_full" | "empty_source" } {
  const moving = occupant(lineup, from);
  if (moving === undefined) return { ok: false, code: "empty_source" };
  const target = occupant(lineup, to);
  if (target === moving) return { ok: true, lineup };
  if (
    to.kind === "bench" &&
    target === undefined &&
    from.kind !== "bench" &&
    lineup.bench.length >= SEASON_BENCH_LIMIT
  ) {
    return { ok: false, code: "bench_full" };
  }

  const starters = { ...lineup.starters };
  const bench = [...lineup.bench];
  // Colocar os dois jogadores nos lugares trocados; o banco é tratado por índice e as remoções
  // ficam por último para não deslocar índices.
  let removeBench: number | undefined;
  const put = (place: Place, playerId: string | undefined) => {
    if (place.kind === "slot") {
      if (playerId === undefined) delete starters[place.slotId];
      else starters[place.slotId] = playerId;
    } else if (place.kind === "bench") {
      if (place.index < bench.length) {
        if (playerId === undefined) removeBench = place.index;
        else bench[place.index] = playerId;
      } else if (playerId !== undefined) {
        bench.push(playerId);
      }
    }
  };
  put(to, moving);
  put(from, target);
  if (removeBench !== undefined) bench.splice(removeBench, 1);
  return { ok: true, lineup: { ...lineup, starters, bench } };
}
