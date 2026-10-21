# 019 — Fase de grupos e competições em fases

Marco 7 — Copas

`/speckit-specify`

```text
Fase de grupos e competições compostas por fases encadeadas (ver docs/design.md §3 e §14).

Objetivo: o formato `groups`, hoje reservado, passa a funcionar, e uma competição pode ser uma sequência de fases (pontos corridos ou grupos seguidos de mata-mata). É a base de competições como a quarta divisão nacional, os estaduais e as competições continentais.

Histórias de usuário:
- Como jogador, quero acompanhar a tabela do meu grupo e saber quem se classifica para o mata-mata.
- Como modder, quero montar uma competição com fase de grupos e mata-mata, ou pontos corridos seguidos de playoff, só com dados.

Escopo:
- Grupos de tamanho definido nos dados, com turno único ou ida e volta e os mesmos critérios de pontuação e desempate da liga.
- Sorteio com potes e restrições por atributo do clube (ex.: clubes do mesmo país ou da mesma região não caem no mesmo grupo), determinístico pela seed.
- Classificados por grupo (os N primeiros e, opcionalmente, os melhores entre os demais) e chaveamento da fase seguinte pela posição no grupo.
- Classificação geral da fase de grupos (todos os grupos juntos), usada por outras regras, como mando de campo no mata-mata e rebaixamento.
- Competição como sequência de fases: pontos corridos → mata-mata (playoff), grupos → mata-mata, várias fases de grupos; cada fase eliminatória com o seu formato (ex.: jogo único até a semifinal e final em ida e volta).
- Acesso e rebaixamento em divisões disputadas em fases (ex.: sobem os finalistas, caem os piores da classificação geral dos grupos).
- Telas: tabelas por grupo, zona de classificação marcada e chaveamento das fases seguintes.
- Formato de mod documentado e validado (grupos que fecham com o número de clubes, classificados compatíveis com a fase seguinte).

Requisitos:
- Mesma seed ⇒ mesmo sorteio; um sorteio que não consegue respeitar as restrições falha com erro claro em vez de violá-las.
- Os desempates dentro do grupo seguem os critérios da competição.

Fora de escopo: competições com clubes de vários países (vem com o marco 8), vagas entre competições.

Critérios de aceite:
- Um banco de teste com uma divisão em grupos regionais seguidos de mata-mata (formato de quarta divisão nacional) joga 30 temporadas sem erro, com acesso para a divisão de cima a partir do mata-mata.
- Em todos os sorteios do teste, nenhuma restrição é violada.
```
