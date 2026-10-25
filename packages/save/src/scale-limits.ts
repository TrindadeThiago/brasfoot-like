/**
 * Metas declaradas para o mundo grande (020 FR-019, research.md R12): 10 países, duas divisões de
 * 20 clubes cada (400 clubes, ~11 000 jogadores), 30 temporadas sem interação. Os testes e
 * `pnpm sim:world --scale` leem estes números; mudar um deles exige justificar na mesma alteração
 * (Princípio V).
 */
export const SCALE_LIMITS = {
  /** Tamanho do save (JSON) no início da temporada 31. */
  /** 12,5 MB: eram 12 MB; as duas competições entre países (022) somam ~3% de jogos e registros. */
  saveStart31Bytes: 12.5 * 1024 * 1024,
  /** Crescimento médio por temporada entre a 10ª e a 30ª. */
  growthPerSeasonBytes: 250 * 1024,
  /** Save na última rodada de uma temporada (o maior do ano): ~31 a 38 MB medidos, só no fim do ano; no início da temporada são 5 a 11 MB. */
  saveLastRoundBytes: 42 * 1024 * 1024,
  /** Arquivo exportado (.blsave, gzip) depois de 30 temporadas. */
  exportedBytes: 6 * 1024 * 1024,
  /** Um dia de jogos do mundo todo (mediana). */
  dayMs: 600,
  /** Virada de temporada do mundo todo (mediana). */
  turnoverMs: 6000,
  /** Pico de memória (heap) simulando as 30 temporadas. */
  heapBytes: 1024 * 1024 * 1024,
  /**
   * As 30 temporadas inteiras, numa máquina de desenvolvimento (~15 min medidos). O que o jogador sente
   * são o dia e a virada; o total é dominado pelas janelas de transferências da IA.
   */
  thirtySeasonsMs: 20 * 60 * 1000,
} as const;
