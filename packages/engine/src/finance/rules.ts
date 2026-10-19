import type { CompletedBank } from "../model/types";
import type { DivisionEconomy, EconomyRules } from "./types";

/**
 * Regras econômicas padrão (data-model.md, research.md R10–R11), calibradas com
 * `pnpm sim:economy` para as metas de 30 temporadas: usadas quando o mod não traz
 * `competition.economy` ou deixa campos de fora.
 */
export const DEFAULT_ECONOMY: EconomyRules = {
  fansBase: 16_000,
  fansPerReputation: 50,
  priceElasticityPct: 150,
  priceRange: { min: 5, max: 200 },
  credit: { perReputation: 30_000, interestBp: 30 },
  stadium: {
    maxCapacity: 100_000,
    options: [
      { seats: 2000, cost: 1_500_000, rounds: 6 },
      { seats: 5000, cost: 4_000_000, rounds: 12 },
      { seats: 10_000, cost: 9_000_000, rounds: 20 },
    ],
  },
  crisisRounds: 10,
  wageFactorPct: 100,
  divisions: [
    {
      level: 1,
      referencePrice: 12,
      fanFactorPct: 100,
      sponsorship: { base: 900_000, perReputation: 0, wageSharePct: 30 },
      prizes: { first: 2_000_000, last: 300_000, title: 1_000_000 },
      creditBase: 2_000_000,
    },
    {
      level: 2,
      referencePrice: 8,
      fanFactorPct: 70,
      sponsorship: { base: 400_000, perReputation: 0, wageSharePct: 60 },
      prizes: { first: 900_000, last: 150_000, title: 400_000 },
      creditBase: 1_000_000,
    },
  ],
};

/** Regras de um nível; um nível sem entrada usa as do último nível conhecido. */
export function divisionEconomy(rules: EconomyRules, level: number): DivisionEconomy {
  const exact = rules.divisions.find((division) => division.level === level);
  if (exact) return exact;
  const known = [...rules.divisions].sort((a, b) => a.level - b.level);
  const fallback = [...known].reverse().find((division) => division.level < level) ?? known[0];
  if (!fallback) throw new Error("regras econômicas sem divisões");
  return { ...fallback, level };
}

/** Regras econômicas da competição: `competition.economy` com os padrões preenchidos. */
export function economyRules(world: CompletedBank, competitionId: string): EconomyRules {
  const competition = world.competitions.find((entry) => entry.id === competitionId);
  if (!competition) throw new Error(`competição inexistente: ${competitionId}`);
  const economy = competition.economy ?? {};
  const levels = [...competition.divisions.map((division) => division.level)].sort((a, b) => a - b);
  const levelsWithDefaults = [
    ...new Set([...DEFAULT_ECONOMY.divisions.map((division) => division.level), ...levels]),
  ].sort((a, b) => a - b);
  const divisions = levelsWithDefaults.map((level): DivisionEconomy => {
    const base = divisionEconomy(DEFAULT_ECONOMY, level);
    const override = economy.divisions?.find((division) => division.level === level);
    return {
      level,
      referencePrice: override?.referencePrice ?? base.referencePrice,
      fanFactorPct: override?.fanFactorPct ?? base.fanFactorPct,
      sponsorship: override?.sponsorship
        ? {
            base: override.sponsorship.base,
            perReputation: override.sponsorship.perReputation,
            wageSharePct: override.sponsorship.wageSharePct ?? base.sponsorship.wageSharePct,
          }
        : base.sponsorship,
      prizes: override?.prizes ?? base.prizes,
      creditBase: override?.creditBase ?? base.creditBase,
    };
  });
  return {
    fansBase: economy.fansBase ?? DEFAULT_ECONOMY.fansBase,
    fansPerReputation: economy.fansPerReputation ?? DEFAULT_ECONOMY.fansPerReputation,
    priceElasticityPct: economy.priceElasticityPct ?? DEFAULT_ECONOMY.priceElasticityPct,
    priceRange: economy.priceRange ?? DEFAULT_ECONOMY.priceRange,
    credit: economy.credit ?? DEFAULT_ECONOMY.credit,
    stadium: economy.stadium ?? DEFAULT_ECONOMY.stadium,
    crisisRounds: economy.crisisRounds ?? DEFAULT_ECONOMY.crisisRounds,
    wageFactorPct: economy.wageFactorPct ?? DEFAULT_ECONOMY.wageFactorPct,
    divisions,
  };
}
