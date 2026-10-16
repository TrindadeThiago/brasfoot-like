# Data Model: Temporada de pontos corridos

**Feature**: `003-temporada-pontos-corridos` | **Date**: 2026-10-16

Objetos simples e serializáveis. O mundo (`CompletedBank`, feature 001) não faz parte do estado:
é passado junto em cada chamada (research R3). API em
[contracts/season-api.md](contracts/season-api.md).

## Entrada

### SeasonOptions

| Campo | Tipo | Regras |
|---|---|---|
| `competitionId` | Id | competição existente com `format.type = "league"` |
| `divisionLevel` | inteiro | divisão existente na competição, ≥ 2 clubes |
| `seed` | string \| number | obrigatório |
| `rules` | DisciplineRules? | padrão abaixo |

### DisciplineRules

| Campo | Padrão | Regras |
|---|---|---|
| `yellowsForSuspension` | 3 | 1–10 |
| `matchesPerRed` | 1 | 1–10 |

## Calendário

### Fixture

| Campo | Tipo |
|---|---|
| `round` | inteiro (1..R) |
| `home`, `away` | Id do clube |
| `seed` | string (research R9) |

### Round

`{ number, fixtures: Fixture[], bye?: Id }` — `bye` só com número ímpar de clubes.

R = turnos × (N − 1) com N par, ou turnos × N com N ímpar.

## Estado

### Season

| Campo | Tipo | Descrição |
|---|---|---|
| `competitionId`, `divisionLevel`, `seed` | — | da entrada |
| `rules` | DisciplineRules | normalizadas |
| `clubIds` | Id[] | da divisão |
| `formations` | Record<clubId, FormationId> | esquema preferido (research R8) |
| `calendar` | Round[] | — |
| `nextRound` | inteiro | 1..R+1 (R+1 = encerrada) |
| `records` | MatchRecord[] | em ordem de rodada e de jogo |
| `status` | Record<playerId, PlayerStatus> | só jogadores com algum valor ≠ 0 |
| `warnings` | SeasonWarning[] | — |

Transição: `nextRound` só cresce; com `nextRound = R + 1` a temporada está encerrada e avançar
devolve o mesmo estado.

### PlayerStatus

| Campo | Tipo | Descrição |
|---|---|---|
| `yellows` | inteiro | amarelos acumulados (zera ao suspender) |
| `suspension` | inteiro | partidas de suspensão restantes |
| `injury` | inteiro | partidas de lesão restantes |

### MatchRecord

| Campo | Tipo |
|---|---|
| `round`, `home`, `away` | — |
| `score` | `{ home, away }` (já com a regra de 3 a 0) |
| `outcome` | `"finished" \| "abandoned"` |
| `events` | eventos-chave do motor: gols (`shot` com `outcome: "goal"`), `penalty_awarded`, cartões, lesões, substituições |
| `stats` | `{ home: TeamStats, away: TeamStats }` (feature 002) |
| `players` | Record<playerId, PlayerLine> |
| `unavailable` | `{ home: Absence[], away: Absence[] }` |

### PlayerLine

`{ side, minutes, goals, assists, yellows, red: boolean, injury?: InjurySeverity }`.

### Absence

`{ playerId, reason: "suspension" | "injury", fielded: boolean }` — `fielded` = escalado mesmo
indisponível por falta de jogadores (FR-020).

### SeasonWarning

`{ round, clubId, code: "short_squad", playerIds: Id[] }`.

## Derivados

### StandingRow

| Campo | Regra |
|---|---|
| `position` | 1..N após desempate |
| `clubId` | — |
| `points` | V × pontos da vitória + E × pontos do empate + D × pontos da derrota (formato) |
| `played`, `wins`, `draws`, `losses` | — |
| `goalsFor`, `goalsAgainst`, `goalDifference` | — |
| `redCards` | para o critério `fewest-red-cards` |
| `form` | últimos 5 resultados, mais recente por último: `"W" \| "D" \| "L"` |

### PlayerSeasonStats

`{ playerId, clubId, matches, minutes, goals, assists, yellows, reds, matchesSuspended,
matchesInjured }`.

### SeasonReport (uma temporada)

`championId`, `championPoints`, `lastPoints`, `championStrengthRank` (1 = mais forte),
`unbeatenClubs`, `spearman`, `goalsPerMatch`, `drawRate`, `topScorerGoals`.

### CredibilitySummary (várias temporadas)

Para cada critério de FR-030 a FR-037: valor medido, faixa e situação (✓/✗).

## Erros

`SeasonError { code, params }` — ver [contracts/season-errors.md](contracts/season-errors.md).
