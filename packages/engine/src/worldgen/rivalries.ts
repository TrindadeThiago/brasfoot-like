import type { Club, Rivalry } from "../model/types";
import { createRng } from "../rng/xoshiro";

/** Clubes por região gerada no banco padrão (research.md R2 da 013). */
const REGION_SIZE = 5;

/**
 * Rivalidades do banco padrão: os clubes são agrupados em regiões de 5 por um embaralhamento
 * determinístico e, em cada região, ligados em ciclo por ordem de reputação — o par dos dois
 * maiores é o maior clássico (intensidade 3), os vizinhos seguintes tradicionais (2) e o fecho do
 * ciclo regional (1). Cada clube fica com 2 rivais (1 numa região de 2 clubes).
 */
export function generateRivalries(clubs: readonly Club[], seed: string | number): Rivalry[] {
  const rng = createRng(`${seed}:rivalries`);
  const ordered = [...clubs].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const shuffled = rng.shuffle(ordered);
  const rivalries: Rivalry[] = [];
  for (let start = 0; start < shuffled.length; start += REGION_SIZE) {
    const region = shuffled
      .slice(start, start + REGION_SIZE)
      .sort((a, b) => b.reputation - a.reputation || (a.id < b.id ? -1 : 1));
    if (region.length < 2) continue;
    const pairs: [Club, Club, 1 | 2 | 3][] = [];
    for (let index = 0; index + 1 < region.length; index++) {
      pairs.push([
        region[index] as Club,
        region[index + 1] as Club,
        index === 0 ? 3 : index === 1 ? 2 : 1,
      ]);
    }
    if (region.length > 2) pairs.push([region.at(-1) as Club, region[0] as Club, 1]);
    for (const [a, b, intensity] of pairs) {
      rivalries.push({ clubIds: a.id < b.id ? [a.id, b.id] : [b.id, a.id], intensity });
    }
  }
  return rivalries.sort((a, b) =>
    a.clubIds[0] === b.clubIds[0]
      ? a.clubIds[1] < b.clubIds[1]
        ? -1
        : 1
      : a.clubIds[0] < b.clubIds[0]
        ? -1
        : 1,
  );
}
