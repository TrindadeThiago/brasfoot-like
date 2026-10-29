# 027 — Competição, calendário e histórico

Marco 10 — Nova interface

`/speckit-specify`

```text
Refazer as telas de acompanhamento do mundo e da temporada na nova interface (ver docs/interface-nova.md §4 e §5; competições em docs/design.md §3).

Objetivo: tabelas, chaveamentos e listas longas ficam fáceis de ler e de navegar, para qualquer competição de qualquer país.

Histórias de usuário:
- Como jogador, quero trocar de país e de competição sem me perder, e ver a classificação, os resultados e a artilharia de cada uma.
- Como jogador, quero entender um mata-mata de relance, com o meu clube destacado e o caminho até a final.
- Como jogador, quero um calendário mensal que mostre, nos dias de jogo, o adversário e o resultado, e me leve ao próximo jogo.
- Como jogador, quero consultar campeões, artilheiros, recordes e lendas de qualquer temporada.

Escopo:
- Competição: duas abas, **Minhas competições** (a padrão: as que o clube disputa ou vai disputar na temporada, inclusive as de que já saiu, com a situação em cada cartão: em disputa, eliminado, começa em…) e **Demais competições** (as outras, com o seletor de país e a contagem); cada competição é um cartão selecionável, no lugar da faixa de abas por nome; para a escolhida, as seções Classificação, Resultados e Artilharia (liga) ou o Chaveamento (mata-mata); divisões; fases (grupos e mata-mata) com a origem das vagas; zonas de acesso, rebaixamento e vaga continental marcadas na tabela; forma recente; o clube do jogador sempre destacado; painel de campanha do clube só nas competições em que ele joga; aviso "seu clube não participa" nas demais; competição que ainda não começou mostra início, vaga e formato.
- Calendário: **calendário mensal, um mês por página**, com setas de mês anterior e próximo, faixa de meses com a contagem de jogos e o atalho "Ir para o próximo jogo"; o dia de jogo destacado, com adversário, mando e resultado ou fase; faixa de cor por resultado nos jogos disputados e por competição nos futuros; o próximo jogo e o dia atual marcados; filtro por competição; painel do jogo escolhido (data, adversário, mando, competição, fase, resultado, Resumo e Ver jogos) e lista dos jogos do mês, para quem navega pelo teclado; abre no mês do próximo jogo.
- Histórico: as sete abas (Temporadas, Títulos, Artilheiros, Recordes, Clubes, Copas, Continental) e a de estaduais quando existir, com estado vazio explicativo antes da primeira temporada encerrada; ligação para a trajetória do técnico.
- Tabelas largas rolam dentro do quadro, com a primeira coluna fixa quando for útil.

Requisitos:
- Paridade funcional: tudo o que as telas atuais mostram continua visível (docs/interface-nova.md §5), inclusive as classificações de temporadas passadas.
- Desempenho: calendário de uma temporada completa, classificação de 20 clubes com forma e chaveamentos de 32 clubes abrem e rolam sem travar.
- Estados vazios e de erro desenhados: competição ainda sem jogos, sem classificados, país sem competições.
- Cor nunca é o único sinal nas zonas da tabela e nos resultados (V, E, D).
- "Minhas competições" tem critério definido em dados (o clube participa ou tem vaga confirmada); o plano decide onde fica uma competição em que a vaga ainda está em disputa.
- Textos, plural e formatos pelo i18n.
- A feature entra na branch `release/v1.0.0` (o PR tem essa branch como base, e nada é publicado) e acrescenta o que mudou à nota única do 1.0.0 (docs/interface-nova.md §6); a versão do jogo não muda.

Fora de escopo: gráficos de evolução, comparação entre temporadas, novas estatísticas.

Critérios de aceite:
- Com o mundo padrão, é possível chegar à classificação, ao chaveamento e à campanha de uma competição continental e de um estadual em no máximo dois cliques a partir da tela de Competição.
- Em 1 440, 1 280 e 1 024 px de largura, nenhuma das telas tem rolagem horizontal da página; tabelas com mais colunas do que cabem rolam no próprio quadro.
- Os testes de ponta a ponta de competição e de histórico continuam passando, atualizados.
```
