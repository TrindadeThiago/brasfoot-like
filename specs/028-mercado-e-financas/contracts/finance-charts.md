# Contrato: Finanças e gráficos

- **Resumo fixo**: saldo, resultado da temporada, dívida, estádio; alerta de crise; aviso de rodada ao vivo.
- **Abas** (`Tabs`): Visão geral (saldo em linha; receitas × despesas por mês em barras), Receitas e despesas (resumo da temporada; roscas por origem e por destino), Bilheteria (ingresso editável com estimativa do próximo jogo; público por jogo com a capacidade; jogos em casa), Estádio (obras, aviso de obra em andamento e de caixa insuficiente, capacidade depois de cada obra), Crédito (limite em uso, tomar, amortizar, quitar, dívida em linha), Histórico (prêmios da temporada; histórico por temporada com gráfico, tabela e crises).
- **Todo gráfico** é `<figure role="img" aria-label="{resumo}">` com `<figcaption>` e legenda em tabela (nome, valor, percentual); séries distinguidas por texto e padrão, nunca só por cor; eixos com `formatMoneyWords`.
- **Sem dado confiável** (conciliação falha): o gráfico não aparece; a aba mostra os valores em tabela.
- **Ações** (preço, empréstimo, amortização, quitação, obra): como hoje, com o resultado na tela na hora; travadas com texto durante rodada ao vivo.
