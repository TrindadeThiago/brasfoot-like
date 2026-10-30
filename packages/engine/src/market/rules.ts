import type { CompletedBank } from "../model/types";
import type { MarketRules } from "./types";

/** Venda imediata: a IA paga esta parte do valor de mercado (o dono abre mão da negociação). */
export const QUICK_SALE_PCT = 75;

/**
 * Regras do mercado padrão (research.md R3–R11), usadas quando o mod não traz
 * `competition.market` ou deixa campos de fora. Calibradas pelos testes de 30 temporadas.
 */
export const DEFAULT_MARKET: MarketRules = {
  contractYears: { min: 1, max: 5, veteranAge: 33, veteranMax: 2 },
  lastYearValuePct: 60,
  twoYearsValuePct: 85,
  club: {
    counterThresholdPct: 70,
    keyPlayerPct: 125,
    noiseMinPct: 95,
    noiseMaxPct: 110,
    maxBidMinPct: 100,
    maxBidMaxPct: 120,
    loanFeePct: 10,
  },
  player: { demandThresholdPct: 80, interestMargin: 25, divisionBonus: [10, -10, -20] },
  incoming: {
    chancePct: 20,
    maxOpen: 3,
    expireRounds: 3,
    minPct: 85,
    maxPct: 110,
    cashBufferMonths: 6,
  },
  freeAgents: { maxSeasons: 1, retireAge: 33 },
  ai: { renewMaxAge: 34, renewTopN: 24, wageReviewPct: 90 },
};

/** Regras do mercado da competição: `competition.market` com os padrões preenchidos. */
export function marketRules(world: CompletedBank, competitionId: string): MarketRules {
  const competition = world.competitions.find((entry) => entry.id === competitionId);
  const market = competition?.market ?? {};
  return {
    ...(market.windows ? { windows: market.windows } : {}),
    contractYears: market.contractYears ?? DEFAULT_MARKET.contractYears,
    lastYearValuePct: market.lastYearValuePct ?? DEFAULT_MARKET.lastYearValuePct,
    twoYearsValuePct: market.twoYearsValuePct ?? DEFAULT_MARKET.twoYearsValuePct,
    club: market.club ?? DEFAULT_MARKET.club,
    player: market.player ?? DEFAULT_MARKET.player,
    incoming: market.incoming ?? DEFAULT_MARKET.incoming,
    freeAgents: market.freeAgents ?? DEFAULT_MARKET.freeAgents,
    ai: market.ai ?? DEFAULT_MARKET.ai,
  };
}
