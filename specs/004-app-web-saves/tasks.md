---

description: "Lista de tarefas da feature 004 — aplicação web, novo jogo e saves"
---

# Tasks: Aplicação web, novo jogo e saves

**Input**: Design documents from `specs/004-app-web-saves/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: O pacote `packages/save` é lógica pura e segue o Princípio IX (testes antes). A interface
também é testada antes da implementação nos fluxos dos critérios de aceite (criar, recarregar,
duas carreiras, migração, autosave), com happy-dom + fake-indexeddb; reload real e offline com
Playwright (`pnpm test:e2e`).

**Organization**: tarefas agrupadas por user story, em ordem de prioridade (US1 → US2 → US3 → US4).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1, US2, US3, US4
- Caminhos relativos à raiz do repositório

## Referências rápidas

- Save e armazenamento: `specs/004-app-web-saves/contracts/save-format.md`
- Rotas, telas e atalhos: `specs/004-app-web-saves/contracts/ui.md`
- Decisões (R1–R11): `specs/004-app-web-saves/research.md`
- API do motor usada pela UI: `validateBank`, `joinBankFiles`, `completeHiddenAttributes`,
  `createSeason`, `advanceSeason`, `standings`, `seasonStats`, `unavailablePlayers`,
  `clubStrength`, `ageOn`, tipos `CompletedBank`, `Season`, `MatchRecord`, `Crest`.
- Regras: Next.js só em static export (sem route handlers, server actions, middleware, `next/image`
  otimizado); nenhuma regra de jogo no app; nenhuma string visível fora do i18n; nenhum
  `Math.random`/`Date` no motor (na UI podem ser usados para seed e data do save).

---

## Phase 1: Setup

- [X] T001 Add `mods/*` to `pnpm-workspace.yaml` and create `mods/default/package.json` (`@brasfoot-like/default-mod`, private, `exports` mapping `./mod.json`, `./countries.json`, `./competitions.json`, `./clubs.json`, `./players.json`); keep Biome ignoring `mods/`
- [X] T002 [P] Create `packages/save/` (`package.json` as `@brasfoot-like/save` with deps `@brasfoot-like/engine` and `zod`, `tsconfig.json` like the engine with `types: []` for `src` and a `test/tsconfig.json` with node types, `vitest.config.ts`, `src/index.ts` placeholder) and add it to the root `vitest.config.ts` projects
- [X] T003 [P] Create `apps/web/` with Next.js 16 + React 19: `package.json` (`@brasfoot-like/web`; deps `next`, `react`, `react-dom`, `idb`, workspace `@brasfoot-like/engine`, `@brasfoot-like/i18n`, `@brasfoot-like/save`, `@brasfoot-like/default-mod`; devDeps `@types/react`, `@types/react-dom`, `@testing-library/react`, `@testing-library/user-event`, `happy-dom`, `fake-indexeddb`, `@playwright/test`; scripts `dev`, `build` (then `tsx ../../tools/src/precache.ts`), `preview`, `typecheck`, `test:e2e`), `next.config.ts` (`output: "export"`, `trailingSlash: true`, `images: { unoptimized: true }`, `transpilePackages` with the workspace packages), `tsconfig.json` (strict, DOM lib), `src/app/layout.tsx` and an empty `src/app/page.tsx`
- [X] T004 [P] Create `apps/web/vitest.config.ts` (happy-dom environment, `test/setup.ts` importing `fake-indexeddb/auto` and `@testing-library/jest-dom`-free cleanup) and add `apps/web` to the root `vitest.config.ts` projects; add root scripts `dev:web`, `build:web`, `preview:web`, `test:e2e`
- [X] T005 [P] Create `apps/web/playwright.config.ts` (Chromium only; `webServer` serving `apps/web/out` with a static server on port 4173 via `tsx ../../tools/src/serve-static.ts`) and `tools/src/serve-static.ts` (minimal Node static server with correct MIME types and `trailingSlash` handling)
- [X] T006 Run `pnpm install`, `pnpm --filter @brasfoot-like/web build` (empty export works) and `pnpm typecheck && pnpm lint && pnpm test`

**Checkpoint**: app vazio compila em static export; pacotes novos no workspace.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: nenhuma user story começa antes desta fase terminar.

- [X] T007 [P] Create `packages/i18n/locales/pt-BR/ui.json` with the UI messages known so far (app title, opening screen, navigation labels, buttons, table headers, save errors `save.*`, storage warnings, shortcut help) and implement `formatUi(key, values?)` + `uiKeys()` in `packages/i18n/src/format.ts`, exported from `packages/i18n/src/index.ts`; add a compile test for every `ui.json` message in `packages/i18n/test/ui-messages.test.ts`
- [X] T008 [P] Implement `apps/web/src/i18n/index.tsx`: `useT()` (returns `t(key, values?)` over `formatUi`), `<T k values />`, `formatDateTime(iso)` and `formatNumber(n)` with `Intl` pt-BR, plus `label(catalogKey)` over `formatLabel`
- [X] T009 [P] Create design tokens and global styles in `apps/web/src/styles/tokens.css` and `apps/web/src/styles/global.css` (dark readable theme, system font stack, spacing scale, visible focus ring, table styles, layout min width rules per FR-023) and import them in `apps/web/src/app/layout.tsx` (`<html lang="pt-BR">`, title via `formatUi`)
- [X] T010 [P] Write `apps/web/test/ui/crest.test.tsx`: renders an SVG for each shape (`classic`, `round`, `triangle`, `rectangle`), uses the club colors, shows the initials, scales with a `size` prop, picks a readable text color for light and dark primaries
- [X] T011 [P] Write `apps/web/test/ui/table.test.tsx` for a generic sortable `DataTable`: renders headers and rows, sorts by clicking a header and by `Enter` on a focused header, toggles direction, keeps a stable order for ties, supports a highlighted row
- [X] T012 Implement `apps/web/src/ui/Crest.tsx` (research R8) and `apps/web/src/ui/DataTable.tsx` (with `aria-sort`) to pass T010/T011, plus `apps/web/src/ui/Button.tsx` and `apps/web/src/ui/Dialog.tsx` (accessible modal, closes on `Esc`, focus trap)
- [X] T013 Implement the game state skeleton in `apps/web/src/game/GameProvider.tsx` (context + `useReducer` with the `GameState` of data-model.md, `useGame()` hook) and `apps/web/src/game/default-bank.ts` (imports the 5 files of `@brasfoot-like/default-mod` and exposes `defaultBankInput()` via `joinBankFiles`); wrap the app in the provider in `apps/web/src/app/layout.tsx`
- [X] T014 Run all gates

**Checkpoint**: textos, escudos, tabelas e o provider prontos.

---

## Phase 3: User Story 1 - Criar uma carreira escolhendo um clube (Priority: P1) 🎯 MVP

**Goal**: nome do técnico + escolha de clube da Série A com informações básicas → carreira criada e
tela inicial do clube.

**Independent Test**: criar carreira e ver técnico, clube, temporada e rodada 1/38 na tela inicial.

### Testes (escrever primeiro; devem falhar)

- [X] T015 [P] [US1] Write `packages/save/test/create.test.ts`: `createSave` with valid input returns a save with `formatVersion: 1`, the given id/dates/manager/club/seed, a bank whose players all have complete `hidden`, and a season of the Série A with `seed` equal to the save seed and `nextRound: 1`; trims the name; rejects empty/whitespace and > 40 chars (`save.invalid_name`), a club outside the Série A (`save.club_not_in_league`) and an invalid bank (`save.invalid_bank`); same seed + club ⇒ identical bank and calendar
- [X] T016 [P] [US1] Write `apps/web/test/flows/new-career.test.tsx`: the new career screen lists the 20 Série A clubs with crest, name, city, reputation, average strength (16 best) and stadium; sorting by strength works; confirming with an empty name shows the validation message and does not create; with "Ana Souza" and a club, the home screen shows the manager, club, season year and "rodada 1 de 38"; the advanced seed field is optional

### Implementação

- [X] T017 [P] [US1] Implement `SaveFile`, `SaveError`, `SAVE_FORMAT_VERSION` in `packages/save/src/format.ts` and `createSave` in `packages/save/src/create.ts` per contracts/save-format.md; export from `packages/save/src/index.ts`
- [X] T018 [P] [US1] Implement `apps/web/src/game/selectors.ts`: `leagueClubs(bank)` (Série A clubs with reputation, `clubStrength`, stadium, city, crest) and `seasonYear(bank)`
- [X] T019 [P] [US1] Implement `apps/web/src/game/ids.ts`: `newCareerId()` and `newSeed()` using `crypto.getRandomValues` (UI layer only)
- [X] T020 [US1] Implement the `createCareer({ managerName, clubId, seed? })` action in `apps/web/src/game/GameProvider.tsx` (calls `createSave` with `new Date().toISOString()`, sets state `ready`; errors shown via `formatUi`)
- [X] T021 [US1] Implement the new career page in `apps/web/src/app/nova-carreira/page.tsx` (+ CSS module): name field (max 40, inline validation), collapsible advanced seed field, sortable clubs `DataTable` with crests, selected club summary, confirm button; navigates to `/jogo?c=<id>` on success
- [X] T022 [US1] Implement a first version of the home page in `apps/web/src/app/jogo/page.tsx` showing manager, club (crest + name), season year and current round (full dashboard comes in US4)

**Checkpoint**: carreira criada em memória e tela inicial do clube.

---

## Phase 4: User Story 2 - Saves: continuar, várias carreiras, apagar (Priority: P1)

**Goal**: persistência local, lista de carreiras, continuar, apagar, migração, saves danificados e
de versão futura, conflito entre abas.

**Independent Test**: duas carreiras, "recarregar" (remontar o app sobre o mesmo IndexedDB),
continuar cada uma no estado certo, apagar uma sem afetar a outra.

### Testes (escrever primeiro; devem falhar)

- [X] T023 [P] [US2] Write `packages/save/test/migrate.test.ts`: a current save passes unchanged (`status: "ok"`, no `migratedFrom`); a simulated v0 save with an injected migration v0→v1 is migrated and validated (`migratedFrom: 0`); a chain v0→v1→v2 with injected migrations is applied in order; `formatVersion` greater than current ⇒ `future_version` with the version and the input untouched; garbage input, missing fields, invalid bank or season of another shape ⇒ `corrupt`
- [X] T024 [P] [US2] Write `packages/save/test/summary.test.ts`: `summarize` returns manager, club id/name/crest, season year, round (capped at the last round), `seasonOver` and `savedAt`; `touch` updates only `savedAt`
- [X] T025 [P] [US2] Write `apps/web/test/storage/indexeddb.test.ts` (fake-indexeddb): save/load round trip; `listSummaries` sorted by `savedAt` desc; `remove` deletes save and summary; saving a migrated save rewrites it; `save` with a stale `expectedSavedAt` returns `conflict` and does not write; a simulated `QuotaExceededError` returns `quota`; an unreadable stored record loads as `corrupt` and still appears in the list
- [X] T026 [P] [US2] Write `apps/web/test/flows/saves.test.tsx`: create a career, unmount, mount the app again on the same DB → opening screen shows "Continuar" and leads to the same club/round/table; two careers coexist and advancing one leaves the other identical; the saved careers screen shows manager, crest, club, season, round and formatted date, newest first; delete asks for confirmation, cancel keeps it, confirm removes only that one; a corrupt record and a future-version record are marked and cannot be opened; with storage unavailable the opening screen shows the warning
- [X] T027 [P] [US2] Write `apps/web/test/storage/conflict.test.ts`: two `SaveStore` "tabs" over the same DB — tab B saves after tab A opened the career; tab A's next save gets `conflict`; the game shows the "alterada em outra aba" dialog with reload/overwrite; overwrite writes with the new `expectedSavedAt`

### Implementação

- [X] T028 [P] [US2] Implement `migrateSave` with `MIGRATIONS = []` and envelope Zod schema in `packages/save/src/migrate.ts`, and `summarize`/`touch` in `packages/save/src/summary.ts`; export from `packages/save/src/index.ts`
- [X] T029 [US2] Implement the IndexedDB `SaveStore` in `apps/web/src/storage/indexeddb.ts` with `idb` (stores `saves` and `summaries`, single transaction writes, `expectedSavedAt` check, error mapping to `quota`/`unavailable`/`unknown`, `navigator.storage.persist()` on first save) and `apps/web/src/storage/availability.ts` (detect unavailable storage)
- [X] T030 [P] [US2] Implement `apps/web/src/storage/preferences.ts` (`lastCareerId`, `squadSort` in `localStorage`, all access in try/catch) and `apps/web/src/storage/channel.ts` (`BroadcastChannel` notifications of saves, no-op when unsupported)
- [X] T031 [US2] Wire persistence into `apps/web/src/game/GameProvider.tsx`: `createCareer` saves immediately; `openCareer(id)` loads via `SaveStore` (handles `future_version`/`corrupt`); tracks `savedAt` and shows the conflict dialog (`apps/web/src/ui/ConflictDialog.tsx`) on `conflict` or on a channel message for the open career
- [X] T032 [US2] Implement the opening page `apps/web/src/app/page.tsx` ("Continuar" only when there is a last career, "Nova carreira", "Carreiras salvas", storage warning) and the saved careers page `apps/web/src/app/carreiras/page.tsx` (summaries list with crest, status badges, continue, delete with `Dialog` confirmation)
- [X] T033 [US2] Make `apps/web/src/app/jogo/page.tsx` (and the other game routes via a shared `apps/web/src/game/useCareerFromQuery.ts`) open the career from `?c=<id>`, redirecting to `/` with a message when it does not exist

**Checkpoint**: sair e voltar sem perder progresso; várias carreiras; migração.

---

## Phase 5: User Story 3 - Salvamento automático ao fim de cada rodada (Priority: P2)

**Goal**: "Simular próxima rodada" avança a temporada, mostra os resultados e salva sozinho.

**Independent Test**: simular uma rodada, remontar o app e continuar na rodada seguinte.

### Testes (escrever primeiro; devem falhar)

- [X] T034 [P] [US3] Write `apps/web/test/flows/autosave.test.tsx`: on round 3, "Simular próxima rodada" shows the 10 results of round 3 (with the player's match highlighted), the save indicator goes saving → saved, and after remounting the app the career is on round 4; with the store forced to return `quota`, a clear warning appears and the game remains usable (can keep simulating in memory); after round 38 the button is disabled and the home shows the season is over with the final table position

### Implementação

- [X] T035 [US3] Implement `simulateNextRound()` in `apps/web/src/game/GameProvider.tsx` (`advanceSeason(save.season, save.bank, { rounds: 1 })`, keep the round's records in `lastRound`, then autosave with `touch` + `expectedSavedAt`; saving state transitions; never blocks the UI thread with the write)
- [X] T036 [P] [US3] Implement `apps/web/src/ui/SaveIndicator.tsx` (saving / saved / failed states with `aria-live="polite"`) and `apps/web/src/ui/RoundResults.tsx` (10 results with crests, player's match highlighted)
- [X] T037 [US3] Add the "Simular próxima rodada" button, the last round results and the season-over state to `apps/web/src/app/jogo/page.tsx`

**Checkpoint**: carreira avança e é salva sozinha a cada rodada.

---

## Phase 6: User Story 4 - Navegar pelas telas principais (Priority: P2)

**Goal**: Início do clube, Elenco, Competição e Calendário completos, com cabeçalho fixo e atalhos.

**Independent Test**: visitar as 4 telas pelo menu e pelos atalhos e conferir o conteúdo.

### Testes (escrever primeiro; devem falhar)

- [X] T038 [P] [US4] Write `apps/web/test/ui/home.test.tsx`: next match (opponent crest/name, home/away, round), table position and the last 5 results after a few simulated rounds
- [X] T039 [P] [US4] Write `apps/web/test/ui/squad.test.tsx`: all club players with translated position, display name, age (from `ageOn` and the reference date), strength and translated traits; sortable by every column; no hidden attribute value rendered anywhere; suspended/injured players marked after forcing a status in the season
- [X] T040 [P] [US4] Write `apps/web/test/ui/competition-calendar.test.tsx`: competition table with all FR-018 columns, crests and the player's club highlighted; calendar with 38 rounds showing opponent, venue and score for played rounds, next round highlighted, and the "all matches of the round" view
- [X] T041 [P] [US4] Write `apps/web/test/ui/shortcuts.test.tsx`: `1`–`4` navigate between the four screens, `S` simulates the next round, `?` opens the help dialog listing every shortcut, `Esc` closes it, shortcuts are ignored while typing in a text field, all interactive elements are reachable with `Tab`

### Implementação

- [X] T042 [P] [US4] Implement home selectors in `apps/web/src/game/selectors.ts`: `nextFixture(season, clubId)`, `clubPosition(season, bank, clubId)`, `lastResults(season, clubId, 5)`
- [X] T043 [US4] Implement `apps/web/src/ui/AppHeader.tsx` (crest, club, manager, season and round, nav links for the 4 screens preserving `?c=`, save indicator, help button) and `apps/web/src/game/GameLayout.tsx` used by all `/jogo/*` routes
- [X] T044 [US4] Complete the home dashboard in `apps/web/src/app/jogo/page.tsx` (next match card, position, last 5 results, simulate button, last round results)
- [X] T045 [P] [US4] Implement the squad page `apps/web/src/app/jogo/elenco/page.tsx` (sortable `DataTable`, translated labels, availability badges via `unavailablePlayers`, sort preference saved)
- [X] T046 [P] [US4] Implement the competition page `apps/web/src/app/jogo/competicao/page.tsx` (`standings` in a `DataTable`, form chips, highlighted club)
- [X] T047 [P] [US4] Implement the calendar page `apps/web/src/app/jogo/calendario/page.tsx` (38 rounds list, scores from records, next round highlighted, round detail with all fixtures)
- [X] T048 [US4] Implement `apps/web/src/ui/useShortcuts.ts` and `apps/web/src/ui/ShortcutsHelp.tsx` (global keydown, ignored in inputs/textareas/contenteditable) and register the shortcuts in `GameLayout`

**Checkpoint**: as quatro histórias funcionam.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T049 [P] Write `apps/web/test/i18n/no-literals.test.ts`: scans every `.tsx` under `apps/web/src` and fails on JSX text containing letters and on literal `title`/`aria-label`/`placeholder`/`alt` values; also checks that every `formatUi` key used in the code exists in `ui.json` (SC-006)
- [X] T050 Implement the offline support: `apps/web/public/sw.js` (install: precache from `precache.json`; activate: delete old caches; fetch: cache-first for same-origin GET), `tools/src/precache.ts` (scan `apps/web/out`, write `out/precache.json` with file list and content hash) and service worker registration only in production builds in `apps/web/src/app/register-sw.tsx`
- [X] T051 [P] Write Playwright specs in `apps/web/e2e/career.spec.ts` (create career → reload → continue on the same round; two careers coexist; delete one) and `apps/web/e2e/offline.spec.ts` (first visit online, then `context.setOffline(true)`, reload, open the career and simulate a round)
- [X] T052 Run `pnpm exec playwright install chromium` and `pnpm test:e2e`; if the browser cannot run in this environment, record why in `specs/004-app-web-saves/quickstart.md` and keep the specs ready
- [X] T053 [P] Measure SC-005 in `apps/web/test/flows/performance.test.tsx` (list of 10 summaries < 1 s, open career < 2 s, autosave keeps the main thread busy < 200 ms using a fake-indexeddb store)
- [X] T054 [P] Add a README for the app at `apps/web/README.md` (how to run, build, preview, test, E2E; static export constraints) and sync `specs/004-app-web-saves/contracts/*.md` and `data-model.md` with the implementation
- [X] T055 Run every step of `specs/004-app-web-saves/quickstart.md` (gates, build + preview, manual route through all screens with keyboard only, E2E) and fix divergences

---

## Dependencies & Execution Order

- **Setup (1)** → **Foundational (2)** → **US1 (3)** → **US2 (4)** → **US3 (5)** → **US4 (6)** →
  **Polish (7)**.
- US2 persiste a carreira criada em US1; US3 usa a persistência de US2; US4 pode começar após US1
  (telas sobre a carreira em memória), mas T043/T044 tocam `jogo/page.tsx` já alterado em US3 —
  executar depois de US3 evita conflitos.
- Dentro das fases: testes primeiro; US1: T017–T019 → T020 → T021 → T022. US2: T028 → T029 →
  T031 → T032 → T033. US3: T035 → T037. US4: T042 → T043 → T044; T045–T047 em paralelo; T048.

### Parallel Opportunities

- Setup: T002, T003, T004, T005.
- Foundational: T007–T011.
- US1: T015, T016; T017, T018, T019.
- US2: T023–T027; T028, T030.
- US4: T038–T041; T045, T046, T047.
- Polish: T049, T051, T053, T054.

## Parallel Example: User Story 2

```bash
Task: "Write migrate tests in packages/save/test/migrate.test.ts"
Task: "Write summary tests in packages/save/test/summary.test.ts"
Task: "Write IndexedDB store tests in apps/web/test/storage/indexeddb.test.ts"
Task: "Write saves flow tests in apps/web/test/flows/saves.test.tsx"
Task: "Write tab conflict tests in apps/web/test/storage/conflict.test.ts"
```

## Parallel Example: User Story 4

```bash
Task: "Implement squad page in apps/web/src/app/jogo/elenco/page.tsx"
Task: "Implement competition page in apps/web/src/app/jogo/competicao/page.tsx"
Task: "Implement calendar page in apps/web/src/app/jogo/calendario/page.tsx"
```

## Implementation Strategy

### MVP First (User Story 1)

1. Setup + Foundational.
2. US1: criar carreira e ver a tela inicial.
3. **Parar e validar**: `pnpm dev:web` e criar uma carreira.

### Incremental Delivery

1. US1 → carreira criada (MVP).
2. US2 → saves (sair e voltar sem perder progresso).
3. US3 → rodadas simuladas com salvamento automático.
4. US4 → telas completas e atalhos.
5. Polish → offline, E2E, i18n verificado.

### Notes

- Situações raras (save corrompido, versão futura, armazenamento cheio, duas abas) são simuladas
  nos testes manipulando o IndexedDB falso ou o `SaveStore`.
- Commit ao fim de cada tarefa ou grupo lógico (sem auto-commit dos hooks).
