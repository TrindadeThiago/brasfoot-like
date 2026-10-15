---

description: "Lista de tarefas da feature 001 — modelo de dados e banco fictício"
---

# Tasks: Modelo de dados e banco fictício

**Input**: Design documents from `specs/001-modelo-dados-banco-ficticio/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Testes de motor são OBRIGATÓRIOS (Constituição, Princípio IX) e devem ser escritos antes
da implementação: em cada fase, as tarefas de teste vêm primeiro e devem **falhar** antes da
implementação correspondente. O gerador afeta o equilíbrio do mundo, então os limites de
distribuição são verificados por teste com 20 seeds (Princípio V).

**Organization**: tarefas agrupadas por user story para implementação e teste independentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: user story da tarefa (US1, US2, US3)
- Caminhos relativos à raiz do repositório

## Referências rápidas

- Campos, faixas e regras das entidades: `specs/001-modelo-dados-banco-ficticio/data-model.md`
- API pública: `specs/001-modelo-dados-banco-ficticio/contracts/engine-api.md`
- Formato em disco: `specs/001-modelo-dados-banco-ficticio/contracts/mod-format.md`
- Códigos de erro/aviso e params: `specs/001-modelo-dados-banco-ficticio/contracts/validation-errors.md`
- Decisões técnicas (R1–R15): `specs/001-modelo-dados-banco-ficticio/research.md`
- Regras gerais: sem `Math.random`, `Date`, `performance`, `Math.log/exp/pow/sin/cos/tan/...`
  em `packages/engine/src`; só aritmética exata (R4); texto visível só via i18n.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: monorepo pnpm, TypeScript 6.0, Biome, Vitest e os três pacotes vazios funcionando.

- [X] T001 Create root `package.json` (private, `"type": "module"`, `packageManager` pnpm 11, engines node ≥22.13, devDeps `typescript@~6.0`, `@biomejs/biome@^2.5`, `vitest@^5`; scripts `typecheck` = `pnpm -r typecheck`, `lint` = `biome check .`, `format` = `biome format --write .`, `test` = `vitest run`, `gen:default-bank` e `validate-bank` delegando a `@brasfoot-like/tools`) and `pnpm-workspace.yaml` listing `packages/*` and `tools`
- [X] T002 Create `tsconfig.base.json` with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `target`/`lib` ES2023, `module` ESNext, `moduleResolution` bundler, `resolveJsonModule`, `noEmit`
- [X] T003 [P] Create `biome.json`: formatter (2 espaços, largura 100, aspas duplas), linter `recommended`, ignore `node_modules`, `mods/**`; `overrides` for `packages/engine/src/**` with `noRestrictedImports` (react, react-dom, next, `node:*`, `fs`, `path`) and `noRestrictedGlobals` (`Date`, `performance`, `window`, `document`, `globalThis`, `localStorage`, `indexedDB`, `fetch`) — see research.md R15
- [X] T004 [P] Create root `vitest.config.ts` using `test.projects` pointing to `packages/engine`, `packages/i18n` and `tools`
- [X] T005 [P] Create `packages/engine/package.json` (`@brasfoot-like/engine`, `"type": "module"`, `exports` → `./src/index.ts`, dep `zod@^4`, script `typecheck` = `tsc --noEmit -p .`), `packages/engine/tsconfig.json` extending base with `lib: ["ES2023"]`, `types: []`, include only `src`; `packages/engine/test/tsconfig.json` extending it with `types: ["node"]` and include `test` (tests may use `node:fs`; `src` may not), devDep `@types/node@^22`; `typecheck` runs both projects; plus `packages/engine/src/index.ts` placeholder (`export {}`)
- [X] T006 [P] Create `packages/i18n/package.json` (`@brasfoot-like/i18n`, deps `intl-messageformat@^12`, `@brasfoot-like/engine: workspace:*`), `packages/i18n/tsconfig.json`, `packages/i18n/src/index.ts` placeholder
- [X] T007 [P] Create `tools/package.json` (`@brasfoot-like/tools`, deps `@brasfoot-like/engine` e `@brasfoot-like/i18n` `workspace:*`, devDeps `tsx@^4`, `@types/node@^22`; scripts `gen:default-bank` = `tsx src/gen-default-bank.ts`, `validate-bank` = `tsx src/validate-bank.ts`), `tools/tsconfig.json` with `types: ["node"]`
- [X] T008 Append `node_modules/`, `coverage/`, `*.tsbuildinfo` to `.gitignore`, run `pnpm install`, and confirm `pnpm typecheck`, `pnpm lint` and `pnpm test` (with `--passWithNoTests`) all succeed on the empty skeleton

**Checkpoint**: monorepo instalado, gates rodando vazios.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: PRNG, calendário, serialização, catálogos, schemas, tipos de problema e a validação
estrutural — tudo que US1, US2 e US3 usam.

**⚠️ CRITICAL**: nenhuma user story começa antes desta fase terminar.

### Testes (escrever primeiro; devem falhar)

- [X] T009 [P] Write architecture test in `packages/engine/test/architecture.test.ts`: walk every `.ts` file under `packages/engine/src` and fail listing file:line for `Math.random`, `Math.(log|log2|log10|log1p|exp|expm1|pow|sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|cbrt|hypot)`, `new Date`, `Date.`, `performance.`, `**` (exponent operator) — research.md R4/R15
- [X] T010 [P] Write PRNG tests in `packages/engine/test/rng/xoshiro.test.ts`: same seed (string and number) ⇒ same first 1.000 values; snapshot of the first 8 `next()` values for seed `"test"` (stable across engines); `restoreRng(rng.state())` continues the exact sequence; `state()` is JSON-serializable; `fork(label)` does not advance the parent and different labels give different streams; `int(min,max)` inclusive bounds and roughly uniform over 60.000 draws; `shuffle` returns a copy; `weighted` respects zero weights
- [X] T011 [P] Write distribution tests in `packages/engine/test/rng/distributions.test.ts`: `irwinHall(rng, n)` in [0,1) with mean ≈ 0.5; `triangular(rng, min, mode, max)` within bounds and sample mode near `mode`; integer helpers never leave the requested range
- [X] T012 [P] Write calendar tests in `packages/engine/test/calendar/date.test.ts`: `parseIsoDate` accepts `2024-02-29`, rejects `2023-02-29`, `2024-13-01`, `2024-1-01`; `daysFromCivil`/`civilFromDays` round-trip over 1900–2100; `ageOn` on birthday, day before birthday and 29/02 births
- [X] T013 [P] Write canonical JSON tests in `packages/engine/test/serialize/canonical-json.test.ts`: keys sorted recursively, arrays keep order, 2-space indent, trailing `\n`, same output for objects built in different key orders, rejects non-finite numbers
- [X] T014 [P] Create test helper `packages/engine/test/helpers/build-bank.ts`: `makeValidBank()` returns a small valid `ModPackage` (1 country, 1 league competition with 2 divisions of 4 clubs each, 1 relegation/1 promotion, 16 players per club with 2 `GK`, no `hidden`, `referenceDate` `2027-01-01`), plus small mutator helpers (`withPlayer`, `withClub`, `removeField`, `setField`) used by validation tests
- [X] T015 [P] Write schema tests in `packages/engine/test/model/schemas.test.ts`: each entity of `makeValidBank()` parses; per field of data-model.md, one invalid value per rule (out of range, non-integer, bad id/date/color/abbreviation/semver format, value outside catalog, string/list length) fails; `hidden` absent, partial and complete are all accepted; `format.type` `knockout`/`groups` recognized as reserved
- [X] T016 [P] Write structural validation tests in `packages/engine/test/validation/structural.test.ts`: each structural issue code from contracts/validation-errors.md (`schema.*`, `manifest.unsupported_format_version`, `format.unsupported`) is produced with correct `severity`, `section`, `path`, `entityId` and `params`; unknown field ⇒ `warning` `schema.unknown_field`, field stripped from the accepted bank and `ok: true`; one broken item does not prevent other items of the same section from being validated; input that is not an object ⇒ error, no throw

### Implementação

- [X] T017 [P] Implement `cyrb128` (string → 4 × uint32) and `splitmix32` in `packages/engine/src/rng/hash.ts` using only `Math.imul`, `>>>`, `^`, `+`
- [X] T018 Implement xoshiro128\*\* `Rng` (`next`, `float`, `int`, `pick`, `weighted`, `shuffle`, `fork`, `state`), `createRng(seed)` and `restoreRng(state)` in `packages/engine/src/rng/xoshiro.ts` per contracts/engine-api.md (depends on T017)
- [X] T019 [P] Implement `irwinHall`, `triangular`, `intIrwinHall(rng, min, max)` and `intTriangular` in `packages/engine/src/rng/distributions.ts` using only `+ - * /` and `Math.floor`
- [X] T020 [P] Implement `parseIsoDate`, `formatIsoDate`, `daysFromCivil`, `civilFromDays`, `addYears`, `ageOn` in `packages/engine/src/calendar/date.ts` (Howard Hinnant algorithms, integers only, no `Date`)
- [X] T021 [P] Implement `toCanonicalJson` in `packages/engine/src/serialize/canonical-json.ts`
- [X] T022 [P] Implement catalogs `POSITIONS`, `TRAITS`, `CREST_SHAPES`, `TIEBREAKERS`, `RESERVED_FORMAT_TYPES` (`knockout`, `groups`), `SUPPORTED_FORMAT_VERSIONS` as `as const` arrays plus derived union types in `packages/engine/src/model/catalogs.ts`
- [X] T023 [P] Implement `packages/engine/src/validation/issues.ts`: `Severity`, `IssueCode` union and `ISSUE_CODES` with every code from contracts/validation-errors.md, `ISSUE_PARAMS` map (code → param names, used by i18n tests), `ISSUE_SEVERITY` (only `schema.unknown_field` is `warning`), `Section` type, `ValidationIssue` interface and `issue(...)` constructor
- [X] T024 Implement Zod schemas for Manifest, Country, CompetitionFormat (`league` only; reserved types handled separately), Division, Competition, Crest, Club, HiddenAttributes (all fields optional), Player and ModPackage sections in `packages/engine/src/model/schemas.ts` following data-model.md (depends on T022)
- [X] T025 Implement inferred types plus branded `ValidatedBank`, `CompletedBank`, `CompletedPlayer` in `packages/engine/src/model/types.ts` (depends on T024)
- [X] T026 Implement `packages/engine/src/validation/structural.ts`: validate the manifest first (unsupported `formatVersion` ⇒ single error, stop); parse each item of each section individually; map Zod issues to project codes with `path`/`params`; detect unknown keys by comparing raw keys to schema shape ⇒ warnings and strip; register ids of all items (valid or not) for later reference checks; return `{ validItems, allIds, issues }` (depends on T023, T024)
- [X] T027 Implement `validateBank(input)` in `packages/engine/src/validation/validate.ts`: run structural phase, then an ordered list of semantic rule functions (empty for now, signature `(ctx) => ValidationIssue[]`), sort issues by section order → index → code, split into `errors`/`warnings`, return `ValidationResult` with branded `ValidatedBank` when there are no errors (depends on T026)
- [X] T028 [P] Implement `splitBankFiles` / `joinBankFiles` in `packages/engine/src/serialize/bank-files.ts` (file names from contracts/mod-format.md, contents via `toCanonicalJson`) and its round-trip test in `packages/engine/test/serialize/bank-files.test.ts`
- [X] T029 Export the foundational public API (rng, calendar `ageOn`, catalogs, types, `validateBank`, `ISSUE_CODES`, serialization) from `packages/engine/src/index.ts`; run `pnpm typecheck && pnpm lint && pnpm test` — all green

**Checkpoint**: base pronta — PRNG determinístico, schemas, validação estrutural com erros e avisos.

---

## Phase 3: User Story 1 - Gerar o mundo padrão a partir de uma seed (Priority: P1) 🎯 MVP

**Goal**: `generateDefaultBank({ seed })` produz 1 país, Série A e Série B com 20 clubes cada e
elencos completos, idêntico para a mesma seed, e o banco é versionado em `mods/default/`.

**Independent Test**: gerar com seed fixa; verificar estrutura, validação sem erros/avisos e
igualdade byte a byte em uma segunda geração (`pnpm gen:default-bank` sem diff).

### Testes (escrever primeiro; devem falhar)

- [X] T030 [P] [US1] Write `packages/engine/test/worldgen/determinism.test.ts`: for 20 seeds, `validateBank` returns `ok: true` with zero errors and zero warnings (SC-001, SC-007); `toCanonicalJson` of two generations with the same seed are identical; seeds 42 and 43 differ; no player has `hidden` (FR-017a)
- [X] T031 [P] [US1] Write `packages/engine/test/worldgen/structure.test.ts`: 1 country; 1 competition with `format` `league`, `rounds` 2, points 3/1/0; division level 1 "Série A" with 20 clubs, `relegationSlots` 4; level 2 "Série B" with 20 clubs, `promotionSlots` 4; every club has 22–30 players and ≥ 2 `GK`; club names, abbreviations and ids unique (FR-028, FR-029); `manifest.formatVersion` 1
- [X] T032 [P] [US1] Create `packages/engine/test/fixtures/blocklist.json` (names of real Brazilian and major foreign clubs, Brazilian state capitals, real competition names such as "Brasileirão", "Libertadores") and write `packages/engine/test/worldgen/blocklist.test.ts`: no generated country, competition, club name, short name or city (5 seeds) contains, case/accent-insensitive, any blocklisted term; the name bank itself contains none (FR-037)
- [X] T033 [P] [US1] Write `packages/engine/test/worldgen/name-banks.test.ts`: `default.json` passes its schema; ≥ 200 unique first names, ≥ 200 unique surnames, ≥ 60 unique cities, ≥ 4 club prefixes and suffixes

### Implementação

- [X] T034 [P] [US1] Implement the name bank Zod schema in `packages/engine/src/worldgen/name-banks/schema.ts`
- [X] T035 [P] [US1] Write the fictional name bank `packages/engine/src/worldgen/name-banks/default.json` (country name + 3-letter code, common Portuguese first names and surnames, invented city names, club prefixes like "Esporte Clube"/"Associação Atlética" and suffixes like "Futebol Clube"/"Atlético") avoiding every blocklisted term
- [X] T036 [US1] Create `GENERATOR_TUNING` in `packages/engine/src/worldgen/tuning.ts` with the initial constants from research.md R12 (tier counts and reputation ranges per division, club level from reputation, strength offsets by squad role, age triangular 17/25/36, trait rates and per-position weights, star rate, stadium and cash ranges by reputation)
- [X] T037 [US1] Implement club generation in `packages/engine/src/worldgen/clubs.ts`: tiers per division, reputation, technical level, unique name (prefix/suffix + city), short name, unique 3-letter abbreviation, colors and crest (shape, 2–3 colors, initials), stadium capacity and initial cash; one `rng.fork("club:<division>:<index>")` per club; ids `clube-001`…
- [X] T038 [P] [US1] Implement squad composition in `packages/engine/src/worldgen/squads.ts`: position counts within FR-030 ranges with total 23–28 (start at minimums, add random positions within maximums)
- [X] T039 [US1] Implement player generation in `packages/engine/src/worldgen/players.ts`: unique-ish names from the name bank, `displayName`, age → `birthDate` relative to `referenceDate`, strength from club level + role offset + Irwin–Hall noise clamped 20–99, 0–2 position-weighted traits without repetition, no `hidden`; one fork per club; ids `jogador-00001`…
- [X] T040 [US1] Implement `generateDefaultBank({ seed })` in `packages/engine/src/worldgen/generate.ts`: manifest (`formatVersion` 1, id `default`, name "Mundo padrão", `referenceDate` `2027-01-01`), country, competition and divisions, clubs, players; run `validateBank` and throw if any error or warning; export from `packages/engine/src/index.ts`
- [X] T041 [US1] Implement `tools/src/fs-bank.ts` (`readBankDir(dir)` → `{ files, issues }` with `file.missing` / `file.invalid_json` issues including line/column; `writeBankDir(dir, bank)` via `splitBankFiles`) and `tools/src/gen-default-bank.ts` (args `--seed` default `"brasfoot-like-default-1"`, `--out` default `mods/default`; prints counts, mean strength, % ≥ 85 and mean age)
- [X] T042 [US1] Run `pnpm gen:default-bank` to create `mods/default/` (`mod.json`, `countries.json`, `competitions.json`, `clubs.json`, `players.json`); run it again and confirm no diff
- [X] T043 [US1] Write `packages/engine/test/worldgen/golden.test.ts`: regenerate with seed `"brasfoot-like-default-1"` and compare each file of `splitBankFiles` with `mods/default/*` (read via Vite JSON/raw import, no `node:fs` in engine src)
- [X] T044 [P] [US1] Write `packages/engine/test/worldgen/performance.test.ts`: generate + validate the default bank in < 2 s (SC-005), measured in the test runner

**Checkpoint**: US1 funcional — mundo padrão gerado, determinístico, válido e versionado.

---

## Phase 4: User Story 2 - Validar um banco com mensagens claras (Priority: P2)

**Goal**: regras semânticas completas, todos os problemas reportados de uma vez, mensagens pt-BR
via i18n e CLI `pnpm validate-bank <dir>`.

**Independent Test**: bancos com um defeito por caso são rejeitados com o código, caminho e
entidade esperados; banco com N defeitos ⇒ N erros; CLI imprime mensagens pt-BR e sai com código
≠ 0.

### Testes (escrever primeiro; devem falhar)

- [X] T045 [P] [US2] Create `packages/engine/test/validation/cases.ts`: a table with one case per non-`file.*` code of `ISSUE_CODES` — `{ code, mutate(bank), expect: { section, path, entityId?, params } }` built on `makeValidBank()` (e.g. player `clubId` → `clube-999` ⇒ `ref.club_not_found`; club with 1 `GK` ⇒ `squad.min_goalkeepers`; club in two divisions ⇒ `division.club_in_multiple`; `points` 1/1/0 ⇒ `format.points_order`)
- [X] T046 [US2] Write `packages/engine/test/validation/rules.test.ts`: runs every case of `cases.ts` and asserts the issue is produced exactly as expected; fails if any code in `ISSUE_CODES` (except `file.*`) has no case (SC-003)
- [X] T047 [P] [US2] Write `packages/engine/test/validation/multiple-defects.test.ts`: 6 independent defects across sections ⇒ exactly 6 errors in deterministic order (SC-004); 3 unknown fields in an otherwise valid bank ⇒ `ok: true` with 3 warnings; structurally invalid club does not cause `ref.club_not_found` on its players (no cascade)
- [X] T048 [P] [US2] Write i18n coverage test `packages/i18n/test/errors-coverage.test.ts`: every code in `ISSUE_CODES` has a pt-BR message; every message compiles with `intl-messageformat`; variables used ⊆ `ISSUE_PARAMS[code]` ∪ {`entityId`, `section`} (SC-006)
- [X] T049 [P] [US2] Write `packages/i18n/test/format.test.ts`: `formatIssue` output for `ref.club_not_found`, `schema.out_of_range` and `squad.min_goalkeepers` with count 0, 1 and 2 matches the examples in contracts/validation-errors.md; catalog labels (`position.GK` → "GOL", `trait.free-kick` → "Cobrador de falta")
- [X] T050 [P] [US2] Create on-disk fixture `packages/engine/test/fixtures/invalid/multiple-defects/` (the 5 mod files with a broken club reference, a club with 1 goalkeeper, an out-of-range strength and one unknown field) and `tools/test/validate-bank.test.ts` asserting the CLI prints one pt-BR line per issue in the form `<arquivo> [<caminho>] — <mensagem>`, prints "Banco válido." for `mods/default` and exits ≠ 0 only when there are errors; plus missing file and malformed JSON cases

### Implementação

- [X] T051 [P] [US2] Implement reference rules (`ref.country_not_found` for `countryId`/`nationalityId`, `ref.club_not_found` for players and divisions, using the registry of all ids) in `packages/engine/src/validation/semantic/references.ts`
- [X] T052 [P] [US2] Implement uniqueness rules (`unique.duplicate_id` across all sections, `unique.duplicate_abbreviation`, `unique.duplicate_country_code`) in `packages/engine/src/validation/semantic/uniqueness.ts`
- [X] T053 [P] [US2] Implement competition rules (`format.points_order`, `format.duplicate_tiebreaker`, `division.levels_not_contiguous`, `division.club_count`, `division.duplicate_club`, `division.club_in_multiple`, `division.top_has_promotion`, `division.bottom_has_relegation`, `division.slots_mismatch`, `division.slots_exceed_clubs`) in `packages/engine/src/validation/semantic/competitions.ts`
- [X] T054 [P] [US2] Implement squad and player rules (`squad.size`, `squad.min_goalkeepers`, `player.potential_below_strength` only when `hidden.potential` is present, `player.duplicate_trait`, `player.age_out_of_range` via `ageOn` and `manifest.referenceDate`) in `packages/engine/src/validation/semantic/squads.ts`
- [X] T055 [US2] Register the semantic rules in order in `packages/engine/src/validation/validate.ts` and confirm T046/T047 pass (depends on T051–T054)
- [X] T056 [P] [US2] Write all pt-BR messages (complete sentences, ICU plural where counts appear) in `packages/i18n/locales/pt-BR/errors.json` and catalog labels (positions, traits, crest shapes, tiebreakers, severities) in `packages/i18n/locales/pt-BR/catalog.json`
- [X] T057 [US2] Implement `formatIssue(issue, locale)`, `formatLabel(key, locale)` and `messageKeys(locale)` with `intl-messageformat` in `packages/i18n/src/format.ts` and export them from `packages/i18n/src/index.ts` (depends on T056)
- [X] T058 [US2] Implement `tools/src/validate-bank.ts`: read dir with `readBankDir`, `joinBankFiles`, `validateBank`, print errors then warnings with `formatIssue`, summary line, exit code 1 on errors; run `pnpm validate-bank mods/default` and `pnpm validate-bank packages/engine/test/fixtures/invalid/multiple-defects`

**Checkpoint**: US1 + US2 — mundo gerado e validação completa com mensagens pt-BR.

---

## Phase 5: User Story 3 - Mundo com distribuição crível (Priority: P3)

**Goal**: hierarquia crível (camadas, Série A > Série B, poucos craques), atributos ocultos
completados pela seed da carreira e salário/valor derivados.

**Independent Test**: para 20 seeds, todas as faixas de FR-030 a FR-036 passam; completação de
ocultos é determinística e independe da ordem.

### Testes (escrever primeiro; devem falhar)

- [X] T059 [US3] Create `DISTRIBUTION_LIMITS` in `packages/engine/src/worldgen/limits.ts` encoding FR-030–FR-036 numerically (squad 23–28 and per-position ranges; Série A 4–6 big / 8–10 medium, Série B ≤ 2 big; mean strength 55–65, ≤ 2% ≥ 85, ≥ 50% in 45–70, min ≥ 20; top-16 mean gap A–B ≥ 5 and big–small in A ≥ 8; ages 16–37 with mean 24–28; young potential gap ≥ 8; 40–70% with ≥ 1 trait, ≤ 15% with 2) and the reputation thresholds that define big/medium/small
- [X] T060 [P] [US3] Write `packages/engine/test/worldgen/distribution.test.ts`: for 20 seeds, measure and assert every limit of `DISTRIBUTION_LIMITS` on the generated bank, with FR-035 checked on `completeHiddenAttributes(bank, careerSeed)` for 3 career seeds; failure messages print measured value vs limit (SC-002, US3 scenarios 1–2)
- [X] T061 [P] [US3] Write `packages/engine/test/worldgen/hidden.test.ts`: every player of the result has the 3 hidden fields in 1–100 with potential ≥ strength; values defined in the input are preserved; same bank + seed ⇒ identical result; different seeds ⇒ different results; shuffling the player array does not change any player's values (FR-017b); partial `hidden` keeps the given field and fills the rest
- [X] T062 [P] [US3] Write `packages/engine/test/derived/economy.test.ts`: `deriveWage` > 0 and multiple of 100, `deriveMarketValue` > 0 and multiple of 1.000; both non-decreasing when strength increases 1→100 with other inputs fixed; deterministic; younger high-potential player worth more than older same-strength player

### Implementação

- [X] T063 [US3] Implement `completeHiddenAttributes(bank, careerSeed)` in `packages/engine/src/worldgen/hidden.ts` (`fork("hidden:" + player.id)` per player; potential = strength + age-decreasing margin clamped to [strength, 100]; temperament and injury proneness via Irwin–Hall centered at 50) returning `CompletedBank`
- [X] T064 [P] [US3] Implement `deriveWage` and `deriveMarketValue` in `packages/engine/src/derived/economy.ts` with integer arithmetic only (cubic strength base via explicit multiplication, age table, potential bonus for young players, club reputation multiplier, rounding to 100 / 1.000, positive floor) — research.md R13
- [X] T065 [US3] Calibrate `GENERATOR_TUNING` in `packages/engine/src/worldgen/tuning.ts` (and adjust `clubs.ts` / `players.ts` logic if needed) until `distribution.test.ts` passes for all 20 seeds with margin; never loosen `DISTRIBUTION_LIMITS` without recording the justification in the commit (Princípio V)
- [X] T066 [US3] Export `completeHiddenAttributes`, `deriveWage`, `deriveMarketValue` from `packages/engine/src/index.ts`; extend `tools/src/gen-default-bank.ts` summary with tier counts, top-16 means per division and % with traits
- [X] T067 [US3] Regenerate `mods/default/` with `pnpm gen:default-bank` after calibration and confirm `golden.test.ts`, `determinism.test.ts` and `blocklist.test.ts` still pass

**Checkpoint**: as três user stories funcionam e passam de forma independente.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T068 Verify the boundary gates per quickstart.md §1: temporarily add `import "react"` and `Date.now()` (expect `pnpm lint` to fail), `Math.random()` (expect architecture test to fail) and `document.title` (expect `pnpm typecheck` to fail) in `packages/engine/src/index.ts`; revert all
- [X] T069 [P] Write `packages/engine/README.md` with a short description of the public API and the determinism rules (links to the feature contracts)
- [X] T070 [P] Review `packages/engine/src/worldgen/name-banks/default.json` and `mods/default/` by hand for real club/brand names the blocklist misses; extend `packages/engine/test/fixtures/blocklist.json` with anything found
- [X] T071 Run every step of `specs/001-modelo-dados-banco-ficticio/quickstart.md` end to end (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm gen:default-bank` without diff, both `pnpm validate-bank` runs) and fix any divergence between quickstart and implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup; **bloqueia todas as user stories**.
- **US1 (Phase 3)**: depende da Foundational.
- **US2 (Phase 4)**: depende da Foundational; independente de US1 (testes usam `makeValidBank()`).
  T050/T058 usam `mods/default` para o caso "Banco válido." — se US1 ainda não existir, esse
  caso fica pendente até T042.
- **US3 (Phase 5)**: depende de US1 (calibra o gerador e regenera `mods/default`).
- **Polish (Phase 6)**: depende das stories desejadas.

### Within Each Phase

- Testes antes da implementação, e devem falhar primeiro (Princípio IX).
- Foundational: T017 → T018; T022 → T024 → T025; T023 + T024 → T026 → T027 → T029.
- US1: T034/T035/T036 → T037/T038 → T039 → T040 → T041 → T042 → T043.
- US2: T051–T054 → T055; T056 → T057 → T058.
- US3: T059 → T060; T063 e T064 em paralelo; T065 depois de T063; T067 por último.

### Parallel Opportunities

- Setup: T003, T004, T005, T006, T007.
- Foundational: todos os testes T009–T016 em paralelo; depois T017, T019, T020, T021, T022, T023,
  T028 em paralelo.
- US1: T030–T033 em paralelo; T034, T035 e T038 em paralelo.
- US2: T045, T047–T050 em paralelo; T051–T054 em paralelo; T056 em paralelo com as regras.
- US2 pode ser desenvolvida em paralelo com US1 após a Foundational.
- US3: T060–T062 em paralelo; T063 e T064 em paralelo.

---

## Parallel Example: User Story 1

```bash
# Testes de US1 juntos:
Task: "Write determinism test in packages/engine/test/worldgen/determinism.test.ts"
Task: "Write structure test in packages/engine/test/worldgen/structure.test.ts"
Task: "Create blocklist + test in packages/engine/test/worldgen/blocklist.test.ts"
Task: "Write name bank test in packages/engine/test/worldgen/name-banks.test.ts"

# Depois, dados e composição em paralelo:
Task: "Implement name bank schema in packages/engine/src/worldgen/name-banks/schema.ts"
Task: "Write name bank in packages/engine/src/worldgen/name-banks/default.json"
Task: "Implement squad composition in packages/engine/src/worldgen/squads.ts"
```

## Parallel Example: User Story 2

```bash
Task: "Implement reference rules in packages/engine/src/validation/semantic/references.ts"
Task: "Implement uniqueness rules in packages/engine/src/validation/semantic/uniqueness.ts"
Task: "Implement competition rules in packages/engine/src/validation/semantic/competitions.ts"
Task: "Implement squad rules in packages/engine/src/validation/semantic/squads.ts"
Task: "Write pt-BR messages in packages/i18n/locales/pt-BR/errors.json"
```

## Parallel Example: User Story 3

```bash
Task: "Write distribution test in packages/engine/test/worldgen/distribution.test.ts"
Task: "Write hidden attributes test in packages/engine/test/worldgen/hidden.test.ts"
Task: "Write economy test in packages/engine/test/derived/economy.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup.
2. Phase 2: Foundational (crítica — bloqueia tudo).
3. Phase 3: US1.
4. **Parar e validar**: `pnpm test` + `pnpm gen:default-bank` sem diff; mundo existe e é
   determinístico (distribuição ainda não calibrada).

### Incremental Delivery

1. Setup + Foundational → base pronta.
2. US1 → mundo padrão gerado (MVP).
3. US2 → validação completa e mensagens pt-BR (habilita modders).
4. US3 → mundo crível; `mods/default` final para as features 002 (motor de partida) e 003
   (temporada).
5. Polish → gates comprovados e quickstart verificado.

### Notes

- [P] = arquivos diferentes, sem dependência pendente.
- Commit ao fim de cada tarefa ou grupo lógico (sem auto-commit dos hooks).
- Qualquer mudança em `mods/default/` deve vir de `pnpm gen:default-bank`, nunca de edição manual.
