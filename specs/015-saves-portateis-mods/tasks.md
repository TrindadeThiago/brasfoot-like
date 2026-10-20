---

description: "Lista de tarefas da feature 015 — Saves portáteis e formato de mod"
---

# Tasks: Saves portáteis e formato de mod

**Input**: Design documents from `specs/015-saves-portateis-mods/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: `save` (arquivo) e `modkit` começam pelos testes (Princípio IX); save v11 com migração e
fixture (Princípio VI); critérios de aceite com teste automático (estado idêntico, mod de exemplo
jogável, documentação cobrindo todos os códigos). Fluxos de interface com happy-dom +
fake-indexeddb; Playwright para exportar/importar e carregar o exemplo.

**Organization**: tarefas por user story, em ordem de prioridade (P1: US1, US2, US3 → P2: US4, US5).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 … US5
- Caminhos relativos à raiz do repositório

## Referências rápidas

- APIs: `specs/015-saves-portateis-mods/contracts/modkit-and-save.md`; telas:
  `specs/015-saves-portateis-mods/contracts/ui.md`; decisões R1–R12:
  `specs/015-saves-portateis-mods/research.md`; códigos novos: `data-model.md`
- Já existentes: `migrateSave`/`MIGRATIONS`/`SAVE_FORMAT_VERSION` (`packages/save/src/migrate.ts`,
  `format.ts`), `createSave` (`packages/save/src/create.ts`), `summarize` (`packages/save/src/summary.ts`),
  `validateBank`/`ISSUE_PARAMS`/`SECTIONS`/`makeIssue` (`packages/engine/src/validation/`),
  `BANK_FILES`/`joinBankFiles`/`splitBankFiles`/`OPTIONAL_SECTIONS` (`serialize/bank-files.ts`,
  `model/schemas.ts`), `generateDefaultBank` (`worldgen/generate.ts`), `readBankDir`/`writeBankDir`
  (`tools/src/fs-bank.ts`), `createIndexedDbStore` (`apps/web/src/storage/indexeddb.ts`), `Crest`
  (`apps/web/src/ui/Crest.tsx`), `defaultBankInput` (`apps/web/src/game/default-bank.ts`)
- Lembretes: `modkit` sem DOM (roda no Node nos testes); nada de SVG; i18n para todo texto; antes de
  commitar, desfazer `apps/web/next-env.d.ts` e apagar `apps/web/AGENTS.md`

---

## Phase 1: Setup

- [X] T001 Add `fflate` to the workspace and create the package `packages/modkit` (`package.json` with `exports`, `tsconfig.json` and `test/tsconfig.json` mirroring `packages/save`, deps `@brasfoot-like/engine` and `fflate`, devDep `@brasfoot-like/default-mod`), add it to the Vitest projects in `vitest.config.ts` and as a dependency of `packages/save`, `apps/web` and `tools`; run `pnpm install`
- [X] T002 [P] Add pt-BR messages to `packages/i18n/locales/pt-BR/errors.json` for the new codes of `data-model.md` (`package.*`, `file.too_large`, `image.*`, `csv.*`) and to `packages/i18n/locales/pt-BR/ui.json` for `saves.export`, `saves.import*` (success, `not_a_save`, `corrupt`, `future_version`, quota, conflict title/body, replace, copy, cancel, copy suffix), `mods.*` (title, load, loading, report, errors/warnings counts, list, summary fields, remove, confirm remove, replace existing, csv export/import, generated package download/load, docs link, example download, empty), `newCareer.bank`, `newCareer.defaultBank`, `nav.mods`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: códigos novos no motor, `crest.image`, save v11 com `assets`, armazenamento de mods

**⚠️ CRITICAL**: nenhuma história começa antes desta fase

### Tests (write first, must fail)

- [X] T003 [P] Extend `packages/engine/test/validation/rules.test.ts`/`cases.ts` so the new engine-level code is covered: `crest.image` with a bad path/extension ⇒ `schema.invalid_format`; codes from the `modkit` are excluded there (covered by `modkit` tests) via an explicit list in `packages/engine/test/validation/rules.test.ts`
- [X] T004 [P] Write `packages/save/test/migrate-v11.test.ts` with a v10 fixture: `assets = {}`, `formatVersion` 11; update older migration tests' expected version, `withoutMarket` stripping `assets`, and the chained-migrations test

### Implementation

- [X] T005 Add `image?: string` to `crestSchema` (path `images/…` ending in `.png|.jpg|.jpeg|.webp`, ≤ 120 chars) in `packages/engine/src/model/schemas.ts`; add sections `package` and `images` and the codes of `data-model.md` to `ISSUE_PARAMS`/`SECTIONS` (warnings: `image.unused`, `csv.unknown_column`) in `packages/engine/src/validation/issues.ts`; keep `BANK_FILES` only for data sections
- [X] T006 Save v11: `assets: Record<string, string>` and `SAVE_FORMAT_VERSION = 11` in `packages/save/src/format.ts`; `createSave` accepts `assets?` (only images referenced by clubs) in `packages/save/src/create.ts`; migration v10 → v11 and envelope check (`assets` record of strings) in `packages/save/src/migrate.ts`; fixtures in `packages/save/test/fixtures.ts`
- [X] T007 IndexedDB version 2 with the `mods` store and a `ModStore` (`list`, `get`, `put`, `remove`) in `apps/web/src/storage/mods.ts` (shares the database opened in `apps/web/src/storage/indexeddb.ts`); `SaveStore` gains `exists(id)`; update `apps/web/test/storage/indexeddb.test.ts`
- [X] T008 [P] Create `apps/web/src/ui/AssetsProvider.tsx` (context with `Record<path, dataUri>`) and make `apps/web/src/ui/Crest.tsx` render `<img alt={label}>` when `crest.image` resolves in the context, else the generated SVG; wrap the game layout with the career's `save.assets` in `apps/web/src/game/GameLayout.tsx`

**Checkpoint**: tudo verde, jogo igual ao atual (nenhum escudo em imagem, nenhum mod)

---

## Phase 3: User Story 1 - Exportar e importar o save (Priority: P1) 🎯 MVP

**Goal**: baixar um arquivo da carreira e carregá-lo depois com estado idêntico

**Independent Test**: exportar no meio da temporada, apagar, importar e conferir o estado; arquivos inválidos recusados

### Tests (write first, must fail)

- [X] T009 [P] [US1] Write `packages/save/test/file.test.ts` (**acceptance 1**, SC-001, SC-002, SC-007): round trip equal except `savedAt` at season start, mid-season, season end and after several seasons; plain JSON accepted; a v6 save inside the envelope migrates; random bytes / other JSON ⇒ `not_a_save`; broken save ⇒ `corrupt`; `formatVersion` 99 ⇒ `future_version`; `asCopy` new id; `saveFileName` sanitized; export+import of a 30-season save < 5 s
- [X] T010 [P] [US1] Write `apps/web/test/flows/save-file.test.tsx`: Carreiras exports a file (download triggered with the right name), imports it as a new career, import of an existing id shows the conflict dialog (replace / copy), invalid file shows the error message and leaves the list unchanged

### Implementation

- [X] T011 [US1] Implement `exportSave`, `importSave`, `asCopy`, `saveFileName`, `SAVE_FILE_FORMAT` in `packages/save/src/file.ts` (fflate gzip; gunzip or plain JSON; `migrateSave`) and export from `packages/save/src/index.ts`
- [X] T012 [US1] Add export (Blob download) and import (file input, conflict dialog, quota error) to `apps/web/src/app/carreiras/page.tsx` with a helper `apps/web/src/storage/files.ts` (`downloadBytes`, `readFileBytes`)

**Checkpoint**: critério de aceite 1 verde

---

## Phase 4: User Story 2 - Carregar um mod de terceiros (Priority: P1)

**Goal**: carregar um pacote `.zip`, ver o relatório de validação e criar carreira com ele

**Independent Test**: carregar um pacote válido e criar carreira; carregar um com defeitos e ver os erros

### Tests (write first, must fail)

- [X] T013 [P] [US2] Write `packages/modkit/test/package.test.ts`: zip of `mods/default` accepted with summary; files inside a single top folder accepted; missing file, invalid JSON, out-of-range field and unknown club listed with file/item/field (all errors, not just the first); not a zip ⇒ `package.not_zip`; limits (`package.too_large`, `file.too_large`) with small limits injected; `writeModPackage` → `readModPackage` round trip
- [X] T014 [P] [US2] Write `apps/web/test/flows/mods.test.tsx` (part 1): Mods page loads a valid package (summary shown, stored), a broken one shows the report grouped by file; removing a mod keeps careers created with it playable (SC-008); a mod with the same id asks to replace; Nova carreira lists the mod in the bank selector and creates a career with its clubs

### Implementation

- [X] T015 [US2] Implement `MOD_LIMITS`, `readModPackage`, `writeModPackage`, `summarizeMod` in `packages/modkit/src/{limits,package,summary}.ts` and export from `packages/modkit/src/index.ts`
- [X] T016 [US2] Create `apps/web/src/app/mods/page.tsx` with `apps/web/src/ui/mods/{ValidationReport,ModList}.tsx` (load with file input, report, list, remove, replace confirmation) and link it from the opening page and the new-career page; register the route in `apps/web/test/helpers/app.tsx`
- [X] T017 [US2] Bank selector on `apps/web/src/app/nova-carreira/page.tsx` (default + stored mods; clubs, divisions and crests from the chosen bank inside `AssetsProvider`) and `createCareer({ …, bank?, assets? })` in `apps/web/src/game/GameProvider.tsx` passing the mod's joined files and referenced images to `createSave`

**Checkpoint**: mods de terceiros jogáveis

---

## Phase 5: User Story 3 - Documentação do formato e mod de exemplo (Priority: P1)

**Goal**: documentação completa do formato e um mod de exemplo com outro país

**Independent Test**: o exemplo é válido e joga uma temporada; a documentação cobre todos os códigos

### Tests (write first, must fail)

- [X] T018 [P] [US3] Write `packages/modkit/test/example.test.ts` (**acceptance 2**, SC-003): `mods/exemplo` read via `readModPackage(writeModPackage(...))` is valid, has a country and competition different from the default, and a career created with it plays a full season and the turnover (`advanceCareer` + `seasonTurnover`); `apps/web/public/mods/exemplo.zip` equals the generated package
- [X] T019 [P] [US3] Write `packages/modkit/test/docs.test.ts` (**acceptance 3**, SC-004): every code of `ISSUE_CODES` appears in `docs/mod-format.md`; every file of `BANK_FILES`, every top-level field of the club/player/competition schemas and every CSV column appears in the document

### Implementation

- [X] T020 [US3] Make `generateDefaultBank` configurable (`names`, `countryId`, `competitionName`, `divisionSize`, `slots`, defaults = current) in `packages/engine/src/worldgen/generate.ts` (+ `worldgen/clubs.ts` if needed); the golden test `packages/engine/test/worldgen/golden.test.ts` must stay green
- [X] T021 [US3] Add the name bank `packages/engine/src/worldgen/name-banks/exemplo.json` (fictional country "Norvália", own first names, surnames, city names and competition name) and the tool `tools/src/gen-example-mod.ts` (`pnpm gen:example-mod`: 2 divisions × 12 clubs, 2 promotion/relegation slots, fixed seed, rivalries) writing `mods/exemplo/` and `apps/web/public/mods/exemplo.zip`; add the script to `tools/package.json` and the root `package.json`
- [X] T022 [US3] Write `docs/mod-format.md` (pt-BR): package structure, every file and field (type, required, range, example), cross-file rules, optional sections (economy, market, board, fans, news, rivalries), crest images, CSV columns, limits and the full table of error codes with messages; link it from `docs/design.md` §11 and from the Mods page (and a download link to the example)

**Checkpoint**: critérios de aceite 2 e 3 verdes

---

## Phase 6: User Story 4 - Jogadores e clubes em CSV (Priority: P2)

**Goal**: exportar e importar jogadores e clubes em CSV com erros por linha e coluna

**Independent Test**: ida e volta do banco padrão sem edição; CSV com erros mostra linha e coluna

### Tests (write first, must fail)

- [X] T023 [P] [US4] Write `packages/modkit/test/csv.test.ts`: export of the default bank and re-import without edits ⇒ equivalent bank (SC-006); `;` and `,`; quotes with `""`; UTF-8 with and without BOM; CRLF; `csv.missing_column`, `csv.row_length`, `csv.invalid_number`, `csv.unclosed_quote` with line/column; unknown column warning; validation error (player with unknown club) points to the CSV line
- [X] T024 [P] [US4] Extend `apps/web/test/flows/mods.test.tsx`: export CSV of the default bank (two downloads); import edited CSV ⇒ report and generated package (download or load as mod)

### Implementation

- [X] T025 [US4] Implement `clubsToCsv`, `playersToCsv`, `parseCsv`, `applyCsv` in `packages/modkit/src/csv.ts`
- [X] T026 [US4] Create `apps/web/src/ui/mods/CsvPanel.tsx` (choose bank, export CSVs, import CSVs, report, download/load the generated package) on `apps/web/src/app/mods/page.tsx`

---

## Phase 7: User Story 5 - Escudos como imagens (Priority: P2)

**Goal**: imagens de escudo do pacote aparecem no lugar do escudo gerado

**Independent Test**: mod com imagens para alguns clubes ⇒ imagens em todas as telas, escudo gerado nos demais

### Tests (write first, must fail)

- [X] T027 [P] [US5] Write `packages/modkit/test/images.test.ts`: `imageInfo` reads PNG/JPEG/WebP dimensions from tiny fixture bytes; SVG and junk ⇒ `image.bad_format`; `image.too_large`, `image.too_big_dimensions`, `package.images_too_large`; referenced missing ⇒ `image.missing` (club, file); unreferenced ⇒ `image.unused` warning; images returned as data URIs
- [X] T028 [P] [US5] Extend `apps/web/test/flows/mods.test.tsx`: a career from a mod with crest images shows `<img>` with the club name as alt; clubs without image keep the SVG; after removing the mod and after export/import of the save the images still show

### Implementation

- [X] T029 [US5] Implement `imageInfo` and the image checks in `packages/modkit/src/images.ts`, called by `readModPackage`; include images in `writeModPackage`
- [X] T030 [US5] Copy the referenced images to `save.assets` on career creation and keep them through export/import (`packages/save/src/create.ts`, `apps/web/src/game/GameProvider.tsx`); provide the assets on every screen that shows crests (game layout, new career, saves list) via `AssetsProvider`

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T031 [P] `tools/src/validate-bank.ts` and `tools/src/fs-bank.ts` accept a `.zip` (via `modkit`) besides a folder; update `tools/test/*`
- [X] T032 [P] Playwright `apps/web/e2e/save-file.spec.ts` (export, delete, import, same round) and `apps/web/e2e/mods.spec.ts` (download the example from the Mods page, load it, create a career in Norvália, play a round)
- [X] T033 Run the gates: `pnpm typecheck && pnpm lint && pnpm test`, `pnpm build:web && pnpm test:e2e`; record measured export/import times and package sizes in `specs/015-saves-portateis-mods/research.md`

---

## Dependencies & Execution Order

- **Setup (1)** → **Foundational (2)** → user stories.
- **US1 (3)** só depende da Fase 2 (save v11).
- **US2 (4)** depende da Fase 2 (store de mods, `crest.image` no schema).
- **US3 (5)** depende de US2 (`readModPackage`/`writeModPackage`) para os testes do exemplo; T020–T022
  podem começar antes.
- **US4 (6)** depende de US2 (pacote gerado e relatório); **US5 (7)** depende de US2 (leitura do
  pacote) e da Fase 2 (`assets`, `AssetsProvider`).
- **Polish (8)** depende de todas.

### Parallel Opportunities

- T002 com T001; T003/T004; T008 com T005–T007; T009/T010; T013/T014; T018/T019 e T020–T022;
  T023/T024; T027/T028; T031/T032.

## Parallel Example: User Story 3

```bash
Task: "modkit/test/example.test.ts"   Task: "modkit/test/docs.test.ts"
Task: "worldgen configurável + name bank exemplo"   Task: "docs/mod-format.md"
```

## Implementation Strategy

1. Fases 1–2 (`fflate`, `modkit`, códigos, `crest.image`, save v11, store de mods) — jogo igual.
2. US1: saves portáteis — **parar e validar** o critério de aceite 1.
3. US2 → US3: mods de terceiros, exemplo e documentação — critérios 2 e 3.
4. US4 e US5: CSV e escudos em imagem. Polish: ferramentas, e2e, medições.

Commits no fim, um por pacote: engine, modkit, save, i18n, mods, web, tools, docs.
