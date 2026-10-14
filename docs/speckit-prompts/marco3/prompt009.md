# 009 — Evolução, aposentadoria e renovação do mundo

Marco 3 — Carreira

`/speckit-specify`

```text
Evolução dos jogadores e renovação do mundo ao longo das décadas (ver docs/design.md §4 e §5).

Objetivo: uma carreira de 20–30 temporadas continua saudável — sempre há craques, revelações e veteranos — sem que o nível geral do mundo suba ou caia sem controle.

Escopo:
- Curva de evolução por idade em direção ao potencial oculto: crescimento até ~27 anos, estabilidade até ~30, declínio depois; minutagem em partidas acelera o crescimento de jovens.
- Atualização de força em momentos definidos (ex.: meio e fim de temporada), com variação controlada.
- Aposentadoria probabilística a partir de ~33 anos.
- Geração anual de jovens por clube, influenciada por reputação/estrutura, com nomes de bancos de nomes por país.
- Regulador global: ao fim de cada temporada, compara a distribuição de forças do mundo com a distribuição-alvo e ajusta a geração de novos jogadores.
- Elencos da IA são mantidos em tamanho e cobertura de posições mínimos (antes do mercado existir, por promoção de jovens/reposição).
- Teste automatizado de 30 temporadas sem interação.

Fora de escopo: categorias de base jogáveis, olheiros, treino, mercado.

Critérios de aceite:
- No teste de 30 temporadas: média e percentis (p10, p50, p90, máximo) de força do mundo permanecem em faixas definidas; todo clube tem elenco válido em todas as temporadas; existe ao menos um jogador acima de um limiar de "craque" em cada temporada.
- Jovens com muita minutagem evoluem mais, em média, que jovens com pouca.
```
