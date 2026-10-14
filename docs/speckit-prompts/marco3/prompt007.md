# 007 — Múltiplas divisões e virada de temporada

Marco 3 — Carreira

`/speckit-specify`

```text
Série B, acesso e rebaixamento e a transição entre temporadas (ver docs/design.md §3 e §13, marco M3).

Objetivo: o mundo deixa de ser uma temporada isolada e passa a ser uma carreira contínua com duas divisões.

Escopo:
- Série A e Série B disputadas em paralelo, cada rodada simulando todos os jogos das duas divisões (o jogador vê ao vivo a divisão do seu clube; a outra é simulada).
- Regras de acesso/rebaixamento como dados da competição (padrão: 4 sobem, 4 descem).
- Virada de temporada: aplicar acesso/rebaixamento, gerar novos calendários, zerar estatísticas da temporada, avançar idades, registrar campeões e classificações finais em um histórico simples.
- O jogador pode começar em qualquer clube das duas divisões.
- Tela de resumo de fim de temporada (campeões, quem subiu e desceu, posição do meu clube).
- Pontos de extensão para que sistemas futuros (finanças, evolução, mercado, diretoria) executem lógica na virada de temporada em ordem definida.

Fora de escopo: finanças, evolução de jogadores, mercado, diretoria.

Critérios de aceite:
- Simular 10 temporadas seguidas sem interação mantém sempre 20 clubes por divisão e aplica corretamente acesso/rebaixamento.
- Um clube rebaixado na temporada N disputa a Série B na N+1.
```
