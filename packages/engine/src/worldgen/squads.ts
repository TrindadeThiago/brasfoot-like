import { POSITIONS, type Position } from "../model/catalogs";
import type { Rng } from "../rng/xoshiro";
import { GENERATOR_TUNING } from "./tuning";

/** Quantidade de jogadores por posição, dentro das faixas do FR-030. */
export function composeSquad(rng: Rng): Record<Position, number> {
  const { min, max, total } = GENERATOR_TUNING.squad;
  const counts: Record<Position, number> = { ...min };
  const target = rng.int(total[0], total[1]);
  let size = POSITIONS.reduce((sum, position) => sum + counts[position], 0);
  while (size < target) {
    const open = POSITIONS.filter((position) => counts[position] < max[position]);
    if (open.length === 0) break;
    counts[rng.pick(open)] += 1;
    size += 1;
  }
  return counts;
}
