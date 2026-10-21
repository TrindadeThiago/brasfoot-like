---

description: "Lista de tarefas da feature 016 — Polimento e publicação"
---

# Tasks: Polimento e publicação

**Input**: Design documents from `specs/016-polimento-publicacao/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: a spec exige verificações automáticas (contraste, atalhos, textos, desempenho, a11y,
teclado, offline, rede). Cada história começa pelos seus testes. Fluxos de interface com
happy-dom; Playwright para a11y, teclado, primeiro acesso, configurações, atualização, offline e
rede. Sem código novo no motor.

**Organization**: tarefas por user story, em ordem de prioridade (P1: US1, US2, US6 → P2: US3,
US4, US7 → P3: US5). US2 vem antes de US1 porque as dicas são reativadas em Configurações.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 … US7
- Caminhos relativos à raiz do repositório

## Referências rápidas

- Telas, dicas, ajuda, temas, checklist de consistência: `specs/016-polimento-publicacao/contracts/ui.md`
- Workflows, `check-release`, segredos, roteiro: `specs/016-polimento-publicacao/contracts/release.md`
- Decisões R1–R13 (limites de desempenho em R1): `specs/016-polimento-publicacao/research.md`
- Preferências, Tip, Shortcut, ReleaseNotes: `specs/016-polimento-publicacao/data-model.md`
- Já existentes: `useShortcuts` (`apps/web/src/ui/useShortcuts.ts`), `ShortcutsHelp`
  (`apps/web/src/ui/ShortcutsHelp.tsx`, lista fixa), preferências
  (`apps/web/src/storage/preferences.ts`), tokens (`apps/web/src/styles/tokens.css`), SW
  (`apps/web/public/sw.js` + `tools/src/precache.ts`), teste de literais
  (`apps/web/test/i18n/no-literals.test.ts`), desempenho (`apps/web/test/flows/performance.test.tsx`),
  helpers de carreira (`packages/save/test/helpers.ts`), e2e helpers (`apps/web/e2e/helpers.ts`)
- Antes de cada commit: `rm -f apps/web/AGENTS.md` e `git checkout -- apps/web/next-env.d.ts`

---

## Phase 1: Setup

- [X] T001 Set the root `package.json` `version` to `1.0.0`; add `zod` (same range as `packages/engine/package.json`) to `apps/web/package.json` and `packages/i18n/package.json`, and `@axe-core/playwright` as a devDependency of `apps/web`; add scripts `check-release` and `screenshots` to `tools/package.json` and the root `package.json`; run `pnpm install`
- [X] T002 [P] Expose the version in `apps/web/next.config.ts` (`env.NEXT_PUBLIC_APP_VERSION` read from the root `package.json`) and create `apps/web/src/app-info.ts` (`APP_VERSION`, `appName()` = `t("app.name")`)

---

## Phase 2: Foundational (bloqueia as histórias)

- [X] T003 [P] Write `apps/web/test/storage/preferences.test.ts`: defaults for `theme` ("system"), `locale` ("pt-BR"), `tips` ({dismissed: [], skipAll: false}); unknown/invalid values in any field fall back to the default without throwing (FR-012); existing fields (`roundSpeed`, `autoPause`, filters) keep working; unavailable storage returns defaults
- [X] T004 Extend `apps/web/src/storage/preferences.ts` per data-model.md (Zod schema with `.catch` per field; new `theme`, `locale`, `tips`, `lastSeenVersion`; same localStorage key) and add a tiny subscribe/notify so screens react to changes (`usePreference(key)` hook in `apps/web/src/storage/usePreferences.ts`)
- [X] T005 [P] Write `apps/web/test/ui/shortcuts-registry.test.ts`: no key repeated inside a scope, no screen key equal to a global key, every entry has an existing `help.*` text, every id passed to `useShortcuts` in `apps/web/src/**` exists in the registry (scan source), and the existing keys keep their meaning (1–6, H, M, C, J, [ ], N, S, D, Espaço, + -, F, A, I, Enter, ?, Esc)
- [X] T006 Create `apps/web/src/ui/shortcuts.ts` (`SHORTCUTS` registry with `id`, `keys`, `labelKey`, `scope`, `display`; `ScreenId` union per data-model.md) and refactor `apps/web/src/ui/useShortcuts.ts` to take `{ [id]: handler }`, resolving keys from the registry; migrate every caller (`apps/web/src/game/GameLayout.tsx`, `apps/web/src/app/jogo/rodada/page.tsx`, `apps/web/src/app/jogo/escalacao/page.tsx`, `apps/web/src/app/jogo/fim-de-temporada/page.tsx`, `apps/web/src/ui/DivisionTabs.tsx`) without changing behavior; existing shortcut tests (`apps/web/test/ui/shortcuts.test.tsx`, `live-keyboard`, `lineup-keyboard`) stay green
- [X] T007 Resolve the current `ScreenId` for the help and the tips — done as `screenOf(pathname)` in `apps/web/src/ui/shortcuts.ts` (route → screen), no context needed
- [X] T008 [P] Rename the visible game name: `app.name` = "Treinador FC" in `packages/i18n/locales/pt-BR/ui.json`, `app.title` uses it; extend `apps/web/test/i18n/no-literals.test.ts` to fail if any value of `ui.json`/`errors.json` contains "brasfoot" (case insensitive) (FR-038)

**Checkpoint**: preferências tipadas, atalhos por registro, nome novo — telas inalteradas.

---

## Phase 3: User Story 2 - Configurações (Priority: P1)

**Goal**: tela de Configurações com velocidade, pausa automática, tema, idioma e reativar dicas;
tema claro em todas as telas.

**Independent Test**: abrir Configurações da inicial e do jogo; tema claro + velocidade rápida;
recarregar mantém; a rodada ao vivo começa rápida.

### Tests for User Story 2

- [X] T009 [P] [US2] Write `apps/web/test/ui/settings.test.tsx`: opens from the opening page and from the game header; changing speed/auto-pause updates the same preferences the live round reads (FR-009); theme change sets `document.documentElement.dataset.theme` immediately; "system" follows a mocked `matchMedia` change; language select lists only "Português (Brasil)"; "Mostrar as dicas de novo" resets `tips`; Voltar returns to the previous route
- [X] T010 [P] [US2] Write `apps/web/test/ui/contrast.test.ts`: parse `apps/web/src/styles/tokens.css` for both themes and assert WCAG contrast ≥ 4.5:1 for text pairs (text/muted/accent/danger/warning on bg/surface/surface-2) and ≥ 3:1 for border, focus ring and win/draw/loss on surfaces (FR-017)
- [X] T011 [P] [US2] Write `apps/web/e2e/settings.spec.ts`: switch to light theme, reload, still light; set fast speed, start a live round, speed select shows "rápida"

### Implementation for User Story 2

- [X] T012 [US2] Add the light theme tokens under `[data-theme="light"]` (and `color-scheme`) in `apps/web/src/styles/tokens.css`; fix any component CSS that hard-codes colors instead of tokens (`apps/web/src/**/*.module.css`) until T010 passes
- [X] T013 [US2] Add the pre-paint theme script in `apps/web/src/app/layout.tsx` (inline `<script>` in `<head>` reading the preferences key and `prefers-color-scheme`) and create `apps/web/src/ui/ThemeProvider.tsx` (applies `data-theme` on change, listens to the system when "system")
- [X] T014 [US2] Add `LOCALES` (derived from the locale folders, with display names) to `packages/i18n/src/index.ts` and use the stored `locale` in `apps/web/src/i18n/index.tsx` (only pt-BR exists; unknown → pt-BR)
- [X] T015 [US2] Create `apps/web/src/app/configuracoes/page.tsx` (+ `page.module.css`) per contracts/ui.md, with the "Sobre" section (name, version from `app-info`, links Notas de versão and Sobre o jogo); add the `settings.*` texts to `packages/i18n/locales/pt-BR/ui.json`; register `/configuracoes` in `apps/web/test/helpers/app.tsx`
- [X] T016 [US2] Link Configurações from the opening page (`apps/web/src/app/page.tsx`) and the game header (`apps/web/src/ui/AppHeader.tsx`); make `apps/web/src/game/useLiveRound.ts` read speed/auto-pause through the shared preferences (no behavior change)

**Checkpoint**: Configurações funcionando; tema claro completo e com contraste verificado.

---

## Phase 4: User Story 1 - Primeiro acesso guiado (Priority: P1)

**Goal**: boas-vindas e dicas contextuais nas telas reais, uma vez cada, puláveis e reativáveis.

**Independent Test**: navegador limpo → boas-vindas → carreira → dicas em cada tela, uma vez;
recarregar não repete; reativar em Configurações faz voltar.

### Tests for User Story 1

- [X] T017 [P] [US1] Write `apps/web/test/ui/tips.test.tsx`: welcome only with no saved career and no `tips` in preferences; per-screen tip shows the first pending by `order`; "Entendi"/Esc dismisses only that tip and focus returns; "Pular todas" hides all; tips wait while a modal dialog is open; reset in Configurações shows them again; missing anchor ⇒ panel without anchor; every catalog entry has existing texts and, when `shortcutId` is set, a shortcut valid on that screen
- [X] T018 [P] [US1] Write `apps/web/e2e/first-run.spec.ts`: clean context → welcome → Começar focuses Nova carreira → create career → home tip → lineup tip → play round → tips do not reappear after reload; already-has-career context does not get the welcome

### Implementation for User Story 1

- [X] T019 [US1] Create `apps/web/src/ui/tips/catalog.ts` (8 tips per data-model.md/contracts/ui.md) and the `tips.*` texts in `packages/i18n/locales/pt-BR/ui.json`
- [X] T020 [US1] Tip state read straight from preferences via `usePreferences` (no separate provider needed; `dismissTip`/`skipAllTips`/modal detection live in `TipHost.tsx`) and `apps/web/src/ui/tips/TipHost.tsx` (+ `tips.module.css`): non-modal panel, focus management, Esc, anchor positioning via `[data-tip-anchor]` or corner fallback, `prefers-reduced-motion`
- [X] T021 [US1] Mount `TipHost` once in `apps/web/src/game/GameLayout.tsx` (screen from `screenOf(pathname)`) and on the opening page, covering the screens: opening (`apps/web/src/app/page.tsx`, welcome with Começar/Pular), game home, lineup, round, competition, market, career pages under `apps/web/src/app/jogo/`; add `data-tip-anchor` attributes to the anchored elements
- [X] T022 [US1] Wire "Mostrar as dicas de novo" in `apps/web/src/app/configuracoes/page.tsx` to the provider's reset

**Checkpoint**: um jogador novo é conduzido até a primeira rodada.

---

## Phase 5: User Story 6 - Jogo publicado na web (Priority: P1)

**Goal**: página de apresentação, app instalável, capturas reproduzíveis e publicação na Vercel
só após os gates.

**Independent Test**: `/sobre/` com descrição, ≥ 4 capturas, aviso de conteúdo; `pnpm
check-release` verde no build; workflow de release publica a partir da tag.

### Tests for User Story 6

- [X] T023 [P] [US6] Write `tools/test/check-release.test.ts`: passes on a fixture `out/` with all required files; fails when tag ≠ version, when release notes lack the version, when a screenshot is missing (< 4), when an HTML/manifest contains "brasfoot"
- [X] T024 [P] [US6] Write `apps/web/e2e/no-third-party.spec.ts`: record every request while creating a career and playing a round; fail on any origin other than the site (FR-037, SC-010)
- [X] T025 [P] [US6] Extend `apps/web/e2e/offline.spec.ts` to also open `/sobre/`, `/configuracoes/` and `/notas-de-versao/` offline

### Implementation for User Story 6

- [X] T026 [US6] Create `apps/web/src/app/sobre/page.tsx` (+ css) per contracts/ui.md (description, screenshots with translated `alt`, content notice, "gratuito e sem anúncios", how to move a career with export/import, Jogar, links) and the `about.*` texts; link "Sobre o jogo" from `apps/web/src/app/page.tsx`
- [X] T027 [US6] Add `apps/web/public/manifest.webmanifest` (Treinador FC, theme/background colors, icons) and icons in `apps/web/public/icons/` (192/512 PNG + SVG, drawn from a fictional crest); add manifest, `description` and Open Graph metadata in `apps/web/src/app/layout.tsx`; make sure `tools/src/precache.ts` includes them
- [X] T028 [US6] Create `tools/src/screenshots.ts` (`pnpm screenshots`: serves `apps/web/out`, Playwright with fixed seed and the default fictional bank, captures home, round, table, market, career into `apps/web/public/screenshots/*.webp`); run it and commit the images
- [X] T029 [US6] Create `apps/web/public/vercel.json` per contracts/release.md (headers for `sw.js`, `precache.json`, `_next/static`)
- [X] T030 [US6] Create `tools/src/check-release.ts` per contracts/release.md (until T023 passes)
- [X] T031 [US6] Create `.github/workflows/ci.yml` and `.github/workflows/release.yml` per contracts/release.md (pnpm cache, Playwright browsers, report artifact on failure, Vercel CLI pinned, GitHub release with notes)

**Checkpoint**: tudo pronto para publicar; falta só o roteiro manual (contas e segredos).

---

## Phase 6: User Story 3 - Atalhos consistentes e ajuda (Priority: P2)

**Goal**: `?` em qualquer tela abre a ajuda gerada do registro; `,` abre Configurações.

**Independent Test**: em cada tela `?` mostra "Gerais" e "Desta tela"; cada atalho listado
funciona.

- [X] T032 [P] [US3] Extend `apps/web/test/ui/shortcuts.test.tsx`: `?` opens the help on opening, saves, new career, mods, settings and game screens; groups match the registry for that screen; `,` opens Configurações; typing in inputs triggers nothing; the opening page has a visible "Atalhos" button
- [X] T033 [US3] Rewrite `apps/web/src/ui/ShortcutsHelp.tsx` to render from `SHORTCUTS` (global + current scope, `<kbd>`), and add a global `GlobalShortcuts` component (in `apps/web/src/app/layout.tsx`) handling `?`, `,` and the help dialog for every screen; remove the duplicated help wiring from `apps/web/src/game/GameLayout.tsx`
- [X] T034 [US3] Screen scope comes from `screenOf(pathname)` (T007), so no per-page `ShortcutScope` is needed and add the "Atalhos" button to the opening page and the game header; add missing `help.*` texts

---

## Phase 7: User Story 4 - Interface consistente, legível e acessível (Priority: P2)

**Goal**: foco visível, teclado de ponta a ponta, axe sem violações graves nos dois temas,
movimento reduzido, padrões visuais únicos.

**Independent Test**: `a11y.spec.ts` e `keyboard.spec.ts` verdes; revisão tela a tela feita.

- [X] T035 [P] [US4] Write `apps/web/e2e/a11y.spec.ts` (`@axe-core/playwright`): opening, saves, new career, mods, settings, about, release notes, game home, squad, lineup, competition, live round, market, career — in light and dark; fail on `serious`/`critical`
- [X] T036 [P] [US4] Write `apps/web/e2e/keyboard.spec.ts`: new career → lineup → play round → table → market → save (export) using only the keyboard; assert a visible focus outline on each step (FR-019, SC-004)
- [X] T037 [US4] Add global `:focus-visible` styling and `@media (prefers-reduced-motion: reduce)` in `apps/web/src/styles/global.css`; review `apps/web/src/ui/LiveGrid.module.css` and other transitions
- [X] T038 [US4] Fix every violation found by T035/T036 (accessible names, table captions/`th scope`, `aria-live` for save done and import, focus traps) in the affected components under `apps/web/src/`
- [X] T039 [US4] Screen-by-screen consistency pass with the checklist in contracts/ui.md (titles, primary/secondary buttons, spacing tokens, empty/error states, Voltar position); record what was changed in `specs/016-polimento-publicacao/research.md` (seção "Revisão de consistência")

---

## Phase 8: User Story 7 - Desempenho e textos (Priority: P2)

**Goal**: limites medidos em carreiras de 30 temporadas; nenhum texto fora do i18n; chaves sem
uso detectadas; textos revisados.

**Independent Test**: testes de desempenho dentro dos limites de research.md R1; teste de textos
verde.

- [X] T040 [P] [US7] Write `packages/save/test/performance-30.test.ts`: build a 30-season career once (helpers from `packages/save/test/helpers.ts`), median of 5 runs: turnover < 400 ms, career round < 250 ms
- [X] T041 [P] [US7] Extend `apps/web/test/flows/performance.test.tsx` with a 30-season save: direct round through the UI < 1 s and season turnover < 2 s
- [X] T042 [US7] Show a "Simulando…" progress state for the direct round and any async action over 1 s (FR-029) in `apps/web/src/app/jogo/page.tsx` / `apps/web/src/ui/SimulateDialogs.tsx`
- [X] T043 [US7] Extend `apps/web/test/i18n/no-literals.test.ts` to fail on keys defined in `ui.json` but never referenced (with a `DYNAMIC_PREFIXES` allowlist for keys built at runtime); remove or reference the unused keys it finds
- [X] T044 [US7] Review every value of `packages/i18n/locales/pt-BR/ui.json` and `errors.json` (spelling, agreement, tone "você", uniform football terms) and write `docs/glossario.md` with the adopted terms

---

## Phase 9: User Story 5 - Versão e notas (Priority: P3)

**Goal**: versão visível, notas offline, aviso de novidades e de atualização sem perder dados.

**Independent Test**: rodapé "Versão 1.0.0"; `/notas-de-versao/` offline; nova versão do SW →
aviso → Recarregar → carreira intacta.

- [X] T045 [P] [US5] Write `packages/i18n/test/release-notes.test.ts`: schema (semver, ISO date, non-empty changes, unique, descending) and the root `package.json` version has an entry
- [X] T046 [P] [US5] Write `apps/web/test/ui/version.test.tsx`: version shown on the opening page and in Configurações; "Novidades da versão X" shows once when `lastSeenVersion` differs (or is missing with a saved career) and not for brand-new players
- [X] T047 [P] [US5] Write `apps/web/e2e/update.spec.ts`: load the built site, change `precache.json` version/`sw.js` served by the test server, reload once → "Nova versão disponível" → Recarregar → new version controls the page and the career still opens; the notice never shows during the live round
- [X] T048 [US5] Create `packages/i18n/locales/pt-BR/release-notes.json` (1.0.0 summarizing M1–M6) and `releaseNotes(locale)` with Zod in `packages/i18n/src/release-notes.ts` — done early for check-release
- [X] T049 [US5] Create `apps/web/src/app/notas-de-versao/page.tsx` (+ css); version footer and "Novidades" notice on `apps/web/src/app/page.tsx`; texts `notes.*`
- [X] T050 [US5] Change `apps/web/public/sw.js` (skipWaiting only on first install; `SKIP_WAITING` message) and `apps/web/src/app/register-sw.tsx` (detect waiting worker, expose state); create `apps/web/src/ui/UpdateNotice.tsx` shown on opening and game screens except the live round; reload on `controllerchange`

---

## Phase 10: Polish & Cross-Cutting

- [X] T051 Update `docs/design.md`: §15 name decided ("Treinador FC"), §2 hosting (Vercel), §13 M6 status; update `README.md` (name, address, how to release) if present
- [ ] T052 Run the usability test from `specs/016-polimento-publicacao/quickstart.md` (maintainer, with someone who never saw the game) and record it in `specs/016-polimento-publicacao/usability.md`; adjust tips/texts for any doubt found
- [X] T053 Run the gates: `pnpm typecheck && pnpm lint && pnpm test`, `pnpm build:web && pnpm test:e2e`, `pnpm check-release` (with `GITHUB_REF_NAME=v1.0.0`), `pnpm sim:world --seasons 30`, `pnpm sim:economy --seasons 30`; record measured times in `specs/016-polimento-publicacao/research.md` R1

---

## Dependencies & Execution Order

- **Setup (T001–T002)** → **Foundational (T003–T008)** bloqueia tudo.
- **US2 (T009–T016)** antes de **US1 (T017–T022)**: as dicas são reativadas em Configurações e
  usam as preferências e o tema.
- **US6 (T023–T031)** depende de US2 (Configurações aparece na página/offline) e do nome (T008);
  T028 (capturas) depois das telas finais de US1/US2.
- **US3 (T032–T034)** depende de T006/T007.
- **US4 (T035–T039)** depois de US1/US2/US3 (varre as telas finais, incluindo dicas e tema claro).
- **US7 (T040–T044)** independente após a fundação; T043/T044 depois de todas as histórias que
  adicionam textos.
- **US5 (T045–T050)** depende de T002 (versão) e de US2 (seção Sobre em Configurações).
- **Polish (T051–T053)** por último; T052 depende de o jogo estar publicado ou em preview.

## Parallel Opportunities

- T002 com T001 (depois do install); T003/T005/T008 entre si.
- US2: T009/T010/T011 juntos; US1: T017/T018; US6: T023/T024/T025; US4: T035/T036;
  US7: T040/T041; US5: T045/T046/T047.
- US7 (T040–T042) pode correr em paralelo com US1/US6.

## Implementation Strategy

- **MVP**: Setup + Fundação + US2 + US1 — o jogo já guia um novo jogador e tem Configurações.
- **Lançável**: + US6 (publicação) — a partir daqui a 1.0.0 pode ir ao ar.
- **Qualidade de lançamento**: + US3, US4, US7, US5, depois Polish e teste de usabilidade antes
  da tag `v1.0.0`.
- Marcar cada tarefa `[X]` ao concluir, para retomar de onde parou.
