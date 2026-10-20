---

description: "Lista de tarefas da feature 011 — IA de transferências"
---

# Tasks: IA de transferências

**Input**: Design documents from `specs/011-ia-transferencias/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: `market/ai/` segue o Princípio IX (testes antes, devem falhar primeiro); o equilíbrio
tem simulação de 30 temporadas com limites declarados (Princípio V, research.md R11); save v7 com
migração e fixtures (Princípio VI). Fluxos de interface com happy-dom + fake-indexeddb.

**Organization**: tarefas por user story, em ordem de prioridade (P1: US1, US2, US3 → P2: US4, US5,
US6 → P3: US7).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 … US7
- Caminhos relativos à raiz do repositório

## Referências rápidas

- API: `specs/011-ia-transferencias/contracts/ai-market-api.md`; save/telas:
  `specs/011-ia-transferencias/contracts/save-and-ui.md`; decisões e padrões R1–R13:
  `specs/011-ia-transferencias/research.md`
- Já existentes (010): `MarketContext`/`MarketUpdate`/`MarketState` (`market/types.ts`),
  `marketRules`/`DEFAULT_MARKET` (`market/rules.ts`), `askingPrice`/`loanAskingPrice`/`maxBidFor`
  (`market/club-response.ts`), `attraction`/`exigency`/`wageDemand` (`market/player-response.ts`),
  `completeTransfer`/`completeLoan`/`completeSigning` (`market/effects.ts`),
  `canAddPlayer`/`canRemovePlayer`/`strengthRank` (`market/squad.ts`), `isWindowOpen`/
  `transferWindows`/`roundsPlayed` (`market/windows.ts`), `marketValue` (`market/value.ts`),
  `marketAfterRound`/`answerIncomingOffer` (`market/incoming.ts`), etapas da virada e `aiKeeps`/
  `reviewedWage` (`market/turnover.ts`), `initialContract`/`contractYearsRange`
  (`market/contracts.ts`), `completeCareerRound`/`advanceCareer` (`finance/round.ts`),
  `annualWageBill` (`finance/create.ts`), `SQUAD_RULES`/`balanceSquads` (`renewal/`)
- Helpers de teste: `packages/engine/test/market/helpers.ts` (`marketContext`, `contextAfter`,
  `playerOf`, `applied`, `totalCash`, `YEAR`, `MANAGER`, `SEED`)
- Lembretes: sem `**`/`Math.pow`/transcendentais no motor; clone JSON; `pnpm sim:world --seasons 30`
  (sem `--`); antes de commitar, desfazer `apps/web/next-env.d.ts` e apagar `apps/web/AGENTS.md`

---

## Phase 1: Setup

- [X] T001 [P] Add pt-BR strings to `packages/i18n/locales/pt-BR/ui.json` per contracts/save-and-ui.md: `market.tab.report`, `market.report.title` (`{year}`, `{window}`), `market.report.window.0`/`market.report.window.1` (início/meio), `market.report.highlights`, `market.report.division` (`{division}`), `market.report.empty`, `market.report.col.*` (player, position, strength, from, to, kind, fee), `market.report.kind.*` (buy, sale, loan, loan_out, free), `market.report.notice` (`{year}`), `market.report.open`, `market.report.dismiss`, `market.report.select`
- [X] T002 [P] Create `packages/engine/src/market/ai/rules.ts` with `AiMarketRules`, `DEFAULT_AI_MARKET` (values of research.md R12, `positionMax` of R3) and `aiMarketRules(world, competitionId)` merging `competition.market.aiMarket`; add the optional `aiMarket` object to `marketSchema` in `packages/engine/src/model/schemas.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: necessidades do clube, teto por posição, mercado dentro da rodada da carreira, save v7

**⚠️ CRITICAL**: nenhuma história começa antes desta fase

### Tests (write first, must fail)

- [X] T003 [P] Write `packages/engine/test/market/ai/rules.test.ts`: defaults; partial `aiMarket` override merges; schema accepts `aiMarket`
- [X] T004 [P] Write `packages/engine/test/market/ai/needs.test.ts`: uncovered position (below min), weak position (starter < target − weakGap), excess (count > min + 2 or > max), surplus ordered by lowest utility, `old` when mean age > 28, budget = cash − reserve and 0 in crisis, priorities uncovered before weak, target grows with ambition (reputation + division)
- [X] T005 [P] Write `packages/engine/test/market/ai/position-max.test.ts`: `canAddPlayer(world, clubId, position)` refuses above `positionMax`; `balanceSquads` releases players above the cap (lowest utility) and never generates youth into a capped position
- [X] T006 [P] Write `packages/engine/test/market/ai/career-round.test.ts`: `completeCareerRound` with `market` returns `market`; without `market` behaves exactly as before (deep-equal to 010 result); `advanceCareer` threads market; incoming offers/expirations of 010 still happen inside the round

