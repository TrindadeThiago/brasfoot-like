# Contrato: Elenco e modal do jogador

- **Tabela**: caption "Jogadores do {clube}"; colunas posição, jogador, idade, força, características, situação, na escalação, condição, evolução, contrato; sem coluna de ações; ordenação por cabeçalho (`aria-sort`).
- **Linha**: clique em qualquer ponto abre o modal; Enter/Espaço na linha focada também; o nome é `<button>` (`aria-haspopup="dialog"`, nome acessível = nome do jogador) e não dispara o clique da linha duas vezes.
- **Modal** (`role="dialog"`, título = nome): força e condição em `Meter` (`role="meter"`), nacionalidade, características, contrato (até {ano}, último ano, empréstimo), salário, valor de mercado, evolução, estatísticas da temporada (ou "Ainda não jogou"); botões Renovar, Vender, Rescindir e Fechar.
- **Vender**: diálogo com a cotação da venda imediata; confirmar vende, fecha o modal e mostra `disposal.sold`.
- **Rescindir**: diálogo com a multa e meses restantes; confirmar rescinde e mostra `disposal.terminated`.
- **Renovar**: `NegotiationDialog` (kind `renew`) com salário e duração e a resposta do jogador.
- **Desativados com motivo**: durante rodada ao vivo; Renovar para emprestado.
- **Foco**: o modal prende o foco; ao fechar, devolve a quem o abriu (botão do nome ou linha); Esc fecha o diálogo do topo.
- **Estados**: filtro sem resultado mostra `squad.noMatch` e Limpar filtros; desempregado redireciona ao Início (012).
