# Implementation Plan: Torcida e rivalidades

**Branch**: `013-torcida-rivalidades` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/013-torcida-rivalidades/spec.md`

## Summary

Rivalidades viram uma seção opcional do formato de mod (`rivalries.json`: pares de clubes com
intensidade 1–3), validada por schema e por uma regra semântica nova (clube inexistente, mesmo
clube, par repetido). O banco padrão ganha rivalidades por regiões geradas deterministicamente. Um
módulo novo do motor, `fans/`, dá a cada clube um humor de torcida 0–100 que reage, a cada rodada, ao
resultado (com peso extra em clássicos, proporcional à intensidade), à posição em relação à
expectativa da 012, à saída de ídolos e à chegada de destaques (lidos do log do mercado), e volta ao
neutro sem estímulos. O humor multiplica o público na bilheteria (008) e entra na confiança da
diretoria (012) como pressão ou apoio; clássicos também pesam mais na diretoria. Na virada, o humor se
aproxima do neutro com impulsos por título/acesso e queda por rebaixamento. O save v9 guarda `fans`
(migração v8 → v9 dá rivalidades padrão a carreiras no banco padrão). A UI ganha o cartão Torcida na
Início, selos de clássico no calendário/próximo jogo/rodada e a aba Torcida na Carreira. Detalhes em
[research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.x (`strict`), Node 22

**Primary Dependencies**: motor, save, i18n, default-mod do workspace; Next.js 16.4 (static
export), React 19.3; Zod. Nenhuma dependência nova.

**Storage**: save v9 no IndexedDB (`fans`, `bank.rivalries`); migração v8 → v9; `mods/default/rivalries.json`

**Testing**: Vitest (motor, validação, save, app); teste de 30 temporadas com mercado, diretoria e
torcida (2 seeds); Playwright no cartão Torcida e no selo de clássico

**Target Platform**: navegadores modernos, desktop ≥ 1280px

**Project Type**: biblioteca (motor) + pacote de save + mod padrão + aplicação web estática + ferramentas

**Performance Goals**: torcida da rodada (40 clubes) < 5 ms; virada continua < 2 s; cada simulação
de 30 temporadas continua < 120 s

**Constraints**: determinismo (clubes por id; nenhuma aleatoriedade nova na torcida; gerador de
rivalidades com fork próprio); aritmética inteira (o fator de público é racional, sem
transcendentais); mesmas regras para todos os clubes; mod antigo sem `rivalries.json` continua
válido; i18n

**Scale/Scope**: ~40 clubes, ~40–60 rivalidades no banco padrão

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação pré-pesquisa e pós-design (ambas ✅):

- [x] **I. Motor separado:** humor, clássicos, ídolos, efeitos e validação no motor; save orquestra;
  UI só exibe.
- [x] **II. Determinismo:** torcida sem sorteio, clubes em ordem de id; `generateRivalries` com seed
  e fork próprio; teste de repetição com salvar/carregar.
- [x] **III. Dados, não código:** rivalidades são dados do mod (schema Zod + validação semântica com
  mensagens por arquivo/campo); parâmetros em `competition.fans` com padrões `DEFAULT_FANS`.
- [x] **IV. Sem conteúdo protegido:** rivalidades fictícias geradas; mods trazem as reais.
- [x] **V. Balanceamento verificável:** `fans/long-run.test.ts` (30 temporadas, 2 seeds) com limites
  de humor e os da 008 com a torcida ativa; `sim:world`/`sim:economy` com a torcida.
- [x] **VI. Saves versionados:** v9 com migração v8 → v9 e fixture.
- [x] **VII. i18n:** motor produz ids de fator/faixa; textos em `ui.json` e `errors.json`.
- [x] **VIII. Offline e gratuito:** tudo local.
- [x] **IX. Testes primeiro no motor:** cada arquivo de `fans/` e a regra de validação começam pelo
  teste.
- [x] **Stack (v1.1.0):** sem servidor; Biome; Vitest.

Nenhuma violação; Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/013-torcida-rivalidades/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/
│   ├── fans-api.md      # API do motor, rivalidades e integrações
│   └── save-and-ui.md   # banco padrão, save v9, telas
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/
├── fans/                       # novo
│   ├── types.ts  rules.ts      # FansState, ClubFans, MoodChange, MoodBand; FansRules, DEFAULT_FANS
│   ├── rivalries.ts            # rivalriesOf, rivalryOf, rivalsOf, isDerby
│   ├── idols.ts                # idolsOf, eventos de ídolo a partir do log da rodada
│   ├── mood.ts                 # moodChange, fansAfterRound, moodBand, gateMoodFactor
│   ├── create.ts               # createFans
│   └── turnover.ts             # fansNewSeasonStep ("fans-new-season")
├── worldgen/rivalries.ts       # generateRivalries (regiões determinísticas)
├── worldgen/generate.ts        # banco padrão com rivalries
├── model/{schemas,types}.ts    # rivalrySchema, ModPackage.rivalries?, competition.fans, board.derbyPct
├── validation/                 # seção "rivalries" (estrutural) + semantic/rivalries.ts; códigos novos
├── serialize/bank-files.ts     # rivalries.json opcional
├── finance/{gate,round}.ts     # humor no público; CareerFans na rodada
├── board/{confidence,rules,types}.ts   # clássico e fator "fans" na confiança
└── career/{types,turnover}.ts  # fans no contexto/opções/resultado; etapa padrão
packages/engine/test/fans/*.test.ts  packages/engine/test/validation/rivalries.test.ts

mods/default/{rivalries.json,package.json}
packages/save/src/{format,create,migrate,career}.ts (+ testes, fixture v8)
packages/i18n/locales/pt-BR/{ui,errors}.json
apps/web/src/
├── game/{default-bank.ts,GameProvider.tsx}
├── ui/fans/{FansCard,DerbyBadge,RivalsList}.tsx
├── app/jogo/page.tsx  app/jogo/calendario/page.tsx  app/jogo/carreira/page.tsx
└── ui/{LiveGrid,RoundResults}.tsx
apps/web/test/flows/fans.test.tsx   apps/web/e2e/fans.spec.ts
tools/src/{fs-bank,gen-default-bank,simulate-world,simulate-economy}.ts
```

**Structure Decision**: a torcida é um módulo próprio (`fans/`) porque tem estado e regras próprias,
mas só lê liga, mercado e expectativa da 012; ela entra na rodada da carreira e na virada pelos
mesmos pontos de extensão. As rivalidades ficam no formato do banco (dados, Princípio III) com
helpers no `fans/` usados por torcida, diretoria e interface.

## Complexity Tracking

Sem violações da constituição.
