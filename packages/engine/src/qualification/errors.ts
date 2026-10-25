/** Fonte de vaga que aponta para uma competição ausente da temporada encerrada. */
export class QualificationSourceError extends Error {
  constructor(readonly competitionId: string) {
    super(`fonte de vaga sem temporada encerrada: ${competitionId}`);
  }
}

/** A cadeia de repasse acabou sem achar clube elegível. */
export class QualificationExhaustedError extends Error {
  constructor(
    readonly competitionId: string,
    readonly berthId: string,
  ) {
    super(`vaga sem clube elegível: ${competitionId}/${berthId}`);
  }
}
