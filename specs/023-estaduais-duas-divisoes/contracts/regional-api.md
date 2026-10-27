# Contrato: API do motor para estaduais

Funções puras exportadas por `packages/engine/src/index.ts` (módulo `regional/`). Nenhuma usa PRNG
novo, relógio ou APIs de plataforma. Tipos em [data-model.md](../data-model.md).

## Escopo

```ts
isRegional(competition: Competition): boolean;                      // tem `regional`
regionalCompetitions(world: CompletedBank, countryId?: string): Competition[];
regionalCompetitionOf(world: CompletedBank, clubId: string): Competition | undefined;  // pela região do clube
isRegionalOnly(world: CompletedBank, clubId: string): boolean;      // só em divisões regionais
regionalDivisionOf(competition: Competition, clubId: string): Division | undefined;
```

`mainCompetitionOf` e `mainCompetitions` (020) ignoram competições regionais. O clube do jogador
sempre pertence a `regionalCompetitionOf` quando o país declara estaduais (FR-014).

## Peso

```ts
regionalWeightFor(club: Club, competition: Competition): number;    // pct final, 0 a 200
```

Usado por metas da diretoria, avaliação, expectativa e humor da torcida. Sem `regional.weight`, o
padrão é 100; peso 0 não gera efeito.

## Acesso, rebaixamento e vagas

Sem função nova de composição: `nextComposition(league, world)` (career) e a resolução da 021 passam a
funcionar com o estadual. Contratos de comportamento:

- A ordem de uma divisão em fases é `finalOrder` (019): fase alcançada, depois classificação geral da
  fase de grupos. Finalistas ocupam as posições 1 e 2.
- `relegated[1]` e `promoted[2]` têm o mesmo tamanho e a composição final mantém o tamanho das duas.
- Clubes que já estão no destino de uma vaga são ignorados, e a vaga vai ao próximo (021).

## Histórico e campanha

```ts
regionalEdition(world: CompletedBank, league: LeagueSeason): RegionalEdition | undefined;   // só com as finais decididas
regionalEditions(world: CompletedBank, finished: readonly LeagueSeason[]): RegionalEdition[];
competitionCampaign(state, competitionId: string, clubId: string): ClubCampaign | undefined; // generaliza 022
```

`competitionCampaign` usa a divisão do clube e mantém `clubCampaign` (022) como o mesmo valor; o
resultado para competições continentais não muda (teste de regressão). A edição fica em
`CareerHistory.regionalHistory` e no save v18.

## Meta da diretoria

```ts
regionalGoal(world, leagues, clubId): RegionalGoal | undefined;       // board/regional.ts
withRegionalGoals(board, world, leagues): BoardState;
boardAfterRegional(context, leagues, round): BoardState;              // fecha a meta quando a campanha termina
```

Tercil de cima da reputação da divisão espera a final, o do meio o mata-mata, o de baixo não tem meta;
peso 0 tira a meta; o efeito na confiança é `regionalMet`/`regionalMiss` × peso do clube.

## Manchetes

Etapa de virada `news-regional` (depois de `news-qualification`): campeões das duas divisões, promovidos
e rebaixados do estadual do clube do técnico, na rodada 0 da nova temporada. Tipos: `regionalChampion`,
`regionalPromoted`, `regionalRelegated` (relevância 70, 72 e 72; `news.relevance` os ajusta). Jogos
do estadual passam pelo caminho comum das competições secundárias (torcida, diretoria, notícias de copa).

## Garantias

- Determinismo: mesmo estado e seed dão o mesmo resultado; salvar e carregar no meio de uma fase de
  grupos do estadual não muda o resto da temporada.
- Sem `competition.regional` em nenhuma competição, nenhuma função acima altera o comportamento atual.
