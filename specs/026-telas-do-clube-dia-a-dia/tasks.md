# Tasks: Telas do clube: Início, Elenco e Escalação

**Input**: `specs/026-telas-do-clube-dia-a-dia/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)
**Tests**: incluídos (constituição IX; paridade funcional e e2e atualizados são exigidos pela spec).
**Formato**: `- [ ] T### [P?] [US?] Descrição com caminho`. `W` = `apps/web`. Branch base de trabalho e do PR: `release/v1.0.0`.

## Phase 1: Setup

- [X] T001 Medir a linha de base: `pnpm build:web`, tamanho de `apps/web/out` e tempo de abertura (mesmo método da 025: mediana de 5 execuções) em `specs/026-telas-do-clube-dia-a-dia/baseline.md`
- [X] T002 Rodar `pnpm test` e `pnpm test:e2e` na branch recém-cortada e registrar em `baseline.md` o que já passa (referência de paridade para as três telas)

## Phase 2: Foundational (bloqueia as histórias)

- [X] T003 [P] Teste do `marketRowOf` (igual à linha de `marketRows` para jogador do clube, de outro clube, emprestado e livre; id desconhecido → `undefined`) em `packages/engine/test/market/market-row-of.test.ts`
- [X] T004 Implementar `marketRowOf(context, playerId)` em `packages/engine/src/market/search.ts` (reaproveita `kitOf`/`rowOf`/`freeRow`) e exportá-lo em `packages/engine/src/index.ts`
- [X] T005 [P] Adicionar as chaves de i18n novas (modal do jogador: salário, valor de mercado, contrato, ações; Início: títulos dos blocos novos; Escalação: motivo e jogos restantes em "Fora da relação") em `packages/i18n/locales/pt-BR/ui.json`

**Checkpoint**: helper do motor e textos prontos.

## Phase 3: User Story 1 — Início: próximo jogo e o que resolver antes (P1) 🎯 MVP

**Meta**: cartão do próximo jogo em destaque, avisos acionáveis, resto da tela reorganizado, sem perder função.
**Teste independente**: abrir uma carreira no meio da temporada com proposta de mercado e escalação ajustada; conferir cartão, avisos e ações de jogar.

- [X] T006 [P] [US1] Atualizar/estender `apps/web/test/ui/home.test.tsx`: cartão do próximo jogo (adversário, competição, mando, data, forma recente, ações), avisos com Dispensar, posição e resultados, estado de fim de temporada, sem mais jogos, crise e desempregado
- [X] T007 [US1] Criar `apps/web/src/ui/NextMatchCard.tsx` e `.module.css` (escudo e nome do adversário, competição, mando, data, rodada, `FormChips` (a forma recente aparece também em "Últimos resultados", sem sair de lá), ações Jogar rodada e Simular direto com `data-tip-anchor="play"`, estados de temporada acabada e sem mais jogos)
- [X] T008 [US1] Reorganizar `apps/web/src/app/jogo/page.tsx` e `page.module.css`: ordem próximo jogo → avisos (board, propostas de emprego, mudanças do elenco, mercado, escalação ajustada, crise, cada um com suas ações) → posição e saldo, últimos resultados → torcida → diretoria e metas → manchetes; grade de 3 colunas só acima de 1 200 px
- [X] T009 [US1] Avisos `MarketNotice`, `SquadChangeNotice` e `BoardNotice` alinhados ao visual do `Notice` (borda, tom de informação) pelo CSS, sem mudar ações nem textos; `LineupNotice` já usa `Notice` (025)
- [X] T010 [US1] Barras de torcida e diretoria com os tokens do tema (medidor nativo mantido: acessível e testado), sem mudar os dados

## Phase 4: User Story 2 — Elenco: tabela legível e modal do jogador (P1)

**Meta**: tabela sem coluna de ações, linha clicável, modal com detalhes e as ações Renovar, Vender e Rescindir.
**Teste independente**: abrir o Elenco com 40 jogadores, filtrar, abrir o modal pela linha e pelo teclado e concluir uma venda, uma rescisão e uma renovação.

