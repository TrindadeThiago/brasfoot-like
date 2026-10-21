# Contrato: API do motor (calendário, dia de jogos e condição física)

Funções puras exportadas por `@brasfoot-like/engine`. Nenhuma usa `Date` nem aleatoriedade fora do
PRNG com seed (Princípio II). Os tipos estão em [data-model.md](../data-model.md).

## Calendário (`calendar/`)

```ts
DEFAULT_SCHEDULE: CompetitionSchedule
scheduleOf(world, competitionId): CompetitionSchedule
weekdayOf(isoDate): 1..7

// Datas das rodadas de uma competição a partir do início da temporada.
roundDates(schedule, start: string, rounds: number): string[]

// Monta o calendário; devolve os problemas com os códigos calendar.* (R3). A regra semântica da
// validação os converte em ValidationIssue (arquivo, campo e mensagem).
calendarCompetitions(competitions: readonly Competition[]): CalendarCompetition[]
buildSeasonCalendar(
  competitions: readonly CalendarCompetition[],   // { competitionId, rounds, clubIds, schedule }
  start: string,
): { ok: true; calendar: SeasonCalendar } | { ok: false; issues: CalendarIssue[] }

dateOfRound(calendar, competitionId, round): string | undefined
dayIndexAfter(calendar, roundsDoneByCompetition): number   // primeiro dia ainda não fechado
```

- A validação do banco (`validateBank`) chama `buildSeasonCalendar` com as rodadas teóricas de
  cada competição. O mesmo erro aparece ao criar a carreira e ao importar um mod.

## Temporada da carreira (`career/`)

```ts
createCareerSeason(world, { careerSeed, number?, year?, compositions?, statuses? })
  : { ok: true; league; competitions; calendar; fitness } | { ok: false; error }
leagueCalendar(world, league): SeasonCalendar     // calendário só da principal (migração, wrappers)
calendarNext(state): number                        // índice do próximo dia, derivado das temporadas
currentDay(state): CalendarDay | undefined
isCalendarOver(state): boolean
nextClubFixture(state, clubId): ClubFixture | undefined
clubFixtures(state, clubId): ClubFixture[]       // por data; record quando já jogado
competitionSeason(state, competitionId): LeagueSeason
upcomingUnavailability(state, clubId): SeasonUnavailability[]   // suspensão da competição do jogo + lesões
otherSuspensions(state, clubId): { competitionId; playerId; remaining }[]   // só informação
```

`ClubFixture = { date, competitionId, divisionLevel, round, home, away, record? }`.

## Dia de jogos (`career/day.ts`, substitui `completeCareerRound`/`advanceCareer`)

```ts
// LiveRound da competição em que `clubId` joga no dia atual (com competitionId e date); sem `live`
// quando ele não joga. As secundárias recebem as lesões da principal (R6) e a condição física entra
// na força dos jogadores (R5).
startCareerDay(state, clubId, lineups?): { ok: true; live?: LiveRound } | { ok: false; error }

// Fecha o dia inteiro: a rodada `live` (se houver) ou, sem ela, o jogo do clube simulado direto com
// `lineups`; as demais competições do dia são simuladas direto. Quem controla a seed é o chamador.
completeCareerDay(state, careerSeed, managerClubId, live?, lineups?): CareerDayResult

// Simula direto os dias em que o clube não joga e para no dia do próximo jogo dele (FR-011).
// `followClubId` é o clube que interrompe o avanço (padrão: o do técnico; desempregado, o em foco).
advanceCareerToNextMatch(state, careerSeed, managerClubId, followClubId?): CareerDayResult

// Simulações e testes.
advanceCareerDays(state, step: { days: number } | { toEnd: true }, careerSeed, managerClubId, lineups?): CareerDayResult

// API de rodadas das carreiras só com a principal (simulações e testes): wrappers sobre o dia.
advanceCareer(...) / completeCareerRound(...)
```

- Os sistemas presentes no estado (renovação, mercado, diretoria, torcida, notícias) rodam todos
  com a mesma `careerSeed`.
- `CareerDayResult` = `{ ok: true; state: CareerSeasonState } | { ok: false; error: SeasonError }`.
- Garantia: para o mesmo estado, `completeCareerDay(state, seed, m, finishRound(startCareerDay(...).live))`
  e o caminho ao vivo com o mesmo `live` levado até o fim dão o mesmo resultado.
- `completeCareerDay` lança erro se `live` não for do dia atual ou da competição do jogador.

## Condição física (`fitness/`)

```ts
DEFAULT_FITNESS: FitnessRules
fitnessRules(world, competitionId): FitnessRules
fitnessOn(state: FitnessState, playerId, date, rules): number          // 0..100
fitnessFactorBp(value, rules): number                                   // 10000 = sem efeito
squadWithFitness(squad, state, date, rules): CompletedPlayer[]          // mesmo array se todos em 100
fitnessAfterMatches(state, matches: DayMatch[], date, rules): FitnessState
```

- `prepareFixture` (em `season/`) recebe o elenco já ajustado. As funções de `season/` não
  conhecem a condição.

## Disciplina e disponibilidade

```ts
disciplineRules(world, competitionId): DisciplineRules
clubUnavailability(season, world, clubId)        // inalterado; recebe a Season da competição do jogo
syncInjuries(from: Season[], to: Season, clubIds): Season    // R6
```

## Integrações alteradas

| Função | Mudança |
|---|---|
| `applyRoundFinances` → `applyDayFinances(finances, state, day, managerClubId, fans?)` | bilheteria de todos os jogos em casa do dia; folha, juros, obras e crise só com rodada da principal |
| `fansAfterRound(context, round, ...)` | recebe `matches: DayMatch[]` |
| `boardAfterRound(context, round)` | recebe `matches: DayMatch[]` |
| `newsAfterRound(context, round)` | recebe `matches: DayMatch[]`; manchete de secundária com `competition` |
| `minutesInRounds` | soma os minutos de todas as competições do período (R9) |
| `seasonTurnover(...)` | recebe e devolve `competitions`, `calendar`, `fitness` e `competitionHistory` |
| `validateBank` | regras `calendar.*` e `competition.club_outside_main`; `division.club_in_multiple` por competição |

## Erros novos (`errors.json`, ICU)

| Código | Parâmetros |
|---|---|
| `calendar.club_double_booked` | `competitionId`, `otherCompetitionId`, `clubId`, `date` |
| `calendar.competition_overflow` | `competitionId`, `needed` (semanas até a última rodada), `available` (52 semanas) |
| `competition.club_outside_main` | `clubId`, `competitionId` |
