# Feature Specification: Telas do clube: Início, Elenco e Escalação

**Feature Branch**: `026-telas-do-clube-dia-a-dia`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "Refazer as três telas do dia a dia do clube na nova interface (Início, Elenco e Escalação), sem perder nenhuma função: Início com o próximo jogo em destaque e os avisos acionáveis; Elenco em tabela legível, com a linha clicável abrindo o modal do jogador (Renovar, Vender e Rescindir); Escalação num campo claro com a condição visível e os desfalques à parte. Entra na branch release/v1.0.0 e acrescenta à nota única do 1.0.0." (`docs/speckit-prompts/marco10/prompt026.md`)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Abrir o Início e ver o que importa antes do próximo jogo (Priority: P1)

Como jogador, quero abrir o Início e ver logo o próximo jogo e o que preciso resolver antes dele, para decidir em poucos segundos se jogo a rodada ou se ainda tenho algo a resolver.

**Why this priority**: o Início é a tela que o jogador abre a cada rodada; é por ele que a rodada começa.

**Independent Test**: abrir uma carreira no meio da temporada, com uma proposta de mercado e uma escalação ajustada pendentes, e conferir o cartão do próximo jogo, os avisos e as ações de jogar.

**Acceptance Scenarios**:

1. **Given** uma carreira com jogo pela frente, **When** o jogador abre o Início, **Then** o primeiro bloco da tela é o cartão do próximo jogo, com o adversário, a competição, o mando (em casa ou fora), a data e a forma recente, e com as ações Jogar rodada e Simular direto.
2. **Given** avisos pendentes (mercado com propostas ou contratos terminando, escalação ajustada automaticamente, propostas de emprego, mudanças do elenco na virada), **When** o jogador olha o Início, **Then** cada aviso aparece como um bloco acionável, com as ações que já existem hoje (ir à tela correspondente, Dispensar), e nada pendente fica escondido.
3. **Given** o Início aberto, **When** o jogador olha o resto da tela, **Then** vê a posição na tabela, os últimos resultados, a torcida e a diretoria com a barra e a tendência, as metas da temporada e as manchetes recentes.
4. **Given** o jogador clica em Jogar rodada ou Simular direto, **When** a ação começa, **Then** o comportamento é o de hoje: a rodada ao vivo abre, ou a simulação direta roda com o aviso "Simulando…" e os botões travados.
5. **Given** a temporada acabou, o clube sem mais jogos ou o clube em crise financeira, **When** o jogador abre o Início, **Then** a tela mostra o estado certo (resumo da temporada, "sem mais jogos", aviso de crise) no lugar do cartão do próximo jogo, como hoje.
6. **Given** o jogador desempregado (012), **When** abre o Início, **Then** vê as propostas de emprego e o histórico a que ele tem direito hoje, e nenhuma ação que só vale para quem tem clube.

---

### User Story 2 - Ver o elenco em uma tabela legível e abrir o jogador pela linha (Priority: P1)

Como jogador, quero ver o elenco numa tabela legível, sem rolagem da página inteira, e abrir os detalhes de um jogador clicando na linha dele, com as ações de renovar, vender e rescindir no próprio modal.

**Why this priority**: o elenco é consultado o tempo todo; hoje a tabela é larga e a coluna de ações a empurra para fora da tela.

**Independent Test**: abrir o Elenco de um clube com 40 jogadores, filtrar, clicar numa linha, abrir o modal e executar uma venda e uma renovação.

**Acceptance Scenarios**:

1. **Given** o Elenco aberto, **When** o jogador olha a tela, **Then** vê a contagem do elenco (jogadores e limite), os filtros de setor e de condição com o botão Limpar filtros, e a tabela com posição, jogador, idade, força, características, situação, lugar na escalação, condição, evolução e contrato, **sem coluna de ações**.
2. **Given** a tabela, **When** o jogador clica em qualquer ponto de uma linha, **Then** abre o modal desse jogador; **And** o nome do jogador é um botão, para quem usa só o teclado chegar ao modal com Tab e Enter.
3. **Given** o modal aberto, **When** o jogador o lê, **Then** vê a força e a condição em barras, a nacionalidade, as características, o contrato (duração e salário), o valor de mercado, a evolução e as estatísticas da temporada, e os botões Renovar, Vender e Rescindir.
4. **Given** o modal aberto, **When** o jogador escolhe Vender, **Then** um diálogo mostra o preço da venda imediata e pede confirmação; **And** ao confirmar, o atleta sai do elenco e aparece a mensagem de venda.
5. **Given** o modal aberto, **When** o jogador escolhe Rescindir, **Then** um diálogo mostra a multa da rescisão e pede confirmação; **And** ao confirmar, o atleta sai do elenco e aparece a mensagem de rescisão.
6. **Given** o modal aberto, **When** o jogador escolhe Renovar, **Then** abre o diálogo de salário e duração do contrato, com a resposta do jogador à proposta, como na renovação de hoje.
7. **Given** um jogador emprestado, ou uma regra que impede a ação (elenco no mínimo, janela fechada, contrato em negociação), **When** o modal abre, **Then** o botão não aplicável fica desativado ou ausente com o motivo escrito, como nas telas atuais.
8. **Given** filtros que não deixam nenhum jogador, **When** a tabela é mostrada, **Then** aparece o estado vazio "Nenhum jogador com esses filtros", com o Limpar filtros à mão.
9. **Given** o elenco de 40 jogadores, **When** a tela abre em 1 440, 1 280 e 1 024 px, **Then** a página não tem rolagem horizontal e a tabela, se não couber, rola dentro do próprio quadro.

