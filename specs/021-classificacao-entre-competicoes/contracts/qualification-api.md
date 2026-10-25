# Contrato: API do motor — classificação entre competições

Exportada por `@brasfoot-like/engine`. Tudo é função pura sobre o estado; nada de DOM ou rede.

## Resolução

```ts
resolveQualification(input: {
  world: CompletedBank;
  finished: LeagueSeason[];                 // liga em foco + competitions (ligas de outros países, secundárias e copas)
  compositions: Record<string, Record<number, string[]>>;   // saída das pirâmides (nextComposition)
  number: number; year: number;             // da temporada encerrada
}): { ok: true; result: QualificationResult }
 | { ok: false; error: SeasonError };       // season.* e qualification.exhausted
```

- Determinística; sem PRNG; ordem total por (posição, id).
- Garante: cada competição alimentada recebe exatamente o número de participantes esperado por fase
  e nenhum clube aparece duas vezes na mesma competição.
- `qualification.exhausted` indica competição e vaga (dado ou simulação fora do garantido pela
  validação).

Etapa de virada: `resolve-qualification` (depois de `promotion-relegation`, antes de
`advance-year`). Registrada em `TURNOVER_STEP_IDS`; grava `next.compositions`, `next.entrants`,
`next.origins` e acrescenta o `QualificationRecord` ao histórico.

## Consultas (para UI e diretoria)

```ts
berthZones(world, competitionId, level): BerthZone[]
divisionZones(world, competitionId, level): DivisionZones          // agora com berths
participantOrigins(state, competitionId): Record<string, Origin>   // origens da temporada em curso
qualificationOutcome(history, number, competitionId): QualificationRecord["entries"]
clubQualification(state, clubId): { competitionId; level; berthId; via }[]   // vagas do clube p/ a próxima
```

## Diretoria e notícias

```ts
goalTiersFor(world, league, level)         // ganha o nível "qualify:<competitionId>" quando há zona direta
evaluateSeasonGoals(...)                   // "qualify" lê o QualificationRecord
```

Novos códigos de erro de dados (validação): `qualification.unknown_competition`,
`qualification.unknown_level`, `qualification.unknown_phase`, `qualification.range_invalid`,
`qualification.count_mismatch`, `qualification.no_closing`, `qualification.pool_too_small`,
`qualification.cycle`, `qualification.pyramid_exit_mismatch`, `qualification.duplicate_berth_id`.
