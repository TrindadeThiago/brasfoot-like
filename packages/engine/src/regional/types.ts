/** Resultado de uma divisão do estadual numa temporada (023 R8): só ids, para o save ficar pequeno. */
export interface RegionalDivisionResult {
  level: number;
  championId: string;
  runnerUpId: string;
  /** Clubes que subiram da divisão (da 2ª para a 1ª). */
  promotedIds: string[];
  /** Clubes que caíram da divisão (da 1ª para a 2ª). */
  relegatedIds: string[];
}

/** Uma edição encerrada de um estadual, para o histórico (023 R8). */
export interface RegionalEdition {
  number: number;
  year: number;
  competitionId: string;
  divisions: RegionalDivisionResult[];
}
