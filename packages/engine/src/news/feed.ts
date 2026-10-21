import type { NewsRules } from "./rules";
import { HEADLINE_TYPES, type Headline, type NewsState, type RoundFeed } from "./types";

function typeOrder(headline: Headline): number {
  return HEADLINE_TYPES.indexOf(headline.type);
}

/** Ordem do feed: relevância, tipo e id. */
export function compare(a: Headline, b: Headline): number {
  return (
    b.relevance - a.relevance ||
    typeOrder(a) - typeOrder(b) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}

/**
 * Feed da rodada (research.md R4): por jogo, só a manchete mais relevante fica como principal e as
 * seguintes viram extras (até `extrasPerMatch`); ordena por relevância e limita a `feedLimit`,
 * garantindo a melhor manchete do clube do jogador.
 */
export function rankFeed(rules: NewsRules, headlines: readonly Headline[]): Headline[] {
  const byMatch = new Map<string, Headline[]>();
  const loose: Headline[] = [];
  for (const headline of headlines) {
    if (!headline.match) {
      loose.push(headline);
      continue;
    }
    const group = byMatch.get(headline.match) ?? [];
    group.push(headline);
    byMatch.set(headline.match, group);
  }
  const mains: Headline[] = [...loose];
  for (const group of byMatch.values()) {
    const sorted = [...group].sort(compare);
    const [main, ...rest] = sorted;
    if (!main) continue;
    const extras = rest
      .slice(0, rules.extrasPerMatch)
      .map((entry) => ({ type: entry.type, vars: entry.vars }));
    mains.push({
      ...main,
      mine: group.some((entry) => entry.mine),
      ...(extras.length > 0 ? { extras } : {}),
    });
  }
  const sorted = mains.sort(compare);
  const top = sorted.slice(0, rules.feedLimit);
  const bestMine = sorted.find((headline) => headline.mine);
  if (bestMine && !top.includes(bestMine)) top[top.length - 1] = bestMine;
  return top.sort(compare);
}

/** Manchetes guardadas de uma rodada. */
export function headlinesOf(news: NewsState, season: number, round: number): Headline[] {
  return (
    news.feed.find((entry) => entry.season === season && entry.round === round)?.headlines ?? []
  );
}

/** Feed mais recente com manchetes. */
export function latestFeed(news: NewsState): RoundFeed | undefined {
  return [...news.feed].reverse().find((entry) => entry.headlines.length > 0);
}
