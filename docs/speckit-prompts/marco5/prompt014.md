# 014 — Manchetes e histórico

Marco 5 — Drama

`/speckit-specify`

```text
Notícias/manchetes geradas a partir de eventos e o histórico do mundo (ver docs/design.md §10).

Objetivo: cada rodada e cada temporada "contam uma história". O jogo transforma eventos que já acontecem (gols, viradas, demissões, transferências, recordes) em manchetes, e guarda a memória do mundo para referenciá-la depois.

Histórias de usuário:
- Como jogador, quero ver um feed de notícias a cada rodada com manchetes sobre meu clube, a liga e o mercado (ex.: hat-trick, goleada, virada, fim de jejum, zebra, clássico, demissão de técnico, grande transferência, rebaixamento matemático).
- Como jogador, quero que as manchetes reflitam o contexto (ex.: "terceira derrota seguida", "maior goleada da história do clube").
- Como jogador, quero consultar o histórico: campeões por temporada, títulos por clube, artilheiros históricos, recordes, ídolos/lendas de cada clube e minha trajetória como técnico.

Requisitos:
- Manchetes geradas por templates com variáveis e várias variações por tipo de evento, escolhidas de forma determinística; sem LLM.
- Templates com frases completas, suporte a plural e gênero, prontos para tradução.
- Prioridade/relevância para que o feed não seja inundado de notícias irrelevantes.
- O histórico precisa crescer de forma controlada em carreiras de 30+ temporadas (tamanho do save).

Fora de escopo: coletivas de imprensa interativas, vestiário, imagens nas notícias.

Critérios de aceite:
- Toda rodada gera ao menos uma manchete sobre o clube do jogador.
- Um recorde batido é detectado e gera manchete referenciando o recorde anterior.
- O tamanho do save após 30 temporadas simuladas fica abaixo de um limite definido no plano.
```
