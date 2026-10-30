# 028 — Mercado e finanças

Marco 10 — Nova interface

`/speckit-specify`

```text
Refazer o mercado de transferências e as finanças na nova interface (ver docs/interface-nova.md §4 e §5; regras em docs/design.md §8 e §9).

Objetivo: comprar, vender, renovar e acompanhar o dinheiro do clube em telas rápidas e claras, mesmo com o mercado de um mundo inteiro.

Histórias de usuário:
- Como jogador, quero achar um jogador entre cerca de mil usando filtros que respondem na hora, e comparar até quatro.
- Como jogador, quero acompanhar minhas negociações, propostas recebidas e contratos sem sair do mercado.
- Como jogador, quero fazer uma oferta, pedir um empréstimo, contratar um livre ou renovar um contrato num diálogo claro, que me diga por que uma proposta foi recusada.
- Como jogador, quero ver de onde vem e para onde vai o dinheiro do clube e agir sobre preço de ingresso, obras e crédito.

Escopo:
- Mercado: abas Buscar, Negociações, Propostas recebidas e Contratos; janela aberta ou fechada com as datas; os onze filtros (mostrar, posição, força mínima e máxima, idade mínima e máxima, valor máximo, salário máximo, contrato até, país, nome) com Limpar filtros e contagem de resultados; tabela com jogador, posição, idade, força, clube, valor, salário e contrato, **sem coluna de seleção nem de ações**: cada linha é clicável (e o nome é um botão, para o teclado) e abre o modal do jogador, com os detalhes (força, condição, nacionalidade, características, contrato, valor, salário, evolução, estatísticas da temporada) e os botões Fazer oferta e Pedir empréstimo (ou Contratar, se o jogador é livre), Adicionar à comparação e Fechar; a comparação (de 2 a 4 jogadores) usa uma bandeja acima da tabela e uma janela lado a lado; Mostrar mais.
- Diálogos do mercado: oferta, empréstimo, contratação de livre, renovação, venda e rescisão, com campos (valor, taxa, salário, duração), o valor de mercado como referência, as etapas da negociação (aguardando, contraproposta) e os motivos de recusa do clube e do jogador.
- Finanças em **abas por contexto, com gráficos**, sob um resumo fixo (saldo, resultado da temporada, dívida e estádio) e o aviso de crise financeira: Visão geral (saldo ao longo da temporada em linha e receitas e despesas por mês em barras); Receitas e despesas (gráficos de rosca por origem e por destino, com legenda de valor e percentual, e o resumo da temporada); Bilheteria (ingresso com preço editável e estimativa do próximo jogo, público por jogo em casa com a capacidade do estádio, jogos em casa); Estádio (obras, com o aviso de obra em andamento e de caixa insuficiente, e a capacidade depois de cada obra); Crédito (limite em uso, tomar, amortizar, quitar, dívida ao longo da temporada); Histórico (prêmios da temporada e histórico financeiro por temporada, com gráfico, tabela e crises financeiras).
- Mensagens de trava (rodada ao vivo em andamento, janela fechada, elenco cheio, teto de estrangeiros).

Requisitos:
- Paridade funcional completa (docs/interface-nova.md §5): nenhum filtro, ação ou mensagem some.
- Desempenho: a lista de jogadores do mundo padrão é montada uma vez, e filtros e busca só filtram em cima dela (como na 1.10); abrir a aba e filtrar respondem em tempo imperceptível.
- Os gráficos saem dos dados que o jogo já guarda (o extrato e o histórico por temporada). O plano verifica se o extrato registra a data ou a rodada de cada lançamento, necessária para os gráficos por mês, e se a divisão por origem e por destino bate com as categorias do jogo; o gráfico que não tiver dado confiável não entra. Todo gráfico tem texto de resumo para leitor de tela e legenda com valores, sem depender só da cor.
- Valores sempre na moeda e na escala do país do clube.
- Foco e teclado corretos nos diálogos (abrir, fechar, devolver o foco), e erros de formulário ligados ao campo.
- Textos, plural e formatos pelo i18n.
- A feature entra na branch `release/v1.0.0` (o PR tem essa branch como base, e nada é publicado) e acrescenta o que mudou à nota única do 1.0.0 (docs/interface-nova.md §6); a versão do jogo não muda.

Fora de escopo: novas regras de mercado ou de economia, gráficos, olheiros, categorias de base.

Critérios de aceite:
- Contratar um livre, fazer uma oferta recusada, ajustar a contraproposta e renovar um contrato são possíveis só com o teclado.
- Aplicar preço de ingresso, tomar empréstimo, amortizar e contratar obra funcionam como hoje e mostram o resultado na hora.
- O teste de ponta a ponta do mercado continua passando, atualizado para os novos elementos.
```
