---

description: "Lista de tarefas da feature 017 — Calendário multi-competição"
---

# Tasks: Calendário multi-competição

**Input**: Design documents from `specs/017-calendario-multi-competicao/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**:

- `calendar/`, `fitness/`, `career/day.ts`, as regras de validação e a migração seguem o
  Princípio IX (testes antes, devem falhar primeiro).
- A equivalência com o banco padrão e as simulações longas têm limites declarados (Princípio V,
  research.md R15).
- O save v12 tem migração e fixtures (Princípio VI).
- Fluxos de interface com happy-dom e fake-indexeddb; e2e com Playwright.

**Organization**: tarefas por user story, em ordem de prioridade:

- P1: US1 (calendário), US2 (próximo compromisso), US3 (condição física), US8 (migração)
- P2: US4 (tela de calendário), US5 (abas), US6 (sistemas por data), US7 (suspensões)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 … US8 (spec.md)
- Caminhos relativos à raiz do repositório

## Referências rápidas

- **API do motor:** `specs/017-calendario-multi-competicao/contracts/calendar-api.md`
- **Save, mod e telas:** `specs/017-calendario-multi-competicao/contracts/save-and-ui.md`
- **Decisões R1–R15:** `specs/017-calendario-multi-competicao/research.md`
- **Tipos:** `specs/017-calendario-multi-competicao/data-model.md`
- **Já existentes no motor:**
  - datas: `daysFromCivil`/`civilFromDays`/`parseIsoDate`/`formatIsoDate`/`seasonDate`
    (`packages/engine/src/calendar/date.ts`)
  - rodadas e temporada: `generateCalendar`/`fixtureSeed` (`season/calendar.ts`),
    `startRound`/`completeRound`/`finishRound`/`LiveRound` (`season/live-round.ts`),
    `prepareFixture`/`squadsByClub` (`season/fixture.ts`), `applyMatchToStatus`
    (`season/discipline.ts`)
  - liga: `startLeagueRound`/`completeLeagueRound`/`advanceLeague` (`career/league-round.ts`),
    `leagueRound`/`createLeagueSeason`/`clubDivision` (`career/league.ts`)
  - rodada da carreira: `completeCareerRound`/`advanceCareer`/`applyRoundFinances`/
    `CareerRoundResult` (`finance/round.ts`)
  - virada: `seasonTurnover`/`TURNOVER_STEP_IDS` (`career/turnover.ts`)
  - outros: `midSeasonRound`/`minutesInRounds` (`renewal/evolution.ts`), `transferWindows`/
    `roundsPlayed` (`market/windows.ts`), `fansAfterRound` (`fans/mood.ts`), `boardAfterRound`
    (`board/round.ts`), `newsAfterRound` (`news/round.ts`), `clubUnavailability`
    (`lineup/unavailability.ts`), `autoLineup` (`match/auto-lineup.ts`)
  - validação: `validateBank`/`makeIssue`/`ISSUE_PARAMS` (`validation/`), regra
    `division.club_in_multiple` (`validation/semantic/competitions.ts`)
- **Chamadores de `advanceCareer`/`completeCareerRound`/`applyRoundFinances` a migrar ou manter via
  wrapper:**
  - testes do motor em `board/`, `market/`, `news/`, `renewal/`, `finance/` e `fans/` (helpers:
    `packages/engine/test/{board,news,fans}/helpers.ts`)
  - `packages/save/test/{fixtures,helpers}.ts`
  - `apps/web/src/game/GameProvider.tsx` (`commitRound`, `simulateDirect`, `playRoundNow`)
  - `apps/web/test/helpers/{career,saves}.ts`
  - `tools/src/{simulate-world,simulate-economy}.ts`
- **Helpers de teste:**
  - motor: `packages/engine/test/helpers/build-bank.ts`, `packages/engine/test/board/helpers.ts`
    (`newCareer`, `play`, `MANAGER`), `packages/engine/test/validation/cases.ts`
  - save: `packages/save/test/fixtures.ts` (`validSave`, `saveV10` como modelo de fixture antiga)
  - web: `apps/web/test/helpers/{app.tsx,career.ts,saves.ts,live.ts}`
- **Lembretes:**
  - sem `Date`, `**`, `Math.pow` ou funções transcendentais no motor; aritmética inteira; clonar
    com JSON;
  - não confundir o componente `Condition` (disponível, lesionado ou suspenso) com a condição
    física (`FitnessMeter`);
  - antes de commitar, desfazer `apps/web/next-env.d.ts` e apagar `apps/web/AGENTS.md`.

---

## Phase 1: Setup

- [X] T001 Record the default-bank baseline BEFORE any engine change: `packages/save/test/equivalence.test.ts` (in the save package, the only one with the default-mod dependency and `createSave`) plays two full seasons of the default bank (seeds `equivalencia` and `banco-padrao`, all systems, the manager's lineup, turnover between seasons) with today's `completeCareerRound` and compares, against the snapshot `packages/save/test/__fixtures__/equivalence-baseline.json` recorded with `UPDATE_BASELINE=1` before any engine change, every round's fixtures and scores (both divisions) and each club's per-season ledger totals and start/end cash (SC-004, R15). It must keep passing unchanged through the whole feature; never re-record it without explicit justification
- [X] T002 [P] Add pt-BR strings to `packages/i18n/locales/pt-BR/ui.json` per contracts/save-and-ui.md (NOTE: `test/i18n/no-literals.test.ts` fails on UI keys not used in source, so each key is added in the UI task that first uses it; the planned list is kept in the scratchpad `ui-keys.diff`):
  - next match: `nextMatch.title`, `nextMatch.when` (`{weekday} {date}`), `nextMatch.home`/`away`,
    `nextMatch.advance` (`{date}`), `nextMatch.advanceToEnd`, `nextMatch.none`
  - weekdays: `weekday.1`…`weekday.7`
  - calendar page: `calendar.title`, `calendar.filter`, `calendar.all`, `calendar.next`,
    `col.date`, `col.competition`, `col.venue`
  - competition picker: `competition.select`
  - fitness: `fitness.label`, `fitness.value` (`{value, number}%`), `fitness.tired`
    (`{count, plural, …}`)
  - suspension per competition: `squad.suspendedIn` (`{matches}`, `{competition}`)
  - transfer window dates: `market.windowUntil` (`{date}`), `market.windowFrom` (`{date}`)
  - live round title: `live.title` (`{competition}`, `{date}`)
  - other competitions in history: `history.otherCompetitions`
  - (the `errors.json` messages for `calendar.club_double_booked`, `calendar.competition_overflow`
    and `competition.club_outside_main` are added with their codes in T013/T016, because the
    coverage tests require every registered code to have a validation case)
- [X] T003 [P] Add optional `schedule` (`weekday` int 1–7, `startWeek` int 0–51, `everyWeeks` int 1–4), `discipline` (`yellowsForSuspension`, `matchesPerRed` int 1–10) and `fitness` (`drainPer90`, `recoveryPerDay`, `penaltyBpPerPoint` int 0–100) to `competitionSchema` in `packages/engine/src/model/schemas.ts` and the matching types in `packages/engine/src/model/types.ts`; the 3 new issue codes are registered in `packages/engine/src/validation/issues.ts` (ISSUE_PARAMS) together with their cases in T013/T016

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: datas e agenda, condição física (tipos), estado da temporada por competição, banco
de teste, save v12 (formato)

**⚠️ CRITICAL**: nenhuma história começa antes desta fase

### Tests (write first, must fail)

- [X] T004 [P] Extend `packages/engine/test/calendar/date.test.ts`:
  - `weekdayOf` (1970-01-01 = 4; known Sundays and Wednesdays across leap years)
  - `addDays` and `diffDays` round-trip across month and year ends
- [X] T005 [P] Write `packages/engine/test/calendar/schedule.test.ts`:
  - `DEFAULT_SCHEDULE`
  - `scheduleOf` with and without `competition.schedule`
  - `roundDates(schedule, start, rounds)`: first date is the first `weekday` on or after `start`
    plus `startWeek` weeks; consecutive rounds `everyWeeks × 7` days apart; start date already on
    the weekday counts as week 0

### Implementation

- [X] T006 Implement `weekdayOf`, `addDays`, `diffDays` in `packages/engine/src/calendar/date.ts` (integer only, via `daysFromCivil`/`civilFromDays`)
- [X] T007 Implement `DEFAULT_SCHEDULE`, `scheduleOf(world, competitionId)`, `roundDates` in `packages/engine/src/calendar/schedule.ts`; export from `packages/engine/src/index.ts`
- [X] T008 [P] Create `packages/engine/src/fitness/types.ts` (`FitnessState`, `FitnessRules`) and `packages/engine/src/fitness/rules.ts` (`DEFAULT_FITNESS = { drainPer90: 30, recoveryPerDay: 5, penaltyBpPerPoint: 40 }`, `fitnessRules(world, competitionId)` merging `competition.fitness`); export from index
- [X] T009 Create `packages/engine/src/calendar/season-calendar.ts` with the `SeasonCalendar`/`CalendarDay` types of data-model.md, `dateOfRound`, `currentDay`, `isCalendarOver` (building comes in US1); create `packages/engine/src/career/season-state.ts` with `CareerSeasonState` (`league`, `competitions`, `calendar`, `fitness`, `finances`, `world`, optional systems) per data-model.md; export from index
- [X] T010 [P] Create the two-competition test bank `packages/engine/test/fixtures/two-competitions.ts` (R14), built from the default bank:
  - `twoCompetitionsBank()`: the principal competition unchanged, with explicit
    `schedule { weekday: 7, startWeek: 0, everyWeeks: 1 }`, plus "Torneio de Teste" (id
    `torneio-teste`): one division with 6 Série A + 4 Série B clubs (first by id), `rounds: 2`,
    `schedule { weekday: 3, startWeek: 1, everyWeeks: 2 }`
  - invalid variants:
    - `sameWeekday` edit: torneio on `weekday: 7`
    - `overflow` edit: 20 clubs, `rounds: 2`, `everyWeeks: 2`
    - `outsideMain` edit: a club only in the torneio
- [X] T011 Save v12 format: `SAVE_FORMAT_VERSION = 12` and fields `calendar`, `competitions`, `fitness`, `competitionHistory` in `packages/save/src/format.ts`; make `packages/save/src/create.ts` fill them (temporarily: calendar with `DEFAULT_SCHEDULE` over the principal rounds, `competitions: []`, `fitness: { players: {} }`, `competitionHistory: []`); add `saveV11(step)` to `packages/save/test/fixtures.ts` following `saveV10` (current save played to the step, new fields stripped, `formatVersion: 11`) and update `saveV10` to strip the v12 fields too; register a placeholder `v11 → v12` step in `packages/save/src/migrate.ts` that only fills defaults (full migration in US8) so existing tests stay green

**Checkpoint**: tipos e dados prontos; `pnpm test` verde (inclusive T001), jogo igual

---

## Phase 3: User Story 1 - Temporada montada por datas (Priority: P1) 🎯 MVP

**Goal**: o calendário de todas as competições é montado por datas, e bancos com datas impossíveis
são recusados

**Independent Test**: banco de duas competições ⇒ todas as rodadas com data, nenhum clube duas vezes
no mesmo dia, mesma seed ⇒ mesmo calendário; variantes inválidas ⇒ erro com competição, clube e
data

### Tests (write first, must fail)

- [X] T012 [P] [US1] Write `packages/engine/test/calendar/season-calendar.test.ts` for `buildSeasonCalendar`:
  - default bank ⇒ 38 days, one slot each, consecutive Sundays from the season start
  - two-competition bank ⇒ Sunday and Wednesday days interleaved, days sorted, slots in
    `competitions.json` order, each (competition, round) exactly once
  - same input ⇒ same output
  - `sameWeekdayBank` ⇒ `calendar.club_double_booked` with both competition ids, the smallest
    shared club id and the first shared date
  - `overflowBank` ⇒ `calendar.competition_overflow` with `needed`/`available`
- [X] T013 [P] [US1] Extend `packages/engine/test/validation/` (new `calendar.test.ts`, cases in `cases.ts`):
  - `validateBank` rejects the three invalid variants of T010 with the codes and params of
    contracts/calendar-api.md, section `competitions`, and the field path (`schedule`)
  - out-of-range `schedule` fields fail the schema with file and field
  - the same club in two competitions is now valid
  - `division.club_in_multiple` still fires inside one competition
  - the default bank and `mods/exemplo` stay valid
- [X] T014 [P] [US1] Write `packages/engine/test/career/season-state.test.ts`:
  - `createCareerSeason` for the two-competition bank creates the principal `league` with today's
    seed (same fixtures as `createLeagueSeason`), plus one secondary `LeagueSeason` with seed
    `${seed}:torneio-teste` and the calendar
  - for the default bank ⇒ `competitions: []` and a calendar equal to the principal's rounds on
    Sundays

### Implementation

- [X] T015 [US1] Implement `buildSeasonCalendar(competitions, start)` in `packages/engine/src/calendar/season-calendar.ts` (R3): theoretical round counts, `roundDates`, grouping by date, conservative conflict check over club sets, overflow vs `start + 363`; returns `ValidationIssue`s
- [X] T016 [US1] Add the semantic rule `packages/engine/src/validation/semantic/calendar.ts` (builds the calendar from the bank's competitions; `competition.club_outside_main`), wire it in `validateBank`, and restrict `division.club_in_multiple` to the same competition in `packages/engine/src/validation/semantic/competitions.ts`
- [X] T017 [US1] Implement `createCareerSeason(world, options)` in `packages/engine/src/career/season-state.ts`: principal via `createLeagueSeason` (unchanged), secondaries in bank order with seed `${seed}:${competitionId}` and `disciplineRules` (US7 adds per-competition rules; use defaults now), `calendar` from `buildSeasonCalendar` with `seasonDate(referenceDate, year)`, empty fitness
- [X] T018 [US1] Use `createCareerSeason` in `packages/save/src/create.ts` (replace the temporary calendar of T011) and surface `calendar.*` errors as `save.invalid_bank` with the issue list, like other bank errors

**Checkpoint**: banco de duas competições monta a temporada; bancos inválidos são recusados

---

## Phase 4: User Story 2 - Próximo compromisso, de qualquer competição (Priority: P1)

**Goal**: avançar vai até o próximo jogo do clube do jogador, de qualquer competição, e o jogo é
ao vivo ou direto como hoje

**Independent Test**: banco de duas competições ⇒ cada avanço para no próximo jogo do clube,
alternando competições; os dias pulados têm resultado; ao vivo = direto

### Tests (write first, must fail)

- [X] T019 [P] [US2] Write `packages/engine/test/career/day.test.ts`:
  - `startCareerDay` returns the `LiveRound` of the manager's competition with `competitionId`
    and `date`, or no `live` when the club does not play
  - `completeCareerDay` closes every slot of the day (other competitions directly), advances
    `calendar.next`, and throws for a `live` from another day or competition
  - same state: live played to the end ⇒ the same result as direct
  - `advanceCareerToNextMatch` simulates the days in between and stops on the club's next match
    day (Sunday ⇒ Wednesday ⇒ Sunday for a club in both)
  - a club with no matches left ⇒ simulates to the end, and the season is over after the last day
    of every competition
  - determinism: twice, and with a JSON round-trip mid-season
- [X] T020 [P] [US2] Write `packages/engine/test/career/fixtures.test.ts`: `nextClubFixture` (date, competition, division, home/away; `undefined` at the end) and `clubFixtures` (all the club's matches by date, with `record` when played)
- [X] T021 [P] [US2] Extend `packages/engine/test/career/league-round.test.ts`: `LiveRound` carries `competitionId` and `date`; `startLeagueRound` accepts the squads already adjusted (pass-through)

### Implementation

- [X] T022 [US2] Add `competitionId` and `date` to `LiveRound` (`packages/engine/src/season/live-round.ts` type, filled by `startLeagueRound` in `packages/engine/src/career/league-round.ts` and `startCareerDay`). NOTE: no `squads` override is needed — US3 passes a world with the adjusted strengths to `startLeagueRound` and the real world to `completeLeagueRound`
- [X] T023 [US2] Implement `nextClubFixture`, `clubFixtures`, `competitionSeason` in `packages/engine/src/career/season-state.ts`
- [X] T024 [US2] Create `packages/engine/src/career/day.ts`:
  - `startCareerDay`, `completeCareerDay`, `advanceCareerToNextMatch`, `advanceCareerDays`
  - move the orchestration of `completeCareerRound` (`packages/engine/src/finance/round.ts`) here:
    finances → evolution → market → fans → board → news, running the principal-only parts only on
    days with a principal slot
  - for now, secondary slots only close their rounds (finances and systems for them come in US6)
- [X] T025 [US2] Keep backward compatibility in `packages/engine/src/finance/round.ts`: DONE differently — the body after the league round was extracted into `applyRoundSystems`, shared by the deprecated `completeCareerRound` and by `completeCareerDay`, so the old path is unchanged. (original text: re-implement `completeCareerRound`/`advanceCareer` as thin wrappers over the day path for a principal-only state (calendar built with `DEFAULT_SCHEDULE`), so the existing engine tests and T001 stay green; mark them `@deprecated`
- [X] T026 [US2] Save orchestration in `packages/save/src/career.ts` (+ export in `index.ts`):
  - `withDayResult` replaces `withRoundResult`, keeping it as an alias until the web migrates
  - `nextFixture(save)`
  - `userSeasonFor(save, competitionId)`
  - `advanceCareerSeason` passes and receives `competitions`, `calendar`, `fitness`; tests in
    `packages/save/test/career.test.ts`
- [X] T027 [US2] Web: in `apps/web/src/game/GameProvider.tsx`, `playRoundNow`/`simulateDirect`/`commitRound` work per day:
  - "Avançar" runs `advanceCareerToNextMatch` (intermediate days simulated and saved in the same
    commit), then starts the day of the manager's match live or direct as today
  - autosave at the end of each day with the manager's match (FR-014)
  - update `apps/web/src/game/useLiveRound.ts` and `apps/web/test/helpers/{career,saves,live}.ts`
- [X] T028 [US2] Home: create `apps/web/src/ui/NextMatchCard.tsx` (weekday + date, competition name from the bank, opponent crest + `DerbyBadge`, home/away; button `nextMatch.advance` / `nextMatch.advanceToEnd`) and `apps/web/src/ui/format-date.ts` (`formatGameDate(iso, locale, style)` via `Intl.DateTimeFormat` with `timeZone: "UTC"`); use them in `apps/web/src/app/jogo/page.tsx`; live round title with competition and date in `apps/web/src/app/jogo/rodada/page.tsx`
- [X] T029 [US2] Flow test `apps/web/test/flows/calendar.test.tsx` (two-competition bank through `storedCareer`): Início shows the next match with competition; Avançar stops on Sunday then Wednesday; skipped days have results; default bank shows the same card with a Sunday date

**Checkpoint**: o jogador disputa as duas competições pela Início (critério de aceite 1)

---

## Phase 5: User Story 3 - Descanso entre jogos e condição física (Priority: P1)

**Goal**: a condição cai com os jogos, volta com os dias e pesa no rendimento; a IA poupa cansados

**Independent Test**: dois jogos com 3 dias de intervalo ⇒ titulares abaixo de 100 e time pior que
o rodado; banco padrão ⇒ todos em 100 a cada jogo

### Tests (write first, must fail)

- [X] T030 [P] [US3] Write `packages/engine/test/fitness/fitness.test.ts`:
  - `fitnessOn`: absent player ⇒ 100; recovery `recoveryPerDay` per day, capped at 100
  - `fitnessAfterMatches`: 90 min ⇒ −30; 45 min ⇒ −15; did not play ⇒ unchanged; floor 0;
    players back at 100 removed from the map
  - 7 days after 90 min ⇒ 100; 3 days ⇒ 85 (FR-017)
  - `fitnessFactorBp` (100 ⇒ 10000; 85 ⇒ 9400; 0 ⇒ 6000)
  - `squadWithFitness` returns the same array when everyone is at 100, and adjusted copies (rounded
    strength) otherwise, without mutating the input
  - rules from `competition.fitness`
- [X] T031 [P] [US3] Extend `packages/engine/test/career/day.test.ts`:
  - fitness is drained after each day and reset at turnover
  - the match input uses the condition on the day's date (live = direct)
  - an AI club with tired starters and rested backups of close strength fields some backups
    (FR-021)
  - with 7-day spacing, every player starts each match at 100

### Implementation

- [X] T032 [US3] Implement `fitnessOn`, `fitnessFactorBp`, `squadWithFitness`, `fitnessAfterMatches` in `packages/engine/src/fitness/fitness.ts` (integer math, players by id); export from index
- [X] T033 [US3] Wire fitness into `packages/engine/src/career/day.ts`: the world handed to `startLeagueRound` has the tired players' strength reduced (`worldWithFitness`, rules of the principal competition); after closing the day, `fitnessAfterMatches` with the day's records; the reset on turnover is done where the new season is built (`advanceCareerSeason` in the save package now, `seasonTurnover` in T055)
- [X] T034 [US3] Human auto-lineup uses the adjusted squad: expose `squadWithFitness` through `lineupContext` in `apps/web/src/game/GameProvider.tsx` so the "escalar automático" action sees the condition
- [X] T035 [P] [US3] Create `apps/web/src/ui/FitnessMeter.tsx` (+ `.module.css`; bar + %, `role="meter"` with `aria-valuenow`) and add the "Condição física" column to `apps/web/src/app/jogo/escalacao/` and `apps/web/src/app/jogo/elenco/`; warning `fitness.tired` when a starter is below 75%; selector `fitnessOf(save, playerId)` in `apps/web/src/game/selectors.ts` using the next match date
- [X] T036 [US3] Extend `apps/web/test/flows/calendar.test.tsx`: after a Sunday + Wednesday with the same XI, the lineup screen shows starters below 100% with the warning

**Checkpoint**: jogos em sequência desgastam; banco padrão igual (T001 verde)

---

## Phase 6: User Story 8 - Carreiras salvas migram sem perder nada (Priority: P1)

**Goal**: saves v11 abrem na mesma rodada, com o mesmo histórico, e continuam jogáveis

**Independent Test**: fixtures v11 no início, no meio, no fim e com várias temporadas ⇒ mesma
rodada, histórico, caixa e humor; jogável até a virada

### Tests (write first, must fail)

- [X] T037 [P] [US8] Write `packages/save/test/migrate-v12.test.ts`:
  - `saveV11` at round 0, after 17 rounds, at season end, and after 3 seasons migrate to v12
  - `league`/`history`/`finances`/`fans`/`board`/`news` deep-equal the v11 input
  - `calendar.next` points to the day of `leagueRound(league)`, with Sunday dates from the season
    start
  - `competitions: []`, empty fitness, `competitionHistory: []`
  - suspensions and yellows still in the principal `status` (FR-041)
  - the migrated save plays to the turnover without errors
  - an exported v11 file imported through `packages/save/src/file.ts` goes through the same step
  - a v11 bank with extra competitions joins them only at the next turnover

### Implementation

- [X] T038 [US8] Implement the full `v11 → v12` step in `packages/save/src/migrate.ts` (R12), replacing the placeholder of T011; update `packages/save/test/migrate.test.ts` chain expectations

**Checkpoint**: saves antigos abrem e jogam (critério de aceite 2)

---

## Phase 7: User Story 4 - Calendário do clube (Priority: P2)

**Goal**: todos os jogos do clube por data, de todas as competições, com filtro

**Independent Test**: meio da temporada no banco de duas competições ⇒ lista por data, placares nos
disputados, filtro por competição; banco padrão sem filtro

- [X] T039 [US4] Rewrite `apps/web/src/app/jogo/calendario/page.tsx` over `clubFixtures`:
  - columns: date (`formatGameDate`), competition, opponent (crest + `DerbyBadge`), home/away, score
  - next match highlighted
  - competition filter (`calendar.filter`/`calendar.all`) only when the club plays more than one
  - keep the row expansion of the match summary
- [X] T040 [US4] Extend `apps/web/test/flows/calendar.test.tsx`: both competitions by date, scores on played matches, filter shows one competition, default bank has no filter

---

## Phase 8: User Story 5 - Telas por competição (Priority: P2)

**Goal**: tabela, resultados e artilharia com abas por competição quando houver mais de uma

**Independent Test**: banco de duas competições ⇒ abas e conteúdo por competição; banco padrão ⇒
telas como hoje

- [X] T041 [US5] Create `apps/web/src/game/useCompetition.ts` (query param `c`, default = competition of the next match, falling back to the principal) and `apps/web/src/ui/CompetitionSelect.tsx` (tabs, hidden with a single competition in the bank); keep `d` (division) working per competition in `apps/web/src/game/useDivision.ts` and `apps/web/src/ui/CompetitionTabs.tsx` (`divisionHref` carries `c`)
- [X] T042 [US5] Use the selected competition's `LeagueSeason` in `apps/web/src/app/jogo/competicao/page.tsx`, `apps/web/src/app/jogo/competicao/resultados/` and `apps/web/src/app/jogo/competicao/artilharia/`
- [X] T043 [US5] Extend `apps/web/test/flows/calendar.test.tsx` (tabs, content switch, default selection) and `apps/web/test/flows/divisions.test.tsx` (default bank unchanged, no competition tabs)

---

## Phase 9: User Story 6 - Sistemas por data (Priority: P2)

**Goal**: bilheteria de todo jogo em casa; torcida, diretoria e manchetes reagem a qualquer
competição; janelas e evolução com datas

**Independent Test**: jogo em casa da secundária ⇒ renda, humor, confiança e manchete; janelas com
datas; banco padrão igual

### Tests (write first, must fail)

- [X] T044 [P] [US6] Write `packages/engine/test/finance/day.test.ts`:
  - `applyDayFinances` posts a gate (with `date` and `competitionId`) for every home match of the
    day, in any competition
  - wages, interest, works and crisis only on days with a principal slot, with the same
    instalments
  - two-competition bank ⇒ annual wages per club equal the principal-only total
- [X] T045 [P] [US6] Extend `packages/engine/test/fans/mood.test.ts`, `packages/engine/test/board/round.test.ts` and `packages/engine/test/news/round.test.ts`:
  - with `DayMatch[]`, a secondary-competition win/loss/derby moves mood, confidence and makes a
    headline (news with the `competition` variable)
  - default-bank behavior unchanged
- [X] T046 [P] [US6] Extend `packages/engine/test/renewal/mid-season.test.ts` (minutes from all competitions count, normalized by the club's possible minutes; default bank unchanged) and `packages/engine/test/market/windows.test.ts` (`windowDates` maps round windows to calendar dates; mod round windows stay valid; window beyond the last round ends on the last principal date)

### Implementation

- [X] T047 [US6] Implement `applyDayFinances` in `packages/engine/src/finance/round.ts` (R7) with `date` (and `competitionId` for gates) in `FinanceEntry`/`GateRecord` (`packages/engine/src/finance/types.ts`, `ledger.ts`); use it in `packages/engine/src/career/day.ts`
- [X] T048 [US6] Introduce `DayMatch` (`packages/engine/src/career/season-state.ts`) and switch `fansAfterRound` (`packages/engine/src/fans/mood.ts`), `boardAfterRound` (`packages/engine/src/board/round.ts`) and `newsAfterRound` (`packages/engine/src/news/round.ts`, `facts.ts`) to take the day's matches; "from round N" triggers use principal rounds played; add variants of the `news.result.*` headlines in `packages/i18n/locales/pt-BR/ui.json` that name the competition (`{competition}`) for secondary-competition results (principal results keep today's templates)
- [X] T049 [US6] Evolution: `minutesInRounds` → minutes from all competitions in `packages/engine/src/renewal/evolution.ts`; mid-season evolution on the day of the principal's `midSeasonRound` in `packages/engine/src/career/day.ts`
- [X] T050 [US6] Market: `windowDates(calendar, windows)` in `packages/engine/src/market/windows.ts`; show "aberta até {data}" / "abre em {data}" in `apps/web/src/app/jogo/mercado/` with `formatGameDate`
- [X] T051 [US6] Extend `apps/web/test/flows/finances.test.tsx`: a secondary home match adds a gate to the ledger with the competition

---

## Phase 10: User Story 7 - Suspensões por competição (Priority: P2)

**Goal**: cartões suspendem só na própria competição; lesões valem para todas

**Independent Test**: expulso na A ⇒ joga a B e cumpre na A; lesão na B tira da A

### Tests (write first, must fail)

- [X] T052 [P] [US7] Write `packages/engine/test/career/discipline.test.ts`:
  - a red card in the principal ⇒ available in the secondary, suspended in the next principal
    match
  - yellows counted separately
  - `competition.discipline` rules applied per competition
  - an injury in the secondary ⇒ unavailable in the principal and vice versa, decremented once per
    club match (`syncInjuries`, R6)
  - a transferred player keeps pending suspensions in each competition

### Implementation

- [X] T053 [US7] Implement `syncInjuries` in `packages/engine/src/career/injuries.ts` and call it around every secondary slot in `packages/engine/src/career/day.ts`; implement `disciplineRules(world, competitionId)` (from `competition.discipline`) and use it in `createCareerSeason` and the turnover
- [X] T054 [US7] Lineup availability per next match: `withAdjustedLineup` in `packages/save/src/career.ts` uses the `Season` of the next match's competition; the lineup screen shows suspensions with the competition name (`squad.suspendedIn`) in `apps/web/src/app/jogo/escalacao/` (blocking only for that competition); tests in `packages/save/test/career.test.ts`

---

## Phase 11: Polish & Cross-Cutting Concerns

- [X] T055 Turnover for secondary competitions (R11) in `packages/engine/src/career/turnover.ts`:
  - step `generate-calendars` creates each secondary's next `LeagueSeason`, with its own
    promotion/relegation between its divisions via the composition function
  - it rebuilds the `SeasonCalendar` and resets fitness
  - it appends secondary history to `competitionHistory`
  - extend `TurnoverContext`/`TurnoverResult` (`packages/engine/src/career/types.ts`)
  - test in `packages/engine/test/career/turnover.test.ts`
- [X] T056 [P] History screens: section "Outras competições" from `competitionHistory` (champion and table) in `apps/web/src/app/jogo/historico/` and `apps/web/src/app/jogo/fim-de-temporada/`, only when present
- [X] T057 (DONE differently: `advanceCareer`/`completeCareerRound` stay as the API of principal-only careers, now thin wrappers over `advanceCareerDays`/`completeCareerDay` in `career/day.ts`; there is a single implementation, and every old test, tool and long run exercises the day path. Original text: Migrate remaining callers off the deprecated `advanceCareer`/`completeCareerRound` (engine test helpers `packages/engine/test/{board,news,fans}/helpers.ts`, `packages/engine/test/renewal/long-run.ts`, `packages/save/test/{fixtures,helpers}.ts`, `tools/src/{simulate-world,simulate-economy}.ts`) to `advanceCareerDays`; then delete the wrappers and `withRoundResult` alias; keep every limit unchanged (FR-044, SC-003)
- [X] T058 Long-run with two competitions (FR-045): `packages/engine/test/calendar/long-run.test.ts`, 10 seasons, 2 seeds, all systems, no manager input, with these limits:
  - no club twice on the same date in any season
  - goals per match within the 002 bounds
  - economy within the 008 limits
  - mean AI starter fitness ≥ 60 every season
  
  Calibrate `DEFAULT_FITNESS` if needed, and record the results in research.md.
- [X] T059 [P] Performance: `packages/engine/test/calendar/performance.test.ts` (`buildSeasonCalendar` < 5 ms; `advanceCareerToNextMatch` < 300 ms on the two-competition bank)
- [X] T060 [P] Docs: `docs/mod-format.md` §5 (`schedule`, `discipline`, `fitness`, principal vs secondary competitions, club-in-multiple only per competition, new error codes with examples) and explicit `schedule` in `mods/exemplo/competitions.json` (regenerate with `pnpm gen:example-mod` if it is generated); update docs/design.md §13 status line for M7
- [X] T061 [P] E2E: export the two-competition bank as a test mod in `apps/web/e2e/fixtures/` and write `apps/web/e2e/calendar.spec.ts`:
  - import the mod and pick a club in both competitions
  - advance to Sunday, then Wednesday
  - the calendar filter works
  - competition tabs are present
  - the lineup shows fitness
  - default-bank career has no competition tabs
- [X] T062 Release bump in this same PR (memory: version + release notes go with the change): bump the app version and add pt-BR release notes for the multi-competition calendar and physical condition, following the 1.0.2 pattern
- [X] T063 Run the gates and the quickstart:
  - `pnpm typecheck && pnpm lint && pnpm test`
  - `pnpm sim:world --seasons 30` and `pnpm sim:economy --seasons 30` (exit 0)
  - `pnpm build:web && pnpm test:e2e`
  - confirm T001 (equivalence) is still green with the original snapshot

---

## Dependencies & Execution Order

- **Setup (1)**: T001 first, before any engine change.
- **Foundational (2)** comes before the user stories.
- **US1 (3)** comes before **US2 (4)**, because the day path needs the calendar and the secondary
  seasons.
- **US3 (5)** needs US2 (T022 override, `day.ts`).
- **US8 (6)** needs US1 (calendar in the save) and can run in parallel with US2/US3 after T018.
- **US4 (7)**, **US5 (8)** need US2 (`clubFixtures`, `nextFixture`).
- **US6 (9)** needs US2.
- **US7 (10)** needs US2.
- **Polish (11)**:
  - T055 after US2 and US7 (`disciplineRules`)
  - T057 after US6
  - T058 after US3, US6, US7 and T055
  - T061 after US4, US5
  - T063 last

### Parallel Opportunities

- T002/T003; T004/T005; T008/T010
- T012/T013/T014; T019/T020/T021; T030/T031
- T035 alongside T033
- T037 alongside US2/US3
- T039 and T041–T042 (different pages); T044/T045/T046; T052
- T056, T059, T060, T061

## Parallel Example: User Story 1

```bash
Task: "calendar/season-calendar.test.ts"   Task: "validation/calendar.test.ts"   Task: "career/season-state.test.ts"
```

## Parallel Example: User Story 6

```bash
Task: "finance/day.test.ts"   Task: "fans|board|news round tests with DayMatch"   Task: "renewal/mid-season + market/windows tests"
```

## Implementation Strategy

1. T001: tirar o retrato do banco padrão antes de tudo.
2. Fases 1–2: tipos, agenda, banco de teste e save v12 (formato). O jogo fica igual.
3. US1 → US2: calendário e avanço por dia. **Parar e validar** o critério de aceite 1 com o banco
   de duas competições.
4. US3: condição física, com T001 verde.
5. US8: migração. **Parar e validar** o critério de aceite 2.
6. US4–US7: telas, sistemas por data e suspensões por competição.
7. Polish: virada das secundárias, remoção dos wrappers, teste longo (critério de aceite 3),
   documentação, e2e, release.

Commits no fim, um por pacote: engine, save, i18n, web, tools, docs(specs) — mais o bump de versão
no mesmo PR.
