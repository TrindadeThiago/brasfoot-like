import type { LeagueSeason } from "../career/types";
import type { FinanceState } from "../finance/types";
import type { MarketState } from "../market/types";
import type { CompletedBank } from "../model/types";

export const MOOD_FACTORS = [
  "win",
  "draw",
  "loss",
  "derbyWin",
  "derbyDraw",
  "derbyLoss",
  "belowExpectation",
  "aheadOfExpectation",
  "calm",
  "idolLost",
  "starSigned",
  "seasonStart",
  "cupOut",
  "cupTitle",
  "continentalTitle",
] as const;
export type MoodFactor = (typeof MOOD_FACTORS)[number];

export const MOOD_BANDS = ["furious", "unhappy", "neutral", "happy", "euphoric"] as const;
export type MoodBand = (typeof MOOD_BANDS)[number];

export interface MoodChange {
  season: number;
  round: number;
  delta: number;
  value: number;
  factors: { kind: MoodFactor; amount: number }[];
}

export interface ClubFans {
  /** Humor da torcida, 0–100. */
  mood: number;
  /** Últimas mudanças (só no clube do jogador). */
  recent: MoodChange[];
}

export interface FansState {
  clubs: Record<string, ClubFans>;
}

export interface FansContext {
  world: CompletedBank;
  league: LeagueSeason;
  finances: FinanceState;
  fans: FansState;
  /** Mercado depois da rodada: o log da rodada traz as saídas e chegadas de ídolos. */
  market?: MarketState;
}
