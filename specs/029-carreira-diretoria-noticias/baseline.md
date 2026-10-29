# Linha de base (início da 029, `release/v1.0.0` com a 025 a 028)

Medida em 2026-10-29, antes de qualquer mudança de código da 029.

- `apps/web/out`: 4,2 MB (JS 1 770 508 bytes; CSS 65 521 bytes; precache de 181 arquivos)
- Tempo de abertura (Playwright, mundo padrão, mediana de 5 aberturas com o site já em cache): Carreira 132 ms (127 a 145) e Notícias 121 ms (116 a 131)
- Testes que tocam as duas telas (referência de paridade): `test/flows/board.test.tsx`, `fans.test.tsx`, `news.test.tsx`; e2e `career-board`, `career`, `fans`, `news`, `keyboard`, `a11y`, `layout`. O resultado é o do CI da 028 (PR #54) e vale para a base `release/v1.0.0`, sem repetir a suíte aqui.
- Tolerância (SC-007): mediana até 10% acima, ou seja, até 145 ms na Carreira e 133 ms nas Notícias.

## Tabela de paridade (FR-022)

Cada dado, ação ou aviso das telas de hoje e onde fica depois da 029. A coluna "Conferido" foi preenchida em T035.

| Hoje | Onde fica depois | Conferido |
|---|---|---|
| Carreira: título, `tablist` "Seções da carreira", `?aba=` (`board`, `fans`, `offers`, `history`, `coaches`) | `Tabs` com os mesmos ids | ✓ |
| Contagem de propostas no nome da aba Propostas | nome da aba em `Tabs` | ✓ |
| Desempregado: título, detalhe e reputação (`career.unemployed*`, `career.reputation`) | Diretoria, Torcida e Técnicos: `EmptyState` de desempregado com a reputação | ✓ |
| Metas: esportiva (nível, posição exigida, posição atual, cumprida ou em risco), financeira, continental e estadual (alvo e resultado ou pendente), aviso de meta de meio de temporada | aba Diretoria, cartão Metas, com situação em texto e símbolo | ✓ |
| Reputação do técnico; aviso "carreira sem demissão" | aba Diretoria, cartão Metas | ✓ |
| Confiança: valor, medidor, tendência, três motivos recentes (ou "sem motivos") | aba Diretoria, cartão Confiança, com nível em texto | ✓ |
| Mudanças de confiança por rodada (rodada, valor, delta e fatores), da mais nova à mais antiga | aba Diretoria, cartão Mudanças por rodada | ✓ |
| Torcida: faixa, valor, medidor, tendência, três motivos (ou "sem motivos") | aba Torcida, `FansCard` | ✓ |
| Rivais: clube, divisão e intensidade (ou "sem rivais") | aba Torcida, `RivalsList` | ✓ |
| Propostas: clube e escudo, divisão e posição, país (se de fora), reputação, metas esperadas, validade, aviso de mudança de país, Aceitar e Recusar, trava com a rodada ao vivo, "nenhuma proposta" | aba Propostas, um cartão por proposta | ✓ |
| Histórico: passagens (clube ou "desempregado", período, saída) e temporadas (ano, clube, divisão, posição, meta, campanha continental, conquistas, decisão, reputação), "sem temporadas" | aba Histórico, tabelas em cartões com estados vazios | ✓ |
| Técnicos: seletor de divisão, tabela (clube, técnico ou "você" ou vaga, reputação, confiança), jogador destacado | aba Técnicos | ✓ |
| Notícias: seletor de temporada e rodada (rodada 0 = resumo), lista de manchetes por relevância, destaque do clube do jogador, fatos complementares, "sem notícias" | seletor com setas, cartões por manchete, grupos e painel de filtros | ✓ |
| Início: cartão de notícias (manchetes da última rodada, limite, "ver todas"), cartão da diretoria, cartão da torcida | mesmos cartões, com os componentes novos | ✓ |
| Avisos na Início: demissão e nova contratação (com Dispensar) e propostas pendentes (com link para a aba) | `Notice`, mesmo texto e mesma ação, `role` de hoje | ✓ |
| Barra lateral: contador de propostas na Carreira | igual (`attentionCount`) | ✓ |

## Depois da implementação (029)

- `apps/web/out`: 4,2 MB (JS 1 787 234 bytes, +16 726; CSS 67 059 bytes, +1 538; precache de 182 arquivos)
- Tempo de abertura (mesmo método): Carreira 127 ms (120 a 142) e Notícias 115 ms (112 a 124), contra 132 e 121 ms da linha de base: dentro da tolerância de SC-007 (até 145 e 133 ms)
- Testes: unidade 4 374 passando (451 arquivos, a partir da raiz) e e2e completo com 46 passando, incluindo a Diretoria sem rolagem vertical em 1 440 × 900, o aceite de uma proposta só com o teclado, acessibilidade (axe) e layout nos dois temas
- Paridade (FR-022): todas as linhas da tabela acima conferidas; o único ajuste de forma é que o título da manchete é um parágrafo (e não um título de seção), para não competir com o nome do clube nos leitores de tela e nos testes
