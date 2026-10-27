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
  /**
   * Mundos grandes (024 R9). O reduzido (24 países, ~260 clubes) usa as metas da 020 acima. O médio
   * (44 países, ~1 000 clubes) e o completo (44 países, ~1 650 clubes, ~39 000 jogadores) têm metas
   * próprias, medidas em uma temporada por `pnpm sim:world --football-world` (2026-10-27): médio com dia
   * de 335 ms, virada de 18 s, heap de 521 MB e save de 55,6 MB na última rodada; completo com dia de
   * 718 ms, virada de 34,8 s, heap de 1 001 MB e save de 92,4 MB. Cada meta tem cerca de 50% de folga.
   * `saveStart31Bytes`, `growthPerSeasonBytes` e `thirtySeasonsMs` não foram medidos (sem 30
   * temporadas) e valem como teto provisório. As metas da 020 seguem valendo, sem piora, para os
   * mundos menores.
   */
  mediumWorld: {
    saveStart31Bytes: 40 * 1024 * 1024,
    growthPerSeasonBytes: 300 * 1024,
    saveLastRoundBytes: 85 * 1024 * 1024,
    exportedBytes: 7 * 1024 * 1024,
    dayMs: 500,
    turnoverMs: 27_000,
    heapBytes: 800 * 1024 * 1024,
    thirtySeasonsMs: 90 * 60 * 1000,
    generateMs: 30_000,
  },
  fullWorld: {
    saveStart31Bytes: 80 * 1024 * 1024,
    growthPerSeasonBytes: 400 * 1024,
    saveLastRoundBytes: 140 * 1024 * 1024,
    exportedBytes: 11 * 1024 * 1024,
    dayMs: 1100,
    turnoverMs: 52_000,
    heapBytes: 1536 * 1024 * 1024,
    thirtySeasonsMs: 150 * 60 * 1000,
    /** Gerar e empacotar o mod (tempo). */
    generateMs: 60_000,
  },
} as const;
