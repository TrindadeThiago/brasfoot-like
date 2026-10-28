# 027 — Competição, calendário e histórico

Marco 10 — Nova interface

`/speckit-specify`

```text
Refazer as telas de acompanhamento do mundo e da temporada na nova interface (ver docs/interface-nova.md §4 e §5; competições em docs/design.md §3).

Objetivo: tabelas, chaveamentos e listas longas ficam fáceis de ler e de navegar, para qualquer competição de qualquer país.

Histórias de usuário:
- Como jogador, quero trocar de país e de competição sem me perder, e ver a classificação, os resultados e a artilharia de cada uma.
- Como jogador, quero entender um mata-mata de relance, com o meu clube destacado e o caminho até a final.
- Como jogador, quero um calendário que mostre o próximo jogo e o que já aconteceu sem me obrigar a rolar uma lista enorme.
- Como jogador, quero consultar campeões, artilheiros, recordes e lendas de qualquer temporada.

Escopo:
- Competição: seletor de país; abas por competição (nacional, copa, supercopa, estadual, continentais); seções Classificação, Resultados, Artilharia e Chaveamento; divisões; fases (grupos e mata-mata) com a origem das vagas; zonas de acesso, rebaixamento e vaga continental marcadas na tabela; forma recente; o clube do jogador sempre destacado; painel de campanha do clube.
- Calendário: jogos do clube de todas as competições, com filtro por competição, mando, competição, adversário, placar e resultado; Resumo e Ver jogos nos jogos já disputados; o próximo jogo destacado e a lista posicionada nele ao abrir.
- Histórico: as sete abas (Temporadas, Títulos, Artilheiros, Recordes, Clubes, Copas, Continental) e a de estaduais quando existir, com estado vazio explicativo antes da primeira temporada encerrada; ligação para a trajetória do técnico.
- Tabelas largas rolam dentro do quadro, com a primeira coluna fixa quando for útil.

Requisitos:
- Paridade funcional: tudo o que as telas atuais mostram continua visível (docs/interface-nova.md §5), inclusive as classificações de temporadas passadas.
- Desempenho: calendário de uma temporada completa, classificação de 20 clubes com forma e chaveamentos de 32 clubes abrem e rolam sem travar.
- Estados vazios e de erro desenhados: competição ainda sem jogos, sem classificados, país sem competições.
- Cor nunca é o único sinal nas zonas da tabela e nos resultados (V, E, D).
- Textos, plural e formatos pelo i18n.
- A feature entra na branch `release/v1.0.0` (o PR tem essa branch como base, e nada é publicado) e acrescenta o que mudou à nota única do 1.0.0 (docs/interface-nova.md §6); a versão do jogo não muda.

Fora de escopo: gráficos de evolução, comparação entre temporadas, novas estatísticas.

Critérios de aceite:
- Com o mundo padrão, é possível chegar à classificação, ao chaveamento e à campanha de uma competição continental e de um estadual em no máximo dois cliques a partir da tela de Competição.
- Em 1 440, 1 280 e 1 024 px de largura, nenhuma das telas tem rolagem horizontal da página; tabelas com mais colunas do que cabem rolam no próprio quadro.
- Os testes de ponta a ponta de competição e de histórico continuam passando, atualizados.
```
