/**
 * Faixas de credibilidade de uma temporada (FR-030 a FR-037), verificadas em 100 temporadas
 * (Princípio V). Afrouxar uma faixa exige justificativa registrada.
 */
export const SEASON_CREDIBILITY_LIMITS = {
  /**
   * FR-030: fração de temporadas com o campeão entre os 4 mais fortes. Teto 0,99 (era 0,95): o
   * banco tem 4 grandes bem acima dos médios; o "nem sempre" é garantido pelo FR-031.
   */
  championTop4Rate: [0.6, 0.99],
  /** FR-031: fração de temporadas em que o mais forte é campeão. */
  strongestChampionRate: [0.25, 0.7],
  /** FR-032 */
  championPoints: [70, 90],
  minChampionPointsRate: 0.9,
  /** FR-033 */
  lastPoints: [15, 40],
  minLastPointsRate: 0.9,
  /** FR-034 */
  maxUnbeatenRate: 0.1,
  /** FR-035 */
  minMeanSpearman: 0.5,
  minSeasonSpearman: 0,
  /** FR-036 */
  goalsPerMatch: [2.2, 3.0],
  drawRate: [0.22, 0.32],
  minScoringRate: 0.9,
  /** FR-037 */
  topScorerGoals: [14, 32],
  minTopScorerRate: 0.9,
} as const;
