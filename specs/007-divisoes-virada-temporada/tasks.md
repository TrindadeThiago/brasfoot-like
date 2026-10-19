---

description: "Lista de tarefas da feature 007 — múltiplas divisões e virada de temporada"
---

# Tasks: Múltiplas divisões e virada de temporada

**Input**: Design documents from `specs/007-divisoes-virada-temporada/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: o módulo `career/` do motor segue o Princípio IX (testes antes, devem falhar primeiro);
a mudança do save para a v3 vem com migração e testes com fixtures v2 (Princípio VI); os critérios
de aceite (10 temporadas, rebaixado em N joga a Série B em N+1) viram testes de simulação longa
(Princípio V). Os fluxos de interface ligados aos critérios de sucesso (virada no navegador,
clube da Série B, seletor de divisão) também são testados antes, com happy-dom + fake-indexeddb;
Playwright cobre a virada de ponta a ponta.

**Organization**: tarefas agrupadas por user story, em ordem de prioridade (US1, US2 → US3, US4,
US6 → US5).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 … US6
- Caminhos relativos à raiz do repositório

## Referências rápidas

- API do motor: `specs/007-divisoes-virada-temporada/contracts/league-api.md`
- Save v3 e migração: `specs/007-divisoes-virada-temporada/contracts/save-format-v3.md`
- Telas, rotas, atalhos: `specs/007-divisoes-virada-temporada/contracts/ui.md`
- Tipos: `specs/007-divisoes-virada-temporada/data-model.md`; decisões R1–R12: `research.md`
- Já existentes no motor: `createSeason`, `advanceSeason`, `isSeasonOver`, `unavailablePlayers`
  (`season/season.ts`); `generateCalendar`, `fixtureSeed` (`season/calendar.ts`); `startRound`,
  `advanceRound`, `applyRoundChange`, `finishRound`, `isRoundFinished`, `completeRound`, `matchOf`
  (`season/live-round.ts`); `standings` (`season/standings.ts`, desempates com `draw-lots` por
  seed+clube); `seasonStats`, `topScorers`, `topAssists` (`season/stats.ts`); `ageOn`
  (`calendar/date.ts`); `preferredFormation` (`season/lineups.ts`); `createRng` (`rng/xoshiro.ts`);
  `seasonError` e `SEASON_ERROR_CODES`/`SEASON_ERROR_PARAMS` (`season/errors.ts`); validação de
  vagas entre divisões em `validation/semantic/competitions.ts`
- Helpers de teste do motor: `testWorld`, `serieAOptions`, `newSeason`, `playedSeason`
  (`packages/engine/test/season/helpers/world.ts`)
- Save: `SaveFile`/`SAVE_FORMAT_VERSION` (`format.ts`), `createSave` (`create.ts`), `migrateSave` +
  `MIGRATIONS` (`migrate.ts`), `initialLineup` (`lineup.ts`), `summarize`/`seasonYearOf`
  (`summary.ts`); builder `validSave()` em `packages/save/test/fixtures.ts`
- App: `GameProvider` (`commitRound`, `playRound`, `commitLineup`, `withAdjustedLineup`,
  `lineupContext`, `persist`), `selectors.ts` (`leagueClubs`, `seasonYear`, `nextFixture`),
  `CompetitionTabs`, `StandingsTable`, `RoundResults`, `LiveGrid`, `EventFeed`, `useShortcuts`,
  `GameLayout` (atalhos `1`–`5`), `ShortcutsHelp`, helpers `apps/web/test/helpers/*`

---

## Phase 1: Setup

- [X] T001 [P] Add the new season/turnover error codes to `packages/engine/src/season/errors.ts` (`season.invalid_composition` {level, reason}, `turnover.season_not_over` {round}, `turnover.invalid_steps` {stepId, reason}, `turnover.invalid_result` {reason}) in `SEASON_ERROR_CODES` and `SEASON_ERROR_PARAMS`, and their pt-BR messages in `packages/i18n/locales/pt-BR/season-errors.json` (complete sentences with variables)
- [X] T002 [P] Add the pt-BR UI strings of this feature to `packages/i18n/locales/pt-BR/ui.json`: division selector (`division.tabs.label`, `division.mine`), standings zones and legend (`standings.zone.promotion`, `standings.zone.relegation`, `standings.zone.legend`), round screen link (`round.otherDivisionResults` with `{division}`), new career filter (`newCareer.division.filter`, `newCareer.division.all`, `newCareer.clubDivision` with `{division}`), season end (`seasonEnd.title` `{year}`, `seasonEnd.champion` `{division}`, `seasonEnd.promotedTo` / `seasonEnd.relegatedTo` `{division}`, `seasonEnd.mine.champion|promoted|relegated|stayed` with `{position}` and `{division}`, `seasonEnd.next`, `seasonEnd.preparing`, `seasonEnd.finalStandings`), history (`history.title`, `history.empty`, `history.season` `{year}`, `history.champion` `{division}`, `history.myClub` `{position}` `{division}`, `history.back`), header/saves with division (`header.season` / `saves.division` with `{year}` `{division}`), help lines for `[`/`]`, `N`, `H`; update `save.club_not_in_league` to "O clube {clubId} não disputa a competição."

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: a carreira passa a guardar a temporada da liga (todas as divisões, avançando juntas)
no save v3, e o jogo continua funcionando para o clube do jogador como antes

**⚠️ CRITICAL**: nenhuma história começa antes desta fase

### Motor

- [X] T003 Write `packages/engine/test/season/season-options.test.ts`: `createSeason` with `clubIds` uses exactly that composition (calendar covers only those clubs, formations only for them); invalid `clubIds` (unknown club, duplicate, club of another competition, fewer than 2) → `season.invalid_composition`; `status` option seeds `season.status` (an injured player stays unavailable in round 1); without the new options the result is deep-equal to today's for 2 seeds (regression)
- [X] T004 Implement `clubIds?` and `status?` in `SeasonOptions` (`packages/engine/src/season/types.ts`) and in `createSeason` (`packages/engine/src/season/season.ts`); add optional `divisionLevel?: number` to `LiveMatch` in `packages/engine/src/season/live-round.ts` (set by `startRound` from `season.divisionLevel`) — T003 green
- [X] T005 Create `packages/engine/src/career/types.ts` with `LeagueSeason`, `LeagueSeasonOptions`, `LeagueResult`, `DivisionZones`, `SeasonHistoryEntry`, `HistoryDivision`, `HistoryRow`, `TurnoverStep`, `TurnoverRegistration`, `TurnoverContext`, `NextSeasonDraft`, `TurnoverOptions`, `TurnoverResult` exactly as in `data-model.md` and `contracts/league-api.md`
- [X] T006 Write `packages/engine/test/career/league.test.ts`: `createLeagueSeason` on `testWorld()` gives 2 divisions ordered by level, 20 clubs each, all with `seed === leagueSeasonSeed(careerSeed, 1) === careerSeed`; its level-1 `Season` is deep-equal to `createSeason(world, serieAOptions(careerSeed))` (R3 compatibility); `leagueSeasonSeed(s, 3) === "s:s3"`; `composition` option is honored and validated (partition of all competition clubs, same sizes as the bank, else `season.invalid_composition`); `year` defaults to the year of `manifest.referenceDate`; `leagueRound` is 1 at start; `divisionSeason`/`clubDivision` find the right `Season`; `divisionZones` returns `{promotion: 0, relegation: 4}` for level 1 and `{promotion: 4, relegation: 0}` for level 2
- [X] T007 Write `packages/engine/test/career/league-round.test.ts`: `startLeagueRound` gives one `LiveRound` with 20 matches, level-1 matches first, each with the right `divisionLevel`; `completeLeagueRound(l, w, finishRound(startLeagueRound(l, w).round))` advances both divisions one round and each division's part is deep-equal to `completeRound(divisionSeason, w, …)` with the same matches; `advanceLeague(l, w, { rounds: 1 })` equals that path; an external lineup for a Série B club is used for that club's match; lineup for a club not playing → `season.lineup_not_playing`; a decision applied with `applyRoundChange` to the manager's match changes only that match (all other 19 records identical to the direct run); `advanceLeague(…, { toEnd: true })` leaves `isLeagueSeasonOver` true with 38 rounds in each division; a test world whose Série B has 18 clubs (34 rounds) finishes the Série B first and keeps playing the Série A until round 38, with `leagueRound` following the longer division
- [X] T008 Implement `packages/engine/src/career/league.ts` (`createLeagueSeason`, `leagueSeasonSeed`, `leagueRound`, `isLeagueSeasonOver`, `divisionSeason`, `clubDivision`, `divisionZones`) — T006 green
- [X] T009 Implement `packages/engine/src/career/league-round.ts` (`startLeagueRound`, `completeLeagueRound`, `advanceLeague`) on top of `startRound`/`finishRound`/`completeRound` from `packages/engine/src/season/live-round.ts`, splitting matches by `divisionLevel` (R2) — T007 green
- [X] T010 [P] Write `packages/engine/test/calendar/season-date.test.ts` and implement `seasonDate(referenceDate, year)` in `packages/engine/src/calendar/date.ts` (year swapped; `2028-02-29` → `2029-02-28`; `ageOn(birth, seasonDate(ref, year + 1)) === ageOn(birth, seasonDate(ref, year)) + 1`)
- [X] T011 Export the new API from `packages/engine/src/index.ts` (career types, `createLeagueSeason`, `leagueSeasonSeed`, `leagueRound`, `isLeagueSeasonOver`, `divisionSeason`, `clubDivision`, `divisionZones`, `startLeagueRound`, `completeLeagueRound`, `advanceLeague`, `seasonDate`) and run `pnpm vitest run packages/engine` + the architecture test to confirm nothing in `season/` changed behavior

### Save v3

- [X] T012 Add v2 builders to `packages/save/test/fixtures.ts`: `saveV2MidSeason()` (a v2 save — `season` = Série A after 10 rounds with `advanceSeason`, no `league`/`history`) and `saveV2SeasonOver()` (38 rounds played)
- [X] T013 Write `packages/save/test/migrate-v3.test.ts`: v2 mid-season → v3 with `league.divisions[0]` deep-equal to the v2 `season`, Série B `Season` at `nextRound === 11` and equal to `advanceSeason(createSeason(level 2, same seed), { rounds: 10 })`, `history: []`, no `season` key, `migratedFrom: 2`; v2 season over → v3 league over; migration is deterministic (twice → deep-equal); v1 → v3 in chain still opens (reuse the v1 helper of `migrate-v2.test.ts`); v3 validation rejects as `corrupt`: a division with another seed, the manager's club in no division, divisions with different `nextRound` while not over
- [X] T014 Write `packages/save/test/career.test.ts` (part 1): `createSave` with a Série B club works (club found in level 2, lineup built from the Série B squad); unknown club → `save.club_not_in_league`; `userSeason`/`userDivisionLevel` return the manager's division; `seasonYearOf` = `league.year`; `currentDate` = `seasonDate(referenceDate, league.year)`; `summarize` gives `divisionLevel`, league round, total rounds and `seasonOver` from the league
- [X] T015 Implement save v3: `packages/save/src/format.ts` (`SAVE_FORMAT_VERSION = 3`, `league: LeagueSeason`, `history: SeasonHistoryEntry[]`, no `season`), `packages/save/src/create.ts` (any division, `createLeagueSeason`), `packages/save/src/career.ts` (`userSeason`, `userDivisionLevel`, `currentDate`), `packages/save/src/summary.ts` (league-based fields, `divisionLevel`, `seasonYearOf` from `league.year`), export from `packages/save/src/index.ts` — T014 green
- [X] T016 Implement the v2 → v3 migration and the new envelope/coherence checks in `packages/save/src/migrate.ts` (contracts/save-format-v3.md) and update `packages/save/test/create.test.ts`, `summary.test.ts`, `migrate.test.ts` and `fixtures.ts` (`validSave()` now builds v3) — T013 green, whole `pnpm vitest run packages/save` green

### App

- [X] T017 Move the app to the league: `apps/web/src/game/GameProvider.tsx` (`playRound` uses `startLeagueRound` with the manager lineup, `commitRound` uses `completeLeagueRound` and `lastRound` = records of that round in the manager's division, `isSeasonOver` → `isLeagueSeasonOver`, `commitLineup` updates `formations` of `userSeason` inside `league.divisions`, `lineupContext` uses `userSeason`), `apps/web/src/game/selectors.ts` (`nextFixture` etc. take the manager's `Season`; `seasonYear` → `seasonYearOf`), and replace every `save.season` in `apps/web/src/app/jogo/**`, `apps/web/src/game/GameLayout.tsx`, `apps/web/src/ui/AppHeader.tsx`, `apps/web/src/ui/PlayerDetails.tsx`, `apps/web/src/ui/StandingsTable.tsx` with `userSeason(save)`; in the live round (`apps/web/src/app/jogo/rodada/page.tsx`, `apps/web/src/game/useLiveRound.ts`) all 20 matches keep advancing, but `LiveGrid` and `EventFeed` receive only the matches whose `divisionLevel` is the manager's
- [X] T018 Update the app test helpers (`apps/web/test/helpers/career.ts`, `saves.ts`, `live.ts`) to v3 saves and run `pnpm vitest run apps/web` — all existing flows (new career, lineup, live round, full season, saves) green with the league underneath

**Checkpoint**: carreira nova e saves antigos abrem no v3, as duas divisões jogam toda rodada e
a experiência da 006 continua igual para o clube do jogador

---

## Phase 3: User Story 1 - Duas divisões disputadas em paralelo (Priority: P1) 🎯 MVP

**Goal**: o jogador acompanha as duas divisões: vê ao vivo a sua, consulta resultados,
classificação (com zonas) e artilharia de qualquer divisão

**Independent Test**: jogar uma rodada e conferir 10 + 10 jogos disputados, a classificação de
cada divisão com só os seus jogos e zonas marcadas, e resultados da outra divisão iguais aos do
"simular direto"

### Tests for User Story 1

- [X] T019 [P] [US1] Write `apps/web/test/flows/divisions.test.tsx`: after one live round (fake timers) only the 10 matches of the manager's division appear in the grid/feed; at the end the "Resultados da Série X" link opens the other division's 10 results; the same career played with "simular direto" gives identical results for both divisions; `/jogo/competicao` defaults to the manager's division, `?d=2` shows Série B, tabs and `[`/`]` switch division and update the URL; standings show 4 rows marked "Rebaixamento" in Série A and 4 "Acesso" in Série B, with text legend; artilharia and resultados honor `d`

### Implementation for User Story 1

- [X] T020 [P] [US1] Create `apps/web/src/ui/DivisionTabs.tsx` (+ `DivisionTabs.module.css`): tabs with the division names from the bank (`competition.divisions` by level), manager's division marked (`division.mine`), selected from the `d` query param, keyboard `[`/`]` via `useShortcuts`, accessible `role="tablist"`
- [X] T021 [P] [US1] Add zone marking to `apps/web/src/ui/StandingsTable.tsx`: optional `zones: DivisionZones` prop; top `promotion` and bottom `relegation` rows get a class and a visually-hidden/visible label (`standings.zone.*`), plus the legend line
- [X] T022 [US1] Wire the division selector into `apps/web/src/ui/CompetitionTabs.tsx` and the pages `apps/web/src/app/jogo/competicao/page.tsx`, `competicao/resultados/page.tsx`, `competicao/artilharia/page.tsx`: read `d` (default `userDivisionLevel(save)`), use `divisionSeason(save.league, d)` for standings/results/scorers, pass `divisionZones(save.bank, competitionId, d)` to the table, keep `d` in the tab links
- [X] T023 [US1] Add the "Resultados da {division}" link(s) for the other divisions at the end of the live round in `apps/web/src/app/jogo/rodada/page.tsx` (to `/jogo/competicao/resultados?d=<nível>&r=<rodada>`), and make the home page `apps/web/src/app/jogo/page.tsx` show the manager's division name next to the round
- [X] T024 [US1] Run T019 green; update `ShortcutsHelp` (`apps/web/src/ui/ShortcutsHelp.tsx`) with `[`/`]`

**Checkpoint**: US1 jogável — Série A e Série B correm juntas e são acompanháveis

---

## Phase 4: User Story 2 - Virada de temporada com acesso e rebaixamento (Priority: P1)

**Goal**: depois da última rodada, avançar para a temporada seguinte com acesso/rebaixamento,
calendários novos, estatísticas zeradas, ano + 1 e histórico registrado

**Independent Test**: simular uma temporada, avançar e conferir 4 ↔ 4 trocados, 20 clubes por
divisão, classificação zerada, calendário completo, idades + 1 e histórico com os campeões

### Tests for User Story 2

- [X] T025 [P] [US2] Write `packages/engine/test/career/composition.test.ts`: on a finished league, `nextComposition` moves the last 4 of level 1 down and the top 4 of level 2 up (compared with `standings`), keeps 20/20 and a partition of the 40 clubs, sorts `clubIds` by id; a tie on the cut line is decided by the competition tiebreakers (build a season with forced records); a 3-division test world with slots 2/2 and 3/3 works; a 1-division world moves nobody; `promoted`/`relegated` per level match the moves
- [X] T026 [P] [US2] Write `packages/engine/test/career/turnover.test.ts`: `seasonTurnover` on an unfinished league → `turnover.season_not_over`; on a finished league returns a new league with `number + 1`, `year + 1`, `seed === leagueSeasonSeed(careerSeed, 2)`, both divisions at round 1 with empty `records`/`warnings`, composition = `nextComposition`, a calendar of 38 rounds with each club once per round, a different round-1 order than the previous season; `status` keeps only players with `injury > 0` with `yellows = 0`, `suspension = 0`; history gains one entry with `number`, `year`, champion = 1st of each final standings, full `HistoryRow` standings, `promoted`/`relegated`; the input league and history are not mutated; the same input twice (and after `JSON.parse(JSON.stringify(...))`) gives deep-equal output; default step ids/order = `TURNOVER_STEP_IDS`
- [X] T027 [P] [US2] Write `packages/engine/test/career/multi-season.test.ts` (acceptance criteria, Principle V): from `createLeagueSeason(testWorld(), …)`, 10 seasons with `advanceLeague(toEnd)` + `seasonTurnover`, no interaction; at the start of every season assert exactly 20 clubs per division, every competition club in exactly one division, and that the 4 relegated / 4 promoted of the previous history entry are now in the lower / upper division (SC-001, SC-002); history has 10 entries; a second run with JSON round-trip between seasons produces a deep-equal history (SC-003); limits declared as constants at the top of the test; timeout sized for the suite
- [X] T028 [P] [US2] Extend `packages/save/test/career.test.ts` (part 2): `advanceCareerSeason` on a finished career keeps `clubId`, moves the manager to the right division, sets the manager club formation in the new `Season` to `lineup.formation`, adjusts the lineup to inherited injuries (`lineupNotice` when something changed), appends one `history` entry, bumps `league.year`; on an unfinished career → error; deterministic (twice → deep-equal); the result opens with `migrateSave` (valid v3)

### Implementation for User Story 2

- [X] T029 [US2] Implement `packages/engine/src/career/composition.ts` (`nextComposition`, generic over adjacent levels using `promotionSlots`/`relegationSlots` from the bank and final `standings`) — T025 green
- [X] T030 [US2] Implement `packages/engine/src/career/history.ts` (history entry from final standings + promoted/relegated, `HistoryRow` subset of `StandingRow`)
- [X] T031 [US2] Implement `packages/engine/src/career/turnover.ts` with the five default steps (`record-history`, `promotion-relegation`, `advance-year`, `reset-season-stats`, `generate-calendars`), `DEFAULT_TURNOVER_STEPS`, `TURNOVER_STEP_IDS`, a per-step `rng(stepId)` = `createRng(`${careerSeed}:turnover:${number}:${stepId}`)`, final invariant check (`turnover.invalid_result`) and `seasonTurnover` running the default order (extras come in US6); export from `packages/engine/src/index.ts` — T026 and T027 green
- [X] T032 [US2] Implement `advanceCareerSeason(save, now)` in `packages/save/src/career.ts` (seasonTurnover + manager formation + lineup adjust like `withAdjustedLineup` + `history`), export it — T028 green
- [X] T033 [US2] Add `advanceToNextSeason()` to `apps/web/src/game/GameProvider.tsx`: calls `advanceCareerSeason`, dispatches the new save, a single `persist` (atomic), returns `"done" | "error"`; while running exposes a `turningOver` flag
- [X] T034 [US2] Use the season date for ages: `apps/web/src/app/jogo/elenco/page.tsx` and `apps/web/src/ui/PlayerDetails.tsx` call `ageOn(birthDate, currentDate(save))`; `apps/web/src/ui/AppHeader.tsx` and `apps/web/src/app/carreiras/page.tsx` show `league.year` and the division name
- [X] T035 [US2] Write `apps/web/test/flows/seasons.test.tsx` (part 1): simulate a whole season directly, trigger `advanceToNextSeason` (from the season end screen button, T037), and assert home shows year + 1 and round 1, standings zeroed, the manager club in the division resulting from its final position, ages in the squad + 1, reload keeps the new season (single save), and reopening a save stored between the last round and the turnover yields the same new season

**Checkpoint**: a carreira continua indefinidamente; os dois critérios de aceite do prompt verdes

---

## Phase 5: User Story 3 - Resumo de fim de temporada (Priority: P2)

**Goal**: ao terminar a última rodada, ver campeões, quem sobe e desce e a situação do clube, e
avançar dali

**Independent Test**: simular até o fim e conferir o resumo (campeões = 1º de cada
classificação, 4 sobem, 4 descem, posição do clube) e o botão "Próxima temporada"

- [X] T036 [P] [US3] Add `seasonEndSummary(save)` to `apps/web/src/game/selectors.ts`: champions per division, promoted/relegated with final positions (from `nextComposition`), manager club final position/division and its situation (`champion | promoted | relegated | stayed`) — no rule duplicated (reads engine functions)
- [X] T037 [US3] Rewrite `apps/web/src/app/jogo/fim-de-temporada/page.tsx` (+ css) with `apps/web/src/ui/SeasonSummary.tsx`: title with year, highlighted manager situation message (`seasonEnd.mine.*`), champion of each division with crest, "Sobem para a …" / "Descem para a …" lists, links to each division's final standings and to the history, main button "Próxima temporada" (shortcut `N`, disabled with `seasonEnd.preparing` while `turningOver`) calling `advanceToNextSeason` and navigating to `/jogo`
- [X] T038 [US3] Make the end of the 38th round (live: final button; direct: automatic redirect, as in 006) lead to the summary, and the home `apps/web/src/app/jogo/page.tsx` show "Ver resumo da temporada" + "Próxima temporada" when the league is over
- [X] T039 [US3] Extend `apps/web/test/flows/seasons.test.tsx` (part 2): summary champions equal standings leaders of both divisions, 4 + 4 movers listed, manager message matches the case (force a career whose club gets relegated and one that gets promoted via seed/club choice), `N` triggers the turnover

**Checkpoint**: a virada é visível e explicada ao jogador

---

## Phase 6: User Story 4 - Começar em qualquer clube das duas divisões (Priority: P2)

**Goal**: escolher o clube inicial entre os 40, com a divisão visível

**Independent Test**: criar uma carreira com clube da Série B e ver a rodada ao vivo da Série B

- [X] T040 [P] [US4] Replace `leagueClubs` with `competitionClubs(bank)` in `apps/web/src/game/selectors.ts` (all clubs of the first competition with `divisionLevel` and division name; same fields as today)
- [X] T041 [US4] Update `apps/web/src/app/nova-carreira/page.tsx` (+ css): division filter (default level 1, option for all), division label on each club, keyboard-operable; create the career with any club
- [X] T042 [US4] Extend `apps/web/test/flows/new-career.test.tsx`: the 40 clubs are reachable through the filter, a Série B club creates a career whose home/standings/calendar/live round are Série B

**Checkpoint**: subir com um time pequeno é possível desde o início

---

## Phase 7: User Story 6 - Pontos de extensão da virada (Priority: P2)

**Goal**: sistemas futuros registram etapas na virada em posição definida sem tocar no código
da virada

**Independent Test**: registrar duas etapas extras em teste e conferir ordem, contexto recebido e
determinismo

- [X] T043 [US6] Write `packages/engine/test/career/turnover-steps.test.ts`: `resolveTurnoverSteps()` = defaults in order; an extra `{ after: "record-history" }` runs right after it and sees the new history entry; `{ before: "generate-calendars" }` that edits `next.carryOver` (e.g. marks a player injured) has that change in the new league's `status`; two extras on the same anchor/direction run in `id` order regardless of array order (both permutations); duplicate id or unknown anchor → `turnover.invalid_steps`; an extra breaking invariants (removes a club from `composition`) → `turnover.invalid_result`; an extra using `ctx.rng(id)` gives the same result on repeat and does not change the default steps' output
- [X] T044 [US6] Implement `resolveTurnoverSteps` and `extraSteps` support in `packages/engine/src/career/turnover.ts` (insertion relative to anchors, ties by id), export it from `packages/engine/src/index.ts`, and document the extension contract (step ids, context fields, ordering rule) in a module doc comment — T043 green, T026/T027 still green

**Checkpoint**: finanças, evolução e jovens (próximas features do M3) têm onde se encaixar

---

## Phase 8: User Story 5 - Histórico simples (Priority: P3)

**Goal**: consultar campeões e classificações finais de cada temporada encerrada

**Independent Test**: simular 3 temporadas e conferir 3 entradas no histórico iguais aos resumos

- [X] T045 [P] [US5] Create `apps/web/src/app/jogo/historico/page.tsx` (+ css): table (year, champion of each division, manager club position/division) from `save.history`; `t=<número>` shows the final standings of both divisions (read-only `StandingsTable` with promoted/relegated marked); empty state `history.empty`; back link
- [X] T046 [US5] Add the history entry to navigation: link in `apps/web/src/game/GameLayout.tsx` and shortcut `H` (and in `ShortcutsHelp`), link from the season summary (T037); add the route to the precache list (`tools/src/precache.ts` if routes are listed there)
- [X] T047 [US5] Write `apps/web/test/flows/history.test.tsx`: after 3 simulated seasons (helper that builds the save through the save package) the history shows 3 rows matching each `SeasonHistoryEntry`; opening one shows both final standings; first season shows the empty message

**Checkpoint**: a carreira tem memória

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T048 [P] Add `--career <n>` to `tools/src/simulate-season.ts` (consecutive seasons of one career with `advanceLeague` + `seasonTurnover`; per season: champions of both divisions, promoted/relegated, 20/20 check; exit code 1 if any check fails) and a test in the tools test folder next to the existing `simulate-season` test
- [X] T049 [P] Write `apps/web/e2e/seasons.spec.ts` (Playwright): new career with a Série B club → simulate the whole season directly → summary → "Próxima temporada" (< 2 s, SC-005) → first round of the new season played live (SC-004)
- [X] T050 [P] Performance checks: engine test that one league round (20 matches) direct < 300 ms and `seasonTurnover` < 500 ms in `packages/engine/test/career/performance.test.ts`; app flow `apps/web/test/flows/performance.test.tsx` updated so "simular direto" of a league round stays < 1 s (SC-006)
- [X] T051 Run the i18n literal test (`apps/web/test/i18n/no-literals.test.ts`) and fix any new literal (SC-008); confirm division names only come from the mod
- [X] T052 Update docs: `docs/design.md` §13 (M3 progress note for 007), `apps/web/README.md` (new routes/shortcuts) and the quickstart if commands changed
- [X] T053 Run the gates `pnpm typecheck && pnpm lint && pnpm test` and walk through `specs/007-divisoes-virada-temporada/quickstart.md` manually (including opening a pre-007 save)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001–T002)**: sem dependências.
- **Foundational (T003–T018)**: depende do Setup (T001 para os códigos de erro). Dentro dela:
  T003 → T004; T005 antes de T006–T009; T006 → T008; T007 → T009 (precisa de T004 e T008);
  T010 independente; T011 depois de T008–T010; save T012–T016 depois de T011; app T017–T018
  depois de T016.
- **US1 (T019–T024)**: depende da Foundational.
- **US2 (T025–T035)**: depende da Foundational; T035 usa o botão de T037 (pode ser escrito
  chamando `advanceToNextSeason` direto e ajustado quando US3 chegar).
- **US3 (T036–T039)**: depende de US2 (T029 `nextComposition`, T033 `advanceToNextSeason`).
- **US4 (T040–T042)**: depende só da Foundational (T015 já aceita qualquer divisão).
- **US6 (T043–T044)**: depende de US2 (T031).
- **US5 (T045–T047)**: depende de US2 (histórico gravado na virada); T046 liga ao resumo de US3.
- **Polish (T048–T053)**: por último; T048 depende de T031; T049 de US3 e US4.

### User Story Dependencies

```text
Foundational ─┬─▶ US1
              ├─▶ US4
              └─▶ US2 ─┬─▶ US3 ─▶ (US5 link)
                       ├─▶ US6
                       └─▶ US5
```

### Parallel Opportunities

- Setup: T001 e T002.
- Foundational: T010 em paralelo com T003–T009; T006 e T007 (testes) juntos depois de T005.
- US1: T019, T020, T021 juntos.
- US2: T025, T026, T027, T028 (testes) juntos; depois T029 e T030 juntos.
- Depois de US2: US3, US4, US6 e US5 podem andar em paralelo (arquivos diferentes), exceto
  T046 ↔ T037.
- Polish: T048, T049, T050.

## Parallel Example: User Story 2

```text
Task: "T025 composition.test.ts"
Task: "T026 turnover.test.ts"
Task: "T027 multi-season.test.ts (critérios de aceite)"
Task: "T028 career.test.ts parte 2 (advanceCareerSeason)"
# depois:
Task: "T029 composition.ts"
Task: "T030 history.ts"
```

## Parallel Example: User Story 1

```text
Task: "T019 divisions.test.tsx"
Task: "T020 DivisionTabs.tsx"
Task: "T021 zonas no StandingsTable.tsx"
```

## Implementation Strategy

### MVP First (User Story 1 + 2)

1. Setup + Foundational (liga no motor, save v3, app migrada sem mudança visível).
2. US1: as duas divisões visíveis e acompanháveis.
3. US2: virada no motor e no save, com os critérios de aceite (10 temporadas) verdes.
4. **Parar e validar**: `multi-season.test.ts` verde e uma virada manual no navegador.

### Incremental Delivery

1. Foundational → carreira em v3 com a Série B rodando por baixo.
2. US1 → seletor de divisão, zonas, resultados da outra divisão.
3. US2 → virada de temporada (carreira contínua).
4. US3 → resumo de fim de temporada.
5. US4 → começar na Série B.
6. US6 → etapas extras na virada.
7. US5 → histórico.
8. Polish → simulação manual, E2E, desempenho, docs.

### Notes

- O motor de partida e as regras de uma divisão (`season/`) não mudam de comportamento; toda a
  coordenação entre divisões fica em `career/`.
- A Série A de uma carreira nova continua idêntica à de antes (seed da temporada 1 = seed da
  carreira), então testes e fixtures existentes servem de regressão.
- Marcar cada tarefa como `[X]` ao concluir.