### Implementation

- [X] T007 Implement `clubNeeds` (ClubNeeds/PositionNeed of data-model.md) in `packages/engine/src/market/ai/needs.ts`
- [X] T008 Add the optional `position` cap to `canAddPlayer` in `packages/engine/src/market/squad.ts` and the cap to `balanceSquads`/`neediestPosition` in `packages/engine/src/renewal/squads.ts` and `packages/engine/src/renewal/youth.ts`
- [X] T009 Add `CareerMarket` and the `market?` parameter/result to `completeCareerRound` and `advanceCareer` in `packages/engine/src/finance/round.ts` (round: finances → mid-season evolution → `aiMarketRound` (stub returning unchanged until US1) → `marketAfterRound`); export from `packages/engine/src/index.ts`
- [X] T010 Add `reports: WindowReport[]` and `reportSeen?` to `MarketState`/`emptyMarket` in `packages/engine/src/market/types.ts` (types `WindowReport`, `ReportEntry`)
- [X] T011 Save v7 in `packages/save/src/format.ts`/`migrate.ts` (migration v6 → v7 adds `market.reports = []`, envelope accepts reports), v6 fixtures and `packages/save/test/migrate-v7.test.ts`; update older migration tests' expected version
- [X] T012 Use the career round with market in `apps/web/src/game/GameProvider.tsx` (`commitRound` passes `{ state: save.market, careerSeed: save.seed }`, stores `result.market`, drops the separate `marketAfterRoundOf`) and in `apps/web/test/helpers/career.ts`; keep `packages/save/src/market.ts` `marketAfterRoundOf` only if still used

**Checkpoint**: tudo verde, comportamento igual ao da 010 (a IA ainda não negocia)

---

## Phase 3: User Story 1 - Clubes da IA montam elencos coerentes (Priority: P1) 🎯 MVP

**Goal**: cada clube resolve sua carência mais urgente no mercado, sem passar do teto

**Independent Test**: depois de uma janela simulada, clubes com posição descoberta/fraca receberam
reforço e nenhum elenco é inválido

### Tests (write first, must fail)

- [X] T013 [P] [US1] Write `packages/engine/test/market/ai/targets.test.ts`: target plays the needed position, improves the starter by ≥ minGain, fits the budget (fee + annual wage), the athlete accepts the club (no `no_interest`), excludes manager players, loaned players and players under a manager negotiation; younger preferred when gains tie; old squad increases the youth bonus
- [X] T014 [P] [US1] Write `packages/engine/test/market/ai/round.test.ts` (needs part): uncovered positions are filled first; club in crisis buys nothing; per-club limit `maxBuysPerWindow` and world limit `maxDealsPerRound`; after the round every squad is valid and within `positionMax`; manager squad untouched

### Implementation

- [X] T015 [US1] Implement `purchaseTarget` in `packages/engine/src/market/ai/targets.ts` (score of research.md R4)
- [X] T016 [US1] Implement `aiMarketRound` purchases in `packages/engine/src/market/ai/round.ts` (clubs by id, one deal per club per round, contract by `wageDemand` and age-based years, `completeTransfer`; per-window counters derived from `market.log` of the current window)

**Checkpoint**: compras por necessidade funcionando

---

## Phase 4: User Story 2 - Transferências entre clubes da IA (Priority: P1)

**Goal**: negócios entre clubes da IA só na janela, com as regras do humano

**Independent Test**: janela simulada com transferências entre clubes da IA; fora da janela, nenhuma;
dinheiro conservado; determinismo

### Tests (write first, must fail)

- [X] T017 [P] [US2] Extend `packages/engine/test/market/ai/round.test.ts`: window closed ⇒ no purchases/loans between clubs; every deal posts `transfer_purchase`/`transfer_sale` and keeps total cash (SC-006); same seed ⇒ same deals (SC-007); a player is moved at most once per round; log records each deal with both clubs

### Implementation

