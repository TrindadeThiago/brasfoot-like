# Tasks: Rodada ao vivo e fim de temporada

**Input**: `specs/030-rodada-ao-vivo-fim-temporada/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)
**Tests**: incluídos (constituição IX; a spec exige o critério de teclado, desempenho e o e2e de rodada atualizado).
**Formato**: `- [ ] T### [P?] [US?] Descrição com caminho`. `W` = `apps/web`. Base de trabalho e do PR: `release/v1.0.0`.

**Lições das features anteriores (valem aqui):** `useSearchParams` só dentro do filho de `GameLayout` (Suspense); `aria-label` que não contém o texto visível reprova no axe (`label-content-name-mismatch`); texto só para leitor de tela (`visually-hidden`) precisa de ancestral `position: relative` dentro de quadros que rolam; chave de i18n sem uso derruba `test/i18n/no-literals.test.ts`; props opcionais precisam de `| undefined` (`exactOptionalPropertyTypes`); testes pesados com timeout explícito; dado de teste tem de passar na validação de load do save; clicar fora de um diálogo de consulta só fecha com `dismissOnBackdrop`; nos e2e de teclado, esperar cada diálogo fechar antes do próximo Esc; `getByRole("heading", {name: clube})` não pode achar mais de um título, então manchetes e lances não usam `h2` e `h3` para frases com nome de clube; a suíte completa de unidade roda a partir da **raiz** (`pnpm exec vitest run`); testes que importam de outro arquivo de teste registram os testes dele de novo, então os helpers ficam em `W/test/helpers/`.

**Chaves de i18n:** cada história acrescenta as suas em `packages/i18n/locales/pt-BR/ui.json` junto com o componente que as usa (o `no-literals` derruba chave sem uso, então não há tarefa de chaves adiantada); chave antiga que fica sem uso é removida na mesma tarefa.

**Componentes compartilhados (R13 da 029 vale de novo):** `RoundResults` também aparece na Início; `MatchSummary` na Competição e no Calendário; `ShootoutPanel` dentro de `MatchSummary`; `SeasonSummary`, `Evaluation`, `OtherCompetitions`, `CupResult` e `QualificationSummary` só no fim de temporada, mas `goalTierText` e `financeGoalText` vêm de `ui/board/GoalsList.tsx` (029). Cada refação mantém os nomes exportados e as assinaturas, e conferir `W/test/ui/home.test.tsx`, `match-summary.test.tsx` e `round-results.test.tsx`.

## Phase 1: Setup

- [X] T001 Medir a linha de base: `pnpm build:web`, tamanho de `W/out`, tempo de abertura da rodada ao vivo (mediana de 5 aberturas, método fixo do Playwright da 029) e do fim de temporada, e o tempo médio de cada atualização do hook `useLiveRound` numa rodada de 10 jogos em velocidade rápida (Vitest, `advanceRound` em passos de até 5, mediana de 5 execuções) em `specs/030-rodada-ao-vivo-fim-temporada/baseline.md`
- [X] T002 Listar em `baseline.md` os testes que tocam as duas telas (`W/test/flows/live-round.test.tsx`, `substitutions.test.tsx`, `full-season.test.tsx`, `cup-shootout.test.tsx`, `W/test/ui/live-keyboard.test.tsx`, `substitution-limit.test.tsx`, `match-summary.test.tsx`, `round-results.test.tsx`; e2e `live-round`, `full-season`, `cup`, `keyboard`, `a11y`, `layout`) e montar a **tabela de paridade** (FR-026): cada dado, ação, aviso e mensagem de erro das telas de hoje (relógio, velocidade, pausa, terminar agora, pausa automática, atalhos, aviso de prorrogação, pênaltis, estatísticas ao vivo, lances do meu jogo, **lances da rodada (único item retirado por decisão do pedido, FR-003 e FR-026: a linha "onde fica agora" diz "retirado")**, outros jogos, painel do time com esquema, postura, limite, condição, cartões, "Já saíram", substituto pendente, troca de posição, mensagens `round.error.*`, confirmação de saída e `beforeunload`, fim da rodada com os links das outras divisões e o resumo do jogo, fim de temporada com situação, premiação, campeões, subidas e descidas, classificações de fases, outras competições, qualificações, copas, avaliação da diretoria, links das divisões) com a coluna "onde fica agora", conferida em T038

