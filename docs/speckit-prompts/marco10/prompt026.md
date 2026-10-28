# 026 — Telas do clube: Início, Elenco e Escalação

Marco 10 — Nova interface

`/speckit-specify`

```text
Refazer as três telas do dia a dia do clube na nova interface (ver docs/interface-nova.md §4 e §5; funções em docs/design.md §4 e §6).

Objetivo: as telas que o jogador mais abre ficam mais claras e mostram o que importa primeiro, sem perder nenhuma função.

Histórias de usuário:
- Como jogador, quero abrir o Início e ver logo o próximo jogo e o que preciso resolver antes dele.
- Como jogador, quero ver o elenco em uma tabela legível, sem rolagem da página inteira, e agir sobre um jogador a partir da linha dele.
- Como jogador, quero montar a escalação num campo claro, com a condição de cada um visível e os desfalques à parte.

Escopo:
- Início: cartão do próximo jogo em destaque (adversário, competição, mando, forma recente) com as ações Jogar rodada e Simular direto; avisos acionáveis (mercado, escalação ajustada, propostas) com as ações que já existem, inclusive Dispensar; posição na tabela e últimos resultados; torcida e diretoria com a barra e a tendência; metas da temporada; manchetes.
- Elenco: contagem do elenco, filtros por setor e condição com Limpar filtros, tabela com posição, jogador, idade, força, características, situação, lugar na escalação, condição, evolução e contrato, e as ações Detalhes, Vender e Rescindir; cabeçalho e ações por linha sem estourar a largura.
- Escalação: esquema e postura, Escalar automaticamente, aviso de titulares cansados, campo com os titulares (posição, nome, posição natural, força, condição), reservas com condição, "Fora da relação" com os lesionados e suspensos, mensagens de escalação pronta e de problemas (LineupIssues, LineupNotice).
- Dicas de primeiro acesso reancoradas nos elementos novos.

Requisitos:
- Paridade funcional: tudo o que as telas atuais permitem continua permitido (docs/interface-nova.md §5).
- A tela de elenco com 40 jogadores e a de escalação não têm rolagem horizontal da página; a tabela rola dentro do próprio quadro.
- Estados vazios e de erro desenhados: sem jogadores no filtro, clube desempregado (012), escalação inválida.
- Nenhum item do mockup que o jogo não tem vira função (ex.: reputação do clube no Início).
- Textos, plural e formatos de número e data pelo i18n.
- A feature entra na branch `release/v1.0.0` (o PR tem essa branch como base, e nada é publicado) e acrescenta o que mudou à nota única do 1.0.0 (docs/interface-nova.md §6); a versão do jogo não muda.

Fora de escopo: novas funções de elenco ou de tática, comparação de jogadores na tela de elenco, fotos e escudos.

Critérios de aceite:
- Cada uma das três telas é usável só com o teclado, nos dois temas, e mantém os atalhos atuais.
- Em 1 440, 1 280 e 1 024 px de largura, nenhuma das três tem rolagem horizontal da página nem texto cortado.
- Os testes de ponta a ponta de escalação e de venda de jogador continuam passando, atualizados para os novos elementos.
```