---

### User Story 3 - Montar a escalação num campo claro (Priority: P1)

Como jogador, quero montar a escalação num campo claro, com a condição de cada um visível e os desfalques à parte, para escalar sem abrir outras telas.

**Why this priority**: a escalação decide a partida; ver condição e desfalques no mesmo lugar evita escalar errado.

**Independent Test**: abrir a Escalação com jogadores cansados, lesionados e suspensos, trocar esquema e postura, escalar automaticamente e fazer uma troca de lugar só com o teclado.

**Acceptance Scenarios**:

1. **Given** a Escalação aberta, **When** o jogador olha a tela, **Then** vê os controles de esquema e postura, o botão Escalar automaticamente, o aviso de titulares cansados (quando houver) e a mensagem de escalação pronta ou a lista de problemas.
2. **Given** o campo, **When** o jogador olha cada titular, **Then** vê a posição, o nome, a posição natural, a força e a condição, e a leitura é possível sobre o gramado nos dois temas.
3. **Given** a lista de reservas, **When** o jogador a lê, **Then** cada reserva mostra a condição e a contagem de vagas do banco, e uma vaga livre aparece como vaga livre.
4. **Given** jogadores lesionados ou suspensos, **When** o jogador olha a seção "Fora da relação", **Then** vê cada um, com o motivo (lesão, suspensão, pendurado) e quantos jogos faltam.
5. **Given** um jogador selecionado no campo ou na lista, **When** o jogador escolhe o destino, **Then** a troca acontece pelo mouse ou pelo teclado, com a mensagem de troca e as regras de hoje (banco cheio, vaga vazia, fora de posição), e o jogador pode cancelar a seleção.
6. **Given** a escalação inválida (faltam titulares, jogador indisponível escalado), **When** o jogador olha a tela, **Then** os problemas aparecem em destaque, com o que fazer, e a trava de saída com alteração pendente continua avisando.
7. **Given** a escalação ajustada automaticamente pelo jogo (lesão, suspensão), **When** o jogador abre a Escalação, **Then** o aviso do ajuste aparece, com as trocas feitas, até ser dispensado.
8. **Given** o jogador desempregado ou a temporada acabada, **When** abre a Escalação, **Then** vê o estado certo (clube desempregado leva ao Início; temporada acabada diz que não há partida a preparar).

---

### User Story 4 - Teclado, dois temas e dicas nas telas novas (Priority: P2)

Como jogador que usa só o teclado ou o tema claro, quero as três telas igualmente usáveis, com as dicas de primeiro acesso nos lugares certos.

**Why this priority**: a acessibilidade da 016 é uma promessa já feita, e as dicas apontam para elementos que mudam de lugar.

**Independent Test**: percorrer as três telas só com o teclado nos dois temas, disparar os atalhos da 016 e abrir cada tela pela primeira vez com as dicas ligadas.

**Acceptance Scenarios**:

1. **Given** qualquer uma das três telas, **When** o jogador usa Tab e Shift+Tab, **Then** o foco percorre todos os controles numa ordem lógica, sempre visível nos dois temas, e o modal prende o foco e devolve-o à linha de origem ao fechar.
2. **Given** os atalhos da 016, **When** o jogador os usa nas três telas, **Then** continuam respondendo como antes (navegar entre telas, jogar, simular, ajuda).
3. **Given** as dicas de primeiro acesso ligadas, **When** o jogador abre o Início, o Elenco ou a Escalação pela primeira vez, **Then** a dica aponta para o elemento novo equivalente (cartão do próximo jogo, tabela do elenco, campo da escalação), sem apontar para algo que não existe mais.
4. **Given** os dois temas, **When** o jogador usa as três telas, **Then** nenhum texto, barra, selo ou borda fica abaixo do contraste mínimo da 016.

---

### Edge Cases

