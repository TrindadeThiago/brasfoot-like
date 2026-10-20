---

description: "Lista de tarefas da feature 013 — Torcida e rivalidades"
---

# Tasks: Torcida e rivalidades

**Input**: Design documents from `specs/013-torcida-rivalidades/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: `fans/` e a validação de rivalidades seguem o Princípio IX (testes antes, devem falhar
primeiro); o equilíbrio tem simulação de 30 temporadas com limites declarados (Princípio V,
research.md R12); save v9 com migração e fixture (Princípio VI). Fluxos de interface com happy-dom +
fake-indexeddb.

**Organization**: tarefas por user story, em ordem de prioridade (P1: US1, US2, US3 → P2: US4, US5,
US6).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 … US6
- Caminhos relativos à raiz do repositório

## Referências rápidas

- API: `specs/013-torcida-rivalidades/contracts/fans-api.md`; banco/save/telas:
  `specs/013-torcida-rivalidades/contracts/save-and-ui.md`; decisões e padrões R1–R14:
  `specs/013-torcida-rivalidades/research.md`
- Já existentes: `completeCareerRound`/`advanceCareer`/`applyRoundFinances` (`finance/round.ts`),
  `gateFor`/`nextHomeGateEstimate` (`finance/gate.ts`), `confidenceChange` e `BoardContext`
  (`board/confidence.ts`, `board/types.ts`), `expectationOf`/`currentPosition` (`board/goals.ts`),
  `seasonTurnover`/`TURNOVER_STEP_IDS` (`career/turnover.ts`), `validateBank`/`SECTIONS`/
  `ISSUE_PARAMS`/`makeIssue` (`validation/`), `checkReferences` (`validation/semantic/references.ts`),
  `BANK_FILES`/`joinBankFiles`/`splitBankFiles` (`serialize/bank-files.ts`), `generateDefaultBank`
  (`worldgen/generate.ts`), log do mercado `TransferRecord` (`market/types.ts`), `DEFAULT_SEED`
  (`tools/src/default-seed.ts`)
- Helpers de teste: `packages/engine/test/board/helpers.ts` (`newCareer`, `play`, `MANAGER`),
  `packages/engine/test/validation/cases.ts`, `packages/save/test/fixtures.ts`,
  `apps/web/test/helpers/{app.tsx,career.ts,saves.ts}`
- Lembretes: sem `**`/`Math.pow`/transcendentais no motor; aritmética inteira; clone JSON;
  `pnpm sim:world --seasons 30` (sem `--`); antes de commitar, desfazer `apps/web/next-env.d.ts` e
  apagar `apps/web/AGENTS.md`

---

## Phase 1: Setup

- [X] T001 [P] Add pt-BR strings to `packages/i18n/locales/pt-BR/ui.json` per contracts/save-and-ui.md: `fans.title`, `fans.mood` (`{value}`), `fans.band.*` (furious, unhappy, neutral, happy, euphoric), `fans.trend.up/down/flat`, `fans.reasons`, `fans.noReasons`, `fans.factor.*` (win, draw, loss, derbyWin, derbyDraw, derbyLoss, belowExpectation, aheadOfExpectation, calm, idolLost, starSigned, seasonStart — ICU `{amount, number, ::+!}`), `fans.rivals.title`, `fans.rivals.empty`, `fans.rivals.club`, `fans.rivals.division`, `fans.rivals.intensity`, `fans.intensity.1/2/3`, `derby.badge`, `derby.label` (`{intensity}`), `career.tab.fans`, `board.factor.derbyWin/derbyDraw/derbyLoss/fans`; and to `packages/i18n/locales/pt-BR/errors.json`: `rivalry.same_club`, `rivalry.duplicate_pair` (and the `ref.club_not_found` text must read well for the `rivalries` section)
- [X] T002 [P] Create `packages/engine/src/fans/types.ts` (`FansState`, `ClubFans`, `MoodChange`, `MoodFactor`, `MoodBand`, `FansContext`) and `packages/engine/src/fans/rules.ts` (`FansRules`, `DEFAULT_FANS` of research.md R14, `fansRules(world, competitionId)` merging `competition.fans`); add `rivalrySchema`, optional `fans` (`.partial()`) to `competitionSchema` and `derbyPct` to `boardSchema` in `packages/engine/src/model/schemas.ts`; `Rivalry` type and `rivalries?: Rivalry[]` in `ModPackage` (`packages/engine/src/model/types.ts`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: rivalidades no formato do banco, estado da torcida na rodada e na virada, save v9

**⚠️ CRITICAL**: nenhuma história começa antes desta fase

### Tests (write first, must fail)

- [X] T003 [P] Write `packages/engine/test/fans/rules.test.ts`: defaults; partial `competition.fans` merges; schema accepts/rejects ranges; `board.derbyPct` accepted
- [X] T004 [P] Write `packages/engine/test/fans/round.test.ts` (plumbing): `completeCareerRound` with `fans` returns `fans`; without `fans` the result is deep-equal to the current one; `advanceCareer` threads it; `seasonTurnover` with `fans` returns `fans`; `createFans` gives every club `mood = neutral`
- [X] T005 [P] Write `packages/save/test/migrate-v9.test.ts` with a v8 fixture: `fans` neutral for all clubs; default bank (`manifest.id === "default"`) without rivalries gets `generateRivalries(bank.clubs, DEFAULT_SEED)`; non-default bank stays without; `formatVersion` 9; update older migration tests' expected version and the chained-migrations test

### Implementation

- [X] T006 Add the optional `rivalries` section to `SECTIONS`/`BANK_FILES` (`rivalries.json`) in `packages/engine/src/validation/issues.ts` and `packages/engine/src/serialize/bank-files.ts`, the structural item schema in `packages/engine/src/validation/structural.ts` (missing section/file ⇒ empty list, never `file.missing`), and keep `ValidatedBank`/`CompletedBank` carrying `rivalries`
- [X] T007 Implement `createFans` in `packages/engine/src/fans/create.ts`, a `fansAfterRound` skeleton in `packages/engine/src/fans/mood.ts` (returns state unchanged) and `fansNewSeasonStep` skeleton in `packages/engine/src/fans/turnover.ts`; add `CareerFans`/`fans?` to `completeCareerRound`, `advanceCareer` and `applyRoundFinances` in `packages/engine/src/finance/round.ts` (order: finances → market → fans → board); add `fans?` to `TurnoverContext`/`TurnoverOptions`/`TurnoverResult` (`packages/engine/src/career/types.ts`) and register `fans-new-season` after `record-history` in `packages/engine/src/career/turnover.ts`; update the expected step lists in `packages/engine/test/career/turnover*.test.ts` and `packages/engine/test/finance/turnover.test.ts`; export from `packages/engine/src/index.ts`
- [X] T008 Save v9: `fans: FansState` and `SAVE_FORMAT_VERSION = 9` in `packages/save/src/format.ts`; `createSave` builds `fans` in `packages/save/src/create.ts`; migration v8 → v9 (needs `generateRivalries` from US3 — until then only `fans`; T026 completes it) and envelope/validation of `fans` in `packages/save/src/migrate.ts`; `withRoundResult`/`advanceCareerSeason` store `fans` in `packages/save/src/career.ts`
- [X] T009 Pass `{ state: save.fans }` to the round in `apps/web/src/game/GameProvider.tsx` and to `advanceCareer` in `apps/web/test/helpers/career.ts`; keep test helpers' saves coherent (`apps/web/test/helpers/saves.ts`)

**Checkpoint**: tudo verde, jogo igual ao atual (humor neutro e fixo, sem rivalidades no banco padrão)

---

## Phase 3: User Story 1 - Humor da torcida que reage aos resultados (Priority: P1) 🎯 MVP

**Goal**: humor 0–100 por clube que sobe e desce com resultados e expectativa, visível na Início

**Independent Test**: sequências de vitórias/derrotas mudam o humor no sentido certo, com motivos

### Tests (write first, must fail)

- [X] T010 [P] [US1] Write `packages/engine/test/fans/mood.test.ts`: win/draw/loss parcels; expectation drift from `checkFromRound` (below ⇒ down, above ⇒ up) using `expectationOf`; calm drift back to neutral when there is no expectation parcel; clamp 0–100; 5 straight losses ⇒ drop ≥ 15 (SC-001 part 1); only the manager club keeps `recent` (max `keepRecent`); `moodBand` thresholds; determinism with JSON round-trip
- [X] T011 [P] [US1] Write `apps/web/test/flows/fans.test.tsx` (part 1): Início shows the Torcida card with band, value, trend and recent reasons after simulated rounds; card hidden when unemployed

### Implementation

- [X] T012 [US1] Implement `moodChange`, `fansAfterRound` (clubs in id order, result + expectation + calm) and `moodBand` in `packages/engine/src/fans/mood.ts`
- [X] T013 [P] [US1] Create `apps/web/src/ui/fans/FansCard.tsx` (band + value meter, trend, top-3 factors; reuse the trend/factor helpers pattern of `apps/web/src/ui/board/ConfidenceMeter.tsx`) and show it on `apps/web/src/app/jogo/page.tsx` (employed only)

**Checkpoint**: humor reage e explica

---

## Phase 4: User Story 2 - Humor que enche ou esvazia o estádio (Priority: P1)

**Goal**: o humor multiplica o público dos jogos em casa

**Independent Test**: mesmo jogo com humor alto e baixo ⇒ públicos diferentes; 5 derrotas ⇒ público médio cai

### Tests (write first, must fail)

- [X] T014 [P] [US2] Write `packages/engine/test/fans/gate.test.ts`: `gateMoodFactor` 0,70–1,30 and 1 at neutral; `gateFor` with high vs low mood (same fixture/price) ⇒ higher attendance, capped by capacity; without mood unchanged (deep-equal to current); `nextHomeGateEstimate` uses the mood; scenario of 5 losses ⇒ average home attendance of the next 3 home games ≥ 5% lower than the previous 3 (SC-001 part 2, stadium not full)

### Implementation

- [X] T015 [US2] Add `gateMoodFactor` to `packages/engine/src/fans/mood.ts`; `mood` option in `gateFor` and `fans?` in `nextHomeGateEstimate` (`packages/engine/src/finance/gate.ts`); `applyRoundFinances` passes the home club's mood (`packages/engine/src/finance/round.ts`)
- [X] T016 [US2] Pass `save.fans` to `nextHomeGateEstimate` in `apps/web/src/ui/TicketPrice.tsx`

---

## Phase 5: User Story 3 - Rivalidades como dados e clássicos com peso extra (Priority: P1)

**Goal**: rivalidades no mod, validadas; banco padrão com rivalidades; clássicos pesam mais

**Independent Test**: derrota em clássico tem efeito maior que derrota comum; mods inválidos rejeitados

### Tests (write first, must fail)

- [X] T017 [P] [US3] Write `packages/engine/test/validation/rivalries.test.ts` (**acceptance 2**, SC-003): valid rivalries load; nonexistent club ⇒ `ref.club_not_found` at `["rivalries", i, "clubIds", k]`; same club ⇒ `rivalry.same_club`; A–B and B–A ⇒ `rivalry.duplicate_pair`; intensity 0 or 4 ⇒ `schema.out_of_range`; missing `rivalries.json` ⇒ valid with no rivalries; `splitBankFiles`/`joinBankFiles` round-trip
- [X] T018 [P] [US3] Write `packages/engine/test/fans/rivalries.test.ts`: `rivalryOf` symmetric, `rivalsOf`, `isDerby`; `generateRivalries` deterministic, every club 1–3 rivals, at least one intensity-3 per region, each division of the default bank with ≥ 4 derbies per half-season (SC-004); output equals `mods/default/rivalries.json`
- [X] T019 [P] [US3] Extend `packages/engine/test/fans/mood.test.ts`: derby result multiplied by `100 + intensity × derbyPct`, factors `derbyWin/derbyDraw/derbyLoss`, intensity 3 loss ≥ 1,5× a normal loss (SC-002 fans side), both clubs affected; and `packages/engine/test/board/confidence.test.ts`: derby result parcel and factors in the board, ≥ 1,5× (SC-002 board side)

### Implementation

- [X] T020 [US3] Implement `checkRivalries` in `packages/engine/src/validation/semantic/rivalries.ts` (codes `rivalry.same_club`, `rivalry.duplicate_pair` in `ISSUE_PARAMS`; `ref.club_not_found` for the section) and register it in `packages/engine/src/validation/validate.ts`
- [X] T021 [US3] Implement `rivalriesOf`, `rivalryOf`, `rivalsOf`, `isDerby` in `packages/engine/src/fans/rivalries.ts`
- [X] T022 [US3] Implement `generateRivalries(clubs, seed)` (regions of 5 by deterministic shuffle with `fork("rivalries")`, top pair intensity 3, neighbors by reputation 2, leftover 1, max 3 rivals) in `packages/engine/src/worldgen/rivalries.ts`; include `rivalries` in `generateDefaultBank` (`packages/engine/src/worldgen/generate.ts`)
- [X] T023 [US3] Derby multiplier in `moodChange` (`packages/engine/src/fans/mood.ts`) and in `confidenceChange` with `board.derbyPct` (`packages/engine/src/board/confidence.ts`, `packages/engine/src/board/rules.ts`, factor ids in `packages/engine/src/board/types.ts`)
- [X] T024 [US3] Default mod: `rivalries.json` support in `tools/src/fs-bank.ts` (optional file) and `tools/src/gen-default-bank.ts`; run `pnpm gen:default-bank` (only `mods/default/rivalries.json` changes) and export it in `mods/default/package.json`; `pnpm validate-bank mods/default` passes
- [X] T025 [US3] Load `rivalries.json` in `apps/web/src/game/default-bank.ts`, `apps/web/test/helpers/saves.ts` and `packages/save/test/fixtures.ts`
- [X] T026 [US3] Complete migration v8 → v9 with `generateRivalries(bank.clubs, DEFAULT_SEED)` for the default bank in `packages/save/src/migrate.ts` (seed exported from the engine as `DEFAULT_BANK_SEED`, reused by `tools/src/default-seed.ts`)

**Checkpoint**: critérios de aceite 1 (motor) e 2 verdes

---

## Phase 6: User Story 4 - Clássicos em destaque (Priority: P2)

**Goal**: selo "Clássico" no calendário, no próximo jogo e na rodada

**Independent Test**: numa rodada com clássico, calendário, Início e rodada mostram o selo

### Tests (write first, must fail)

- [X] T027 [P] [US4] Extend `apps/web/test/flows/fans.test.tsx`: calendar marks derbies of the club; Início marks the next match when it is a derby; round results/live grid mark derbies of any club

### Implementation

- [X] T028 [P] [US4] Create `apps/web/src/ui/fans/DerbyBadge.tsx` (text badge with accessible label including intensity)
- [X] T029 [US4] Use `DerbyBadge` in `apps/web/src/app/jogo/calendario/page.tsx`, the next match of `apps/web/src/app/jogo/page.tsx`, `apps/web/src/ui/RoundResults.tsx` and `apps/web/src/ui/LiveGrid.tsx`

---

## Phase 7: User Story 5 - Torcida pressiona a diretoria (Priority: P2)

**Goal**: humor fora da faixa neutra entra na confiança da diretoria

**Independent Test**: resultados iguais, torcida revoltada vs animada ⇒ confiança diferente, com fator "fans"

### Tests (write first, must fail)

- [X] T030 [P] [US5] Write `packages/engine/test/fans/board-fans.test.ts`: mood < `fanPressureBelow` ⇒ negative `fans` factor (through patience); mood > `fanSupportAbove` ⇒ positive; neutral band ⇒ none; without `fans` in the context the confidence is unchanged

### Implementation

- [X] T031 [US5] Add `fans?` to `BoardContext` (`packages/engine/src/board/types.ts`), the `fans` factor in `confidenceChange` (`packages/engine/src/board/confidence.ts`) and pass the updated fans state from `completeCareerRound` to `boardAfterRound` (`packages/engine/src/finance/round.ts`)

---

## Phase 8: User Story 6 - Ídolos: vender irrita, contratar anima (Priority: P2)

**Goal**: saída de ídolo derruba o humor; chegada de destaque anima

**Independent Test**: vender o mais forte do elenco ⇒ humor cai; contratar um destaque ⇒ sobe

### Tests (write first, must fail)

- [X] T032 [P] [US6] Write `packages/engine/test/fans/idols.test.ts`: `idolsOf` (top `idolCount`, tie by id); sale/release of an idol in the round's market log ⇒ `idolLost`; buy/free/loan that enters the buyer's idols ⇒ `starSigned`; retirement or loan return ⇒ nothing; same rules for AI clubs

### Implementation

- [X] T033 [US6] Implement `idolsOf` and idol events from the round's log entries in `packages/engine/src/fans/idols.ts`; apply them in `fansAfterRound` (`packages/engine/src/fans/mood.ts`); pass the market state (log) to the fans step in `packages/engine/src/finance/round.ts`

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T034 Turnover: implement `fansNewSeasonStep` (carry toward neutral, title/promotion boost, relegation drop, `recent` reset) in `packages/engine/src/fans/turnover.ts` with `packages/engine/test/fans/turnover.test.ts`
- [X] T035 [P] Carreira › Torcida tab: create `apps/web/src/ui/fans/RivalsList.tsx` (rival, division, intensity) and the tab in `apps/web/src/app/jogo/carreira/page.tsx` with the mood and reasons; extend `apps/web/test/flows/fans.test.tsx`
- [X] T036 Long-run (R12, SC-005): `packages/engine/test/fans/long-run.test.ts` — 30 seasons, 2 seeds, market + board + fans, no manager: mean mood in [35, 65] every season, no club stuck at 0 or 100 for a whole season; pass `fans` in `packages/engine/test/finance/long-run.test.ts` and keep its limits; calibrate `DEFAULT_FANS`
- [X] T037 [P] Mean fan mood per season in `tools/src/simulate-world.ts` and fans active in `tools/src/simulate-economy.ts`; update `tools/test/*`; run `pnpm sim:world --seasons 30` and `pnpm sim:economy --seasons 30` (exit 0)
- [X] T038 [P] Performance: `packages/engine/test/fans/performance.test.ts` (`fansAfterRound` < 5 ms on the full world)
- [X] T039 [P] Playwright `apps/web/e2e/fans.spec.ts`: new career → Torcida card → calendar with a derby badge → Carreira › Torcida lists rivals
- [X] T040 Update `specs/013-torcida-rivalidades/research.md` with calibration results and run the gates: `pnpm typecheck && pnpm lint && pnpm test`, `pnpm build:web && pnpm test:e2e`

---

## Dependencies & Execution Order

- **Setup (1)** → **Foundational (2)** → user stories.
- **US1 (3)** → **US2 (4)** (gate reads the mood) and **US3 (5)** (derby multiplier in `moodChange`).
- **US3** validation/generation tasks (T017, T018, T020–T022, T024–T026) only need Phase 2 and can
  run in parallel with US1/US2; T019/T023 need US1.
- **US4 (6)** needs US3 (rivalries); **US5 (7)** needs US1; **US6 (8)** needs US1.
- **Polish (9)**: T034 after US1; T035 after US3; T036–T040 after all.

### Parallel Opportunities

- T001/T002; T003–T005; T010/T011; T014; T017/T018/T019; T027/T028; T030; T032; T035, T037–T039.

## Parallel Example: User Story 3

```bash
Task: "validation/rivalries.test.ts"   Task: "fans/rivalries.test.ts"
Task: "validation/semantic/rivalries.ts"   Task: "worldgen/rivalries.ts"
```

## Implementation Strategy

1. Fases 1–2 (tipos, regras, seção `rivalries`, torcida na rodada e na virada, save v9) — jogo igual.
2. US1 → US2 → US3: humor, público e clássicos — **parar e validar** os dois critérios de aceite.
3. US4–US6: selos, pressão na diretoria, ídolos.
4. Polish: virada, aba Torcida, calibração com o teste longo, ferramentas, desempenho, e2e.

Commits no fim, um por pacote: engine, mod padrão, save, i18n, web, tools, docs(specs).
