# 006 — Rodada ao vivo e telas da competição

Marco 2 — Temporada jogável

`/speckit-specify`

```text
Rodada ao vivo em texto e telas de acompanhamento da competição (ver docs/design.md §6 e §13, marco M2).

Objetivo: entregar a assinatura emocional do Brasfoot — todos os jogos da rodada acontecendo ao mesmo tempo, com placares mudando e eventos aparecendo — e permitir jogar uma temporada inteira no navegador.

Histórias de usuário:
- Como jogador, quero iniciar a rodada e ver todos os jogos simultaneamente com o relógio correndo (~30–60 s por rodada, velocidade ajustável), destaque para o meu jogo e um feed de eventos em texto (gols, cartões, lesões, expulsões).
- Como jogador, quero pausar a qualquer momento para fazer substituições e mudar esquema/postura do meu time, e retomar.
- Como jogador, quero um modo "simular direto" que mostra o resultado da rodada de uma vez.
- Como jogador, quero ver o resumo da minha partida ao final (placar, autores, estatísticas).
- Como jogador, quero ver a tabela de classificação, os resultados de todas as rodadas, o calendário e a artilharia.
- Como jogador, ao final da temporada, quero ver a classificação final e o campeão.

Requisitos:
- Ao vivo e "simular direto" usam o mesmo motor e, para a mesma seed e as mesmas decisões, chegam ao mesmo resultado.
- Os textos dos eventos vêm de templates traduzíveis com variações.
- O save automático ocorre ao fim da rodada (pausar no meio não precisa ser salvável).

Fora de escopo: Série B, virada de temporada, finanças, manchetes/notícias.

Critérios de aceite:
- É possível jogar as 38 rodadas da Série A do início ao fim no navegador.
- Substituições respeitam o limite e jogadores substituídos não voltam.
```
