# 003 — Temporada de pontos corridos

Marco 1 — Motor

`/speckit-specify`

```text
Simulação de uma temporada completa de uma competição de pontos corridos (ver docs/design.md §3 e §13, marco M1).

Objetivo: gerar o calendário, simular todas as rodadas com o motor de partida e manter a tabela de classificação, provando que o motor produz um campeonato crível — sem nenhuma interface gráfica.

Escopo:
- Geração do calendário de turno e returno (20 clubes, 38 rodadas), alternando mandos de forma equilibrada e determinística por seed.
- Execução rodada a rodada: todos os jogos da rodada simulados com escalação automática da IA.
- Tabela de classificação: pontos, jogos, vitórias, empates, derrotas, gols pró/contra, saldo; critérios de desempate configuráveis por competição (padrão: vitórias, saldo, gols pró, confronto direto, sorteio determinístico).
- Estatísticas da temporada: artilharia, cartões, suspensões automáticas (ex.: 3 amarelos ou vermelho = 1 jogo de suspensão) e lesões que tiram jogadores de partidas seguintes.
- Ferramenta de linha de comando que simula uma temporada a partir de uma seed e imprime a tabela final, artilheiros e um relatório de credibilidade.

Fora de escopo: Série B, acesso/rebaixamento, finanças, mercado, evolução de jogadores, interface web.

Critérios de aceite:
- Mesma seed = mesma temporada.
- Em 100 temporadas simuladas: o campeão costuma estar entre os clubes de maior força inicial, mas não sempre; pontuação do campeão e do último colocado em faixas realistas (ex.: campeão 70–90 pontos); nenhum clube invicto na maioria das temporadas.
- Suspensões e lesões são respeitadas na escalação automática.
```