- [X] T011 [P] [US2] Teste do `PlayerModal` (campos, barras, Renovar/Vender/Rescindir, desativados com motivo, foco devolvido ao fechar, e foco devolvido em dois níveis: cancelar o diálogo de venda por cima do modal volta ao botão do modal) em `apps/web/test/ui/player-modal.test.tsx`
- [X] T012 [P] [US2] Atualizar `apps/web/test/ui/squad.test.tsx`: sem coluna de ações, clique na linha e Enter no botão do nome abrem o modal uma só vez, filtros, Limpar filtros, estado vazio, desempregado
- [X] T013 [P] [US2] Atualizar `apps/web/test/flows/disposal.test.tsx` e `apps/web/test/ui/player-details.test.tsx`/`no-hidden.test.tsx`: abrir o modal pelo nome e usar Vender/Rescindir de dentro dele (os botões do modal mantêm os nomes acessíveis `squad.sellOf` e `squad.terminateOf`, então só muda o caminho até eles) (cotação, multa, mensagem, save gravado)
- [X] T014 [US2] Criar `apps/web/src/ui/PlayerModal.tsx` e `.module.css` sobre `Dialog` (cabeçalho, `Meter` de força e condição, nacionalidade, características, contrato, salário e valor via `marketRowOf(marketContextOf(save), id)` (memoizar o contexto por save e medir o custo de abrir o modal num mundo grande, registrando em `baseline.md`), evolução, estatísticas da temporada, botões Renovar, Vender, Rescindir, Fechar; o texto visível é Renovar/Vender/Rescindir e o nome acessível por jogador reaproveita `squad.sellOf` e `squad.terminateOf`, com `squad.renewOf` novo em `ui.json`)
- [X] T015 [US2] Ligar as ações no `PlayerModal`: Vender e Rescindir abrem o `DisposalDialog` (`apps/web/src/ui/DisposalDialog.tsx`), Renovar abre o `NegotiationDialog` com `{ kind: "renew", row }` (`apps/web/src/ui/market/NegotiationDialog.tsx`); botões desativados com motivo durante rodada ao vivo e em empréstimo; ao cancelar um diálogo aberto por cima, o foco volta ao botão do modal e, ao fechar o modal, ao nome ou à linha de origem; fecha o modal e mostra a mensagem ao concluir
- [X] T016 [US2] O nome do jogador virou `<button aria-haspopup="dialog">` com `stopPropagation` direto na coluna do Elenco; o `DataTable` não precisou mudar (mantém `onRowClick`, Enter/Espaço e `aria-sort`); o `Dialog` ganhou pilha de diálogos (só o do topo responde a Esc e Tab) e `id` único por diálogo
- [X] T017 [US2] Refazer `apps/web/src/app/jogo/elenco/page.tsx` e `page.module.css`: remover a coluna de ações, usar `onRowClick` e o botão do nome abrindo o `PlayerModal`, condição com `Meter`, filtros e Limpar filtros, `EmptyState` para "Nenhum jogador com esses filtros", tabela rolando no próprio quadro
- [X] T018 [US2] Retirar do `PlayerDetails` o que o modal substitui ou deixá-lo só para a Escalação (`apps/web/src/ui/PlayerDetails.tsx`), sem duplicar código

## Phase 5: User Story 3 — Escalação: campo claro e desfalques à parte (P1)

**Meta**: controles, campo, reservas com condição e "Fora da relação" com motivo, mantendo toda a lógica de troca.
**Teste independente**: abrir a Escalação com cansados, lesionados e suspensos; trocar esquema e postura; escalar automaticamente; trocar jogadores só pelo teclado.

- [X] T019 [P] [US3] Estender `apps/web/test/ui/lineup-keyboard.test.tsx`, `lineup-auto.test.tsx` e `lineup-selection.test.ts` aos seletores novos e acrescentar teste de "Fora da relação" com motivo e jogos restantes
- [X] T020 [US3] Reorganizar `apps/web/src/app/jogo/escalacao/page.tsx` e `page.module.css`: barra de controles (Esquema, Postura, Escalar automaticamente, status), aviso de cansados e problemas em `Notice`, campo à esquerda e coluna de Reservas + "Fora da relação" à direita (empilha abaixo de 1 200 px), sem mexer na lógica de seleção e troca
- [X] T021 [P] [US3] Visual novo de `apps/web/src/ui/Pitch.tsx`, `Pitch.module.css`, `LineupList.tsx` e `LineupList.module.css`: posição, nome, posição natural, força e condição com `Meter` nos dois temas (gramado escuro fixo), reservas com condição e vaga livre
- [X] T022 [P] [US3] "Fora da relação" com motivo (lesão, suspensão, pendurado) e jogos restantes em `apps/web/src/ui/LineupList.tsx` e `apps/web/src/ui/PlayerCondition.tsx`
- [X] T023 [P] [US3] `LineupIssues` e `LineupNotice` com o `Notice` e o que fazer (`apps/web/src/ui/LineupIssues.tsx`, `LineupNotice.tsx`); estados de desempregado, temporada acabada e escalação inválida desenhados

