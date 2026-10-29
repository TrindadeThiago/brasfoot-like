# Feature Specification: Mercado e finanças

**Feature Branch**: `028-mercado-e-financas`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "Refazer o mercado de transferências e as finanças na nova interface: Mercado com as abas Buscar, Negociações, Propostas recebidas e Contratos, os onze filtros, tabela sem coluna de seleção nem de ações, linha clicável que abre o modal do jogador com as ações, comparação de 2 a 4 jogadores e os diálogos de oferta, empréstimo, contratação de livre, renovação, venda e rescisão; Finanças em abas por contexto com gráficos, sob um resumo fixo, sem perder nenhuma função. Entra na branch release/v1.0.0 e acrescenta à nota única do 1.0.0." (`docs/speckit-prompts/marco10/prompt028.md`)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Achar um jogador entre cerca de mil e comparar até quatro (Priority: P1)

Como jogador, quero achar um jogador entre cerca de mil usando filtros que respondem na hora, abrir os detalhes dele pela linha e comparar até quatro, para decidir quem contratar sem sair do mercado.

**Why this priority**: a busca é a porta de entrada do mercado; sem ela, as ofertas e as contratações não acontecem.

**Independent Test**: abrir o Mercado com o mundo padrão, usar os onze filtros, abrir o modal de um jogador pela linha e comparar de dois a quatro jogadores.

**Acceptance Scenarios**:

1. **Given** o Mercado aberto, **When** o jogador olha a tela, **Then** vê as abas Buscar, Negociações, Propostas recebidas e Contratos (e o resumo da janela, quando houver), e a janela de transferências aberta ou fechada, com as datas.
2. **Given** a aba Buscar, **When** o jogador usa os filtros (mostrar, posição, força mínima e máxima, idade mínima e máxima, valor máximo, salário máximo, contrato até, país e nome), **Then** a lista responde na hora, mostra a contagem de resultados, e o botão Limpar filtros volta ao estado inicial.
3. **Given** a tabela, **When** o jogador a lê, **Then** vê jogador, posição, idade, força, clube, valor, salário e contrato, sem coluna de seleção nem de ações; **And** a lista longa tem Mostrar mais.
4. **Given** uma linha da tabela, **When** o jogador clica nela (ou no nome, com o teclado), **Then** abre o modal do jogador, com força, condição, nacionalidade, características, contrato, valor, salário, evolução e estatísticas da temporada, e os botões Fazer oferta e Pedir empréstimo (ou Contratar, se o jogador é livre), Adicionar à comparação e Fechar.
5. **Given** jogadores adicionados à comparação, **When** há de dois a quatro, **Then** uma bandeja acima da tabela mostra quem está na comparação e abre uma janela com eles lado a lado; **And** com mais de quatro, o jogo avisa que o limite é quatro.
6. **Given** o mundo padrão com cerca de mil jogadores, **When** o jogador abre a aba e digita nos filtros, **Then** a resposta é imperceptível, sem travar a digitação.
7. **Given** nenhum jogador com os filtros escolhidos, **When** a lista é mostrada, **Then** aparece um estado vazio que diz isso e leva ao Limpar filtros.

---

### User Story 2 - Acompanhar negociações, propostas recebidas e contratos (Priority: P1)

Como jogador, quero acompanhar minhas negociações, as propostas que recebi e os contratos do elenco sem sair do mercado.

**Why this priority**: o mercado é um processo em várias etapas; o jogador precisa ver onde cada negociação está e o que pede resposta.

**Independent Test**: abrir uma negociação, receber uma proposta pelo elenco e conferir cada aba.

**Acceptance Scenarios**:

1. **Given** negociações abertas, **When** o jogador abre a aba Negociações, **Then** vê cada uma com o jogador, o tipo (compra, empréstimo, livre, renovação), a etapa (aguardando, contraproposta) e o que fazer; **And** abre a negociação a partir dali.
2. **Given** propostas recebidas por jogadores do elenco, **When** o jogador abre a aba Propostas recebidas, **Then** vê cada proposta com o valor e as ações aceitar e recusar, como hoje.
3. **Given** o elenco, **When** o jogador abre a aba Contratos, **Then** vê salário, fim do contrato, valor, o aviso de último ano e a ação de renovar, e quem está emprestado aparece como tal, sem renovar.
4. **Given** uma janela já encerrada, **When** o jogador abre o resumo da janela, **Then** vê o resumo da janela passada, como hoje.
5. **Given** negociações e propostas pendentes, **When** o jogador está em qualquer aba, **Then** as abas mostram a contagem do que pede resposta.

