---

description: "Lista de tarefas da feature 003 — temporada de pontos corridos"
---

# Tasks: Temporada de pontos corridos

**Input**: Design documents from `specs/003-temporada-pontos-corridos/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Testes de motor são OBRIGATÓRIOS (Princípio IX), escritos antes da implementação e
devendo falhar primeiro. A credibilidade do campeonato é verificada em 100 temporadas
(Princípio V).

**Organization**: tarefas agrupadas por user story, em ordem de prioridade (US1 → US2 → US3 → US4).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1, US2, US3, US4
- Caminhos relativos à raiz do repositório

## Referências rápidas

- Tipos: `specs/003-temporada-pontos-corridos/data-model.md`
- API e CLI: `specs/003-temporada-pontos-corridos/contracts/season-api.md`
- Erros: `specs/003-temporada-pontos-corridos/contracts/season-errors.md`
- Decisões (R1–R11): `specs/003-temporada-pontos-corridos/research.md`
- Motor de partida (002): `simulateMatch`, `autoLineup({ squad, formation, unavailable })`,
  `MatchResult`, `FORMATION_IDS`; mundo (001): `CompletedBank`, `completeHiddenAttributes`,
  `generateDefaultBank`, `createRng`.
- Regras herdadas: sem `Math.random`/`Date`/`Math.pow` em `packages/engine/src`; aleatoriedade só
  via `createRng`/`fork`; nada de texto fora do i18n.

---

## Phase 1: Setup

- [X] T001 Add `"sim:season": "pnpm --filter @brasfoot-like/tools sim:season"` to the root `package.json` and `"sim:season": "tsx src/simulate-season.ts"` to `tools/package.json`
- [X] T002 Create folders `packages/engine/src/season/` and `packages/engine/test/season/helpers/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: nenhuma user story começa antes desta fase terminar.

- [X] T003 [P] Implement all season types from data-model.md (`SeasonOptions`, `DisciplineRules` with `DEFAULT_DISCIPLINE_RULES = { yellowsForSuspension: 3, matchesPerRed: 1 }`, `Fixture`, `Round`, `Season`, `PlayerStatus`, `MatchRecord`, `PlayerLine`, `Absence`, `SeasonWarning`, `StandingRow`, `PlayerSeasonStats`, `SeasonReport`, `SeasonStep`) in `packages/engine/src/season/types.ts`
- [X] T004 [P] Implement `SEASON_ERROR_PARAMS` (all codes of contracts/season-errors.md), `SEASON_ERROR_CODES`, `SeasonErrorCode`, `SeasonError` and `seasonError(code, params)` in `packages/engine/src/season/errors.ts`
- [X] T005 Create test helper `packages/engine/test/season/helpers/world.ts`: builds once the completed default world (`generateDefaultBank({ seed: "brasfoot-like-default-1" })` + `completeHiddenAttributes(bank, "testes-temporada")`), exposes `serieAOptions(seed)` (`competitionId` of the first competition, `divisionLevel: 1`), `newSeason(seed)` (calls `createSeason` and throws on error) and `playedSeason(seed)` (advanced to the end, memoized per seed)
- [X] T006 Export season types and errors from `packages/engine/src/index.ts`; run `pnpm typecheck && pnpm lint`

---

## Phase 3: User Story 1 - Simular uma temporada e obter a tabela (Priority: P1) 🎯 MVP

**Goal**: calendário, execução rodada a rodada com escalação automática e tabela com desempates.

**Independent Test**: Série A com seed fixa → 38 rodadas × 10 jogos, cada par duas vezes com
mandos opostos, tabela coerente; mesma seed ⇒ mesma temporada.

### Testes (escrever primeiro; devem falhar)

