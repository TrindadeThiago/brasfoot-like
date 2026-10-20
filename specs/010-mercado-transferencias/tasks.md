---

description: "Lista de tarefas da feature 010 — contratos e mercado de transferências"
---

# Tasks: Contratos e mercado de transferências

**Input**: Design documents from `specs/010-mercado-transferencias/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: o módulo `market/` segue o Princípio IX (testes antes, devem falhar primeiro); os
testes de longo prazo da 008/009 rodam com contratos e ganham o limite de livres (Princípio V,
research.md R11); o save v6 vem com migração e fixtures (Princípio VI). Fluxos de interface com
happy-dom + fake-indexeddb e um Playwright do fluxo de compra.

**Organization**: tarefas agrupadas por user story, em ordem de prioridade (P1: US1, US2, US3, US6
→ P2: US4, US5, US7).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 … US7
- Caminhos relativos à raiz do repositório

## Referências rápidas

- API do motor: `specs/010-mercado-transferencias/contracts/market-api.md`
- Save v6, provider, telas, i18n: `specs/010-mercado-transferencias/contracts/save-and-ui.md`
- Tipos e regras padrão: `specs/010-mercado-transferencias/data-model.md`; decisões R1–R14:
  `specs/010-mercado-transferencias/research.md`
- Já existentes no motor: `deriveWage`/`deriveMarketValue` (`derived/economy.ts`),
  `annualWageBill`/`sponsorshipFor` (`finance/create.ts`), `post`/`draft` (`finance/ledger.ts`),
  `LEDGER_CATEGORIES` (`finance/types.ts`), `economyRules` (`finance/rules.ts`, padrão para
  `marketRules`), `completeCareerRound`/`advanceCareer` (`finance/round.ts`), `midSeasonRound`
  (`renewal/evolution.ts`), `SQUAD_RULES`/`squadProblems`/`balanceSquads` (`renewal/rules.ts`,
  `renewal/squads.ts`), `generateYouth` (`renewal/youth.ts`), etapas da 009 em
  `renewal/turnover.ts`, `seasonTurnover` + `DEFAULT_TURNOVER_STEPS`/`TURNOVER_STEP_IDS`
  (`career/turnover.ts`), `TurnoverContext`/`TurnoverOptions`/`TurnoverResult`
  (`career/types.ts`), `leagueRound` (`career/league.ts`), `createRng` (`rng/xoshiro.ts`),
  `ageOn`/`seasonDate` (`calendar/date.ts`), `playerSchema`/`competitionSchema`/`economySchema`
  (`model/schemas.ts`)
- Helpers de teste: `packages/engine/test/career/helpers.ts`, `packages/engine/test/finance/helpers.ts`
- Save: `format.ts`, `create.ts`, `migrate.ts` (`MIGRATIONS`), `career.ts` (`advanceCareerSeason`,
  `withAdjustedLineup`), `finance.ts` (padrão de wrappers), fixtures `packages/save/test/fixtures.ts`
- App: `GameProvider` (ações e `commitRound`), `ui/AppHeader.tsx` (`GAME_SCREENS`),
  `game/GameLayout.tsx` (atalhos), `ui/DataTable.tsx`, `ui/Dialog.tsx`, `ui/PlayerDetails.tsx`,
  `ui/SquadChangeNotice.tsx` (padrão de cartão), `ui/FinanceTables.tsx`, `formatMoney`
- Lembretes: sem `**`/`Math.pow`/transcendentais no motor; sem `structuredClone` no motor (clone
  JSON); `pnpm validate-bank $PWD/mods/default`; `pnpm sim:world --seasons 30` (sem `--`)

---

## Phase 1: Setup

- [X] T001 [P] Add the pt-BR strings to `packages/i18n/locales/pt-BR/ui.json` per contracts/save-and-ui.md §i18n: `nav.market`, `market.tab.*` (search, compare, negotiations, incoming, contracts), `market.filter.*`, `market.col.*` (value, wage, until, club, free, onLoan), `market.window.open` (`{round}`), `market.window.closed` (`{round}`), `market.window.nextSeason`, `market.stage.*` (club_offer, club_countered, contract, player_demanded), `market.response.*` (accepted, countered `{fee}`, refused, demanded `{wage}`), `market.action.*` (offer, loan, sign, renew, accept, refuse, counter, propose, cancel, compare), `market.form.*` (fee, wage, years), `market.incoming.*` (title, expires `{round}`), `market.notice.*` (title, offers `{count}`, expiring `{count}`), `market.log.*`, `finance.category.transfer_purchase`, `finance.category.transfer_sale`, `col.contractUntil`, `squad.lastYear`, `squad.onLoan`; and in `packages/i18n/locales/pt-BR/errors.json` `market.window_closed` (`{round}`), `market.insufficient_cash` (`{needed}`), `market.squad_full`, `market.squad_minimum`, `market.player_on_loan`, `market.already_negotiating`, `market.invalid_duration` (`{min}`, `{max}`), `market.invalid_amount`, `market.not_found`, `market.invalid_stage`, `market.reason.no_interest`, `market.reason.low_wage`, `market.reason.low_offer`, `market.reason.key_player`, `market.reason.squad_minimum`
- [X] T002 [P] Create the `market/` module skeleton: `packages/engine/src/market/types.ts` with `Contract`, `FreeAgent`, `NegotiationKind`, `NegotiationStage`, `Negotiation`, `IncomingOffer`, `TransferRecord`, `MarketState`, `MarketRules`, `MarketContext`, `MarketUpdate`, `MarketResult`, `MarketError`, `ClubResponse`, `PlayerResponse`, `PlayerFilters`, `MarketRow` exactly as in data-model.md and contracts/market-api.md, plus `emptyMarket()` and `marketError(code, params)`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: contrato no jogador, regras do mercado como dados, folha contratual, categorias de
transferência, mercado passando pela virada, save v6

**⚠️ CRITICAL**: nenhuma história começa antes desta fase

### Tests (write first, must fail)

- [X] T003 [P] Write `packages/engine/test/market/rules.test.ts`: `marketRules` without `competition.market` equals `DEFAULT_MARKET`; partial overrides merge field by field; `playerSchema` accepts players with and without `contract`, rejects negative `wage` and `loan.fromClubId` equal to `clubId` (via `validateBank`); `competitionSchema` accepts `market.windows`
- [X] T004 [P] Write `packages/engine/test/market/contracts.test.ts`: `initialContract` wage equals `deriveWage`; duration by age band (≤21: 3–5, 22–29: 2–4, 30–32: 1–2, ≥33: 1) per R3; `ensureContracts` only fills missing contracts, keeps existing ones, is deterministic for the same seed and different for another; `isLastYear`
- [X] T005 [P] Write `packages/engine/test/finance/contract-wages.test.ts`: `annualWageBill` uses `contract.wage` when present (fallback `deriveWage`), counts loaned-in players for the borrowing club; with `ensureContracts` on a new world the bill equals the 008 bill exactly; `LEDGER_CATEGORIES` includes `transfer_purchase`/`transfer_sale` and `summarizeSeason` totals include them

### Implementation

- [X] T006 Add optional `contract` (`{ wage: int ≥ 0, untilYear: int, loan?: { fromClubId: id, untilYear: int } }`) to `playerSchema` and optional `market` (windows `[{fromRound,toRound}]` and the rule groups of data-model.md, all optional) to `competitionSchema` in `packages/engine/src/model/schemas.ts`; reference checks for `loan.fromClubId` in the bank validator; update `packages/engine/src/model/types.ts` if types are hand-written
- [X] T007 Implement `DEFAULT_MARKET` and `marketRules(world, competitionId)` in `packages/engine/src/market/rules.ts` (same merge pattern as `economyRules`)
- [X] T008 Implement `initialContract`, `ensureContracts`, `isLastYear`, `contractYearsRange(age, rules)` in `packages/engine/src/market/contracts.ts` (PRNG per seed + year + player id; only integer arithmetic)
- [X] T009 Add `transfer_purchase` and `transfer_sale` to `LEDGER_CATEGORIES` in `packages/engine/src/finance/types.ts`; make `annualWageBill` in `packages/engine/src/finance/create.ts` sum `player.contract?.wage ?? deriveWage(...)`; fix every exhaustive `Record<LedgerCategory, …>` (summary, tests helpers) in `packages/engine/src/finance/summary.ts`
- [X] T010 Make `generateYouth` in `packages/engine/src/renewal/youth.ts` give each youth an `initialContract` (rookie: 3 seasons) and make `balanceSquads` in `packages/engine/src/renewal/squads.ts` return the released players' full records (`releasedPlayers`) besides the refs; extend `packages/engine/test/renewal/youth.test.ts` and `squads.test.ts`
- [X] T011 Add `market?: MarketState` to `TurnoverContext`, `TurnoverOptions` and `TurnoverResult` in `packages/engine/src/career/types.ts` and thread it through `seasonTurnover` in `packages/engine/src/career/turnover.ts`; reserve the ids `return-loans`, `expire-contracts`, `age-out-free-agents`, `reset-market` in `TURNOVER_STEP_IDS` in the order of R12 (steps implemented in US6/US5/US7; until then they are no-ops)
- [X] T012 Export the market types, `DEFAULT_MARKET`, `marketRules`, `initialContract`, `ensureContracts`, `isLastYear`, `emptyMarket` from `packages/engine/src/index.ts`
- [X] T013 Save v6 in `packages/save/src/format.ts` (`formatVersion: 6`, `market` schema, players with contract) and `packages/save/src/create.ts` (`ensureContracts` on the initial world, `emptyMarket()`); migration v5 → v6 in `packages/save/src/migrate.ts` (contracts from the save seed, empty market, `transfer_*` = 0 in old `finances.seasons[].totals`); `advanceCareerSeason` in `packages/save/src/career.ts` passes and stores `market`
- [X] T014 [P] Add v5 fixtures to `packages/save/test/fixtures.ts` and write `packages/save/test/migrate-v6.test.ts` (every player gets a contract, determinism, chain v1 → v6 valid, SC-008); update `packages/save/test/create.test.ts` and `migrate.test.ts`
- [X] T015 Regenerate nothing in `mods/default` (contract is optional) but run `pnpm validate-bank $PWD/mods/default` and `pnpm test` to confirm the 008/009 suites (including `finance/long-run.test.ts` and `renewal/long-run.test.ts`) stay green with contract wages

**Checkpoint**: contratos existem e pagam a folha; save v6 abre saves antigos

---

## Phase 3: User Story 1 - Buscar e comparar jogadores (Priority: P1) 🎯 MVP

**Goal**: buscar jogadores de todos os clubes e livres com filtros, ordenar e comparar 2–4

**Independent Test**: filtros combinados retornam só jogadores que atendem a todos; comparação de
três mostra os campos lado a lado; nenhum atributo oculto aparece

### Tests (write first, must fail)

- [X] T016 [P] [US1] Write `packages/engine/test/market/value.test.ts`: `marketValue` = `deriveMarketValue` × 60% (last year) / 85% (two years) / 100% (3+); loaned player valued by its parent contract; free agent = 0
- [X] T017 [P] [US1] Write `packages/engine/test/market/windows.test.ts`: default windows `{0,3}` and `{m−1,m+2}` with `m = midSeasonRound`; `isWindowOpen` by `leagueRound`; mod windows respected; `nextWindowRound` returns the next `fromRound` or `undefined` after the last window
- [X] T018 [P] [US1] Write `packages/engine/test/market/search.test.ts`: each filter alone and combined; scope `free`/`clubs`/`all`; `excludeClubId`; sort asc/desc by value and strength keeps filters; rows never contain `hidden`, potential, temperament or injury proneness; `comparePlayers` accepts 2–4 ids only

### Implementation

- [X] T019 [P] [US1] Implement `marketValue` in `packages/engine/src/market/value.ts`
- [X] T020 [P] [US1] Implement `transferWindows`, `isWindowOpen`, `nextWindowRound` in `packages/engine/src/market/windows.ts`
- [X] T021 [US1] Implement `searchPlayers` and `comparePlayers` in `packages/engine/src/market/search.ts` (bank players + `market.freeAgents`, visible attributes only, stable tie-break by id) and export from `packages/engine/src/index.ts`
- [X] T022 [US1] Add `marketContextOf(save)` to new `packages/save/src/market.ts` and export from `packages/save/src/index.ts`
- [X] T023 [US1] Add the **Mercado** screen to `GAME_SCREENS` in `apps/web/src/ui/AppHeader.tsx` and shortcut `m` in `apps/web/src/game/GameLayout.tsx` (update `ui/ShortcutsHelp.tsx`)
- [X] T024 [P] [US1] Create `apps/web/src/ui/market/MarketFilters.tsx` (position, strength min/max, age min/max, max value, max wage, contract until, scope, text; `noValidate` form) and `apps/web/src/ui/market/MarketTable.tsx` (sortable `DataTable`, row selection up to 4, money via `formatMoney`)
- [X] T025 [P] [US1] Create `apps/web/src/ui/market/ComparePanel.tsx` (2–4 columns side by side) and `apps/web/src/ui/market/WindowStatus.tsx` (open until round N / closed, opens at round N / next season)
- [X] T026 [US1] Create `apps/web/src/app/jogo/mercado/page.tsx` with tabs Buscar and Comparar using the components above and `searchPlayers` on the save's market context
- [X] T027 [US1] Write `apps/web/test/flows/market.test.tsx` (search part): open Mercado via header and `m`, filter, sort, select three and compare, free-agent scope, window status text

**Checkpoint**: busca e comparação funcionam sozinhas

---

## Phase 4: User Story 2 - Comprar jogador de outro clube (Priority: P1)

**Goal**: oferta na janela → aceita/recusa/uma contraproposta → aceitar/recusar → contrato → efeitos

**Independent Test**: oferta abaixo do valor recebe contraproposta; aceitá-la leva ao contrato;
concluída, caixas e elencos mudam e a soma de caixa é igual; fora da janela a oferta é bloqueada

### Tests (write first, must fail)

- [X] T028 [P] [US2] Write `packages/engine/test/market/club-response.test.ts`: `askingPrice` = value × importance (125% top-11) × noise 95–110% stable within the window; offer ≥ ask → accepted, ≥ 70% → countered at ask (rounded to 1.000), else refused `low_offer`; sale that breaks the seller's 009 minima → refused `squad_minimum`; deterministic
- [X] T029 [P] [US2] Write `packages/engine/test/market/squad.test.ts`: `canAddPlayer` respects `SQUAD_RULES` max; `canRemovePlayer` respects total and per-position minima (GK coverage)
- [X] T030 [P] [US2] Write `packages/engine/test/market/effects.test.ts` (purchase part): `completeTransfer` moves `clubId`, sets the new contract, posts `transfer_purchase` −fee and `transfer_sale` +fee in the current round, total cash of all clubs unchanged (SC-004), squad limits enforced (SC-005), insufficient cash rejected, `departed` lists players leaving the manager's club
- [X] T031 [P] [US2] Write `packages/engine/test/market/negotiation.test.ts` (club part): outside the window `buy` returns `market.window_closed` with `opensAtRound` (SC-001); one open negotiation per player; `answerClubCounter` only valid in `club_countered`; any second counter attempt is `market.invalid_stage`; enumerate every path and assert ≤ 1 counter per side (SC-002); refusal closes and logs the outcome

### Implementation

- [X] T032 [P] [US2] Implement `canAddPlayer`/`canRemovePlayer` in `packages/engine/src/market/squad.ts` using `SQUAD_RULES`
- [X] T033 [P] [US2] Implement `askingPrice`, `respondToOffer`, `respondToCounter` (also `maxBid` used by US4) in `packages/engine/src/market/club-response.ts`
- [X] T034 [US2] Implement `completeTransfer` in `packages/engine/src/market/effects.ts` (JSON clone; ledger via `draft`/`post`; log `TransferRecord`)
- [X] T035 [US2] Implement `startNegotiation` (`buy`), `answerClubCounter`, `cancelNegotiation` and the stage machine of R8 in `packages/engine/src/market/negotiation.ts` (contract stage handed to US3; until US3 lands, tests stop at `contract`) and export from `packages/engine/src/index.ts`
- [X] T036 [US2] Add `startManagerNegotiation`, `answerManagerClubCounter`, `cancelManagerNegotiation` to `packages/save/src/market.ts`, applying `withAdjustedLineup` for `departed`; tests in `packages/save/test/market.test.ts`
- [X] T037 [US2] Add `startNegotiation`, `answerClubCounter`, `cancelNegotiation` to `apps/web/src/game/GameProvider.tsx` (errors → `errors.json`)
- [X] T038 [US2] Create `apps/web/src/ui/market/NegotiationPanel.tsx` (stage, values, only valid actions, refusal reason, `Esc` closes) and the Negociações tab in `apps/web/src/app/jogo/mercado/page.tsx`; "Fazer oferta" from the table and from `apps/web/src/ui/PlayerDetails.tsx`
- [X] T039 [US2] Add rows "Compras de jogadores"/"Vendas de jogadores" to `apps/web/src/ui/FinanceTables.tsx`
- [X] T040 [US2] Extend `apps/web/test/flows/market.test.tsx`: offer → counter → accept → (contract step after US3) ; closed window shows the error with the next window round

**Checkpoint**: acordo com o clube funciona; a conclusão depende do contrato (US3)

---

## Phase 5: User Story 3 - Negociar contrato com o atleta (Priority: P1)

**Goal**: proposta de salário e duração → aceita/recusa/um pedido → aceitar/recusar; interesse por
reputação e divisão

**Independent Test**: proposta abaixo da pedida gera pedido; aceitar conclui a compra; atleta muito
acima do nível do clube recusa por falta de interesse

### Tests (write first, must fail)

- [X] T041 [P] [US3] Write `packages/engine/test/market/player-response.test.ts`: attraction `A = reputation + divisionBonus`, demand `E = 2 × (strength − 50)` clamped [0, 90]; `A < E − 25` → refused `no_interest`; wage demand = `deriveWage(new club) × (100 + max(0, E − A))%` × noise 95–105%; renewal demand ≥ current wage; offer ≥ demand → accepted, ≥ 80% → demanded, else refused `low_wage`; deterministic
- [X] T042 [P] [US3] Extend `packages/engine/test/market/negotiation.test.ts` (contract part): invalid duration (outside [1,5], veterans ≥ 33 outside [1,2]) → `market.invalid_duration` before any response; `answerPlayerDemand` only in `player_demanded`; player refusal after a club agreement moves no money (SC-002 paths now complete through conclusion); conclusion revalidates window, cash and squad

### Implementation

- [X] T043 [P] [US3] Implement `attraction`, `wageDemand`, `respondToContract` in `packages/engine/src/market/player-response.ts`
- [X] T044 [US3] Implement `proposeContract` and `answerPlayerDemand` in `packages/engine/src/market/negotiation.ts`, calling `completeTransfer` on acceptance for `buy`
- [X] T045 [US3] Add `proposeManagerContract`, `answerManagerPlayerDemand` to `packages/save/src/market.ts` (+ tests) and `proposeContract`, `answerPlayerDemand` to `apps/web/src/game/GameProvider.tsx`
- [X] T046 [US3] Add the contract form (wage, years) and demand answer to `apps/web/src/ui/market/NegotiationPanel.tsx`; show `no_interest`/`low_wage` reasons
- [X] T047 [US3] Complete the purchase flow in `apps/web/test/flows/market.test.tsx`: offer → counter → accept → contract → demand → accept → player in Elenco, Finanças shows the purchase; and a `no_interest` refusal

**Checkpoint**: compra completa (US1 + US2 + US3) — MVP jogável

---

## Phase 6: User Story 6 - Renovar contratos e contratos terminando (Priority: P1)

**Goal**: avisar contratos no último ano, renovar a qualquer momento; não renovados viram livres na
virada; IA renova pela regra

**Independent Test**: renovar um atleta e deixar outro expirar; após a virada o renovado continua e
o outro está entre os livres

### Tests (write first, must fail)

- [X] T048 [P] [US6] Write `packages/engine/test/market/renewal.test.ts`: `startNegotiation({kind:"renew"})` starts at `contract`, allowed outside the window; accepted renewal sets new `wage`/`untilYear`; refused keeps the current contract
- [X] T049 [P] [US6] Write `packages/engine/test/market/turnover.test.ts` (contracts part): `expire-contracts` turns the manager's unrenewed expiring players into free agents with `lastClubId`/`sinceYear` (SC-003); renewed stays; AI clubs renew players ≤ 31 among their top 18 or needed for position minima, others become free; without `context.market` expired players leave like in 009; step order matches R12

### Implementation

- [X] T050 [US6] Implement `renew` in `startNegotiation`/`proposeContract` (contract effect only) in `packages/engine/src/market/negotiation.ts` and `completeRenewal` in `packages/engine/src/market/effects.ts`
- [X] T051 [US6] Implement `toFreeAgent` in `packages/engine/src/market/free-agents.ts` and the `expire-contracts` step (with AI renewal rule of R10) in `packages/engine/src/market/turnover.ts`; register it in `DEFAULT_TURNOVER_STEPS` in `packages/engine/src/career/turnover.ts`
- [X] T052 [US6] Make the `balance-squads` step in `packages/engine/src/renewal/turnover.ts` push `releasedPlayers` into `context.market.freeAgents` when the market exists
- [X] T053 [US6] Create `apps/web/src/ui/market/ContractsTab.tsx` (squad with wage, until, value, last-year highlight, Renovar) and add the Contratos tab to `apps/web/src/app/jogo/mercado/page.tsx`
- [X] T054 [P] [US6] Add the "Contrato até" column with last-year/on-loan marks to `apps/web/src/app/jogo/elenco/page.tsx`
- [X] T055 [P] [US6] Create `apps/web/src/ui/MarketNotice.tsx` (Início card: open offers and expiring contracts, links to Mercado) and mount it in the Início page `apps/web/src/app/jogo/page.tsx`
- [X] T056 [US6] Extend `packages/save/test/career.test.ts` (turnover stores free agents, renewed player stays) and `apps/web/test/flows/market.test.tsx` (renew from Contratos; after the turnover the unrenewed player is free)

**Checkpoint**: contratos têm consequência na virada

---

## Phase 7: User Story 4 - Propostas pelos meus jogadores (Priority: P2)

**Goal**: na janela, a IA faz propostas pelos jogadores do usuário; aceitar, recusar ou
contrapropor uma vez

**Independent Test**: simular rodadas na janela até chegar uma proposta; contrapropor e ver a
resposta final; aceitar outra e conferir caixa e elenco

### Tests (write first, must fail)

- [X] T057 [P] [US4] Write `packages/engine/test/market/incoming.test.ts`: `marketAfterRound` generates offers only with the window open (chance 20%, ≤ 3 open, buyer would start the player and affords fee + 6 months of wages, fee 85–110% of value), expires offers at window close or after 3 rounds, expires club negotiations when the window closes; `answerIncomingOffer` accept sells (cash, squad, `departed`, SC-004/SC-005), refuse removes, counter answered once with accepted (≤ `maxBid`) or refused and no second counter

### Implementation

- [X] T058 [US4] Implement `generateIncomingOffers`, `expireOffers`, `marketAfterRound`, `answerIncomingOffer` in `packages/engine/src/market/incoming.ts` and export from `packages/engine/src/index.ts`
- [X] T059 [US4] Call `marketAfterRound` after each committed round in `packages/save/src/career.ts` (or the round wrapper used by `commitRound`/`playRound`) and add `answerManagerIncomingOffer` to `packages/save/src/market.ts` (+ tests)
- [X] T060 [US4] Add `answerIncomingOffer` to `apps/web/src/game/GameProvider.tsx`; create `apps/web/src/ui/market/IncomingOffers.tsx` and the Propostas tab; badge with the open-offer count on the Mercado header item
- [X] T061 [US4] Extend `apps/web/test/flows/market.test.tsx`: an offer appears after a simulated round in the window, counter once, accept another and check Elenco/Finanças

**Checkpoint**: o usuário também vende

---

## Phase 8: User Story 5 - Empréstimos simples (Priority: P2)

**Goal**: pegar e ceder emprestado até o fim da temporada, sem opção de compra

**Independent Test**: pedir empréstimo na janela, ver o atleta no elenco, e ele volta ao clube de
origem na virada

### Tests (write first, must fail)

- [X] T062 [P] [US5] Extend `packages/engine/test/market/club-response.test.ts` and `negotiation.test.ts` (loan part): loan ask = 10% of the purchase ask; fee 0 accepted when the player is outside the club's top 16; loan flows through the same counter rules; loaned player cannot be bought or loaned again (`market.player_on_loan`)
- [X] T063 [P] [US5] Extend `packages/engine/test/market/effects.test.ts` and `turnover.test.ts` (loan part): `completeLoan` sets `clubId` to the borrower and `contract.loan`, fee via `transfer_*`; borrower pays the wage (`annualWageBill`); `return-loans` restores `clubId` and removes `loan`; contract ending during the loan → free agent

### Implementation

- [X] T064 [US5] Implement `loan` in `club-response.ts`, `negotiation.ts` and `completeLoan` in `packages/engine/src/market/effects.ts`
- [X] T065 [US5] Implement the `return-loans` step in `packages/engine/src/market/turnover.ts` and register it in `packages/engine/src/career/turnover.ts`
- [X] T066 [US5] Add "Pedir empréstimo" to `apps/web/src/ui/market/MarketTable.tsx`/`PlayerDetails.tsx` and loan labels to the Negociações tab; extend `apps/web/test/flows/market.test.tsx`

**Checkpoint**: empréstimos funcionam e se desfazem na virada

---

## Phase 9: User Story 7 - Contratar jogadores livres (Priority: P2)

**Goal**: contratar livres a qualquer momento; livres antigos deixam o mercado

**Independent Test**: fora da janela, contratar um livre e ver o atleta no elenco com salário na
folha

### Tests (write first, must fail)

- [X] T067 [P] [US7] Extend `packages/engine/test/market/negotiation.test.ts` (free part): `startNegotiation({kind:"free"})` allowed outside the window (SC-001), starts at `contract`, no fee; acceptance removes the player from `freeAgents` and inserts it in the bank with club and contract; squad max enforced
- [X] T068 [P] [US7] Extend `packages/engine/test/market/turnover.test.ts`: `age-out-free-agents` removes free agents free for ≥ 1 full season or aged ≥ 33; `reset-market` clears negotiations and incoming offers; free agents never appear in the bank

### Implementation

- [X] T069 [US7] Implement `signFreeAgent` in `packages/engine/src/market/free-agents.ts` and the `free` path in `negotiation.ts`
- [X] T070 [US7] Implement `age-out-free-agents` and `reset-market` steps in `packages/engine/src/market/turnover.ts`; register them in `packages/engine/src/career/turnover.ts`
- [X] T071 [US7] Add "Contratar" for free agents to the Mercado table/`PlayerDetails.tsx`; extend `apps/web/test/flows/market.test.tsx` (sign a free agent with the window closed)

**Checkpoint**: todas as histórias funcionando

---

## Phase 10: Polish & Cross-Cutting Concerns

- [X] T072 Long-run balance (SC-006): run `packages/engine/test/finance/long-run.test.ts` and `packages/engine/test/renewal/long-run.test.ts` with the market (contracts, AI renewals, free agents) and add the R11 limit `freeAgents ≤ 150` after every turnover and valid squads in 100% of turnovers; calibrate `DEFAULT_MARKET.ai` if any limit fails
- [X] T073 [P] Show free agents count and contract wage bill per season in `tools/src/simulate-world.ts` and `tools/src/simulate-economy.ts`; run `pnpm sim:world --seasons 30` and `pnpm sim:economy --seasons 30` (exit code 0)
- [X] T074 [P] Performance: `packages/engine/test/market/performance.test.ts` (search over the full world < 30 ms; negotiation response < 5 ms)
- [X] T075 [P] Architecture/i18n guards: run the engine architecture test (no `**`, `Math.random`, `Date`) and the no-literals test for the new web files
- [X] T076 [P] Playwright `apps/web/e2e/market.spec.ts`: new career → Mercado → filter → offer → counter → contract → player in Elenco; window closed message after round 4
- [X] T077 Update `apps/web/e2e/*` that count header items or shortcuts, if needed
- [X] T078 Run the quickstart gates: `pnpm typecheck && pnpm lint && pnpm test`, `pnpm build:web && pnpm test:e2e`; mark `specs/010-mercado-transferencias/quickstart.md` scenarios verified

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências
- **Foundational (Phase 2)**: depende do Setup; bloqueia todas as histórias
- **US1 (Phase 3)**: depende da Fase 2
- **US2 (Phase 4)**: depende da Fase 2 e de `value.ts`/`windows.ts` (US1); a conclusão da compra
  depende de US3
- **US3 (Phase 5)**: depende de US2 (máquina de estados)
- **US6 (Phase 6)**: depende de US3 (negociação de contrato) — renovação é um contrato
- **US4 (Phase 7)**: depende de US2 (`completeTransfer`, `maxBid`)
- **US5 (Phase 8)**: depende de US2/US3 e da etapa de virada (US6)
- **US7 (Phase 9)**: depende de US3 e de `free-agents.ts` (US6)
- **Polish (Phase 10)**: depende de todas

### Within Each User Story

- Testes escritos e falhando antes da implementação
- Motor → save → provider → telas → teste de fluxo

### Parallel Opportunities

- T001 e T002; T003–T005 (testes da Fase 2); T014 junto com T009–T012
- US1: T016–T018 juntos; T019 e T020 juntos; T024 e T025 juntos
- US2: T028–T031 juntos; T032 e T033 juntos
- US6: T048 e T049; T054 e T055
- Após US3: US4 e US6 podem seguir em paralelo (arquivos diferentes: `incoming.ts` vs `turnover.ts`)
- Polish: T073–T076 juntos

---

## Parallel Example: User Story 1

```bash
# Testes primeiro, juntos:
Task: "value.test.ts"   Task: "windows.test.ts"   Task: "search.test.ts"
# Implementação independente:
Task: "market/value.ts"   Task: "market/windows.ts"
# UI:
Task: "MarketFilters.tsx + MarketTable.tsx"   Task: "ComparePanel.tsx + WindowStatus.tsx"
```

## Parallel Example: User Story 2

```bash
Task: "club-response.test.ts"   Task: "squad.test.ts"   Task: "effects.test.ts"   Task: "negotiation.test.ts"
Task: "market/squad.ts"   Task: "market/club-response.ts"
```

---

## Implementation Strategy

### MVP First

1. Fases 1–2 (contratos, folha contratual, save v6) — testes de longo prazo verdes
2. US1 (busca) → US2 + US3 (compra completa) → **parar e validar**: comprar um jogador ponta a ponta
3. US6 (renovação e expirados) completa os critérios de aceite do prompt (SC-001–SC-003)

### Incremental Delivery

- US4 (vender), US5 (empréstimos), US7 (livres) em seguida, cada uma testável sozinha
- Polish: equilíbrio de 30 temporadas, ferramentas, desempenho, e2e

### Commits

Um commit por pacote no fim: engine, save, i18n, web, tools, docs(specs).
