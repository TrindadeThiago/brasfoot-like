import type { CompletedBank } from "../model/types";
import { HEADLINE_TYPES, type HeadlineType } from "./types";

/** Parâmetros das manchetes (research.md R12 da 014). */
export interface NewsRules {
  routMargin: number;
  upsetGap: number;
  streakMin: number;
  droughtMin: number;
  /** Transferência relevante: valor ≥ este percentil dos valores de mercado do mundo. */
  bigTransferPct: number;
  relevance: Record<HeadlineType, number>;
  mineBonus: number;
  feedLimit: number;
  homeLimit: number;
  extrasPerMatch: number;
  allTimeTop: number;
  legendsPerClub: number;
  variants: Record<HeadlineType, number>;
}

const RELEVANCE: Record<HeadlineType, number> = {
  result: 10,
  hatTrick: 60,
  rout: 50,
  comeback: 55,
  upset: 55,
  derby: 45,
  streak: 40,
  droughtEnd: 45,
  record: 90,
  coachFired: 40,
  coachHired: 20,
  managerFired: 95,
  managerHired: 95,
  bigTransfer: 35,
  titleClinched: 85,
  promotionClinched: 80,
  relegationConfirmed: 80,
  seasonSummary: 100,
  cupUpset: 55,
  cupElimination: 50,
  cupFinal: 60,
  cupChampion: 85,
  qualification: 75,
};

const VARIANTS = Object.fromEntries(
  HEADLINE_TYPES.map((type) => [type, type === "result" ? 6 : type === "seasonSummary" ? 2 : 3]),
) as Record<HeadlineType, number>;

export const DEFAULT_NEWS: NewsRules = {
  routMargin: 4,
  upsetGap: 8,
  streakMin: 3,
  droughtMin: 6,
  bigTransferPct: 90,
  relevance: RELEVANCE,
  mineBonus: 40,
  feedLimit: 10,
  homeLimit: 3,
  extrasPerMatch: 1,
  allTimeTop: 100,
  legendsPerClub: 10,
  variants: VARIANTS,
};

/** Regras das manchetes: `competition.news` com os padrões preenchidos. */
export function newsRules(world: CompletedBank, competitionId: string): NewsRules {
  const competition = world.competitions.find((entry) => entry.id === competitionId);
  const override = competition?.news ?? {};
  const merged: NewsRules = {
    ...DEFAULT_NEWS,
    relevance: { ...DEFAULT_NEWS.relevance },
    variants: { ...DEFAULT_NEWS.variants },
  };
  for (const [key, value] of Object.entries(override)) {
    if (typeof value === "number" && key in merged) {
      (merged as unknown as Record<string, number>)[key] = value;
    }
  }
  for (const type of HEADLINE_TYPES) {
    const relevance = override.relevance?.[type];
    if (relevance !== undefined) merged.relevance[type] = relevance;
    const variants = override.variants?.[type];
    if (variants !== undefined) merged.variants[type] = variants;
  }
  return merged;
}
