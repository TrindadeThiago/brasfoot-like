/**
 * Padrões das regras das competições entre países (022), usados quando o mod não os declara. Os
 * valores são pontos de partida, calibrados pelo teste de simulação longa.
 */
export const CONTINENTAL_TUNING = {
  /** Reputação máxima que o bônus continental leva um clube (`awards.reputationCeiling`). */
  reputationCeiling: 95,
} as const;

/**
 * Limites do equilíbrio da competição entre países (Princípio V), declarados e versionados aqui:
 * `ci` vale para a versão reduzida do teste (poucas temporadas, mundo pequeno); `full` para as 30
 * temporadas de `pnpm sim:world --continental`.
 */
export const CONTINENTAL_LIMITS = {
  ci: {
    /** Parcela mínima das temporadas em que o campeão é mais forte que a média dos participantes. */
    minChampionStrongerShare: 0.6,
    minDistinctChampions: 3,
    maxTitleShare: 0.5,
    minSlotsTitlesSpearman: 0,
  },
  full: {
    minChampionStrongerShare: 0.7,
    minDistinctChampions: 5,
    maxTitleShare: 0.4,
    minSlotsTitlesSpearman: 0.3,
  },
  /** Economia dos assíduos (as noções da 008): caixa acima da mediana, fora de crise, parcela dos prêmios. */
  assiduousCashAboveMedianWages: 4,
  /** Os assíduos ficam fora de crise ao menos nesta parcela, e nunca muito abaixo dos demais clubes. */
  assiduousMinHealthyShare: 0.7,
  assiduousHealthyBelowOthers: 0.1,
  maxAwardsShare: 0.15,
  /** Reputação: ninguém passa do teto e o mundo quase não se desloca. */
  maxReputationBreaches: 0,
  maxReputationDrift: 3,
} as const;
