/** Condição física dos jogadores (data-model.md da 017). */

/** Condição logo após o último jogo do jogador e a data desse jogo; ausente = 100. */
export interface FitnessEntry {
  /** 0–100. */
  value: number;
  /** Data ISO do jogo. */
  date: string;
}

export interface FitnessState {
  players: Record<string, FitnessEntry>;
}

/** Taxas de desgaste e recuperação e efeito no rendimento (017 R5). */
export interface FitnessRules {
  /** Pontos perdidos por 90 minutos jogados. */
  drainPer90: number;
  /** Pontos recuperados por dia. */
  recoveryPerDay: number;
  /** Perda de rendimento, em pontos-base (1/10000), por ponto de condição abaixo de 100. */
  penaltyBpPerPoint: number;
}
