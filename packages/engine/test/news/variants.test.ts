import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_NEWS } from "../../src/news/rules";
import { HEADLINE_TYPES } from "../../src/news/types";
import { variantOf } from "../../src/news/variants";
import { newsCareer, playNews } from "./helpers";

const UI = JSON.parse(
  readFileSync(join(import.meta.dirname, "../../../i18n/locales/pt-BR/ui.json"), "utf8"),
) as Record<string, string>;

describe("variações de texto (014 R6)", () => {
  it("determinísticas e dentro da faixa", () => {
    for (const type of HEADLINE_TYPES) {
      const a = variantOf(DEFAULT_NEWS, "seed", "1:2:x", type);
      expect(variantOf(DEFAULT_NEWS, "seed", "1:2:x", type)).toBe(a);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(DEFAULT_NEWS.variants[type]);
    }
  });

  it("toda variação tem texto", () => {
    for (const type of HEADLINE_TYPES) {
      for (let index = 0; index < DEFAULT_NEWS.variants[type]; index++) {
        expect(UI[`news.${type}.${index}`], `news.${type}.${index}`).toBeDefined();
      }
      expect(UI[`news.extra.${type}`], `news.extra.${type}`).toBeDefined();
    }
  });

  it("nenhuma variação domina o seu tipo numa temporada (SC-005)", () => {
    const season = playNews(newsCareer(), { toEnd: true });
    const counts = new Map<string, number[]>();
    for (const headline of season.news.feed.flatMap((round) => round.headlines)) {
      const list =
        counts.get(headline.type) ?? new Array(DEFAULT_NEWS.variants[headline.type]).fill(0);
      list[headline.variant] += 1;
      counts.set(headline.type, list);
    }
    for (const [, list] of counts) {
      const total = list.reduce((sum, value) => sum + value, 0);
      if (total >= 10) expect(Math.max(...list)).toBeLessThanOrEqual(total / 2);
    }
  }, 120_000);
});
