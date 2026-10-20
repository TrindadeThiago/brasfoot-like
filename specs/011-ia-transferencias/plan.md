# Implementation Plan: IA de transferências

**Branch**: `011-ia-transferencias` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/011-ia-transferencias/spec.md`

## Summary

Um submódulo novo do motor, `market/ai/`, dá aos clubes da IA decisões de mercado por necessidade.
A cada rodada fechada (`completeCareerRound`, ao vivo, direto e nas simulações) a IA avalia as
necessidades de cada clube (cobertura e excesso por posição, qualidade em relação à ambição, idade,
orçamento) e, com a janela aberta, executa um número limitado de negócios entre clubes da IA:
compras, empréstimos de jovens e vendas de excedentes, sempre pelas funções da 010 (valor, pedida,
interesse e pedida do atleta, caixa, limites de elenco, lançamentos). Livres são contratados a
qualquer rodada quando cobrem uma carência. Na virada, renovações e liberações passam a seguir a
necessidade, e um teto por posição (padrão 4 goleiros) é imposto. As propostas pelos jogadores do
humano passam a nascer das mesmas necessidades. Ao fechar cada janela, um resumo das transferências
fica no save (v7) e aparece na tela Mercado e num aviso da Início. Os testes de 30 temporadas da
008/009 passam a rodar com o mercado ativo e ganham os limites desta feature (elencos, teto por
posição, fluxo de talentos). Detalhes em [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.x (`strict`), Node 22

**Primary Dependencies**: motor, save, i18n do workspace; Next.js 16.4 (static export), React
19.3; Zod. Nenhuma dependência nova.

**Storage**: save v7 no IndexedDB (`market.reports`, `market.reportSeen`); migração v6 → v7

**Testing**: Vitest (motor, save, app); testes de 30 temporadas com mercado ativo (2 seeds);
Playwright no resumo da janela

**Target Platform**: navegadores modernos, desktop ≥ 1280px

**Project Type**: biblioteca (motor) + pacote de save + aplicação web estática + ferramentas

**Performance Goals**: rodada da IA de mercado (40 clubes) < 150 ms (medido ~50 ms); virada completa < 2 s na app;
cada simulação de 30 temporadas < 120 s

**Constraints**: determinismo (clubes por id, PRNG por seed + temporada + rodada + clube); mesmas
regras do humano (reusa `market/`); sem `**`/funções transcendentais no motor; dinheiro
conservado; jogadores do humano intocáveis; i18n

**Scale/Scope**: ~40 clubes, ~1.000 jogadores, até ~2 negócios por clube por janela

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação pré-pesquisa e pós-design (ambas ✅):

- [x] **I. Motor separado:** necessidades, decisões e resumos no motor (`market/ai/`); save orquestra;
  UI só exibe.
- [x] **II. Determinismo:** clubes processados em ordem de id, alvos com desempate por id, PRNG
  derivado de seed + temporada + rodada + clube.
- [x] **III. Dados, não código:** parâmetros em `competition.market.aiMarket` (opcional, Zod) com
  padrões `DEFAULT_MARKET.aiMarket`.
- [x] **IV. Sem conteúdo protegido:** nada novo de conteúdo.
- [x] **V. Balanceamento verificável:** `market/long-run.test.ts` (30 temporadas, 2 seeds) com os
  limites da 008, da 009 e desta feature; `sim:world` mostra o mercado.
- [x] **VI. Saves versionados:** v7 com migração v6 → v7 e fixtures.
- [x] **VII. i18n:** textos novos em `ui.json`.
- [x] **VIII. Offline e gratuito:** tudo local.
- [x] **IX. Testes primeiro no motor:** cada arquivo de `market/ai/` começa pelo teste.
- [x] **Stack (v1.1.0):** sem servidor; Biome; Vitest.

Nenhuma violação; Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/011-ia-transferencias/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/
│   ├── ai-market-api.md   # API do motor
│   └── save-and-ui.md     # save v7, resumo, telas
├── checklists/requirements.md
└── tasks.md               # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/market/
├── ai/                         # novo
│   ├── rules.ts                # AiMarketRules, DEFAULT_AI_MARKET, positionMax
│   ├── needs.ts                # clubNeeds: cobertura, excesso, qualidade × ambição, idade, orçamento
│   ├── targets.ts              # alvos de compra por necessidade (score, interesse, caixa, vendedor)
│   ├── seller.ts               # disposição do clube da IA em vender (fluxo pequenos → grandes)
│   ├── loans.ts                # empréstimo de jovens com pouca minutagem
│   ├── free-agents.ts          # contratação de livres por carência
│   ├── round.ts                # aiMarketRound: uma rodada de decisões da IA
│   ├── renewals.ts             # decisão de renovar/liberar na virada (substitui aiKeeps da 010)
│   ├── offers.ts               # propostas pelos jogadores do humano a partir das necessidades
│   └── report.ts               # resumo da janela (relevância, filtro por divisão)
├── incoming.ts                 # marketAfterRound passa a usar ai/offers e fechar o resumo
├── turnover.ts                 # expire-contracts usa ai/renewals; teto por posição
├── types.ts  rules.ts          # MarketState.reports/reportSeen; regras aiMarket
packages/engine/src/finance/round.ts   # completeCareerRound/advanceCareer com mercado (CareerMarket)
packages/engine/src/renewal/squads.ts  # balanceSquads respeita o teto por posição
packages/engine/src/model/schemas.ts   # competition.market.aiMarket opcional
packages/engine/test/market/ai/*.test.ts   packages/engine/test/market/long-run.test.ts

packages/save/src/{format,migrate,market}.ts (+ testes, fixtures v6)
packages/i18n/locales/pt-BR/ui.json
apps/web/src/
├── game/GameProvider.tsx       # rodada com mercado; dismissWindowReport
├── ui/market/WindowReport.tsx  # aba "Resumo da janela"
└── ui/MarketNotice.tsx         # aviso de resumo novo
apps/web/test/flows/market-ai.test.tsx   apps/web/e2e/market.spec.ts (resumo)
tools/src/simulate-world.ts     # transferências por temporada e fluxo de talentos
```

**Structure Decision**: a IA de mercado é um submódulo de `market/` porque só compõe as funções da
010 — nenhuma regra nova de negociação, só decisões de quem negociar. Ela entra na rodada da
carreira (`completeCareerRound`) para que app, testes e simulações usem o mesmo caminho, como a
evolução do meio da temporada da 009.

## Complexity Tracking

Sem violações da constituição.
