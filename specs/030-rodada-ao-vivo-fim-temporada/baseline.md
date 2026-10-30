# Linha de base (início da 030, `release/v1.0.0` com a 025 a 029)

Medida em 2026-10-29, antes de qualquer mudança de código da 030.

- `apps/web/out`: 4,2 MB (JS 1 787 234 bytes; CSS 67 259 bytes; precache de 182 arquivos)
- Tempo de abertura (Playwright, mundo clássico de 20 clubes, mediana de 5): rodada ao vivo 67 ms (61 a 75), do clique em Jogar rodada até o cartão "Meu jogo" visível; fim de temporada 151 ms (147 a 157)
- Motor numa rodada de 10 jogos em passos de 5 (Vitest, mediana de 5 rodadas): 10 jogos, 20 atualizações até o fim, mediana de 0,5 a 1,2 ms por atualização e máximo de 4,3 ms. O custo do motor é pequeno; o que pesa é renderizar o feed (hoje sem teto) e as listas a cada atualização.
- Testes que tocam as duas telas (referência de paridade): `test/flows/live-round.test.tsx`, `substitutions.test.tsx`, `full-season.test.tsx`, `cup-shootout.test.tsx`; `test/ui/live-keyboard.test.tsx`, `substitution-limit.test.tsx`, `match-summary.test.tsx`, `round-results.test.tsx`; e2e `live-round`, `full-season`, `cup`, `keyboard`, `a11y`, `layout`. O resultado é o do CI da 029 (PR #55) e vale para a base `release/v1.0.0`, sem repetir a suíte aqui.
- Tolerância: mediana de abertura até 10% acima (rodada até 74 ms, fim de temporada até 166 ms) e, na rodada de 10 jogos, nenhuma tarefa de interface acima de 200 ms (SC-002).

## Tabela de paridade (FR-026)

Cada dado, ação, aviso e mensagem das telas de hoje e onde fica depois da 030. A coluna "Conferido" foi preenchida em T038.

| Hoje | Onde fica depois | Conferido |
|---|---|---|
| Rodada: título "Rodada N" e nota com a competição e a data (`round.title`, `round.dated`) | cabeçalho da tela, junto ao cartão do jogo | ✓ |
| Relógio do meu jogo (minuto, Intervalo, Fim, prorrogação, pênaltis) | cartão do jogo (estado em texto e símbolo) e barra de andamento | ✓ |
| Velocidade lenta, normal e rápida (`select`, preferência `roundSpeed`) | barra de controle | ✓ |
| Pausar e Retomar, Terminar agora | barra de controle | ✓ |
| Pausa automática em lesão ou expulsão (preferência `autoPause`) | barra de controle | ✓ |
| Atalhos de teclado (pausar, mais rápido, mais lento, terminar) e dica `round-controls` | iguais, na barra de controle | ✓ |
| Aviso de prorrogação (`cup.extraTimeNotice`) | `Notice` na coluna do jogo | ✓ |
| Pênaltis: cobranças em ordem, convertidas, defendidas, na trave e para fora, placar da série | `ShootoutPanel` na linguagem nova | ✓ |
| Estatísticas ao vivo (posse, finalizações, no alvo, cartões, pênaltis), recolhíveis | estatísticas comparativas do meu jogo | ✓ |
| Lances do meu jogo (gols, cartões, lesões e os outros narrados) | linha do tempo do meu jogo (até 60) | ✓ |
| **Lances da rodada** (todos os jogos da divisão) | **retirado por decisão do pedido (FR-003 e FR-026)**; os outros jogos ficam em lista, com placar, minuto e gol recente | ✓ |
| Outros jogos: escudos, nomes curtos, placar, relógio, expulsos (cartão vermelho com texto), clássico | lista de uma linha por jogo (competição, minuto, escudos, nomes, placar, gol recente) | ✓ |
| Meu jogo grande: escudos, nomes, placar, relógio, expulsos, clássico | cartão do jogo (+ mando, fase ou grupo, nomes dos expulsos) | ✓ |
| Painel do time (pausado): esquema, postura, substituições usadas e limite | Meu time (mesma lógica) | ✓ |
| Titulares e reservas com condição, força atual, cartões, lesão, fora de posição | Meu time | ✓ |
| "Já saíram" e substituto pendente (lesão ou goleiro expulso) | Meu time, com `Notice` de substituto obrigatório | ✓ |
| Substituição e troca de posição em dois passos (a troca não gasta substituição) e a confirmação em texto | Meu time | ✓ |
| Mensagens de erro por causa (`round.error.change.*`, genérica) | Meu time, mesmas mensagens | ✓ |
| Anúncio para leitor de tela (gol, expulsão, lesão, cobrança) | região `aria-live` com todos os lances do lote, mais intervalo e fim | ✓ |
| Confirmação de saída (`confirm`) e `beforeunload` | diálogo (`requestLeave`) e `beforeunload` | ✓ |
| Fim da rodada: resultados, resumo do meu jogo, Ver classificação, links das outras divisões, Voltar ao início ou resumo da temporada | `RoundEnd` com as mesmas ações | ✓ |
| Fim de temporada: título "Temporada X encerrada" e Próxima temporada (com "preparando" e falha) | cabeçalho com o botão na mesma linha | ✓ |
| Situação do clube e premiação (`seasonEnd.mine.*`, `seasonEnd.prize`) | resultado do clube e campanha | ✓ |
| Avaliação da diretoria (metas, confiança, decisão, reputação, conquistas) | "Como foi a sua temporada" | ✓ |
| Campeões por divisão (campeão e pontos) | "Campeões das ligas nacionais" | ✓ |
| Subidas e descidas por fronteira, clube do jogador destacado | "Acesso e rebaixamento" | ✓ |
| Classificações finais de fases (`FinalPositions`) | seção recolhida | ✓ |
| Outras competições, campeões continentais e copas (`OtherCompetitions`, `CupResult`) | seção recolhida | ✓ |
| Qualificações (`QualificationSummary`) | seção recolhida | ✓ |
| Links para as divisões (`SeasonSummary` nav) | rodapé do resumo | ✓ |
| Atalho `next-season` | igual | ✓ |

## Depois da implementação (030)

- `apps/web/out`: 4,2 MB (JS 1 810 006 bytes, +22 772 sobre a 029; CSS 70 173 bytes, +2 914; precache de 180 arquivos)
- Tempo de abertura (mesmo método): rodada ao vivo 65 ms (53 a 67) contra 67 ms; fim de temporada 159 ms (150 a 161) contra 151 ms (+5%), dentro da tolerância de 10%. Uma primeira versão do resumo levava 173 ms: o resumo da temporada passou a ser calculado uma só vez e a tabela da classificação final só é montada quando a seção se abre.
- Rodada de 10 jogos em velocidade rápida: o motor leva de 0,5 a 1,2 ms por atualização; o teste de unidade (`live-perf.test.tsx`) mede a tela inteira com média abaixo de 100 ms por passo de 500 ms, e o e2e confirma que nenhuma tarefa de interface passa de 200 ms (`PerformanceObserver` de `longtask`).
- Testes: unidade (a partir da raiz) com todos passando, exceto um teste de tempo do pacote `save` (`football-world-scale`, sem relação com a feature) que falhou uma vez sob carga e passou isolado; e2e completo com 50 passando, incluindo pênaltis ao vivo (seed `pen-4`), a confirmação de saída em diálogo, o teclado, a rodada de 10 jogos e o fim de temporada novo.
- Paridade (FR-026): todas as linhas conferidas; os desvios de forma são: o feed "Lances da rodada" foi retirado por decisão do pedido, a classificação de fases, as outras competições e as qualificações ficam na seção recolhida "Demais competições", e o painel Meu time ocupa uma linha própria (com a rodada pausada), porque as duas colunas dele não cabiam na coluna da direita em 1 280 px.
