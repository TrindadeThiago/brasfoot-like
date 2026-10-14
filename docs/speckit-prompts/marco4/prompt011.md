# 011 — IA de transferências

Marco 4 — Mercado

`/speckit-specify`

```text
Inteligência artificial de mercado para os clubes controlados pelo computador (ver docs/design.md §9).

Objetivo: os clubes da IA montam elencos coerentes ao longo de décadas, comprando, vendendo, emprestando e renovando com base em necessidades reais, usando as mesmas regras do jogador humano.

Escopo:
- Avaliação de necessidades por clube: cobertura por posição, idade do elenco, qualidade relativa à divisão e às ambições, situação financeira.
- Ações da IA nas janelas: comprar entre clubes da IA, vender excedentes, emprestar jovens para ganharem minutagem, contratar livres, renovar ou liberar contratos.
- Propostas da IA pelos jogadores do humano com frequência e valores críveis.
- Clubes grandes tendem a comprar os melhores jogadores; clubes pequenos revelam e vendem.
- Resumo de transferências relevantes da janela visível ao jogador.
- Teste automatizado de 30 temporadas com mercado ativo.

Fora de escopo: personalidade de dirigentes, agentes, rivalidade afetando negociações.

Critérios de aceite:
- No teste de 30 temporadas: nenhum clube fica com elenco inválido; nenhum clube acumula excesso em uma posição (ex.: mais de 4 goleiros); a economia permanece dentro dos limites da 008; a distribuição de forças permanece dentro dos limites da 009.
- Há um fluxo perceptível de bons jogadores de clubes pequenos para grandes.
```