## Phase 2: Foundational (bloqueia as histórias)

- [X] T003 [P] Testes de `live-view` (progresso e total de 90 e de 120 na prorrogação; estado em `live`, `halftime`, `extraTime`, `penalties` e `finished`; expulsos do meu jogo com nome e minuto; anúncios: todos os lances elegíveis do lote em ordem, nenhum de outro jogo, intervalo e fim incluídos, sem repetição; linhas dos outros jogos só da divisão do jogador; `extra_half_time` conta como intervalo e `abandoned` como fim; gol recente que expira depois de 5 passos do relógio) em `W/test/game/live-view.test.ts`
- [X] T004 Implementar `W/src/game/live-view.ts` (puro; `progressOf`, `phaseOf`, `sentOffOf`, `announcementsOf`, `otherMatchRows`, `recentGoal`; reaproveita `clockText`, `eventText` e o `matchOf` do motor, sem regra nova)
- [X] T005 [P] Testes do hook em `W/test/game/live-feed.test.ts`: o estado guarda no máximo 200 lances e descarta os mais antigos; `state.events` de cada partida fica inteiro; a mesma seed e as mesmas decisões dão a mesma partida com o feed limitado e com um feed sem teto (FR-025, constituição II); um lote com vários lances do meu jogo devolve todos para anúncio
- [X] T006 Atualizar `W/src/game/useLiveRound.ts`: teto de 200 lances no estado, devolver as `announcements` do lote (de `live-view`) e o último gol por jogo (`recentGoal`); sem mudar o motor nem `TICK_MS`
- [X] T007 [P] Testes de `season-view` (campanha: uma linha por competição com dado, liga sempre, copa por `cupEntry.reached`, continental e estadual por `evaluation`, premiação por `ledger` com `competitionId`, liga marcada como a pagar, competição sem dado não entra, total somando as linhas, clube desempregado só com o que existir; o momento de lançamento de cada tipo de prêmio (copa e continental na hora, liga na virada) e um prêmio ausente do extrato que fica sem valor, sem erro; `ClubResult` com pontos, jogos, vitórias, empates, derrotas, gols pró e contra e saldo) em `W/test/game/season-view.test.ts`
- [X] T008 Implementar `W/src/game/season-view.ts` (puro; `clubResult`, `campaign`; reaproveita `seasonEndSummary`, `standings`, `cupEntry`, `prizeFor` e o extrato, sem regra nova)
- [X] T009 [P] Helpers de teste da rodada ao vivo em `W/test/helpers/live-round.ts` (carreira armazenada com uma rodada ao vivo pronta, partida com lesão e com goleiro expulso, partida de copa que vai a pênaltis, rodada de 10 jogos); usados pelas histórias US1, US2, US3, US4 e US7

**Checkpoint**: derivações testadas, hook com teto e anúncio por lote, helpers de teste prontos.

## Phase 3: User Story 1 — Acompanhar o meu jogo como numa transmissão (P1) 🎯 MVP

**Meta**: o placar do meu jogo em destaque, o andamento visível e os outros jogos em lista.
**Teste independente**: iniciar uma rodada ao vivo e conferir placar, estado, minuto, linha do tempo, estatísticas e os outros jogos, sem rolagem em 1 440 × 900.

