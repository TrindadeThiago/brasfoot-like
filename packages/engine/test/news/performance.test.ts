import { describe, expect, it } from "vitest";
import { newsAfterRound } from "../../src/news/round";
import { MANAGER, newsCareer, playNews } from "./helpers";

// Limite de desempenho da 014 (plan.md, Performance Goals).
const AFTER_ROUND_LIMIT_MS = 10;

describe("desempenho das notícias", () => {
  it(`notícias de uma rodada em menos de ${AFTER_ROUND_LIMIT_MS} ms`, () => {
    const career = playNews(newsCareer(), { rounds: 10 });
    const context = {
      world: career.world,
      league: career.league,
      news: career.news,
      careerSeed: career.careerSeed,
      managerClubId: MANAGER,
      market: career.market,
    };
    const times = Array.from({ length: 11 }, () => {
      const start = performance.now();
      newsAfterRound(context, 10);
      return performance.now() - start;
    }).sort((a, b) => a - b);
    expect(times[5]).toBeLessThan(AFTER_ROUND_LIMIT_MS);
  });
});
