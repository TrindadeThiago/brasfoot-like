---

description: "Lista de tarefas da feature 009 — evolução, aposentadoria e renovação do mundo"
---

# Tasks: Evolução, aposentadoria e renovação do mundo

**Input**: Design documents from `specs/009-evolucao-renovacao/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: o módulo `renewal/` segue o Princípio IX (testes antes, devem falhar primeiro); o
equilíbrio do mundo tem simulação de 30 temporadas com limites declarados (Princípio V, research.md
R9), que também roda a economia da 008; o save v5 vem com migração e fixtures (Princípio VI). Os
fluxos de interface (coluna de evolução, resumo de mudanças) são testados com happy-dom +
fake-indexeddb.

**Organization**: tarefas agrupadas por user story, em ordem de prioridade (P1: US1–US5 → P3: US6).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 … US6
- Caminhos relativos à raiz do repositório

## Referências rápidas

- API do motor: `specs/009-evolucao-renovacao/contracts/renewal-api.md`
- Save v5, nomes no mod, telas: `specs/009-evolucao-renovacao/contracts/save-and-ui.md`
- Tipos: `specs/009-evolucao-renovacao/data-model.md`; decisões R1–R13 e limites R9:
  `specs/009-evolucao-renovacao/research.md`
- Já existentes no motor: `generateSquad` e helpers internos `personName`, `birthDateFor`,
  `pickTraits` (`worldgen/players.ts`), `GENERATOR_TUNING` (`worldgen/tuning.ts`),
  `completeHiddenAttributes` (`worldgen/hidden.ts`, temperamento/propensão com `intIrwinHall`),
  `DISTRIBUTION_LIMITS` (`worldgen/limits.ts`), banco de nomes `worldgen/name-banks/default.json`,
  `ageOn`/`seasonDate` (`calendar/date.ts`), `createRng` (`rng/xoshiro.ts`), distribuições em
  `rng/distributions.ts`, `completeCareerRound`/`advanceCareer` (`finance/round.ts`),
  `seasonTurnover` + `DEFAULT_TURNOVER_STEPS`/`TURNOVER_STEP_IDS` + `TurnoverContext`
  (`career/turnover.ts`, `career/types.ts`), `validateBank`, `adjustLineup`
- Helpers de teste: `packages/engine/test/career/helpers.ts`, `packages/engine/test/finance/helpers.ts`
- Save: `format.ts`, `create.ts`, `migrate.ts` (`MIGRATIONS`), `career.ts` (`advanceCareerSeason`,
  `withAdjustedLineup`), fixtures `packages/save/test/fixtures.ts`
- App: `GameProvider` (`commitRound`, `advanceToNextSeason`, `dismissLineupNotice`),
  `app/jogo/elenco/page.tsx`, `ui/PlayerDetails.tsx`, `ui/LineupNotice.tsx` (padrão de aviso)

---

## Phase 1: Setup

- [X] T001 [P] Add the pt-BR strings to `packages/i18n/locales/pt-BR/ui.json`: `col.evolution`, `renewal.evolutionValue` (`{delta}` with sign), `renewal.notice.title` `{year}`, `renewal.notice.retired`, `renewal.notice.arrived`, `renewal.notice.released`, `renewal.notice.promoted`, `renewal.notice.risers`, `renewal.notice.fallers`, `renewal.notice.player` (`{name} ({position}, {age} anos, força {strength})`), `renewal.notice.delta` (`{name}: {delta}`), `renewal.notice.dismiss`, `renewal.notice.empty`, `player.evolution`; and in `packages/i18n/locales/pt-BR/errors.json` the message of `country.names_too_few` (`{kind}`, `{count}`, `{min}`)
- [X] T002 [P] Export `personName`, `birthDateFor`, `pickTraits` (and the `NameBank` type) from `packages/engine/src/worldgen/players.ts` for reuse by the youth generator (no behavior change; worldgen tests stay green)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tipos e regras, medida do mundo, nomes como dados, mundo e renovação passando pela
rodada e pela virada, save v5

**⚠️ CRITICAL**: nenhuma história começa antes desta fase

- [X] T003 Create `packages/engine/src/renewal/types.ts` (`RenewalState`, `RegulatorState`, `WorldMeasure`, `EvolutionRecord`, `SquadChangeNotice`, `PlayerRef`, `PlayerDelta`) and `packages/engine/src/renewal/rules.ts` (`EVOLUTION_RULES`, `RETIREMENT_RULES`, `YOUTH_RULES`, `SQUAD_RULES`, `REGULATOR_RULES`, `STAR_THRESHOLD = 80`) with the values of research.md R4–R8
- [X] T004 Write `packages/engine/test/renewal/measure.test.ts` and implement `packages/engine/src/renewal/measure.ts` (`measureWorld(world, league, date)`: players of the competition clubs; mean, p10, p50, p90 by nearest-rank on sorted strengths, max, stars ≥ 80, mean age; `initialRenewal(world)` with `nextPlayerSeq` = max numeric suffix of `jogador-NNNNN` ids + 1 and a neutral regulator) — on the test world the measure equals research.md R1 (mean ≈ 59.1, p50 59, max 82, stars 0)
- [X] T005 Write `packages/engine/test/renewal/names.test.ts` and implement: optional `countries[].names` in `packages/engine/src/model/schemas.ts`, check + issue `country.names_too_few` in `packages/engine/src/validation/semantic/` + `validation/issues.ts` (+ case in `packages/engine/test/validation/cases.ts`), `packages/engine/src/renewal/names.ts` (`DEFAULT_NAME_BANK` from `worldgen/name-banks/default.json`, `nameBankFor(world, countryId)`), emit `names` for the fictional country in `packages/engine/src/worldgen/generate.ts`, run `pnpm gen:default-bank` and `pnpm validate-bank $PWD/mods/default`
- [X] T006 Thread the living world through the career round: `completeCareerRound` and `advanceCareer` in `packages/engine/src/finance/round.ts` accept optional `renewal` + `careerSeed` and return `world` (unchanged for now) and `renewal`; `TurnoverContext`/`TurnoverOptions`/`TurnoverResult` in `packages/engine/src/career/types.ts` get a replaceable `world` and optional `renewal`, and `seasonTurnover` + every default step in `packages/engine/src/career/turnover.ts` and `packages/engine/src/finance/turnover.ts` use `context.world` instead of the input world; existing engine tests stay green
- [X] T007 Write `packages/save/test/migrate-v5.test.ts` (v4 fixtures `saveV4MidSeason`/`saveV4SeasonOver` in `packages/save/test/fixtures.ts`: v4 → v5 adds `renewal = initialRenewal(bank)`, keeps the rest, deterministic; v1 → v5 chain opens; v5 validation rejects `nextPlayerSeq` ≤ an existing id) and implement save v5 in `packages/save/src/format.ts`, `create.ts`, `migrate.ts`; `advanceCareerSeason` (`packages/save/src/career.ts`) passes `world: save.bank` and `renewal` and stores the returned world/renewal; update existing save tests and fixtures to v5
- [X] T008 App wiring in `apps/web/src/game/GameProvider.tsx`: `commitRound` calls `completeCareerRound(..., save.renewal, save.seed)` and stores `bank` (world) and `renewal`; update `apps/web/test/helpers/career.ts` to keep world/renewal when advancing; `pnpm vitest run apps/web` green

**Checkpoint**: a carreira guarda o mundo vivo e o estado de renovação; nada muda ainda no jogo

---

## Phase 3: User Story 1 - Jogadores evoluem com a idade e a minutagem (Priority: P1) 🎯 MVP

**Goal**: duas evoluções por temporada, curva de idade rumo ao potencial, minutagem acelera jovens,
variação visível no elenco

**Independent Test**: simular uma temporada; jovens com margem sobem, 27–30 estáveis, 31+ caem;
força em `[20, potencial]`; coluna de evolução no elenco

### Tests for User Story 1

- [X] T009 [P] [US1] Write `packages/engine/test/renewal/evolution.test.ts`: `evolutionDelta` — a 19-year-old with potential 20 above strength grows (mean over 200 seeds > 2), 28-year-olds average ≈ 0 (|mean| < 0.5), 34-year-olds average < −1; participation 1.0 vs 0.0 for the same young player gives a higher mean delta (≥ +1 per evolution); `evolvePlayers` never exceeds potential nor goes below 20, keeps potential unchanged, returns an `EvolutionRecord` with deltas/minutes, is deterministic and independent of player order; `minutesInRounds` sums `PlayerLine.minutes` of the league records in the round window; `midSeasonRound` = 19 for 38 rounds
- [X] T010 [P] [US1] Write `packages/engine/test/renewal/mid-season.test.ts`: `advanceCareer` through round 19 with `renewal` applies exactly one evolution (record `moment: "mid"`, season 1) and none before; live (`completeCareerRound` with `finishRound`) and direct give the same world (SC-006 of 006 kept)

### Implementation for User Story 1

- [X] T011 [US1] Implement `packages/engine/src/renewal/evolution.ts` (`minutesInRounds`, `evolutionDelta` with R4 rates, triangular noise from `rng/distributions.ts` and stochastic rounding, `evolvePlayers`, `midSeasonRound`; PRNG `${careerSeed}:evolve:${season}:${moment}:${playerId}`; no `**` nor transcendental functions) — T009 green
- [X] T012 [US1] Apply the mid-season evolution inside `completeCareerRound` in `packages/engine/src/finance/round.ts` when the closed round is `midSeasonRound(league)` and `renewal` is given (store `renewal.lastEvolution`), and add the turnover step `evolve-players` (end evolution, window from mid round + 1 to the last round) in `packages/engine/src/renewal/turnover.ts`, inserted after `close-finance-season` in `DEFAULT_TURNOVER_STEPS`/`TURNOVER_STEP_IDS`; update the step-order assertions of the 007/008 turnover tests — T010 green
- [X] T013 [US1] Add the "Evolução" column (`col.evolution`, sortable, `+N`/`−N`/`=` from `renewal.lastEvolution`) to `apps/web/src/app/jogo/elenco/page.tsx` and the same value in `apps/web/src/ui/PlayerDetails.tsx` (`player.evolution`); write `apps/web/test/flows/renewal.test.tsx` (part 1): after simulating to round 19 the squad shows the evolution of each player equal to the stored record

**Checkpoint**: os jogadores evoluem e o jogador vê

---

## Phase 4: User Story 2 - Veteranos se aposentam (Priority: P1)

**Goal**: aposentadoria probabilística na virada

**Independent Test**: ninguém abaixo de 33; chance cresce com a idade; 38+ sempre; aposentados somem

- [X] T014 [P] [US2] Write `packages/engine/test/renewal/retirement.test.ts`: below 33 never retires; over 400 seeds 36-year-olds retire more often than 34-year-olds; 38+ always; retired players leave `world.players`; deterministic; the returned list has `PlayerRef` copies
- [X] T015 [US2] Implement `retirePlayers(world, league, careerSeed, season, date)` in `packages/engine/src/renewal/retirement.ts` (R5) and the step `retire-players` after `evolve-players` in `packages/engine/src/renewal/turnover.ts` (records the manager's retirees for the notice) — T014 green

---

## Phase 5: User Story 3 - Jovens surgem todo ano (Priority: P1)

**Goal**: 2–4 jovens por clube na virada, com nomes do país e potencial oculto

**Independent Test**: todo clube recebe jovens válidos; reputação maior ⇒ jovens melhores em média

- [X] T016 [P] [US3] Write `packages/engine/test/renewal/youth.test.ts`: each club gets `2 + (rep ≥ 55) + (rep ≥ 75)` players aged 16–18 on the season date, with names from `nameBankFor(country)`, valid position, traits ≤ 2, `hidden.potential > strength`, temperament and injury proneness in 1–100, new unique ids continuing `nextPlayerSeq` (state advanced); positions favor the club's largest shortage vs. `GENERATOR_TUNING.squad.min`; over many seeds a rep-90 club's youth average strength and potential exceed a rep-30 club's; regulator offset and potential bonus shift the averages; the resulting bank passes `validateBank`
- [X] T017 [US3] Implement `generateYouth(world, league, renewal, careerSeed, season, date)` in `packages/engine/src/renewal/youth.ts` (R6; reuse `personName`/`birthDateFor`/`pickTraits`) and the step `generate-youth` in `packages/engine/src/renewal/turnover.ts` (records the manager's arrivals) — T016 green

---

## Phase 6: User Story 4 - Elencos sempre válidos (Priority: P1)

**Goal**: tamanho 22–30 e mínimos por posição depois da virada, com reposição e dispensa

**Independent Test**: depois de `balance-squads`, todo clube dentro das regras

- [X] T018 [P] [US4] Write `packages/engine/test/renewal/squads.test.ts`: a club missing goalkeepers gets youth goalkeepers up to the minimum (marked as promotions); a club above 30 releases the lowest-utility players (R7 formula) down to 30 without breaking position minima; a club under 22 is filled; released players leave the world; deterministic
- [X] T019 [US4] Implement `balanceSquads(world, league, renewal, careerSeed, season, date)` in `packages/engine/src/renewal/squads.ts` (R7) and the step `balance-squads` (after `generate-youth`, builds `renewal.squadNotice` for `managerClubId`: retired, arrived, released, promoted, top 5 risers/fallers of the end evolution) in `packages/engine/src/renewal/turnover.ts` — T018 green
- [X] T020 [US4] Adjust the manager lineup after the turnover in `packages/save/src/career.ts` (`withAdjustedLineup` already removes missing players; make sure `lineupNotice` lists retired/released starters) and extend `packages/save/test/career.test.ts`: a turnover where a starter retires keeps a valid lineup and records the change

---

## Phase 7: User Story 5 - Regulador global mantém o mundo estável (Priority: P1)

**Goal**: o mundo fica nas faixas por 30 temporadas, com craques, elencos válidos e economia saudável

**Independent Test**: teste de 30 temporadas com os limites de R9 e da 008

- [X] T021 [P] [US5] Write `packages/engine/test/renewal/regulator.test.ts`: mean above target lowers `strengthOffset` (step ≤ 1, clamped to ±8); no stars raises `potentialBonus`, too many lowers it (clamped); deterministic; stores `lastMeasure`
- [X] T022 [P] [US5] Write `packages/engine/test/renewal/long-run.test.ts` (acceptance criteria, Principle V): 30 seasons with `advanceCareer(toEnd)` + `seasonTurnover` (finances and renewal on, no manager decisions) for 2 seeds; every season: mean 55–63, p10 43–54, p50 54–63, p90 63–75, max 78–94, ≥ 1 player ≥ 80, every club 22–30 players with position minima (and a valid bank), mean age 24–27.5; over the run: young (≤ 21) players in the top minutes quartile gain ≥ 1.0 point per season more than the bottom quartile; same run twice ⇒ identical world; the economy limits of `finance/long-run.test.ts` hold in the same run (SC-006); limits as named constants
- [X] T023 [US5] Implement `regulate(renewal, measure)` in `packages/engine/src/renewal/regulator.ts` (R8) and the step `regulate-world` (before `generate-youth`) in `packages/engine/src/renewal/turnover.ts`; export the renewal API from `packages/engine/src/index.ts` — T021 green
- [X] T024 [US5] Create `tools/src/simulate-world.ts` (`pnpm sim:world [--seed] [--seasons 30]`, scripts in `tools/package.json` and root `package.json`): per season mean/p10/p50/p90/max, stars, mean age, invalid squads, ✓/✗ per limit and exit code; plus `tools/test/simulate-world.test.ts` (2 seasons, deterministic); make `tools/src/simulate-economy.ts` run with renewal on
- [X] T025 [US5] Calibrate `renewal/rules.ts` (and, if the economy leaves the 008 limits, `DEFAULT_ECONOMY` + `pnpm gen:default-bank`) with `pnpm sim:world --seasons 30` and `pnpm sim:economy --seasons 30` until T022 passes for both seeds; record final values and observed ranges in `specs/009-evolucao-renovacao/research.md` (R9 "valores calibrados")

**Checkpoint**: critérios de aceite verdes

---

## Phase 8: User Story 6 - Ver a renovação acontecer (Priority: P3)

**Goal**: resumo das mudanças do elenco ao entrar na nova temporada

**Independent Test**: depois de uma virada, o resumo bate com as mudanças e some ao dispensar

- [X] T026 [US6] Add `dismissSquadNotice(save)` to `packages/save/src/career.ts` (+ export, + test) and `dismissSquadNotice` to `apps/web/src/game/GameProvider.tsx`
- [X] T027 [US6] Create `apps/web/src/ui/SquadChangeNotice.tsx` (+ css) and show it on `apps/web/src/app/jogo/page.tsx` when `renewal.squadNotice` exists for the current season (sections with player lines, risers/fallers, "Dispensar")
- [X] T028 [US6] Extend `apps/web/test/flows/renewal.test.tsx` (part 2): after a turnover the home shows the notice with the same retired/arrived/released/promoted lists as `save.renewal.squadNotice`, the squad lists the new youth, and dismissing hides it (saved)

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T029 [P] Performance: `packages/engine/test/renewal/performance.test.ts` (one evolution of ~1,000 players < 50 ms median; a full turnover with renewal + finances < 500 ms) and keep `apps/web/test/flows/performance.test.tsx` (turnover < 2 s) green
- [X] T030 [P] Update the E2E specs that assume a fixed squad (`apps/web/e2e/*.spec.ts`) if needed and add a check in `apps/web/e2e/seasons.spec.ts` that the squad notice appears after "Próxima temporada"
- [X] T031 Run the i18n literal test; update `apps/web/README.md` (Elenco evolution column, squad notice) and the quickstart if commands changed
- [X] T032 Run the gates `pnpm typecheck && pnpm lint && pnpm test`, `pnpm build:web && pnpm test:e2e`, and walk through the quickstart (including opening a pre-009 save)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001–T002)**: sem dependências.
- **Foundational (T003–T008)**: depende do Setup. T003 → T004; T005 independente; T006 depois de
  T003; T007 depois de T004 e T006; T008 depois de T007.
- **US1 (T009–T013)**: depende da Foundational.
- **US2 (T014–T015)**, **US3 (T016–T017)**: dependem da Foundational e da ordem das etapas
  (T012 cria `renewal/turnover.ts`); entre si, independentes (arquivos diferentes, mas ambas editam
  `renewal/turnover.ts` — fazer em sequência).
- **US4 (T018–T020)**: depende de US2 e US3 (aposentados e jovens alimentam o equilíbrio do elenco).
- **US5 (T021–T025)**: depende de US1–US4; T025 por último.
- **US6 (T026–T028)**: depende de US4 (aviso montado em `balance-squads`).
- **Polish (T029–T032)**: por último.

### User Story Dependencies

```text
Foundational ─▶ US1 ─▶ US2 ─┐
                  └──▶ US3 ─┴─▶ US4 ─┬─▶ US5 (regulador, 30 temporadas, calibração)
                                     └─▶ US6
```

### Parallel Opportunities

- Setup: T001 e T002.
- Foundational: T004 e T005 juntos depois de T003.
- US1: T009 e T010 juntos.
- Testes de US2, US3 e US4 (T014, T016, T018) podem ser escritos juntos.
- US5: T021 e T022 juntos.
- Polish: T029 e T030.

## Parallel Example: User Story 1

```text
Task: "T009 evolution.test.ts"
Task: "T010 mid-season.test.ts"
```

## Parallel Example: User Story 5

```text
Task: "T021 regulator.test.ts"
Task: "T022 long-run.test.ts (critérios de aceite)"
```

## Implementation Strategy

### MVP First (US1 → US5)

1. Setup + Foundational (mundo vivo, renovação no save, nomes no mod).
2. US1: evolução.
3. US2 + US3: aposentadoria e jovens.
4. US4: elencos válidos.
5. US5: regulador e calibração com as 30 temporadas (critérios de aceite + economia).
6. **Parar e validar**: `renewal/long-run.test.ts` verde.

### Incremental Delivery

1. Foundational → saves em v5 sem mudança de jogo.
2. US1 → jogadores evoluem.
3. US2/US3 → aposentadoria e jovens.
4. US4 → elencos sempre válidos.
5. US5 → mundo estável por 30 temporadas.
6. US6 → resumo de mudanças.
7. Polish → desempenho, E2E, docs.

### Notes

- O banco do save continua válido pelo schema depois de cada etapa (teste em US3/US4/US5).
- A calibração (T025) pode mudar regras de renovação e, se preciso, da economia; os limites de R9 e
  da 008 só mudam com justificativa escrita na mesma alteração.
- Marcar cada tarefa como `[X]` ao concluir.