- [X] T018 [US2] Gate purchases and loans by `isWindowOpen` and guarantee one move per player per round in `packages/engine/src/market/ai/round.ts`

**Checkpoint**: mercado entre clubes da IA ativo nas janelas

---

## Phase 5: User Story 3 - Grandes compram, pequenos revelam e vendem (Priority: P1)

**Goal**: disposição de vender que leva destaques para clubes maiores

**Independent Test**: em simulação longa, ≥ 60% das transferências do top 10% sobem de reputação

### Tests (write first, must fail)

- [X] T019 [P] [US3] Write `packages/engine/test/market/ai/seller.test.ts`: starter is not sold to a club of equal/lower reputation; starter is sold to a club ≥ upwardMargin above; surplus/out-of-top-11 players are sold to anyone with `surplusDiscountPct` on the ask; sale never breaks minimums or the buyer's cap
- [X] T020 [P] [US3] Write `packages/engine/test/market/long-run.test.ts` (flow part, 30 seasons, 2 seeds): share of AI-to-AI transfers of top-10% players to a higher-reputation club ≥ 0.6 (SC-004); Spearman reputation × squad mean strength ≥ 0.5 at the end (SC-005); seller cash rises on each sale

### Implementation

- [X] T021 [US3] Implement `sellerAccepts` and the surplus discount in `packages/engine/src/market/ai/seller.ts` and use them in `targets.ts`/`round.ts`

**Checkpoint**: P1 completo — mercado da IA crível

---

## Phase 6: User Story 4 - Empréstimos de jovens e livres pela IA (Priority: P2)

**Goal**: jovens de potencial ganham minutos emprestados; livres cobrem carências

**Independent Test**: empréstimos de jovens entre clubes da IA na janela; livres contratados por
clubes da IA a qualquer rodada

### Tests (write first, must fail)

- [X] T022 [P] [US4] Write `packages/engine/test/market/ai/loans.test.ts`: young (≤ 21), potential ≥ 75, outside top 16 ⇒ loaned for free to a lower-reputation AI club where he would start in his position, under the cap; none when the origin lacks the position; one per club per window; returns at turnover
- [X] T023 [P] [US4] Write `packages/engine/test/market/ai/free-agents.test.ts`: club with uncovered/weak position signs the best improving free agent of that position, outside the window too; respects budget, cap and `maxFreeSigningsPerRound`; free agent leaves `market.freeAgents`

### Implementation

- [X] T024 [P] [US4] Implement `youthLoan` in `packages/engine/src/market/ai/loans.ts`
- [X] T025 [P] [US4] Implement `freeAgentFor` in `packages/engine/src/market/ai/free-agents.ts`
- [X] T026 [US4] Add loans (window only) and free-agent signings (every round) to `aiMarketRound` in `packages/engine/src/market/ai/round.ts`

---

## Phase 7: User Story 5 - Renovações e liberações por necessidade (Priority: P2)

**Goal**: renovar quem importa, liberar quem custa e não serve

**Independent Test**: viradas simuladas renovam titulares e promessas, liberam veteranos caros e
reservas, e elencos seguem válidos

### Tests (write first, must fail)

- [X] T027 [P] [US5] Write `packages/engine/test/market/ai/renewals.test.ts`: renews top-N up to renewMaxAge, minimum-coverage players and young prospects; releases ≥ 31, outside top 11 and wage above squad median; squads valid after the turnover; manager contracts untouched; wage review still applied

### Implementation

- [X] T028 [US5] Implement `aiRenewalDecision` in `packages/engine/src/market/ai/renewals.ts` and use it in `expire-contracts` in `packages/engine/src/market/turnover.ts` (replaces `aiKeeps`)

---

## Phase 8: User Story 6 - Propostas críveis pelos jogadores do humano (Priority: P2)

**Goal**: propostas ao humano vindas de necessidade e caixa reais

**Independent Test**: propostas só de clubes com a posição descoberta/fraca, que ganhariam com o
jogador e podem pagar; valores na faixa; limite de abertas

### Tests (write first, must fail)

- [X] T029 [P] [US6] Write `packages/engine/test/market/ai/offers.test.ts`: proposer has the player's position uncovered or weak and gains strength; fee in `minPct–maxPct` of value and ≤ budget; loan offers only for players outside the manager's starters; ≤ maxOpen; deterministic

### Implementation

