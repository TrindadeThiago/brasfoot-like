---

description: "Lista de tarefas da feature 018 — Mata-mata e copa nacional"
---

# Tasks: Mata-mata e copa nacional

**Input**: Design documents from `specs/018-mata-mata-copa-nacional/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: o motor segue o Princípio IX (testes antes, devem falhar primeiro): prorrogação, pênaltis,
sorteio, `tieState`, validação e migração. O equilíbrio tem simulação longa com limites declarados
(Princípio V, research.md R14); o save v13 tem migração e fixtures (Princípio VI). Fluxos de
interface com happy-dom + fake-indexeddb; e2e com Playwright.

**Organization**: tarefas por user story, em ordem de prioridade:

- P1: US1 (copa jogável no calendário), US2 (empate decidido, inclusive ao vivo), US3 (copa em dados e validação)
- P2: US4 (sorteio, cabeças de chave, entradas e mando), US5 (prêmios, bilheteria e drama), US6 (telas e histórico)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 … US6 (spec.md)
- Caminhos relativos à raiz do repositório

## Referências rápidas

- **API do motor:** `specs/018-mata-mata-copa-nacional/contracts/knockout-api.md`
- **Save, mod e telas:** `specs/018-mata-mata-copa-nacional/contracts/save-and-ui.md`
- **Decisões R1–R16:** `specs/018-mata-mata-copa-nacional/research.md`; **tipos:** `data-model.md`
- **Já existentes (017 e anteriores):**
  - partida: `startMatch`/`advanceMatch`/`simulateMatch` (`packages/engine/src/match/engine.ts`),
    `playMinute` (`match/minute.ts`), `minuteRng`/`ClockKey` (`match/rng.ts`), `matchResult`
    (`match/result.ts`), `MatchInput.neutral` e `substitutionLimit` (`match/types.ts`)
  - temporada: `createSeason`/`Season`/`Round`/`Fixture`/`MatchRecord` (`season/`), `startRound`/
    `completeRound`/`matchTicks`/`LiveRound` (`season/live-round.ts`), `prepareFixture`
    (`season/fixture.ts`), `toMatchRecord` (`season/record.ts`)
  - carreira: dia de jogos (`career/day.ts`: `startCareerDay`/`completeCareerDay`/`afterExtraMatches`),
    `createCareerSeason`/`clubFixtures`/`roundMatches`/`DayMatch` (`career/season-state.ts`),
    `syncInjuries` (`career/injuries.ts`), `seasonTurnover` (`career/turnover.ts`), `competitionEntry`
    (`career/history.ts`), calendário (`calendar/season-calendar.ts`: `calendarCompetitions`,
    `buildSeasonCalendar`)
  - sistemas: `applyExtraGates` (`finance/round.ts`), `fansAfterExtraMatches` (`fans/mood.ts`),
    `boardAfterExtraMatches` (`board/round.ts`), `newsAfterExtraMatches` (`news/round.ts`), metas
    (`board/goals.ts`), categoria `prize` do livro-caixa (`finance/types.ts`)
  - dados/validação: `competitionSchema`/`leagueFormatSchema` (`model/schemas.ts`),
    `RESERVED_FORMAT_TYPES` (`model/catalogs.ts`), tratamento do formato reservado
    (`validation/structural.ts`), `ISSUE_PARAMS`/`makeIssue` (`validation/issues.ts`),
    `checkCalendar` (`validation/semantic/calendar.ts`), casos de regra (`test/validation/cases.ts`)
  - banco padrão: `generateDefaultBank` (`worldgen/generate.ts`), `pnpm gen:default-bank`,
    `mods/default/`, `gen-example-mod` (`tools/src`)
  - web: `GameProvider`, `useLiveRound`, `CompetitionSelect`, `useDivision` (`apps/web/src/game/`),
    páginas `app/jogo/**`
- **Helpers de teste:** `packages/engine/test/helpers/{build-bank,seeds}.ts`,
  `test/fixtures/two-competitions.ts`, `test/career/day-helpers.ts` (`newState`, `MANAGER`),
  `test/validation/cases.ts`; save: `packages/save/test/fixtures.ts` (`saveV11`, `playDay`);
  web: `apps/web/test/helpers/{app.tsx,career.ts,saves.ts,live.ts}`
- **Lembretes:**
  - sem `Date`, `**`, `Math.pow` ou funções transcendentais no motor; aritmética inteira onde
    possível; clones por JSON;
  - cada chave nova de `ui.json` só entra junto com o código que a usa (o teste de i18n recusa chave
    sem uso); cada código de validação novo entra junto com seu caso em `test/validation/cases.ts` e
    sua mensagem em `errors.json` e em `docs/mod-format.md`;
  - antes de commitar, desfazer `apps/web/next-env.d.ts` e apagar `apps/web/AGENTS.md` se aparecerem.

---

## Phase 1: Setup

- [X] T001 Freeze the 90-minute behavior BEFORE touching the match engine: write `packages/engine/test/match/baseline.test.ts` that simulates 200 matches (seeds `base-0`…`base-199`, teams from `test/helpers/build-bank.ts` and the default `testWorld()` squads, auto lineups) with today's `simulateMatch` and compares final score, event count and a hash of the event list against `packages/engine/test/match/__fixtures__/baseline.json`, recorded now (env `UPDATE_BASELINE=1` writes it; otherwise it must exist). It must keep passing unchanged through the whole feature (spec: os 90 minutos não mudam)
- [X] T002 [P] Add `saveV12(step)` to `packages/save/test/fixtures.ts`, following `saveV11` (the current save played to the step with the v13 field stripped and `formatVersion: 12`); it only becomes usable once the v13 field exists (T024), so write it now and use it in T018

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tipos, motor de partida com prorrogação e pênaltis, formato `knockout` no schema, banco de teste de copa

**⚠️ CRITICAL**: nenhuma história começa antes desta fase

### Tests (write first, must fail)

- [X] T003 [P] Write `packages/engine/test/match/shootout.test.ts` for `match/shootout.ts` (R9): `shootoutOrder` (players on the field at the end, sent-off excluded, sorted by attacking aptitude then id, goalkeeper last, order repeats when short); `penaltyChance` (between 0.55 and 0.90, rises with kicker − keeper); a full shootout from fixed seeds always ends with a winner; early decision when one side can no longer catch up within 5 kicks; sudden death after 5 each; same seed ⇒ same kicks; the 40-kicks safety cap resolves by seeded draw
- [X] T004 [P] Write `packages/engine/test/match/extra-time.test.ts` (R8):
  - without `decider` the result equals the baseline (spot-check 20 seeds);
  - a drawn aggregate with `extraTime: true` plays 30 extra minutes (clock halves 3 and 4, minutes 91–120, no stoppage) and ends `finished` with `decision.by` `"extra-time"` when one side leads, else goes to penalties;
  - `awayGoals: true` decides by away goals before extra time;
  - `extraTime: false` goes straight to penalties;
  - an aggregate already decided after 90 plays no extra time;
  - one extra substitution is allowed from the extra time;
  - `advanceMatch` step by step equals `toEnd`, including penalty kicks as steps;
  - `matchTicks` counts the extra minutes and the kicks;
  - 200 seeded drawn matches always finish with exactly one winner

### Implementation

- [X] T005 Extend the match types in `packages/engine/src/match/types.ts` per data-model.md: `MatchClock.half` `1|2|3|4`; `MatchStatus` + `extra_first_half`, `extra_half_time`, `extra_second_half`, `penalties`; events `extra_time_start`, `extra_half_time`, `extra_time_end`, `shootout_start`, `shootout_kick`, `shootout_end`; `ShootoutKick`; `MatchState.shootout?` and `extraSubstitutions`; `Decider`; `MatchInput.decider?`; `MatchResult.decision?`; widen `ClockKey` in `match/rng.ts` so halves 3 and 4 get their own PRNG keys without changing halves 1 and 2
- [X] T006 Implement `packages/engine/src/match/shootout.ts` (R9) and `SHOOTOUT_TUNING` in `packages/engine/src/match/tuning.ts`: `shootoutOrder`, `penaltyChance`, `nextKick(state)` (PRNG fork `${seed}:shootout:${order}`), early-decision rule, sudden death, safety cap; export from `packages/engine/src/index.ts`
- [X] T007 Implement the extension in `packages/engine/src/match/engine.ts` (+ `minute.ts`, `result.ts`, `validate-input.ts`): after `full_time` with a `decider`, evaluate the aggregate (`before + score`, then away goals if enabled), start extra time (`extra_first_half` → `extra_half_time` → `extra_second_half`, minutes 91–105 and 106–120, no stoppage, +1 substitution), re-evaluate, then `penalties` (one kick per step), finishing with `decision { by, winner, extraTimeScore?, shootout? }`; `matchResult` carries `decision`; `validateMatchInput` rejects a malformed `decider`. With no `decider` the code path is untouched
- [X] T008 Carry the decision through the season: `decision?` and `shootout` in `MatchRecord` and `toMatchRecord` (`packages/engine/src/season/{types,record}.ts`), `matchTicks` counting the extra steps and kicks in `packages/engine/src/season/live-round.ts`, optional `Fixture.tie` and `Season.bracket?` in `packages/engine/src/season/types.ts`; `prepareFixture` (`season/fixture.ts`) accepts an optional `decider` and sets `MatchInput.decider` and `MatchInput.neutral` from the fixture
- [X] T009 Run T001, T003 and T004 plus `pnpm vitest run packages/engine/test/match` and fix until green (the baseline must be untouched)
- [X] T010 Model and schema (R2) in `packages/engine/src/model/{schemas,types,catalogs}.ts`: `format` becomes a union by `type` (`league` keeps its fields; `knockout` has `phases[]` and `entries?[]` with the field limits of data-model.md); `FORMAT_TYPES = ["league", "knockout"]`; `RESERVED_FORMAT_TYPES = ["groups"]`; adjust `packages/engine/src/validation/structural.ts` and the existing `format.unsupported` rule case in `packages/engine/test/validation/cases.ts` to use `groups`; fix every `competition.format.rounds/points/tiebreakers` read to narrow on `type === "league"` (compile errors guide the list, e.g. `season/season.ts`, `career/league.ts`, `finance/*`, `season/standings.ts`)
- [X] T011 [P] Create `packages/engine/src/knockout/types.ts` (`Bracket`, `BracketPhase`, `Tie`, `TieState`, `KnockoutPhase`) and `packages/engine/src/knockout/rules.ts` (`DEFAULT_KNOCKOUT`, `knockoutFormat(world, competitionId)`, helpers `phaseLegs`, `totalLegs`, `isLastLeg`); export from the engine index
- [X] T012 [P] Create the cup test bank `packages/engine/test/fixtures/cup-bank.ts` on top of `testWorld()`:
  - `cupBank(edit?)`: adds `copa-teste` with 16 participants (first 8 clubs of each division by id), phases oitavas / quartas (single leg, `tiebreakers: ["extra-time","penalties"]`, `home: "ranking"`), semifinal (two legs, `["extra-time","penalties"]`, `home: "draw"`) and final (single leg, neutral), `schedule { weekday: 3, startWeek: 1, everyWeeks: 2 }`, prizes;
  - `cupPackage(edit?)` as a `ModPackage` for validation;
  - `lateEntryCup`: 12 participants with 4 entering at phase 1;
  - invalid edits: `oddPhase`, `entryOutOfRange`, `noDecider`, `neutralTwoLegs`, `twoDivisions`, `entryDuplicate`, `entryNotParticipant`

**Checkpoint**: partida com prorrogação e pênaltis, schema da copa e banco de teste prontos; `pnpm test` verde (inclusive T001)

---

## Phase 3: User Story 1 - Copa nacional junto com o campeonato (Priority: P1) 🎯 MVP

**Goal**: a copa do banco entra no calendário, é sorteada fase a fase, jogada ao vivo ou direto e termina com um campeão registrado; carreira nova no banco padrão tem a copa

**Independent Test**: carreira no banco de teste de copa (e, no fim, no banco padrão) joga a temporada inteira; liga e copa no mesmo calendário, sem conflito, e a copa termina com campeão no histórico; mesma seed ⇒ mesmo resultado

### Tests (write first, must fail)

- [X] T013 [P] [US1] Write `packages/engine/test/knockout/draw.test.ts`: `drawPhase` pairs all participants exactly once, is deterministic by seed and independent of input order, supports `home: "draw"`, and alternates the home side on the second leg
- [X] T014 [P] [US1] Write `packages/engine/test/knockout/bracket.test.ts`: `createCupSeason` builds one `Season` with one empty round per leg (7 for the test bank: 1+1+2+1+... per cupBank), `bracket.phases` undrawn; `ensurePhaseDrawn(season, world, 0)` fills ties and the fixtures of the phase's rounds, is idempotent, refuses to draw phase `p` before `p − 1` is decided; `phaseParticipants` combines winners and entries (late entry bank)
- [X] T015 [P] [US1] Write `packages/engine/test/knockout/tie.test.ts`: `tieState` for single-leg ties (winner from the record), `phaseWinners`, `cupChampion`/runner-up, `cupReached`, and `deciderFor` (only the last leg gets a `decider`; first leg none)
- [X] T016 [P] [US1] Extend `packages/engine/test/calendar/season-calendar.test.ts`: `calendarCompetitions` gives the cup `rounds = Σ legs`, participants as `clubIds`, honors `gapWeeks`; `buildSeasonCalendar` on the cup bank has no double-booking and reports overflow when the cup does not fit
- [X] T017 [P] [US1] Write `packages/engine/test/career/cup-day.test.ts`: a two-competition state (league + cup) plays the season day by day: phases drawn on their first date, each club plays at most once per day, a club eliminated no longer appears in later fixtures, the season ends with one champion, same seed ⇒ same state (also through a JSON round trip mid-cup), `clubFixtures` lists only drawn cup fixtures, `nextClubFixture` skips undrawn phases
- [X] T018 [P] [US1] Write `packages/save/test/migrate-v13.test.ts` (uses `saveV12` of T002): v12 saves at start, mid and end of season and after 3 seasons migrate to v13 with `cupHistory: []`, everything else deep-equal, and keep playing to the turnover; a v13 save without `cupHistory` is `corrupt`; a save with a cup in progress (undrawn phases with empty `fixtures`) passes the integrity check

### Implementation

- [X] T019 [US1] Implement `packages/engine/src/knockout/draw.ts` (`drawPhase`, base version: shuffle by the PRNG fork `${seed}:cup:${competitionId}:draw:${phase}`, pair, home by draw; second leg inverted) and `packages/engine/src/knockout/bracket.ts` (`createCupSeason`, `ensurePhaseDrawn`, `phaseParticipants`) per research.md R4–R6; register `knockout` handling in `createSeason` callers (`career/season-state.ts` `createCareerSeason` builds the cup `Season` for `format.type === "knockout"`, seed `${careerSeed}:${competitionId}`)
- [X] T020 [US1] Implement `packages/engine/src/knockout/tie.ts`: `tieState`, `phaseWinners`, `cupChampion`, `cupReached`, `deciderFor(season, fixture)` (agregado dos jogos anteriores do confronto + critérios da fase), single-leg and two-leg aggregate, per research.md R5; export the knockout API from the engine index
- [X] T021 [US1] Calendar: `calendarCompetitions` (`packages/engine/src/calendar/season-calendar.ts`) understands `knockout` (`rounds = Σ legs`, participants, `gapWeeks`); `roundDates` honors `gapWeeks` before the phase flagged in `data-model.md` (`packages/engine/src/calendar/schedule.ts`); `theoreticalRounds` unchanged for leagues
- [X] T022 [US1] Day of games in `packages/engine/src/career/day.ts` (+ `season/live-round.ts`, `season/fixture.ts`): for a cup slot call `ensurePhaseDrawn` before `startLeagueRound`, pass `deciderFor` to `prepareFixture` so the last leg of each tie plays with the `decider`, and keep everything else (injury sync, fitness, `roundMatches`, `afterExtraMatches`) as for any secondary competition; `clubFixtures`/`nextClubFixture` (`career/season-state.ts`) ignore rounds whose `fixtures` are empty
- [X] T023 [US1] Turnover in `packages/engine/src/career/turnover.ts` and `career/history.ts`: for finished cups produce a `CupHistoryEntry` (`knockout/history.ts`: champion, runner-up, final, `reached`) instead of a league `SeasonHistoryEntry`, and `createCareerSeason` (used by `generate-calendars`) creates the new edition with a new draw seed; results carry `cupHistory`; skip `nextComposition` for cups
- [X] T024 [US1] Save v13: `SAVE_FORMAT_VERSION = 13` and `cupHistory` in `packages/save/src/format.ts`; `create.ts` starts with `[]`; `migrate.ts` step `v12 → v13`, envelope schema and `calendarProblem` accepting undrawn cup rounds (`fixtures: []`) and requiring drawn phases to be complete; `career.ts` (`advanceCareerSeason`) passes `competitions` finished cups and stores the returned `cupHistory`; update the chain test in `packages/save/test/migrate.test.ts` and the older migration tests (`formatVersion` expectations and stripped fields) as was done for v12
- [X] T025 [US1] Default bank with the cup (R14): `generateDefaultBank({ cup: true })` in `packages/engine/src/worldgen/generate.ts` adds `copa-nacional` (16 lowest-reputation Série B clubs in phase 0; `entries: [{ phase: 1, clubIds: [other 4 Série B + 20 Série A] }]`; phases per research.md R14; prizes; schedule Wednesday every 2 weeks from week 1, final `gapWeeks: 1`), the cup name from a new optional `names.cupName` in `packages/engine/src/worldgen/name-banks/*.json` (default bank and `exemplo`); default stays `cup: false`; `tools/src/gen-default-bank.ts` passes `cup: true`; regenerate `mods/default/` with `pnpm gen:default-bank` and check `packages/modkit` fixtures/tests
- [X] T026 [US1] Keep the league equivalence: change `packages/save/test/equivalence.test.ts` to build the default bank WITHOUT the cup (filter `copa-nacional` out of `competitions.json` before `createSave`) so the pre-017 baseline `equivalence-baseline.json` still passes unchanged (SC-007); add `defaultBankWithCup()` helper in `packages/save/test/fixtures.ts` for the new tests and make `defaultBank()` default to the bank without the cup for older save tests
- [X] T027 [US1] Web basics so a cup never breaks a screen: `apps/web/src/game/useDivision.ts` and `apps/web/src/app/jogo/competicao/{page,resultados/page,artilharia/page}.tsx` render the **Chaveamento** (`apps/web/src/ui/cup/Bracket.tsx`: phases as columns, ties with score and winner, undrawn phases as "a definir") when the selected competition is a cup, and hide the division tabs; `CompetitionSelect` lists the cup; `apps/web/src/app/jogo/calendario/page.tsx` and the Início show cup fixtures (competition name already from 017); add the `cup.*` keys used (phase column, "a definir", bracket captions)
- [X] T028 [US1] Fix the tests that assumed a single competition in the default mod (run `pnpm vitest run` and `pnpm test:e2e` and update): calendar row counts, competition tabs expectations, Início next-match texts, fans/divisions/seasons flows in `apps/web/test/**` and `apps/web/e2e/**`, `packages/save/test/**`, `tools/test/**`; no weakening of assertions, only the new numbers/expectations (the default bank now has two competitions)
- [X] T029 [US1] Flow test `apps/web/test/flows/cup.test.tsx` (US1 part): with `defaultBankWithCup()` the Início offers league and cup games alternately, the cup tab shows the bracket updated after a cup day, and an eliminated club stops appearing in the calendar's cup rows

**Checkpoint**: copa jogável de ponta a ponta no banco padrão e no banco de teste (critério de aceite 2)

---

## Phase 4: User Story 2 - Empate decidido na prorrogação ou nos pênaltis, inclusive ao vivo (Priority: P1)

**Goal**: ida e volta e jogo único terminam sempre com um classificado, pelos critérios da fase; a rodada ao vivo mostra a prorrogação e as cobranças

**Independent Test**: confrontos empatados (jogo único e ida e volta) terminam com classificado e a forma de decisão registrada; ao vivo = direto; a tela mostra cada cobrança

### Tests (write first, must fail)

- [X] T030 [P] [US2] Extend `packages/engine/test/knockout/tie.test.ts`: two-leg ties decided by aggregate (no extra time when decided), by away goals (flag on), by extra time after the second leg, by penalties after the second leg; the first leg never plays extra time; `decidedBy` is recorded; 300 seeded ties (single and two legs) all end with exactly one winner
- [X] T031 [P] [US2] Write `packages/engine/test/career/cup-live.test.ts`: a cup day started with `startCareerDay` and played tick by tick (including extra-time minutes and shootout kicks) to the end equals `completeCareerDay` direct with the same state, for a tie that goes to penalties (find a seed by search in the test); the live round's `matchTicks` exceeds 98 for matches that go to extra time
- [X] T032 [P] [US2] Web test `apps/web/test/flows/cup.test.tsx` (US2 part): a live cup match that goes to penalties shows the "prorrogação" notice, a shootout panel listing every kick (kicker name, scored/saved/post/off), the series score separate from the match score, and the final result equals the direct simulation; pause/substitution works during extra time

### Implementation

- [X] T033 [US2] Complete the tie criteria in `packages/engine/src/knockout/tie.ts` and `deciderFor`: honor `tiebreakers` order per phase, away-goals bookkeeping across legs, `before` aggregate for the last leg, no `decider` on first legs; `TieState.decidedBy` from the record's `decision`
- [X] T034 [P] [US2] Live-round hook: `apps/web/src/game/useLiveRound.ts` accepts matches beyond minute 90 (extra time) and shootout steps, keeps auto-pause on red card/injury, and exposes the shootout state; `apps/web/src/ui/event-text.ts` and the feed render the new events (`extra_time_start`, `extra_half_time`, `extra_time_end`, `shootout_start`, `shootout_kick`, `shootout_end`); add the `live.*` / `event.*` keys used
- [X] T035 [US2] Create `apps/web/src/ui/cup/ShootoutPanel.tsx` (+ css): list of kicks in order with club crest, kicker, outcome icon + text (accessible), running series score, "decidido nos pênaltis" result; show it in `apps/web/src/app/jogo/rodada/page.tsx` and `apps/web/src/ui/LiveGrid.tsx`/`MatchSummary.tsx` (clock up to 120', extra-time banner, separate 90/120 score and shootout score); `RoundResults.tsx` shows "(p) 4 × 3" style results from `record.decision`
- [X] T036 [US2] Match summary after the game (`apps/web/src/ui/MatchSummary.tsx`) lists the extra-time goals and the shootout kicks from the record; i18n keys for the decision forms (`cup.decision.aggregate|away-goals|extra-time|penalties`)

**Checkpoint**: todo confronto termina com um classificado; pênaltis ao vivo visíveis (critério de aceite 3)

---

## Phase 5: User Story 3 - Copa descrita só com dados e validada (Priority: P1)

**Goal**: o modder descreve a copa em dados; o banco inválido é recusado com mensagem clara; o formato está documentado

**Independent Test**: bancos de copa válidos carregam e jogam; cada variante inválida é recusada apontando fase e campo

### Tests (write first, must fail)

- [X] T037 [P] [US3] Add the seven `knockout.*` rule cases to `packages/engine/test/validation/cases.ts` (`knockout.phase_count`, `knockout.entry_phase`, `knockout.entry_duplicate`, `knockout.entry_not_participant`, `knockout.no_decider`, `knockout.neutral_two_legs`, `knockout.single_division`) with their exact section/path/params, and write `packages/engine/test/validation/knockout.test.ts`: the cup bank is valid; each variant of T012 yields its code with phase and field; `phase_count` says how many clubs are missing/extra; a cup that overflows the season or double-books a club reuses `calendar.*`; the default bank with the cup and `mods/exemplo` stay valid; out-of-range phase fields fail the schema with file and field

### Implementation

- [X] T038 [US3] Register the seven codes in `packages/engine/src/validation/issues.ts` (`ISSUE_PARAMS`) together with their pt-BR messages in `packages/i18n/locales/pt-BR/errors.json`, implement `packages/engine/src/validation/semantic/knockout.ts` (participants per phase, entries, deciders, neutrality, single division), wire it in `validation/validate.ts`, and make `checkCalendar` (`validation/semantic/calendar.ts`) count the cup's rounds as `Σ legs`
- [X] T039 [US3] Document the format in `docs/mod-format.md` (copy to `apps/web/public/docs/mod-format.md`): `format.type: "knockout"`, `phases[]` and `entries[]` field tables with defaults, the club-count rule per phase, home rules, neutral phases, prizes, the schedule/`gapWeeks`, an 8-club example, the seven new error rows (the `modkit` docs test requires every code and field name), and the change to `format.unsupported` (only `groups`)
- [X] T040 [US3] Example mod with a small cup: `tools/src/gen-example-mod.ts` adds a cup to Norvália via `generateDefaultBank({ cup: true, ... })` (12 clubs per division in the example, so adapt the phase sizes to a valid bracket: 8-club first phase etc.), regenerate with `pnpm gen:example-mod`, and keep `packages/modkit` and mods e2e green

**Checkpoint**: copa em dados validada e documentada

---

## Phase 6: User Story 4 - Sorteio, cabeças de chave, entradas e mando (Priority: P2)

**Goal**: sorteio com cabeças de chave opcionais, entradas tardias e mando por regra (sorteio, ranking, divisão) e campo neutro

**Independent Test**: mesma seed ⇒ mesmo chaveamento; cabeças de chave não se cruzam; entradas só na fase prevista; mandante conforme a regra; final neutra

### Tests (write first, must fail)

- [X] T041 [P] [US4] Extend `packages/engine/test/knockout/draw.test.ts`: `seeded` phases (top-reputation clubs never meet while slots exist; relaxes in data order when there are more seeds than slots instead of failing), `home: "ranking"` (higher reputation hosts, tie by id), `home: "division"` (lower division hosts; same division ⇒ seeded draw), two-leg ties invert the home on the return, `neutral` phases mark the fixture neutral; late-entry clubs appear only from their phase (bank `lateEntryCup`); 100 seeds are all deterministic

### Implementation

- [X] T042 [US4] Implement seeding, home rules and neutrality in `packages/engine/src/knockout/draw.ts` (R6, R7), reading divisions from the principal competition for `division`, and mark `Fixture.neutral`/capacity for neutral phases; `prepareFixture` sets `MatchInput.neutral` from it
- [X] T043 [US4] Entries: `phaseParticipants` and `createCupSeason` honor `entries`; the calendar clubs of the cup cover all participants; add the entry phase to `clubFixtures` filtering so a club only sees fixtures of drawn phases it plays

**Checkpoint**: sorteio e mando por regra, determinísticos

---

## Phase 7: User Story 5 - Prêmios, bilheteria e integração com o drama (Priority: P2)

**Goal**: prêmios por fase, renda dos jogos (neutra dividida), manchetes, torcida, meta de copa e histórico do técnico

**Independent Test**: uma copa jogada paga prêmios e bilheterias no caixa, gera manchetes de zebra/eliminação/título, mexe com a torcida e a diretoria e registra a campanha

### Tests (write first, must fail)

- [X] T044 [P] [US5] Write `packages/engine/test/knockout/prizes.test.ts` and extend `packages/engine/test/finance/day.test.ts`: `cupPrizes` pays each tie's winner the phase prize once, the champion gets the final's; the ledger shows `prize` entries with `competitionId` and `date`; a home cup match posts a gate; a neutral final posts half of the gate to each club, using `neutralCapacity`; league-only days post no prizes
- [X] T045 [P] [US5] Extend `packages/engine/test/career/extra-matches.test.ts`: cup eliminations lower the fans' mood more in later phases, the title raises it (`cupOut`, `cupTitle` factors); the board's confidence reacts and a cup goal is evaluated at the end of the cup (`cupGoal`), without firing on its own; a manager with no cup goal is unaffected; headlines `cupUpset` (lower-division club beats a higher-division one), `cupElimination`, `cupFinal`, `cupChampion` for the player's club
- [X] T046 [P] [US5] Write `packages/engine/test/knockout/history.test.ts` and extend the manager history test (`packages/engine/test/board/history.test.ts`): `CupHistoryEntry` contents (champion, runner-up, final score and decision, `reached` per club); the manager's stint/season record stores the cup phase reached and the title

### Implementation

- [X] T047 [US5] Implement `packages/engine/src/knockout/prizes.ts` and use it in the day: after a cup round closes, post the prizes through the ledger (`prize` category, `competitionId`, `date`) in `career/day.ts` (`afterExtraMatches`); neutral gate split and `neutralCapacity` in `applyExtraGates` (`packages/engine/src/finance/round.ts`); keep league-day finances untouched
- [X] T048 [US5] Fans and board: new `cupOut`/`cupTitle` factors and rules `fans.cup` (`packages/engine/src/fans/{types,rules,mood}.ts`, schema `fansSchema` in `model/schemas.ts`), `cupGoal` factor, `board.cup` rules and an optional per-club cup goal derived from reputation (`packages/engine/src/board/{types,rules,goals,confidence,round,evaluation}.ts`, schema `boardSchema`), evaluated when the cup ends; add the matching `fans.factor.*`/`board.factor.*` keys in `ui.json`
- [X] T049 [US5] News: facts and `HeadlineType`s `cupUpset`, `cupElimination`, `cupFinal`, `cupChampion` (`packages/engine/src/news/{types,facts,round,rules,variants}.ts`) built from the bracket and the day's cup records inside `newsAfterExtraMatches`; templates with variations in `packages/i18n/locales/pt-BR/ui.json` (`news.cupUpset.N` …) and `apps/web/src/ui/news/Headline.tsx` vars
- [X] T050 [US5] History: `CupHistoryEntry` assembly at the end of each edition (`knockout/history.ts`), campaign stored in the manager's history (`packages/engine/src/board/history.ts`, `board/types.ts`), shown in the Carreira history (`apps/web/src/ui/board/ManagerHistory.tsx`)
- [X] T051 [US5] Calibrate the default cup prizes and `DEFAULT_KNOCKOUT` so total prizes stay a small share of a club's wage bill; verify with `pnpm sim:economy --seasons 30` (cup in the bank) and record the numbers in `research.md` (R12/R14)

**Checkpoint**: a copa tem peso na economia, na torcida, na diretoria e nas manchetes

---

## Phase 8: User Story 6 - Telas da copa e histórico (Priority: P2)

**Goal**: chaveamento completo, resultados por fase, próximos confrontos, campeão e histórico de campeões

**Independent Test**: com a copa em andamento e terminada, as telas refletem o estado e o histórico lista campeão e vice por edição

### Tests (write first, must fail)

- [X] T052 [P] [US6] Extend `apps/web/test/flows/cup.test.tsx`: Resultados shows each phase's ties with score, aggregate, extra-time and penalties marks and the winner highlighted; the Início/next-match card shows the phase (and leg); the calendar has a "Fase" column for cup rows and the competition filter lists the cup; at season end the champion and runner-up appear; Histórico ▸ Copas lists champion/runner-up per season and titles per club; with no cup (old bank) none of this appears

### Implementation

- [X] T053 [US6] Results by phase: `apps/web/src/ui/cup/PhaseResults.tsx` and the cup branch of `apps/web/src/app/jogo/competicao/resultados/page.tsx` (phase picker, ties with legs, aggregate, decision text, link to the match summary); upcoming ties list ("próximos confrontos") in the bracket page
- [X] T054 [US6] Início and calendar: phase name and leg in `apps/web/src/app/jogo/page.tsx` next-match card and the "Fase" column in `apps/web/src/app/jogo/calendario/page.tsx` (cup rows only), `RoundEnd` links in `apps/web/src/app/jogo/rodada/page.tsx` pointing to the cup bracket; keys in `ui.json`
- [X] T055 [US6] End of season and history: cup champion/runner-up in `apps/web/src/ui/history/OtherCompetitions.tsx` (cup entries from `competitions` at season end), new tab **Copas** in `apps/web/src/app/jogo/historico/page.tsx` backed by `save.cupHistory` (`apps/web/src/ui/cup/CupHistory.tsx`: edition table + titles per club)

**Checkpoint**: copa acompanhável do sorteio ao campeão e depois no histórico

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T056 Long simulation (SC-001, SC-002, Princípio V): `packages/engine/test/knockout/long-run.test.ts` — 1.000 cups on the cup bank (engine only: draw + `simulateMatch` with deciders), asserting every tie ends with one winner; the 8 highest-reputation clubs are champions more often than the 8 lowest, and the 8 lowest win ≥ 1% of editions (ranges declared in the test, measured values recorded in `research.md` R14); timeout 10 min
- [X] T057 [P] Liga + copa for 10 seasons (SC-003, SC-007): `packages/engine/test/calendar/long-run.test.ts` gains a variant with the cup bank (2 seeds): no double-booked club, every edition has a champion and a `CupHistoryEntry`, goals per match and economy within the declared limits, mean pre-match fitness within the declared limit; keep the existing two-competition variant
- [X] T058 [P] Run the existing 30-season suites with the cup in the default bank (`pnpm vitest run packages/engine/test/{renewal,board,fans,market,finance}` and `pnpm sim:world --seasons 30`, `pnpm sim:economy --seasons 30`; update `tools/src/simulate-*.ts` to use `generateDefaultBank({ cup: true })` where they should include the cup) and adjust ONLY if a declared limit is justifiably revised, recording why in `research.md`
- [X] T059 [P] Performance: `packages/engine/test/knockout/performance.test.ts` — `drawPhase` for 32 clubs < 1 ms (median of 5), a cup day on the default bank < 300 ms
- [X] T060 [P] E2E `apps/web/e2e/cup.spec.ts`: new career on the default bank, play until a cup day, see the bracket, play a cup match live and (using a fixed seed that goes to penalties, found by search) watch the shootout panel list the kicks and the result; check league + cup both advance; add an a11y pass on the bracket and the shootout panel to the existing a11y spec routes
- [X] T061 [P] Docs: update `docs/design.md` §13 status line for M7 (018), `docs/mod-format.md` final pass, `README` feature list if it mentions formats; sync `specs/018-mata-mata-copa-nacional/` contracts with what was built (names, signatures, parameters)
- [X] T062 Release bump in this same PR (memory: version + release notes go with the change): root `package.json` version to `1.2.0` and a pt-BR entry in `packages/i18n/locales/pt-BR/release-notes.json` (copa nacional, prorrogação e pênaltis ao vivo, copas em mods)
- [X] T063 Run the gates and the quickstart: `pnpm typecheck && pnpm lint && pnpm test`, `pnpm sim:world --seasons 30`, `pnpm sim:economy --seasons 30`, `pnpm build:web && pnpm test:e2e`, `pnpm check-release`; confirm T001 (match baseline) and the league equivalence (T026) are still green with their original snapshots

---

## Dependencies & Execution Order

- **Setup (1)**: T001 first, before any change to the match engine.
- **Foundational (2)** comes before the user stories; inside it T003/T004 (tests) → T005 → T006/T007 → T008 → T009; T010 before T011/T012.
- **US1 (3)** needs Foundational. T019 → T020 → T021 → T022 → T023; T024 needs T023; T025 needs T019–T022 and the schema; T026–T028 after T025.
- **US2 (4)** needs US1 (cup day) and the Foundational match engine; T034/T035 can start after T022.
- **US3 (5)** needs only the schema (T010) and T012; it can run in parallel with US1/US2 after Phase 2. T039/T040 need T025 and T038.
- **US4 (6)** needs US1 (T019, T020).
- **US5 (7)** needs US1 (day) and the history of T023.
- **US6 (8)** needs US1 (bracket page) and US5 (history data).
- **Polish (9)**: T056 after Phase 2 + T019/T020; T057/T058 after US1 and US5; T060 after US2 and US6; T063 last.

### Parallel Opportunities

- T003/T004; T011/T012; T013–T018 (tests of US1); T030–T032; T034 alongside T033; T037 alongside US1/US2 after T012; T041; T044–T046; T052; T057–T061.

## Parallel Example: Foundational

```bash
Task: "match/shootout.test.ts"   Task: "match/extra-time.test.ts"
Task: "knockout/types.ts + rules.ts"   Task: "test/fixtures/cup-bank.ts"
```

## Parallel Example: User Story 1 tests

```bash
Task: "knockout/draw.test.ts"   Task: "knockout/bracket.test.ts"   Task: "knockout/tie.test.ts"
Task: "calendar/season-calendar.test.ts (cup)"   Task: "career/cup-day.test.ts"   Task: "save/test/migrate-v13.test.ts"
```

## Implementation Strategy

1. T001: congelar os 90 minutos da partida antes de tudo.
2. Fases 1–2: motor da partida (prorrogação e pênaltis), schema da copa e banco de teste. O jogo fica igual.
3. US1: copa sorteada, jogada no calendário, com campeão no histórico e no banco padrão. **Parar e validar** o critério de aceite 2.
4. US2: critérios de desempate completos e pênaltis ao vivo. **Parar e validar** o critério de aceite 3.
5. US3 (pode correr em paralelo): validação e documentação do formato.
6. US4–US6: sorteio e mando por regra, prêmios e drama, telas e histórico.
7. Polish: 1.000 copas (critério de aceite 1), liga + copa por 10 temporadas, 30 temporadas com a copa no banco padrão, desempenho, e2e, release 1.2.0.

Commits no fim, um por pacote: engine, save, i18n, web, tools/mods, docs(specs), e o bump de versão no mesmo PR.