- **Elenco no limite:** com 40 jogadores, a tela não tem rolagem horizontal da página; com poucos, a tabela não deixa espaços estranhos.
- **Nomes longos** de jogador, de clube adversário ou de competição quebram ou cortam com reticências, sem sobrepor outros elementos.
- **Jogador em negociação, emprestado, em último ano de contrato:** a tabela e o modal mostram a situação e só oferecem o que é permitido.
- **Sem partida pela frente** (temporada acabada, sem mais jogos): o Início troca o cartão do próximo jogo pelo estado correspondente.
- **Clube desempregado (012):** as telas do clube continuam levando ao Início; o Início mostra só o que cabe ao técnico sem clube.
- **Primeira rodada, sem resultados:** os últimos resultados e a forma recente mostram o estado vazio, sem erro.
- **Banco de dados com pouca informação** (jogador sem característica, clube sem rivalidade): os campos ausentes mostram o texto de "nenhuma", sem quebrar o layout.
- **Escalação com seleção aberta** ao trocar de tela: a trava de saída e o cancelamento funcionam como hoje.
- **Janela de tamanho entre 1 024 e 1 440 px:** nada fica cortado nem sobreposto.
- **Dicas apontando para elementos que ainda não existem** (por exemplo, clube sem avisos): a dica é pulada, como hoje.

## Requirements *(mandatory)*

### Functional Requirements

**Início**

- **FR-001**: O Início MUST mostrar, como primeiro bloco, o cartão do próximo jogo com adversário, competição, mando, data, forma recente e as ações Jogar rodada e Simular direto, com o comportamento atual de cada uma.
- **FR-002**: O Início MUST mostrar cada aviso pendente como bloco acionável, com as ações que já existem hoje (inclusive Dispensar): mercado (propostas e contratos que terminam), escalação ajustada, mudanças do elenco na virada e propostas de emprego.
- **FR-003**: O Início MUST mostrar a posição na tabela e os últimos resultados, a torcida e a diretoria com a barra e a tendência, as metas da temporada e as manchetes recentes, com os mesmos dados de hoje.
- **FR-004**: O Início MUST tratar os estados de fim de temporada, clube sem mais jogos, crise financeira, janela de transferências, rodada sem resultados e clube desempregado como hoje, em novos blocos.

**Elenco**

- **FR-005**: O Elenco MUST mostrar a contagem do elenco, os filtros de setor e de condição com Limpar filtros e a tabela com posição, jogador, idade, força, características, situação, lugar na escalação, condição, evolução e contrato, sem coluna de ações, ordenável como hoje.
- **FR-006**: Cada linha do Elenco MUST abrir o modal do jogador ao ser clicada, e o nome do jogador MUST ser um botão que faz o mesmo pelo teclado.
- **FR-007**: O modal do jogador MUST mostrar força e condição em barras, nacionalidade, características, contrato, salário, valor de mercado, evolução e estatísticas da temporada, e os botões Renovar, Vender e Rescindir.
- **FR-008**: Vender MUST pedir confirmação num diálogo com o preço da venda imediata; Rescindir MUST pedir confirmação num diálogo com a multa da rescisão; Renovar MUST abrir o diálogo de salário e duração com a resposta do jogador. Os resultados e as mensagens são os de hoje.
- **FR-009**: O modal MUST aplicar as mesmas regras de hoje para desativar ou ocultar ações (jogador emprestado, elenco no mínimo, janela fechada, negociação em andamento) e dizer o motivo.
- **FR-010**: O Elenco MUST mostrar o estado vazio "Nenhum jogador com esses filtros" e o estado de clube desempregado (012) como hoje.

**Escalação**

- **FR-011**: A Escalação MUST ter esquema e postura, Escalar automaticamente, o aviso de titulares cansados, o campo com os titulares (posição, nome, posição natural, força e condição), as reservas com condição e a seção "Fora da relação" com lesionados e suspensos e o motivo.
- **FR-012**: A Escalação MUST manter todas as funções de montagem de hoje: seleção e troca de lugar por mouse e por teclado, mensagens de troca, banco cheio, vaga vazia, jogador fora de posição, cancelar seleção e trava de saída.
- **FR-013**: A Escalação MUST mostrar a mensagem de escalação pronta ou os problemas da escalação (LineupIssues) e o aviso do ajuste automático (LineupNotice), com o que fazer.
- **FR-014**: A Escalação MUST tratar os estados de clube desempregado, temporada acabada e escalação inválida como hoje, desenhados na nova estrutura.

**Transversais**

