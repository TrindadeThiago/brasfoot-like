---

description: "Lista de tarefas da feature 002 — motor de partida"
---

# Tasks: Motor de partida

**Input**: Design documents from `specs/002-motor-partida/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Testes de motor são OBRIGATÓRIOS (Constituição, Princípio IX), escritos antes da
implementação e devendo falhar primeiro. O motor de partida afeta o equilíbrio do mundo, então as
faixas de FR-040 a FR-049 são verificadas por simulação longa (Princípio V).

**Organization**: tarefas agrupadas por user story. **Ordem de execução das fases**: US1 → US4 →
US3 → US2. A calibragem de realismo (US2, P2) exige escalação automática (US4) e trocas automáticas
por lesão (US3); calibrar antes delas obrigaria a recalibrar depois.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1, US2, US3, US4
- Caminhos relativos à raiz do repositório

## Referências rápidas

- Tipos: `specs/002-motor-partida/data-model.md`
- API: `specs/002-motor-partida/contracts/match-api.md`
- Códigos de erro: `specs/002-motor-partida/contracts/match-errors.md`
- Modelo e decisões (R1–R10): `specs/002-motor-partida/research.md`
- Regras herdadas da 001: sem `Math.random`, `Date`, `Math.pow/log/exp/...` nem `**` em
  `packages/engine/src` (teste de arquitetura e Biome já verificam); aleatoriedade só via
  `createRng`/`fork`; nenhum texto visível fora do i18n.
- Jogadores de partida são `CompletedPlayer` (feature 001, `completeHiddenAttributes`).

---

## Phase 1: Setup

- [X] T001 Add script `"sim:matches": "pnpm --filter @brasfoot-like/tools sim:matches"` to the root `package.json` and `"sim:matches": "tsx src/simulate-matches.ts"` to `tools/package.json`
- [X] T002 Create folders `packages/engine/src/match/`, `packages/engine/test/match/helpers/` and `packages/engine/test/match/realism/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: catálogos, força efetiva, tipos, erros, constantes e gerador por minuto — usados por
todas as user stories.

**⚠️ CRITICAL**: nenhuma user story começa antes desta fase terminar.

### Testes (escrever primeiro; devem falhar)

- [X] T003 [P] Write `packages/engine/test/match/formations.test.ts`: `FORMATION_IDS` = 4-4-2, 4-3-3, 3-5-2, 4-5-1, 5-3-2, 4-2-3-1; every formation has 11 slots with unique ids and exactly one `GK` slot; the count of slots per position matches the formation name (e.g. 3-5-2 has 3 defenders `CB`/`FB`, 5 midfielders `DM`/`MF`, 2 `FW`); `POSTURES` = defensive, balanced, attacking
- [X] T004 [P] Write `packages/engine/test/match/adequacy.test.ts`: diagonal = 1; table symmetric; every value in (0, 1]; `adequacy("FB","CB") > adequacy("FB","FW")`; outfield player in `GK` slot is the lowest value of the table and `GK` in an outfield slot is the second lowest
- [X] T005 [P] Write `packages/engine/test/match/strength.test.ts`: `teamStrength` with 11 natural-position players of strength 70 gives goalkeeper/defense/midfield/attack ≈ 70; moving a `FB` into a `FW` slot lowers attack and defense; setting one slot to `null` lowers the sectors that slot feeds roughly in proportion (≈ 1/11 of the team weight); a stronger midfield player raises `midfield`; result is deterministic
- [X] T006 [P] Write `packages/engine/test/match/rng.test.ts`: `minuteRng(seed, half, minute, label)` returns the same sequence for the same arguments, different sequences for different minute/half/label, and does not depend on call order (calling minute 50 before minute 10 gives the same numbers)

### Implementação