- [X] T010 [P] [US1] Testes da tela (cartão do jogo com escudos, nomes, "Em casa" ou "Fora", competição, fase ou grupo, placar grande e estado em texto e símbolo; etiqueta de clássico; expulsos de cada time com nome e minuto; linha do tempo só com lances do meu jogo, no máximo 60 e sem "lances da rodada"; estatísticas comparativas; outros jogos em lista de uma linha com competição, minuto, escudos, nomes e placar; gol recente com texto e símbolo; barra de andamento com o intervalo escrito) em `W/test/ui/live-screen.test.tsx`
- [X] T011 [P] [US1] Criar `W/src/ui/live/ProgressBar.tsx` (barra com `Meter` da 025, texto do relógio, marco do intervalo escrito) e `W/src/ui/live/MatchScoreboard.tsx` (`React.memo` por placar, minuto e estado; escudos, nomes, mando, competição, fase ou grupo, placar grande, `Badge` do estado com símbolo, `DerbyBadge`, expulsos) com `MatchScoreboard.module.css` e `ProgressBar.module.css` (um CSS por componente, para as tarefas paralelas não colidirem) e as chaves de i18n do cartão, do mando, do andamento e do intervalo
- [X] T012 [P] [US1] Criar `W/src/ui/live/OtherMatches.tsx` (lista `ul`, uma linha por jogo, cada linha em `React.memo`; o gol recente em negrito com o texto "gol" e o símbolo) e refazer `W/src/ui/EventFeed.tsx` como linha do tempo do meu jogo (até 60 itens, quadro com nome e `tabIndex={0}`, texto narrado); refazer `W/src/ui/LiveStats.tsx` na linguagem nova mantendo os dados; `OtherMatches.module.css` próprio e as chaves de i18n da lista, do gol recente e da linha do tempo
- [X] T013 [US1] Refazer `W/src/app/jogo/rodada/page.tsx` (`LiveRoundView`): no alto o `ProgressBar` e a barra de controle **de hoje, inline** (o `ControlBar` só nasce em T020 e a substitui), cartão do jogo, corpo em duas colunas (linha do tempo e estatísticas à esquerda; outros jogos à direita), sem o feed "Lances da rodada"; apagar `W/src/ui/LiveGrid.tsx` quando nada mais o usar; manter o `data-tip-anchor="round-controls"` na barra de controle

**Checkpoint**: o meu jogo com cara de transmissão; as demais histórias ligam seus pedaços nesta página.

## Phase 4: User Story 2 — Meu time: substituir, trocar a posição e responder a lesão ou expulsão (P1)

**Meta**: o painel Meu time na linguagem nova, com o aviso de substituto obrigatório e o foco com critério.
**Teste independente**: com a rodada pausada, substituir um lesionado, trocar a posição de dois jogadores e responder a um goleiro expulso, só com o teclado.

- [X] T014 [P] [US2] Testes do painel (esquema, postura, substituições usadas e o limite; titulares e reservas com condição, cartões e lesão em texto; "Já saíram"; substituição e troca de posição confirmadas em texto; a troca não gasta substituição; mensagens de erro por causa: limite, jogador indisponível, esquema inválido; `Notice` de substituto obrigatório com lesão e com goleiro expulso; foco ao abrir e ao retomar) em `W/test/ui/live-team.test.tsx` e atualizar `W/test/flows/substitutions.test.tsx`, `W/test/ui/substitution-limit.test.tsx` e `W/test/ui/live-keyboard.test.tsx`
- [X] T015 [US2] Refazer `W/src/ui/SubstitutionPanel.tsx` e `SubstitutionPanel.module.css` na linguagem nova mantendo a lógica, as props e todos os textos `round.*`; `Notice tone="warning"` no alto quando há `team.pending`, com o motivo e o que fazer; `Meter` e `Badge` da 025 onde couber, sem depender só da cor; as chaves do aviso, dos estados e das confirmações
- [X] T016 [US2] Ligar o painel na coluna da direita da rodada (`W/src/app/jogo/rodada/page.tsx`) quando a rodada pausa, com o foco indo ao primeiro item pendente (ou ao título do painel) e voltando ao botão Retomar ao retomar; a pausa automática em lesão ou expulsão abre o painel com o aviso

## Phase 5: User Story 3 — Controle, saída e confirmação (P1)

