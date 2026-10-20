---

description: "Lista de tarefas da feature 012 — Carreira do técnico e diretoria"
---

# Tasks: Carreira do técnico e diretoria

**Input**: Design documents from `specs/012-carreira-tecnico/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: `board/` segue o Princípio IX (testes antes, devem falhar primeiro); o equilíbrio tem
simulação de 30 temporadas com limites declarados (Princípio V, research.md R13); save v8 com
migração e fixture (Princípio VI). Fluxos de interface com happy-dom + fake-indexeddb.

**Organization**: tarefas por user story, em ordem de prioridade (P1: US1, US2, US3, US4 → P2: US5,
US6, US7, US8 → P3: US9).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 … US9
- Caminhos relativos à raiz do repositório

## Referências rápidas

- API: `specs/012-carreira-tecnico/contracts/board-api.md`; save/telas:
  `specs/012-carreira-tecnico/contracts/save-and-ui.md`; decisões e padrões R1–R17:
  `specs/012-carreira-tecnico/research.md`; estado e invariantes:
  `specs/012-carreira-tecnico/data-model.md`
- Já existentes: `completeCareerRound`/`advanceCareer`/`CareerMarket` (`finance/round.ts`),
  `seasonTurnover`/`TURNOVER_STEP_IDS`/`DEFAULT_TURNOVER_STEPS` (`career/turnover.ts`),
  `TurnoverContext`/`TurnoverOptions` (`career/types.ts`), `isLeagueSeasonOver`/`clubDivision`
  (`career/league.ts`), `standings` (`season/standings.ts`), `clubStrength`
  (`season/credibility.ts`), `annualWageBill` (`finance/create.ts`), `ClubFinance.cash/
  seasonStartCash/inCrisis` e `FinanceState.crises` (`finance/types.ts`), `nameBankFor`
  (`renewal/names.ts`), `createRng` (`rng/xoshiro.ts`, seeds como em `market/incoming.ts`),
  `cancelNegotiation` (`market/negotiation.ts`), `marketRules`/`aiMarketRules` como modelo de
  regras com padrões, `marketSchema` (`model/schemas.ts`)
- Desempregado = `managerClubId ""` (como `tools/src/simulate-world.ts`), research.md R3
- Helpers de teste: `packages/engine/test/market/helpers.ts` (`testWorld`, `newLeague`, `SEED`,
  `MANAGER`, `YEAR`); `packages/save/test/fixtures.ts` (`validSave`, `defaultBank`, `SERIE_A`,
  `SERIE_B`); `apps/web/test/helpers/{app.tsx,career.ts}`
- Lembretes: sem `**`/`Math.pow`/transcendentais no motor; aritmética inteira; clone JSON;
  `pnpm sim:world --seasons 30` (sem `--`); antes de commitar, desfazer `apps/web/next-env.d.ts` e
  apagar `apps/web/AGENTS.md`

---

## Phase 1: Setup

- [X] T001 [P] Add pt-BR strings to `packages/i18n/locales/pt-BR/ui.json` per contracts/save-and-ui.md: `nav.career`; `newCareer.noFiring`, `newCareer.noFiringHelp`; `board.confidence` (`{value}`), `board.trend.up`/`down`/`flat`, `board.factor.*` (win, draw, loss, belowGoal, aheadOfGoal, crisis, financeGoal, seasonStart, hired — ICU with `{amount}`), `board.goal.tier.*` (title, promotion, top4, topHalf, avoidRelegation), `board.goal.position` (`{position}`), `board.goal.finance.*` (nonNegativeCash, keepCash, noCrisis), `board.goal.progress.*` (current/required, met, atRisk), `board.noFiring`, `board.evaluation.*` (title `{year}`, met, missed, decision.kept/fired/wouldFire, reputation `{before}` → `{after}`, achievement.title/promotion/relegation), `board.notice.fired` (`{club}`), `board.notice.hired` (`{club}`), `board.notice.dismiss`; `career.tab.board`/`offers`/`history`/`coaches`, `career.unemployed`, `career.reputation` (`{value}`), `career.offers.*` (empty, club, division, position, reputation, goals, expires `{rounds}` plural, accept, decline, notice `{count}` plural), `career.history.*` (stints, seasons, exit.fired/left/offerAccepted, unemployedPeriod, columns), `career.coaches.*` (columns, you)
- [X] T002 [P] Create `packages/engine/src/board/rules.ts` with `BoardRules`, `DEFAULT_BOARD` (research.md R17, goal tiers of R4) and `boardRules(world, competitionId)` merging `competition.board`; add the optional `board` object (`.partial()`, all integers) to `competitionSchema` in `packages/engine/src/model/schemas.ts`
- [X] T003 [P] Create `packages/engine/src/board/types.ts` with `BoardState`, `ManagerProfile`, `ClubBoard`, `SeasonGoals`, `GoalTierId`, `ConfidenceChange`, `ConfidenceFactor`, `GoalProgress`, `SeasonEvaluation`, `Coach`, `Vacancy`, `JobOffer`, `ManagerHistory`, `Stint`, `ManagerSeasonRecord`, `BoardNotice`, `BoardContext`, `BoardUpdate`, `BoardError` exactly as data-model.md and contracts/board-api.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: estado da diretoria criado com técnicos da IA, diretoria dentro da rodada e da virada,
desemprego como `managerClubId ""` no save, save v8

**⚠️ CRITICAL**: nenhuma história começa antes desta fase

### Tests (write first, must fail)

- [X] T004 [P] Write `packages/engine/test/board/rules.test.ts`: defaults; partial `competition.board` override merges; schema accepts and rejects out-of-range values
- [X] T005 [P] Write `packages/engine/test/board/coaches.test.ts` (creation part): `createBoard` gives every AI club a coach (name from the club country's name bank, reputation = club reputation ± 8 clamped 1–100), the manager club has `coachId: null`, ids from `nextSeq`, same seed ⇒ same state; `hireCoach` prefers the free-pool coach closest in reputation within margins, otherwise generates one; pool capped at `maxFreeCoaches` (lowest reputation leaves)
- [X] T006 [P] Write `packages/engine/test/board/round.test.ts` (plumbing part): `completeCareerRound` with `board` returns `board`; without `board` the result is deep-equal to the current one; `advanceCareer` threads `board`; `managerClubOf` returns `""` when `manager.clubId` is null and the round then treats every club as AI (lineup/market/finances)
- [X] T007 [P] Write `packages/engine/test/market/release.test.ts`: `releaseManagerClub` cancels open negotiations of the club (log outcome with reason `manager_left`) and drops its pending incoming offers; other clubs untouched
- [X] T008 [P] Write `packages/save/test/migrate-v8.test.ts` with a v7 fixture (mid-season and season-over): migration creates `board` with the current club, `initialReputation`, `noFiring: false`, coaches for the other clubs, grace until season end, goals for the season in progress (none if the league is over); `formatVersion` 8; update older migration tests' expected version

### Implementation

- [X] T009 Implement `packages/engine/src/board/coaches.ts` (coach generation, free pool, `hireCoach`) and `packages/engine/src/board/create.ts` (`createBoard` with goals left empty until US1 wires `seasonGoals`, confidence `neutral`, history with the opening stint; `managerClubOf`)
- [X] T010 Implement `releaseManagerClub` in `packages/engine/src/market/release.ts` (uses `cancelNegotiation` logic) and export it
- [X] T011 Create `packages/engine/src/board/round.ts` with `boardAfterRound(context, round)` skeleton (returns board unchanged; filled per story) and add `CareerBoard`/`board?` parameter and result to `completeCareerRound` and `advanceCareer` in `packages/engine/src/finance/round.ts` (board runs after market; when `board` is present, the effective manager club is `managerClubOf(board)` and is re-read every round of `advanceCareer`; when `managerReleased` is set, apply `releaseManagerClub` to the market)
- [X] T012 Add `board?` to `TurnoverContext`, `TurnoverOptions` and `TurnoverResult` in `packages/engine/src/career/types.ts`; create `packages/engine/src/board/turnover.ts` with `boardNewSeasonStep` (id `board-new-season`, skeleton) and register it after `reset-market` in `TURNOVER_STEP_IDS`/`DEFAULT_TURNOVER_STEPS` of `packages/engine/src/career/turnover.ts` (no-op without `board`); export the `board/` API from `packages/engine/src/index.ts`
- [X] T013 Save v8: `board: BoardState` and `SAVE_FORMAT_VERSION = 8` in `packages/save/src/format.ts`; migration v7 → v8 and `boardProblem` (data-model invariants) in `packages/save/src/migrate.ts`; `createSave` builds `board` via `createBoard` and accepts `noFiring?: boolean` in `packages/save/src/create.ts`
- [X] T014 Create `packages/save/src/board.ts` with `managedClubId(save)` and `isEmployed(save)`; use `managedClubId` wherever `save.clubId` is passed as `managerClubId` (`advanceCareerSeason` in `packages/save/src/career.ts`, `marketContextOf` in `packages/save/src/market.ts`, finance actions in `packages/save/src/finance.ts`); pass `board` to `seasonTurnover` and store `turned.board`; export from `packages/save/src/index.ts`
- [X] T015 Use the career round with `board` in `apps/web/src/game/GameProvider.tsx` (`commitRound` passes `{ state: save.board, careerSeed: save.seed }` and `managedClubId(save)`, stores `result.board`) and in `apps/web/test/helpers/career.ts`; pass `board` in `tools/src/simulate-world.ts` (created with no manager: `createBoard` accepts a missing manager club for simulations ⇒ `manager.clubId = null`)

**Checkpoint**: tudo verde, jogo igual ao atual (diretoria existe, mas sem metas, confiança fixa e sem demissões)

---

## Phase 3: User Story 1 - Metas da diretoria no início da temporada (Priority: P1) 🎯 MVP

**Goal**: cada clube recebe meta esportiva e financeira proporcionais à força, à reputação do clube e à do técnico

**Independent Test**: carreira num clube forte e num fraco da mesma divisão ⇒ meta do forte estritamente mais exigente

### Tests (write first, must fail)

- [X] T016 [P] [US1] Write `packages/engine/test/board/goals.test.ts`: `goalTiersFor` drops `promotion` in the top division and `avoidRelegation` without relegation; `expectationOf` ranks by strength + reputation; strongest club of each division gets a strictly more demanding tier than the weakest for reputations 1, 30 and 100 (SC-001); monotonic across all clubs of a division; higher manager reputation ⇒ equal or more demanding tier; mid-season formula of R5; finance kind by cash situation (R6); `goalProgress` reports current vs required and finance status
- [X] T017 [P] [US1] Write `apps/web/test/flows/board-goals.test.tsx`: new career in a big club shows a demanding goal on the Início board card, a small club shows a modest one; Carreira › Diretoria lists both goals with progress

### Implementation

- [X] T018 [US1] Implement `goalTiersFor`, `expectationOf`, `seasonGoals`, `goalProgress` in `packages/engine/src/board/goals.ts`; call `seasonGoals` from `createBoard` (all clubs; mid-season rule when `league` already started) in `packages/engine/src/board/create.ts`
- [X] T019 [US1] Generate new goals for every club in `boardNewSeasonStep` (`packages/engine/src/board/turnover.ts`) using the new world, composition and league
- [X] T020 [P] [US1] Create `apps/web/src/ui/board/GoalsList.tsx` (tier/finance label, required vs current, met/at-risk) and `apps/web/src/ui/board/BoardCard.tsx` (goals + confidence placeholder); show `BoardCard` on `apps/web/src/app/jogo/page.tsx`
- [X] T021 [US1] Create `apps/web/src/app/jogo/carreira/page.tsx` with tabs (Diretoria first; others added by later stories) and add `nav.career` to `apps/web/src/game/GameLayout.tsx`/`apps/web/src/ui/AppHeader.tsx`

**Checkpoint**: metas visíveis e coerentes; critério de aceite 1 verde

---

## Phase 4: User Story 2 - Confiança da diretoria visível e reativa (Priority: P1)

**Goal**: confiança 0–100 muda a cada rodada com resultados, metas e finanças, com motivos

**Independent Test**: sequências de vitórias/derrotas mudam a confiança no sentido certo e mostram o motivo

### Tests (write first, must fail)

- [X] T022 [P] [US2] Write `packages/engine/test/board/confidence.test.ts`: win/draw/loss parcels; below-goal penalty only from `goalCheckFromRound`, capped; ahead bonus; crisis and finance penalties; patience scaling (higher reputation loses less); clamped 0–100; three straight wins ≥ +5 (SC-007); factors listed; only the manager club keeps `recent` (max `keepRecent`)
- [X] T023 [P] [US2] Extend `apps/web/test/flows/board-goals.test.tsx` (or create `apps/web/test/flows/board-confidence.test.tsx`): after simulating rounds the board card shows the new value, trend and top-3 recent factors; Carreira › Diretoria lists the changes

### Implementation

- [X] T024 [US2] Implement `confidenceChange` in `packages/engine/src/board/confidence.ts` and apply it to every club that played in `boardAfterRound` (`packages/engine/src/board/round.ts`), clubs in id order
- [X] T025 [P] [US2] Create `apps/web/src/ui/board/ConfidenceMeter.tsx` (value, meter, trend, factors) and use it in `BoardCard.tsx` and the Diretoria tab of `apps/web/src/app/jogo/carreira/page.tsx` (list of recent changes with factors)

**Checkpoint**: confiança reage e explica

---

## Phase 5: User Story 3 - Avaliação de fim de temporada e demissão (Priority: P1)

**Goal**: avaliação no fim da temporada, demissão no meio em casos extremos, "sem demissão" respeitado

**Independent Test**: temporada muito abaixo da meta ⇒ demitido na avaliação; com "sem demissão" ⇒ `wouldFire` e permanece

### Tests (write first, must fail)

- [X] T026 [P] [US3] Write `packages/engine/test/board/firing.test.ts`: `shouldFireMidSeason` at `confidence ≤ fireThreshold` outside grace, never inside grace or before `graceUntil`; `evaluateSeason` final-confidence formula (R8), kept/fired thresholds, next-season confidence `⌊(neutral + final) / 2⌋`; `noFiring` ⇒ decision `wouldFire`, employment unchanged in mid-season and end-of-season paths (acceptance 2); achievements title/promotion/relegation from final standings
- [X] T027 [P] [US3] Extend `packages/engine/test/board/round.test.ts`: firing in a round sets `manager.clubId = null`, closes the stint with `fired`, opens a vacancy, records `firedBy`, sets the notice, returns `managerReleased`, and the market loses the manager's negotiations; the last round of the league stores `evaluation` and the manager season record; determinism with save/load (JSON round-trip) mid-season
- [X] T028 [P] [US3] Write `apps/web/test/flows/board-evaluation.test.tsx`: Fim de temporada shows the evaluation (goals, met/missed, decision, reputation before → after); a mid-season firing shows the fired notice on Início until dismissed

### Implementation

- [X] T029 [US3] Implement `shouldFireMidSeason` and `evaluateSeason` in `packages/engine/src/board/evaluation.ts`; reputation delta stubbed to 0 until US5
- [X] T030 [US3] In `boardAfterRound` (`packages/engine/src/board/round.ts`): mid-season firing of the manager (unless `noFiring`), end-of-season evaluation for the manager club when `isLeagueSeasonOver`, vacancy creation, AI vacancy filling after `vacancyRounds` via `hireCoach`; in `packages/engine/src/board/history.ts` close/open stints and append the manager season record
- [X] T031 [US3] In `boardNewSeasonStep`: starting confidence from the evaluation, clear `evaluation`, fill remaining vacancies (`packages/engine/src/board/turnover.ts`)
- [X] T032 [US3] Save/provider: when the round releases the manager, keep `save.clubId` as last club and clear `lineupNotice` in `apps/web/src/game/GameProvider.tsx`; add `dismissBoardNotice` to `packages/save/src/board.ts` and the provider
- [X] T033 [P] [US3] Create `apps/web/src/ui/board/Evaluation.tsx` and show it on `apps/web/src/app/jogo/fim-de-temporada/page.tsx`; create `apps/web/src/ui/board/BoardNotice.tsx` (fired/hired) and show it on `apps/web/src/app/jogo/page.tsx`

**Checkpoint**: demissão e avaliação funcionam; critério de aceite 2 verde no motor

---

## Phase 6: User Story 4 - Desemprego e recomeço no mesmo save (Priority: P1)

**Goal**: demitido, o jogador segue no mesmo save, recebe propostas e assume um novo clube

**Independent Test**: demissão → rodadas desempregado → aceitar proposta → jogar com o novo clube

### Tests (write first, must fail)

- [X] T034 [P] [US4] Write `packages/engine/test/board/offers.test.ts` (unemployed part): `compatibleClub` by reputation margins; offer created for a compatible new vacancy (chance via rng), max `maxOpenOffers`, never from the club that fired him that season; expiry after `offerRounds` and vacancy then filled by AI; `acceptJobOffer` hires from the next round (or new season after the last round), discards other offers, sets mid-season goals and `neutral` confidence, restarts grace, opens a stint, sets the hired notice; `declineJobOffer`; guarantee at turnover (FR-030, SC-006): unemployed with no offer since firing gets one, and that club fires its coach
- [X] T035 [P] [US4] Write `packages/save/test/board.test.ts`: `acceptManagerOffer` sets `clubId`, new `initialLineup`, clears `lineupNotice`, sets the formation in the season, market released for the previous club; `declineManagerOffer`; a full flow fired → rounds → accept → one complete season played without errors (acceptance 3, SC-003)
- [X] T036 [P] [US4] Write `apps/web/test/flows/board-unemployed.test.tsx`: after firing, header shows "Sem clube", Elenco/Escalação/Finanças/Mercado are hidden and redirect to Início, rounds can be simulated without a lineup, offers appear on the Sem clube panel, accepting switches club and restores the navigation

### Implementation

- [X] T037 [US4] Implement offer generation/expiry, `compatibleClub`, `acceptJobOffer`, `declineJobOffer` in `packages/engine/src/board/offers.ts`; call generation/expiry from `boardAfterRound` and the guarantee from `boardNewSeasonStep`; `acceptJobOffer` calls `releaseManagerClub` for the previous club
- [X] T038 [US4] Add `acceptManagerOffer` and `declineManagerOffer` to `packages/save/src/board.ts` (uses `initialLineup`, `withManagerFormation`)
- [X] T039 [US4] Provider: `acceptJobOffer`/`declineJobOffer` actions; `playRound` skips lineup validation and sends no manager lineup when unemployed in `apps/web/src/game/GameProvider.tsx`
- [X] T040 [US4] Unemployed UI: create `apps/web/src/ui/board/JobOffers.tsx` (offer cards with club, division, position, reputation, goals, deadline, accept/decline); Sem clube panel on `apps/web/src/app/jogo/page.tsx`; Propostas tab in `apps/web/src/app/jogo/carreira/page.tsx`; hide club screens and show "Sem clube" in `apps/web/src/game/GameLayout.tsx`/`apps/web/src/ui/AppHeader.tsx`; redirect from `apps/web/src/app/jogo/{elenco,escalacao,financas,mercado}/page.tsx` when `!isEmployed(save)`; highlight `managedClubId` (not the old club) in `apps/web/src/ui/LiveGrid.tsx`/`StandingsTable.tsx` — *feito na Início (resultados da rodada)*; Classificação e rodada ao vivo continuam destacando o clube em foco (último clube), o que serve de referência para o desempregado

**Checkpoint**: critério de aceite 3 verde; carreira nunca trava

---

## Phase 7: User Story 5 - Reputação do técnico (Priority: P2)

**Goal**: reputação sobe com sucesso e cai com fracasso, definindo metas, paciência e propostas

**Independent Test**: temporadas cumprindo/descumprindo metas mudam a reputação; propostas de clubes maiores aparecem com ela

### Tests (write first, must fail)

- [X] T041 [P] [US5] Write `packages/engine/test/board/reputation.test.ts`: `reputationDelta` per R9 (met + difficulty, miss by positions, title ×2 in the top division, promotion, relegation, finance ±1, firing with downside), clamped 1–100; evaluation stores before/after; firing mid-season applies the penalty; AI coaches use the same function

### Implementation

- [X] T042 [US5] Implement `reputationDelta` in `packages/engine/src/board/reputation.ts`; apply it in `evaluateSeason`/`boardAfterRound` (manager and AI coaches) and on mid-season firing; store reputation in the manager season record
- [X] T043 [P] [US5] Show reputation on the board card, the Sem clube panel and Carreira › Diretoria (`apps/web/src/ui/board/BoardCard.tsx`, `apps/web/src/app/jogo/carreira/page.tsx`)

---

## Phase 8: User Story 6 - Propostas com o técnico empregado (Priority: P2)

**Goal**: clubes maiores com vaga chamam o técnico empregado, inclusive no meio da temporada

**Independent Test**: com boa reputação, uma demissão na IA gera proposta; aceitar troca de clube, recusar não muda a confiança

### Tests (write first, must fail)

- [X] T044 [P] [US6] Extend `packages/engine/test/board/offers.test.ts`: employed manager only gets offers from clubs with reputation above the current club; declining keeps confidence unchanged (FR-028); never from the current club; accepting mid-season releases the old club (vacancy filled by AI at once), market negotiations of the old club cancelled
- [X] T045 [P] [US6] Write `apps/web/test/flows/board-offers.test.tsx`: offers notice on Início with count, Propostas tab accept/decline; after accepting, Início shows the new club and its goals

### Implementation

- [X] T046 [US6] Employed-offer rule (ascent filter) in `packages/engine/src/board/offers.ts`; old club gets an AI coach immediately on accept
- [X] T047 [P] [US6] Offers notice on `apps/web/src/app/jogo/page.tsx` (reuse `JobOffers.tsx` summary)

---

## Phase 9: User Story 7 - Opção "sem demissão" ao criar a carreira (Priority: P2)

**Goal**: opção escolhida na criação, gravada e visível

**Independent Test**: carreira criada com a opção ⇒ nunca demitido, opção indicada

### Tests (write first, must fail)

- [X] T048 [P] [US7] Extend `packages/save/test/create.test.ts` (`noFiring` stored, default false) and `apps/web/test/flows/new-career.test.tsx` (checkbox unchecked by default with help text; checked ⇒ `board.manager.noFiring`, indicator shown in Carreira › Diretoria; offers still acceptable)

### Implementation

- [X] T049 [US7] Add the "Sem demissão" checkbox to `apps/web/src/app/nova-carreira/page.tsx` and `noFiring` to `createCareer` in `apps/web/src/game/GameProvider.tsx`; show the indicator in Carreira › Diretoria and the board card

---

## Phase 10: User Story 8 - Clubes da IA trocam de técnico (Priority: P2)

**Goal**: clubes da IA que vão mal demitem e contratam técnicos

**Independent Test**: simulação sem interação mostra trocas concentradas em clubes abaixo do esperado

### Tests (write first, must fail)

- [X] T050 [P] [US8] Extend `packages/engine/test/board/coaches.test.ts`: AI club below expectation with confidence ≤ threshold may fire (rng `aiFireChancePct`), never inside grace or when at/above goal; end-of-season AI evaluation fires below `endFireThreshold`; fired coach goes to the pool; vacancy filled within `vacancyRounds` unless offered to the manager
- [X] T051 [P] [US8] Write `apps/web/test/flows/board-coaches.test.tsx`: Carreira › Técnicos lists every club of the division with coach name and reputation, the player highlighted

### Implementation

- [X] T052 [US8] AI mid-season firing and end-of-season evaluation for every AI club in `packages/engine/src/board/round.ts` (same `evaluation.ts` rules + rng), vacancies feeding offers
- [X] T053 [P] [US8] Create `apps/web/src/ui/board/CoachesTable.tsx` and the Técnicos tab (division selector) in `apps/web/src/app/jogo/carreira/page.tsx`

---

## Phase 11: User Story 9 - Histórico do técnico (Priority: P3)

**Goal**: passagens, temporadas, conquistas e reputação ao longo da carreira

**Independent Test**: carreira com troca de clube mostra as duas passagens e as temporadas

### Tests (write first, must fail)

- [X] T054 [P] [US9] Write `packages/engine/test/board/history.test.ts`: stints open/close on hire, firing, accepted offer and unemployment periods (`clubId: null`); one season record per club coached in the season, only the final one evaluated; unemployed season record
- [X] T055 [P] [US9] Write `apps/web/test/flows/board-history.test.tsx`: Carreira › Histórico shows stints with periods and exit reason, seasons with division/position/goals/achievements/decision and reputation per season

### Implementation

- [X] T056 [US9] Complete `packages/engine/src/board/history.ts` (unemployed period, mid-season switch records) and call it from `round.ts`, `offers.ts` and `turnover.ts`
- [X] T057 [P] [US9] Create `apps/web/src/ui/board/ManagerHistory.tsx` and the Histórico tab in `apps/web/src/app/jogo/carreira/page.tsx`

---

## Phase 12: Polish & Cross-Cutting Concerns

- [X] T058 Long-run acceptance (R13, SC-002, SC-004–SC-006): `packages/engine/test/board/long-run.test.ts` — 30 seasons, 2 seeds, market + board, no manager: 5%–35% AI coach changes per season, ≥ 70% in clubs below expectation, no vacancy older than `vacancyRounds + offerRounds`, free pool ≤ `maxFreeCoaches`; bot scenarios (auto lineup): `noFiring` in a weak club never fired in 10 seasons; small Série B club bot gets an offer from a higher-reputation club in ≤ 10 seasons for most seeds of a fixed set; unemployed gets an offer by the next turnover in 100% of cases; calibrate `DEFAULT_BOARD` until all limits pass and re-run `packages/engine/test/market/long-run.test.ts`, `packages/engine/test/finance/long-run.test.ts`, `packages/engine/test/renewal/long-run.test.ts`
- [X] T059 [P] Show coach changes per season and the share below expectation in `tools/src/simulate-world.ts`; run `pnpm sim:world --seasons 30` and `pnpm sim:economy --seasons 30` (exit 0)
- [X] T060 [P] Performance: `packages/engine/test/board/performance.test.ts` (`boardAfterRound` < 10 ms on the full world; turnover still < 2 s)
- [X] T061 [P] Playwright `apps/web/e2e/career-board.spec.ts`: new career → board card with goals → simulate to a firing (seeded career with a forced low confidence via a v8 fixture import) → Sem clube → accept offer → play a round with the new club — *feito*: criação com "Sem demissão", metas, confiança após rodadas e abas da Carreira; o fluxo de demissão → proposta → novo clube fica nos testes de fluxo (`apps/web/test/flows/board.test.tsx`) e do save (`packages/save/test/board.test.ts`), porque o app ainda não importa saves (M6) e uma demissão pela interface depende da seed
- [X] T062 [P] Check `apps/web/test/i18n/no-literals.test.ts` passes with the new components
- [X] T063 Update `specs/012-carreira-tecnico/research.md` with calibration results and run the gates: `pnpm typecheck && pnpm lint && pnpm test`, `pnpm build:web && pnpm test:e2e`

---

## Dependencies & Execution Order

- **Setup (1)** → **Foundational (2)** → user stories.
- **US1 (3)** → **US2 (4)** (confidence uses goal progress) → **US3 (5)** (firing uses confidence and goals).
- **US4 (6)** depends on US3 (firing creates unemployment and vacancies).
- **US5 (7)** depends on US3 (evaluation); **US6 (8)** depends on US4 (`offers.ts`);
  **US7 (9)** depends on Phase 2 (engine `noFiring` handling is in US3) and can run in parallel with US5/US6;
  **US8 (10)** depends on US3 (evaluation rules) and feeds US4/US6 offers.
- **US9 (11)** depends on US3/US4 (stints and season records).
- **Polish (12)** depends on all.

### Parallel Opportunities

- T001–T003; T004–T008; within each story the engine test and the UI flow test ([P]); UI
  components ([P]) once their engine task is done; US5, US7 and US8 in parallel after US4;
  T059–T062.

## Parallel Example: User Story 3

```bash
Task: "firing.test.ts"   Task: "round.test.ts (firing)"   Task: "board-evaluation.test.tsx"
# depois de T029–T031:
Task: "ui/board/Evaluation.tsx + BoardNotice.tsx"
```

## Implementation Strategy

1. Fases 1–2 (tipos, regras, técnicos da IA, diretoria na rodada e na virada, save v8,
   `managedClubId`) — jogo igual ao atual.
2. US1 → US2 → US3 → US4: metas, confiança, demissão e desemprego — **parar e validar** os três
   critérios de aceite.
3. US5–US8: reputação, propostas empregado, opção na criação, trocas de técnico da IA.
4. US9: histórico. Polish: calibração com o teste longo, ferramentas, desempenho, e2e.

Commits no fim, um por pacote: engine, save, i18n, web, tools, docs(specs).
