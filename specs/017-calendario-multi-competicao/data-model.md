# Data Model: Calendário multi-competição

## Formato do banco (`competitions.json`)

| Entidade | Campos | Regras |
|---|---|---|
| `CompetitionSchedule` (novo, opcional em `competition.schedule`) | `weekday` 1–7 (ISO), `startWeek` 0–51, `everyWeeks` 1–4 | Ausente: `DEFAULT_SCHEDULE = { weekday: 7, startWeek: 0, everyWeeks: 1 }` (R1) |
| `CompetitionDiscipline` (novo, opcional em `competition.discipline`) | `yellowsForSuspension` 1–10, `matchesPerRed` 1–10 | Ausente: `DEFAULT_DISCIPLINE_RULES` (R6) |
| `FitnessRules` (novo, opcional em `competition.fitness`, lido só da principal) | `drainPer90` 0–100, `recoveryPerDay` 0–100, `penaltyBpPerPoint` 0–100 | Ausente: `DEFAULT_FITNESS = { 30, 5, 40 }` (R5) |

Validação semântica nova (R2, R3):

- `competition.club_outside_main { clubId, competitionId }`: clube de competição secundária
  ausente da principal.
- `calendar.club_double_booked { competitionId, otherCompetitionId, clubId, date }`.
- `calendar.competition_overflow { competitionId, needed, available }`.
- `division.club_in_multiple` passa a valer só dentro da mesma competição.

## Motor

### `SeasonCalendar` (novo, `calendar/`)

```text
SeasonCalendar {
  start: ISO date            // seasonDate(referenceDate, year)
  end: ISO date              // start + 363 dias
  days: CalendarDay[]        // ordenado por data, sem datas repetidas
}
CalendarDay {
  date: ISO date
  slots: { competitionId: string; round: number }[]   // ordem de competitions.json
}
```

- Invariantes: cada (competição, rodada) aparece em exatamente um dia; nenhum clube aparece em
  dois slots do mesmo dia. O calendário é só a agenda: o andamento (próximo dia, temporada encerrada)
  é derivado das rodadas já fechadas de cada competição (`calendarNext`), sem contador próprio que
  possa divergir das temporadas.
- Derivados: `dateOfRound(calendar, competitionId, round)`, `currentDay(calendar)`,
  `nextClubFixture(state, clubId)` → `{ day, date, competitionId, divisionLevel, round, home, away } | undefined`,
  `clubFixtures(state, clubId)` → lista por data, com o `MatchRecord` quando já jogado.

### `CareerSeasonState` (agrupamento usado pelas funções do dia)

```text
{ league: LeagueSeason        // principal (inalterada)
  competitions: LeagueSeason[]  // secundárias, ordem de competitions.json
  calendar: SeasonCalendar
  fitness: FitnessState
  finances, world, renewal?, market?, board?, fans?, news? }   // como em CareerRoundResult
```

### `FitnessState` (novo, `fitness/`)

```text
FitnessState { players: Record<playerId, { value: 0..100; date: ISO }> }
```

- `fitnessOn(state, playerId, date, rules) = min(100, value + dias(date − entry.date) × recoveryPerDay)`;
  jogador ausente do mapa = 100.
- Depois de um jogo em `date`: `value = max(0, fitnessOn(...) − round(minutos × drainPer90 / 90))`
  para quem jogou. Quem estiver em 100 é removido.
- Virada: `{ players: {} }`.
- `fitnessFactorBp(c, rules) = 10000 − (100 − c) × penaltyBpPerPoint`.

### `DayMatch` (novo, entrada da torcida, diretoria e manchetes)

```text
DayMatch { competitionId; divisionLevel; date; record: MatchRecord }
```

### Alterações em entidades existentes

| Entidade | Mudança |
|---|---|
| `LeagueSeason` | nenhuma; as secundárias usam a seed `${seed}:${competitionId}` |
| `Season.status` | inalterado; o campo `injury` é sincronizado com a principal antes e depois de cada rodada de secundária (R6) |
| `LiveRound` | ganha `competitionId` e `date` (para a UI e para conferir o fechamento do dia) |
| `FinanceEntry` / `GateRecord` | ganham `date`; a bilheteria ganha `competitionId` (R7) |
| `TurnoverContext` / `TurnoverResult` | ganham `competitions`, `calendar`, `fitness` e `competitionHistory` |
| `MatchInput` | inalterado; o elenco já chega ajustado pela condição (R5) |

## Save v12

| Campo | Tipo | Migração v11 → v12 |
|---|---|---|
| `formatVersion` | `12` | — |
| `league` | `LeagueSeason` (principal) | mantido |
| `competitions` | `LeagueSeason[]` | `[]` |
| `calendar` | `SeasonCalendar` | agenda padrão sobre as rodadas da principal; o próximo dia sai das rodadas já jogadas |
| `fitness` | `FitnessState` | `{ players: {} }` |
| `competitionHistory` | `SeasonHistoryEntry[]` | `[]` |
| demais | — | mantidos |

## Transições de estado

```text
dia k (o primeiro com alguma rodada ainda não fechada)
  ├─ startCareerDay  → LiveRound da competição do jogador (se ele joga em k)
  ├─ completeCareerDay
  │    1. condição do dia calculada para os elencos (R5)
  │    2. por slot, na ordem: sincroniza lesões (secundária), fecha a rodada (ao vivo ou direto),
  │       devolve as lesões para a principal
  │    3. condição: desgaste de quem jogou
  │    4. finanças do dia (R7) → evolução (se rodada do meio) → mercado (se rodada da principal)
  │       → torcida → diretoria → manchetes (R10)
  │    5. o próximo dia passa a ser o seguinte (derivado das rodadas fechadas)
  └─ todos os dias fechados → temporada encerrada → seasonTurnover (R11)
```
