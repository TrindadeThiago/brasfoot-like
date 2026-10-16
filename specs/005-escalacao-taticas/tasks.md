---

description: "Lista de tarefas da feature 005 — escalação e táticas"
---

# Tasks: Escalação e táticas

**Input**: Design documents from `specs/005-escalacao-taticas/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: o módulo novo do motor (`packages/engine/src/lineup/`) e a migração do save seguem o
Princípio IX (testes antes, devem falhar primeiro). Os fluxos da interface ligados aos critérios
de aceite (simular com escalação inválida, escalação usada na partida, teclado, atributos
ocultos) também são testados antes, com happy-dom + fake-indexeddb; o fluxo completo com reload
roda no Playwright.

**Organization**: tarefas agrupadas por user story, em ordem de prioridade (US1 → US2 → US3 → US4
→ US5).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 … US5
- Caminhos relativos à raiz do repositório

## Referências rápidas

- API nova do motor: `specs/005-escalacao-taticas/contracts/lineup-api.md`
- Telas, interação e atalhos: `specs/005-escalacao-taticas/contracts/ui.md`
- Decisões (R1–R9): `specs/005-escalacao-taticas/research.md`
- Já existentes no motor: `autoLineup`, `slotValue` (`match/auto-lineup.ts`), `maximizeAssignment`
  (`match/hungarian.ts`), `adequacy` (`match/adequacy.ts`), `FORMATIONS`/`slotPosition`
  (`match/formations.ts`), `lineupForMatch`/`SEASON_BENCH_LIMIT`/`preferredFormation`
  (`season/lineups.ts`), `advanceSeason(season, world, step, lineups?)`, `seasonStats`
- Helpers de teste do motor: `packages/engine/test/helpers/`; do app: `apps/web/test/helpers/`

---

## Phase 1: Setup

**Purpose**: estrutura do módulo novo e textos

- [X] T001 Create the module skeleton `packages/engine/src/lineup/index.ts` (empty re-exports for `validate`, `adjust`, `formation`, `auto`) and export it from `packages/engine/src/index.ts`; also export `lineupForMatch` and `SEASON_BENCH_LIMIT` from `packages/engine/src/index.ts`
- [X] T002 [P] Add the pt-BR strings for this feature to `packages/i18n/locales/pt-BR/ui.json`: nav `nav.lineup`; lineup screen (`lineup.*`: title, formation, posture, posture names via catalog if present else `lineup.posture.defensive|balanced|attacking`, auto button, starters, bench `{count}/{max}`, outside, empty slot, select/cancel announcements, details button); issues (`lineupIssue.empty_slot|unknown_slot|duplicate_player|not_in_squad|unavailable|bench_too_large|unknown_formation|no_goalkeeper|short_squad|out_of_position` with ICU params); changes (`lineupChange.starter_replaced|bench_removed|short_squad`), notice title/dismiss/go; simulate dialogs (`simulate.invalidTitle`, `simulate.noGoalkeeperTitle`, `simulate.playAnyway`, `simulate.goToLineup`); squad filters and column (`squad.filter.*`, `squad.inLineup.starter|bench|out`); player details (`player.*`); shortcuts help lines for `5`, `A`, `I`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tipos, indisponibilidade e o save v2 — base de todas as histórias

**⚠️ CRITICAL**: nenhuma história começa antes desta fase

- [X] T003 Define the types `Unavailability`, `LineupIssue`, `LineupIssueCode`, `LineupValidation`, `LineupChange`, `Place` in `packages/engine/src/lineup/types.ts` exactly as in `specs/005-escalacao-taticas/data-model.md` and export them
- [X] T004 Write `packages/engine/test/lineup/unavailability.test.ts`: `clubUnavailability(season, world, clubId)` returns only that club's injured/suspended players with `reason` (injury wins when both) and `remaining = max(injury, suspension)`, sorted by `remaining` then id
- [X] T005 Implement `clubUnavailability` in `packages/engine/src/lineup/unavailability.ts` (reuse the logic of `sideLineup` in `packages/engine/src/season/season.ts`; refactor `sideLineup` to call it so both stay identical)
- [X] T006 [P] Write `packages/save/test/migrate-v2.test.ts` with a v1 fixture built from the 004 format (`packages/save/test/fixtures.ts`): migration 1 → 2 adds `lineup` equal to `managerAutoLineup(squad, season.formations[clubId], "balanced", clubUnavailability(...)).lineup`, keeps every v1 field, sets `formatVersion: 2`; a v2 save with a malformed `lineup` → `corrupt`; a v3 save → `future_version`
- [X] T007 Implement save v2 in `packages/save/src/format.ts` (`SAVE_FORMAT_VERSION = 2`, `lineup: Lineup`, `lineupNotice?: LineupChange[]`), `packages/save/src/migrate.ts` (`MIGRATIONS = [{ from: 1, migrate }]`, Zod shape for `lineup`/`lineupNotice`, reject lineups with structural errors from `validateLineup` other than `unavailable`) and `packages/save/src/create.ts` (initial `lineup` from `managerAutoLineup` with the preferred formation and `"balanced"`); update `packages/save/test/*.test.ts` and `apps/web/test/helpers/saves.ts` for v2 — depends on T013 (`managerAutoLineup`) and T009 (`validateLineup`): implement those first or stub them, then finish this task after US2/US3 core tasks

**Checkpoint**: tipos e indisponibilidade prontos; o save v2 fecha junto com T009/T013

---

## Phase 3: User Story 1 - Montar a escalação (Priority: P1) 🎯 MVP

**Goal**: o jogador escolhe esquema, postura, titulares e reservas; a partida usa essa escalação e
ela fica salva

**Independent Test**: montar uma escalação diferente da automática, simular a rodada e conferir no
registro da partida titulares, esquema e postura; recarregar e conferir a escalação

### Testes (escrever primeiro; devem falhar)

- [X] T008 [P] [US1] Write `packages/engine/test/lineup/formation.test.ts`: `changeFormation` keeps the same 11 starters, bench and posture, assigns them to the new slots maximizing the sum of `slotValue` (same-position players stay in same-position slots when possible), deterministic tie-breaks, leaves slots empty only if the input had fewer than 11 starters; `placePlayer` swaps slot↔slot, slot↔bench, slot↔out, bench↔out, appends to the bench when `to` is the next free bench index, refuses `bench_full` at 12, never duplicates a player, A↔B twice returns the original
- [X] T009 [P] [US1] Write `packages/engine/test/lineup/validate.test.ts` (shared with US3): a valid lineup → `valid: true`; each error code produced for its case (`empty_slot`, `unknown_slot`, `duplicate_player`, `not_in_squad`, `unavailable` with `reason`/`remaining`, `bench_too_large`, `unknown_formation`); `out_of_position` info with the engine `adequacy` value; `no_goalkeeper` warning when the `gk` slot holds a non-GK (with adequacy 0.3); `short_squad` warning when fewer than 11 players are available; issue ordering by severity then slot/bench order; runs in < 1 ms for a 30-player squad (median of 50 runs)
- [X] T010 [P] [US1] Write `apps/web/test/flows/lineup-simulate.test.tsx`: on `/jogo/escalacao`, swap a starter with an outside player, change formation and posture, then simulate from `/jogo`; the stored `MatchRecord` for the player's club used exactly those starters (via `record.players`/events side) and the season record reflects the formation; reload (re-render with the same store) keeps the lineup

### Implementação

- [X] T011 [US1] Implement `changeFormation` and `placePlayer` in `packages/engine/src/lineup/formation.ts` using `maximizeAssignment` and `slotValue` (contract in `contracts/lineup-api.md`)
- [X] T012 [US1] Implement `validateLineup` in `packages/engine/src/lineup/validate.ts` (severities and params per `research.md` R3; no allocations beyond one pass over slots and bench)
- [X] T013 [US1] Implement `managerAutoLineup` in `packages/engine/src/lineup/auto.ts` as `lineupForMatch(squad, formation, unavailable)` with the given posture (needed by the save v2 and by US2); then finish T007
- [X] T014 [US1] Extend `apps/web/src/game/GameProvider.tsx`: actions `setLineup(lineup)` (also keeps `season.formations[clubId] = lineup.formation`), `changeFormation(id)`, `setPosture(p)`, `placePlayer(from, to)`; every change goes through the existing autosave; `simulateNextRound` passes `{ [clubId]: save.lineup }` to `advanceSeason` (validation handled in US3)
- [X] T015 [P] [US1] Implement `apps/web/src/game/lineup-selection.ts` (two-step selection state: `select(place)`, `cancel()`, returns the pending `{ from, to }` when a destination is chosen) with a small unit test in `apps/web/test/ui/lineup-selection.test.ts`
- [X] T016 [P] [US1] Implement `apps/web/src/ui/Pitch.tsx` (+ css): slots grouped by line (GK, defense, midfield, attack) from `FORMATIONS[formation].slots`, each a button with position, name, effective strength (`strength × adequacy`), "fora de posição · rende N%" badge and unavailability badge; `aria-pressed` when selected
- [X] T017 [P] [US1] Implement `apps/web/src/ui/LineupList.tsx` (+ css): bench (`n/12`, ordered, next free position as a target) and "fora da relação" (sorted by position then strength), rows as buttons with condition
- [X] T018 [US1] Implement the page `apps/web/src/app/jogo/escalacao/page.tsx` with `GameLayout`: formation and posture selects, `Pitch`, `LineupList`, selection wiring, live region announcing selection/swap; add `/jogo/escalacao` to `GAME_SCREENS` in `apps/web/src/ui/AppHeader.tsx` (order: Início, Elenco, Escalação, Competição, Calendário) and shortcuts `1`–`5` in `apps/web/src/game/GameLayout.tsx` and `apps/web/src/ui/ShortcutsHelp.tsx`; update `apps/web/test/ui/shortcuts.test.tsx` for 5 screens

**Checkpoint**: US1 funcional — escalação manual usada nas partidas e salva

---

## Phase 4: User Story 2 - Escalar automaticamente (Priority: P1)

**Goal**: o botão monta o mesmo time que o computador escolheria no esquema atual

**Independent Test**: para cada esquema, com e sem indisponíveis, o botão produz titulares e
reservas iguais aos de `lineupForMatch`

### Testes (escrever primeiro; devem falhar)

- [X] T019 [P] [US2] Write `packages/engine/test/lineup/auto.test.ts`: for the 6 formations × {no unavailable, 3 unavailable, short squad (forced so fewer than 11 available)}, `managerAutoLineup(squad, f, posture, u)` equals `lineupForMatch(squad, f, u)` in starters, bench and `fielded`, with `posture` replaced; result passes `validateLineup` without errors outside the short-squad case
- [X] T020 [P] [US2] Write `apps/web/test/ui/lineup-auto.test.tsx`: after manual changes, "Escalar automaticamente" (button and `A` shortcut) replaces starters and bench with the automatic lineup for the current formation and keeps formation and posture; a new career opens the lineup screen already filled with the preferred formation and balanced posture

### Implementação

- [X] T021 [US2] Add `autoLineup()` to `apps/web/src/game/GameProvider.tsx` (uses `managerAutoLineup` with `clubUnavailability`) and the button + `A` shortcut on `apps/web/src/app/jogo/escalacao/page.tsx` (shortcut active only on this screen)

**Checkpoint**: US1 + US2 — manual e automática

---

## Phase 5: User Story 3 - Avisos e bloqueio de escalação inválida (Priority: P1)

**Goal**: nenhuma partida com escalação inválida; avisos claros; ajuste automático entre rodadas

**Independent Test**: com um titular suspenso ou vaga vazia, "Simular" não avança a rodada e
lista o problema; depois de uma rodada com lesão, a escalação é ajustada com aviso

### Testes (escrever primeiro; devem falhar)

- [X] T022 [P] [US3] Write `packages/engine/test/lineup/adjust.test.ts`: unavailable bench players removed (`bench_removed`); each unavailable starter replaced by the available non-starter with the highest `slotValue` for that slot (bench player leaves the bench) (`starter_replaced` with `reason`); available starters untouched; result valid; idempotent; fewer than 11 available → `managerAutoLineup` result with `short_squad`
- [X] T023 [P] [US3] Write `packages/engine/test/lineup/season.test.ts`: simulate a whole season passing the player's lineup every round and calling `adjustLineup` after each round; no round is refused, every lineup passed is valid (SC-001, SC-005), and the run is deterministic for the same seed
- [X] T024 [P] [US3] Extend `apps/web/test/flows/lineup-simulate.test.tsx`: with an empty slot or an unavailable starter (forced in `season.status`), `S`/button does not advance the round and the "Escalação inválida" dialog lists the problem and "Ir para a escalação" navigates there; with a field player in goal, "Time sem goleiro" appears and "Jogar mesmo assim" simulates; after a round that injures a starter, the home screen shows the adjustment notice with the swap, "Dispensar" removes it and it survives reload until dismissed; issues on the lineup screen update immediately after each change

### Implementação

- [X] T025 [US3] Implement `adjustLineup` in `packages/engine/src/lineup/adjust.ts` (research.md R4)
- [X] T026 [US3] Implement `apps/web/src/ui/LineupIssues.tsx` (list grouped by severity; each item focuses the related slot/player) and show it on the lineup screen, recomputed with `validateLineup` on every render
- [X] T027 [US3] In `apps/web/src/game/GameProvider.tsx`: validate before simulating (errors → state `simulateBlocked` with issues; `no_goalkeeper` → `pendingWarning` awaiting confirmation; `short_squad` → simulate without external lineup for the club, research.md R6); after each round and when opening a career run `adjustLineup` and store `lineupNotice`; add `dismissLineupNotice()`
- [X] T028 [US3] Add the simulate dialogs (invalid lineup, no goalkeeper) to `apps/web/src/game/GameLayout.tsx` (so `S` works from any screen) and the adjustment notice card to `apps/web/src/app/jogo/page.tsx`

**Checkpoint**: US1–US3 — critérios de aceite da feature cumpridos

---

## Phase 6: User Story 4 - Elenco: condição, ordenação e filtros (Priority: P2)

**Goal**: ler o elenco de relance com filtros e a situação na escalação

**Independent Test**: filtrar "atacantes disponíveis" e conferir a lista, ordenada pela coluna
escolhida

### Testes (escrever primeiro; devem falhar)

- [X] T029 [P] [US4] Extend `apps/web/test/ui/squad.test.tsx`: sector filter (GK/DEF/MID/ATT), availability filter (all/available/unavailable), filters combine, sort kept when filtering, clear filters, "na escalação" column (starter with slot label, bench, out), filters saved in preferences

### Implementação

- [X] T030 [US4] Add `squadFilter` to `apps/web/src/storage/preferences.ts` and the filters + "na escalação" column to `apps/web/src/app/jogo/elenco/page.tsx` (filter controls are labelled selects or radio groups; sectors from position: GK; FB/CB; DM/MF; FW)

**Checkpoint**: elenco filtrável e ligado à escalação

---

## Phase 7: User Story 5 - Detalhes do jogador (Priority: P3)

**Goal**: atributos visíveis e histórico da temporada, nunca atributos ocultos

**Independent Test**: depois de algumas rodadas, os números do painel batem com `seasonStats` e
nenhum atributo oculto aparece

### Testes (escrever primeiro; devem falhar)

- [X] T031 [P] [US5] Write `apps/web/test/ui/player-details.test.tsx`: opening details from the squad (row action) and from the lineup screen (`I` or "Detalhes"); shows position, strength, age, nationality name, traits, condition and the season stats equal to `seasonStats` for that player; a player who has not played shows zeros and the "não jogou" message; `Esc` closes and returns focus
- [X] T032 [P] [US5] Write `apps/web/test/ui/no-hidden.test.tsx`: render squad, lineup and details screens with players whose hidden values are distinctive (e.g. potential 97, temperament 3) and assert the DOM text and attributes contain none of `potential`, `temperament`, `injuryProneness` keys/labels or those values in a hidden-attribute context (FR-020, SC-006)

### Implementação

- [X] T033 [US5] Implement `apps/web/src/ui/PlayerDetails.tsx` (dialog using `Dialog`; stats from `seasonStats(season)` filtered by player; nationality from the bank countries) and wire it on `apps/web/src/app/jogo/elenco/page.tsx` and `apps/web/src/app/jogo/escalacao/page.tsx` (`I` shortcut on the focused player)

**Checkpoint**: todas as histórias funcionais

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T034 [P] Write `apps/web/test/ui/lineup-keyboard.test.tsx` (SC-004): only with the keyboard, change formation, run auto lineup, swap a starter with an outside player and confirm, asserting every control is reachable with `Tab` and selection works with `Enter`/`Espaço`/`Esc`
- [X] T035 [P] Write `apps/web/e2e/lineup.spec.ts`: open the lineup, swap a starter, change posture, simulate, check the round results include the chosen starter for the player's club (through the match/round view or stored data), reload and check the lineup is the same
- [X] T036 Run the `no-literals` test and fix any string; run `pnpm typecheck && pnpm lint && pnpm test`, `pnpm build:web && pnpm test:e2e`
- [X] T037 [P] Update `apps/web/README.md` (lineup screen, shortcuts 1–5/A/I) and sync `specs/005-escalacao-taticas/contracts/*.md` and `data-model.md` with the implementation; update `specs/004-app-web-saves/contracts/ui.md` navigation note to point to 005
- [X] T038 Run every step of `specs/005-escalacao-taticas/quickstart.md` (gates, manual route keyboard-only on the production build with screenshots checked, E2E) and fix divergences

---

## Dependencies & Execution Order

- **Setup (T001–T002)** → **Foundational (T003–T007)**. T007 (save v2) depends on T012/T013;
  na prática: T003 → T004 → T005 → T008/T009 → T011 → T012 → T013 → T006/T007.
- **US1 (T008–T018)** depende da Foundational. **US2 (T019–T021)** depende de T013 e da tela
  (T018). **US3 (T022–T028)** depende de T012 (validação) e T014 (simular com escalação).
- **US4 (T029–T030)** e **US5 (T031–T033)** dependem só da Foundational e do save v2; podem
  correr em paralelo com US2/US3.
- **Polish (T034–T038)** por último.

### Parallel Opportunities

- Setup: T002 em paralelo com T001.
- Foundational: T006 (teste do save) em paralelo com T004.
- US1: T008, T009, T010 (testes) juntos; T015, T016, T017 juntos depois de T011–T014.
- US2/US3: T019, T020, T022, T023, T024 juntos.
- US4/US5: T029, T031, T032 juntos.
- Polish: T034, T035, T037.

## Parallel Example: User Story 1

```text
Task: "T008 formation.test.ts (changeFormation, placePlayer)"
Task: "T009 validate.test.ts (issues e severidades)"
Task: "T010 lineup-simulate.test.tsx (partida usa a escalação; reload)"
# depois de T011–T014:
Task: "T016 Pitch.tsx"
Task: "T017 LineupList.tsx"
Task: "T015 lineup-selection.ts"
```

## Parallel Example: User Story 3

```text
Task: "T022 adjust.test.ts"
Task: "T023 season.test.ts (temporada inteira com ajuste)"
Task: "T024 lineup-simulate.test.tsx (bloqueio, sem goleiro, aviso de ajuste)"
```

## Implementation Strategy

### MVP First (User Story 1)

1. Setup + Foundational (com `validateLineup` e `managerAutoLineup` adiantados para fechar o save
   v2).
2. US1: escalação manual usada na partida e salva.
3. **Parar e validar**: simular algumas rodadas com uma escalação manual e recarregar.

### Incremental Delivery

1. US1 → escalação manual.
2. US2 → botão automático idêntico ao computador.
3. US3 → bloqueio, avisos e ajuste entre rodadas (fecha os critérios de aceite).
4. US4 → filtros no elenco.
5. US5 → detalhes do jogador.
6. Polish → teclado, E2E, documentação e roteiro manual.

### Notes

- Motor: nenhuma função nova usa `Math.random`, `Date` ou estado global; desempates por id.
- A UI nunca decide regra de escalação: só chama `validateLineup`, `adjustLineup`,
  `changeFormation`, `placePlayer`, `managerAutoLineup`.
- Marcar cada tarefa como `[X]` ao concluir.
