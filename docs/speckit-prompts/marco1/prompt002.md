# 002 — Motor de partida

Marco 1 — Motor

`/speckit-specify`

```text
Motor de simulação de partidas minuto a minuto (ver docs/design.md §4 e §6).

Objetivo: dado dois clubes com suas escalações e táticas, simular uma partida de 90 minutos (mais acréscimos) produzindo uma sequência de eventos e o resultado final, de forma crível e determinística.

Escopo:
- Entrada: 11 titulares e reservas de cada time, esquema tático (4-4-2, 4-3-3, 3-5-2, 4-5-1, 5-3-2 ou similar), postura (defensiva, equilibrada, ofensiva), mando de campo, seed.
- Força efetiva de cada setor (defesa, meio, ataque, goleiro) calculada a partir da força dos jogadores, adequação à posição e características (ex.: Cabeceio, Muralha, Artilheiro afetam situações específicas).
- Simulação minuto a minuto gerando eventos: chance de gol, gol (com autor e assistência quando aplicável), defesa do goleiro, cartão amarelo/vermelho (influenciado pelo temperamento), lesão (influenciada pela propensão), pênalti.
- Expulsão e lesão afetam o restante da partida.
- O motor deve permitir avançar a simulação em passos (minuto a minuto) e aplicar mudanças entre passos: substituições (limite configurável, padrão 5), troca de esquema e postura. Isso viabiliza a rodada ao vivo e o modo "simular direto" com o mesmo motor.
- Escalação automática: dado um elenco, escolher os melhores 11 e reservas para um esquema (usada pela IA e como sugestão ao jogador).
- Saída: placar, lista de eventos com minuto, estatísticas básicas (finalizações, posse estimada) e estado dos jogadores (cartões, lesões).

Fora de escopo: narração em texto final para o usuário (apenas eventos estruturados), interface, cansaço acumulado entre partidas, moral.

Critérios de aceite:
- Mesma entrada + mesma seed = mesma sequência de eventos.
- Em um teste com milhares de partidas entre times de forças variadas: média de gols por jogo entre 2,2 e 3,0; proporção de empates entre 22% e 30%; vantagem de mando de campo perceptível; time muito mais forte vence a maioria, mas zebras acontecem.
- Postura ofensiva aumenta gols marcados e sofridos de forma mensurável; jogar com um a menos reduz o desempenho.
```
