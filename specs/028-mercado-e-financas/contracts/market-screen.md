# Contrato: tela do Mercado

- **Abas** (`Tabs`): Buscar, Negociações, Propostas recebidas, Contratos (e Resumo da janela quando houver); contagem de pendências (negociações que pedem resposta, propostas) no nome da aba, em texto.
- **Janela**: aberta ou fechada com as datas (`WindowStatus`).
- **Filtros** (Buscar): mostrar, posição, força mín/máx, idade mín/máx, valor máx, salário máx, contrato até, país (com limite de estrangeiros, quando houver), nome; Limpar filtros; contagem de resultados.
- **Tabela**: jogador, posição, idade, força, clube, valor, salário, contrato; sem coluna de ações, com caixa de comparação ao lado do nome; paginada de 50 em 50, ordenando a lista inteira; filtros recolhíveis; ordenação; linha clicável; nome é `<button aria-haspopup="dialog">`; Mostrar mais.
- **Modal do jogador**: força e condição em `Meter`, nacionalidade, características, contrato, valor, salário, evolução, estatísticas (só visíveis); botões Fazer oferta, Pedir empréstimo (ou Contratar se livre), Adicionar à comparação (ou Remover), Fechar; trava com motivo.
- **Comparação**: `CompareTray` acima da tabela (chips com Remover, botão Comparar com 2 a 4, aviso do limite de 4); `ComparePanel` num `Dialog` lado a lado.
- **Estados vazios**: filtro sem resultado (`EmptyState` + Limpar filtros).
- **URL**: `?aba=` como hoje (ex.: `aba=report` do aviso da Início).