- [X] T007 [P] Implement `FORMATIONS`, `FORMATION_IDS`, `POSTURES`, `Slot`, `FormationId`, `Posture` in `packages/engine/src/match/formations.ts` (slot ids: `gk`, `lb`, `lcb`, `cb`, `rcb`, `rb`, `ldm`, `rdm`, `dm`, `lm`, `lcm`, `cm`, `rcm`, `rm`, `am`, `lw`, `rw`, `ls`, `rs`, `st` as needed per formation; data-model.md)
- [X] T008 [P] Implement `adequacy(playerPosition, slotPosition)` with the symmetric table from research.md R3 in `packages/engine/src/match/adequacy.ts`
- [X] T009 Implement `SECTOR_WEIGHTS` (per slot position: goalkeeper/defense/midfield/attack weights, research.md R3) and `teamStrength({ formation, onField })` in `packages/engine/src/match/strength.ts`, dividing each sector by the full-formation weight sum so missing players reduce strength proportionally (FR-006, FR-007, FR-010) (depends on T007, T008)
- [X] T010 [P] Implement all match types from data-model.md (`MatchInput`, `TeamInput`, `Lineup`, `MatchState`, `TeamState`, `PlayerMatchState`, `PendingChange`, `MatchChange`, `MatchEvent` union, `MatchResult`, `TeamStats`, `Side`) in `packages/engine/src/match/types.ts`
- [X] T011 [P] Implement `MATCH_ERROR_PARAMS` (all codes and params of contracts/match-errors.md), `MATCH_ERROR_CODES`, `MatchErrorCode`, `MatchError` and `matchError(code, params, side?)` in `packages/engine/src/match/errors.ts`
- [X] T012 [P] Create `MATCH_TUNING` in `packages/engine/src/match/tuning.ts` with initial constants: chance base rate per team-minute (~0,13), midfield dominance factor and possession clamp [0,25; 0,75], home multiplier (~1,10 home / ~0,95 away), posture multipliers (attacking: own ×1,20, conceded ×1,15; defensive: own ×0,82, conceded ×0,85), trailing-team push after minute 70, chance-kind weights (open, header, counter, free_kick, penalty), outcome probabilities (on target ~0,38, blocked ~0,22, goal given on target ~0,30), trait effects (finisher, heading, wall, free-kick, pace, playmaker), yellow/red/injury base rates, temperament/proneness weight `0,3 + valor/50`, injury severity weights, stoppage formula (research.md R8)
- [X] T013 [P] Implement `minuteRng(seed, half, minute, label)` = `createRng(seed).fork(\`min:${half}:${minute}\`).fork(label)` in `packages/engine/src/match/rng.ts` (research.md R4)
- [X] T014 Create test helper `packages/engine/test/match/helpers/teams.ts`: builds the world once (`generateDefaultBank({ seed: "brasfoot-like-default-1" })` + `completeHiddenAttributes(bank, "testes-partida")`), exposes `squadOf(clubId)`, `clubIds()`, `naturalLineup(squad, formation, posture?)` (greedy: best player of each slot's natural position, then best remaining, 7 best leftovers on the bench — used until US4 exists), `makeInput(homeClubId, awayClubId, overrides?)` and `withStrengthDelta(squad, delta)` (copies players with strength shifted and clamped 1–100)
- [X] T015 Export formations, adequacy, `teamStrength`, match types, errors and `MATCH_TUNING` from `packages/engine/src/index.ts`; run `pnpm typecheck && pnpm lint && pnpm test`

**Checkpoint**: catálogos e força efetiva prontos.

---

## Phase 3: User Story 1 - Simular uma partida completa (Priority: P1) 🎯 MVP

**Goal**: `simulateMatch(input)` produz placar, eventos, estatísticas e estado dos jogadores, de
forma determinística, rejeitando entradas inválidas com erros codificados.

**Independent Test**: simular com seed fixa, conferir consistência e repetir com a mesma seed
obtendo eventos idênticos.

### Testes (escrever primeiro; devem falhar)

- [X] T016 [P] [US1] Write `packages/engine/test/match/errors.test.ts` with a table of one case per `input.*` and `lineup.*` code (contracts/match-errors.md) built from `makeInput`, asserting `startMatch` returns `ok: false` with exactly that `code`, the right `side` and `params`; plus a coverage check that every `input.*`/`lineup.*` code in `MATCH_ERROR_CODES` has a case
- [X] T017 [P] [US1] Write `packages/engine/test/match/determinism.test.ts`: for 30 seeds, `simulateMatch` twice with the same input gives deep-equal results; seeds 1 and 2 give different events; changing one starter changes the result for at least one of 30 seeds
- [X] T018 [P] [US1] Write `packages/engine/test/match/consistency.test.ts` over 300 seeded matches (SC-007): score equals `shot` events with `outcome: "goal"` per side; every goal has `playerId` of a player on the field at that minute and `assistId` (when present) is a teammate on the field and ≠ scorer; events are ordered by `seq` and by (half, minute, stoppage); no player has events after being sent off or injured; a second `yellow_card` is always followed in the same minute by `red_card` with `reason: "second_yellow"`; first-half stoppage in 0–5 and second-half in 1–8; `possession.home + possession.away = 100`; `shotsOnTarget ≤ shots`; `minutesPlayed` ≤ total match minutes; marker events kickoff/half_time/second_half/full_time appear exactly once and in order
- [X] T019 [P] [US1] Write `packages/engine/test/match/engine.test.ts`: `startMatch` gives `status: "not_started"`; `advanceMatch(state, { minutes: 45 })` stops at the end of the first half with `status: "half_time"` (stoppage included); advancing a finished match returns an equal state; the input object is never mutated (deep-freeze the input and run a full match); a team that loses all but 6 players ends `abandoned` and the result score applies the 3-0 rule (build the state through JSON edits of a running state)

### Implementação

- [X] T020 [US1] Implement `validateMatchInput(input)` (defaults `neutral=false`, `substitutionLimit=5`, `benchLimit=12`; all `input.*`/`lineup.*` checks of FR-005) in `packages/engine/src/match/validate-input.ts`
- [X] T021 [P] [US1] Implement weighted pickers in `packages/engine/src/match/picker.ts`: shooter (by slot position: FW > MF > DM > FB > CB > GK, × strength, × trait bonus for the chance kind — finisher, heading for headers, pace for counters, free-kick for free kicks/penalties), assister (playmaker bonus, excludes shooter), fouler (temperament weight `0,3 + t/50`, DM/CB heavier), injured player (proneness weight `0,3 + p/50`); all using the given `Rng`
- [X] T022 [P] [US1] Implement `stoppageFor(events, half, rng)` in `packages/engine/src/match/stoppage.ts` (research.md R8; clamp 0–5 first half, 1–8 second half)
- [X] T023 [US1] Implement `playMinute(state, half, minute, stoppage)` in `packages/engine/src/match/minute.ts`: possession share from midfield (accumulate into `possession`), chance probability per side from `MATCH_TUNING` and `teamStrength` (`2a²/(a²+d²)`, home/neutral, posture, score/minute push, players on field), chance kind, outcome (finisher vs goalkeeper with wall/finisher/heading/free-kick effects), penalty award + penalty shot, yellow/second yellow/direct red, injury with severity; injured or sent-off players leave their slot (`null`); update `PlayerMatchState` and score; append events with increasing `seq`; every draw from `minuteRng(seed, half, minute, "<side>:<what>")` (depends on T013, T021)
- [X] T024 [US1] Implement `startMatch`, `advanceMatch` (minute loop through first half, stoppage, half_time pause, second half, stoppage, full_time; abandonment when a side has < 7 players) and `simulateMatch` in `packages/engine/src/match/engine.ts` (depends on T020, T022, T023)
- [X] T025 [US1] Implement `matchResult(state)` with `TeamStats` (shots, on target, possession % rounded so both sides sum 100, cards, penalties) and the 3-0 rule for `abandoned` in `packages/engine/src/match/result.ts`
- [X] T026 [P] [US1] Write `packages/i18n/test/match-errors-coverage.test.ts` (every `MATCH_ERROR_CODES` has a message, compiles, uses only `MATCH_ERROR_PARAMS` ∪ {`side`}) and add cases for `formatMatchError` to `packages/i18n/test/format.test.ts` using the examples in contracts/match-errors.md
- [X] T027 [US1] Write all pt-BR messages in `packages/i18n/locales/pt-BR/match-errors.json`, add `posture.*` and `formation.*` labels to `packages/i18n/locales/pt-BR/catalog.json`, implement `formatMatchError` in `packages/i18n/src/format.ts` and export it from `packages/i18n/src/index.ts`
- [X] T028 [US1] Export `startMatch`, `advanceMatch`, `simulateMatch`, `matchResult` from `packages/engine/src/index.ts`; run all gates

**Checkpoint**: partidas completas, determinísticas e consistentes (sem trocas automáticas ainda).

---

## Phase 4: User Story 4 - Escalação automática (Priority: P4; executada antes de US2/US3)

**Goal**: `autoLineup` devolve a melhor escalação para um esquema, com banco que cobre posições.

**Independent Test**: para todos os clubes do banco padrão × todos os esquemas, a escalação é
válida e nenhuma troca titular↔reserva aumenta a força efetiva.

### Testes (escrever primeiro; devem falhar)

- [X] T029 [P] [US4] Write `packages/engine/test/match/hungarian.test.ts`: known optimum on small square and rectangular (more rows than columns) matrices; result is a valid assignment; deterministic tie-break (equal values pick the lowest row index); 40 × 11 runs in < 5 ms
- [X] T030 [P] [US4] Write `packages/engine/test/match/auto-lineup.test.ts`: for every club of the default bank × every formation, `autoLineup` is `ok`, passes `startMatch` validation, has a natural `GK` in the `gk` slot and bench ≤ 12 (SC-005); swapping any starter with any available bench player never increases the sum of `strength × adequacy × slot weight`; unavailable players are never selected; squad with 2 `GK` → one starts, the other is on the bench; bench contains at least one defender, one midfielder and one forward when the squad has them; squad without available `GK` → the best-adequacy player goes to `gk`; fewer than 11 available → `auto_lineup.not_enough_players`; same input → identical lineup

### Implementação

- [X] T031 [P] [US4] Implement the Hungarian algorithm for rectangular maximization with stable tie-break in `packages/engine/src/match/hungarian.ts` (integer-safe arithmetic only)
- [X] T032 [US4] Implement `autoLineup({ squad, formation, posture?, unavailable?, benchLimit? })` in `packages/engine/src/match/auto-lineup.ts`: value matrix `strength × adequacy × total slot weight`, assignment via `hungarian.ts`, bench = best remaining `GK`, then best remaining per sector (defense: FB/CB, midfield: DM/MF, attack: FW), then best remaining by strength up to `benchLimit` (FR-027 to FR-030) (depends on T031)
- [X] T033 [US4] Export `autoLineup` from `packages/engine/src/index.ts` and switch `makeInput` in `packages/engine/test/match/helpers/teams.ts` to use `autoLineup` by default (keep `naturalLineup` for tests that need hand-built lineups); rerun the US1 suites

**Checkpoint**: IA e testes podem montar escalações sem intervenção.

---

## Phase 5: User Story 3 - Avançar em passos e mudar a partida (Priority: P3)

**Goal**: passos = direto; substituições, troca de esquema e postura entre passos; pendências de
lesão/goleiro expulso resolvidas pelo controlador ou pela política automática.

**Independent Test**: minuto a minuto sem mudanças = direto; substituição no minuto 60 aparece e
afeta o restante; repetir com as mesmas mudanças dá o mesmo resultado.

### Testes (escrever primeiro; devem falhar)

- [X] T034 [P] [US3] Write `packages/engine/test/match/steps.test.ts`: for 30 seeds, advancing 1 minute at a time (and in steps of 7) until the end equals `simulateMatch`; `JSON.parse(JSON.stringify(state))` at minute 37 continues to an identical result; the same changes applied at the same minutes on two runs give identical results (SC-001)
- [X] T035 [P] [US3] Write `packages/engine/test/match/changes.test.ts`: valid substitution at minute 60 produces a `substitution` event at 60, the player who left never appears again and the one who entered can appear in later events; one case per `change.*` code (contracts/match-errors.md) with the state unchanged after the rejection; formation change with valid `assignment` emits `formation_change` and keeps empty slots count; posture change emits `posture_change`; changes applied at `half_time` take effect in the second half
- [X] T036 [P] [US3] Write `packages/engine/test/match/pending.test.ts` (forcing situations by editing a running state through JSON): injury creates a `pending` entry; if not resolved, the next `advanceMatch` makes an automatic substitution with the best-adequacy bench player (`automatic: true`); with no substitutions left the team plays with one fewer; goalkeeper sent off with a bench `GK` → automatic swap of an outfield player for the reserve goalkeeper; without bench `GK` → `reorganization` event moves the highest-adequacy outfield player to `gk`; resolving the pending change manually before advancing prevents the automatic one

### Implementação

- [X] T037 [US3] Implement `applyChange(state, side, change)` for substitution, formation and posture in `packages/engine/src/match/changes.ts`, with all `change.*` validations returning `MatchError` and never mutating the input state (FR-023, FR-024)
- [X] T038 [US3] Generate `pending` entries in `packages/engine/src/match/minute.ts` for injuries and goalkeeper red cards, and implement `resolvePending(state, side)` (automatic policy of research.md R6, using the same value function as `autoLineup`) in `packages/engine/src/match/changes.ts`
- [X] T039 [US3] Call `resolvePending` for both sides at the start of each `advanceMatch` step in `packages/engine/src/match/engine.ts`; export `applyChange` from `packages/engine/src/index.ts`; rerun US1 and US4 suites

**Checkpoint**: modo ao vivo e simular direto suportados pelo mesmo motor.

---

## Phase 6: User Story 2 - Resultados críveis em grande volume (Priority: P2)

**Goal**: calibrar `MATCH_TUNING` até todas as faixas de FR-040 a FR-049 e os efeitos de
características passarem em simulação longa.

**Independent Test**: suítes de realismo com ≥ 10.000 partidas verdes; `pnpm sim:matches` com
todas as métricas ✓.

### Testes (escrever primeiro; devem falhar ou passar por acaso — a calibragem é T049)

- [X] T040 [US2] Create `MATCH_REALISM_LIMITS` in `packages/engine/src/match/limits.ts` with every range of FR-040 to FR-049 (goals/match 2,2–3,0; draws 0,22–0,30; equal-strength home win 0,40–0,52 and away 0,22–0,34; neutral gap < 0,04; ≥10-point favourite wins ≥ 0,60 and loses 0,05–0,20; attacking posture +10% goals for and against, defensive −10%; early red −10 p.p. win rate; yellows 3–6, reds 0,05–0,30, temperament ratio ≥ 2; injuries 0,1–0,5, proneness ratio ≥ 2; penalties 0,15–0,40 with 0,70–0,85 conversion; shots 18–30, on target 0,30–0,45, 7+ goals by one side < 0,5%, possession 30–70% in ≥ 95% of matches)
- [X] T041 [US2] Create `packages/engine/test/match/realism/harness.ts`: `runMatches({ n, seed, pairing })` simulating `n` matches between clubs of the default bank (deterministic pairing from the seed, `autoLineup` with a random formation from the catalog, balanced posture) and returning aggregated metrics (goals, draws, home/away wins, cards, injuries, penalties, shots, possession distribution, per-player cards/injuries per minute by temperament/proneness bucket); `runPaired(scenarioA, scenarioB, n)` running both scenarios with the same seeds
- [X] T042 [P] [US2] Write `packages/engine/test/match/realism/scoring.test.ts`: 10.000 matches → FR-040, FR-041, FR-049 (with measured value vs. limit in the failure message)
- [X] T043 [P] [US2] Write `packages/engine/test/match/realism/home.test.ts`: equal-strength matches (same squad on both sides, cloned ids) → FR-042, including the neutral-field case
- [X] T044 [P] [US2] Write `packages/engine/test/match/realism/strength.test.ts`: pairs where one side gets `withStrengthDelta(+10)` (and +5, +15 as monotonicity checks: higher gap ⇒ higher win rate) → FR-043
- [X] T045 [P] [US2] Write `packages/engine/test/match/realism/tactics.test.ts`: paired scenarios attacking vs balanced and defensive vs balanced → FR-044; paired scenario with a player removed (red card at minute ≤ 30 injected via JSON state edit) vs 11 → FR-045; midfield-stronger side has higher average possession
- [X] T046 [P] [US2] Write `packages/engine/test/match/realism/discipline.test.ts`: FR-046 (yellows, reds, temperament ≥ 80 vs ≤ 20 cards per minute ratio), FR-047 (injuries, proneness ratio), FR-048 (penalties per match and conversion)
- [X] T047 [P] [US2] Write `packages/engine/test/match/realism/traits.test.ts`: for each trait, paired scenario where eligible players of one side get the trait vs. none, measuring the related stat (finisher: conversion; heading: header goals for and against; wall: goals conceded / saves; free-kick: free-kick and penalty conversion; pace: counter chances; playmaker: chances created and assists) — effect in the expected direction with margin (SC-003)
- [X] T048 [P] [US2] Write `packages/engine/test/match/performance.test.ts`: a round of 10 matches in < 100 ms and 2.000 matches in < 12 s (proxy for 10.000 in < 60 s, SC-006)

### Implementação

- [X] T049 [US2] Calibrate `MATCH_TUNING` in `packages/engine/src/match/tuning.ts` (and model details in `minute.ts`/`picker.ts` if needed) until T042–T048 pass with margin; never loosen `MATCH_REALISM_LIMITS` without recording the justification in the commit (Princípio V)
- [X] T050 [US2] Implement `tools/src/simulate-matches.ts` (`--n` default 10.000, `--seed`): uses the same aggregation as the harness (move the shared aggregation to `packages/engine/src/match/metrics.ts` and export `aggregateMatchMetrics`), prints each metric with value, limit and ✓/✗, exits 1 if any fails; export `MATCH_REALISM_LIMITS` from `packages/engine/src/index.ts`

**Checkpoint**: as quatro user stories completas e calibradas.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T051 [P] Add a "Motor de partida" section to `packages/engine/README.md` (API, modelo por setor, aleatoriedade por minuto, como recalibrar com `pnpm sim:matches`)
- [X] T052 [P] Sync `specs/002-motor-partida/contracts/match-api.md` and `data-model.md` with any name or field that changed during implementation
- [X] T053 Measure total `pnpm test` time; if the realism suites add more than 30 s, move them to a `test:long` script (root `package.json` + `vitest.config.ts` project) and document it in `specs/002-motor-partida/quickstart.md`
- [X] T054 Run every step of `specs/002-motor-partida/quickstart.md` (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm sim:matches` twice with the same seed giving the same output) and fix divergences

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → **US1 (3)** → **US4 (4)** → **US3 (5)** → **US2 (6)** →
  **Polish (7)**.
- US4 depende só da Foundational e poderia rodar em paralelo com US1 (arquivos distintos), mas
  T033 troca o helper de testes, então é mais simples executá-la logo após US1.
- US3 depende de US1 (motor) e usa a função de valor de US4 na política automática (T038).
- US2 depende de US1, US3 e US4: a calibragem precisa do motor completo.

### Within Each Phase

- Testes antes da implementação (Princípio IX).
- Foundational: T007 + T008 → T009; T010–T013 em paralelo; T014 depois de T007/T009.
- US1: T020, T021, T022 → T023 → T024 → T025; T026 → T027.
- US4: T031 → T032 → T033.
- US3: T037 → T038 → T039.
- US2: T040 → T041 → T042–T048 → T049 → T050.

### Parallel Opportunities

- Foundational: testes T003–T006; implementações T007, T008, T010, T011, T012, T013.
- US1: testes T016–T019 e T026; T021 e T022.
- US4: T029 e T030; T031.
- US3: T034–T036.
- US2: T042–T048 (cada suíte em seu arquivo).
- Polish: T051 e T052.

---

## Parallel Example: User Story 1

```bash
Task: "Write errors table test in packages/engine/test/match/errors.test.ts"
Task: "Write determinism test in packages/engine/test/match/determinism.test.ts"
Task: "Write consistency test in packages/engine/test/match/consistency.test.ts"
Task: "Write engine flow test in packages/engine/test/match/engine.test.ts"
Task: "Write match-errors coverage test in packages/i18n/test/match-errors-coverage.test.ts"
```

## Parallel Example: User Story 2

```bash
Task: "Write scoring realism test in packages/engine/test/match/realism/scoring.test.ts"
Task: "Write home advantage test in packages/engine/test/match/realism/home.test.ts"
Task: "Write strength gap test in packages/engine/test/match/realism/strength.test.ts"
Task: "Write tactics test in packages/engine/test/match/realism/tactics.test.ts"
Task: "Write discipline test in packages/engine/test/match/realism/discipline.test.ts"
Task: "Write traits test in packages/engine/test/match/realism/traits.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Setup + Foundational.
2. US1: partidas completas, determinísticas, consistentes.
3. **Parar e validar**: `pnpm test`; simular algumas partidas e conferir eventos.

### Incremental Delivery

1. US1 → partida simulável (MVP).
2. US4 → escalação automática (IA e testes sem intervenção).
3. US3 → passos e mudanças (base da rodada ao vivo).
4. US2 → calibragem verificada; pronto para a feature 003 (temporada).
5. Polish.

### Notes

- Situações raras (expulsão cedo, time com menos de 7) são forçadas nos testes editando um estado
  serializado em andamento; nunca há API pública para injetar eventos.
- Commit ao fim de cada tarefa ou grupo lógico (sem auto-commit dos hooks).
