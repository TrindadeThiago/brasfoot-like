---

description: "Lista de tarefas da feature 014 — Manchetes e histórico"
---

# Tasks: Manchetes e histórico

**Input**: Design documents from `specs/014-manchetes-historico/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: `news/` segue o Princípio IX (testes antes, devem falhar primeiro); o tamanho do save tem
teste de 30 temporadas com limites declarados (research.md R11, Princípio V); save v10 com migração e
fixture (Princípio VI). Fluxos de interface com happy-dom + fake-indexeddb.

**Organization**: tarefas por user story, em ordem de prioridade (P1: US1, US2 → P2: US3 → P3: US4).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 … US4
- Caminhos relativos à raiz do repositório

## Referências rápidas

- API: `specs/014-manchetes-historico/contracts/news-api.md`; save/telas/i18n:
  `specs/014-manchetes-historico/contracts/save-and-ui.md`; decisões e padrões R1–R13:
  `specs/014-manchetes-historico/research.md`
- Já existentes: `completeCareerRound`/`advanceCareer` com `board?`/`fans?` (`finance/round.ts`),
  `seasonTurnover`/`TURNOVER_STEP_IDS` (`career/turnover.ts`), `standings` (`season/standings.ts`),
  `seasonStats`/`topScorers` (`season/stats.ts`), `MatchRecord.players[id].goals` e eventos `shot`
  com `outcome: "goal"` (`season/types.ts`, `match/types.ts`), `expectationOf` (`board/goals.ts`),
  `rivalryOf`/`idolsOf` (`fans/`), log do mercado `TransferRecord` (`market/types.ts`),
  `marketValue` (`market/value.ts`), `cyrb128` (`rng/hash.ts`), `divisionZones` e `leagueTotalRounds`
  (`career/league.ts`), `history` do save (campeões e classificações)
- Helpers de teste: `packages/engine/test/fans/helpers.ts` (`fansCareer`, `playFans`, `withScore`,
  `MANAGER`), `packages/save/test/fixtures.ts`, `apps/web/test/helpers/{app.tsx,career.ts,saves.ts}`
- Lembretes: sem `**`/`Math.pow`/transcendentais no motor; nada de texto no motor; clone JSON;
  `pnpm sim:world --seasons 30` (sem `--`); antes de commitar, desfazer `apps/web/next-env.d.ts` e
  apagar `apps/web/AGENTS.md`

---

## Phase 1: Setup

- [X] T001 [P] Create `packages/engine/src/news/types.ts` (`NewsState`, `RoundFeed`, `Headline`, `HeadlineType` with `HEADLINE_TYPES`, `Records`, `RecordEntry`, `LeagueRecordKind`, `ClubRecordKind`, `AllTime`, `SeasonNews`, `NewsContext`, `Legend`) and `packages/engine/src/news/rules.ts` (`NewsRules`, `DEFAULT_NEWS` of research.md R12 including `relevance` and `variants` per type, `newsRules(world, competitionId)`); add optional `news` (`.partial()`) to `competitionSchema` in `packages/engine/src/model/schemas.ts`
- [X] T002 [P] Add pt-BR strings to `packages/i18n/locales/pt-BR/ui.json`: for each headline type the variations `news.<type>.<n>` (`n` = 0..variants−1; full sentences with ICU plural for streaks, goals and rounds; variables per data-model vars), `news.extra.<type>`, `news.title`, `news.round` (`{round}`), `news.season` (`{year}`), `news.empty`, `news.seeAll`, `news.summary.*`, `nav.news`, `help.news`, `history.tab.*` (seasons, titles, scorers, records, clubs), `history.topScorer`, `history.titles.*`, `history.scorers.*`, `history.records.<kind>` (one sentence per record kind), `history.records.empty`, `history.clubs.*`, `history.legends.byGoals/byMatches`, `history.managerLink`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: estado das notícias na rodada e na virada, save v10

**⚠️ CRITICAL**: nenhuma história começa antes desta fase

### Tests (write first, must fail)

- [X] T003 [P] Write `packages/engine/test/news/rules.test.ts`: defaults; partial `competition.news` merges (including `relevance`/`variants` maps); schema accepts/rejects
- [X] T004 [P] Write `packages/engine/test/news/round.test.ts` (plumbing): `createNews()` empty; `completeCareerRound` with `news` returns `news` with a feed entry for the round; without `news` the result is deep-equal to the current one; `advanceCareer` threads it; `seasonTurnover` with `news` returns `news`
- [X] T005 [P] Write `packages/save/test/migrate-v10.test.ts` with a v9 fixture: `news` with empty feed/records/allTime and one `seasons` entry (no scorer) per finished season; `formatVersion` 10; update older migration tests' expected version and the chained-migrations test

### Implementation

- [X] T006 Implement `createNews` in `packages/engine/src/news/create.ts`, a `newsAfterRound` skeleton in `packages/engine/src/news/round.ts` (appends an empty `RoundFeed`) and a `newsNewSeasonStep` skeleton in `packages/engine/src/news/turnover.ts`; add `CareerNews`/`news?` to `completeCareerRound` and `advanceCareer` in `packages/engine/src/finance/round.ts` (runs last, receives market log, board before/after, fans); add `news?` to `TurnoverContext`/`TurnoverOptions`/`TurnoverResult` (`packages/engine/src/career/types.ts`) and register `news-new-season` after `record-history` in `packages/engine/src/career/turnover.ts`; update expected step lists in `packages/engine/test/career/turnover*.test.ts` and `packages/engine/test/finance/turnover.test.ts`; export from `packages/engine/src/index.ts`
- [X] T007 Save v10: `news: NewsState`, `SAVE_FORMAT_VERSION = 10` in `packages/save/src/format.ts`; `createSave` builds `news` in `packages/save/src/create.ts`; migration v9 → v10 and envelope/validation (`newsProblem`: feed only the last two seasons, ≤ `feedLimit` per round) in `packages/save/src/migrate.ts`; `withRoundResult`/`advanceCareerSeason` store `news` in `packages/save/src/career.ts`; v9 fixture and `withoutMarket` stripping `news` in `packages/save/test/fixtures.ts`
- [X] T008 Pass `{ state: save.news, careerSeed: save.seed }` to the round in `apps/web/src/game/GameProvider.tsx` and `apps/web/test/helpers/career.ts`

**Checkpoint**: tudo verde, jogo igual ao atual (feed vazio por rodada)

---

## Phase 3: User Story 1 - Feed de manchetes da rodada (Priority: P1) 🎯 MVP

**Goal**: feed por rodada com manchetes do clube, da liga e do mercado, ordenadas e limitadas

**Independent Test**: toda rodada com o técnico empregado tem ao menos uma manchete do clube; fatos notáveis geram o tipo certo

### Tests (write first, must fail)

- [X] T009 [P] [US1] Write `packages/engine/test/news/facts.test.ts`: `result` for every manager match; `hatTrick` (≥ 3 goals in `players`); `rout` (margin ≥ `routMargin`); `comeback` (winner trailed — goal order from `shot` events by minute); `upset` (expectation gap ≥ `upsetGap`); `derby` with intensity; ties and non-matches produce nothing extra
- [X] T010 [P] [US1] Write `packages/engine/test/news/clinched.test.ts`: title clinched when leader > 2nd + 3 × remaining (once, in the right round); promotion and relegation by zones; never twice in a season
- [X] T011 [P] [US1] Write `packages/engine/test/news/feed.test.ts` (**acceptance 1**, SC-001, SC-004): every round of a simulated season with the manager employed has a `mine` headline; ≤ `feedLimit`; one main headline per match with ≤ `extrasPerMatch` extras; relevance order with `mineBonus`; unemployed ⇒ league/market only; coach fired/hired from board diff; `bigTransfer` from the round log; determinism with JSON round-trip
- [X] T012 [P] [US1] Write `packages/engine/test/news/variants.test.ts`: `variantOf` deterministic and within range; every `news.<type>.<n>` key exists in `packages/i18n/locales/pt-BR/ui.json` for `n < variants[type]`; over a simulated season no variation exceeds half of its type (SC-005 part)
- [X] T013 [P] [US1] Write `apps/web/test/flows/news.test.tsx` (part 1): Início shows the Manchetes card with up to 3 headlines of the last round and "Ver todas" opens Notícias; Notícias lists the round's feed

### Implementation

- [X] T014 [US1] Implement `variantOf` (cyrb128 of `careerSeed:season:round:type:ids`) in `packages/engine/src/news/variants.ts`
- [X] T015 [US1] Implement `matchFacts` (result, hatTrick, rout, comeback, upset, derby) in `packages/engine/src/news/facts.ts`
- [X] T016 [US1] Implement `clinched` in `packages/engine/src/news/clinched.ts` (avoid repeats by checking the feed of the season)
- [X] T017 [US1] Implement `rankFeed` in `packages/engine/src/news/feed.ts` and complete `newsAfterRound` in `packages/engine/src/news/round.ts` (matches in fixture order, board diff for coach/manager news, round log for transfers, `bigTransferPct` threshold from the world's market values, ids `"<season>-<round>-<n>"`)
- [X] T018 [P] [US1] Create `apps/web/src/ui/news/Headline.tsx` (formats `news.<type>.<variant>` with vars, club/player names resolved from the save, extras via `news.extra.<type>`) and `apps/web/src/ui/news/NewsCard.tsx`; show `NewsCard` on `apps/web/src/app/jogo/page.tsx` (employed and unemployed homes)
- [X] T019 [US1] Create `apps/web/src/app/jogo/noticias/page.tsx` (round selector over the stored feed, `apps/web/src/ui/news/RoundFeed.tsx`), add `/jogo/noticias` to `GAME_SCREENS` with shortcut J in `apps/web/src/ui/AppHeader.tsx`, `apps/web/src/game/GameLayout.tsx`, `apps/web/src/ui/ShortcutsHelp.tsx`, and register the route in `apps/web/test/helpers/app.tsx`

**Checkpoint**: critério de aceite 1 verde

---

## Phase 4: User Story 2 - Manchetes com contexto (Priority: P1)

**Goal**: sequências, fim de jejum e recordes nas manchetes

**Independent Test**: sequências e recordes provocados geram manchetes com o contexto certo

### Tests (write first, must fail)

- [X] T020 [P] [US2] Write `packages/engine/test/news/context.test.ts`: `streakOf` (wins, losses, winless) within the season; `result` vars carry the streak from `streakMin`; `streak` and `droughtEnd` (≥ `droughtMin`) headlines
- [X] T021 [P] [US2] Write `packages/engine/test/news/records.test.ts` (**acceptance 2**, SC-002): club `biggestWin` broken ⇒ `record` headline with the previous entry (score, opponent, year) in vars; equal value ⇒ no headline and no update; first mark only registers; league `mostPlayerGoalsSeason` headline once when passed; `biggestLoss`, `mostGoalsMatch`, `longestWinStreak`

### Implementation

- [X] T022 [US2] Implement `streakOf` in `packages/engine/src/news/facts.ts`; streak vars on `result`, `streak` and `droughtEnd` headlines
- [X] T023 [US2] Implement `updateRecords` and per-match/per-round candidates in `packages/engine/src/news/records.ts`; call from `newsAfterRound` (`packages/engine/src/news/round.ts`)

**Checkpoint**: critério de aceite 2 verde

---

## Phase 5: User Story 3 - Histórico do mundo (Priority: P2)

**Goal**: campeões e artilheiros, títulos, artilheiros históricos, recordes, clubes e lendas

**Independent Test**: após algumas temporadas, cada seção do histórico mostra os dados certos

### Tests (write first, must fail)

- [X] T024 [P] [US3] Write `packages/engine/test/news/turnover.test.ts`: `news-new-season` records each division's top scorer, accumulates `allTime` (goals/matches per club), prunes (active or top `allTimeTop` or club top `legendsPerClub`), checks `mostPointsSeason` records, writes the `seasonSummary` headline at round 0 and prunes the feed to the last two seasons
- [X] T025 [P] [US3] Write `packages/engine/test/news/history.test.ts`: `titlesByClub` from `history`; `allTimeScorers` includes retired players; `clubLegends` by goals and by matches
- [X] T026 [P] [US3] Extend `apps/web/test/flows/news.test.tsx`: Histórico tabs (Temporadas with champion and top scorer, Títulos, Artilheiros, Recordes, Clubes with legends) and the link to Carreira › Histórico

### Implementation

- [X] T027 [US3] Implement accumulation, pruning and queries (`titlesByClub`, `allTimeScorers`, `clubLegends`) in `packages/engine/src/news/history.ts`
- [X] T028 [US3] Complete `newsNewSeasonStep` in `packages/engine/src/news/turnover.ts` (scorers, `allTime`, season records, summary, feed pruning)
- [X] T029 [US3] Create `apps/web/src/ui/history/{Titles,Scorers,Records,ClubHistory}.tsx` and turn `apps/web/src/app/jogo/historico/page.tsx` into tabs (Temporadas keeps the current table + top scorer column + standings detail) with the manager-trajectory link

---

## Phase 6: User Story 4 - Feed das rodadas anteriores (Priority: P3)

**Goal**: navegar pelas manchetes das rodadas anteriores e ver o resumo da temporada

**Independent Test**: depois de várias rodadas e de uma virada, o seletor mostra rodadas da temporada atual e da anterior e o resumo

### Tests (write first, must fail)

- [X] T030 [P] [US4] Extend `apps/web/test/flows/news.test.tsx`: Notícias selector lists rounds of current and previous season; the season summary appears at the start of the new season

### Implementation

- [X] T031 [US4] Add `headlinesOf`/`latestFeed` in `packages/engine/src/news/feed.ts` and the season grouping + summary rendering in `apps/web/src/app/jogo/noticias/page.tsx` and `apps/web/src/ui/news/RoundFeed.tsx`

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T032 Save size (**acceptance 3**, R11, SC-003): `packages/save/test/size.test.ts` — 30 simulated seasons through the save path (`withRoundResult`, `advanceCareerSeason`, career with "sem demissão"): save at the start of season 31 ≤ 1,6 MB, average growth between seasons 10 and 30 ≤ 30 KB, every last round ≤ 4,5 MB; adjust pruning limits if needed
- [X] T033 [P] Headline variety: count headline types per season in `tools/src/simulate-world.ts` (≥ 10 types per season, SC-005) with fans/board/news active; run `pnpm sim:world --seasons 30` and `pnpm sim:economy --seasons 30` (exit 0)
- [X] T034 [P] Performance: `packages/engine/test/news/performance.test.ts` (`newsAfterRound` < 10 ms on the full world)
- [X] T035 [P] Playwright `apps/web/e2e/news.spec.ts`: new career → simulate rounds → Manchetes card → Notícias → Histórico tabs
- [X] T036 Update `specs/014-manchetes-historico/research.md` with the measured sizes and calibration, and run the gates: `pnpm typecheck && pnpm lint && pnpm test`, `pnpm build:web && pnpm test:e2e`

---

## Dependencies & Execution Order

- **Setup (1)** → **Foundational (2)** → user stories.
- **US1 (3)** → **US2 (4)** (context and records extend `newsAfterRound`).
- **US3 (5)** depends on Phase 2 (turnover step) and on US2 records (`mostPointsSeason`); its UI can
  start after Phase 2.
- **US4 (6)** depends on US1 (feed page) and US3 (summary at turnover).
- **Polish (7)** depends on all; T032 needs US3 (pruning) to be final.

### Parallel Opportunities

- T001/T002; T003–T005; T009–T013; T020/T021; T024–T026; T018 with T014–T017 once the types exist;
  T033–T035.

## Parallel Example: User Story 1

```bash
Task: "news/facts.test.ts"   Task: "news/clinched.test.ts"   Task: "news/feed.test.ts"   Task: "news/variants.test.ts"
Task: "ui/news/Headline.tsx + NewsCard.tsx" (after T001/T002)
```

## Implementation Strategy

1. Fases 1–2 (tipos, regras, notícias na rodada e na virada, save v10) — jogo igual.
2. US1 → US2: feed com contexto e recordes — **parar e validar** os critérios de aceite 1 e 2.
3. US3: histórico do mundo; US4: navegação pelo feed.
4. Polish: tamanho do save (critério 3), variedade, desempenho, e2e.

Commits no fim, um por pacote: engine, save, i18n, web, tools, docs(specs).
