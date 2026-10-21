# 020 — Vários países e simulação em escala

Marco 8 — Mundo

`/speckit-specify`

```text
Mundo com vários países, cada um com a sua pirâmide de competições, e simulação capaz de sustentar centenas de clubes (ver docs/design.md §3, §11 e §12).

Objetivo: o banco deixa de ter um único país. Cada país tem as suas divisões, copa e regras econômicas, todos jogam ao mesmo tempo, e o jogo continua rápido e com saves de tamanho aceitável mesmo com centenas de clubes e milhares de jogadores.

Histórias de usuário:
- Como jogador, quero começar a carreira em um clube de qualquer país do banco.
- Como jogador, quero receber propostas de trabalho e contratar jogadores de outros países.
- Como modder, quero criar um banco com vários países, cada um com a sua estrutura e o seu banco de nomes.

Escopo:
- Vários países no mesmo banco, cada um com as suas competições e regras econômicas (escala de receitas, salários e público por país, como dados).
- Mercado entre países: transferências internacionais, com a IA de transferências considerando outros países.
- Diretoria e propostas de emprego de clubes de qualquer país.
- Simulação resumida para os jogos fora das competições do clube do jogador: resultado, gols, cartões e lesões necessários aos demais sistemas, com as mesmas distribuições estatísticas da simulação completa; jogos do clube do jogador e das suas competições usam a simulação completa.
- Metas declaradas e testadas para o mundo grande: tamanho do save, tempo de rodada e de virada, memória; histórico de competições alheias guardado de forma resumida.
- Nova carreira: escolha de clube com filtro por país e divisão.

Requisitos:
- Determinismo mantido com as duas simulações.
- A renovação do mundo (009) gera jogadores com nomes do banco de nomes do país do clube.
- O banco padrão (um país) continua funcionando sem mudanças visíveis.

Fora de escopo: vagas entre competições (021), competições continentais (022), seleções nacionais.

Critérios de aceite:
- As simulações resumida e completa têm distribuições de placar, gols por jogo e cartões equivalentes (faixas declaradas no teste).
- Um banco de teste com 10 países e duas divisões cada (~400 clubes) roda 30 temporadas dentro das metas de tamanho e de tempo, e cada país fica dentro das faixas da 008 e da 009.
- O jogador consegue trocar de país ao aceitar uma proposta de emprego.
```
