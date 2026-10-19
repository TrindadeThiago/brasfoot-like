---

description: "Lista de tarefas da feature 008 — finanças do clube"
---

# Tasks: Finanças do clube

**Input**: Design documents from `specs/008-financas-clube/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: o módulo `finance/` do motor segue o Princípio IX (testes antes, devem falhar primeiro);
a economia é sistema de equilíbrio e tem simulação longa com limites declarados (Princípio V,
research.md R10); o save v4 vem com migração e fixtures (Princípio VI). Fluxos de interface ligados
aos critérios de sucesso (tela de finanças, preço, crédito, obra) são testados antes com happy-dom +
fake-indexeddb; Playwright cobre o fluxo de ponta a ponta.

**Organization**: tarefas agrupadas por user story, em ordem de prioridade (P1: US1, US2, US3, US7
→ P2: US4, US5, US6 → P3: US8).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 … US8
- Caminhos relativos à raiz do repositório

## Referências rápidas

- API do motor: `specs/008-financas-clube/contracts/finance-api.md`
- Save v4 e `competition.economy`: `specs/008-financas-clube/contracts/save-and-mod.md`
- Tela: `specs/008-financas-clube/contracts/ui.md`
- Tipos e transições: `specs/008-financas-clube/data-model.md`; decisões R1–R13 e limites R10:
  `specs/008-financas-clube/research.md`
- Já existentes no motor: `deriveWage` (`derived/economy.ts`), `fixtureSeed` (`season/calendar.ts`),
  `createRng` (`rng/xoshiro.ts`), `standings`, `completeLeagueRound`/`startLeagueRound`/
  `advanceLeague` (`career/league-round.ts`), `leagueRound`, `divisionSeason`, `clubDivision`,
  `seasonTurnover` + `TurnoverContext` + etapas padrão (`career/turnover.ts`), `seasonDate`
  (`calendar/date.ts`); schemas Zod em `model/schemas.ts`; validação semântica em
  `validation/semantic/competitions.ts` e códigos em `validation/issues.ts`; banco padrão em
  `worldgen/generate.ts` (regravado por `pnpm gen:default-bank` em `mods/default/`)
- Helpers de teste: `packages/engine/test/career/helpers.ts` (`newLeague`, `playedLeague`,
  `finishedLeague`, `editedWorld`, `testWorld`)
- Save: `format.ts`, `create.ts`, `migrate.ts` (`MIGRATIONS`), `career.ts` (`advanceCareerSeason`,
  `userSeason`), fixtures em `packages/save/test/fixtures.ts`
- i18n: bundles em `packages/i18n/src/format.ts` (padrão de `season-errors.json`); app:
  `apps/web/src/i18n/index.tsx` (`formatNumber`)
- App: `GameProvider` (`commitRound`, `playRound`, `commitLineup`, `advanceToNextSeason`),
  `AppHeader` (`GAME_SCREENS`), `GameLayout` (atalhos), `ShortcutsHelp`, `SeasonSummary`, helpers
  `apps/web/test/helpers/*`

---

## Phase 1: Setup

- [X] T001 [P] Create `packages/engine/src/finance/errors.ts` with `FINANCE_ERROR_PARAMS` (codes and params of contracts/finance-api.md), `FinanceErrorCode`, `FINANCE_ERROR_CODES`, `FinanceError`, `financeError()`; add `packages/i18n/locales/pt-BR/finance-errors.json` (complete sentences, ICU) and register it as a bundle in `packages/i18n/src/format.ts` with a `formatFinanceError` (mirroring season errors) plus a coverage test `packages/i18n/test/finance-errors-coverage.test.ts`
- [X] T002 [P] Add the pt-BR UI strings to `packages/i18n/locales/pt-BR/ui.json`: `nav.finance`, `help.finance`, `finance.*` (title, balance, debt, capacity, crisis `{rounds}`, season totals, categories `finance.category.<gate|sponsorship|prize|loan_in|wages|interest|loan_out|stadium>`, start/current balance, ticket section + estimate `{attendance} {occupancy} {revenue}` + apply, credit section `{limit} {available} {rate} {perRound}` + take/repay/settle, stadium section `{seats} {cost} {rounds}` + start + in progress `{seats} {remaining}`, home games table columns, history table columns, disabled during live round), `home.crisis` `{rounds}`, `home.cash` `{amount}`, `seasonEnd.prize` `{amount}`; add `formatMoney(value)` to `apps/web/src/i18n/index.tsx` (pt-BR, fictitious `$`, integer)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tipos, regras do mod, estado inicial, ações do clube, save v4 e o caminho único da
rodada com finanças

**⚠️ CRITICAL**: nenhuma história começa antes desta fase

### Regras e tipos

- [X] T003 Create `packages/engine/src/finance/types.ts` with `ClubFinance`, `StadiumWorks`, `LedgerCategory`, `LedgerEntry`, `GateRecord`, `FinanceSeasonSummary`, `CrisisRecord`, `FinanceState`, `EconomyRules`, `DivisionEconomy`, `StadiumOption` exactly as in `data-model.md`
- [X] T004 Write `packages/engine/test/finance/rules.test.ts`: `economyRules` returns `DEFAULT_ECONOMY` when the competition has no `economy`; partial `economy` is merged with defaults; a division without entry uses the last known level defaults; the default bank (after T006) has explicit values equal to the defaults; `validateBank` rejects `economy` with `priceRange.min > max` (`economy.price_range`), a division level that does not exist (`economy.unknown_division`) and negative values (schema)
- [X] T005 Implement `competition.economy` (optional) in `packages/engine/src/model/schemas.ts`, the semantic checks and issue codes in `packages/engine/src/validation/semantic/competitions.ts` + `packages/engine/src/validation/issues.ts` (+ messages in `packages/i18n/locales/pt-BR/errors.json`), and `packages/engine/src/finance/rules.ts` (`DEFAULT_ECONOMY` with the values of data-model.md, `economyRules(world, competitionId)`, `divisionEconomy(rules, level)`) — T004 green except the default-bank case
- [X] T006 Emit the explicit `economy` block in `packages/engine/src/worldgen/generate.ts`, run `pnpm gen:default-bank` to rewrite `mods/default/competitions.json`, run `pnpm validate-bank` — T004 green

### Estado inicial e ações

- [X] T007 Write `packages/engine/test/finance/create.test.ts`: `createFinances` gives one `ClubFinance` per competition club with `cash = initialCash + sponsorship`, `seasonStartCash = initialCash`, default ticket price `round(referencePrice × (0.8 + 0.4 × rep/100))` within range, `capacity = stadiumCapacity`, no debt/works/crisis; one `sponsorship` ledger entry per club (round 0) with `base + perReputation × rep` of the club's division; `annualWageBill` = 12 × Σ `deriveWage` × `wageFactorPct`/100; deterministic
- [X] T008 Implement `packages/engine/src/finance/create.ts` (`createFinances`, `annualWageBill`, `sponsorshipFor(rules, level, rep)`, internal `post(finances, entry)` that appends a ledger entry and updates `cash` in one step) — T007 green
- [X] T009 Write `packages/engine/test/finance/actions.test.ts`: `setTicketPrice` within range ok / outside → `finance.price_out_of_range`; `creditLine` limit = `creditBase[div] + perReputation × rep`, available = limit − debt, interest per round = ⌈debt × bp / 10 000⌉; `takeLoan` adds cash and debt (`loan_in`), above available → `finance.credit_limit`, ≤ 0 or non-integer → `finance.invalid_amount`; `repayLoan` reduces cash and debt (`loan_out`), more than cash → `finance.insufficient_cash`, without debt → `finance.no_debt`, more than debt is capped at the debt; `startStadiumWorks` charges cost (`stadium`), sets `works` with the option rounds, second works → `finance.works_in_progress`, above max capacity → `finance.max_capacity`, unknown index → `finance.unknown_option`, insufficient cash → `finance.insufficient_cash`; inputs never mutated
- [X] T010 Implement `packages/engine/src/finance/actions.ts` (`setTicketPrice`, `creditLine`, `takeLoan`, `repayLoan`, `startStadiumWorks`) using `post` — T009 green; export finance types, errors, rules, create and actions from `packages/engine/src/index.ts`

### Save v4

- [X] T011 Add v3 builders `saveV3MidSeason()` / `saveV3SeasonOver()` to `packages/save/test/fixtures.ts` (current v3 shape without `finances`) and write `packages/save/test/migrate-v4.test.ts`: v3 → v4 adds `finances = createFinances(bank, league)` and keeps everything else; deterministic; v1 → v4 chain opens; v4 validation rejects a club without `ClubFinance`, a broken cash invariant and a price out of range (`corrupt`)
- [X] T012 Implement save v4: `SAVE_FORMAT_VERSION = 4` and `finances` in `packages/save/src/format.ts`, `createFinances` in `packages/save/src/create.ts`, the v3 → v4 migration and checks in `packages/save/src/migrate.ts`; update the existing save tests/fixtures to v4 — T011 green, `pnpm vitest run packages/save` green

**Checkpoint**: regras no mod, finanças iniciais e ações do clube prontas; saves abrem em v4

---

## Phase 3: User Story 1 - O dinheiro entra e sai a cada rodada (Priority: P1) 🎯 MVP

**Goal**: toda rodada movimenta o caixa de todos os clubes (bilheteria do mandante, folha, juros,
obras, crise), igual ao vivo e direto, salvo com a rodada

**Independent Test**: jogar uma rodada e conferir, para um mandante e um visitante, que Δcaixa =
bilheteria (só o mandante) − folha do período (− juros), com os números do detalhamento

### Tests for User Story 1

- [X] T013 [P] [US1] Write `packages/engine/test/finance/gate.test.ts` (model of research.md R5): attendance ≤ capacity and integer; revenue = attendance × price; noise reproducible for the same fixture seed and within ±5%; `noise: false` has no noise; demand grows with home reputation, opponent reputation and recent form, and is lower in Série B for the same club data
- [X] T014 [P] [US1] Write `packages/engine/test/finance/round.test.ts`: after `completeCareerRound` each home club gets one `gate` entry and one `GateRecord`, away clubs none; every club whose division played pays `wages` = ⌊annual·k/R⌋ − ⌊annual·(k−1)/R⌋ and the 38 instalments of a season sum to the annual bill exactly; a club with debt pays `interest`; works count down and capacity increases only at 0; Σ Δcash of all clubs = Σ entries of the round (SC-005); `completeCareerRound` with a live round finished via `finishRound` after manager decisions equals `advanceCareer({ rounds: 1 })` with the same lineups (SC-006); crisis: a club with `cash < 0` for `crisisRounds` rounds opens a `CrisisRecord`, closes it on the first round with `cash ≥ 0`
- [X] T015 [P] [US1] Extend `apps/web/test/flows/finances.test.tsx` (part 1): after one round played directly, the stored save's `finances` has the manager club cash changed by its gate (if home) minus wages, and the live-round path stores the same finances

### Implementation for User Story 1

- [X] T016 [US1] Implement `packages/engine/src/finance/gate.ts` (`gateFor`, form from the last 5 records of the club's `Season`, noise `createRng(\`${fixture.seed}:gate\`)`) — T013 green
- [X] T017 [US1] Implement `packages/engine/src/finance/round.ts` (`applyRoundFinances` with the fixed order of data-model.md — gates, wages, interest, works, crisis; AI hook left as a no-op until US7 — `completeCareerRound`, `advanceCareer`) and export them — T014 green
- [X] T018 [US1] Use the career round in the app and save: `apps/web/src/game/GameProvider.tsx` `commitRound` calls `completeCareerRound(save.league, save.finances, save.bank, live, save.clubId)` and stores both; `packages/save/src/career.ts` keeps finances through `advanceCareerSeason` (temporary pass-through until US3); update `apps/web/test/helpers/career.ts` (`storedCareer` advances with `advanceCareer`) — T015 green, `pnpm vitest run apps/web` green

**Checkpoint**: o dinheiro circula a cada rodada para os 40 clubes

---

## Phase 4: User Story 2 - Preço do ingresso: lotar ou faturar (Priority: P1)

**Goal**: o jogador define o preço, vê a estimativa e o público reage como descrito

**Independent Test**: no mesmo jogo, comparar três preços: público cai com o preço; renda por
torcedor sobe

### Tests for User Story 2

- [X] T019 [P] [US2] Extend `packages/engine/test/finance/gate.test.ts` (SC-004): for a fixture where demand < capacity, +10% price lowers attendance by ≥ 5%; −10% raises attendance and lowers revenue per fan; attendance is non-increasing over a sweep of prices; `nextHomeGateEstimate` equals `gateFor(..., { noise: false })` for the club's next home fixture and is `undefined` when there is none left
- [X] T020 [P] [US2] Extend `apps/web/test/flows/finances.test.tsx` (part 2): typing a price shows the estimate (attendance, occupancy, revenue) from `nextHomeGateEstimate`; applying saves the price; out-of-range price shows the error in `role="alert"` and is not saved; the next home game uses the new price (gate record)

### Implementation for User Story 2

- [X] T021 [US2] Implement `nextHomeGateEstimate` in `packages/engine/src/finance/gate.ts` and export it — T019 green
- [X] T022 [US2] Add `setManagerTicketPrice` in `packages/save/src/finance.ts` (+ export) and `setTicketPrice` in `apps/web/src/game/GameProvider.tsx` (validate, update, persist)
- [X] T023 [US2] Create `apps/web/src/app/jogo/financas/page.tsx` (+ css) with the header block (balance, debt, capacity) and `apps/web/src/ui/TicketPrice.tsx` (numeric field, live estimate, apply, error), add the route to `apps/web/test/helpers/app.tsx`, the menu item `nav.finance` in `apps/web/src/ui/AppHeader.tsx` (`GAME_SCREENS`, before Histórico) and shortcut `6` in `apps/web/src/game/GameLayout.tsx` + `ShortcutsHelp` — T020 green

**Checkpoint**: preço do ingresso é uma alavanca real

---

## Phase 5: User Story 3 - Receitas e despesas da temporada (Priority: P1)

**Goal**: patrocínio no início, premiação no fim e resumo financeiro no histórico, pela virada

**Independent Test**: simular uma temporada e conferir patrocínio, premiação (com título) e o
resumo de cada clube no histórico

### Tests for User Story 3

- [X] T024 [P] [US3] Write `packages/engine/test/finance/turnover.test.ts`: `seasonTurnover` with `finances` pays `prize` linear from `first` to `last` by final position in each division plus `title` to each champion; writes one `FinanceSeasonSummary` per club with `endCash = startCash + Σ totals`; clears `ledger` and `gates`; then pays `sponsorship` for the new division (a promoted club gets the Série A amount, a relegated one the Série B amount) and sets `seasonStartCash`; step order = `record-history`, `pay-prizes`, `close-finance-season`, `promotion-relegation`, `advance-year`, `reset-season-stats`, `generate-calendars`, `pay-sponsorship`, `ai-finance-review`; works and debt cross the turnover unchanged; deterministic
- [X] T025 [P] [US3] Extend `packages/save/test/career.test.ts`: `advanceCareerSeason` carries finances (prize received by the manager club, sponsorship of the new division, summary in `finances.seasons`)

### Implementation for User Story 3

- [X] T026 [US3] Add `finances` (and `managerClubId?`) to `TurnoverContext`, `TurnoverOptions` and `TurnoverResult` in `packages/engine/src/career/types.ts`, thread it through `seasonTurnover` in `packages/engine/src/career/turnover.ts`, and implement the steps `pay-prizes`, `close-finance-season`, `pay-sponsorship`, `ai-finance-review` (no-op until US7) in `packages/engine/src/finance/turnover.ts`, inserted into `DEFAULT_TURNOVER_STEPS` / `TURNOVER_STEP_IDS` at the positions of research.md R8; update the 007 turnover tests that assert the step ids — T024 green, `pnpm vitest run packages/engine/test/career` green
- [X] T027 [US3] Pass and store `finances` in `advanceCareerSeason` (`packages/save/src/career.ts`) — T025 green
- [X] T028 [US3] Show the manager club prize in `apps/web/src/ui/SeasonSummary.tsx` (`seasonEnd.prize`, from the prize that `pay-prizes` would pay — expose `prizeFor(rules, level, position, isChampion)` from `finance/turnover.ts`)

**Checkpoint**: a temporada fecha financeiramente

---

## Phase 6: User Story 7 - Clubes do computador com as mesmas regras (Priority: P1)

**Goal**: a IA ajusta preço, crédito e obras; a economia fica saudável por 30 temporadas

**Independent Test**: simular temporadas sem interação e ver a IA reagir à ocupação e ao caixa; os
limites de R10 passam

### Tests for User Story 7

- [X] T029 [P] [US7] Write `packages/engine/test/finance/ai.test.ts`: every 4 rounds a non-manager club with average occupancy of its last 3 home games > 95% raises the price 10% (within range), < 60% lowers 10%; with no works, occupancy > 90% and cash ≥ cost + 6 months of wages it starts the largest option that keeps the margin; cash < 0 → takes the loan needed to reach 1 month of wages (capped by available credit); cash > 6 months of wages with debt → repays the excess; the manager club is never touched; decisions run in club id order and are deterministic
- [X] T030 [P] [US7] Write `packages/engine/test/finance/long-run.test.ts` (acceptance criteria, Principle V): 30 seasons with `advanceCareer(toEnd)` + `seasonTurnover` for 2 seeds, no manager decisions; at every season end assert `max cash − median cash ≤ 4 × median annual wage bill` (SC-001), ≥ 80% of clubs not in crisis (SC-002), and over the run ≥ 90% clubs not in crisis on average, Spearman(initial reputation, mean cash) ≥ 0.40 (SC-003), median cash at the end between 0 and 5 × median annual wage bill; limits as named constants at the top; timeout sized for the suite

### Implementation for User Story 7

- [X] T031 [US7] Implement `packages/engine/src/finance/ai.ts` (price, credit and works review using the T010 actions) and call it from `applyRoundFinances` step 6 and from `ai-finance-review` — T029 green
- [X] T032 [US7] Create `tools/src/simulate-economy.ts` (`pnpm sim:economy [--seed] [--seasons 30]`, script in `tools/package.json` and root `package.json`): per season min/median/max cash, clubs in crisis, Spearman; ✓/✗ for each limit of research.md R10; exit code; plus `tools/test/simulate-economy.test.ts` (2 seasons, deterministic output)
- [X] T033 [US7] Calibrate the default `economy` (in `DEFAULT_ECONOMY`, `worldgen/generate.ts` and, if needed, `wageFactorPct`) with `pnpm sim:economy --seasons 30` until T030 passes for both seeds; regenerate `mods/default/competitions.json` (`pnpm gen:default-bank`); record the final values and the per-club revenue/wage ratios observed in `specs/008-financas-clube/research.md` (R10 "valores calibrados")

**Checkpoint**: economia fechada e balanceada — critérios de aceite verdes

---

## Phase 7: User Story 4 - Tela de finanças (Priority: P2)

**Goal**: saldo, categorias, jogos em casa e histórico visíveis

**Independent Test**: depois de algumas rodadas, totais por categoria + saldo inicial = saldo atual;
histórico com uma linha por temporada

- [X] T034 [P] [US4] Write `packages/engine/test/finance/summary.test.ts` and implement `seasonFinanceSummary` in `packages/engine/src/finance/summary.ts` (totals per category of the current season and start/current cash) + export
- [X] T035 [US4] Create `apps/web/src/ui/FinanceSummary.tsx` (season revenues/expenses by category with totals, start → current), the home games table (round, opponent, attendance, occupancy %, price, revenue from `finances.gates`) and the history table (from `finances.seasons`) in `apps/web/src/app/jogo/financas/page.tsx`
- [X] T036 [US4] Extend `apps/web/test/flows/finances.test.tsx` (part 3): totals + start = current; home games listed with attendance ≤ capacity; after a turnover the history shows one row with start/end cash; all money formatted by `formatMoney`; show the balance on the home card (`home.cash`)

**Checkpoint**: o jogador enxerga o dinheiro

---

## Phase 8: User Story 5 - Empréstimo bancário (Priority: P2)

**Goal**: tomar, amortizar e quitar dentro do limite, vendo o custo

**Independent Test**: tomar, jogar rodadas (juros), amortizar, quitar; passar do limite é recusado

- [X] T037 [US5] Add `takeManagerLoan` / `repayManagerLoan` in `packages/save/src/finance.ts` (+ tests in `packages/save/test/finance.test.ts`) and `takeLoan` / `repayLoan` in `apps/web/src/game/GameProvider.tsx`
- [X] T038 [US5] Create `apps/web/src/ui/CreditPanel.tsx` (limit, available, rate, cost per round from `creditLine`; amount field; take / repay / settle; errors in `role="alert"`) on the finance page
- [X] T039 [US5] Extend `apps/web/test/flows/finances.test.tsx` (part 4): take a loan (cash and debt up, saved), play a round (interest charged), repay part and settle; above the limit is refused with the available amount; actions disabled during the live round

**Checkpoint**: o crédito é uma decisão informada

---

## Phase 9: User Story 6 - Expansão do estádio (Priority: P2)

**Goal**: contratar uma obra, esperar e usar a nova capacidade

**Independent Test**: contratar, conferir o débito, jogar as rodadas e ver a capacidade aumentar
só no fim

- [X] T040 [US6] Add `startManagerStadiumWorks` in `packages/save/src/finance.ts` (+ tests) and `startStadiumWorks` in `apps/web/src/game/GameProvider.tsx`
- [X] T041 [US6] Create `apps/web/src/ui/StadiumPanel.tsx` (options with seats/cost/rounds and "Contratar", disabled with reason when not affordable, at max or with works in progress; works in progress with remaining rounds) on the finance page
- [X] T042 [US6] Extend `apps/web/test/flows/finances.test.tsx` (part 5): start a works (cash debited, works shown), second works refused, play the rounds and see the capacity change only at the end, works crossing a turnover keeps counting

**Checkpoint**: investir no estádio é possível

---

## Phase 10: User Story 8 - Crise financeira registrada (Priority: P3)

**Goal**: crise visível e registrada (sem punição)

**Independent Test**: forçar caixa negativo além do limite e ver a crise aparecer e sumir

- [X] T043 [US8] Write `packages/engine/test/finance/crisis.test.ts` (open at `crisisRounds`, close on cash ≥ 0, records with start/end season and round, a crisis crossing the turnover stays open) — must pass with the T017 logic; fix any gap there
- [X] T044 [US8] Show the crisis warning (`finance.crisis` / `home.crisis` with the number of negative rounds) on the finance page and on the home page `apps/web/src/app/jogo/page.tsx`, and list past crises in the finance history; extend `apps/web/test/flows/finances.test.tsx` (part 6) with a career forced into crisis through a save edit

**Checkpoint**: a diretoria (012) terá onde se apoiar

---

## Phase 11: Polish & Cross-Cutting Concerns

- [X] T045 [P] Write `apps/web/e2e/finances.spec.ts`: new career → Finanças (`6`) → change price and see the estimate → simulate a home round (gate listed, balance changed) → take and repay a loan → start a works → simulate to the season end → prize in the summary → next season → finance history row
- [X] T046 [P] Performance: `packages/engine/test/finance/performance.test.ts` (finances of one round for 40 clubs < 5 ms median; a league round with finances < 300 ms) and keep `apps/web/test/flows/performance.test.tsx` (direct round < 1 s) green
- [X] T047 Run the i18n literal test and fix any new literal; confirm every money value uses `formatMoney`
- [X] T048 Update `apps/web/README.md` (route `/jogo/financas`, shortcut `6`) and `specs/008-financas-clube/quickstart.md` if commands changed
- [X] T049 Run the gates `pnpm typecheck && pnpm lint && pnpm test`, `pnpm build:web && pnpm test:e2e`, and walk through the quickstart manually (including opening a pre-008 save)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001–T002)**: sem dependências.
- **Foundational (T003–T012)**: depende do Setup (T001 para os erros). T003 antes de tudo; T004 →
  T005 → T006; T007 → T008; T009 → T010 (precisa de T008); save T011 → T012 depois de T008.
- **US1 (T013–T018)**: depende da Foundational.
- **US2 (T019–T023)**: depende de US1 (gate e rodada).
- **US3 (T024–T028)**: depende de US1 (lançamentos e rodada).
- **US7 (T029–T033)**: depende de US1 e US3 (virada financeira) e das ações (T010); T033 por
  último na fase.
- **US4 (T034–T036)**: depende de US2 (página criada em T023) e US3 (histórico).
- **US5 (T037–T039)** e **US6 (T040–T042)**: dependem de T023 (página); independentes entre si.
- **US8 (T043–T044)**: depende de US1 (lógica de crise) e da página.
- **Polish (T045–T049)**: por último.

### User Story Dependencies

```text
Foundational ─▶ US1 ─┬─▶ US2 ─┬─▶ US4
                     │        ├─▶ US5
                     │        ├─▶ US6
                     │        └─▶ US8
                     └─▶ US3 ─▶ US7 (calibração e critérios de aceite)
```

### Parallel Opportunities

- Setup: T001 e T002.
- Foundational: T004, T007, T009 (testes) juntos depois de T003.
- US1: T013, T014, T015 juntos.
- US2 e US3 podem andar em paralelo depois de US1 (arquivos diferentes, exceto a página do app).
- US5 e US6 em paralelo depois de T023.
- Polish: T045 e T046.

## Parallel Example: User Story 1

```text
Task: "T013 gate.test.ts (modelo de público)"
Task: "T014 round.test.ts (bilheteria, folha, juros, obras, crise, conservação, ao vivo = direto)"
Task: "T015 finances.test.tsx parte 1"
```

## Parallel Example: User Story 7

```text
Task: "T029 ai.test.ts"
Task: "T030 long-run.test.ts (critérios de aceite)"
```

## Implementation Strategy

### MVP First (US1 + US2 + US3 + US7)

1. Setup + Foundational (regras no mod, finanças iniciais, ações, save v4).
2. US1: o dinheiro circula por rodada.
3. US2: preço do ingresso com estimativa.
4. US3: patrocínio, premiação e resumo na virada.
5. US7: IA e calibração com as 30 temporadas.
6. **Parar e validar**: `long-run.test.ts` verde e uma temporada jogada mexendo no preço.

### Incremental Delivery

1. Foundational → saves em v4 com caixa inicial.
2. US1 → caixa mexe a cada rodada.
3. US2 → preço do ingresso.
4. US3 → temporada fecha financeiramente.
5. US7 → economia balanceada (critérios de aceite).
6. US4 → tela completa.
7. US5 → crédito.
8. US6 → obras.
9. US8 → crise visível.
10. Polish → E2E, desempenho, docs.

### Notes

- Todo valor monetário é inteiro e passa por um lançamento (`post`); nada altera `cash` por fora.
- A calibração (T033) pode mudar os valores padrão; os limites de R10 só mudam com justificativa
  escrita na mesma alteração.
- Marcar cada tarefa como `[X]` ao concluir.
