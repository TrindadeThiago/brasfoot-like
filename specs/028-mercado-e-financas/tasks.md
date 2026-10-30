# Tasks: Mercado e finanças

**Input**: `specs/028-mercado-e-financas/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)
**Tests**: incluídos (constituição IX; a spec exige paridade, desempenho e e2e atualizados).
**Formato**: `- [ ] T### [P?] [US?] Descrição com caminho`. `W` = `apps/web`. Base de trabalho e do PR: `release/v1.0.0`.

**Lições das features anteriores (valem aqui):** `useSearchParams` só dentro do filho de `GameLayout` (Suspense), nunca no componente de página; `aria-label` que não contém o texto visível reprova no axe (use nome só no link/texto e `aria-describedby`); texto só-leitor-de-tela precisa de ancestral com `position: relative` dentro de quadros que rolam; botões de teste por nome acessível, não por `textContent`.

## Phase 1: Setup

- [X] T001 Medir a linha de base: `pnpm build:web`, tamanho de `apps/web/out`, tempo de abertura do menu inicial (mediana de 5 execuções) e o tempo de filtrar a aba Buscar (método fixo: Vitest cronometra `filterRows` sobre `marketRows` do mundo padrão, 10 565 jogadores, e do completo, ≈ 39 000, com os mesmos filtros e a mediana de 5 execuções) em `specs/028-mercado-e-financas/baseline.md`
- [X] T002 Listar em `baseline.md` os testes que tocam as duas telas (`test/flows/market.test.tsx`, `market-ai.test.tsx`, `finances.test.tsx`, e2e `market`, `finances`, `a11y`, `layout`, `keyboard`) como referência de paridade; o resultado é o do CI da 027 (PR #53) e vale para a base `release/v1.0.0`, sem repetir a suíte aqui

## Phase 2: Foundational (bloqueia as histórias)

- [X] T003 [P] Testes das séries (`balanceSeries`, `monthlyFlows`, `breakdown` por origem e destino, `debtSeries`, `attendanceSeries`, `seasonHistory`): conciliação com `cash` e `debt` num save jogado; save adulterado (lançamento a mais) devolve `undefined`; mês da rodada vindo do calendário; `round 0` no mês do início — em `apps/web/test/game/finance-series.test.ts`
- [X] T004 Implementar `apps/web/src/game/finance-series.ts` (puro; usa `save.finances.ledger`, `gates`, `seasons`, `crises`, `save.calendar.days`; categorias de `LEDGER_CATEGORIES`; quando a rodada da liga não está no calendário, o lançamento cai no mês do início da temporada, e se nem o início é conhecido a série mensal devolve `undefined`, com teste)
- [X] T005 [P] Testes dos gráficos (`ChartFigure` com `role="img"` e `aria-label` com o resumo, legenda com valor e percentual, `LineChart`, `BarChart`, `DonutChart`; série única, série vazia e valores negativos) em `apps/web/test/ui/charts.test.tsx`
- [X] T006 Criar `apps/web/src/ui/charts/` (`ChartFigure.tsx`, `LineChart.tsx`, `BarChart.tsx`, `DonutChart.tsx`, `chart.module.css`): SVG próprio, cores por tokens, padrão de preenchimento por série, eixos com `formatMoneyWords`, legenda em tabela, nada só em cor
- [X] T007 [P] Chaves de i18n novas (abas de Finanças, resumos e legendas de gráfico, bandeja de comparação, contagens das abas do Mercado, mensagens do modal do mercado, estados vazios) em `packages/i18n/locales/pt-BR/ui.json`

**Checkpoint**: séries testadas, gráficos prontos e textos criados.

## Phase 3: User Story 1 — Achar um jogador entre mil e comparar até quatro (P1) 🎯 MVP

**Meta**: aba Buscar com filtros imediatos, tabela clicável sem coluna de seleção nem de ações, modal do jogador e comparação por bandeja.
**Teste independente**: abrir o Mercado no mundo padrão, usar os onze filtros, abrir o modal pela linha e comparar de dois a quatro jogadores.

- [X] T008 [P] [US1] Testes da tabela do Mercado (sem coluna de seleção nem de ações, linha clicável abre o modal uma só vez, nome é botão, Mostrar mais, filtro sem resultado com Limpar filtros) em `apps/web/test/ui/market-table.test.tsx`
- [X] T009 [P] [US1] Testes do `MarketPlayerModal` (campos visíveis sem atributos ocultos, Fazer oferta e Pedir empréstimo, Contratar para livre, Adicionar/Remover da comparação, travas com motivo, foco devolvido, foco em dois níveis — cancelar o diálogo de oferta aberto por cima devolve o foco ao botão do modal e fechar o modal devolve ao nome ou à linha —, e jogador com negociação já aberta: o modal abre a negociação existente) em `apps/web/test/ui/market-modal.test.tsx`
- [X] T010 [P] [US1] Testes da comparação (`CompareTray`: limite de 4 com aviso, Remover, Comparar só com 2 a 4; `ComparePanel` lado a lado) em `apps/web/test/ui/market-compare.test.tsx`
- [X] T011 [P] [US1] Teste de desempenho: `marketRows` montada uma vez e filtros em até 200 ms com o mundo padrão (10 565) e com o completo (≈ 39 000), pelo mesmo método de T001, em `apps/web/test/ui/market-perf.test.tsx`
- [X] T012 [US1] Refazer `apps/web/src/ui/market/MarketTable.tsx` e `market.module.css`: remover coluna de seleção e de ações; `onRowClick`, nome como `<button aria-haspopup="dialog">` com `stopPropagation`; `stickyFirst`; manter ordenação e colunas
- [X] T013 [US1] Criar `apps/web/src/ui/market/MarketPlayerModal.tsx` (+ `.module.css`) sobre `Dialog`: `Meter` de força e condição, nacionalidade, características, contrato, valor, salário, evolução, estatísticas só visíveis, botões Fazer oferta e Pedir empréstimo (ou Contratar), Adicionar/Remover da comparação e Fechar; travas com motivo
- [X] T014 [P] [US1] Criar `apps/web/src/ui/market/CompareTray.tsx` e refazer `ComparePanel.tsx` (janela lado a lado em `Dialog`) com `.module.css`
- [X] T015 [US1] Refazer a aba Buscar em `apps/web/src/app/jogo/mercado/page.tsx`: estado da comparação (`Set` ≤ 4) na página, bandeja acima da tabela, modal ao clicar, `useDeferredValue` no filtro de nome, contagem de resultados, estado vazio com `EmptyState` (os onze filtros de `MarketFilters.tsx` ficam como estão)

## Phase 4: User Story 2 — Acompanhar negociações, propostas e contratos (P1)

**Meta**: as quatro abas em `Tabs`, com contagem do que pede resposta.
**Teste independente**: abrir uma negociação, receber uma proposta e conferir cada aba.

- [X] T016 [P] [US2] Testes das abas do Mercado (quatro abas e Resumo da janela, contagens em texto, `?aba=report` abre o resumo, Contratos sem renovar emprestado, Propostas aceitar e recusar) em `apps/web/test/ui/market-tabs.test.tsx`
- [X] T017 [US2] Trocar o seletor de abas do Mercado por `Tabs` com a contagem no nome em `apps/web/src/app/jogo/mercado/page.tsx` (mantendo `?aba=` lido dentro do filho de `GameLayout`); contagens: Negociações = as que estão em contraproposta ou aguardando, Propostas recebidas = o total pendente, Contratos = os que terminam esta temporada
- [X] T018 [P] [US2] Reestilizar `NegotiationsTab.tsx`, `IncomingOffers.tsx`, `ContractsTab.tsx` e `WindowReport.tsx` com `Card`, `Badge`, `EmptyState` e as etapas em texto, sem perder dados ou ações (`apps/web/src/ui/market/`)
- [X] T019 [US2] `WindowStatus.tsx`: janela aberta ou fechada com as datas, no novo visual (`apps/web/src/ui/market/WindowStatus.tsx`)

## Phase 5: User Story 3 — Diálogos de oferta, empréstimo, livre e renovação (P1)

**Meta**: diálogos claros, com referência de valor, erro ligado ao campo e motivo de recusa em texto, só com o teclado.
**Teste independente**: contratar um livre, fazer uma oferta recusada, ajustar a contraproposta e renovar, só com o teclado.

- [X] T020 [P] [US3] Testes do `NegotiationDialog` (valor de mercado de referência, erro de campo com `aria-describedby` e `role="alert"`, motivos de recusa do clube e do jogador em texto, contraproposta com aceitar e recusar, foco devolvido) em `apps/web/test/ui/negotiation-dialog.test.tsx`
- [X] T021 [US3] Refazer os campos do `NegotiationDialog` com `Field` da 025 (valor, taxa, salário, duração), valor de mercado como referência e travas em `Notice` (`apps/web/src/ui/market/NegotiationDialog.tsx`, `market.module.css`)
- [X] T022 [US3] Garantir os motivos de recusa (`market.reason.*`) e as respostas do jogador em texto em todos os caminhos e atualizar os testes de fluxo (`apps/web/test/flows/market.test.tsx`, `market-ai.test.tsx`) para o modal e os novos nomes; conferir que venda e rescisão (FR-009) seguem funcionando (`apps/web/test/flows/disposal.test.tsx`: cotação, confirmação e resultado)
- [X] T023 [US3] Atualizar `apps/web/e2e/market.spec.ts` para o modal, as abas e a bandeja, e criar o teste só com teclado (contratar livre, oferta recusada, contraproposta, renovar) em `apps/web/e2e/market-keyboard.spec.ts`

## Phase 6: User Story 4 — Finanças em abas, com gráficos (P1)

**Meta**: resumo fixo e seis abas, gráficos com resumo e legenda, ações com resultado na hora.
**Teste independente**: percorrer as abas, aplicar preço, tomar e amortizar crédito e contratar uma obra.

- [X] T024 [P] [US4] Testes das abas de Finanças (resumo fixo, aviso de crise, trava de rodada ao vivo, gráfico presente com dado conciliado e ausente — com tabela no lugar — com dado adulterado; Bilheteria sem jogos em casa com estado vazio; Crédito sem dívida com Amortizar e Quitar desativados e o motivo) em `apps/web/test/ui/finance-tabs.test.tsx`
- [X] T025 [US4] Criar `apps/web/src/ui/finance/FinanceHeader.tsx` (saldo, resultado da temporada, dívida, estádio, aviso de crise e de rodada ao vivo) e refazer `FinanceSummary.tsx`
- [X] T026 [P] [US4] Criar `OverviewTab.tsx` (saldo em linha e receitas × despesas por mês) e `FlowTab.tsx` (resumo da temporada e roscas por origem e por destino) em `apps/web/src/ui/finance/`
- [X] T027 [P] [US4] Criar `GateTab.tsx` (ingresso editável com estimativa, público por jogo com a capacidade, jogos em casa) reaproveitando `TicketPrice.tsx` e `HomeGames` (de `ui/FinanceTables.tsx`) em `apps/web/src/ui/finance/`
- [X] T028 [P] [US4] Criar `StadiumTab.tsx` (obras, aviso de obra em andamento e de caixa insuficiente, capacidade depois de cada obra) e `CreditTab.tsx` (limite em uso, tomar, amortizar, quitar, dívida em linha) reaproveitando `StadiumPanel.tsx` e `CreditPanel.tsx` em `apps/web/src/ui/finance/`
- [X] T029 [P] [US4] Criar `HistoryTab.tsx` (prêmios da temporada, histórico por temporada com gráfico, tabela e crises) reaproveitando `PrizeStatement` e `FinanceHistory` (de `ui/FinanceTables.tsx`) em `apps/web/src/ui/finance/`
- [X] T030 [US4] Refazer `apps/web/src/app/jogo/financas/page.tsx` e `page.module.css` com `FinanceHeader` fixo e `Tabs` de seis abas; ações (`setTicketPrice`, `takeLoan`, `repayLoan`, `startStadiumWorks`) com resultado na hora e travas em texto
- [X] T031 [US4] Atualizar `apps/web/test/flows/finances.test.tsx` e `apps/web/e2e/finances.spec.ts` para as abas e os novos elementos (preço, empréstimo, amortização, obra continuam como hoje)

## Phase 7: User Story 5 — Teclado, travas e formato de dinheiro (P2)

**Meta**: as duas telas só com teclado, nos dois temas, nas três larguras, com as travas em texto e todo dinheiro por `formatMoney`.
**Teste independente**: percorrer Mercado e Finanças só com o teclado nos dois temas.

- [X] T032 [P] [US5] Estender `apps/web/e2e/layout.spec.ts` (Mercado e as seis abas de Finanças em 1 440/1 280/1 024 px, sem texto cortado e sem rolagem horizontal) e `a11y.spec.ts` (modal, bandeja, diálogo aberto, gráficos de cada aba)
- [X] T033 [P] [US5] Estender `apps/web/e2e/keyboard.spec.ts`: Tab pelas abas, filtros, linhas e bandeja do Mercado; setas nas abas de Finanças; foco devolvido ao fechar modal e diálogos
- [X] T034 [US5] Conferir que todo valor usa `formatMoney`/`formatMoneyWords`, sem número fixo no texto, e que nenhum gráfico depende só da cor; corrigir em `apps/web/src/ui/charts/`, `ui/finance/` e `ui/market/`
- [X] T035 [US5] Verificar atalhos da 016 (incluindo `m`), ajuda de atalhos, dicas e trava de saída nas duas telas; reancorar dicas em `apps/web/src/ui/tips/catalog.ts` se o elemento mudou, e corrigir regressões em `apps/web/src/ui/shortcuts.ts`

## Phase 8: Polish & transversais

- [X] T036 Acrescentar à nota única do 1.0.0 os itens da 028 em `packages/i18n/locales/pt-BR/release-notes.json` (versão e `check-release` inalterados)
- [X] T037 [P] Rodar `pnpm lint` e `pnpm typecheck` e corrigir pendências; remover chaves de i18n sem uso (o teste `no-literals` falha com chave não usada)
- [X] T038 Rodar `pnpm test` e `pnpm test:e2e` completos
- [X] T039 Medir de novo build, abertura e o filtro do Mercado e comparar com `baseline.md`
- [X] T040 Executar a validação manual de `specs/028-mercado-e-financas/quickstart.md` nos dois temas e nas três larguras
- [ ] T041 Abrir PR com `--base release/v1.0.0` (nota do 1.0.0 atualizada no mesmo PR; versão inalterada)

## Dependências

- Setup → Foundational → histórias. US1 a US4 são independentes entre si após a Phase 2 (US1, US2 e US3 mexem em `mercado/page.tsx` e em `ui/market/`; fazê-las em ordem); US4 é independente do Mercado; US5 fecha depois delas.
- T004 depende de T003; T006 de T005; T026–T029 de T004 e T006; T030 de T025–T029.
- T012 e T013 antes de T015; T015 depende de T014; T017 depois de T015; T021 depois de T013.
- T031 depois de T030; T022 e T023 depois de T021.
- T032–T035 dependem de US1–US4 prontas; T036 fica no Polimento, para refletir o que entrou.

## Execução paralela (exemplos)

- Phase 2: T003, T005 e T007 em paralelo; T004 após T003 e T006 após T005.
- US1: T008–T011 (testes) em paralelo; depois T012–T014 (T014 em paralelo com T012/T013), T015 ao final.
- US4: T026–T029 em paralelo (arquivos distintos); T030 ao final.
- US5: T032 e T033 em paralelo.

## Estratégia

MVP = Setup + Foundational + US1 (Mercado com busca, modal e comparação). Depois US2 e US3 (abas e diálogos), US4 (Finanças com gráficos, que pode andar em paralelo ao Mercado), por fim US5 (teclado, larguras, dinheiro) e o polimento. Um PR único para `release/v1.0.0`, com commits por história.