**Meta**: barra de controle completa e saída com confirmação num diálogo.
**Teste independente**: mudar velocidade, pausar, retomar, terminar agora, e tentar sair no meio por cada caminho.

- [X] T017 [P] [US3] Testes do controle e da saída (barra com sair, velocidade, pausar e retomar, terminar agora e pausa automática; estado e velocidade escritos; atalhos de hoje; diálogo "A rodada em andamento será perdida" aberto por Sair, pelo Voltar, pela barra lateral e por atalho; Continuar na rodada com o foco inicial; Esc cancela e devolve o foco ao controle de origem; confirmar sai; sem guarda, segue direto) em `W/test/ui/live-controls.test.tsx` e testes do guarda assíncrono em `W/test/ui/leave-guard.test.tsx`
- [X] T018 [US3] Reescrever `W/src/ui/leave-guard.ts` (abridor registrado pela rodada; `requestLeave(proceed)` devolve `true` sem guarda e, com guarda, abre o diálogo e só chama `proceed` na confirmação; `beforeunload` continua) e criar `W/src/ui/live/LeaveDialog.tsx` sobre `Dialog` (foco inicial em Continuar na rodada, Esc cancela, foco devolvido; as chaves do diálogo)
- [X] T019 [US3] Trocar `confirmLeave()` por `requestLeave` (com `event.preventDefault()` e a navegação dentro do `proceed`) em `W/src/ui/shell/Sidebar.tsx`, `W/src/ui/shell/FocusScreen.tsx`, `W/src/game/GameLayout.tsx` e `W/src/ui/GlobalShortcuts.tsx`; conferir os testes que cobrem a navegação
- [X] T020 [P] [US3] Criar `W/src/ui/live/ControlBar.tsx` (Sair, velocidade, Pausar e Retomar, Terminar agora, pausa automática; estado escrito; `useShortcuts` de hoje) e ligar na rodada com o `LeaveDialog`; Sair (da barra) e Voltar (da moldura de foco) passam pelo mesmo `requestLeave` e abrem o mesmo diálogo; as chaves da barra; manter a dica de primeiro acesso `round-controls` (`W/src/ui/tips/catalog.ts`, `W/test/ui/tips.test.tsx`)

## Phase 6: User Story 6 — Fim de temporada (P1)

**Meta**: o resumo da temporada com hierarquia, o botão no título e as seções pedidas.
**Teste independente**: terminar a temporada e conferir cada seção e o botão no topo e no fim.

- [X] T021 [P] [US6] Testes do fim de temporada (título "Temporada X encerrada" com o botão na mesma linha; "preparando" e falha logo abaixo; resultado do clube com situação em texto e símbolo e os números; "Como foi a sua temporada" com campanha por competição, total e avaliação da diretoria; "Campeões das ligas nacionais" com a divisão do clube destacada em texto; "Acesso e rebaixamento" com o clube destacado; classificação final recolhida; Ver o histórico e Próxima temporada no rodapé; sem seção vazia; desempregado) em `W/test/ui/season-end.test.tsx`
- [X] T022 [P] [US6] Criar `W/src/ui/season/SeasonHeader.tsx` (título e botão na mesma linha, estados `idle`, `busy`, `failed` com o aviso abaixo) e `ClubResult.tsx` (`Card` com `Badge` da situação e os números), cada um com o seu `.module.css` e as chaves do cabeçalho e do resultado
- [X] T023 [P] [US6] Criar `W/src/ui/season/Campaign.tsx` (linhas da campanha e o total, com a nota "paga ao iniciar a próxima temporada" na liga, e a avaliação da diretoria reaproveitando `W/src/ui/board/Evaluation.tsx` em `Card`) e `Champions.tsx`, `Moves.tsx` (a partir de `SeasonSummary.tsx`, com `aria-current` e texto no clube do jogador), cada um com o seu `.module.css` e as chaves da campanha, do total, de "a pagar" e das seções
- [X] T024 [US6] Criar `W/src/ui/season/FinalTable.tsx` (classificação final da divisão do clube em `details` recolhido) e refazer `W/src/app/jogo/fim-de-temporada/page.tsx` na ordem de R11 (cabeçalho, resultado, campanha, campeões, acesso e rebaixamento, demais competições recolhidas com `OtherCompetitions`, `CupResult`, `QualificationSummary` e `FinalPositions`, classificação, rodapé); manter o atalho `next-season` e o estado desempregado; ajustar `W/src/ui/SeasonSummary.tsx` ou removê-lo quando nada mais o usar

