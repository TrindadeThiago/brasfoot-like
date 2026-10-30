# Contrato de interface: layout em telas estreitas

Vale para todas as telas, abas e diálogos do jogo (de fora da carreira, do clube, rodada ao vivo e fim de temporada).

- **768 px em diante**: a barra lateral fica ao lado (telas do clube); sem rolagem horizontal da página; sem texto cortado; todas as ações visíveis e acionáveis; as colunas da 025 a 031 mantêm a estrutura.
- **Abaixo de 768 px (até 600 px e com zoom de 200%)**: a barra lateral empilha acima do conteúdo, com as dez telas acessíveis; as colunas viram uma só; nenhuma função some; sem rolagem horizontal da página.
- **Tabelas largas**: rolagem horizontal só dentro do contêiner da tabela; primeira coluna fixa quando a tabela a pede; cabeçalhos e legenda preservados.
- **Nomes longos** (clube, jogador, competição, mod): quebram em linhas ou usam reticências com o nome completo acessível; nunca estouram a largura.
- **Diálogos**: cabem na janela, rolam por dentro e mantêm o foco preso, em qualquer largura.
- **Rodada ao vivo**: placar, minuto, estado, controles e painel Meu time sem sobreposição e sem rolagem horizontal; o aviso de atualização não aparece nela.
- **Dicas e aviso de atualização**: não cobrem o controle que explicam nem os controles principais; ficam dentro da janela.
- **Abaixo de 600 px** (telefone): usável pelas mesmas regras, sem a otimização dedicada (pós-lançamento, `docs/design.md` §14).
- **Temas**: tudo acima vale nos temas claro e escuro.
