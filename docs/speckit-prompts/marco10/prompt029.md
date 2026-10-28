# 029 — Carreira, diretoria e notícias

Marco 10 — Nova interface

`/speckit-specify`

```text
Refazer as telas de carreira do técnico, diretoria, torcida e notícias na nova interface (ver docs/interface-nova.md §4 e §5; docs/design.md §10).

Objetivo: o drama da carreira fica visível e fácil de acompanhar: o que a diretoria e a torcida esperam, como estão e que propostas apareceram.

Histórias de usuário:
- Como jogador, quero ver de relance se a diretoria está contente, o que explica a confiança e se estou cumprindo as metas da temporada.
- Como jogador, quero saber como está a torcida e por quê.
- Como jogador, quero avaliar propostas de emprego com tudo o que preciso para decidir, inclusive quando elas me levam a outro país.
- Como jogador, quero reler as manchetes de qualquer rodada e achar rápido as que falam do meu clube.

Escopo:
- Carreira: abas Diretoria, Torcida, Propostas, Histórico e Técnicos.
- Diretoria: metas da temporada (esportiva, financeira, estadual, continental) com situação (cumprindo, em risco, em andamento), confiança com tendência, motivos recentes com o efeito de cada um, mudanças de confiança por rodada, reputação do técnico, aviso de carreira sem demissão.
- Torcida: satisfação com a faixa (por exemplo, neutra), tendência e motivos recentes.
- Propostas: clube, divisão e posição, reputação, país, metas esperadas, validade, aviso de mudança de país e as ações Aceitar e Recusar; contador de propostas pendentes na barra lateral.
- Histórico do técnico: passagens por clube (período e saída) e temporadas (divisão, posição, meta, conquistas, decisão da diretoria, reputação, campanha continental).
- Técnicos: tabela dos técnicos da divisão com reputação e confiança, o jogador identificado e as vagas.
- Notícias: seleção da temporada e rodada, manchetes com o nome da competição e destaque para as que envolvem o clube do jogador.
- Avisos que o jogo já dá em outras telas (demissão, nova contratação, propostas) com o mesmo componente de aviso.

Requisitos:
- Paridade funcional (docs/interface-nova.md §5): nenhum dado, ação ou aviso some.
- As categorias, o destaque e os filtros de notícias dos mockups não são requisito: o jogo não classifica manchetes por tipo.
- Estados vazios desenhados: sem propostas, sem metas ainda, sem notícias, clube desempregado (012).
- Cor nunca é o único sinal de tendência e de situação das metas.
- Textos, plural e formatos pelo i18n.
- A feature entra na branch `release/v1.0.0` (o PR tem essa branch como base, e nada é publicado) e acrescenta o que mudou à nota única do 1.0.0 (docs/interface-nova.md §6); a versão do jogo não muda.

Fora de escopo: novas regras de diretoria ou de torcida, novos tipos de manchete, imagens nas notícias.

Critérios de aceite:
- Um jogador demitido consegue ver as propostas, entender cada uma e aceitar uma só com o teclado.
- A aba Diretoria mostra, sem rolagem em 1 440 px de largura, as metas e a confiança com seus motivos.
- Os testes de ponta a ponta de diretoria, propostas e notícias continuam passando, atualizados.
```
