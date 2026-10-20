# Implementation Plan: Manchetes e histórico

**Branch**: `014-manchetes-historico` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/014-manchetes-historico/spec.md`

## Summary

Um módulo novo do motor, `news/`, transforma os eventos que o jogo já produz em manchetes
estruturadas (tipo + variáveis + índice de variação), sem texto no motor. A cada rodada fechada, ele
detecta fatos dos jogos (resultado com sequência, hat-trick, goleada, virada, zebra, clássico, fim de
jejum), da tabela (título, acesso e rebaixamento matemáticos), da diretoria (técnicos demitidos e
contratados, 012), do mercado (grandes transferências, 011) e dos recordes da liga e dos clubes,
que guarda e atualiza — um recorde superado gera manchete citando o anterior. As manchetes são
agrupadas por jogo, ordenadas por relevância e limitadas por rodada; o clube do jogador sempre tem
ao menos uma. A variação de texto é escolhida por hash determinístico, e os templates (várias
variações por tipo, ICU com plural) ficam em `ui.json`. Na virada, a etapa `news-new-season` grava os
artilheiros, acumula gols e jogos por jogador e clube (com poda), checa recordes de temporada e
gera o resumo. O feed guarda só as duas últimas temporadas. Save v10 com migração; teste de tamanho
com limites medidos (início da 31ª temporada ≤ 1,6 MB). A UI ganha o cartão Manchetes na Início, a
página Notícias e um Histórico com abas (temporadas, títulos, artilheiros, recordes, clubes).
Detalhes em [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.x (`strict`), Node 22

**Primary Dependencies**: motor, save, i18n do workspace; Next.js 16.4 (static export), React
19.3; Zod; intl-messageformat (já usado). Nenhuma dependência nova.

**Storage**: save v10 no IndexedDB (`news`); migração v9 → v10

**Testing**: Vitest (motor, save, app); teste de tamanho de save com 30 temporadas; simulação longa
para variedade de tipos; Playwright no feed e no histórico

**Target Platform**: navegadores modernos, desktop ≥ 1280px

**Project Type**: biblioteca (motor) + pacote de save + aplicação web estática + ferramentas

**Performance Goals**: notícias da rodada (40 clubes, 20 jogos) < 10 ms; virada continua < 2 s;
simulação de 30 temporadas continua < 120 s

**Constraints**: determinismo (hash por seed + temporada + rodada + tipo + ids; iteração por id);
motor sem texto final; save ≤ 1,6 MB no início da temporada 31 e ≤ 4,5 MB na última rodada
(research.md R11); i18n com frases completas e plural

**Scale/Scope**: ~20 jogos por rodada, ≤ 10 manchetes guardadas por rodada, 2 temporadas de feed,
~18 tipos de manchete

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação pré-pesquisa e pós-design (ambas ✅):

- [x] **I. Motor separado:** detecção, recordes, relevância e histórico no motor (`news/`); save
  orquestra; UI só formata e exibe.
- [x] **II. Determinismo:** variação por hash; clubes, jogos e manchetes em ordem estável (relevância,
  tipo, ids); teste com salvar/carregar.
- [x] **III. Dados, não código:** limiares, relevância, limites e quantidade de variações em
  `competition.news` (opcional, Zod) com padrões `DEFAULT_NEWS`.
- [x] **IV. Sem conteúdo protegido:** só nomes do banco.
- [x] **V. Balanceamento verificável:** teste de tamanho do save em 30 temporadas com limites
  declarados; simulação com variedade de tipos (SC-005).
- [x] **VI. Saves versionados:** v10 com migração v9 → v10 e fixture.
- [x] **VII. i18n:** motor produz tipo + variáveis; templates com ICU (plural) em `ui.json`; teste de
  chaves por variação.
- [x] **VIII. Offline e gratuito:** templates locais, sem LLM.
- [x] **IX. Testes primeiro no motor:** cada arquivo de `news/` começa pelo teste.
- [x] **Stack (v1.1.0):** sem servidor; Biome; Vitest.

Nenhuma violação; Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/014-manchetes-historico/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/
│   ├── news-api.md      # API do motor
│   └── save-and-ui.md   # save v10, telas, i18n
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/news/          # novo
├── types.ts  rules.ts  create.ts  # NewsState, Headline, Records…; DEFAULT_NEWS; createNews
├── variants.ts                    # variantOf (hash determinístico)
├── facts.ts                       # matchFacts, streakOf, gols por minuto (virada)
├── clinched.ts                    # título/acesso/rebaixamento matemáticos
├── records.ts                     # updateRecords, candidatos por jogo e por temporada
├── feed.ts                        # rankFeed (agrupar, ordenar, limitar, garantir o clube do jogador)
├── round.ts                       # newsAfterRound (diretoria, mercado, torcida)
├── history.ts                     # allTime, poda, titlesByClub, allTimeScorers, clubLegends
└── turnover.ts                    # newsNewSeasonStep ("news-new-season")
packages/engine/src/finance/round.ts   # CareerNews na rodada
packages/engine/src/career/{types,turnover}.ts
packages/engine/src/model/schemas.ts   # competition.news
packages/engine/test/news/*.test.ts

packages/save/src/{format,create,migrate,career}.ts  (+ testes, fixture v9, size.test.ts)
packages/i18n/locales/pt-BR/ui.json
apps/web/src/
├── app/jogo/page.tsx               # cartão Manchetes
├── app/jogo/noticias/page.tsx      # novo
├── app/jogo/historico/page.tsx     # abas
├── ui/news/{Headline,NewsCard,RoundFeed}.tsx  ui/history/{Titles,Scorers,Records,ClubHistory}.tsx
├── game/{GameProvider,GameLayout}.tsx  ui/{AppHeader,ShortcutsHelp}.tsx
apps/web/test/flows/news.test.tsx   apps/web/e2e/news.spec.ts
tools/src/simulate-world.ts         # tipos de manchete por temporada
```

**Structure Decision**: as notícias são um módulo próprio (`news/`) que só lê o resto do mundo
(partidas, tabela, diretoria, mercado, torcida) e guarda recordes e memória; entra por último na
rodada da carreira e na virada, pelos mesmos pontos de extensão das features anteriores. Títulos e
trajetória do técnico continuam vindo do que já está no save.

## Complexity Tracking

Sem violações da constituição.