- [X] T007 [P] [US1] Write `packages/engine/test/season/calendar.test.ts`: for N from 4 to 40 (even and odd), turns 1–3 and 5 seeds — rounds count = turns × (N−1) (even) or turns × N (odd); every club plays at most once per round; with odd N exactly one bye per round and every club has the same number of byes per turn; every pair meets exactly once per turn; in even turns the pairings repeat the previous turn with venues swapped; per turn each club has ⌊(N−1)/2⌋ or ⌈(N−1)/2⌉ home games; no club has 3 consecutive games with the same venue inside a turn; same seed ⇒ identical calendar; two seeds ⇒ different calendars; fixture seeds follow `"<seed>:r<round>:<home>-<away>"`
- [X] T008 [P] [US1] Write `packages/engine/test/season/standings.test.ts` using a small hand-built `Season` (4 clubs) with synthetic `MatchRecord`s: points from the competition format (3/1/0 and a custom 2/1/0 format); played/W/D/L/GF/GA/GD correct; `form` holds the last 5 results with the most recent last; each tiebreaker in isolation (wins, goal-difference, goals-for, head-to-head two-club, head-to-head three-club mini-table, fewest-red-cards, draw-lots); draw-lots order is stable for the whole season and depends on the season seed; criteria are applied in the order listed in the bank
- [X] T009 [P] [US1] Write `packages/engine/test/season/determinism.test.ts`: two full seasons with the same seed are deep-equal; advancing 1 round at a time (and 5 at a time) equals `{ toEnd: true }`; a season serialized with `JSON.stringify` at round 17 continues identically; seasons 1 and 2 differ; after the last round `isSeasonOver` is true and advancing returns an equal season; full Série A season has 380 records, every club 38 matches, and table totals match the records (sum of points, goals for = goals against overall)
- [X] T010 [P] [US1] Write `packages/engine/test/season/errors.test.ts` with one case per code of contracts/season-errors.md (unknown competition, unknown division, unsupported format — via a JSON-edited world with `format.type` changed in memory, too few clubs — division edited to 1 club, invalid rules, external lineup with an unavailable player, external lineup rejected by the match engine, external lineup for a club that does not play the next round) asserting `code` and `params`; plus a coverage check over `SEASON_ERROR_CODES`
- [X] T011 [P] [US1] Write `packages/engine/test/season/lineups.test.ts`: `preferredFormation(squad)` returns a catalog formation and is deterministic; it is the formation with the highest total `strength × adequacy` among the catalog (brute-force check over `FORMATION_IDS`); every club of the default Série A gets a formation; an external lineup for one club in the next round is used in that club's match (its starters appear in the record)

### Implementação

- [X] T012 [P] [US1] Implement `generateCalendar(clubIds, turns, seed)` in `packages/engine/src/season/calendar.ts` (research.md R2: shuffle with `createRng(seed)`, circle method with phantom club for odd N, Berger venue alternation, mirrored even turns, fixture seed format R9)
- [X] T013 [P] [US1] Implement `toMatchRecord(round, home, away, result, unavailable)` in `packages/engine/src/season/record.ts`: keep goal shots, `penalty_awarded`, cards, injuries and substitutions; `PlayerLine` per participant with `side`, minutes, goals, assists, yellows, red, injury
- [X] T014 [P] [US1] Implement `preferredFormation(squad)` and `lineupForMatch(squad, formation, unavailable)` (wrapping `autoLineup` with `benchLimit` 12 and balanced posture) in `packages/engine/src/season/lineups.ts`
- [X] T015 [US1] Implement `createSeason(world, options)` (validation → `season.*` errors, normalized rules, preferred formations, calendar from `format.rounds`) and `advanceSeason(season, world, step, lineups?)` (per round: build `MatchInput` per fixture with external lineup when given — validate `season.lineup_not_playing`/`season.invalid_lineup` before simulating —, `simulateMatch`, `toMatchRecord`, append; never mutate the input), `isSeasonOver`, `unavailablePlayers` (empty list for now) in `packages/engine/src/season/season.ts` (depends on T012–T014)
- [X] T016 [US1] Implement `standings(season, world)` with grouped tiebreakers (research.md R6, draw-lots key from `createRng(\`${seed}:draw:${clubId}\`)`) in `packages/engine/src/season/standings.ts`
- [X] T017 [P] [US1] Write `packages/i18n/test/season-errors-coverage.test.ts` (same pattern as match errors) and add `formatSeasonError` cases to `packages/i18n/test/format.test.ts` using the examples of contracts/season-errors.md
- [X] T018 [US1] Write pt-BR messages in `packages/i18n/locales/pt-BR/season-errors.json`, implement `formatSeasonError` in `packages/i18n/src/format.ts` and export it from `packages/i18n/src/index.ts`
- [X] T019 [US1] Export `generateCalendar`, `createSeason`, `advanceSeason`, `isSeasonOver`, `unavailablePlayers`, `standings`, `preferredFormation` from `packages/engine/src/index.ts`; run all gates

**Checkpoint**: temporada completa com tabela, sem consequências entre rodadas.

---

## Phase 4: User Story 2 - Disciplina, lesões e estatísticas (Priority: P2)

**Goal**: suspensões e lesões entre rodadas, respeitadas na escalação; estatísticas da temporada.

**Independent Test**: em uma temporada completa, nenhum suspenso/lesionado é escalado durante o
afastamento; regras de suspensão corretas; artilharia fecha com os gols.

