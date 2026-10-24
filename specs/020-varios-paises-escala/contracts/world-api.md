# Contrato: API do motor para vários países e simulação em escala

Exportada por `@brasfoot-like/engine` (`index.ts`). Nada aqui usa DOM, relógio ou `Math.random`
(Princípios I e II). Os tipos de entrada e saída estão em [data-model.md](../data-model.md).

## Países e regras

```ts
mainCompetitionOf(world: CompletedBank, countryId: string): Competition | undefined
rulesCompetitionOf(world: CompletedBank, clubId: string): Competition   // principal do país do clube
countryOf(world: CompletedBank, clubId: string): Country
foreignCount(world: CompletedBank, clubId: string): number
canSignForeign(world: CompletedBank, clubId: string): boolean            // true sem foreignLimit
```

Os módulos `finance/rules`, `market/rules`, `board/rules`, `fans/rules`, `news/rules` e
`fitness/rules` ganham a variante `...ForClub(world, clubId)`; a variante por `competitionId`
continua, para as competições. `world.competitions[0]` deixa de ser usado como "regras do mundo".

## Estado e dia de jogos

```ts
worldLeagues(state): LeagueSeason[]                       // [league, ...otherLeagues]
isCountryMain(world, competitionId): boolean
simulationKindFor(state, competitionId): "full" | "summary"
switchManagerCountry(state, clubId): CareerSeasonState    // a troca de país da diretoria

createCareerSeason(world, options)                        // passa a criar uma liga por país
completeCareerDay(state, careerSeed, managerClubId, live?, lineups?)
  // fecha cada slot do dia; slot de liga principal dispara os sistemas da rodada para
  // os clubes daquela liga, com as regras do país dela
seasonTurnover(...)                                       // composição e etapas por país
```

Garantias: os resultados de um dia só dependem de `(state, careerSeed, escalações do jogador)`;
ao vivo = direto; a ordem de tratamento é a do banco (países) e por id (clubes); cada país usa
forks de PRNG próprios (`${seed}:country:${id}:${etapa}`), então acrescentar um país não muda os
outros (teste de isolamento).

## Simulação resumida

```ts
summarizeMatch(input: MatchInput): MatchResult
summarizeRound(season: Season, world: CompletedBank, options): { ok: true; records: MatchRecord[] } | { ok: false; error }
completeSummaryRound(season, world, records): SeasonResult   // aplica os registros como completeLeagueRound
playerLines(record: MatchRecord): Record<string, PlayerLine>
```

Garantias: `MatchResult` com as mesmas regras de consistência da completa (soma de gols por
jogador = placar; no máximo 1 vermelho por jogador; lesão só em quem jogou); nenhuma substituição;
determinístico pelo `fixture.seed`. Equivalência estatística com a completa dentro das faixas do
[research.md R12](../research.md).

## Mercado, diretoria e histórico

```ts
// market: as funções existentes passam a aceitar clube e jogador de países diferentes
proposeTransfer(...)   // erros novos: market.foreign_limit, market.window_closed_abroad
aiMarketRound(context) // alvos de qualquer país; teto maxInternationalPerClub por janela

// board
considerVacancies(...)  // vagas de todas as ligas principais
acceptOffer(...)        // de outro país chama switchManagerCountry

// história
seasonHistoryOf(state, countryId): SeasonHistoryEntry[]   // junta history e worldHistory
```

## Gerador

```ts
generateWorldBank(options: {
  seed: string; countries: number; divisionsPerCountry: number; clubsPerDivision: number;
  cup?: boolean;
}): ValidatedBank
```

## Códigos de erro novos

`market.foreign_limit`, `market.window_closed_abroad`, `country.no_main_competition`,
`country.main_not_league`, `club.country_mismatch`, `unique.duplicate_club_in_country`,
`country.foreign_limit_exceeded`, `country.names_missing` (aviso). Textos em `errors.json`.