---

### User Story 3 - Fazer uma oferta, pedir empréstimo, contratar um livre ou renovar num diálogo claro (Priority: P1)

Como jogador, quero fazer uma oferta, pedir um empréstimo, contratar um livre ou renovar um contrato num diálogo claro, que me diga por que uma proposta foi recusada.

**Why this priority**: é onde o dinheiro e o elenco mudam; a recusa sem motivo frustra e a oferta sem referência de valor leva a erro.

**Independent Test**: contratar um livre, fazer uma oferta recusada, ajustar a contraproposta e renovar um contrato, só com o teclado.

**Acceptance Scenarios**:

1. **Given** o diálogo de oferta, empréstimo, contratação de livre ou renovação, **When** ele abre, **Then** mostra o jogador, o valor de mercado como referência, os campos da ação (valor, taxa, salário, duração) com rótulo e mensagem de erro ligada ao campo, e a etapa da negociação.
2. **Given** uma oferta recusada, **When** o clube ou o jogador responde, **Then** o diálogo mostra o motivo da recusa em texto claro; **And** numa contraproposta, mostra o valor pedido com as ações aceitar e recusar.
3. **Given** uma negociação que chega a contrato, **When** o jogador propõe salário e duração, **Then** o diálogo mostra a resposta do jogador (aceita, recusa com motivo ou exige um salário) e conclui ou continua a negociação.
4. **Given** Vender e Rescindir (pelo modal do jogador no Elenco), **When** o jogador usa um deles, **Then** o diálogo mostra a cotação, pede confirmação e dá o resultado, como hoje.
5. **Given** o diálogo aberto, **When** o jogador usa só o teclado, **Then** o foco entra no diálogo, Tab percorre os campos e botões, Esc fecha e o foco volta ao elemento que abriu.
6. **Given** uma ação que o jogo não permite (rodada ao vivo em andamento, janela fechada, elenco cheio, teto de estrangeiros), **When** o jogador tenta, **Then** vê a mensagem de trava, escrita, e o botão fica desativado ou a ação é recusada com o motivo.

---

### User Story 4 - Ver de onde vem e para onde vai o dinheiro e agir sobre ingresso, obras e crédito (Priority: P1)

Como jogador, quero ver de onde vem e para onde vai o dinheiro do clube e agir sobre o preço de ingresso, as obras do estádio e o crédito.

**Why this priority**: as finanças hoje são uma página longa de tabelas; o jogador não vê a evolução do saldo nem o peso de cada receita e despesa.

**Independent Test**: percorrer as abas de Finanças, aplicar preço de ingresso, tomar e amortizar crédito e contratar uma obra, vendo o resultado na hora.

**Acceptance Scenarios**:

1. **Given** Finanças, **When** a tela abre, **Then** um resumo fixo mostra saldo, resultado da temporada, dívida e estádio, com o aviso de crise financeira quando houver, e as abas Visão geral, Receitas e despesas, Bilheteria, Estádio, Crédito e Histórico.
2. **Given** a Visão geral, **When** o jogador a abre, **Then** vê o saldo ao longo da temporada (linha) e as receitas e despesas por mês (barras).
3. **Given** Receitas e despesas, **When** o jogador a abre, **Then** vê o resumo da temporada e a divisão por origem das receitas e por destino das despesas em gráficos de rosca, com legenda de valor e percentual.
4. **Given** a Bilheteria, **When** o jogador a abre, **Then** vê o preço do ingresso editável com a estimativa do próximo jogo em casa, o público por jogo em casa com a capacidade do estádio, e a lista dos jogos em casa; **And** ao aplicar um novo preço, o resultado aparece na hora.
5. **Given** o Estádio, **When** o jogador o abre, **Then** vê as obras disponíveis com custo, prazo e a capacidade depois de cada uma, o aviso de obra em andamento e o de caixa insuficiente; **And** ao contratar uma obra, o resultado aparece na hora.
6. **Given** o Crédito, **When** o jogador o abre, **Then** vê o limite e o quanto está em uso, as ações tomar, amortizar e quitar e a dívida ao longo da temporada; **And** cada ação mostra o resultado na hora.
7. **Given** o Histórico, **When** o jogador o abre, **Then** vê os prêmios da temporada e o histórico financeiro por temporada, com gráfico, tabela e as crises financeiras.
8. **Given** qualquer gráfico, **When** o jogador o olha ou o lê por leitor de tela, **Then** ele tem um texto de resumo e uma legenda com valores, sem depender só da cor.
9. **Given** um gráfico para o qual o jogo não guarda dado confiável, **When** a tela é montada, **Then** esse gráfico não aparece (e a aba mostra a informação em tabela, se existir), em vez de mostrar um gráfico impreciso.

