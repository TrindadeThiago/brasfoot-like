---

description: "Lista de tarefas da feature 006 — rodada ao vivo e telas da competição"
---

# Tasks: Rodada ao vivo e telas da competição

**Input**: Design documents from `specs/006-rodada-ao-vivo/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: o módulo da rodada ao vivo no motor e os textos de eventos seguem o Princípio IX (testes
antes, devem falhar primeiro). Os fluxos de interface ligados aos critérios de aceite (rodada ao
vivo com relógio, substituições, temporada inteira até o campeão, teclado) também são testados
antes, com happy-dom + fake-indexeddb e timers falsos; Playwright cobre a rodada ao vivo real e a
temporada inteira.

**Organization**: tarefas agrupadas por user story, em ordem de prioridade (US1 → US6).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 … US6
- Caminhos relativos à raiz do repositório

## Referências rápidas

- API da rodada ao vivo: `specs/006-rodada-ao-vivo/contracts/live-round-api.md`
- Telas, controles, atalhos, textos: `specs/006-rodada-ao-vivo/contracts/ui.md`
- Decisões (R1–R8): `specs/006-rodada-ao-vivo/research.md`
- Já existentes no motor: `startMatch`, `advanceMatch`, `applyChange`, `matchResult`
  (`match/engine.ts`, `match/changes.ts`, `match/result.ts`); `advanceSeason`, `playFixture`,
  `sideLineup`, `applyMatchToStatus` (`season/season.ts`), `toMatchRecord` (`season/record.ts`),
  `topScorers`/`topAssists`/`seasonStats` (`season/stats.ts`), `standings`
- App: `GameProvider.simulateNextRound` (validação da escalação + ajuste + salvar), `GameLayout`,
  `SimulateDialogs`, `RoundResults`, `DataTable`, `Dialog`, `useShortcuts`, `lineup-selection.ts`

---

## Phase 1: Setup

- [X] T001 [P] Create `packages/i18n/locales/pt-BR/events.json` with the event templates of `research.md` R4 (goal ≥ 4 variants with/without assist via ICU `select`, penalty_goal ≥ 3, penalty_awarded/penalty_missed/yellow/red_second_yellow/red_direct/injury/substitution/substitution_auto/formation/posture ≥ 2 each, kickoff/half_time/second_half/full_time/abandoned 1 each), register the bundle in `packages/i18n/src/format.ts` (`BUNDLES[locale].events`)
- [X] T002 [P] Add the pt-BR UI strings for this feature to `packages/i18n/locales/pt-BR/ui.json`: home buttons (`home.playLive`, `home.simulateDirect`), round screen (`round.*`: title, clock, half time, full time, speeds, pause/resume, finish now, auto pause, my match, other matches, feed, panel titles, substitutions left `{used}/{limit}`, substituted list, confirm leave, results, go to standings/home/season end), substitution errors (`round.error.limit_reached`, `round.error.not_on_bench`, …), summary (`summary.*`: goals, cards, injuries, substitutions, stats labels), competition tabs (`competition.tab.standings|results|scorers`), results (`results.*`), scorers (`scorers.*`), season end (`seasonEnd.*`), help lines for `D`, `Espaço`, `+`/`-`, `F`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: rodada ao vivo no motor e `advanceSeason` usando o mesmo caminho

**⚠️ CRITICAL**: nenhuma história começa antes desta fase

- [X] T003 Write `packages/engine/test/season/live-round.test.ts`: `startRound` prepares 10 matches with the same inputs as the season (players, lineups, unavailable); advancing in steps of 1, 7 or to the end gives identical `MatchState`s; `completeRound(season, world, finishRound(startRound(...)))` equals `advanceSeason(season, world, { rounds: 1 })` (records, status, warnings, nextRound); an external lineup for the manager's club is used; `completeRound` on an unfinished round → error; whole season played through the live API equals `advanceSeason(..., { toEnd: true })` for 2 seeds; one tick of 10 matches < 5 ms (median of 50)
- [X] T004 Write `packages/engine/test/season/live-decisions.test.ts`: substitutions, formation and posture changes applied at different ticks are recorded in `round.decisions`; replaying the decision log on a fresh `startRound` with a different step pattern (e.g. 1-by-1 vs. jumps) yields identical records (SC-002); 6th substitution → `change.limit_reached`; substituted-out player cannot come back (`change.player_not_on_bench`); change on a finished match → `change.match_finished`; change for a club not playing → error
- [X] T005 Implement `packages/engine/src/season/live-round.ts` (`LiveRound`, `LiveMatch`, `RoundDecision`, `startRound`, `advanceRound`, `applyRoundChange`, `isRoundFinished`, `finishRound`, `completeRound`, `matchOf`) by extracting match preparation (`sideLineup` + input building) and record building from `playFixture` in `packages/engine/src/season/season.ts`; refactor `advanceSeason` to run each round through `startRound → finishRound → completeRound`; export everything from `packages/engine/src/index.ts`
- [X] T006 Run the whole engine suite (`pnpm vitest run packages/engine`) to confirm the season determinism/credibility/performance tests are unchanged after the refactor

**Checkpoint**: o motor joga uma rodada passo a passo e o "direto" é o mesmo caminho

---

## Phase 3: User Story 1 - Assistir à rodada ao vivo (Priority: P1) 🎯 MVP

**Goal**: os 10 jogos ao mesmo tempo com relógio, velocidades, placares e feed; salvar ao fim

**Independent Test**: iniciar uma rodada ao vivo, deixar o relógio correr até o fim e conferir
placares, feed e salvamento iguais ao "simular direto"

### Testes (escrever primeiro; devem falhar)

- [X] T007 [P] [US1] Write `packages/i18n/test/events.test.ts`: every event type has the minimum number of variants (goal ≥ 3, the listed ones ≥ 2, milestones ≥ 1); `eventVariant(seed, seq, count)` is deterministic, in `[1, count]`, and spreads over all variants for 200 seqs; `formatEvent` fills player/assist/club/minute
- [X] T008 [P] [US1] Write `apps/web/test/flows/live-round.test.tsx` with fake timers: "Jogar rodada" on home opens `/jogo/rodada`, shows 10 matches at 0', advancing time moves the clock, scores change exactly when goal events happen, the feed shows goal author and minute, changing speed changes ticks per second without skipping events; after the end the round is saved (store `nextRound` = 2) and its records equal those of "simular direto" for the same career; a round of ~98 ticks takes 30–60 s of fake time at normal speed (SC-004)

### Implementação

- [X] T009 [US1] Implement `eventVariant` and `formatEvent(key, values, seed, seq)` in `packages/i18n/src/format.ts` (deterministic string hash, no `Math.random`) and export them
- [X] T010 [P] [US1] Implement `apps/web/src/ui/event-text.ts`: `eventText(event, match, save)` mapping each `MatchEvent` to its `event.*` key and params (player names, club short names, minute with stoppage "45+2'"), returning `undefined` for shots without goal
- [X] T011 [US1] Implement `apps/web/src/game/useLiveRound.ts`: starts with `startRound(season, bank, { [clubId]: lineup })` (or without external lineup in the short-squad case, as in `GameProvider`), timer loop with accumulator (max 5 ticks per update), speeds `slow|normal|fast` ≈ 60/45/30 s per round, `pause/resume/setSpeed/finishNow`, collects new events per tick into the feed, exposes `finished`; speed persisted in preferences
- [X] T012 [US1] Add `commitRound(live)` to `apps/web/src/game/GameProvider.tsx` (`completeRound` + `withAdjustedLineup` + touch + persist + `lastRound`), and make `simulateNextRound` use `finishRound(startRound(...))` + `commitRound` so both paths share code; keep the lineup validation dialogs before starting either mode
- [X] T013 [P] [US1] Implement `apps/web/src/ui/LiveGrid.tsx` (+ css): highlighted manager match (crests, score, red cards, clock) and the other 9 matches (crests, short names, score, minute, red cards); score change marked with a brief highlight
- [X] T014 [P] [US1] Implement `apps/web/src/ui/EventFeed.tsx` (+ css): list with `role="log"`, newest first, minute + text; separate instance for the manager match
- [X] T015 [US1] Implement the page `apps/web/src/app/jogo/rodada/page.tsx` with `GameLayout`: controls (speed select, pause/resume, finish now), `LiveGrid`, both feeds, an `aria-live="polite"` region announcing only goals/red cards/injuries of the manager match and the final score; on finish shows round results; confirmation before leaving mid-round (in-app links/shortcuts via a guard in `GameLayout`, `beforeunload` for reload/close)
- [X] T016 [US1] Update `apps/web/src/app/jogo/page.tsx`: buttons "Jogar rodada" (→ `/jogo/rodada`) and "Simular direto"; `S` starts the preferred mode and `D` simulates direct (in `apps/web/src/game/GameLayout.tsx`), preferences `roundMode`/`roundSpeed`/`autoPause` in `apps/web/src/storage/preferences.ts`; update `apps/web/test/flows/autosave.test.tsx`, `apps/web/test/ui/home.test.tsx` and `apps/web/test/ui/shortcuts.test.tsx` for the new buttons

**Checkpoint**: rodada ao vivo jogável e salva

---

## Phase 4: User Story 2 - Pausar, substituir e mudar a tática (Priority: P1)

**Goal**: decisões do jogador no meio do jogo, com limite e sem volta de quem saiu

**Independent Test**: pausar aos 60', fazer 2 substituições e mudar a postura; conferir no
registro os minutos, o limite e que os substituídos não voltam

### Testes (escrever primeiro; devem falhar)

- [X] T017 [P] [US2] Write `apps/web/test/ui/substitutions.test.tsx`: pause stops the clock; panel shows on-field by slot, available bench, substituted list and `n/5`; two-step substitution (on field → bench) records a substitution at the current minute; substituted player disappears from the bench options; after 5 substitutions further attempts are refused with the message; formation and posture changes appear in the feed; resume continues from the same minute; auto pause triggers on an injury/red card of the manager's team and can be turned off

### Implementação

- [X] T018 [US2] Add `applyDecision(change)` to `apps/web/src/game/useLiveRound.ts` (calls `applyRoundChange`, returns the error code for the UI) and the auto pause on manager-team injury/red card
- [X] T019 [US2] Implement `apps/web/src/ui/SubstitutionPanel.tsx` (+ css): on-field players per slot with position and effective strength, available bench, substituted/sent-off lists, `n/5`, formation and posture selects; two-step selection reusing `apps/web/src/game/lineup-selection.ts` semantics (field → bench); error messages from `round.error.*`
- [X] T020 [US2] Show the panel in `apps/web/src/app/jogo/rodada/page.tsx` while paused

**Checkpoint**: decisões durante a partida

---

## Phase 5: User Story 3 - Simular direto (Priority: P1)

**Goal**: resultado de uma vez e "terminar agora", iguais ao ao vivo

**Independent Test**: simular direto e comparar com o ao vivo sem decisões; "terminar agora" no
minuto 30 dá o mesmo resultado

### Testes (escrever primeiro; devem falhar)

- [X] T021 [P] [US3] Extend `apps/web/test/flows/live-round.test.tsx`: "terminar agora" at minute ~30 without decisions gives the same records as direct; `D` simulates direct from home; the mode preference is remembered after reload (`S` uses it)

### Implementação

- [X] T022 [US3] Wire `finishNow` (`F` shortcut and button) in `apps/web/src/app/jogo/rodada/page.tsx` and the direct mode from home; persist `roundMode` when the player uses a mode

**Checkpoint**: US1–US3 — rodada completa nos dois modos

---

## Phase 6: User Story 4 - Resumo da minha partida (Priority: P2)

**Goal**: placar, autores, cartões, lesões, substituições e estatísticas

**Independent Test**: depois de uma rodada, o resumo bate com os eventos e estatísticas do registro

### Testes (escrever primeiro; devem falhar)

- [X] T023 [P] [US4] Write `apps/web/test/ui/match-summary.test.tsx`: for a played record, the summary lists every goal (minute, scorer, assist), cards, injuries and substitutions in order and the stats of both teams equal `record.stats`; opened automatically at the end of a live round for the manager match

### Implementação

- [X] T024 [US4] Implement `apps/web/src/ui/MatchSummary.tsx` (+ css) from `MatchRecord` (crests, score, event sections, stats side by side) and show it at the end of `apps/web/src/app/jogo/rodada/page.tsx`

**Checkpoint**: resumo disponível

---

## Phase 7: User Story 5 - Acompanhar a competição (Priority: P2)

**Goal**: classificação, resultados por rodada, calendário e artilharia

**Independent Test**: depois de 5 rodadas, resultados mostram os 10 jogos de cada rodada e a
artilharia bate com as partidas

### Testes (escrever primeiro; devem falhar)

- [X] T025 [P] [US5] Write `apps/web/test/ui/results-scorers.test.tsx`: competition tabs (standings, results, scorers) reachable by keyboard; results for a chosen round list 10 fixtures with scores (or "a disputar"), default to the last played round, and open the `MatchSummary` of any played match; scorers list equals `topScorers`/`topAssists` (player, club, number) with the manager's players highlighted

### Implementação

- [X] T026 [P] [US5] Implement `apps/web/src/ui/CompetitionTabs.tsx` and add it to `apps/web/src/app/jogo/competicao/page.tsx`
- [X] T027 [P] [US5] Implement `apps/web/src/app/jogo/competicao/resultados/page.tsx` (round selector with previous/next, 10 fixtures, summary dialog; `r` query param)
- [X] T028 [P] [US5] Implement `apps/web/src/app/jogo/competicao/artilharia/page.tsx` (two `DataTable`s: scorers and assists, top 20, highlight)
- [X] T029 [US5] Register the new routes in `apps/web/test/helpers/app.tsx` and keep `4` pointing to the competition group (active tab state in `apps/web/src/ui/AppHeader.tsx` for sub-routes)

**Checkpoint**: competição acompanhável

---

## Phase 8: User Story 6 - Fim de temporada (Priority: P2)

**Goal**: campeão, classificação final, posição do clube; sem mais rodadas

**Independent Test**: simular até o fim e conferir a tela com o campeão = 1º da classificação

### Testes (escrever primeiro; devem falhar)

- [X] T030 [P] [US6] Write `apps/web/test/flows/full-season.test.tsx` (SC-001): from a new career, simulate direct the 38 rounds through the UI (button/`D`), land on `/jogo/fim-de-temporada`, champion = first of `standings`, manager position shown; home then shows the champion and no round buttons; `/jogo/rodada` refuses to start

### Implementação

- [X] T031 [US6] Implement `apps/web/src/app/jogo/fim-de-temporada/page.tsx` (champion crest and name, final table with `DataTable`, manager position) and the redirect/link from the end of the last round and from `apps/web/src/app/jogo/page.tsx`

**Checkpoint**: temporada jogável do início ao fim

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T032 [P] Write `apps/web/test/ui/live-keyboard.test.tsx` (SC-007): start, pause (`Espaço`), substitute, change posture, resume, speed (`+`/`-`), finish now (`F`) only with the keyboard; shortcuts ignored in selects
- [X] T033 [P] Write `apps/web/e2e/live-round.spec.ts` (live round at fast speed, pause, one substitution, summary at the end) and `apps/web/e2e/full-season.spec.ts` (direct until the champion screen)
- [X] T034 Update `apps/web/src/ui/ShortcutsHelp.tsx` (D, Espaço, +/-, F), run the `no-literals` test, then `pnpm typecheck && pnpm lint && pnpm test` and `pnpm build:web && pnpm test:e2e`
- [X] T035 [P] Update `apps/web/README.md` (round screen, competition tabs, season end, shortcuts) and sync `specs/006-rodada-ao-vivo/contracts/*.md` and `data-model.md` with the implementation
- [X] T036 Run every step of `specs/006-rodada-ao-vivo/quickstart.md` (gates, manual route on the production build with screenshots checked, E2E) and fix divergences

---

## Dependencies & Execution Order

- **Setup (T001–T002)** → **Foundational (T003–T006)**: T003/T004 antes de T005; T006 depois.
- **US1 (T007–T016)** depende da Foundational. **US2 (T017–T020)** e **US3 (T021–T022)** dependem
  de US1 (tela da rodada e hook). **US4 (T023–T024)** depende de US1 (fim da rodada) mas o
  componente pode ser feito em paralelo. **US5 (T025–T029)** depende só da Foundational e do
  `MatchSummary` (T024) para o diálogo. **US6 (T030–T031)** depende de US3 (direto) e da tabela.
- **Polish (T032–T036)** por último.

### Parallel Opportunities

- Setup: T001 e T002.
- Foundational: T003 e T004 (testes) juntos.
- US1: T007 e T008 juntos; T010, T013, T014 juntos depois de T009/T011.
- US4/US5: T023, T025 juntos; T026, T027, T028 juntos.
- Polish: T032, T033, T035.

## Parallel Example: User Story 1

```text
Task: "T007 events.test.ts (variações e formatEvent)"
Task: "T008 live-round.test.tsx (relógio, placares, feed, salvamento)"
# depois de T009/T011:
Task: "T010 event-text.ts"
Task: "T013 LiveGrid.tsx"
Task: "T014 EventFeed.tsx"
```

## Parallel Example: User Story 5

```text
Task: "T026 CompetitionTabs.tsx"
Task: "T027 resultados/page.tsx"
Task: "T028 artilharia/page.tsx"
```

## Implementation Strategy

### MVP First (User Story 1)

1. Setup + Foundational (rodada ao vivo no motor, `advanceSeason` refatorado sem mudar resultados).
2. US1: assistir à rodada e salvar.
3. **Parar e validar**: uma rodada ao vivo dá o mesmo resultado que o direto.

### Incremental Delivery

1. US1 → rodada ao vivo.
2. US2 → pausa e decisões.
3. US3 → direto e "terminar agora".
4. US4 → resumo da partida.
5. US5 → resultados e artilharia.
6. US6 → fim de temporada (fecha o Marco 2).
7. Polish → teclado, E2E, documentação e roteiro manual.

### Notes

- O motor continua sem relógio real: velocidade e pausa são só da interface.
- Marcar cada tarefa como `[X]` ao concluir.
