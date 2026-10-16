import { slotValue } from "../match/auto-lineup";
import { FORMATIONS } from "../match/formations";
import type { Lineup } from "../match/types";
import type { CompletedPlayer } from "../model/types";
import { managerAutoLineup } from "./auto";
import type { LineupChange, Unavailability } from "./types";

const STARTERS = 11;

function sameLineup(a: Lineup, b: Lineup): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Ajuste mínimo antes de uma partida (research.md R4): reservas impedidos saem do banco e cada
 * titular impedido dá lugar ao melhor disponível para a vaga; o resto da escolha fica.
 */
export function adjustLineup(
  lineup: Lineup,
  squad: readonly CompletedPlayer[],
  unavailable: readonly Unavailability[],
): { lineup: Lineup; changes: LineupChange[] } {
  const blocked = new Map(unavailable.map((entry) => [entry.playerId, entry]));
  const available = squad
    .filter((player) => !blocked.has(player.id))
    .sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id));

  if (available.length < STARTERS) {
    const auto = managerAutoLineup(squad, lineup.formation, lineup.posture, unavailable);
    if (sameLineup(auto.lineup, lineup)) return { lineup, changes: [] };
    return { lineup: auto.lineup, changes: [{ kind: "short_squad", fielded: auto.fielded }] };
  }

  const changes: LineupChange[] = [];
  const bench = lineup.bench.filter((playerId) => {
    const entry = blocked.get(playerId);
    if (entry) changes.push({ kind: "bench_removed", outId: playerId, reason: entry.reason });
    return !entry;
  });
  const starters = { ...lineup.starters };
  const onField = new Set(Object.values(starters));
  for (const slot of FORMATIONS[lineup.formation].slots) {
    const outId = starters[slot.id];
    const entry = outId === undefined ? undefined : blocked.get(outId);
    if (outId === undefined || !entry) continue;
    let best: CompletedPlayer | undefined;
    let bestValue = Number.NEGATIVE_INFINITY;
    for (const player of available) {
      if (onField.has(player.id)) continue;
      const value = slotValue(player, slot.position);
      if (value > bestValue + 1e-9) {
        best = player;
        bestValue = value;
      }
    }
    if (!best) continue;
    starters[slot.id] = best.id;
    onField.delete(outId);
    onField.add(best.id);
    const benchIndex = bench.indexOf(best.id);
    if (benchIndex >= 0) bench.splice(benchIndex, 1);
    changes.push({
      kind: "starter_replaced",
      slotId: slot.id,
      outId,
      inId: best.id,
      reason: entry.reason,
    });
  }
  if (changes.length === 0) return { lineup, changes };
  return { lineup: { ...lineup, starters, bench }, changes };
}
