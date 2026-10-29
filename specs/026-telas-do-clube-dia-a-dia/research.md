# Research: Telas do clube — Início, Elenco e Escalação

## R1 — Linha clicável com nome como botão
- **Decisão**: usar o `onRowClick` que o `DataTable` já tem (linha com `tabIndex`, Enter e Espaço) e renderizar o nome do jogador como `<button>` que abre o modal e para a propagação para não abrir duas vezes. A linha continua focável, mas o caminho de teclado "oficial" é o botão do nome.
- **Razão**: reaproveita o comportamento testado; atende FR-006 (clique em qualquer ponto e teclado).
- **Alternativas**: só linha focável (leitor de tela lê a linha inteira, sem nome de ação); botão "Detalhes" por linha (volta a coluna de ações, contra o pedido).
- **Cuidado**: `aria-selected` na linha só quando há seleção real; o botão do nome usa `aria-haspopup="dialog"`.

## R2 — Modal do jogador com as ações
- **Decisão**: novo `PlayerModal` sobre o `Dialog` existente, com cabeçalho (nome, posição, idade), barras de força e condição (`Meter`), dados (nacionalidade, características, contrato, salário, valor de mercado, evolução), estatísticas da temporada e rodapé com Renovar, Vender, Rescindir e Fechar. Vender e Rescindir abrem o `DisposalDialog` já existente; Renovar abre o `NegotiationDialog` em modo `renew`. O modal fecha ao concluir a ação e mostra a mensagem na tela do Elenco.
- **Razão**: nenhuma regra nova; os diálogos e as respostas são os de hoje.
- **Alternativas**: ações dentro do mesmo diálogo (muda a pilha de foco); manter `PlayerDetails` e acrescentar botões (a Escalação usa `PlayerDetails` e não deve ganhar as ações).
- **Foco**: dois níveis de diálogo precisam devolver o foco ao anterior; o `Dialog` atual já prende o foco, e o teste confirma a ordem ao fechar.

## R3 — Salário e valor de mercado do jogador
- **Decisão**: `marketRowOf(context, playerId)` puro no motor (reaproveita `rowOf`/`kitOf` de `search.ts`) e `marketContextOf(save)` da UI; o modal calcula só a linha do jogador aberto.
- **Razão**: `marketRows` percorre todos os jogadores (≈ 39 000 no mundo completo, 024); montá-la só para abrir o modal custaria uma fração de segundo por clique.
- **Alternativas**: reutilizar `marketRows` memoizada (custo no primeiro clique e memória); calcular o valor na UI (duplicaria regra do motor, contra o gate I).

## R4 — Renovar a partir do Elenco
- **Decisão**: o modal monta um `NegotiationTarget { kind: "renew", row }` com a linha de R3 e abre o `NegotiationDialog` já usado pela aba Contratos do Mercado. Desativa o botão quando `locked` (rodada ao vivo), em empréstimo e nas mesmas condições da aba Contratos.
- **Razão**: mesmo diálogo, mesmas respostas do jogador; a aba do Mercado fica como está (028).

## R5 — Início: composição
- **Decisão**: ordem dos blocos: (1) cartão do próximo jogo (adversário com escudo, competição, mando, data, rodada, forma recente com `FormChips` — que continua também em "Últimos resultados" —, ações); (2) avisos acionáveis agrupados (diretoria, propostas de emprego, mudanças do elenco, mercado, escalação ajustada, crise) em `Notice`; (3) posição + saldo, últimos resultados; (4) torcida; (5) diretoria e metas; (6) manchetes. Cada aviso mantém seu componente e suas ações; só o contêiner e a grade mudam.
- **Razão**: paridade total e menor risco; os testes de `home.test.tsx` e dos avisos seguem válidos.
- **Alternativas**: reescrever os avisos (risco sem ganho); caixa única de pendências (perde as ações específicas, incluindo Dispensar).
- **Grade**: 3 colunas só acima de 1 200 px (decisão da 025), uma coluna abaixo.

## R6 — Escalação: composição
- **Decisão**: manter `Pitch`, `LineupList`, `LineupIssues` e `LineupNotice` e a lógica de seleção/troca; reorganizar em barra de controles (esquema, postura, Escalar automaticamente, status), aviso de cansados e problemas em `Notice`, campo à esquerda e coluna de Reservas + "Fora da relação" à direita (empilha abaixo de 1 200 px), com `Meter` de condição. "Fora da relação" mostra motivo e jogos restantes.
- **Razão**: a lógica de teclado e seleção é a parte mais testada (`lineup-keyboard`, `lineup-selection`); não tocar nela.

## R7 — Larguras e rolagem
- **Decisão**: validar 1 440, 1 280 e 1 024 px (largura do conteúdo ≈ 792 px a 1 024 com a barra lateral). Tabela do Elenco rola no quadro da 025; colunas de menor prioridade (características) podem encolher com reticências. Campo da escalação com largura fluida e proporção fixa.
- **Verificação**: e2e `layout.spec.ts` ganha as larguras 1 280 e checagem de texto cortado por elementos com `scrollWidth > clientWidth` nas três telas.

## R8 — Dicas de primeiro acesso
- **Decisão**: manter ids e atalhos de `catalog.ts`; reancorar `home-next-step` no cartão do próximo jogo (`data-tip-anchor="play"` nas ações), `lineup` no campo sem dica nova no Elenco (criar conteúdo de dica está fora de escopo).
- **Razão**: o spec pede reancorar, não criar conteúdo novo.

## R9 — Testes
- Motor: `marketRowOf` igual à linha de `marketRows` para o mesmo jogador (livre, emprestado, de outro clube).
- UI: linha clica/Enter abre modal; modal mostra os campos; Vender/Rescindir/Renovar a partir do modal; filtros e estado vazio; Início com e sem avisos, fim de temporada e desempregado; Escalação (já existentes) com seletores novos.
- E2E: lineup.spec, venda via modal, a11y (as três telas, modal aberto), layout nas três larguras.
- **Disposal**: `test/flows/disposal.test.tsx` troca o clique no botão "Vender {nome}" por abrir o modal e clicar em Vender (SC-007, FR-022).

## R10 — Nota de versão
- **Decisão**: acrescentar ao `release-notes.json` (nota 1.0.0, mesmo PR) itens sobre as três telas; versão e `check-release` inalterados.

## R11 — Entrega
- PR com base `release/v1.0.0`; nada é publicado.