- **FR-015**: Nenhuma função das três telas atuais MUST se perder (paridade funcional); nenhum item do mockup que o jogo não tem vira função (por exemplo, a reputação do clube no Início).
- **FR-016**: As três telas MUST ser usáveis só com o teclado e manter os atalhos atuais, nos dois temas, com foco sempre visível e modais que prendem e devolvem o foco.
- **FR-017**: Nas larguras de 1 440, 1 280 e 1 024 px, nenhuma das três telas MUST ter rolagem horizontal da página nem texto cortado; tabelas largas rolam no próprio quadro.
- **FR-018**: As dicas de primeiro acesso MUST apontar para os elementos novos das três telas.
- **FR-019**: Todo texto, plural, formato de número, moeda e data das três telas MUST passar pelo sistema de internacionalização.
- **FR-020**: Nenhuma regra de jogo, dado ou formato de save MUST mudar; nenhum save existente pode ser alterado nem exigir migração.
- **FR-021**: A nota única do 1.0.0 MUST ganhar o que mudou nestas três telas, no mesmo PR; a versão do jogo MUST continuar 1.0.0; o PR MUST ter a base `release/v1.0.0`.
- **FR-022**: Os testes de ponta a ponta de escalação e de venda de jogador MUST continuar passando, atualizados para os novos elementos.

### Key Entities *(include if feature involves data)*

- **Cartão do próximo jogo**: o adversário, a competição, o mando, a data e a forma recente do clube, com as ações de jogar.
- **Aviso acionável**: um item pendente do clube (mercado, escalação ajustada, mudanças do elenco, propostas) com a ação que o resolve.
- **Linha do elenco**: um jogador na tabela, com seus dados resumidos; clicável e com o nome como botão.
- **Modal do jogador**: a visão detalhada de um jogador do elenco, com os dados, as estatísticas e as ações Renovar, Vender e Rescindir.
- **Escalação**: os onze titulares, o esquema, a postura, os reservas e os jogadores fora da relação.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Quem abre o Início vê o próximo jogo e as ações de jogar sem rolar a página em 1 440 × 900 px, e chega a qualquer aviso pendente em no máximo um clique.
- **SC-002**: Na tela de Elenco com 40 jogadores e na Escalação, em 1 440, 1 280 e 1 024 px de largura, nos dois temas, há zero rolagem horizontal da página e zero texto cortado.
- **SC-003**: O jogador abre o modal de qualquer jogador do elenco com um clique na linha ou só com o teclado, e conclui uma venda, uma rescisão ou uma renovação a partir do modal, sem sair da tela do Elenco.
- **SC-004**: 100% das funções das três telas atuais continuam disponíveis (conferidas contra a lista de paridade), e nenhuma função nova nasce.
- **SC-005**: Cada uma das três telas é percorrida inteira só com o teclado, nos dois temas, e 100% dos atalhos da 016 respondem como antes.
- **SC-006**: Nenhum par de texto e fundo, selo ou barra das três telas fica abaixo do contraste mínimo da 016 em nenhum dos dois temas.
- **SC-007**: Os testes de ponta a ponta de escalação e de venda de jogador, atualizados, e a suíte de testes atual passam.
- **SC-008**: A nota do 1.0.0 descreve as três telas novas e a versão do jogo continua 1.0.0.

## Assumptions

- **Telas e funções:** as três telas são as já existentes (Início, Elenco, Escalação); nenhuma tela nova nasce, e a lista de funções que precisam continuar é a de `docs/interface-nova.md` §5 e `docs/design.md` §4 e §6.
- **Renovar no Elenco:** hoje a renovação só existe na aba de contratos do Mercado; o modal do Elenco passa a oferecê-la com o mesmo diálogo, as mesmas regras e as mesmas respostas, e a aba de contratos do Mercado continua como está até a feature 028.
- **Modal do jogador:** reaproveita os dados e as estatísticas dos detalhes de jogador que o jogo já tem; nenhum dado novo é calculado.
- **Mockups como referência:** os arquivos em `docs/interface-nova/` mostram o visual e a composição, não a lista de funções; itens do mockup que o jogo não tem (reputação do clube no Início) não viram função.
- **Fundação da 025:** as três telas usam a barra lateral, o cabeçalho de tela, os tokens e os componentes-base já entregues na 025; esta feature não os redefine.
- **Dicas de primeiro acesso:** o texto das dicas é revisto só onde o elemento mudou de lugar ou de nome.
- **Larguras:** 1 440, 1 280 e 1 024 px são os alvos de validação; a 768 px a estrutura da 025 continua valendo, mas o conteúdo fino das três telas não é critério de aceite.
- **Branch e versão:** a feature sai de `release/v1.0.0` e volta para ela por um PR com essa base; o merge não publica nada; a versão do jogo não muda.
- **Fora de escopo:** novas funções de elenco ou de tática, comparação de jogadores na tela de Elenco, fotos e escudos novos, e o redesenho das outras sete telas do clube (027 a 029).
