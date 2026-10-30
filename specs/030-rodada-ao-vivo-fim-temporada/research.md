# Pesquisa: Rodada ao vivo e fim de temporada

Verificação do código e dos dados que a 030 consome. Nenhum item ficou como "NEEDS CLARIFICATION".

## R1 — Estrutura da rodada ao vivo

- **Verificação**: hoje a página monta, em ordem, a barra de controle, um anúncio escondido, o painel do time (só com a rodada pausada), o aviso de prorrogação, os pênaltis, as estatísticas, a grade (meu jogo grande e os outros em cartões) e dois feeds ("Lances do meu jogo" e "Lances da rodada").
- **Decisão**: três faixas. (1) Controle: sair, velocidade, pausar e retomar, terminar agora, pausa automática, com a barra de andamento logo abaixo. (2) Cartão do jogo: o placar de transmissão. (3) Corpo em duas colunas: à esquerda a linha do tempo do meu jogo, as estatísticas e (se houver) os pênaltis; à direita o painel Meu time quando a rodada pausa e, sempre, a lista dos outros jogos. O feed "Lances da rodada" sai (spec FR-003).
- **Racional**: o placar, o minuto e o estado ficam no alto, sem rolagem em 1 440 × 900; o painel só existe com a rodada pausada, como hoje (paridade), e a coluna da direita muda de conteúdo em vez de saltar o layout.
- **Alternativas**: painel sempre visível (decisões com o relógio correndo, regra nova); feed único misturado (o pedido tira "lances da rodada").

## R2 — Estado, minuto e progresso da partida

- **Verificação**: `clockText(state)` já traduz `status` (`not_started`, `half_time`, `extra_half_time`, `penalties`, `finished`, `abandoned`) e o relógio (`clock.minute`, `stoppage`). O motor avança em ~98 passos por rodada.
- **Decisão**: `liveView.progress(match)` devolve o minuto corrido e o total (90, ou 120 na prorrogação); a barra de andamento usa o `Meter` (025) com o rótulo "Andamento da partida" e o texto do relógio, e o intervalo é um marco em 45' (50% da barra) escrito no rótulo ("Intervalo aos 45'"). `liveView.phaseOf(match)` devolve `live`, `halftime`, `extraTime`, `penalties` ou `finished`, cada um com texto e símbolo; `extra_half_time` (intervalo da prorrogação) vira `halftime` e `abandoned` vira `finished`, como `clockText` já faz.
- **Racional**: reaproveita o que o motor já expõe; o estado nunca depende só de cor.

## R3 — Fase, grupo, mando e clássico do meu jogo

- **Verificação**: `LiveMatch.fixture` é o `Fixture` do motor: leva `round`, `tie` (fase e perna das copas), `neutral` e `stage` (fase e grupo das divisões em fases), mas **não** `stageRound` nem `competitionId` (a rodada ao vivo tem `competitionId` e cada partida tem `divisionLevel`). `phaseLabel(save, competitionId, round)` (028) dá o nome da fase e da perna nas copas; `stageLabel` (027) exige `stageRound`, que a partida ao vivo não traz; `DerbyBadge` e `rivalries` do banco dão o clássico.
- **Decisão**: o cartão do jogo mostra a competição (da rodada ao vivo), a fase (copa: `phaseLabel`; divisão em fases: "Grupo B" a partir de `stage.group`, ou a fase de liga, sem inventar a rodada da fase) e nada se não houver fase. Mostra "Em casa" ou "Fora" para o clube do jogador e "Campo neutro" quando `neutral`. A etiqueta de clássico usa o `DerbyBadge` de hoje.
- **Racional**: junta só o que existe; a rodada da fase não é derivada na tela para não criar um dado que o motor não dá.

## R4 — Linha do tempo do meu jogo, expulsos e teto de lances

- **Verificação**: `useLiveRound` guarda no estado **todos** os lances de todos os jogos (`feed` cresce a cada passo, em ordem inversa) e a tela renderiza as duas listas sem teto. Numa rodada de 10 jogos em velocidade rápida isso passa de mil itens. `eventText` narra cada evento por `formatEvent`.
- **Decisão**: o estado guarda no máximo 200 lances (os mais novos); a linha do tempo mostra os do meu jogo (até 60, rolando num quadro com nome e foco por teclado), com o minuto e o texto narrado. Os expulsos de cada time saem dos eventos `red_card` do meu jogo (nome e minuto). Não há feed dos outros jogos: eles aparecem só na lista (R5).
- **Racional**: cumpre "a lista de lances não cresce sem limite na tela" e tira o custo de renderizar centenas de itens a cada passo; o jogo guarda os eventos completos no `state.events` de cada partida, então nada se perde (o resumo e o histórico usam o motor, não o feed).
- **Alternativas**: virtualizar a lista (dependência e complexidade sem ganho com 60 itens).

