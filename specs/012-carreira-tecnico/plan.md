# Implementation Plan: Carreira do técnico e diretoria

**Branch**: `012-carreira-tecnico` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/012-carreira-tecnico/spec.md`

## Summary

Um módulo novo do motor, `board/`, modela a diretoria de **todos** os clubes com as mesmas regras:
metas da temporada (nível esportivo por expectativa = força do elenco + reputação do clube, com
folga menor para técnicos de maior reputação; meta financeira pela situação do caixa), confiança
0–100 atualizada a cada rodada por fatores explicáveis (resultado, distância da meta, finanças,
paciência pela reputação), demissão no meio da temporada (confiança mínima fora da carência) e
avaliação de fim de temporada. O jogador tem reputação 1–100 que muda na avaliação e na demissão;
clubes da IA têm técnicos simplificados (nome e reputação) que caem pelas mesmas regras, abrindo
vagas que viram propostas ao jogador quando o clube é compatível com a reputação dele. A diretoria
entra em `completeCareerRound` (ao vivo, direto, testes e simulações) e na virada (etapa
`board-new-season`). Desempregado, o jogador vira `managerClubId ""` para o motor — o mesmo
caminho "sem humano" que `sim:world` já usa — e o mundo segue. O save v8 guarda `board`, com
migração v7 → v8. A UI ganha o cartão Diretoria na Início, a página Carreira (Diretoria,
Propostas, Histórico, Técnicos), a avaliação no Fim de temporada e a opção "Sem demissão" na nova
carreira. Detalhes em [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.x (`strict`), Node 22

**Primary Dependencies**: motor, save, i18n do workspace; Next.js 16.4 (static export), React
19.3; Zod. Nenhuma dependência nova.

**Storage**: save v8 no IndexedDB (`board`); migração v7 → v8

**Testing**: Vitest (motor, save, app); teste de 30 temporadas com mercado e diretoria (2 seeds);
Playwright no fluxo de demissão → proposta → novo clube

**Target Platform**: navegadores modernos, desktop ≥ 1280px

**Project Type**: biblioteca (motor) + pacote de save + aplicação web estática + ferramentas

**Performance Goals**: diretoria da rodada (40 clubes) < 10 ms; virada completa continua < 2 s
na app; cada simulação de 30 temporadas continua < 120 s

**Constraints**: determinismo (clubes por id, PRNG por seed + temporada + rodada + clube, ids
sequenciais); aritmética inteira; mesmas regras para jogador e IA; jogador desempregado =
`managerClubId ""`; i18n; nenhuma assinatura existente do motor quebra (parâmetros novos opcionais)

**Scale/Scope**: ~40 clubes, ~40 técnicos da IA + pool ≤ 20, ≤ 3 propostas pendentes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação pré-pesquisa e pós-design (ambas ✅):

- [x] **I. Motor separado:** metas, confiança, demissão, reputação, vagas e propostas no motor
  (`board/`); save orquestra; UI só exibe e dispara aceitar/recusar/dispensar.
- [x] **II. Determinismo:** clubes em ordem de id, PRNG derivado de seed + temporada + rodada +
  clube, ids por `nextSeq`, desempates por id; teste de repetição com salvar/carregar.
- [x] **III. Dados, não código:** níveis de meta, tipos financeiros e todos os parâmetros em
  `competition.board` (opcional, Zod) com padrões `DEFAULT_BOARD`; nomes de técnicos do banco de
  nomes do país.
- [x] **IV. Sem conteúdo protegido:** técnicos com nomes gerados; nada real.
- [x] **V. Balanceamento verificável:** `board/long-run.test.ts` (30 temporadas, 2 seeds) com
  limites de trocas de técnico, vagas, pool e cenários de técnico simulado; `sim:world` mostra as
  trocas.
- [x] **VI. Saves versionados:** v8 com migração v7 → v8 e fixture.
- [x] **VII. i18n:** motor produz ids de nível/fator/decisão; textos em `ui.json` com ICU.
- [x] **VIII. Offline e gratuito:** tudo local.
- [x] **IX. Testes primeiro no motor:** cada arquivo de `board/` começa pelo teste.
- [x] **Stack (v1.1.0):** sem servidor; Biome; Vitest.

Nenhuma violação; Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/012-carreira-tecnico/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/
│   ├── board-api.md     # API do motor
│   └── save-and-ui.md   # save v8, provider, telas
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/board/            # novo
├── types.ts            # BoardState, ManagerProfile, ClubBoard, SeasonGoals, JobOffer, …
├── rules.ts            # BoardRules, DEFAULT_BOARD, boardRules
├── create.ts           # createBoard, managerClubOf
├── goals.ts            # goalTiersFor, expectationOf, seasonGoals, goalProgress
├── confidence.ts       # confidenceChange (fatores, paciência)
├── evaluation.ts       # evaluateSeason, shouldFireMidSeason
├── reputation.ts       # reputationDelta
├── coaches.ts          # geração de técnicos, pool, hireCoach
├── offers.ts           # compatibleClub, geração/expiração, acceptJobOffer, declineJobOffer
├── history.ts          # passagens e registros de temporada do técnico
├── round.ts            # boardAfterRound
└── turnover.ts         # boardNewSeasonStep ("board-new-season")
packages/engine/src/market/release.ts        # releaseManagerClub
packages/engine/src/finance/round.ts         # CareerBoard em completeCareerRound/advanceCareer
packages/engine/src/career/{types,turnover}.ts   # board no contexto/opções/resultado; etapa padrão
packages/engine/src/model/schemas.ts         # competition.board opcional
packages/engine/test/board/*.test.ts   packages/engine/test/board/long-run.test.ts

packages/save/src/{format,create,migrate,career,market}.ts  + board.ts (ações, managedClubId)
packages/save/test/{migrate-v8,board}.test.ts (+ fixture v7)
packages/i18n/locales/pt-BR/ui.json
apps/web/src/
├── app/nova-carreira/page.tsx      # "Sem demissão"
├── app/jogo/page.tsx               # cartão Diretoria / painel Sem clube / avisos
├── app/jogo/carreira/page.tsx      # novo: Diretoria, Propostas, Histórico, Técnicos
├── app/jogo/fim-de-temporada/page.tsx  # Avaliação da diretoria
├── game/GameProvider.tsx           # board na rodada; aceitar/recusar/dispensar; desempregado
├── game/GameLayout.tsx, ui/AppHeader.tsx   # navegação e "Sem clube"
└── ui/board/{BoardCard,ConfidenceMeter,GoalsList,JobOffers,Evaluation,ManagerHistory,CoachesTable,BoardNotice}.tsx
apps/web/test/flows/board.test.tsx   apps/web/e2e/career-board.spec.ts
tools/src/simulate-world.ts          # diretoria ativa; trocas de técnico por temporada
```

**Structure Decision**: a diretoria é um módulo próprio (`board/`) porque é um domínio novo
(metas, confiança, emprego) que lê liga, finanças e mundo mas não altera suas regras; ela entra na
rodada da carreira e na virada pelos mesmos pontos de extensão usados por 009/011, e o desemprego
reusa o caminho `managerClubId ""` já coberto pelas simulações longas.

## Complexity Tracking

Sem violações da constituição.
