# Tasks: Competição, calendário e histórico

**Input**: `specs/027-competicao-calendario-historico/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)
**Tests**: incluídos (constituição IX; a spec exige paridade, desempenho e e2e atualizados).
**Formato**: `- [ ] T### [P?] [US?] Descrição com caminho`. `W` = `apps/web`. Base de trabalho e do PR: `release/v1.0.0`.

## Phase 1: Setup

- [X] T001 Medir a linha de base: `pnpm build:web`, tamanho de `apps/web/out` e tempo de abertura (mesmo método da 025/026) em `specs/027-competicao-calendario-historico/baseline.md`; registrar também o tempo de abertura das telas de Competição (classificação de 20 clubes e chaveamento de 32) e de Calendário no mundo padrão
- [X] T002 Listar em `baseline.md` os testes que tocam as três telas (`test/ui/calendar-detail.test.tsx`, `competition-calendar.test.tsx`, `quick-wins.test.tsx`, e2e `calendar`, `cup`, `continental`, `regional`, `stages`, `qualification`, `seasons`, `full-season`) como referência de paridade; o resultado dos testes é o do CI da 026 (PR #52) e vale para a base `release/v1.0.0`, sem repetir a suíte aqui

## Phase 2: Foundational (bloqueia as histórias)

- [X] T003 [P] Teste de `clubCompetitions` (participa, eliminado, encerrada, "começa em", vaga confirmada sobe para Minhas, vaga em disputa fica em Demais, estadual só o da região, mundo de um país) em `apps/web/test/game/competitions.test.ts`
- [X] T004 Implementar `clubCompetitions(save)` em `apps/web/src/game/competitions.ts` (puro; usa `clubFixtures`, `competitionSeason`, `clubQualification`, `participantOrigins`); situações: em disputa, eliminado, encerrada, "começa em {data}" (só quando há a data do primeiro jogo conhecido; sem data, "vaga confirmada"), não participa e vaga em disputa
- [X] T005 [P] Teste de `calendarMonths` (meses e contagens, semanas de domingo a sábado, dia com dois jogos, mês sem jogos, mês do próximo jogo, dia atual, temporada encerrada) em `apps/web/test/game/calendar-month.test.ts`
- [X] T006 Implementar `calendarMonths` e `monthOfNext` em `apps/web/src/game/calendar-month.ts` (puro; datas ISO do estado, nunca o relógio) e o formato do título do mês ("outubro de 2026") e dos dias da semana pelo formatador de data de `apps/web/src/i18n`, com teste no mesmo arquivo de T005
- [X] T007 [P] Adicionar a opção `stickyFirst` ao `DataTable` (primeira coluna `position: sticky; left: 0` sobre `--color-surface`) em `apps/web/src/ui/DataTable.tsx` e `DataTable.module.css`, com teste em `apps/web/test/ui/base-components.test.tsx`
- [X] T008 [P] Chaves de i18n novas (abas Minhas/Demais, situações do cartão, "seu clube não participa", "ainda não começou", calendário: mês anterior/próximo, "Ir para o próximo jogo", "hoje", "próximo jogo", "Sem jogos neste mês", histórico: vazios por aba e "Ver trajetória como técnico") em `packages/i18n/locales/pt-BR/ui.json`

**Checkpoint**: derivações puras testadas, `stickyFirst` e textos prontos.

## Phase 3: User Story 1 — Trocar de país e de competição e ler a tabela (P1) 🎯 MVP

**Meta**: abas Minhas/Demais, cartões selecionáveis e as seções de cada competição.
**Teste independente**: com o mundo padrão, abrir a Competição, escolher uma competição de outro país e uma continental e ler classificação, resultados e artilharia.

- [X] T009 [P] [US1] Testes de `CompetitionList`/`CompetitionCard` (duas abas, situação em cada cartão, `aria-current`, seletor de país e contagem em Demais, mundo de um país sem seletor inútil, competição que ainda não começou com início, vaga e formato) em `apps/web/test/ui/competition-list.test.tsx`
- [X] T010 [US1] Criar `apps/web/src/ui/CompetitionCard.tsx` e `CompetitionList.tsx` (+ `.module.css`) com `Tabs` da 025, cartões-link por `competitionHref`, situação em texto e seletor de país em Demais
- [X] T011 [US1] Refazer `apps/web/src/app/jogo/competicao/page.tsx` e criar `page.module.css`: lista de cartões no topo, seções Classificação/Resultados/Artilharia (rotas atuais) e divisões, `data-tip-anchor="table"` mantido; manter os estados `season.stages` e `season.bracket`
- [X] T012 [P] [US1] Testes de paridade de `resultados` e `artilharia` (navegação por rodada e por divisão, todos os dados atuais visíveis) em `apps/web/test/ui/competition-sections.test.tsx`, escritos antes de reestilizar, e conferência contra a lista de `docs/interface-nova.md` §5
- [X] T013 [US1] Substituir o uso de `CompetitionSelect`/`CompetitionTabs` nas telas `competicao`, `resultados` e `artilharia` e reestilizar as seções (`apps/web/src/ui/CompetitionTabs.tsx`, `.module.css`, `app/jogo/competicao/resultados/page.tsx`, `artilharia/page.tsx`); conferir com `grep` quem mais usa `CompetitionSelect` e remover `CompetitionSelect.tsx` só se ficar sem uso, registrando o resultado aqui
- [X] T014 [US1] `StandingsTable`: forma recente em texto (V/E/D), rótulo de zona sempre em texto, clube do jogador destacado com `aria-current` e primeira coluna fixa (`apps/web/src/ui/StandingsTable.tsx`, `.module.css`)
- [X] T015 [US1] Painel de campanha só onde o clube joga e `Notice` "seu clube não participa" nas demais; bloco "ainda não começou" com início, vaga e formato (`apps/web/src/app/jogo/competicao/page.tsx`, `apps/web/src/ui/continental/CampaignPanel.tsx`)
- [X] T016 [US1] Estados vazios desenhados (`EmptyState`): competição sem jogos, sem classificados e país sem competições, em `apps/web/src/app/jogo/competicao/page.tsx` e subrotas

## Phase 4: User Story 2 — Mata-mata e fases de relance (P1)

**Meta**: chaveamento com o clube e o caminho destacados, fases com a origem das vagas, tudo a no máximo dois cliques.
**Teste independente**: abrir uma copa, uma taça continental e um estadual com grupos e mata-mata e conferir chaveamento, fases, origem das vagas e campanha.

- [X] T017 [P] [US2] Testes do `Bracket` (clube do jogador destacado, selo "seu caminho" nas rodadas em que jogou, pênaltis, 32 clubes dentro de 1 s) em `apps/web/test/ui/bracket.test.tsx`
- [X] T018 [US2] `Bracket` com destaque do clube e do caminho até a final e rolagem no próprio quadro (`apps/web/src/ui/cup/Bracket.tsx`, `Bracket.module.css`)
- [X] T019 [P] [US2] Reestilizar `StageNav`, `StageView`, `GroupTables` e `FinalPositions` para os tokens e componentes da 025, mantendo comportamento (`apps/web/src/ui/stages/*`)
- [X] T020 [US2] Garantir os dois cliques: da tela de Competição à classificação, ao chaveamento e à campanha de uma continental e de um estadual no mundo padrão (`apps/web/src/app/jogo/competicao/page.tsx`), com e2e em `apps/web/e2e/continental.spec.ts` e `regional.spec.ts`
- [X] T021 [US2] Atualizar `apps/web/e2e/cup.spec.ts`, `stages.spec.ts` e `qualification.spec.ts` para os novos cartões e seletores

## Phase 5: User Story 3 — Calendário mensal (P1)

**Meta**: grade mensal com os dias de jogo, faixa de meses, painel e navegação por teclado.
**Teste independente**: abrir o Calendário no meio da temporada, navegar entre meses, filtrar, escolher um dia de jogo e usar "Ir para o próximo jogo".

- [X] T022 [P] [US3] Testes de `MonthGrid` (dia de jogo com adversário, mando e resultado em texto, hoje e próximo jogo marcados, dia com dois jogos mostra ambos, setas do teclado, mês sem jogos) em `apps/web/test/ui/calendar-month.test.tsx`
- [X] T023 [P] [US3] Atualizar `apps/web/test/ui/calendar-detail.test.tsx` e `competition-calendar.test.tsx` para a grade e o painel do dia (Resumo e Ver jogos da rodada continuam)
- [X] T024 [US3] Criar `apps/web/src/ui/calendar/MonthGrid.tsx` (`role="grid"`, tabindex móvel, setas/Home/End/PageUp/PageDown), `MonthStrip.tsx`, `DayPanel.tsx` e `MonthList.tsx` (+ `.module.css`), usando `calendarMonths`
- [X] T025 [US3] Refazer `apps/web/src/app/jogo/calendario/page.tsx` e `page.module.css`: cabeçalho com setas, título do mês e "Ir para o próximo jogo", faixa de meses com contagem, filtro por competição, grade, painel do jogo e lista; `?mes=AAAA-MM`; abre no mês do próximo jogo
- [X] T026 [US3] Diálogos Resumo e Ver jogos da rodada ligados ao painel e à lista, com o foco devolvido ao dia/linha de origem (`apps/web/src/app/jogo/calendario/page.tsx`)
- [X] T027 [US3] Atualizar `apps/web/e2e/calendar.spec.ts` para a grade mensal (mês aberto, setas, próximo jogo, filtro, painel)

## Phase 6: User Story 4 — Histórico (P2)

**Meta**: abas com estados vazios explicativos, tabelas com primeira coluna fixa e ligação à trajetória do técnico.
**Teste independente**: abrir o Histórico antes e depois de uma temporada encerrada e percorrer as abas.

- [X] T028 [P] [US4] Testes do Histórico (abas por `Tabs`, abas condicionais Copas/Continental/Estaduais, vazio por aba antes da primeira temporada, ligação à trajetória, temporada aberta por `t`) em `apps/web/test/ui/history.test.tsx`
- [X] T029 [US4] Refazer `apps/web/src/app/jogo/historico/page.tsx` e `page.module.css` com `Tabs`, `EmptyState` por aba, ligação "Ver trajetória como técnico" e `DataTable` com `stickyFirst` nas tabelas largas
- [X] T030 [P] [US4] Reestilizar `apps/web/src/ui/cup/CupHistory.tsx`, `continental/ContinentalHistory.tsx` e `regional/RegionalHistory.tsx` para os tokens e `EmptyState`, sem perder dados
- [X] T031 [US4] Garantir que as classificações de temporadas passadas continuam visíveis (`apps/web/src/app/jogo/historico/page.tsx`), cobri-las em `history.test.tsx` e criar `apps/web/e2e/history.spec.ts` (não existe e2e do Histórico hoje): abrir o Histórico antes da primeira temporada encerrada (vazio explicativo) e depois de uma encerrada com `simulateSeason`, percorrer as abas, abrir uma temporada e ver a classificação final; ajustar os trechos que usam o Histórico em `a11y.spec.ts`, `news.spec.ts`, `layout.spec.ts` e `keyboard.spec.ts`

## Phase 7: User Story 5 — Rápidas, acessíveis e sem rolagem da página (P2)

**Meta**: desempenho dentro do limite, cor nunca sozinha, teclado completo e sem rolagem horizontal da página.
**Teste independente**: as três telas em 1 440, 1 280 e 1 024 px, nos dois temas, só com o teclado, com o mundo padrão e com um mundo grande.

- [X] T032 [P] [US5] Teste de desempenho (Vitest): `calendarMonths` de uma temporada completa, classificação de 20 clubes com forma e `Bracket` de 32 clubes renderizam em até 1 s, e a `CompetitionList` do mundo completo (dezenas de países) renderiza só o país escolhido em Demais em até 1 s, em `apps/web/test/ui/competition-perf.test.tsx`
- [X] T033 [P] [US5] Estender `apps/web/e2e/layout.spec.ts` (Competição com cartões, Calendário e Histórico em 1 440/1 280/1 024 px, texto cortado e rolagem horizontal) e `a11y.spec.ts` (grade do calendário, cartões, histórico vazio)
- [X] T034 [P] [US5] Estender `apps/web/e2e/keyboard.spec.ts`: Tab pelos cartões e abas da Competição, setas e Enter na grade do calendário, foco devolvido ao fechar Resumo
- [X] T035 [US5] Conferir cor nunca como único sinal (zonas, V/E/D, competição por faixa) e contraste nos dois temas nas três telas; corrigir em `apps/web/src/ui/StandingsTable.module.css`, `calendar/*.module.css` e `cup/Bracket.module.css`
- [X] T036 [US5] Verificar atalhos da 016, ajuda de atalhos, dicas (`data-tip-anchor="table"`) e trava de saída nas três telas; corrigir regressões em `apps/web/src/ui/shortcuts.ts` e nas páginas

## Phase 8: Polish & transversais

- [X] T037 Acrescentar à nota única do 1.0.0 os itens da 027 em `packages/i18n/locales/pt-BR/release-notes.json` (versão e `check-release` inalterados)
- [X] T038 [P] Rodar `pnpm lint` e `pnpm typecheck` e corrigir pendências
- [X] T039 Rodar `pnpm test` e `pnpm test:e2e` completos
- [X] T040 Medir de novo build e aberturas e comparar com `baseline.md`
- [X] T041 Executar a validação manual de `specs/027-competicao-calendario-historico/quickstart.md` nos dois temas e nas três larguras
- [X] T042 Abrir PR com `--base release/v1.0.0` (nota do 1.0.0 atualizada no mesmo PR; versão inalterada)

## Dependências

- Setup → Foundational → histórias. US1, US2, US3 e US4 são independentes entre si após a Phase 2 e podem andar em paralelo; US5 fecha depois delas.
- T004 depende de T003; T006 de T005; T010 de T004 e T008; T011 de T010; T013 de T011 e T012 (o teste de paridade vem antes de reestilizar).
- T018 depende de T017; T020 depende de T011 e T018; T021 depois de T013 e T020.
- T024 depende de T006 e T008; T025 de T024; T026 de T025; T027 de T025–T026.
- T029 depende de T007 e T008; T031 depois de T029.
- T032–T036 dependem de US1–US4 prontas; T037 fica no Polimento, para refletir o que entrou.

## Execução paralela (exemplos)

- Phase 2: T003, T005, T007 e T008 em paralelo; T004 após T003 e T006 após T005.
- US1: T009 e T014 em paralelo; depois T010–T013.
- US3: T022 e T023 em paralelo; T024 depois.
- US5: T032, T033 e T034 em paralelo.

## Estratégia

MVP = Setup + Foundational + US1 (Competição nova funcionando). Depois US2 (mata-mata e fases), US3 (Calendário mensal) e US4 (Histórico), por fim US5 (desempenho, acessibilidade, larguras) e o polimento. Um PR único para `release/v1.0.0`, com commits por história.
