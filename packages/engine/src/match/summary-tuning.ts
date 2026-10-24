/**
 * Constantes da simulação resumida (020 R3). Ajustadas por `pnpm sim:matches --summary` contra a
 * simulação completa; quem decide se estão boas é `summary-equivalence.test.ts`, que declara as
 * faixas de equivalência.
 */
export const SUMMARY_TUNING = {
  /** Minutos do jogo: 90 mais a média dos acréscimos da simulação completa. */
  minutes: 96.5,
  /** Multiplica a média de gols de cada lado (corrige o que o modelo analítico não vê). */
  goalScale: 0.9235,
  /** Minuto médio de um jogador em campo para a fadiga (a força cai em blocos de 5). */
  fatigueMinute: 45,
  /** Multiplica as médias de amarelos, vermelhos diretos e lesões. */
  discipline: 1,
  injuries: 1,
} as const;
