import { adequacy } from "../match/adequacy";
import { FORMATION_IDS, FORMATIONS, type FormationId } from "../match/formations";
import type { Lineup } from "../match/types";
import type { CompletedPlayer } from "../model/types";
import { SEASON_BENCH_LIMIT } from "../season/lineups";
import type { LineupIssue, LineupIssueSeverity, LineupValidation, Unavailability } from "./types";

const STARTERS = 11;
const RANK: Record<LineupIssueSeverity, number> = { error: 0, warning: 1, info: 2 };

const percent = (factor: number) => Math.round(factor * 100);

/** Problemas de uma escalação do jogador, por gravidade (research.md R3). */
export function validateLineup(
  lineup: Lineup,
  squad: readonly CompletedPlayer[],
  unavailable: readonly Unavailability[],
): LineupValidation {
  if (!(FORMATION_IDS as readonly string[]).includes(lineup.formation)) {
    return {
      valid: false,
      issues: [
        {
          code: "unknown_formation",
          severity: "error",
          params: { formation: lineup.formation },
        },
      ],
    };
  }
  const byId = new Map(squad.map((player) => [player.id, player]));
  const blocked = new Map(unavailable.map((entry) => [entry.playerId, entry]));
  const availableCount = squad.filter((player) => !blocked.has(player.id)).length;
  const shortSquad = availableCount < STARTERS;
  const issues: LineupIssue[] = [];
  const seen = new Set<string>();

  const checkPlayer = (playerId: string, slotId?: string): CompletedPlayer | undefined => {
    const where = slotId === undefined ? {} : { slotId };
    if (seen.has(playerId)) {
      issues.push({ code: "duplicate_player", severity: "error", ...where, playerId, params: {} });
      return undefined;
    }
    seen.add(playerId);
    const player = byId.get(playerId);
    if (!player) {
      issues.push({ code: "not_in_squad", severity: "error", ...where, playerId, params: {} });
      return undefined;
    }
    const impediment = blocked.get(playerId);
    if (impediment) {
      issues.push({
        code: "unavailable",
        severity: shortSquad ? "warning" : "error",
        ...where,
        playerId,
        params: { reason: impediment.reason, remaining: impediment.remaining },
      });
    }
    return player;
  };

  const slots = FORMATIONS[lineup.formation as FormationId].slots;
  const known = new Set(slots.map((slot) => slot.id));
  for (const slot of slots) {
    const playerId = lineup.starters[slot.id];
    if (playerId === undefined) {
      issues.push({ code: "empty_slot", severity: "error", slotId: slot.id, params: {} });
      continue;
    }
    const player = checkPlayer(playerId, slot.id);
    if (!player || player.position === slot.position) continue;
    const factor = adequacy(player.position, slot.position);
    if (slot.position === "GK") {
      issues.push({
        code: "no_goalkeeper",
        severity: "warning",
        slotId: slot.id,
        playerId,
        params: { percent: percent(factor) },
      });
    } else {
      issues.push({
        code: "out_of_position",
        severity: "info",
        slotId: slot.id,
        playerId,
        params: { percent: percent(factor) },
      });
    }
  }
  for (const [slotId, playerId] of Object.entries(lineup.starters)) {
    if (!known.has(slotId)) {
      issues.push({ code: "unknown_slot", severity: "error", slotId, playerId, params: {} });
    }
  }
  if (lineup.bench.length > SEASON_BENCH_LIMIT) {
    issues.push({
      code: "bench_too_large",
      severity: "error",
      params: { count: lineup.bench.length, max: SEASON_BENCH_LIMIT },
    });
  }
  for (const playerId of lineup.bench) checkPlayer(playerId);
  if (shortSquad) {
    issues.push({
      code: "short_squad",
      severity: "warning",
      params: { available: availableCount, required: STARTERS },
    });
  }

  const ordered = issues
    .map((issue, index) => ({ issue, index }))
    .sort((a, b) => RANK[a.issue.severity] - RANK[b.issue.severity] || a.index - b.index)
    .map((entry) => entry.issue);
  return { valid: !ordered.some((issue) => issue.severity === "error"), issues: ordered };
}
