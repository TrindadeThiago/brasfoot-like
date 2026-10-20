import { beforeAll, describe, expect, it } from "vitest";
import { leagueTotalRounds } from "../../src/career/league";
import { newsAfterRound } from "../../src/news/round";
import { DEFAULT_NEWS } from "../../src/news/rules";
import { type NewsCareer, newsCareer, playNews } from "./helpers";

describe("feed da rodada (014 R4, critério de aceite 1, SC-001, SC-004)", () => {
  let season: NewsCareer;
  beforeAll(() => {
    season = playNews(newsCareer(), { toEnd: true });
  }, 120_000);

  it("toda rodada tem manchete do clube do jogador", () => {
    const rounds = season.news.feed.filter((entry) => entry.season === 1 && entry.round > 0);
    expect(rounds).toHaveLength(leagueTotalRounds(season.league));
    for (const round of rounds) {
      expect(round.headlines.some((headline) => headline.mine)).toBe(true);
    }
  });

  it("limite por rodada, um fato principal por jogo, ordem por relevância", () => {
    for (const round of season.news.feed) {
      expect(round.headlines.length).toBeLessThanOrEqual(DEFAULT_NEWS.feedLimit);
      const matches = round.headlines.map((headline) => headline.match).filter(Boolean);
      expect(new Set(matches).size).toBe(matches.length);
      for (const headline of round.headlines) {
        expect(headline.extras?.length ?? 0).toBeLessThanOrEqual(DEFAULT_NEWS.extrasPerMatch);
      }
      const relevance = round.headlines.map((headline) => headline.relevance);
      expect([...relevance].sort((a, b) => b - a)).toEqual(relevance);
    }
  });

  it("variedade de tipos na temporada (SC-005)", () => {
    const types = new Set(
      season.news.feed.flatMap((round) =>
        round.headlines.flatMap((headline) => [
          headline.type,
          ...(headline.extras ?? []).map((extra) => extra.type),
        ]),
      ),
    );
    expect(types.size).toBeGreaterThanOrEqual(10);
  });

  it("desempregado: só liga e mercado, nada marcado como do jogador", () => {
    const career = playNews(newsCareer(), { rounds: 1 });
    const news = newsAfterRound(
      {
        world: career.world,
        league: career.league,
        news: { ...career.news, feed: [] },
        careerSeed: career.careerSeed,
        managerClubId: "",
      },
      1,
    );
    expect(news.feed[0]?.headlines.every((headline) => !headline.mine)).toBe(true);
    expect(news.feed[0]?.headlines.some((headline) => headline.type === "result")).toBe(false);
  });

  it("determinístico, inclusive salvando e carregando", () => {
    const start = newsCareer();
    const direct = playNews(start, { rounds: 10 });
    const half = JSON.parse(JSON.stringify(playNews(start, { rounds: 5 })));
    expect(playNews(half, { rounds: 5 }).news).toEqual(direct.news);
  });

  it("título matemático aparece no máximo uma vez", () => {
    const titles = season.news.feed
      .flatMap((round) => round.headlines)
      .filter((headline) => headline.type === "titleClinched");
    const champions = new Set(titles.map((headline) => headline.clubIds[0]));
    expect(champions.size).toBe(titles.length);
  });
});