## R5 — Outros jogos em lista de uma linha por jogo

- **Verificação**: hoje cada outro jogo é um cartão (`MatchCard`) com escudos, nomes curtos, placar e relógio; o gol recente não é destacado.
- **Decisão**: `OtherMatches` é uma lista (`ul`), uma linha por jogo: competição, minuto, escudo e nome do mandante, placar, escudo e nome do visitante. O gol recente (nos últimos passos) marca o placar com negrito, o texto "gol" e um símbolo, e a marca some depois de 5 passos do relógio. Só os jogos da divisão do jogador aparecem, como hoje (research 007 R2). Cada linha é um `React.memo` que só re-renderiza quando o placar, o minuto ou o estado dele muda.
- **Racional**: leitura rápida de 9 jogos; a memoização é o que sustenta a velocidade rápida (R9).

## R6 — Painel Meu time

- **Verificação**: `SubstitutionPanel` já faz tudo: esquema, postura, substituições usadas e o limite (`substitutionCap`), titulares e reservas com condição (`FitnessMeter`), cartões com texto, "Já saíram", substituto pendente (`team.pending` com o motivo lesão ou goleiro expulso), troca de posição em dois passos (sem gastar substituição), e as mensagens de erro por código (`round.error.change.*`). Ele abre só com a rodada pausada.
- **Decisão**: manter a lógica e os textos; refazer só a forma (cartões, `Meter`/`Badge` da 025). Acrescentar (a) o aviso de substituto obrigatório em `Notice` no alto do painel quando há `team.pending`, (b) a confirmação de cada mudança num `role="status"` (já existe) e (c) o foco: ao abrir o painel (pausa) o foco vai ao primeiro item pendente, se houver, ou ao título do painel; ao retomar, volta ao botão de retomar.
- **Racional**: paridade e menos risco; o critério de teclado (SC-001) se cumpre porque o painel já usa botões nativos, e o e2e passa a provar isso.

## R7 — Anúncios para leitor de tela

- **Verificação**: a tela anuncia **um** lance por atualização (`find` devolve o mais novo do meu jogo entre `shot` com gol, `red_card`, `injury` e `shootout_kick`); vários lances no mesmo passo (rápido) perdem os anteriores; o intervalo não é anunciado.
- **Decisão**: `liveView.announcements(items)` devolve, em ordem, **todos** os lances do meu jogo do lote que merecem anúncio: gol, expulsão, lesão, intervalo (`half_time`), fim de jogo, prorrogação e cobrança de pênalti (mantém a paridade). O texto do lote entra numa região `aria-live="polite"` escondida; os lances de outros jogos nunca entram.
- **Racional**: SC e FR-024; o conjunto é uma função pura testável.

## R8 — Saída com confirmação em diálogo

- **Verificação**: `leave-guard.ts` guarda uma mensagem e `confirmLeave()` chama `confirm` do navegador, de forma síncrona, em `Sidebar`, `FocusScreen`, `GameLayout` e `GlobalShortcuts`; a rodada também registra `beforeunload`.
- **Decisão**: Sair (da barra de controle) e Voltar (da moldura de foco) passam pelo mesmo `requestLeave` e abrem o mesmo diálogo. `leave-guard` passa a ter um "abridor" registrado pela rodada: `requestLeave(proceed)` devolve `true` se não há guarda (segue na hora) e, com guarda, abre o `Dialog` ("A rodada em andamento será perdida", Sair e Continuar na rodada) e só chama `proceed` quando o jogador confirma. Os quatro pontos de chamada passam a `event.preventDefault()` e `requestLeave(() => router.push(href))`. O foco vai a "Continuar na rodada" ao abrir e volta ao controle de origem ao cancelar; Esc cancela. O `beforeunload` nativo continua para fechar a aba.
- **Racional**: FR-014 pede diálogo; a mudança é pequena e mantém a regra (confirmar sai, cancelar volta).
- **Alternativas**: manter o `confirm` (não é diálogo e não dá para testar o foco).

## R9 — Desempenho da rodada de 10 jogos