---

### User Story 5 - Teclado, mensagens de trava e valores no formato do jogo (Priority: P2)

Como jogador que usa só o teclado, quero que todo o mercado e as finanças sejam usáveis por ele, com as mensagens de trava claras e os valores sempre no formato de dinheiro do jogo.

**Why this priority**: a acessibilidade da 016 é uma promessa já feita, e os valores aparecem em toda a tela.

**Independent Test**: percorrer o Mercado e as Finanças só com o teclado, nos dois temas, e conferir as mensagens de trava e a moeda.

**Acceptance Scenarios**:

1. **Given** o Mercado e as Finanças, **When** o jogador usa Tab e Shift+Tab, **Then** alcança abas, filtros, linhas, bandeja de comparação, diálogos e ações, numa ordem lógica, com o foco sempre visível nos dois temas.
2. **Given** os atalhos da 016, **When** o jogador os usa, **Then** continuam respondendo como antes, e a ajuda de atalhos abre nas duas telas.
3. **Given** qualquer valor em dinheiro nas duas telas, **When** o jogador o lê, **Then** ele usa o formato de dinheiro do jogo (a moeda do jogo, com o formato numérico do idioma), sem valores fixos no texto.
4. **Given** uma rodada ao vivo em andamento, janela fechada, elenco cheio ou teto de estrangeiros atingido, **When** o jogador tenta a ação, **Then** a mensagem de trava correspondente aparece.

---

### Edge Cases

- **Lista de mil jogadores:** abrir a aba, filtrar e ordenar não travam; a lista é montada uma vez e os filtros só filtram em cima dela.
- **Filtro sem resultado:** a lista mostra o estado vazio com Limpar filtros, e a contagem diz 0.
- **Jogador livre:** o modal mostra Contratar no lugar de Fazer oferta e Pedir empréstimo.
- **Jogador do próprio clube no mercado:** não aparece para oferta; as ações dele ficam no Elenco e em Contratos.
- **Comparação com mais de quatro:** o jogo avisa o limite; com um só, a janela de comparação não abre.
- **Janela fechada:** a busca e a comparação continuam, mas ofertas e contratações mostram a mensagem de trava; renovação e venda seguem as regras de hoje.
- **Elenco cheio ou teto de estrangeiros:** a contratação mostra o motivo, e a oferta pode continuar até o ponto em que o jogo recusa.
- **Negociação em andamento do mesmo jogador:** o modal abre a negociação existente, e não cria outra.
- **Rodada ao vivo em andamento:** ações de mercado e de finanças mostram a trava e ficam desativadas.
- **Caixa insuficiente:** a oferta, a obra ou a quitação mostram a mensagem e não executam.
- **Temporada sem jogos em casa ainda:** a Bilheteria mostra o estado vazio, sem gráfico quebrado.
- **Clube sem dívida:** o Crédito mostra a dívida zerada e o limite disponível, e Amortizar e Quitar ficam desativados com o motivo.
- **Moeda:** o jogo tem uma moeda fictícia única e uma escala econômica por país; os valores seguem o formato do jogo e a escala já aplicada pelas regras de cada país.
- **Desempregado (012):** o Mercado e as Finanças das telas do clube seguem as regras de hoje (redirecionam ao Início).

## Requirements *(mandatory)*

### Functional Requirements

**Mercado**

- **FR-001**: O Mercado MUST ter as abas Buscar, Negociações, Propostas recebidas e Contratos, o resumo da janela e a janela de transferências aberta ou fechada com as datas.
- **FR-002**: A aba Buscar MUST ter os onze filtros (mostrar, posição, força mínima e máxima, idade mínima e máxima, valor máximo, salário máximo, contrato até, país e nome), Limpar filtros e a contagem de resultados, e MUST responder aos filtros na hora.
- **FR-003**: A tabela de jogadores MUST mostrar jogador, posição, idade, força, clube, valor, salário e contrato, sem coluna de ações, com uma caixa de seleção para a comparação ao lado do nome (revisão após a validação: antes não havia seleção na tabela), com ordenação e Mostrar mais.
- **FR-004**: Cada linha MUST abrir o modal do jogador ao ser clicada, e o nome MUST ser um botão que faz o mesmo pelo teclado.
- **FR-005**: O modal do jogador MUST mostrar força, condição, nacionalidade, características, contrato, valor, salário, evolução e estatísticas da temporada, e os botões Fazer oferta e Pedir empréstimo (ou Contratar, para jogador livre), Adicionar à comparação e Fechar.
- **FR-006**: A comparação MUST aceitar de 2 a 4 jogadores, mostrados numa bandeja acima da tabela e numa janela lado a lado, e MUST avisar o limite.
- **FR-007**: A aba Negociações MUST mostrar cada negociação com tipo, etapa e a ação disponível; Propostas recebidas MUST manter aceitar e recusar; Contratos MUST mostrar salário, fim, valor, último ano e a renovação, sem renovar emprestados.