## Phase 6: User Story 4 — Teclado, dois temas e dicas (P2)

**Meta**: as três telas usáveis só com o teclado nos dois temas, nas três larguras, com as dicas nos elementos novos.
**Teste independente**: percorrer as três telas só com o teclado em escuro e claro, nas três larguras, e abrir cada uma com as dicas ligadas.

- [X] T024 [P] [US4] Reancorar as dicas em `apps/web/src/ui/tips/catalog.ts` e conferir `data-tip-anchor` no cartão do próximo jogo, no campo e na tabela do Elenco; atualizar `apps/web/test/ui/tips.test.tsx`
- [X] T025 [P] [US4] Estender `apps/web/e2e/layout.spec.ts` com 1 280 px e uma checagem de texto cortado (`scrollWidth > clientWidth` em elementos de texto) nas três telas, nos dois temas; conferir também que, a 1 440 × 900 px, os botões Jogar rodada e Simular direto do Início ficam dentro da janela, sem rolar a página (SC-001)
- [X] T026 [P] [US4] Estender `apps/web/e2e/a11y.spec.ts` com o Elenco com o modal aberto e com a Escalação com "Fora da relação"
- [X] T027 [P] [US4] Estender `apps/web/e2e/keyboard.spec.ts`: Enter no nome abre o modal, Esc fecha e o foco volta ao botão do nome; Vender abre o diálogo por cima, Esc o fecha e o foco volta ao botão Vender do modal; Tab percorre as três telas
- [X] T028 [US4] Atualizar `apps/web/e2e/lineup.spec.ts` (e o e2e de venda, se houver) para os novos elementos
- [X] T029 [US4] Verificar atalhos da 016, ajuda de atalhos e trava de saída nas três telas e corrigir regressões em `apps/web/src/ui/shortcuts.ts` e nas páginas

## Phase 7: Polish & transversais

- [X] T030 Acrescentar à nota única do 1.0.0 os itens das três telas já prontas em `packages/i18n/locales/pt-BR/release-notes.json` (a versão e o `check-release` não mudam); feito antes de T032
- [X] T031 [P] Rodar `pnpm lint` e `pnpm typecheck` e corrigir pendências
- [X] T032 Rodar `pnpm test` e `pnpm test:e2e` completos
- [X] T033 Medir de novo build e tempo de abertura e comparar com `baseline.md` (sem piora relevante)
- [X] T034 Executar a validação manual de `specs/026-telas-do-clube-dia-a-dia/quickstart.md` nos dois temas e nas três larguras
- [X] T035 Abrir PR com `--base release/v1.0.0` (nota do 1.0.0 atualizada no mesmo PR; versão inalterada)

## Dependências

- Setup → Foundational → histórias. US1, US2 e US3 são independentes entre si após a Phase 2 e podem andar em paralelo.
- T014 depende de T004 (`marketRowOf`) e T005 (textos); T015 depende de T014; T017 depende de T014–T016; T018 depende de T017.
- T008 depende de T007; T009 e T010 podem ocorrer após T008.
- US4 depende de US1–US3 prontas (T024–T029); T030 (nota) fica no Polimento, para refletir o que entrou.

## Execução paralela (exemplos)

- Phase 2: T003 e T005 em paralelo; T004 após T003.
- US2: T011, T012 e T013 (testes) em paralelo; depois T014/T016.
- US3: T019, T021, T022 e T023 em paralelo (arquivos distintos), T020 ao final.
- US4: T024–T027 em paralelo.

## Estratégia

MVP = Setup + Foundational + US1 (Início novo funcionando). Depois US2 (Elenco e modal) e US3 (Escalação), por fim US4 (teclado, larguras, dicas) e o polimento. Um PR único para `release/v1.0.0`, com commits por história.
