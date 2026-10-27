import type { CompletedBank } from "../model/types";

/** Parâmetros da diretoria (research.md R17 da 012). Calibrados pelo teste de 30 temporadas. */
export interface BoardRules {
  /** Expectativa: força × 100 + reputação × este percentual. */
  expectationRepPct: number;
  /** Folga da meta = slackBase − reputação do técnico × slackPerRepPct / 100. */
  slackBase: number;
  slackPerRepPct: number;
  /** Posições do fim da tabela evitadas pela meta "avoidBottom" (divisão sem rebaixamento). */
  bottomSlots: number;
  /** Caixa abaixo destes meses de folha ⇒ meta "keepCash". */
  tightMonths: number;
  neutral: number;
  win: number;
  draw: number;
  loss: number;
  /** A distância da meta só pesa a partir desta rodada. */
  goalCheckFromRound: number;
  /** Alvo da confiança abaixo da meta: neutral − posições × gapWeight. */
  gapWeight: number;
  /** Alvo acima da meta: neutral + min(aheadCap, posições × aheadWeight). */
  aheadWeight: number;
  aheadCap: number;
  /** A confiança anda (alvo − confiança) / driftDivisor por rodada. */
  driftDivisor: number;
  crisisPenalty: number;
  financePenalty: number;
  /** Parcelas negativas × max(patienceMinPct, patienceBasePct − reputação × patiencePerRepPct / 100) %. */
  patienceBasePct: number;
  patiencePerRepPct: number;
  patienceMinPct: number;
  keepRecent: number;
  fireThreshold: number;
  graceRounds: number;
  endFireThreshold: number;
  sportMetBonus: number;
  missPerPosition: number;
  missCap: number;
  financeMetBonus: number;
  financeMissPenalty: number;
  aiFireChancePct: number;
  initialReputation: number;
  metBase: number;
  upsidePct: number;
  missBase: number;
  titleBonus: number;
  promotionBonus: number;
  relegationPenalty: number;
  firePenalty: number;
  downsidePct: number;
  vacancyRounds: number;
  lowerMargin: number;
  upperMargin: number;
  offerChancePct: number;
  maxOpenOffers: number;
  offerRounds: number;
  maxFreeCoaches: number;
  /** Reputação de um técnico gerado: reputação do clube ± este valor. */
  coachSpread: number;
  /** Resultado de clássico na confiança × (100 + intensidade × derbyPct) / 100 (013). */
  derbyPct: number;
  /** Copa (018): eliminação tira cupOut × (fase + 1); título dá cupTitle; meta de copa ± cupGoal. */
  cupOut: number;
  cupTitle: number;
  cupGoal: number;
  /**
   * Competição entre países (022): o clube no tercil de cima da reputação dos participantes espera
   * a semifinal (até `continentalTopPct`%), o do meio a fase eliminatória (até `continentalMidPct`%)
   * e os demais passar da preliminar; meta cumprida dá `continentalMet` à confiança, perdida tira
   * `continentalMiss`.
   */
  continentalTopPct: number;
  continentalMidPct: number;
  continentalMet: number;
  continentalMiss: number;
  /**
   * Estadual (023): o clube no tercil de cima da reputação da divisão espera a final (até
   * `regionalTopPct`%), o do meio o mata-mata (até `regionalMidPct`%) e os demais passar do grupo;
   * meta cumprida dá `regionalMet` à confiança, perdida tira `regionalMiss`, ambos × o peso do
   * estadual para o clube.
   */
  regionalTopPct: number;
  regionalMidPct: number;
  regionalMet: number;
  regionalMiss: number;
}

export const DEFAULT_BOARD: BoardRules = {
  expectationRepPct: 10,
  slackBase: 4,
  slackPerRepPct: 4,
  bottomSlots: 4,
  tightMonths: 3,
  neutral: 60,
  win: 3,
  draw: 0,
  loss: 3,
  goalCheckFromRound: 5,
  gapWeight: 8,
  aheadWeight: 3,
  aheadCap: 20,
  driftDivisor: 5,
  crisisPenalty: 2,
  financePenalty: 1,
  patienceBasePct: 130,
  patiencePerRepPct: 60,
  patienceMinPct: 60,
  keepRecent: 10,
  fireThreshold: 10,
  graceRounds: 6,
  endFireThreshold: 30,
  sportMetBonus: 15,
  missPerPosition: 4,
  missCap: 30,
  financeMetBonus: 5,
  financeMissPenalty: 10,
  aiFireChancePct: 35,
  initialReputation: 30,
  metBase: 3,
  upsidePct: 25,
  missBase: 3,
  titleBonus: 5,
  promotionBonus: 5,
  relegationPenalty: 6,
  firePenalty: 5,
  downsidePct: 20,
  vacancyRounds: 2,
  lowerMargin: 30,
  upperMargin: 12,
  offerChancePct: 60,
  maxOpenOffers: 3,
  offerRounds: 2,
  maxFreeCoaches: 20,
  coachSpread: 8,
  derbyPct: 40,
  cupOut: 1,
  cupTitle: 8,
  cupGoal: 5,
  continentalTopPct: 34,
  continentalMidPct: 67,
  continentalMet: 5,
  continentalMiss: 5,
  regionalTopPct: 34,
  regionalMidPct: 67,
  regionalMet: 4,
  regionalMiss: 4,
};

/** Regras da diretoria: `competition.board` com os padrões preenchidos. */
export function boardRules(world: CompletedBank, competitionId: string): BoardRules {
  const competition = world.competitions.find((entry) => entry.id === competitionId);
  const override = competition?.board ?? {};
  const merged = { ...DEFAULT_BOARD };
  for (const [key, value] of Object.entries(override)) {
    if (typeof value === "number" && key in merged) {
      (merged as unknown as Record<string, number>)[key] = value;
    }
  }
  return merged;
}
