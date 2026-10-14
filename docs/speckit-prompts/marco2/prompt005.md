# 005 — Escalação e táticas

Marco 2 — Temporada jogável

`/speckit-specify`

```text
Tela de elenco, escalação e táticas do clube do jogador (ver docs/design.md §4 e §6).

Objetivo: o jogador monta seu time antes de cada partida de forma rápida e informada, no espírito do Brasfoot: ler o elenco de relance e tomar decisões.

Histórias de usuário:
- Como jogador, quero ver meu elenco com posição, força, idade, características, condição (lesionado, suspenso) e poder ordenar e filtrar.
- Como jogador, quero escolher o esquema tático e a postura, e definir os 11 titulares e os reservas.
- Como jogador, quero um botão "escalar automaticamente" que monte o melhor time para o esquema escolhido.
- Como jogador, quero ser avisado se tentar escalar um jogador lesionado/suspenso ou um time incompleto/sem goleiro, e ver quando um jogador está fora de posição (com indicação de perda de rendimento).
- Como jogador, quero ver detalhes de um jogador (atributos visíveis e histórico da temporada); atributos ocultos não aparecem.

Requisitos:
- A escalação fica salva entre rodadas e é ajustada automaticamente se alguém ficar indisponível (com aviso).
- Interface operável por teclado e mouse.

Fora de escopo: treino, moral, negociação de jogadores, substituições durante a partida (vêm na 006).

Critérios de aceite:
- Não é possível iniciar uma partida com escalação inválida.
- A escalação automática produz o mesmo time que a IA escolheria no motor.
```