### Testes (escrever primeiro; devem falhar)

- [X] T020 [P] [US2] Write `packages/engine/test/season/discipline.test.ts` for `applyMatchToStatus(status, record, side, rules, rng)` with synthetic records: 3rd accumulated yellow ⇒ `suspension = 1`, `yellows = 0`; direct red ⇒ 1 match; second yellow (2 yellows + red in the same match) ⇒ 1 match and yellows not accumulated; red plus reaching the yellow limit through earlier matches only when there was no red (rule R7) and suspensions in the same match add up; injury durations within minor 1–2, moderate 3–6, severe 7–15 and deterministic for the same rng; players unavailable in that match serve one match (counters −1, entries removed when all zero); custom rules (2 yellows, 2 matches per red) respected
- [X] T021 [P] [US2] Write `packages/engine/test/season/absences.test.ts` over 5 full seasons: for every record, no player listed in `unavailable` with `fielded: false` appears in `players`; every player suspended in round r after a red card in round r−k is absent in the club's next match; injured players return after their duration; at least one suspension and one injury absence happen per season; forcing a short squad (JSON-edit `status` to make 15 players of one club injured before a round) produces a `short_squad` warning and a valid match with `fielded: true` absences
- [X] T022 [P] [US2] Write `packages/engine/test/season/stats.test.ts`: `seasonStats` goals/assists/cards/minutes/matches sum to the totals of all records; `matchesSuspended`/`matchesInjured` equal the absences in records; `topScorers` sorted by goals desc, then fewer matches, then id, and limited; `topAssists` likewise

### Implementação

- [X] T023 [P] [US2] Implement `applyMatchToStatus` in `packages/engine/src/season/discipline.ts` (research.md R7; injury duration rng = `createRng(\`${seed}:r${round}:${playerId}:injury\`)`)
- [X] T024 [US2] Integrate discipline into `packages/engine/src/season/season.ts`: before each match compute absences from `status`, pass them as `unavailable` to `lineupForMatch` (and validate external lineups against them → `season.lineup_unavailable`), record them in the `MatchRecord`, update `status` after the match for both clubs; implement `unavailablePlayers` (depends on T023)
- [X] T025 [US2] Implement the short-squad fallback of FR-020 in `packages/engine/src/season/lineups.ts` (return least-impeded players until 11 are available, mark them `fielded: true`) and append `SeasonWarning`s in `season.ts`
- [X] T026 [P] [US2] Implement `seasonStats`, `topScorers`, `topAssists` in `packages/engine/src/season/stats.ts` (derived from records)
- [X] T027 [US2] Export the new functions from `packages/engine/src/index.ts`; rerun US1 suites

**Checkpoint**: temporada com consequências entre rodadas e estatísticas.

---

## Phase 5: User Story 3 - Campeonato crível em volume (Priority: P3)

**Goal**: 100 temporadas dentro das faixas de FR-030 a FR-037.

**Independent Test**: suíte de credibilidade verde.

### Testes (escrever primeiro)

- [X] T028 [US3] Create `SEASON_CREDIBILITY_LIMITS` in `packages/engine/src/season/limits.ts` (champion in top 4 by initial strength 0,60–0,95; strongest is champion 0,25–0,70; champion points 70–90 in ≥ 0,90 of seasons; last place 15–40 in ≥ 0,90; seasons with an unbeaten club ≤ 0,10; mean Spearman ≥ 0,5 and every season > 0; goals per match 2,2–3,0 and draws 0,22–0,32 in ≥ 0,90; top scorer 14–32 goals in ≥ 0,90)
- [X] T029 [P] [US3] Write `packages/engine/test/season/credibility-unit.test.ts`: `spearman` on known vectors (perfect, inverse, ties with average ranks); `clubStrength` = mean of the 16 strongest players; `seasonReport` of one played season is consistent with its standings and stats; `aggregateCredibility` marks ✓/✗ correctly for synthetic reports at the limits
- [X] T030 [P] [US3] Write `packages/engine/test/season/credibility.test.ts`: 100 seasons (seeds `cred-1`…`cred-100`) of the default Série A, `aggregateCredibility` all ✓, failure message listing each failing criterion with value and range (SC-004)
- [X] T031 [P] [US3] Write `packages/engine/test/season/performance.test.ts`: one full season in < 2 s (SC-005)

### Implementação

