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
- Mercado: abas Buscar, Negociações, Propostas recebidas e Contratos; janela aberta ou fechada com as datas; os onze filtros (mostrar, posição, força mínima e máxima, idade mínima e máxima, valor máximo, salário máximo, contrato até, país, nome) com Limpar filtros e contagem de resultados; tabela com comparação (de 2 a 4 jogadores), clube, valor, salário e contrato; Mostrar mais.
- Diálogos do mercado: oferta, empréstimo, contratação de livre, renovação, venda e rescisão, com campos (valor, taxa, salário, duração), o valor de mercado como referência, as etapas da negociação (aguardando, contraproposta) e os motivos de recusa do clube e do jogador.
- Finanças: saldo, dívida e estádio; resumo da temporada com receitas e despesas; ingresso com preço editável e estimativa do próximo jogo; crédito bancário (tomar, amortizar, quitar); obras do estádio; jogos em casa; prêmios; histórico financeiro por temporada.
- Mensagens de trava (rodada ao vivo em andamento, janela fechada, elenco cheio, teto de estrangeiros).

Requisitos:
- Paridade funcional completa (docs/interface-nova.md §5): nenhum filtro, ação ou mensagem some.
- Desempenho: a lista de jogadores do mundo padrão é montada uma vez, e filtros e busca só filtram em cima dela (como na 1.10); abrir a aba e filtrar respondem em tempo imperceptível.
- O gráfico de saldo por mês dos mockups não é requisito: o jogo não guarda esse dado.
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
