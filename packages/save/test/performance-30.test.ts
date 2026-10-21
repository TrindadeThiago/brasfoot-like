import { isLeagueSeasonOver } from "@brasfoot-like/engine";
import { beforeAll, describe, expect, it } from "vitest";
import { advanceCareerSeason, createSave, type SaveFile } from "../src";
import { defaultBank, SERIE_A } from "./fixtures";
import { playRound } from "./helpers";

// 016 R1 (FR-028, SC-005): limites do motor numa carreira de 30 temporadas, ~4–5× acima do
// medido para tolerar máquinas mais lentas e o CI. Mediana de 5 execuções da mesma entrada.
const SEASONS = 30;
const RUNS = 5;
const MAX_TURNOVER_MS = 400;
const MAX_ROUND_MS = 250;
const NOW = "2026-10-20T00:00:00.000Z";

function median(work: () => unknown): number {
  const times: number[] = [];
  for (let run = 0; run < RUNS; run++) {
    const start = performance.now();
    work();
    times.push(performance.now() - start);
  }
  return times.sort((a, b) => a - b)[Math.floor(RUNS / 2)] ?? Number.POSITIVE_INFINITY;
}

describe("desempenho numa carreira de 30 temporadas (016 R1)", () => {
  // Fim da 30ª temporada (antes da virada) e início da 31ª.
  let seasonOver: SaveFile;
  let nextSeason: SaveFile;

  beforeAll(() => {
    const created = createSave({
      id: "desempenho",
      now: NOW,
      managerName: "Ana",
      clubId: SERIE_A[0] as string,
      seed: "desempenho",
      defaultBank: defaultBank(),
      noFiring: true,
    });
    if (!created.ok) throw new Error("criação");
    let save = created.save;
    for (let season = 1; season <= SEASONS; season++) {
      while (!isLeagueSeasonOver(save.league)) save = playRound(save);
      if (season === SEASONS) seasonOver = save;
      const turned = advanceCareerSeason(save, NOW);
      if (!turned.ok) throw new Error(JSON.stringify(turned.error));
      save = turned.save;
    }
    nextSeason = save;
  }, 1_200_000);

  it(`virada de temporada abaixo de ${MAX_TURNOVER_MS} ms`, () => {
    const time = median(() => advanceCareerSeason(seasonOver, NOW));
    console.log(`virada (30 temporadas): ${time.toFixed(1)} ms`);
    expect(time).toBeLessThan(MAX_TURNOVER_MS);
  });

  it(`rodada da carreira abaixo de ${MAX_ROUND_MS} ms`, () => {
    const time = median(() => playRound(nextSeason));
    console.log(`rodada (temporada 31): ${time.toFixed(1)} ms`);
    expect(time).toBeLessThan(MAX_ROUND_MS);
  });
});
