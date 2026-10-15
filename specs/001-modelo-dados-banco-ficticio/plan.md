# Implementation Plan: Modelo de dados e banco fictício

**Branch**: `001-modelo-dados-banco-ficticio` | **Date**: 2026-10-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-modelo-dados-banco-ficticio/spec.md`

## Summary

Criar a fundação do motor: o modelo de dados do mundo (país, competição com formato de disputa
como dado, divisões com acesso/rebaixamento, clube com escudo como dados, jogador com atributos
visíveis e ocultos), a validação de bancos (mods) com erros codificados e traduzíveis, e um
gerador determinístico do banco fictício padrão (1 país, Série A e Série B com 20 clubes cada).

Abordagem: monorepo pnpm com `packages/engine` (TypeScript puro, sem DOM/Node) e
`packages/i18n` (mensagens ICU). Schemas Zod validam a estrutura item a item; regras semânticas
próprias cobrem referências e coerência. O gerador usa um PRNG xoshiro128\*\* com sub-geradores
por rótulo e só aritmética exata, e o resultado é versionado em `mods/default/` como "o primeiro
mod", protegido por um teste golden e por testes de distribuição com 20 seeds. Detalhes em
[research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.x (`strict`), Node 22 LTS para scripts e testes

**Primary Dependencies**: Zod 4 (schemas), intl-messageformat 12 (i18n, ICU); dev: Vitest 5,
Biome 2.5 (lint + formatação), tsx 4, pnpm 11 (workspaces). UI no Marco 2: Next.js 16 em static
export (não faz parte desta feature)

**Storage**: arquivos JSON no diretório do mod (`mods/default/`); sem persistência de jogo nesta
feature

**Testing**: Vitest (unitários, validação por fixtures inválidos, distribuição com 20 seeds,
golden, desempenho)

**Target Platform**: motor agnóstico de plataforma (navegador e Node); scripts em Node 22

**Project Type**: biblioteca (motor) + pacote de i18n + scripts CLI de desenvolvimento, em
monorepo

**Performance Goals**: gerar + validar o banco padrão (~1.000 jogadores) em < 2 s (SC-005); meta
interna < 300 ms

**Constraints**: determinismo total entre engines JS (sem `Math.random`, `Date`, funções
transcendentais); motor sem DOM/Node; todo texto via i18n; nenhum nome real

**Scale/Scope**: 1 país, 1 competição, 2 divisões, 40 clubes, ~1.000 jogadores; ~35 códigos de
erro

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Ver `.specify/memory/constitution.md`. Avaliação pré-pesquisa e pós-design (ambas ✅):

- [x] **I. Motor separado:** modelo, validação, gerador e derivados ficam em `packages/engine`;
  tsconfig sem `DOM`/`@types/node`, Biome bloqueando React/Next/`node:*` e teste de arquitetura
  (R15). I/O de disco só no pacote `tools/`.
- [x] **II. Determinismo:** PRNG xoshiro128\*\* com estado serializável e `fork` por rótulo (R3);
  sem `Math.random`, `Date`, funções transcendentais (R4, R5); serialização canônica (R10);
  testes de determinismo com 20 seeds.
- [x] **III. Dados, não código:** país, competição, formato (tipo discriminado), divisões,
  acesso/rebaixamento, clubes e jogadores são dados validados por Zod. Catálogos fixos
  (posições, características, formas, desempates) são código porque o motor implementa seus
  efeitos — documentado no data-model.
- [x] **IV. Sem conteúdo protegido:** bancos de nomes fictícios + teste com lista de bloqueio
  (R14); banco padrão em `mods/default/` no mesmo formato de qualquer mod (R11).
- [x] **V. Balanceamento verificável:** o gerador afeta o equilíbrio do mundo; `DISTRIBUTION_LIMITS`
  com os limites de FR-030 a FR-036 verificados em 20 seeds (R12). Simulação de várias temporadas
  não se aplica ainda (não há evolução nesta feature).
- [x] **VI. Saves versionados:** não há save nesta feature. O formato de **mod** já nasce com
  `formatVersion` e lista de versões suportadas, preparando a mesma política de migrações.
- [x] **VII. i18n:** erros são `code + params`; mensagens ICU em `packages/i18n`; teste de
  cobertura de 100% dos códigos (R9). Identificadores de catálogo neutros, rótulos via i18n (R7).
  Nomes de competições ficam no banco.
- [x] **VIII. Offline e gratuito:** nenhuma dependência de rede; tudo local.
- [x] **IX. Testes primeiro no motor:** cada regra de validação e cada etapa do gerador começa por
  teste; fixtures inválidos por regra (SC-003).

Nenhuma violação; Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/001-modelo-dados-banco-ficticio/
├── plan.md              # este arquivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   ├── engine-api.md        # API pública do motor e do i18n
│   ├── mod-format.md        # formato de mod v1 em disco
│   └── validation-errors.md # catálogo de códigos de erro
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
package.json                 # scripts raiz: typecheck, lint, test, gen:default-bank, validate-bank
pnpm-workspace.yaml
tsconfig.base.json           # strict, ES2023, módulos ESM
biome.json                   # lint + formatação; overrides de fronteira para packages/engine/src
vitest.config.ts             # test.projects apontando para os pacotes

packages/engine/
├── package.json             # @brasfoot-like/engine; deps: zod
├── tsconfig.json            # lib ES2023, types [] (sem DOM, sem Node)
├── src/
│   ├── index.ts             # API pública (contracts/engine-api.md)
│   ├── rng/
│   │   ├── xoshiro.ts       # PRNG, createRng/restoreRng/fork
│   │   ├── hash.ts          # cyrb128, splitmix32
│   │   └── distributions.ts # irwinHall, triangular, weighted
│   ├── calendar/
│   │   └── date.ts          # parse/format ISO, days-from-civil, ageOn
│   ├── model/
│   │   ├── catalogs.ts      # POSITIONS, TRAITS, CREST_SHAPES, TIEBREAKERS
│   │   ├── schemas.ts       # schemas Zod por entidade
│   │   └── types.ts         # tipos inferidos, ValidatedBank
│   ├── validation/
│   │   ├── issues.ts        # IssueCode, ISSUE_CODES, ValidationIssue (erro/aviso)
│   │   ├── structural.ts    # parse item a item + tradução de issues do Zod + avisos
│   │   ├── semantic/
│   │   │   ├── references.ts
│   │   │   ├── uniqueness.ts
│   │   │   ├── competitions.ts  # formato, divisões, acesso/rebaixamento
│   │   │   └── squads.ts        # elencos, jogadores
│   │   └── validate.ts      # validateBank
│   ├── derived/
│   │   └── economy.ts       # deriveWage, deriveMarketValue
│   ├── serialize/
│   │   ├── canonical-json.ts
│   │   └── bank-files.ts    # splitBankFiles/joinBankFiles
│   └── worldgen/
│       ├── generate.ts      # generateDefaultBank
│       ├── tuning.ts        # GENERATOR_TUNING
│       ├── limits.ts        # DISTRIBUTION_LIMITS
│       ├── clubs.ts         # camadas, reputação, nomes, escudos
│       ├── squads.ts        # composição por posição
│       ├── players.ts       # força, idade, características (sem atributos ocultos)
│       ├── hidden.ts        # completeHiddenAttributes (seed da carreira)
│       └── name-banks/
│           ├── default.json
│           └── schema.ts
└── test/
    ├── architecture.test.ts # bloqueia Math.random, funções transcendentais e new Date em src/
    ├── helpers/
    │   └── build-bank.ts    # makeValidBank() + mutadores para casos inválidos
    ├── rng/  calendar/  serialize/  model/  derived/
    ├── validation/          # structural, rules (tabela 1 caso por código), multiple-defects
    ├── worldgen/            # determinism, structure, distribution, hidden, golden, blocklist, performance
    └── fixtures/
        ├── invalid/multiple-defects/  # mod em disco usado pelo quickstart
        └── blocklist.json

packages/i18n/
├── package.json             # @brasfoot-like/i18n; deps: intl-messageformat, @brasfoot-like/engine (tipos)
├── tsconfig.json
├── locales/pt-BR/
│   ├── errors.json
│   └── catalog.json
├── src/
│   ├── index.ts
│   └── format.ts            # formatIssue, messageKeys
└── test/
    ├── errors-coverage.test.ts
    └── format.test.ts

tools/                       # @brasfoot-like/tools — scripts Node de desenvolvimento
├── package.json             # deps: @brasfoot-like/engine, @brasfoot-like/i18n, tsx, @types/node
├── tsconfig.json            # types: ["node"]
└── src/
    ├── fs-bank.ts           # lê/grava diretório de mod; erros file.missing/file.invalid_json
    ├── gen-default-bank.ts
    └── validate-bank.ts

mods/default/                # banco padrão gerado e versionado ("o primeiro mod")
```

**Structure Decision**: monorepo pnpm com três pacotes nesta feature. `packages/engine` concentra
toda a lógica e é a fronteira verificada dos Princípios I e II; `packages/i18n` concentra os
textos (Princípio VII); `tools/` concentra I/O de disco e CLIs, dependendo dos dois (evita
dependência circular engine ↔ i18n). A UI entra como `apps/web` (Next.js, static export) no
Marco 2 e consumirá engine e i18n. O banco padrão vive fora dos pacotes, em `mods/default/`, como
qualquer mod.

## Complexity Tracking

Sem violações da constituição.