- [X] T032 [US3] Implement `clubStrength`, `spearman`, `seasonReport`, `aggregateCredibility` in `packages/engine/src/season/credibility.ts` and export them with `SEASON_CREDIBILITY_LIMITS` from `packages/engine/src/index.ts`
- [X] T033 [US3] Run T030; if any criterion fails, calibrate within the season layer first (e.g. AI lineup choices) and only then `MATCH_TUNING`, keeping every 002 realism suite green; never loosen limits without recording the justification (Princípio V)
- [X] T034 [US3] Measure the time added to `pnpm test` by T030; if > 30 s, create a `long` Vitest project (root `vitest.config.ts` + `"test:long"` script) running the 100 seasons and keep a 20-season version in `pnpm test`; document the choice in `specs/003-temporada-pontos-corridos/quickstart.md`

**Checkpoint**: critério de pronto do Marco 1 verificado.

---

## Phase 6: User Story 4 - Linha de comando (Priority: P4)

**Goal**: `pnpm sim:season` com relatório de uma temporada e agregado de N temporadas.

**Independent Test**: mesma seed ⇒ mesma saída; `--seasons 100` com todos os critérios ✓.

- [X] T035 [P] [US4] Write `tools/test/simulate-season.test.ts` against an exported `runSimulateSeason({ seed, seasons })` returning `{ exitCode, lines }`: seed 42 gives the same lines twice; single season output contains a 20-row table header and 10 top scorers; `seasons: 3` prints one line per FR-030–FR-037 criterion with ✓/✗
- [X] T036 [US4] Implement `tools/src/simulate-season.ts` (`--seed` default `"temporada"`, `--seasons`; completes hidden attributes with the season seed; table columns Pos, Clube, P, J, V, E, D, GP, GC, SG; top 10 scorers with club abbreviation; totals of yellows, reds, suspensions, injuries; per-season report; aggregated report and exit code) with a guarded `main`, like `validate-bank.ts`

**Checkpoint**: Marco 1 verificável por qualquer pessoa.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T037 [P] Add a "Temporada" section to `packages/engine/README.md` (API, calendário, desempates, disciplina, como rodar `pnpm sim:season`)
- [X] T038 [P] Sync `specs/003-temporada-pontos-corridos/contracts/season-api.md`, `data-model.md` and `research.md` with anything that changed during implementation (including final credibility numbers)
- [X] T039 Run every step of `specs/003-temporada-pontos-corridos/quickstart.md` (gates, `pnpm sim:season --seed 42` twice with identical output, `pnpm sim:season --seasons 100` exit 0) and fix divergences

---

## Dependencies & Execution Order

- **Setup (1)** → **Foundational (2)** → **US1 (3)** → **US2 (4)** → **US3 (5)** → **US4 (6)** →
  **Polish (7)**.
- US2 altera `season.ts` e `lineups.ts` de US1; US3 precisa da temporada completa com disciplina;
  US4 usa o relatório de US3.
- Dentro das fases: testes primeiro; US1: T012–T014 → T015 → T016; T017 → T018. US2: T023 → T024 →
  T025. US3: T028 → T032 → T033 → T034.

### Parallel Opportunities

- Foundational: T003, T004.
- US1: testes T007–T011 e T017; implementações T012, T013, T014.
- US2: testes T020–T022; T023 e T026.
- US3: T029–T031.
- Polish: T037, T038.

## Parallel Example: User Story 1

```bash
Task: "Write calendar property tests in packages/engine/test/season/calendar.test.ts"
Task: "Write standings tests in packages/engine/test/season/standings.test.ts"
Task: "Write determinism tests in packages/engine/test/season/determinism.test.ts"
Task: "Write season errors tests in packages/engine/test/season/errors.test.ts"
Task: "Write lineups tests in packages/engine/test/season/lineups.test.ts"
```

## Parallel Example: User Story 2

```bash
Task: "Write discipline unit tests in packages/engine/test/season/discipline.test.ts"
Task: "Write absences tests in packages/engine/test/season/absences.test.ts"
Task: "Write stats tests in packages/engine/test/season/stats.test.ts"
```

## Implementation Strategy

### MVP First (User Story 1)

1. Setup + Foundational.
2. US1: temporada completa com tabela.
3. **Parar e validar**: `pnpm test`; uma temporada simulada e sua tabela.

### Incremental Delivery

1. US1 → temporada e tabela (MVP).
2. US2 → suspensões, lesões e estatísticas.
3. US3 → credibilidade em 100 temporadas (critério do Marco 1).
4. US4 → CLI.
5. Polish → Marco 1 concluído.

### Notes

- Situações raras (elenco curto) são forçadas editando um estado serializado; nunca há API pública
  para isso.
- Commit ao fim de cada tarefa ou grupo lógico (sem auto-commit dos hooks).