**Diálogos**

- **FR-008**: Os diálogos de oferta, empréstimo, contratação de livre e renovação MUST mostrar o jogador, o valor de mercado como referência, os campos da ação com rótulo e erro ligado ao campo, a etapa da negociação (aguardando, contraproposta) e os motivos de recusa do clube e do jogador, em texto.
- **FR-009**: Os diálogos de venda e rescisão MUST continuar mostrando a cotação, pedindo confirmação e dando o resultado, como hoje.
- **FR-010**: Os diálogos MUST abrir com o foco dentro, prender o foco, fechar com Esc e devolver o foco ao elemento que os abriu.
- **FR-011**: As mensagens de trava (rodada ao vivo em andamento, janela fechada, elenco cheio, teto de estrangeiros, caixa insuficiente) MUST aparecer em texto quando a ação não é permitida.

**Finanças**

- **FR-012**: As Finanças MUST ter um resumo fixo (saldo, resultado da temporada, dívida e estádio) e o aviso de crise financeira, e as abas Visão geral, Receitas e despesas, Bilheteria, Estádio, Crédito e Histórico.
- **FR-013**: A Visão geral MUST mostrar o saldo ao longo da temporada e as receitas e despesas por mês; Receitas e despesas MUST mostrar o resumo da temporada e a divisão por origem e por destino, com legenda de valor e percentual.
- **FR-014**: A Bilheteria MUST ter o preço do ingresso editável com a estimativa do próximo jogo, o público por jogo em casa com a capacidade do estádio e a lista dos jogos em casa; o Estádio MUST ter as obras, o aviso de obra em andamento, o de caixa insuficiente e a capacidade depois de cada obra; o Crédito MUST ter limite em uso, tomar, amortizar, quitar e a dívida ao longo da temporada; o Histórico MUST ter os prêmios da temporada e o histórico financeiro por temporada, com gráfico, tabela e crises.
- **FR-015**: Aplicar preço de ingresso, tomar empréstimo, amortizar, quitar e contratar obra MUST funcionar como hoje e MUST mostrar o resultado na hora.
- **FR-016**: Todo gráfico MUST ter um texto de resumo para leitor de tela e uma legenda com valores, e MUST NOT depender só da cor; um gráfico sem dado confiável MUST NOT aparecer.

**Transversais**

- **FR-017**: Nenhum filtro, ação ou mensagem das telas atuais MUST se perder (paridade funcional), e nenhuma regra de mercado ou de economia MUST mudar.
- **FR-018**: A lista de jogadores do mundo padrão MUST ser montada uma vez, e filtros e busca MUST só filtrar sobre ela; abrir a aba e filtrar MUST responder sem atraso perceptível.
- **FR-019**: Todo valor em dinheiro MUST usar o formato de dinheiro do jogo (a moeda do jogo; o jogo não tem moeda por país); todo texto, plural e formato de número e data MUST passar pelo sistema de internacionalização.
- **FR-020**: Mercado e Finanças MUST ser usáveis só com o teclado nos dois temas, com foco visível, contraste mínimo da 016 e os atalhos atuais.
- **FR-021**: Nenhum formato de save, dado ou regra MUST mudar; nenhum save existente pode ser alterado nem exigir migração.
- **FR-022**: A nota única do 1.0.0 MUST ganhar o que mudou nestas telas, no mesmo PR; a versão do jogo MUST continuar 1.0.0; o PR MUST ter a base `release/v1.0.0`.
- **FR-023**: O teste de ponta a ponta do mercado MUST continuar passando, atualizado para os novos elementos.

### Key Entities *(include if feature involves data)*

