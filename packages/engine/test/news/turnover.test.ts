import { beforeAll, describe, expect, it } from "vitest";
import { newsSchema } from "../../src/model/schemas";
import { allTimeScorers, clubLegends, titlesByClub } from "../../src/news/history";
import { DEFAULT_NEWS, newsRules } from "../../src/news/rules";
import { type NewsCareer, newsCareer, playNews, turnNews } from "./helpers";

describe("virada das notícias e histórico (014 R8, R9)", () => {
  let two: NewsCareer;
  beforeAll(() => {
    let career = playNews(newsCareer(), { toEnd: true });
    career = turnNews(career);
    career = playNews(career, { toEnd: true });
    two = turnNews(career);
  }, 300_000);

  it("artilheiro de cada divisão por temporada e resumo na rodada 0", () => {
    expect(two.news.seasons).toHaveLength(2);
    for (const season of two.news.seasons) {
      for (const scorer of season.scorers) expect(scorer.goals).toBeGreaterThan(0);
    }
    const summary = two.news.feed.find((round) => round.season === 3 && round.round === 0);
    expect(summary?.headlines.some((headline) => headline.type === "seasonSummary")).toBe(true);
  });

  it("feed só da temporada encerrada e da nova", () => {
    expect(new Set(two.news.feed.map((round) => round.season))).toEqual(new Set([2, 3]));
  });

  it("acumulados, artilheiros históricos e lendas", () => {
    const scorers = allTimeScorers(two.news, 10);
    expect(scorers.length).toBe(10);
    const goals = scorers.map((row) => row.goals);
    expect([...goals].sort((a, b) => b - a)).toEqual(goals);
    const clubId = two.history[0]?.divisions[0]?.championId as string;
    const legends = clubLegends(two.news, clubId, DEFAULT_NEWS.legendsPerClub);
    expect(legends.byGoals.length).toBeGreaterThan(0);
    expect(legends.byMatches.length).toBeLessThanOrEqual(DEFAULT_NEWS.legendsPerClub);
  });

  it("títulos por clube a partir do histórico", () => {
    const titles = titlesByClub(two.history);
    expect(titles.reduce((sum, row) => sum + row.titles, 0)).toBe(4);
  });

  it("recordes de pontos da temporada registrados", () => {
    expect(two.news.records.league.mostPointsSeason?.value).toBeGreaterThan(0);
  });

  it("regras: padrões, sobrescrita e schema", () => {
    expect(newsSchema.safeParse({ feedLimit: 5, variants: { result: 4 } }).success).toBe(true);
    expect(newsSchema.safeParse({ feedLimit: 0 }).success).toBe(false);
    const world = structuredClone(two.world);
    const competition = world.competitions[0];
    if (competition) competition.news = { feedLimit: 5, relevance: { result: 99 } };
    const rules = newsRules(world, competition?.id ?? "");
    expect(rules.feedLimit).toBe(5);
    expect(rules.relevance.result).toBe(99);
    expect(rules.relevance.rout).toBe(DEFAULT_NEWS.relevance.rout);
  });
});
