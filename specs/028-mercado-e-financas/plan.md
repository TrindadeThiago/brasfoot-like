# Implementation Plan: Mercado e finanças

**Branch**: `028-mercado-e-financas` | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/028-mercado-e-financas/spec.md`

## Summary

Refaz o Mercado e as Finanças sobre a fundação da 025 e os padrões da 026 e 027. Mercado: as quatro
abas em `Tabs` com contagem do que pede resposta; Buscar com os onze filtros, tabela sem coluna de
seleção nem de ações, linha clicável (nome como botão) que abre o modal do jogador (Fazer oferta,
Pedir empréstimo ou Contratar, Adicionar à comparação, Fechar), bandeja de comparação e janela lado a
lado; diálogos de negociação com campos ligados aos erros e motivos de recusa em texto. Finanças:
resumo fixo e seis abas (Visão geral, Receitas e despesas, Bilheteria, Estádio, Crédito, Histórico)
com gráficos em SVG próprio, todos com resumo para leitor de tela e legenda com valores.

Abordagem técnica: a verificação dos dados (research R1) mostrou que o extrato tem rodada em todo
lançamento, e data nas bilheterias, o que basta para os gráficos por mês, para o saldo ao longo da
temporada, para a dívida e para as roscas por origem e por destino; um teste de conciliação decide,
por save, se o gráfico aparece. As séries saem de funções puras em `apps/web/src/game/`. Sem
dependência nova, sem mudança no motor, nos saves ou nas regras.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Next.js 16 (export estático), Node 22

**Primary Dependencies**: CSS Modules, SVG escrito à mão para os gráficos; sem biblioteca de gráficos

**Storage**: nenhuma mudança; a aba aberta e o filtro de nome ficam em estado local (e `?aba=` na URL como hoje no Mercado)

**Testing**: Vitest + happy-dom + Testing Library; Playwright (e2e de mercado, finanças, teclado, a11y, layout)

**Target Platform**: navegadores desktop, PWA offline

**Project Type**: web (monorepo pnpm)

**Performance Goals**: filtros do Mercado respondem em até 200 ms com o mundo padrão (hoje 10 565 jogadores) e continuam usáveis no mundo completo (≈ 39 000); gráficos abrem em até 1 s

**Constraints**: paridade funcional; rotas e `?aba=` preservados; i18n; contraste 016; gráfico nunca só em cor; sem rolagem horizontal da página em 1 440/1 280/1 024 px; dinheiro sempre por `formatMoney`

**Scale/Scope**: 2 telas; ≈ 1 750 linhas de código de tela hoje; 1 modal novo, 1 bandeja, 1 conjunto de gráficos (3 tipos), 1 módulo puro de séries

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Motor separado:** nenhuma regra nova; as séries dos gráficos são derivações de exibição puras (`apps/web/src/game/`), sem React/DOM, que só leem o estado já calculado
- [x] **II. Determinismo:** sem aleatoriedade nova; datas vêm do estado (calendário do save), nunca do relógio
- [x] **III. Dados, não código:** sem lista fixa no código; categorias de origem e destino saem de `LEDGER_CATEGORIES`
- [x] **IV. Sem conteúdo protegido:** nenhum nome ou escudo novo
- [x] **V. Balanceamento verificável:** não se aplica (sem mudança de regra de economia ou de mercado)
- [x] **VI. Saves versionados:** sem mudança de formato nem de preferências
- [x] **VII. i18n:** todo texto novo em `ui.json`, com plural; resumos de gráfico e legendas também
- [x] **VIII. Offline e gratuito:** gráficos em SVG próprio, sem dependência nova e sem rede
- [x] **IX. Testes primeiro:** testes unitários das séries (incluindo a conciliação com o caixa e a dívida) antes dos gráficos; testes de componente e e2e atualizados

Pós-design: todos os gates passam; sem violações a justificar.

## Project Structure

### Documentation (this feature)

```text
specs/028-mercado-e-financas/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── market-screen.md
│   ├── negotiation-dialogs.md
│   └── finance-charts.md
└── tasks.md             # gerado por /speckit-tasks
```

### Source Code (repository root)

```text
packages/i18n/locales/pt-BR/
├── ui.json                                   # chaves novas (abas, bandeja, gráficos, resumos)
└── release-notes.json                        # + itens da 028 na nota 1.0.0
apps/web/src/
├── game/finance-series.ts                    # séries dos gráficos e conciliação (puro)
├── app/jogo/mercado/page.tsx (+ css)         # Tabs, bandeja, modal, comparação
├── app/jogo/financas/page.tsx (+ css)        # resumo fixo e Tabs
├── ui/market/MarketTable.tsx                 # sem seleção/ações; linha clicável e nome-botão
├── ui/market/MarketPlayerModal.tsx           # modal do jogador no Mercado
├── ui/market/CompareTray.tsx, ComparePanel.tsx   # bandeja e janela lado a lado
├── ui/market/NegotiationDialog.tsx           # campos com Field, motivos e foco
├── ui/market/{NegotiationsTab,IncomingOffers,ContractsTab,MarketFilters}.tsx
├── ui/charts/ (ChartFigure, LineChart, BarChart, DonutChart, chart.module.css)
├── ui/finance/ (FinanceHeader, OverviewTab, FlowTab, GateTab, StadiumTab, CreditTab, HistoryTab)
├── ui/{FinanceSummary,FinanceTables,TicketPrice,CreditPanel,StadiumPanel}.tsx   # reaproveitados nas abas
apps/web/test/
├── game/finance-series.test.ts, ui/charts.test.tsx, ui/market-*.test.tsx, ui/finance-*.test.tsx
apps/web/e2e/
├── market.spec.ts, finances.spec.ts, layout.spec.ts, a11y.spec.ts, keyboard.spec.ts
```

**Structure Decision**: monorepo existente; trabalho em `apps/web` (telas, componentes, gráficos e um módulo puro em `game/`) e `packages/i18n`. Nenhum código novo no motor.

## Complexity Tracking

Sem violações da constituição a justificar.
