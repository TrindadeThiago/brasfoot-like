# Implementation Plan: Finanças do clube

**Branch**: `008-financas-clube` | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/008-financas-clube/spec.md`

## Summary

O motor ganha o módulo `finance/`: um `FinanceState` da carreira (caixa, dívida, preço do ingresso,
capacidade, obra e crise por clube; lançamentos e bilheterias da temporada; resumos por temporada).
A cada rodada, `applyRoundFinances` lança bilheteria (modelo de público com capacidade, preço,
fase, adversário, divisão e ruído por seed), folha (12 salários exatos por temporada), juros, obras,
crise e as decisões simples da IA. `completeCareerRound` junta isso ao fechamento da rodada da
liga, mantendo ao vivo = direto. A virada da 007 ganha etapas padrão de premiação, fechamento da
temporada financeira, patrocínio e revisão da IA. Os parâmetros econômicos viram dados opcionais do
mod, calibrados por uma simulação de 30 temporadas que também é o teste dos critérios de aceite. O
save vai para a v4 e a UI ganha a tela de Finanças. Detalhes em [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.x (`strict`), Node 22

**Primary Dependencies**: motor, save, i18n do workspace; Next.js 16.4 (static export), React
19.3; Zod. Nenhuma dependência nova.

**Storage**: save v4 no IndexedDB (`finances`); migração v3 → v4

**Testing**: Vitest (motor, save, app com happy-dom + fake-indexeddb); simulação de 30 temporadas
como teste do motor; Playwright para o fluxo de finanças

**Target Platform**: navegadores modernos, desktop ≥ 1280px

**Project Type**: biblioteca (motor) + pacote de save + aplicação web estática + ferramentas

**Performance Goals**: finanças de uma rodada (40 clubes) < 5 ms; 30 temporadas no teste em
< 120 s; rodada direto na app continua < 1 s

**Constraints**: inteiros e conservação do dinheiro; determinismo (ruído por seed da partida, IA em
ordem de id); nenhuma regra na UI; parâmetros no mod; static export; i18n

**Scale/Scope**: 40 clubes, 380 jogos por divisão por temporada; ~760 lançamentos de bilheteria +
~1.520 de folha por temporada (descartados na virada); 1 tela nova

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação pré-pesquisa e pós-design (ambas ✅):

- [x] **I. Motor separado:** público, folha, juros, obras, crise, IA e virada financeira no motor;
  save só valida e grava; UI lê e dispara ações.
- [x] **II. Determinismo:** ruído do público por `fixtureSeed + ":gate"`; IA e lançamentos em ordem
  de id; sem relógio; inteiros.
- [x] **III. Dados, não código:** `competition.economy` no mod (Zod), padrões do motor quando ausente.
- [x] **IV. Sem conteúdo protegido:** moeda e valores fictícios.
- [x] **V. Balanceamento verificável:** `finance/long-run.test.ts` — 30 temporadas, limites
  declarados (R10) para os três critérios de aceite e a sanidade da mediana; `sim:economy` para
  calibrar.
- [x] **VI. Saves versionados:** v4 com migração v3 → v4 e fixtures; cadeia v1 → v4.
- [x] **VII. i18n:** textos e moeda pelo i18n; erros das ações em `finance-errors.json`.
- [x] **VIII. Offline e gratuito:** tudo local.
- [x] **IX. Testes primeiro no motor:** cada arquivo de `finance/` começa pelo teste.
- [x] **Stack (v1.1.0):** sem servidor; Biome; Vitest.

Nenhuma violação; Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/008-financas-clube/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/
│   ├── finance-api.md     # API do motor
│   ├── save-and-mod.md    # save v4 e economy no formato do mod
│   └── ui.md              # tela de finanças
├── checklists/requirements.md
└── tasks.md               # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/
├── finance/                     # novo
│   ├── types.ts                 # FinanceState, ClubFinance, LedgerEntry, GateRecord, …, EconomyRules
│   ├── rules.ts                 # DEFAULT_ECONOMY, economyRules
│   ├── create.ts                # createFinances, annualWageBill
│   ├── gate.ts                  # gateFor, nextHomeGateEstimate
│   ├── round.ts                 # applyRoundFinances, completeCareerRound, advanceCareer
│   ├── actions.ts               # setTicketPrice, takeLoan, repayLoan, startStadiumWorks, creditLine
│   ├── ai.ts                    # revisão de preço, crédito e obras da IA
│   ├── turnover.ts              # etapas pay-prizes, close-finance-season, pay-sponsorship, ai-finance-review
│   ├── summary.ts               # seasonFinanceSummary
│   └── errors.ts                # FinanceErrorCode
├── career/turnover.ts           # finances no contexto; etapas novas na ordem padrão
├── model/schemas.ts             # competition.economy opcional
├── validation/semantic/…        # validação da economy
├── worldgen/generate.ts         # economy explícita no banco padrão
└── index.ts
packages/engine/test/finance/{gate,round,actions,turnover,ai,crisis,long-run}.test.ts
mods/default/competitions.json   # pnpm gen:default-bank

packages/save/src/{format,create,migrate,career,finance}.ts   (+ testes e fixtures v3)
packages/i18n/locales/pt-BR/{ui,finance-errors,errors}.json

apps/web/src/
├── app/jogo/financas/page.tsx    # novo
├── game/GameProvider.tsx         # completeCareerRound; ações de finanças
├── ui/FinanceSummary.tsx  ui/TicketPrice.tsx  ui/CreditPanel.tsx  ui/StadiumPanel.tsx
├── ui/AppHeader.tsx (menu)  app/jogo/page.tsx (crise)  ui/SeasonSummary.tsx (premiação)
└── i18n (formatMoney)
apps/web/test/flows/finances.test.tsx   apps/web/e2e/finances.spec.ts
tools/src/simulate-economy.ts     # pnpm sim:economy
```

**Structure Decision**: `finance/` é um módulo do motor separado de `career/` e `season/`, ligado a
eles só por `completeCareerRound` e pelas etapas da virada; assim as regras de temporada continuam
sem dinheiro e as finanças são testáveis isoladamente. O estado financeiro vive no save ao lado da
liga, porque atravessa temporadas.

## Complexity Tracking

Sem violações da constituição.
