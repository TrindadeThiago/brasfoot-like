# 013 — Torcida e rivalidades

Marco 5 — Drama

`/speckit-specify`

```text
Humor da torcida e rivalidades entre clubes (ver docs/design.md §10).

Objetivo: o resultado de cada jogo repercute emocionalmente — a torcida lota ou esvazia o estádio, pressiona a diretoria, e clássicos valem mais que três pontos.

Escopo:
- Humor da torcida por clube, influenciado por resultados recentes, posição na tabela em relação à expectativa, contratações/vendas de ídolos e clássicos.
- O humor afeta a bilheteria (008) e a confiança da diretoria (012).
- Rivalidades definidas como dados no banco (pares de clubes com intensidade), com geração de rivalidades no banco fictício padrão (ex.: mesma cidade/região).
- Clássicos destacados no calendário e na rodada; vitórias/derrotas em clássicos têm peso extra em torcida e diretoria.
- Indicador de humor da torcida visível ao jogador.

Fora de escopo: manchetes (014), protestos/eventos especiais, vestiário.

Critérios de aceite:
- Uma sequência de derrotas reduz o humor e o público de forma mensurável; perder um clássico tem efeito maior que perder um jogo comum.
- O formato de mod aceita rivalidades e a validação rejeita rivalidades com clubes inexistentes.
```