- **Jogador do mercado**: um jogador de clube ou livre, com os atributos visíveis, o valor de mercado, o salário e o contrato, mostrado numa linha e num modal.
- **Negociação**: um processo de compra, empréstimo, contratação de livre ou renovação, com etapas (aguardando, contraproposta, contrato) e respostas do clube e do jogador.
- **Proposta recebida**: uma oferta de outro clube por jogador do elenco, com valor e as respostas aceitar e recusar.
- **Comparação**: de 2 a 4 jogadores escolhidos para ver lado a lado.
- **Lançamento financeiro**: uma receita ou despesa do clube, com valor, origem ou destino e o momento em que ocorreu.
- **Resumo financeiro**: saldo, resultado da temporada, dívida e estádio, sempre visível nas Finanças.
- **Obra e crédito**: as obras do estádio (custo, prazo, capacidade) e o empréstimo bancário (limite, em uso, dívida).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Com o mundo padrão (cerca de mil jogadores), abrir a aba Buscar e mudar qualquer filtro responde em até 200 ms, sem travar a digitação.
- **SC-002**: O jogador contrata um livre, faz uma oferta recusada, ajusta a contraproposta e renova um contrato só com o teclado, e em cada recusa vê o motivo em texto.
- **SC-003**: Aplicar preço de ingresso, tomar empréstimo, amortizar e contratar obra funcionam como hoje, e o resultado aparece na tela em até 1 segundo após a ação.
- **SC-004**: 100% dos filtros, ações e mensagens das telas atuais continuam disponíveis (conferidos contra a lista de paridade), e nenhuma regra de mercado ou de economia muda.
- **SC-005**: 100% dos gráficos têm texto de resumo e legenda com valores, e nenhum depende só da cor; nenhum gráfico aparece sem dado confiável.
- **SC-006**: Em 1 440, 1 280 e 1 024 px de largura, nos dois temas, nenhuma das telas tem rolagem horizontal da página nem texto cortado; tabelas largas rolam no próprio quadro.
- **SC-007**: Todos os valores em dinheiro aparecem no formato de dinheiro do jogo, sem nenhum valor fixo no texto.
- **SC-008**: O teste de ponta a ponta do mercado, atualizado, e a suíte atual passam; a nota do 1.0.0 descreve as telas novas e a versão continua 1.0.0.

## Assumptions

- **Telas existentes:** Mercado e Finanças já existem; nenhuma tela nova nasce, e a lista do que precisa continuar é a de `docs/interface-nova.md` §5, `docs/design.md` §8 e §9.
- **Gráficos:** os do escopo (saldo em linha, receitas e despesas por mês em barras, roscas por origem e por destino, público por jogo, dívida ao longo da temporada e histórico por temporada) saem dos dados que o jogo já guarda; o plano verifica se o extrato registra a data ou a rodada de cada lançamento e se a divisão por origem e por destino bate com as categorias do jogo, e o gráfico sem dado confiável não entra. A frase "gráficos" em fora de escopo do pedido original é lida como "gráficos além dos listados".
- **Modal do jogador:** reaproveita o modal da 026 (Elenco) e o padrão de linha clicável; no Mercado ele traz Fazer oferta, Pedir empréstimo ou Contratar, Adicionar à comparação e Fechar.
- **Comparação:** o limite de quatro jogadores e a janela lado a lado são os de hoje; muda a seleção, que sai da coluna da tabela e vai para o modal e a bandeja.
- **Fundação da 025 e telas da 026 e 027:** as telas usam a barra lateral, os tokens, os componentes-base, o `Tabs` e os padrões de modal e linha clicável já entregues.
- **Larguras:** 1 440, 1 280 e 1 024 px são os alvos de validação; a 768 px vale a estrutura da 025.
- **Dicas de primeiro acesso:** continuam funcionando; o texto e a âncora são revistos onde o elemento mudou de lugar.
- **Branch e versão:** a feature sai de `release/v1.0.0` e volta para ela por um PR com essa base; o merge não publica nada; a versão do jogo não muda.
- **Fora de escopo:** novas regras de mercado ou de economia, gráficos além dos listados, olheiros, categorias de base, e as demais telas do clube (029 em diante).

## Ajustes após a validação do usuário

- O modal do jogador (e a comparação) fecha ao clicar fora.
- Os filtros do Mercado recolhem e expandem.
- A lista do Mercado é paginada (50 por página) e tem caixa de seleção para a comparação.
- As movimentações da temporada são paginadas (10 por página).
- Propostas recebidas têm "Ver detalhes" do jogador pedido; em Contratos, o atleta abre os mesmos detalhes antes de renovar.
