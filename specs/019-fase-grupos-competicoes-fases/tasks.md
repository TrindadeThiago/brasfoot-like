---

description: "Lista de tarefas da feature 019 — Fase de grupos e competições em fases"
---

# Tasks: Fase de grupos e competições em fases

**Input**: Design documents from `specs/019-fase-grupos-competicoes-fases/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: o motor segue o Princípio IX (testes antes, devem falhar primeiro): sorteio, classificação,
pareamento, avanço de fases, posição final, validação e migração. O equilíbrio tem simulação longa com
limites declarados (Princípio V, research.md R15); o save v14 tem migração e fixtures (Princípio VI).
Fluxos de interface com happy-dom + fake-indexeddb; e2e com Playwright.

**Organization**: tarefas por user story, em ordem de prioridade. O motor central (formato, estado,
classificação, sorteio básico, pareamento, avanço e posição final) é pré-requisito comum e fica na
Fase 2; cada história acrescenta a sua parte:

- P1: US1 (acompanhar o grupo e a zona de classificação — divisão em fases jogável e telas
  essenciais), US2 (descrever em dados e validar), US3 (sorteio com potes e regras), US4 (sequência
  de fases e classificação geral)
- P2: US5 (acesso, rebaixamento, várias temporadas e save), US6 (telas completas)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 … US6 (spec.md)
- Caminhos relativos à raiz do repositório

## Referências rápidas

- **API do motor:** `specs/019-fase-grupos-competicoes-fases/contracts/stages-api.md`
- **Save, mod e telas:** `specs/019-fase-grupos-competicoes-fases/contracts/mod-format-and-ui.md`
- **Decisões R1–R16:** `specs/019-fase-grupos-competicoes-fases/research.md`; **tipos:** `data-model.md`
- **Já existentes (017, 018 e anteriores):**
  - temporada: `createSeason`/`isSeasonOver` (`packages/engine/src/season/season.ts`), `generateCalendar`/
    `fixtureSeed` (`season/calendar.ts`), `standings` (`season/standings.ts`), `Season`/`Round`/
    `Fixture`/`MatchRecord`/`StandingRow` (`season/types.ts`), `startRound`/`completeRound`/`LiveRound`
    (`season/live-round.ts`), `prepareFixture` (`season/fixture.ts`)
  - copa (018): `createCupSeason`/`ensurePhaseDrawn`/`drawReady`/`phaseParticipants` (`knockout/bracket.ts`),
    `tieState`/`phaseDecided`/`phaseWinners`/`deciderFor`/`cupChampion` (`knockout/tie.ts`), `drawPhase`/
    `DrawClub` (`knockout/draw.ts`), `knockoutFormat`/`phaseRounds`/`openingClubs` (`knockout/rules.ts`),
    `cupPrizes` (`knockout/prizes.ts`), `cupEvents`/`cupEnd` (`knockout/events.ts`), `cupSeasonOf`/
    `cupEntry` (`knockout/history.ts`)
  - carreira: `createLeagueSeason`/`leagueRound`/`leagueTotalRounds` (`career/league.ts`),
    `createCareerSeason`/`clubFixtures`/`roundMatches`/`DayMatch`/`competitionSeason`
    (`career/season-state.ts`), dia de jogos (`career/day.ts`: `completeCareerDay`, `cupFacts`,
    `withCupPrizes`, `drawn`), `startLeagueRound`/`completeLeagueRound` (`career/league-round.ts`),
    `nextComposition` (`career/composition.ts`), `historyEntry` (`career/history.ts`), `seasonTurnover`
    (`career/turnover.ts`)
  - calendário: `buildSeasonCalendar`/`calendarCompetitions`/`roundsOf`/`gapsOf`/`theoreticalRounds`
    (`calendar/season-calendar.ts`), `roundDates`/`scheduleOfCompetition` (`calendar/schedule.ts`)
  - leitores de `standings()`: `board/goals.ts`, `fans/mood.ts`, `news/clinched.ts`,
    `career/turnover.ts` (`finalStandings`), `career/composition.ts`, `season/credibility.ts` (testes),
    web `game/selectors.ts` e `ui/StandingsTable.tsx`
  - dados/validação: `competitionSchema`/`divisionSchema`/`clubSchema`/`knockoutFormatSchema`
    (`model/schemas.ts`), `KNOCKOUT_HOME_RULES`/`RESERVED_FORMAT_TYPES` (`model/catalogs.ts`),
    `KnockoutFormat`/`Competition`/`Division` (`model/types.ts`), formato reservado
    (`validation/structural.ts`), `ISSUE_PARAMS`/`makeIssue` (`validation/issues.ts`),
    `checkCompetitions`/`checkKnockout`/`checkCalendar` (`validation/semantic/`), casos de regra
    (`packages/engine/test/validation/cases.ts`), `knockout.*` como modelo de códigos e mensagens
    (`packages/i18n/locales/pt-BR/errors.json`, `docs/mod-format.md` §5 e tabela de erros)
  - mod-kit: colunas de `clubs.csv` (`packages/modkit/src/csv.ts`: `CLUB_COLUMNS`), `docs.test.ts`
  - save: `SAVE_FORMAT_VERSION` (`packages/save/src/format.ts`), `migrateSave` e a migração v12 → v13
    (`packages/save/src/migrate.ts`), integridade `calendarProblem`, fixtures (`packages/save/test/
    fixtures.ts`: `saveV12`, `playDay`, `bankWithCup`), `equivalence.test.ts`
  - web: `StandingsTable`, `Bracket`, `DataTable`, `CompetitionSelect`, `CompetitionTabs`,
    `DivisionTabs`, `useDivision`, páginas `app/jogo/{competicao,calendario,historico,fim-de-temporada}`
- **Helpers de teste:** `packages/engine/test/helpers/{build-bank,seeds}.ts`,
  `test/fixtures/{cup-bank,two-competitions}.ts`, `test/knockout/helpers.ts` (`playCup`),
  `test/season/helpers/world.ts` (`testWorld`), `test/career/day-helpers.ts` (`newState`, `MANAGER`),
  `test/validation/cases.ts`; save: `packages/save/test/fixtures.ts`; web:
  `apps/web/test/helpers/{app.tsx,career.ts,saves.ts,live.ts}`
- **Lembretes:**
  - sem `Date`, `**`, `Math.pow` ou funções transcendentais no motor; aritmética inteira onde
    possível; clones por JSON; sem `Math.random`; ordem de iteração sempre por id;
  - cada chave nova de `ui.json` só entra junto com o código que a usa (o teste de i18n recusa chave
    sem uso); cada código de validação novo entra junto com seu caso em `test/validation/cases.ts`,
    sua mensagem em `errors.json` e a linha em `docs/mod-format.md` (o `docs.test.ts` do modkit confere);
  - uma `Season` sem `stages` NUNCA pode mudar de comportamento: a T001 congela isso;
  - antes de commitar, desfazer `apps/web/next-env.d.ts` e apagar `apps/web/AGENTS.md` se aparecerem.

---

## Phase 1: Setup

- [X] T001 Freeze the league behavior BEFORE touching `season/`: write `packages/engine/test/season/stages-freeze.test.ts` that hashes `generateCalendar` for 24 combinations (clubs 4…20 even and odd, turns 1 and 2, seeds `freeze-0`…`freeze-23`) and the `standings()` rows of a default-world `Season` after 10 rounds and at the end, and compares them with `packages/engine/test/season/__fixtures__/stages-freeze.json`, recorded now (env `UPDATE_BASELINE=1` writes it; otherwise it must exist). It must keep passing unchanged through the whole feature (spec FR-034, SC-009)
- [X] T002 [P] Add `saveV13(step)` to `packages/save/test/fixtures.ts`, following `saveV12` (the current save played to the step with the v14 changes absent and `formatVersion: 13`); it only becomes usable once the v14 version exists (T070), so write it now and use it in T071

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: formato em dados, estado da `Season`, regras de contagem, calendário com deslocamento, classificação, sorteio básico, pareamento, visão da fase eliminatória, criação, avanço e posição final. Nenhuma história funciona sem isto.

**⚠️ CRITICAL**: nenhuma user story começa antes do fim desta fase.

### Dados e tipos

- [X] T003 [P] Write `packages/engine/test/model/stages-schema.test.ts` (must fail first): the schema accepts a `league`, `groups` and `knockout` stage, `format.type` `"groups"` and `"stages"`, `division.stages`, `club.region` and `home: "overall"`; it rejects `groupSize` 2 or 9, `rounds` 3, `qualified` 0, `pots` 1, an unknown `DrawRule.kind`/`attribute`, more than 8 stages and a `stages` format with an empty list
- [X] T004 In `packages/engine/src/model/catalogs.ts`: add `"overall"` to `KNOCKOUT_HOME_RULES`, make `RESERVED_FORMAT_TYPES` an empty tuple (keep the export), add `STAGE_TYPES = ["league", "groups", "knockout"]`, `DRAW_ATTRIBUTES = ["country", "region"]` and `DRAW_RULE_KINDS = ["separate", "concentrate"]`
- [X] T005 In `packages/engine/src/model/schemas.ts` and `model/types.ts` (data-model.md §1): `leagueStageSchema`, `groupsStageSchema` (with `groupDrawSchema` and `drawRuleSchema`), `knockoutStageSchema` (the 018 `knockoutFormatSchema` plus `pairing`, `pairs`, `enter`), `stageFormatSchema`, `groupsFormatSchema`, `stagesFormatSchema` joined into `competitionFormatSchema`; optional `stages` in `divisionSchema` and optional `region` (texto 1–40) in `clubSchema`; export the inferred types (`StageFormat`, `GroupsStage`, `LeagueStage`, `KnockoutStage`, `DrawRule`, `GroupDraw`). Makes T003 pass
- [X] T006 In `packages/engine/src/validation/structural.ts`: `format.type: "groups"` is no longer rejected as reserved (only unknown types give `format.unsupported`); update `packages/engine/test/validation/structural.test.ts` and the `format.unsupported` case in `test/validation/cases.ts` to use a truly unknown type
- [X] T007 Runtime types: in `packages/engine/src/season/types.ts` add `Season.stages?`, `Fixture.stage?` and `Round.byes?`; create `packages/engine/src/stages/types.ts` with `StageState`, `GroupState`, `DrawWarning`, `DrawRuleRef`, `Qualifier`, `OverallRow`, `Origin` (data-model.md §2–3); export the public types from `packages/engine/src/index.ts`

### Regras de contagem

- [X] T008 [P] Write `packages/engine/test/stages/rules.test.ts` (must fail first): `stagesOf` normalizes `league`/`knockout`/`groups`/`stages` formats and lets `division.stages` win; `stageRounds` gives 38 for a 20-club double league, 3 for groups of 4 in one round-robin, 5 for groups of 5 (odd) and the sum of legs for a knockout; `stageParticipants` gives qualifiers of the previous stage plus `enter`, and the first stage excludes every later `enter`; `stageRoundRanges` returns contiguous absolute ranges
- [X] T009 Create `packages/engine/src/stages/rules.ts`: `stagesOf`, `stageRounds`, `stageParticipants`, `stageRoundRanges`, plus `DEFAULT_STAGES` and `GROUP_DRAW_TUNING` (`nodeBudget: 200_000`). Makes T008 pass

### Calendário com deslocamento e grupos

- [X] T010 [P] Write `packages/engine/test/season/calendar-offset.test.ts` (must fail first): `generateCalendar(clubs, turns, seed, firstRound)` numbers the rounds from `firstRound`, uses the absolute number in `fixtureSeed`, and without the argument is identical to today; `mergeGroupCalendars` joins the per-group calendars round by round (fixtures disjoint by club) and fills `byes` with every resting club for odd groups
- [X] T011 In `packages/engine/src/season/calendar.ts`: add the optional `firstRound` parameter (default 1) to `generateCalendar` without changing its output, and `mergeGroupCalendars(calendars: Round[][]): Round[]` (joins fixtures, collects `bye`s into `byes`). Makes T010 and T001 pass

### Banco de teste

- [X] T012 Create `packages/engine/test/fixtures/stages-bank.ts` (research.md R15): fictional names, `region` on clubs; builders `regionalBank()` (top league + bottom division with 32 clubs in 8 groups of 4, 2 qualified, knockout of 16, 2 promotion/2 relegation, `concentrate` by region), `extrasBank()` (6 groups of 4, 2 qualified + 4 extra) and `continentalBank()` (one division: preliminary knockout → 8 groups of 4 with 4 pots, last pot `previousStagePot`, `separate` by country exempting pot 4 → knockout); export `STAGES_ID`, `LOWER_LEVEL`. Create `packages/engine/test/stages/helpers.ts` with `playStagedSeason(world, seed)`, `playRounds(world, season, n)` and `clubsOf(season, stage)`, based on `test/knockout/helpers.ts`

### Classificação, sorteio básico e pareamento

- [X] T013 Refactor `packages/engine/src/season/standings.ts`: extract `rankRows(clubIds, records, points, tiebreakers, seed, options)` (with `options.skipHeadToHead`) from `standings`, which keeps calling it with the same inputs; no output change (T001 and the existing `test/season/standings*.test.ts` must pass untouched)
- [X] T014 [P] Write `packages/engine/test/stages/classification.test.ts` (must fail first): `groupStandings` uses only the group's records and the stage's points/tiebreakers; `overallStandings` merges every group, ignores `head-to-head`, appends `draw-lots` and always gives a total order; `stageQualifiers` returns exactly `qualified × groups + extra`, takes the extras only from position `qualified + 1` (never from lower positions) ordered by the overall classification, and for a league stage the first `qualified` of the table; `Qualifier` carries `group`, `groupPosition`, `overallPosition`, `extra`
- [X] T015 Create `packages/engine/src/stages/classification.ts`: `groupStandings`, `groupTables`, `overallStandings`, `stageQualifiers`, `stageOrigin` (data-model.md §3). Makes T014 pass
- [X] T016 [P] Write `packages/engine/test/stages/groups-draw-basic.test.ts` (must fail first): without pots or rules `drawGroups` splits the clubs into groups of the given size, every club exactly once, groups named `A`, `B`, …, same seed gives the same groups in any input order, different seeds differ
- [X] T017 Create `packages/engine/src/stages/groups-draw.ts` with `drawGroups(clubs, rules, seed, mode)` and the types `DrawClub`, `GroupsRule`, `DrawResult` — for now only the plain seeded partition (fork `${seed}:stage:${n}:draw`, clubs sorted by id first); pots and rules arrive in US3. Makes T016 pass
- [X] T018 [P] Write `packages/engine/test/stages/pairing.test.ts` (must fail first): `pairByPosition` pairs the i-th best qualifier with the i-th worst, never repeats a group when a swap avoids it (and keeps the pair when nothing does), is deterministic, and the host follows `home` (`ranking`, `division`, `draw`, and `overall` = better overall classification); with extras the extras play the group winners
- [X] T019 Create `packages/engine/src/stages/pairing.ts` with `pairByPosition(qualifiers, options)` (research.md R7, without the `pairs` table, which arrives in US4). Makes T018 pass

### Visão da fase eliminatória

- [X] T020 [P] Write `packages/engine/test/stages/cup-view.test.ts` (must fail first): `cupView(season, world, stageIndex)` exposes the stage `bracket`, its participants as `clubIds` and its `KnockoutFormat`; drawing a phase through the view fills the right absolute rounds and `applyCupView` folds `fixtures` and `bracket` back into `Season.stages[k]` without touching other stages or `records`; a plain 018 cup season behaves exactly as before (the existing `test/knockout/*.test.ts` stay green)
- [X] T021 Generalize `knockout/` for the view: `cupFormat(world, season)` in `knockout/rules.ts` (the view's format, else `knockoutFormat`); use it in `knockout/{bracket,tie,prizes,events}.ts` where `knockoutFormat(world, season.competitionId)` is called; in `knockout/draw.ts` add `DrawClub.rank?` and the home rule `overall`; make `ensurePhaseDrawn` call `pairByPosition` for phase 0 when the stage `pairing` is `position`; create `packages/engine/src/stages/cup-view.ts` with `cupView` and `applyCupView`. Makes T020 pass; all 018 tests stay green

### Criação, avanço e posição final

- [X] T022 [P] Write `packages/engine/test/stages/create.test.ts` (must fail first): `createStagedSeason` for groups → knockout builds `Season.calendar` with all rounds, `Fixture.stage` on group games, `fixtures: []` on knockout rounds, the first stage `started` with drawn `groups` and `clubIds`, every club in one group; league → knockout; odd groups fill `byes`; `createLeagueSeason` on a league competition whose lower division has `stages` builds a plain `Season` for the other divisions and a staged one for it; `composition` is respected; a competition with `format.type: "stages"` and one division is staged
- [X] T023 Create `packages/engine/src/stages/create.ts` (`createStagedSeason`, `isStagedSeason`, `stageOfRound`) and dispatch to it from `createSeason` (`season/season.ts`) when `stagesOf(...)` is not a single plain league stage; make `createLeagueSeason` (`career/league.ts`) and `createCareerSeason` (`career/season-state.ts`) pass `composition`/`status` through; add `SeasonError` codes if needed in `season/errors.ts`. Makes T022 pass
- [X] T024 [P] Write `packages/engine/test/stages/advance.test.ts` (must fail first): `advanceStages` returns the same reference when nothing changes and is idempotent; after the last group round the knockout phase 0 is drawn from `stageQualifiers` and its `fixtures` are filled; nothing is drawn before; a league stage followed by a knockout works; `advanceSeason` to the end equals playing round by round through `startRound`/`completeRound`; saving (JSON clone) and loading in the middle of a stage gives the same result
- [X] T025 Create `packages/engine/src/stages/advance.ts` (`advanceStages`, research.md R4) and call it at the end of `completeRound` in `packages/engine/src/season/live-round.ts` (no-op without `stages`). Makes T024 pass
- [X] T026 [P] Write `packages/engine/test/stages/ranking.test.ts` (must fail first): `finalOrder` always returns every club of the division once (positions 1…N) after each round of a full season; with the final decided the first is the champion and the second the runner-up; clubs eliminated in a phase sit behind those who went further and are ordered by the overall classification of the preceding points stage (reputation when there is none); a last groups stage orders by overall classification; `standings()` of a staged season follows `finalOrder` with the stats of the club's last points stage; `standings()` of a plain season is unchanged
- [X] T027 Create `packages/engine/src/stages/ranking.ts` (`finalOrder`, `stagedStandings`) and make `standings()` in `season/standings.ts` dispatch to it when `season.stages` exists. Makes T026 pass; T001 still passes

### Calendário da competição

- [X] T028 [P] Write `packages/engine/test/calendar/stages-calendar.test.ts` (must fail first): `calendarCompetitions` counts the rounds of a staged division as the sum of its stage rounds and takes the maximum across divisions; `gapWeeks` of group/league stages and of knockout phases shift the dates; two divisions of one competition with different gaps give `stages.gap_conflict`; the double-booking rule (017) still catches a club shared with another competition
- [X] T029 In `packages/engine/src/calendar/season-calendar.ts`: make `roundsOf` and `gapsOf` use `stagesOf`/`stageRounds` for divisions with stages; return the gap conflict as a `CalendarIssue` mapped by `validation/semantic/calendar.ts` to `stages.gap_conflict` (code declared in US2, T043; until then keep the issue internal). Makes T028 pass

**Checkpoint**: o motor cria, joga (`advanceSeason`) e ordena uma divisão em fases do banco de teste, e T001 segue verde.

---

## Phase 3: User Story 1 - Acompanhar meu grupo e a zona de classificação (Priority: P1) 🎯 MVP

**Goal**: o jogador joga a fase de grupos de uma divisão em fases, vê a tabela do grupo com a zona de classificação e, ao fim dos grupos, o chaveamento com os classificados.

**Independent Test**: carreira no banco regional, jogar a fase de grupos inteira e conferir as tabelas, a zona marcada e o chaveamento (`apps/web/test/flows/stages.test.tsx`).

### Tests (write first, must fail)

- [X] T030 [P] [US1] Write `packages/engine/test/career/stages-day.test.ts`: with `regionalBank`, `completeCareerDay` through all group rounds keeps `fixtures` present every day, applies suspensions/injuries and fitness, adds gate revenue for home games, the knockout appears right after the last group round, the user club eliminated in the groups keeps the season going (simulated), and `Fixture.stage` marks the group and kind
- [X] T031 [P] [US1] Write `packages/engine/test/career/stages-cup-facts.test.ts`: knockout games of a staged division pay `cupPrizes` per phase to the winners (via the view) and produce `cupEvents` (elimination, zebra); no `CupHistoryEntry` is created for it (`cupSeasonOf` stays undefined)
- [X] T032 [P] [US1] Write `packages/engine/test/news/clinched-stages.test.ts`: `news/clinched.ts` produces no "title/promotion/relegation clinched" fact for a staged division and still does for a plain league

### Implementation

- [X] T033 [US1] In `packages/engine/src/career/day.ts`: make `cupFacts`/`withCupPrizes` find the knockout stage of a staged division (via `cupView`) so prizes and events apply to it; keep `drawn()` unchanged (the advance happens in `completeRound`). Makes T030/T031 pass
- [X] T034 [US1] In `packages/engine/src/news/clinched.ts`: skip seasons with `stages`. Makes T032 pass
- [X] T035 [P] [US1] Create `apps/web/test/helpers/stages.ts`: builds a save from `regionalBank` (via `createSave` with the bank) with the managed club in a group, stored like `storedCareer` in `helpers/career.ts`, with helpers to play `n` days
- [X] T036 [P] [US1] Write `apps/web/test/flows/stages.test.tsx` (must fail first): the competition page for a staged division shows one table per group with the managed club's group highlighted, the qualification zone legend (`qualified`, and `extra` when the stage has extras), and — after the group stage is played — the bracket with the origin of each slot ("1º do Grupo A")
- [X] T037 [US1] Generalize `apps/web/src/ui/StandingsTable.tsx`: optional `rows` (default `standings(season, bank)`) and a `zones` union that also accepts `{ qualified, extra }` (keeps the promotion/relegation behavior and its tests)
- [X] T038 [US1] Create `apps/web/src/ui/stages/GroupTables.tsx` (+ `GroupTables.module.css`): one `StandingsTable` per group from `groupTables(...)`, the managed club's group first/highlighted, legend and zone marks
- [X] T039 [US1] Create `apps/web/src/ui/stages/StageBracket.tsx` over `apps/web/src/ui/cup/Bracket.tsx`: `Bracket` accepts an optional pre-built view and an `originOf(clubId)` that labels the slot from `stageOrigin`
- [X] T040 [US1] In `apps/web/src/app/jogo/competicao/page.tsx`: when `season.stages` exists, render the current stage (group tables or bracket) in place of the plain table; `apps/web/src/game/useDivision.ts` exposes whether the season is staged
- [X] T041 [US1] Add the `ui.json` keys used above (`stages.group`, `stages.zone.qualified`, `stages.zone.extra`, `stages.origin.group`, `stages.origin.table`, `stages.origin.extra`) in `packages/i18n/locales/pt-BR/ui.json`. Makes T036 pass

**Checkpoint**: US1 funciona e é testável sozinha (MVP).

---

## Phase 4: User Story 2 - Descrever uma competição em fases só com dados (Priority: P1)

**Goal**: o modder descreve a sequência de fases e o jogo valida e recusa o que não fecha, com arquivo e campo.

**Independent Test**: bancos válidos (grupos → mata-mata; pontos corridos → playoff; duas fases de grupos; divisão em fases entre divisões de liga) são aceitos; cada código `stages.*` é recusado por um banco de teste próprio.

### Tests (write first, must fail)

- [X] T042 [P] [US2] Write `packages/engine/test/validation/stages.test.ts` and add one case per code to `packages/engine/test/validation/cases.ts` (`group_size_mismatch`, `group_count`, `qualify_range`, `extra_exceeds_groups`, `qualify_mismatch`, `qualified_without_next`, `knockout_count`, `enter_unknown_club`, `enter_first_stage`, `enter_duplicate`, `pots_range`, `pot_size`, `rule_exempt_pot`, `separation_impossible`, `gap_conflict`) with section, path, entity and params; plus acceptance tests for the four valid shapes above and for `mods/exemplo` staying valid. `stages.pairs_invalid` and `stages.relegation_exceeds_eliminated` are added in US4 (T063) and US5 (T070)

### Implementation

- [X] T043 [US2] Declare the codes in `packages/engine/src/validation/issues.ts` (`IssueCode` and `ISSUE_PARAMS`, contracts/stages-api.md table)
- [X] T044 [US2] Create `packages/engine/src/validation/semantic/stages.ts` (`checkStages`, research.md R10, participants counted per stage as in data-model.md §1) and wire it into `packages/engine/src/validation/validate.ts`; make `semantic/competitions.ts` (`checkFormat`, club counts, slots) and `semantic/calendar.ts` aware of divisions with `stages`; map the calendar gap conflict from T029 to `stages.gap_conflict`. Makes T042 pass
- [X] T045 [P] [US2] Add the messages (ICU, plural) for every `stages.*` code to `packages/i18n/locales/pt-BR/errors.json`
- [X] T046 [P] [US2] Add the optional `region` column to `packages/modkit/src/csv.ts` (`CLUB_COLUMNS`, export and import, not required) and cover it in `packages/modkit/test/csv.test.ts` (round trip with and without region)
- [X] T047 [US2] Document the format in `docs/mod-format.md`: §5 with `groups`/`stages`, `division.stages`, the three stage types with field tables and defaults, `draw` (pots, `previousStagePot`, `separate`/`concentrate`, `exemptPots`), `enter`, `pairing`/`pairs` and slot origins, `home: "overall"`, `club.region` (and the CSV column in §10), two complete examples (regional fourth division; continental with preliminary, pots and country separation), the sorteio rule (strict only in validation/tests; a career concludes with a warning) and the `stages.*` rows of the error table (`packages/modkit/test/docs.test.ts` must pass)

**Checkpoint**: US1 + US2 funcionam; bancos inválidos são recusados.

---

## Phase 5: User Story 3 - Sorteio com potes e regras por competição, determinístico (Priority: P1)

**Goal**: potes, separação (com potes isentos) e concentração; nunca trava a carreira; estrito na validação e nos testes.

**Independent Test**: centenas de sorteios sem violação; concentração por região em grupos vizinhos; separação impossível: `strict` falha com erro claro, `career` conclui com aviso e todo clube num grupo.

### Tests (write first, must fail)

- [X] T048 [P] [US3] Write `packages/engine/test/stages/groups-draw.test.ts`: pots as blocks by reputation (one per group per pot), last pot from the previous stage with `previousStagePot`, separation by country and by region respected, exempt pot clubs may share a group, concentration puts each region in consecutive groups using at most one group above the minimum (SC-003, 30 seeds on `regionalBank`), separation wins over concentration, same seed + any input order = same groups, impossible separation: `career` returns all clubs in groups with the minimum violating pairs and a warning naming rule and clubs, `strict` returns `stages.draw_impossible` and no groups, potes never relaxed
- [X] T049 [P] [US3] Write `packages/engine/test/stages/groups-draw-property.test.ts`: at least 300 draws (seeds × bank variants) in which separation is feasible have no violation; a deliberately huge infeasible input finishes within the node budget (counted, not timed) and is deterministic

### Implementation

- [X] T050 [US3] In `packages/engine/src/stages/groups-draw.ts`: pots (`makePots`, research.md R6 step 1)
- [X] T051 [US3] In `packages/engine/src/stages/groups-draw.ts`: exact separation search with backtracking, RNG-ordered candidates and forward checking, honoring `exemptPots`
- [X] T052 [US3] In `packages/engine/src/stages/groups-draw.ts`: concentration (constructive consecutive fill without pots; fixed-order local swaps with pots) as a tie-break among feasible solutions
- [X] T053 [US3] In `packages/engine/src/stages/groups-draw.ts`: infeasible case — branch and bound minimizing violating pairs within `GROUP_DRAW_TUNING.nodeBudget`; modes `career` (warnings) and `strict` (`stages.draw_impossible`, declared with its message in `errors.json`). Makes T048/T049 pass
- [X] T054 [US3] In `packages/engine/src/stages/create.ts` and `advance.ts`: build `DrawClub` from `club.countryId`, `club.region`, `reputation` and `fromPreviousStage`; call `drawGroups` in `career` mode; store the warnings in `StageState.warnings`; add `drawWarnings(season)` to `stages/ranking.ts`/index
- [X] T055 [P] [US3] Write `packages/engine/test/career/stages-draw-career.test.ts`: after promotions/relegations make a country separation impossible; the turnover still completes, the new season draws with a warning, every club is in a group and the career never stops; validating the same bank in `strict` mode reports it
- [X] T056 [US3] Create `apps/web/src/ui/stages/DrawNotice.tsx` (rule and clubs from `drawWarnings`), render it in the competition page (T040) and add the `stages.drawNotice` key; extend `apps/web/test/flows/stages.test.tsx` with a case that shows the notice

**Checkpoint**: sorteio completo; US1–US3 independentes.

---

## Phase 6: User Story 4 - Sequência de fases e classificação geral (Priority: P1)

**Goal**: encadear fases (grupos → mata-mata, pontos corridos → playoff, várias fases de grupos, preliminar → grupos), chaveamento por posição, mando pela classificação geral e tabela própria de confrontos.

**Independent Test**: cada sequência joga até o fim com os classificados exatos dos dados; o mando e o chaveamento seguem a classificação geral e a posição no grupo.

### Tests (write first, must fail)

- [X] T057 [P] [US4] Write `packages/engine/test/stages/sequences.test.ts`: league → playoff (top N, 1×N pairing), groups → groups (the second stage is drawn from the first's qualifiers), preliminary knockout → groups with a pot of origin (`continentalBank`), each knockout stage with its own format (single leg until the semifinal, final in two legs), `home: "overall"` puts the better overall club at home, extras play group winners, `pairs` table (`A1` × `B2`, `T1` × `T4`, `X1`) replaces the default pairing, and the qualified clubs of every stage match the data exactly
- [X] T058 [P] [US4] Add `packages/engine/test/stages/pairing.test.ts` cases for `pairs` (valid table, origin that does not exist, club used twice, club left out)

### Implementation

- [X] T059 [US4] In `packages/engine/src/stages/pairing.ts`: parse and apply `pairs` (origins `<grupo><posição>`, `T<posição>`, `X<n>`) overriding the default pairing; `stageOrigin` (T015) resolves the same labels
- [X] T060 [US4] In `packages/engine/src/stages/advance.ts`: league-stage start/end (calendar for the participants with absolute rounds, qualifiers = top N), second groups stage from the previous qualifiers plus `enter`, preliminary knockout stages in any position (`fromPreviousStage` for the pot of origin); `phaseRounds` offsets per knockout stage in `knockout/rules.ts`
- [X] T061 [US4] In `packages/engine/src/knockout/draw.ts` and `bracket.ts`: use the overall rank of the preceding points stage for `home: "overall"` in phase 0 and later phases (fallback: reputation)
- [X] T062 [US4] In `packages/engine/src/stages/ranking.ts`: `finalOrder` for sequences with a knockout before a groups stage (preliminary eliminated clubs sit behind everyone who reached the groups)
- [X] T063 [US4] Add `stages.pairs_invalid` to `validation/issues.ts`, `validation/semantic/stages.ts`, `test/validation/cases.ts`, `errors.json` and the `docs/mod-format.md` table. Makes T057/T058 pass

**Checkpoint**: US1–US4; qualquer sequência de fases do spec funciona no motor.

---

## Phase 7: User Story 5 - Acesso, rebaixamento, várias temporadas e save (Priority: P2)

**Goal**: finalistas sobem, os piores da classificação geral caem, a divisão de cima rebaixa o mesmo número, a temporada seguinte sorteia com a nova composição, e o save v14 guarda tudo.

**Independent Test**: 30 temporadas do banco regional sem erro, com os promovidos vindos do mata-mata (SC-001).

### Tests (write first, must fail)

- [X] T064 [P] [US5] Write `packages/engine/test/career/stages-turnover.test.ts`: `nextComposition` promotes the two finalists of the staged division and relegates the worst of its overall classification among clubs that did not leave the groups; the division above relegates the same number; the next season's groups are drawn from the new composition; `historyEntry` has the champion as `championId` and the final order as standings; board goals, fan mood and the finance prizes read the final position (no sign of league-table assumptions); two seasons in a row
- [X] T065 [P] [US5] Write `packages/engine/test/validation/stages-relegation.test.ts` and its case in `test/validation/cases.ts` for `stages.relegation_exceeds_eliminated`
- [X] T066 [P] [US5] Write `packages/engine/test/stages/long-run.test.ts` (Princípio V, limits declared at the top): 30 seasons of `regionalBank` without error; in 30 of 30 the promoted are the finalists; every stage's qualifiers equal `qualified × groups + extra` and no club repeats in the next stage; `finalOrder` positions are unique 1…N every season; at least 300 draws (10+ seeds × 30 seasons) with no separation or pot violation; every region occupies consecutive groups using at most one above the minimum; plus the `extrasBank` for 5 seasons

### Implementation

- [X] T067 [US5] Fix whatever T064 shows in `packages/engine/src/career/{composition,turnover,history}.ts` and `season/season.ts` (expected: only the dispatch through `standings()`; the turnover invariants in `resultProblem` must accept the staged seasons), keeping T001 green
- [X] T068 [US5] Add `stages.relegation_exceeds_eliminated` to `validation/issues.ts`, `validation/semantic/stages.ts`, `errors.json` and the `docs/mod-format.md` table. Makes T065 pass
- [X] T069 [US5] Run T066 and adjust nothing in the limits unless the measured values justify it; record the measured values in `specs/019-fase-grupos-competicoes-fases/research.md` R15
- [X] T070 [US5] In `packages/save/src/format.ts` set `SAVE_FORMAT_VERSION = 14`; in `packages/save/src/migrate.ts` add the v13 → v14 migration (only `formatVersion = 14`) chained after v13, and extend the integrity check (`calendarProblem`) for staged seasons (stage rounds cover the calendar in order; unstarted stages have empty rounds; started stages have complete fixtures)
- [X] T071 [P] [US5] Write `packages/save/test/migrate-v14.test.ts` (start, 17 rounds, season end, 3 seasons, with a cup in progress; `saveV13(step)` from T002): the save opens, `formatVersion` is 14 and everything else is equal
- [X] T072 [P] [US5] Write `packages/save/test/create-stages.test.ts`: `createSave` with `regionalBank`, play 2 seasons, export and import in the middle of the group stage and of the knockout; the continuation is identical to playing straight through
- [X] T073 [US5] Run `packages/save/test/equivalence.test.ts` and the default-world long runs (`pnpm sim:world --seasons 30`, `pnpm sim:economy --seasons 30`): they must pass without regravating any baseline (SC-009). If any baseline moved, the bug is in the staged dispatch, not in the baseline

**Checkpoint**: US1–US5; a carreira em fases dura 30 temporadas e o save v14 está pronto.

---

## Phase 8: User Story 6 - Telas completas das fases (Priority: P2)

**Goal**: navegação por fase, classificação geral, chaveamento com origem, fase no próximo jogo e no calendário, posição final no resumo.

**Independent Test**: com a competição em andamento e depois de terminada, as telas refletem o estado (`apps/web/test/flows/stages.test.tsx`).

### Tests (write first, must fail)

- [X] T074 [P] [US6] Extend `apps/web/test/flows/stages.test.tsx`: `StageNav` lists the phases and opens one already played; the "Classificação geral" tab orders every club and marks who would qualify and who would be relegated today; the Início next-match card shows "Grupo B, rodada 3" and then the knockout phase name; the calendar page has a "Fase" column for staged games; the end-of-season summary lists the final position of every club of the staged division with champion, promoted and relegated

### Implementation

- [X] T075 [P] [US6] Create `apps/web/src/ui/stages/StageNav.tsx` (tabs or list by stage, state "jogada/em andamento/futura") and `apps/web/src/ui/stages/OverallTable.tsx` (from `overallStandings`, zone marks for qualified, extra and "cairia hoje")
- [X] T076 [US6] Complete `apps/web/src/app/jogo/competicao/page.tsx`: `StageNav` + the stage views (group tables, overall table, bracket, draw notice) for any stage already started; stages not started show "a definir"
- [X] T077 [US6] Add `stage?` to `ClubFixture` in `packages/engine/src/career/season-state.ts` (from `Fixture.stage`), show it in `apps/web/src/app/jogo/page.tsx` (next match) and as the "Fase" column in `apps/web/src/app/jogo/calendario/page.tsx`
- [X] T078 [US6] End-of-season and history screens (`apps/web/src/app/jogo/fim-de-temporada/page.tsx`, `apps/web/src/ui/SeasonSummary.tsx`, `apps/web/src/app/jogo/historico/page.tsx`): show the final position (FR-024), champion, promoted and relegated of a staged division, reusing the `standings()` rows
- [X] T079 [P] [US6] Add the remaining `ui.json` keys (`stages.nav.*`, `stages.overall.*`, `calendar.stage`, `home.stage`) together with the code that uses them
- [X] T080 [P] [US6] Create `mods/exemplo-fases/` with `tools/src/gen-stages-example-mod.ts` (fictional; 20-club lower division in 4 groups of 5 by region → quarters, semifinal, final; 2 promoted/2 relegated), add `pnpm gen:stages-mod` to the root `package.json`, and a test in `packages/modkit/test/example.test.ts` that the generated mod validates
- [X] T081 [US6] Write `apps/web/e2e/stages.spec.ts`: load `mods/exemplo-fases` through the mods page file input (build the zip in Node with `@brasfoot-like/modkit`), start a career in a group, play the groups and the knockout, see the bracket and the final position

**Checkpoint**: todas as histórias funcionam.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T082 [P] Update `docs/design.md` (estado do M7: fase de grupos e competições em fases, 019) and the roadmap row if needed
- [X] T083 [P] Bump the version and add the release notes in this same change (`package.json` and `packages/i18n/locales/pt-BR/release-notes.json`): fase de grupos, competições em fases, sorteio com potes e regras, atributo de região, save v14
- [X] T084 [P] Confirm the architecture test still passes (`packages/engine/test/architecture.test.ts`: no `Math.random`, `Date`, DOM) and that no visible string is outside i18n (the i18n tests)
- [X] T085 Run `specs/019-fase-grupos-competicoes-fases/quickstart.md` end to end and the gates: `pnpm typecheck && pnpm lint && pnpm test`, `pnpm build:web && pnpm test:e2e`
- [X] T086 Remove `apps/web/next-env.d.ts` and `apps/web/AGENTS.md` changes if they appeared; confirm `git status` has only intended files

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências; T001 deve ser feita antes de qualquer alteração em `season/`
- **Foundational (Phase 2)**: depende do Setup; **bloqueia todas as histórias**
- **US1 (Phase 3)**: depende da Fase 2
- **US2 (Phase 4)**: depende da Fase 2 (usa os tipos e o calendário); independente de US1
- **US3 (Phase 5)**: depende da Fase 2 (estende `groups-draw.ts`); a T056 usa a página de US1 (T040)
- **US4 (Phase 6)**: depende da Fase 2 e da T023/T025; a T063 depende de US2 (T043/T044)
- **US5 (Phase 7)**: depende de US1–US4 (long-run usa o sorteio completo e as sequências); T070 só precisa da Fase 2
- **US6 (Phase 8)**: depende de US1 (páginas) e US5 (resumo da temporada)
- **Polish (Phase 9)**: depende de tudo

### Within Each Story

- Testes primeiro, falhando; depois a implementação que os faz passar
- Tipos → regras → motor → integração de carreira → telas

### Parallel Opportunities

- Na Fase 2, os testes T003, T008, T010, T014, T016, T018, T020, T022, T024, T026, T028 são arquivos
  distintos e podem ser escritos em paralelo; as implementações seguem a ordem T004→T005→T007→T009→T011…
- US2 (T042–T047) e US3 (T048–T055) podem andar em paralelo depois da Fase 2 (arquivos diferentes)
- Em US6, T075, T079 e T080 são paralelas

### Parallel Example: Phase 2 tests

```text
T003 packages/engine/test/model/stages-schema.test.ts
T008 packages/engine/test/stages/rules.test.ts
T010 packages/engine/test/season/calendar-offset.test.ts
T014 packages/engine/test/stages/classification.test.ts
T016 packages/engine/test/stages/groups-draw-basic.test.ts
T018 packages/engine/test/stages/pairing.test.ts
```

---

## Implementation Strategy

### MVP First (US1)

1. Fase 1 (congelar a liga) e Fase 2 (motor central).
2. Fase 3 (US1): a divisão em fases é jogável, com tabelas e chaveamento.
3. **Parar e validar**: banco regional, jogar a fase de grupos e ver as tabelas.

### Incremental Delivery

1. US2 (validação e documentação) → mods podem ser escritos com segurança.
2. US3 (sorteio completo) → regras por competição e a carreira que nunca trava.
3. US4 (sequências) → todos os formatos do spec.
4. US5 (acesso, rebaixamento, save e 30 temporadas) → fecha o critério de aceite 1 e 2.
5. US6 (telas completas) → experiência final, com e2e.
6. Polish → docs, versão e gates.

### Notes

- O mundo padrão não ganha competição: nada em `mods/default/` nem em `generateDefaultBank` muda.
- Se uma linha de base existente (equivalência, congelamento) mudar, o erro está no despacho das
  fases, não na linha de base.
- Commitar por tarefa ou por grupo lógico; parar nos checkpoints para validar cada história.
