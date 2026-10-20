import { seasonTurnover } from "../../src/career/turnover";
import type { SeasonHistoryEntry } from "../../src/career/types";
import { advanceCareer } from "../../src/finance/round";
import { createNews } from "../../src/news/create";
import type { NewsState } from "../../src/news/types";
import type { MatchRecord } from "../../src/season/types";
import { type FansCareer, fansCareer, MANAGER } from "../fans/helpers";

export { MANAGER };

export interface NewsCareer extends FansCareer {
  news: NewsState;
  history: SeasonHistoryEntry[];
}

export function newsCareer(options: Parameters<typeof fansCareer>[0] = {}): NewsCareer {
  return { ...fansCareer(options), news: createNews(), history: [] };
}

/** Avança pelo caminho da carreira com mercado, diretoria, torcida e notícias. */
export function playNews(
  career: NewsCareer,
  step: { rounds: number } | { toEnd: true },
): NewsCareer {
  const result = advanceCareer(
    career.league,
    career.finances,
    career.world,
    step,
    career.board.manager.clubId ?? "",
    undefined,
    undefined,
    { state: career.market, careerSeed: career.careerSeed },
    { state: career.board, careerSeed: career.careerSeed },
    { state: career.fans },
    { state: career.news, careerSeed: career.careerSeed },
  );
  if (!result.ok || !result.news || !result.board || !result.market || !result.fans) {
    throw new Error(JSON.stringify(result));
  }
  return {
    ...career,
    league: result.league,
    finances: result.finances,
    world: result.world,
    market: result.market,
    board: result.board,
    fans: result.fans,
    news: result.news,
  };
}

/** Virada de temporada com tudo ativo. */
export function turnNews(career: NewsCareer): NewsCareer {
  const turned = seasonTurnover(career.league, career.world, career.history, {
    careerSeed: career.careerSeed,
    finances: career.finances,
    managerClubId: career.board.manager.clubId ?? "",
    market: career.market,
    board: career.board,
    fans: career.fans,
    news: career.news,
  });
  if (!turned.ok || !turned.news || !turned.finances || !turned.board || !turned.fans) {
    throw new Error(JSON.stringify(turned));
  }
  return {
    ...career,
    league: turned.league,
    history: turned.history,
    world: turned.world,
    finances: turned.finances,
    market: turned.market ?? career.market,
    board: turned.board,
    fans: turned.fans,
    news: turned.news,
  };
}

/** Jogo do clube na rodada. */
export function matchOf(career: Pick<NewsCareer, "league">, clubId: string, round: number) {
  for (const season of career.league.divisions) {
    const record = season.records.find(
      (entry) => entry.round === round && (entry.home === clubId || entry.away === clubId),
    );
    if (record) return record;
  }
  throw new Error("sem jogo");
}

/** Copia a carreira com um jogo editado. */
export function withRecord(
  career: NewsCareer,
  round: number,
  home: string,
  edit: (record: MatchRecord) => void,
): NewsCareer {
  const league = structuredClone(career.league);
  for (const season of league.divisions) {
    const record = season.records.find((entry) => entry.round === round && entry.home === home);
    if (record) edit(record);
  }
  return { ...career, league };
}
