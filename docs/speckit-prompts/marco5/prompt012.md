# 012 — Carreira do técnico e diretoria

Marco 5 — Drama

`/speckit-specify`

```text
Carreira do técnico: reputação, diretoria, metas, demissão e propostas (ver docs/design.md §7 e §10).

Objetivo: o jogador é um técnico cuja permanência depende de resultados; isso dá peso a cada rodada e cria a jornada de começar pequeno e chegar a um gigante.

Histórias de usuário:
- Como jogador, quero receber metas da diretoria no início de cada temporada (ex.: acesso, meio de tabela, título, não fechar no vermelho), proporcionais à reputação e à força do clube.
- Como jogador, quero acompanhar o nível de confiança da diretoria, que muda com resultados, metas e finanças.
- Como jogador, quero passar por uma avaliação ao fim da temporada e ser demitido se a confiança ficar muito baixa, inclusive no meio da temporada em casos extremos.
- Como jogador, quero ter uma reputação de técnico que cresce ou cai conforme meu desempenho.
- Como jogador, quero receber propostas de outros clubes (inclusive no meio da temporada) e poder aceitar ou recusar; quando demitido, quero receber propostas de clubes compatíveis com minha reputação ou aguardar.
- Como jogador, quero poder ativar a opção "sem demissão" ao criar a carreira.

Requisitos:
- Clubes da IA também trocam de técnico (de forma simplificada) quando vão mal.
- Histórico de clubes e resultados do técnico.

Fora de escopo: torcida (013), manchetes (014), vestiário, coletivas.

Critérios de aceite:
- Assumir um clube grande gera metas mais exigentes que assumir um pequeno.
- Com "sem demissão" ativa, o jogador nunca é demitido, mas a confiança continua visível.
- Após uma demissão, a carreira continua no mesmo save com um novo clube.
```
