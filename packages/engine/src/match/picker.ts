import type { Position, Trait } from "../model/catalogs.js";
import type { CompletedPlayer } from "../model/types.js";
import type { Rng } from "../rng/xoshiro.js";
import { MATCH_TUNING } from "./tuning.js";
import type { ShotKind } from "./types.js";

/** Jogador em campo com a posição da vaga que ocupa. */
export interface FieldPlayer {
  player: CompletedPlayer;
  slotId: string;
  slotPosition: Position;
}

function has(player: CompletedPlayer, trait: Trait): boolean {
  return player.traits.includes(trait);
}

function pick(
  rng: Rng,
  players: readonly FieldPlayer[],
  weight: (p: FieldPlayer) => number,
): FieldPlayer {
  return rng.weighted(players.map((value) => ({ value, weight: Math.max(weight(value), 1e-6) })));
}

/** Peso individual por atributo oculto (temperamento ou propensão): base + valor/divisor. */
export function attributeWeight(value: number): number {
  const { base, divisor } = MATCH_TUNING.attributeWeight;
  return base + value / divisor;
}

const KIND_TRAIT: Partial<Record<ShotKind, Trait>> = {
  header: "heading",
  counter: "pace",
  free_kick: "free-kick",
  penalty: "free-kick",
};

export function pickShooter(
  rng: Rng,
  players: readonly FieldPlayer[],
  kind: ShotKind,
): FieldPlayer {
  const kindTrait = KIND_TRAIT[kind];
  return pick(rng, players, ({ player, slotPosition }) => {
    let weight = MATCH_TUNING.shooterWeight[slotPosition] * player.strength;
    if (has(player, "finisher")) weight *= 1.5;
    if (kindTrait && has(player, kindTrait))
      weight *= kind === "penalty" || kind === "free_kick" ? 6 : 2;
    return weight;
  });
}

export function pickAssister(
  rng: Rng,
  players: readonly FieldPlayer[],
  shooterId: string,
): FieldPlayer | undefined {
  const candidates = players.filter(({ player }) => player.id !== shooterId);
  if (candidates.length === 0) return undefined;
  return pick(rng, candidates, ({ player, slotPosition }) => {
    let weight = MATCH_TUNING.assistWeight[slotPosition] * player.strength;
    if (has(player, "playmaker")) weight *= MATCH_TUNING.traits.playmakerAssistWeight;
    return weight;
  });
}

/** Quem comete a falta; `booked` = já amarelados, que jogam com cautela. */
export function pickFouler(
  rng: Rng,
  players: readonly FieldPlayer[],
  booked: ReadonlySet<string> = new Set(),
): FieldPlayer {
  return pick(rng, players, ({ player, slotPosition }) => {
    const weight =
      MATCH_TUNING.foulWeight[slotPosition] * attributeWeight(player.hidden.temperament);
    return booked.has(player.id) ? weight * MATCH_TUNING.cautionAfterYellow : weight;
  });
}

export function pickInjured(rng: Rng, players: readonly FieldPlayer[]): FieldPlayer {
  return pick(rng, players, ({ player }) => attributeWeight(player.hidden.injuryProneness));
}
