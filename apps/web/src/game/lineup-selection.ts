import type { Lineup, Place } from "@brasfoot-like/engine";

/** Jogador que ocupa um lugar da tela de escalação (undefined = lugar vazio). */
export function occupantOf(lineup: Lineup, place: Place): string | undefined {
  if (place.kind === "slot") return lineup.starters[place.slotId];
  if (place.kind === "bench") return lineup.bench[place.index];
  return place.playerId;
}

export function samePlace(a: Place, b: Place): boolean {
  if (a.kind === "slot" && b.kind === "slot") return a.slotId === b.slotId;
  if (a.kind === "bench" && b.kind === "bench") return a.index === b.index;
  if (a.kind === "out" && b.kind === "out") return a.playerId === b.playerId;
  return false;
}

export type SelectionStep =
  | { kind: "selected"; source: Place }
  | { kind: "cancelled" }
  | { kind: "move"; from: Place; to: Place };

/**
 * Seleção em dois passos (research.md R8): o primeiro lugar escolhido é a origem; o segundo, o
 * destino. Se a origem estiver vazia, o jogador do destino é que vai para ela.
 */
export function selectPlace(
  lineup: Lineup,
  source: Place | undefined,
  place: Place,
): SelectionStep {
  if (!source) return { kind: "selected", source: place };
  if (samePlace(source, place)) return { kind: "cancelled" };
  if (occupantOf(lineup, source) === undefined) return { kind: "move", from: place, to: source };
  return { kind: "move", from: source, to: place };
}
