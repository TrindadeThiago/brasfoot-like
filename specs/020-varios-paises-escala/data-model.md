# Data Model: Vários países e simulação em escala

Entidades novas ou alteradas pela 020. Tudo o que não aparece aqui não muda. Campos novos são
opcionais, para que bancos e saves de um país sigam idênticos (FR-020, FR-021).

## Formato de mod (dados)

### `Country` (altera `countries.json`)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `rules` | objeto | não | regras próprias do país (novo) |
| `rules.foreignLimit` | inteiro(0, 25) | não | máximo de jogadores de outra nacionalidade por clube; ausente = sem limite |

Demais campos (`id`, `name`, `code`, `names`) inalterados. `names` passa a ser **exigido** para
país que tenha competição com clubes (a geração de jovens da 009 usa o banco do país; sem ele cai
no padrão do motor com aviso `country.names_missing`).

**Regras de validação novas** (código → campos do erro):

- `country.no_main_competition` (`countryId`): país com clubes e sem nenhuma competição de liga ou
  fases.
- `country.main_not_league` (`countryId`, `competitionId`): a primeira competição do país é
  mata-mata; a principal precisa ter divisões em pontos corridos ou fases.
- `club.country_mismatch` (`clubId`, `competitionId`): clube numa competição de país diferente do
  seu `countryId` (a competição só pode ter clubes do próprio país).
- `competition.secondary_outside_main` (já existe): agora comparada com a principal **do mesmo
  país**.
- `unique.duplicate_club_in_country` (`clubId`): o mesmo clube em duas ligas principais.
- `country.foreign_limit_exceeded` (`clubId`, `limit`, `count`): clube do banco inicial acima do
  `foreignLimit` do seu país.

### Competição principal do país

`mainCompetitionOf(bank, countryId)`: a primeira competição de `competitions.json` com aquele
`countryId`. A primeira do arquivo continua sendo a do **país inicial padrão** do banco (a liga
em que a carreira começa, caso a escolha de clube não indique outra).

## Motor (estado)

### `CareerSeasonState` (altera)

| Campo | Mudança |
|-------|---------|
| `league` | passa a ser a liga principal do **país do clube em foco** (antes: a primeira do banco) |
| `otherLeagues: LeagueSeason[]` | novo; ligas principais dos demais países, na ordem do banco; `[]` com um país |
| `competitions` | secundárias de **qualquer** país, na ordem do banco |
| `worldHistory: SeasonHistoryEntry[]` | novo; uma entrada por país alheio ao do jogador e temporada encerrada |

Invariantes: todo país com clubes aparece em exatamente uma entre `league` e `otherLeagues`; um
clube pertence a uma só liga principal; `worldLeagues(state)` devolve `[league, ...otherLeagues]`.

### `SeasonHistoryEntry` (altera)

`topScorers?: { playerId: string; clubId: string; goals: number }[]` (até 10, por entrada de
divisão; a lista é de toda a competição, ordenada por gols, depois id).

### `MatchRecord` (altera)

| Campo | Descrição |
|-------|-----------|
| `summary?: true` | jogo da simulação resumida |
| `starters?: Record<Side, string[]>` | titulares (só com `summary`); minutos derivados: 90 até o vermelho |
| `players` | com `summary`, só os jogadores com gol, assistência, cartão ou lesão |
| `events` | com `summary`, só gols, cartões e lesões |

Acessor `playerLines(record): Record<string, PlayerLine>` devolve sempre o conjunto completo
(com `summary`, preenchido com `starters` e os minutos derivados). Nenhum leitor acessa
`record.players` diretamente depois da 020 (teste de arquitetura).

### `MatchSimulation` (novo, módulo `match/summary.ts`)

```ts
type SimulationKind = "full" | "summary";
summarizeMatch(input: MatchInput): MatchResult;            // mesmo MatchResult da completa
simulationKindFor(state, competitionId): SimulationKind;    // função pura do estado
```

`SUMMARY_TUNING` (calibrado, R3/R12): `goalsBase`, `goalsPerStrengthPoint`, `homeAdvantage`,
`yellowPerPlayerMinute`, `redShare`, `injuryPerPlayerMinute` (derivados do `MATCH_TUNING`).

### Mercado

- `AiMarketRules.maxInternationalPerClub` (inteiro, padrão 2 por janela): teto de contratações
  internacionais da IA por clube e janela (R13).
- `MarketError` ganha `market.foreign_limit` (`clubId`, `limit`) e `market.window_closed_abroad`
  (`clubId`) para o lado de fora com a janela fechada.
- `foreignCount(world, clubId): number` e `canSignForeign(world, clubId): boolean`.

### Diretoria

- `JobOffer` mantém `clubId`; o país é derivado (`club.countryId`). `BoardState.vacancies` e
  `coaches` cobrem os clubes de todas as ligas principais.
- `switchManagerCountry(state, clubId): CareerSeasonState` (puro): move a liga do novo país para
  `league` e a anterior para `otherLeagues`. Sem efeito dentro do mesmo país.

## Save (v15)

| Campo | Mudança |
|-------|---------|
| `formatVersion` | 15 |
| `otherLeagues` | novo, `[]` nos saves migrados |
| `worldHistory` | novo, `[]` nos saves migrados |
| `league`, `competitions`, `history` | inalterados (no banco de um país, idênticos) |

Migração v14 → v15: acrescenta os dois campos vazios; `MatchRecord` e `SeasonHistoryEntry` só
ganham campos opcionais. Fixture de save v14 (início, meio e fim de temporada) no teste.

## Metas de escala (`SCALE_LIMITS`, em `packages/save/test/scale-limits.ts`)

Valores de R12. Estrutura: `{ saveStart31Bytes, growthPerSeasonBytes, saveLastRoundBytes,
exportedBytes, dayMs, turnoverMs, heapBytes, thirtySeasonsMs }`.

## Banco de teste

`generateWorldBank({ seed, countries, divisionsPerCountry, clubsPerDivision })` devolve um
`ValidatedBank`; com `countries: 10, divisionsPerCountry: 2, clubsPerDivision: 20` são 400 clubes e
~11 000 jogadores. Ids: `clube-<código>-NNN`; jogadores `jogador-<código>-NNNNN`. Cada país tem
`names` próprio e `wageFactorPct`/`fansBase` distintos.

## Ajustes de implementação

- `CareerSeasonState` **não** ganha `otherLeagues` nem `worldHistory`: as ligas dos outros países
  ficam em `competitions` e o histórico delas em `competitionHistory` (ver `plan.md`). O save v15
  não acrescenta campos.
- `HistoryDivision.topScorers?: { playerId, clubId, goals }[]` (até 10) em cada divisão.
- `RenewalState.regulators?: Record<countryId, RegulatorState>`: reguladores dos países que não são
  o primeiro do banco.
- `BoardContext.foreign?: boolean`; `AiMarketRules.maxInternationalPerClub` (padrão 1).
- Códigos de validação: sem `club.country_mismatch` e `country.no_main_competition`.