## Phase 7: User Story 4 — Prorrogação e pênaltis (P2)

**Meta**: prorrogação e cobranças de pênalti legíveis, também no resumo do jogo.
**Teste independente**: jogar uma partida de copa que vá a pênaltis.

- [X] T025 [P] [US4] Testes (estado "prorrogação" no cartão e o aviso; cobranças de cada time convertidas e perdidas em texto e símbolo; placar da série; resultado final; o mesmo `ShootoutPanel` no resumo do jogo) em `W/test/ui/live-shootout.test.tsx` e atualizar `W/test/flows/cup-shootout.test.tsx`
- [X] T026 [US4] Refazer `W/src/ui/cup/ShootoutPanel.tsx` e `ShootoutPanel.module.css` mantendo as props (usado por `MatchSummary` e pela rodada); aviso de prorrogação em `Notice`; as chaves novas; ligar na rodada

## Phase 8: User Story 5 — Fim da rodada (P2)

**Meta**: o fim da rodada leva direto ao próximo passo.
**Teste independente**: terminar uma rodada comum e a última rodada da temporada.

- [X] T027 [P] [US5] Testes (resultados da rodada, resumo do meu jogo, Ver classificação, Voltar ao início e, na última rodada, Ver o resumo da temporada; links das outras divisões) em `W/test/ui/live-round-end.test.tsx` e atualizar `W/test/ui/round-results.test.tsx` e `W/test/ui/match-summary.test.tsx`
- [X] T028 [US5] Refazer o `RoundEnd` em `W/src/app/jogo/rodada/page.tsx` com as ações em `Button`/`Link` na ordem pedida e a lista de resultados na linguagem nova (`W/src/ui/RoundResults.tsx`, mantendo as props e o uso na Início) e as chaves das ações; conferir `W/test/ui/home.test.tsx`

## Phase 9: User Story 7 — Desempenho e anúncios (P2)

**Meta**: dez jogos em velocidade rápida sem travar e anúncios de leitor de tela do meu jogo.
**Teste independente**: rodar 10 jogos em velocidade rápida e acompanhar com leitor de tela.

- [X] T029 [P] [US7] Testes de desempenho (rodada de 10 jogos em velocidade rápida até o fim sem erro; o tempo médio de cada atualização do hook fica abaixo de 50 ms (o teto de 200 ms por tarefa é medido no e2e, T034); o número de itens renderizados nas listas tem teto fixo; as linhas dos outros jogos não re-renderizam sem mudança) em `W/test/ui/live-perf.test.tsx`
- [X] T030 [P] [US7] Testes dos anúncios (região `aria-live="polite"` escondida com gol, expulsão, lesão, intervalo, fim, prorrogação e cobrança de pênalti do meu jogo; nenhum lance de outro jogo; vários lances no mesmo passo anunciados todos, em ordem) em `W/test/ui/live-announce.test.tsx`
- [X] T031 [US7] Ligar o anúncio por lote na rodada (`W/src/app/jogo/rodada/page.tsx`) a partir das `announcements` do hook, no lugar do `useMemo` que anuncia só um lance, com as chaves dos anúncios; conferir que o foco só se move quando um diálogo ou aviso abre

## Phase 10: Polish e entrega