- [X] T030 [US6] Implement `incomingOfferFor` in `packages/engine/src/market/ai/offers.ts` and use it in `marketAfterRound` in `packages/engine/src/market/incoming.ts` (replaces the random pair picking); update `packages/engine/test/market/incoming.test.ts`

---

## Phase 9: User Story 7 - Resumo das transferências da janela (Priority: P3)

**Goal**: o jogador vê as transferências relevantes de cada janela

**Independent Test**: depois que a janela fecha, a Início avisa e o Mercado mostra o resumo, com
filtro pela divisão

### Tests (write first, must fail)

- [X] T031 [P] [US7] Write `packages/engine/test/market/ai/report.test.ts`: report created when the window closes (and at turnover for the last window), entries of that window only, ordered by fee then strength, levels for the division filter, at most `keepReports` kept
- [X] T032 [P] [US7] Write `apps/web/test/flows/market-ai.test.tsx`: Início notice with link, Mercado › Resumo da janela lists highlights and the division section, dismiss hides the notice and persists `reportSeen`

### Implementation

- [X] T033 [US7] Implement `closeWindowReport`, `reportHighlights`, `reportForDivision` in `packages/engine/src/market/ai/report.ts`; call it from the career round when the window closes and from `reset-market` at turnover
- [X] T034 [US7] Add `dismissWindowReport` to `packages/save/src/market.ts` and `apps/web/src/game/GameProvider.tsx`
- [X] T035 [US7] Create `apps/web/src/ui/market/WindowReport.tsx` (tab with highlights table, division section, window selector) and add the tab to `apps/web/src/app/jogo/mercado/page.tsx`
- [X] T036 [US7] Add the report notice to `apps/web/src/ui/MarketNotice.tsx` and the Início page `apps/web/src/app/jogo/page.tsx`

---

## Phase 10: Polish & Cross-Cutting Concerns

- [X] T037 Long-run acceptance (SC-001–SC-003, SC-006): complete `packages/engine/test/market/long-run.test.ts` (valid squads and caps in every turnover, ≥ 1 AI-to-AI transfer per window, free agents ≤ 150) and run `packages/engine/test/finance/long-run.test.ts` and `packages/engine/test/renewal/long-run.test.ts` with the AI market active (pass `market` to `advanceCareer`); calibrate `DEFAULT_AI_MARKET` until all limits pass
- [X] T038 [P] Show AI-to-AI transfers per season and the upward-flow share in `tools/src/simulate-world.ts`; run `pnpm sim:world --seasons 30` and `pnpm sim:economy --seasons 30` (exit 0)
- [X] T039 [P] Performance: `packages/engine/test/market/ai/performance.test.ts` (`aiMarketRound` < 30 ms on the full world)
- [X] T040 [P] Playwright: extend `apps/web/e2e/market.spec.ts` with the window report after the window closes
- [X] T041 Update `specs/011-ia-transferencias/research.md` with calibration results and run the gates: `pnpm typecheck && pnpm lint && pnpm test`, `pnpm build:web && pnpm test:e2e`

---

## Dependencies & Execution Order

- **Setup (1)** → **Foundational (2)** → user stories.
- **US1 (3)** → **US2 (4)** (same `round.ts`) → **US3 (5)** (seller rules in targets/round).
- **US4 (6)**, **US5 (7)**, **US6 (8)** depend on Phase 2 and on `needs.ts`; US4 extends `round.ts`
  (after US2); US5 and US6 touch other files and can run in parallel with US4.
- **US7 (9)** depends on Phase 2 (reports in the state) and benefits from US2 (transfers to report).
- **Polish (10)** depends on all.

### Parallel Opportunities

- T001/T002; T003–T006; T013/T014; T019/T020; T022/T023 and T024/T025; T027, T029 and T031/T032
  in parallel after their dependencies; T038–T040.

## Parallel Example: User Story 4

```bash
Task: "loans.test.ts"   Task: "free-agents.test.ts"
Task: "market/ai/loans.ts"   Task: "market/ai/free-agents.ts"
```

## Implementation Strategy

1. Fases 1–2 (necessidades, teto, mercado na rodada, save v7) — comportamento da 010 preservado.
2. US1 → US2 → US3: mercado da IA entre clubes, crível — **parar e validar** com o teste longo.
3. US4–US6: empréstimos, livres, renovações e propostas por necessidade.
4. US7: resumo da janela. Polish: calibração final, ferramentas, desempenho, e2e.

Commits no fim, um por pacote: engine, save, i18n, web, tools, docs(specs).