- **Verificação**: a rodada avança por `advanceRound(live, n)` (até 5 passos por atualização) e troca o `LiveRound` inteiro a cada atualização; hoje a tela re-renderiza tudo e o feed cresce.
- **Decisão**: (a) o teto de lances (R4); (b) `React.memo` nas linhas dos outros jogos e no cartão do jogo, comparando só placar, minuto e estado; (c) o anúncio e o feed calculados uma vez por lote, no hook; (d) uma medição: um teste de Vitest roda 10 jogos em velocidade rápida até o fim e mede o tempo médio de cada atualização do hook (limite de 50 ms por atualização, folga sobre um quadro de 16 ms por causa do ambiente de teste) e um e2e roda a rodada de 10 jogos em velocidade rápida com um `PerformanceObserver` de `longtask` e confere que nenhuma tarefa passa de 200 ms e que a página responde (Pausar clicável) durante a rodada (SC-002).
- **Racional**: o custo vem de renderizar listas grandes, não do motor; o teto e a memoização atacam isso.

## R10 — Dados do resumo da temporada

- **Verificação** (a pedido do pedido original, FR-022):
  - Resultado do clube: `seasonEndSummary` dá a situação (campeão, acesso, rebaixamento, permanência), a posição e o prêmio; a linha da classificação (`standings`) tem pontos, jogos, vitórias, empates, derrotas, gols pró e contra e saldo.
  - **Premiação**: a da liga é calculada por `prizeFor` e **só é lançada na virada** (`payPrizes`), então na tela de fim de temporada ela é "a receber"; os prêmios de copas, continentais e estaduais já estão no extrato (`ledger`, categoria `prize`, com `competitionId` e data), como a `PrizeStatement` (028) lê.
  - **Resultado por competição**: a copa guarda a fase alcançada por clube (`cupEntry(...).reached`); as metas continental e estadual têm a fase alcançada e o resultado na avaliação da diretoria (`evaluation.continental` e `evaluation.regional`); a liga tem a posição.
  - Avaliação da diretoria: `save.board.evaluation` (metas, confiança final, decisão, reputação antes e depois, conquistas).
  - Campeões: `seasonEndSummary.champions` (campeão e pontos por divisão, com o aviso de fases); subidas e descidas: `seasonEndSummary.moves` (do `nextComposition`).
- **Decisão**: `seasonView.campaign(save)` monta uma linha por competição em que o clube tem dado (liga sempre; cada copa, continental ou estadual em que há fase alcançada ou prêmio), com resultado em texto e a premiação (a da liga marcada "paga ao iniciar a próxima temporada"), e o total. Competição sem nenhum dado não aparece. Num clube sem clube (demitido) só entra o que existir.
- **Racional**: usa só o que o jogo tem, como o pedido manda; deixa explícito o que ainda não foi pago.
- **A verificar na implementação**: o momento de lançamento de cada tipo de prêmio (copa, continental, estadual) foi confirmado só para as copas (lançadas na hora, com data e competição) e para a liga (na virada); T007 cobre os demais com fixtures, e um prêmio que não esteja no extrato fica sem valor na linha, sem erro.

## R11 — Estrutura do fim de temporada

- **Decisão**: ordem: (1) cabeçalho com "Temporada X encerrada" e o botão Próxima temporada na mesma linha (`preparando` e falha logo abaixo); (2) o resultado do clube em `Card` com `Badge` da situação e a linha de números; (3) "Como foi a sua temporada": campanha por competição + total, e a avaliação da diretoria (reaproveita `Evaluation`, em `Card`); (4) "Campeões das ligas nacionais"; (5) "Acesso e rebaixamento"; (6) as demais competições (`OtherCompetitions`, `CupResult`, `QualificationSummary`, `FinalPositions`) mantidas, em `details` recolhidos, para não perder dado; (7) a classificação final da divisão do clube em `details` recolhido; (8) rodapé com Ver o histórico e Próxima temporada.
- **Racional**: hierarquia clara e paridade; o botão no topo e no fim evita a rolagem para continuar.

## R12 — Fim da rodada, medição e nota

- **Decisão**: `RoundEnd` mantém os resultados, o resumo do meu jogo e os links, com as ações em `Button`/`Link` na ordem Ver classificação, Voltar ao início (ou Ver o resumo da temporada na última rodada). Medir abertura da rodada e do fim de temporada antes e depois, com a tolerância de 10% usada na 029; acrescentar o item "Nova interface, sexta parte" à nota única do 1.0.0; a versão não muda.
