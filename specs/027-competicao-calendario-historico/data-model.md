# Data Model: Competição, calendário e histórico

Sem mudança em saves, dados de jogo ou preferências. Tudo abaixo é derivado em tempo de exibição.

## CompetitionEntry (UI, `game/competitions.ts`)
- `competition` (do banco), `mine: boolean`, `status`: `ongoing | eliminated | finished | startsOn(date) | notParticipating | berthPending`.
- `mine` = o clube tem jogos na temporada atual nessa competição, ou vaga confirmada (`clubQualification`). Estaduais: só o da região do clube.
- Ordem em Minhas: a principal do clube primeiro, depois por data do próximo jogo; em Demais: por país e nome.

## CalendarMonth (UI, `game/calendar-month.ts`)
- `key` (`AAAA-MM`), `fixtureCount`, `weeks: Day[][]` (domingo a sábado), `hasNext: boolean`.
- `Day`: `date` (ISO), `inMonth`, `isToday`, `fixtures: ClubFixture[]` (todos), `isNext`.
- Funções: `calendarMonths(fixtures, today): CalendarMonth[]`, `monthOfNext(months, next): string`.

## ClubFixture (motor, existente)
- `day`, `date`, `competitionId`, `divisionLevel`, `round`, `home`, `away`, `stage?`, `record?`.

## BracketPath (UI)
- Derivado de `Bracket`: as rodadas em que o clube do jogador tem confronto; usado para o selo "seu caminho".

## HistoryTab (UI)
- `seasons | titles | scorers | records | clubs | cups | continental | regional`; `regional` só com `save.regionalHistory` não vazio; `cups` só com mata-mata no banco; `continental` só com competição entre países.