- [X] T032 Atualizar `W/e2e/live-round.spec.ts`: o fluxo de hoje na tela nova; **pênaltis** (copa empatada até as cobranças) e a **confirmação de saída** (Sair abre o diálogo, cancelar volta, confirmar sai)
- [X] T033 [P] Novo e2e só com o teclado em `W/e2e/live-round.spec.ts` ou `W/e2e/keyboard.spec.ts`: substituir um jogador lesionado, trocar a posição de dois jogadores e responder a um goleiro expulso (critério de aceite 1)
- [X] T034 [P] Novo e2e de uma rodada de 10 jogos em velocidade rápida até o fim (sem erro; "Pausar" continua clicável durante a rodada; um `PerformanceObserver` de `longtask` confirma que nenhuma tarefa passa de 200 ms, SC-002) e atualizar `W/e2e/full-season.spec.ts` para a tela de fim de temporada nova (botão no título, seções, Próxima temporada)
- [X] T035 [P] Estender `W/e2e/layout.spec.ts` (rodada ao vivo e fim de temporada, sem rolagem horizontal em 1 440, 1 280 e 1 024 px, sem texto cortado, e placar, minuto e estado do meu jogo dentro de 900 px), `W/e2e/a11y.spec.ts` (rodada em andamento, com o painel aberto e com o diálogo de saída, e o fim de temporada, nos dois temas) e `W/e2e/keyboard.spec.ts` (foco visível e o foco devolvido ao fechar o diálogo)
- [X] T036 [P] Conferir que estado, gol recente, cobrança e meta não dependem só da cor, nos dois temas (verificação por Playwright dos textos e símbolos); o contraste 016 fica no axe de T035 e em `W/test/ui/contrast.test.ts` com os tokens novos
- [X] T037 [P] Acrescentar o item "Nova interface, sexta parte" à nota única do 1.0.0 em `packages/i18n/locales/pt-BR/release-notes.json` (a versão não muda; `docs/interface-nova.md` §6) e conferir `docs/interface-nova.md` §4
- [X] T038 Rodar `pnpm exec biome check`, `pnpm -r typecheck`, a suíte completa de unidade (a partir da raiz) e o e2e completo; medir de novo build, abertura da rodada e do fim de temporada e o tempo por atualização, e comparar com `baseline.md` (tolerância: mediana até 10% acima, ou se explica); validar o `quickstart.md` à mão (nos dois temas e nas três larguras) e conferir a tabela de paridade de T002
- [X] T039 Abrir o PR com `--base release/v1.0.0` (nota do 1.0.0 atualizada no mesmo PR; versão inalterada) e acompanhar o CI

## Dependências e ordem

- **Phase 1 → Phase 2 → histórias**: as derivações (T004, T006, T008) e os helpers de teste (T009) bloqueiam as histórias.
- **US1 cria a estrutura** da página da rodada (T013); **US2, US3, US4, US5 e US7** ligam seus pedaços nela, então vêm depois de US1.
- **US6 (fim de temporada)** só depende da fundação (T007 e T008) e pode andar em paralelo com a rodada.
- **US3** toca quatro arquivos fora da rodada (`Sidebar`, `FocusScreen`, `GameLayout`, `GlobalShortcuts`): fazê-la em sequência, não em paralelo com outra mudança neles.
- **Polish** vem depois de todas as histórias.

## Paralelismo

- **Fundação**: T003, T005, T007 e T009 em paralelo; cada implementação depois do seu teste.
- **US1**: T010, T011 e T012 em paralelo; T013 depois dos três.
- **US6**: T021, T022 e T023 em paralelo; T024 depois.
- **US6 em paralelo com a rodada** (US1 a US5 e US7): arquivos disjuntos.
- **Polish**: T033 a T037 em paralelo.

## Estratégia de implementação

- **MVP**: Phase 1, Phase 2, US1 e US3 (placar de transmissão, controle e saída com diálogo).
- **Entrega incremental**: US2 (decisões durante o jogo, o critério de teclado) e US6 (fim de temporada) em seguida; US4, US5 e US7 completam a paridade e o desempenho; Polish fecha.
- **Regra de ouro**: nenhuma regra, evento de partida ou dado do save muda; a mesma seed e as mesmas decisões dão a mesma partida; cada tela refeita é conferida contra a lista de paridade antes de sair.
