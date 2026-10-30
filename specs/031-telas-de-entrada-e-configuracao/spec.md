# Feature Specification: Telas de entrada e configuração

**Feature Branch**: `031-telas-de-entrada-e-configuracao`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: "Refazer as telas de fora da carreira na nova interface: menu inicial, nova carreira (nome do técnico, Sem demissão com explicação e aviso, opções avançadas com seed, banco de dados, país, divisão, busca, tabela de clubes para comparar, clube escolhido e Começar carreira sempre visíveis), carreiras salvas (continuar, exportar, importar, apagar com confirmação, erros de arquivo), configurações, mods (documentação, mod de exemplo, mundo padrão, carregar, remover, planilhas), sobre e notas de versão (versões recolhíveis, fase beta recolhida), ajuda de atalhos e aviso de atualização. Paridade funcional total; itens dos mockups que o jogo não tem (ativar e desativar mods, apagar todos os dados) não viram função; criar uma carreira com 440 clubes continua levando menos de meio segundo; formulários acessíveis; a nota única do 1.0.0 atualizada no mesmo PR e a versão do jogo inalterada." (prompt031, Marco 10)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Abrir o jogo e entender por onde começar (Priority: P1)

Como jogador novo, quero abrir o jogo e entender logo o que é e por onde começar, para não precisar de explicação.

**Why this priority**: é a primeira impressão; um menu confuso perde o jogador antes da primeira partida.

**Independent Test**: abrir o jogo sem nenhuma carreira salva e depois com carreiras salvas, e conferir a chamada principal, as ações e os links.

**Acceptance Scenarios**:

1. **Given** o jogo aberto, **When** o menu inicial aparece, **Then** mostra o nome do jogo, uma chamada principal que diz o que ele é e as ações Nova carreira, Carreiras salvas (com a quantidade de carreiras) e Mods.
2. **Given** uma carreira salva recente, **When** o menu aparece, **Then** a ação de continuar essa carreira continua disponível, como hoje, com técnico, clube e rodada; nenhuma ação nova é criada.
3. **Given** o menu, **When** o jogador olha o rodapé, **Then** vê os links para Configurações, Sobre, Atalhos e a versão do jogo (que leva às notas de versão).
4. **Given** nenhuma carreira salva e nenhuma dica vista, **When** o menu abre, **Then** a dica de primeiro acesso aponta para Nova carreira.
5. **Given** uma versão nova desde a última visita, **When** o menu abre, **Then** o aviso de novidades aparece com o link para as notas e a opção de dispensar, no novo visual.
6. **Given** o armazenamento do navegador indisponível, **When** o menu abre, **Then** o aviso de que não dá para salvar aparece, como hoje.

---

### User Story 2 - Montar uma carreira comparando os clubes (Priority: P1)

Como jogador, quero montar uma carreira escolhendo mundo, país, divisão e clube, com ajuda para comparar os clubes, para começar no clube certo.

**Why this priority**: é o caminho obrigatório para jogar; a escolha do clube é a decisão mais importante da carreira.

**Independent Test**: criar uma carreira escolhendo um clube numa tabela comparativa, com e sem Sem demissão, com mundo padrão e com mod.

**Acceptance Scenarios**:

1. **Given** a tela Nova carreira, **When** ela abre, **Then** o jogador vê o nome do técnico (com o limite de caracteres), a opção Sem demissão com a explicação, o aviso de que ela não muda depois, e as opções avançadas (seed) recolhidas.
2. **Given** o banco de dados, **When** o jogador escolhe o mundo (padrão ou mod carregado), **Then** vê a descrição do mundo e o link para Mods; trocar de mundo atualiza países, divisões e clubes.
3. **Given** um mundo com vários países ou divisões, **When** o jogador filtra por país, divisão e busca por nome ou cidade, **Then** a lista responde na hora e mostra a contagem de clubes; mundos com um só país não mostram o filtro de país.
4. **Given** a lista de clubes, **When** o jogador a lê, **Then** a tabela mostra escudo, clube, reputação, força média, estádio e divisão, ordenáveis, para comparar.
5. **Given** um clube clicado ou escolhido pelo teclado, **When** ele é selecionado, **Then** o clube escolhido e o botão Começar carreira ficam sempre visíveis, sem rolar a página, e o botão mostra "criando carreira" enquanto a carreira é criada.
6. **Given** campos inválidos (nome vazio ou longo demais, nenhum clube escolhido), **When** o jogador tenta começar, **Then** cada erro aparece ligado ao seu campo e o foco vai ao primeiro erro; nada é criado.
7. **Given** um mundo grande (cerca de 440 clubes), **When** o jogador filtra ou cria a carreira, **Then** a lista não trava e a criação leva menos de meio segundo.

---

### User Story 3 - Achar, continuar, exportar, importar e apagar carreiras (Priority: P1)

Como jogador, quero achar, continuar, exportar, importar e apagar minhas carreiras com segurança, para não perder o que construí.

**Why this priority**: as carreiras são o maior valor do jogador; qualquer perda ou apagão acidental destrói a confiança.

**Independent Test**: com duas carreiras, continuar uma, exportar, apagar com confirmação e importar o arquivo; tentar importar um arquivo inválido e um de versão futura.

**Acceptance Scenarios**:

1. **Given** carreiras salvas, **When** a lista abre, **Then** cada uma mostra clube, técnico, divisão, temporada, rodada e a data do último salvamento, com Continuar, Exportar e Apagar.
2. **Given** Apagar, **When** o jogador aciona, **Then** um diálogo pede confirmação (citando técnico e clube) antes de apagar; cancelar não apaga nada.
3. **Given** Exportar, **When** o jogador aciona, **Then** baixa o arquivo da carreira; **And** Importar carreira aceita esse arquivo, inclusive em outro navegador, e a carreira volta na mesma rodada.
4. **Given** um arquivo inválido ou de uma versão futura do jogo, **When** o jogador tenta importar, **Then** a mensagem diz a causa (arquivo inválido ou versão futura) e nada é importado.
5. **Given** uma carreira que não abre (dado corrompido), **When** a lista a mostra, **Then** ela aparece com o aviso e ainda pode ser exportada ou apagada, como hoje.
6. **Given** nenhuma carreira, **When** a lista abre, **Then** um estado vazio leva a Nova carreira e a Importar.

---

### User Story 4 - Ajustar o jogo em Configurações (Priority: P2)

Como jogador, quero ajustar o jogo e ver as dicas de novo quando quiser.

**Why this priority**: ajustes são ocasionais, mas o tema e a velocidade da rodada fazem diferença no conforto.

**Independent Test**: mudar a velocidade padrão, a pausa automática, o tema e o idioma, e mostrar as dicas de novo.

**Acceptance Scenarios**:

1. **Given** Configurações, **When** ela abre, **Then** traz as seções Rodada ao vivo (velocidade padrão e pausa automática), Aparência e idioma (tema claro, escuro ou do sistema, e o idioma), Dicas (mostrar de novo, com a confirmação) e Sobre (versão e links para as notas e para a página Sobre).
2. **Given** uma mudança, **When** o jogador a faz, **Then** ela vale na hora e é lembrada na próxima visita.
3. **Given** Mostrar as dicas de novo, **When** o jogador aciona, **Then** as dicas voltam e uma confirmação em texto aparece.
4. **Given** o mockup, **When** a tela é feita, **Then** NÃO existe a opção de apagar todos os dados.

---

### User Story 5 - Carregar mods e gerar pacotes (Priority: P2)

Como modder, quero carregar mods, baixar o mundo padrão e gerar pacotes por planilha com instruções claras.

**Why this priority**: sustenta a expansão do mundo pela comunidade; menos frequente, mas crítico para quem usa.

**Independent Test**: baixar o mundo padrão, carregar um mod (válido e inválido), remover um mod e usar as planilhas.

**Acceptance Scenarios**:

1. **Given** a tela Mods, **When** ela abre, **Then** traz a introdução, o link da documentação do formato, o mod de exemplo e o mundo padrão para baixar com a descrição.
2. **Given** carregar um .zip, **When** o arquivo é válido, **Then** o mod entra na lista de mods carregados com um resumo (países, divisões, imagens); **When** é inválido, **Then** os erros de validação aparecem com o arquivo e o campo.
3. **Given** um mod com o mesmo identificador de um carregado, **When** o jogador o carrega, **Then** um diálogo pergunta se substitui, como hoje.
4. **Given** um mod carregado, **When** o jogador aciona Remover, **Then** um diálogo pede confirmação antes de remover.
5. **Given** as planilhas, **When** o jogador usa, **Then** exporta e importa clubes e jogadores e gera o pacote, com as instruções.
6. **Given** o mockup, **When** a tela é feita, **Then** NÃO existe ativar e desativar mods: o mod é escolhido na Nova carreira.

---

### User Story 6 - Conhecer o jogo e ler as notas de versão (Priority: P2)

Como jogador, quero conhecer o jogo e acompanhar as novidades de cada versão.

**Why this priority**: informa e dá confiança (privacidade, aviso de que não há nomes reais), mas não bloqueia o jogo.

**Independent Test**: abrir Sobre e Notas de versão e conferir cada seção.

**Acceptance Scenarios**:

1. **Given** a página Sobre, **When** ela abre, **Then** traz a apresentação, "O que dá para fazer", as capturas de tela, o aviso de que não há nomes reais, a privacidade e como levar as carreiras a outro navegador.
2. **Given** as Notas de versão, **When** abrem, **Then** as versões são recolhíveis, a atual vem aberta e as versões que o jogador ainda não tinha visto ficam marcadas com "Nova".
3. **Given** a lista de versões, **When** ela é lida, **Then** a versão nova (1.0.0) vem no topo e, no fim, a seção recolhida "Fase beta" (1.0.0 a 1.10.0, de 20 a 28 de outubro de 2026) tem uma frase explicando o que foi, com as versões antigas rotuladas "beta".

---

### User Story 7 - Ajuda de atalhos e aviso de atualização (Priority: P3)

Como jogador, quero ver os atalhos de qualquer tela e saber quando há uma versão nova.

**Why this priority**: já existem e funcionam; só mudam de visual, sem risco para o fluxo principal.

**Independent Test**: abrir a ajuda de atalhos em duas telas e provocar o aviso de versão nova.

**Acceptance Scenarios**:

1. **Given** qualquer tela, **When** o jogador pede a ajuda de atalhos, **Then** um diálogo mostra os atalhos daquela tela, com o foco preso nele e devolvido ao fechar.
2. **Given** uma versão nova disponível, **When** o aviso aparece, **Then** usa o componente de aviso da nova interface, com Recarregar e o texto de hoje, sem aparecer durante a rodada ao vivo.

---

### Edge Cases

- **Nome do técnico:** vazio, só com espaços ou acima do limite: erro ligado ao campo, foco no campo.
- **Seed:** texto livre, sem formato inválido (o jogo de hoje aceita qualquer texto e nenhuma regra nova é criada); se um erro de criação for ligado a ela, as opções avançadas se abrem sozinhas para mostrá-lo.
- **Sem demissão:** a escolha vale para a carreira inteira e o aviso diz que não muda depois.
- **Mundo sem clubes que passem o filtro:** estado vazio com o caminho para limpar os filtros.
- **Mod escolhido que deixa de existir (removido ou inválido):** a Nova carreira volta ao mundo padrão, como hoje, e o campo Banco de dados mostra o mundo padrão selecionado.
- **Armazenamento indisponível ou cheio:** mensagens de hoje, ligadas à ação que falhou.
- **Importar o mesmo arquivo duas vezes:** a regra de hoje vale (cópia com novo identificador ou aviso), sem perder a carreira existente.
- **Apagar a última carreira:** a lista mostra o estado vazio.
- **Clube escolhido que some do filtro:** a escolha continua visível e válida.
- **Larguras:** sem rolagem horizontal da página em 1 440, 1 280 e 1 024 px; a 768 px vale a estrutura da 025; telas de foco sem a barra lateral.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O menu inicial MUST mostrar o nome, a chamada principal e as ações Nova carreira, Carreiras salvas (com a quantidade) e Mods, mais os links Configurações, Sobre, Atalhos e a versão (que leva às notas de versão).
- **FR-002**: O menu MUST manter a ação de continuar a carreira recente que já existe, o aviso de novidades da versão, o aviso de armazenamento indisponível e a dica de primeiro acesso; nenhuma ação nova é criada.
- **FR-003**: A Nova carreira MUST ter o nome do técnico (com o limite), Sem demissão com a explicação e o aviso de que não muda depois, e as opções avançadas (seed) recolhidas.
- **FR-004**: A Nova carreira MUST ter a escolha do banco de dados (mundo padrão e mods) com a descrição e o link para Mods, e o filtro de país (só em mundos de vários países), de divisão e a busca por nome ou cidade, com a contagem de clubes.
- **FR-005**: A tabela de clubes MUST mostrar escudo, clube, reputação, força média, estádio e divisão, ordenável, e a escolha por clique e por teclado.
- **FR-006**: O clube escolhido e o botão Começar carreira MUST ficar sempre visíveis e o botão MUST mostrar o estado "criando carreira" enquanto a criação acontece.
- **FR-007**: Todo campo dos formulários MUST ter rótulo; todo erro MUST estar ligado ao seu campo e o foco MUST ir ao primeiro erro; nenhuma validação ou mensagem de hoje pode sumir.
- **FR-008**: Criar uma carreira num mundo de 440 clubes MUST levar menos de meio segundo e a lista de clubes MUST filtrar sem travar.
- **FR-009**: As Carreiras salvas MUST listar clube, técnico, divisão, temporada, rodada e a data, com Continuar, Exportar e Apagar, e Importar carreira.
- **FR-010**: Apagar MUST pedir confirmação num diálogo que cita técnico e clube; cancelar MUST não apagar nada.
- **FR-011**: Importar MUST dar mensagens distintas para arquivo inválido e versão futura (015) e MUST NOT importar nada nesses casos; exportar e importar MUST continuar funcionando entre navegadores.
- **FR-012**: As Configurações MUST ter as seções Rodada ao vivo (velocidade padrão e pausa automática), Aparência e idioma (tema claro, escuro ou do sistema, e o idioma), Dicas (mostrar de novo, com a confirmação em texto de que voltarão) e Sobre (versão e links); a opção de apagar todos os dados NÃO existe.
- **FR-013**: A tela Mods MUST ter a introdução, o link da documentação, o mod de exemplo, o mundo padrão para baixar, carregar mod (.zip) com os erros de validação, os mods carregados com Remover (com confirmação) e a substituição de mod com o mesmo identificador (com confirmação), e as planilhas (exportar e importar clubes e jogadores e gerar pacote); ativar e desativar mods NÃO existe.
- **FR-014**: A página Sobre MUST ter a apresentação, "O que dá para fazer", as capturas de tela com texto alternativo, o aviso de que não há nomes reais, a privacidade e como levar as carreiras a outro navegador.
- **FR-015**: As Notas de versão MUST ter as versões recolhíveis com a atual aberta e as versões ainda não vistas marcadas com "Nova" em texto (016; a marca vale pela última versão vista lida antes de a tela gravar a atual como vista); a versão nova no topo e, no fim, a seção recolhida "Fase beta" (1.0.0 a 1.10.0, de 20 a 28 de outubro de 2026) com uma frase explicando o que foi e as versões antigas rotuladas "beta".
- **FR-016**: A ajuda de atalhos MUST ser um diálogo acessível (foco preso e devolvido) e o aviso de atualização MUST usar o componente de aviso da nova interface, sem aparecer durante a rodada ao vivo.
- **FR-017**: Todo diálogo de ação destrutiva (apagar carreira, remover mod, substituir mod) MUST ter foco inicial no botão que cancela, Esc cancelando e foco devolvido ao controle de origem.
- **FR-018**: Estados vazios MUST ser desenhados: sem carreiras salvas, sem mods carregados, sem clube que passe os filtros.
- **FR-019**: Nenhuma opção, validação ou mensagem das telas de hoje pode sumir (paridade, `docs/interface-nova.md` §5); nenhuma regra do jogo, formato de save ou formato de mod muda; os itens dos mockups que o jogo não tem (ativar e desativar mods, apagar todos os dados) NÃO viram função.
- **FR-020**: Todo texto, plural, data e formato MUST vir do i18n; a cor MUST NOT ser o único sinal de estado ou de erro.
- **FR-021**: A feature MUST entrar pela branch `release/v1.0.0` (o PR tem essa base e nada é publicado), acrescentando o que mudou à nota única do 1.0.0 (`docs/interface-nova.md` §6); a versão do jogo não muda.

### Key Entities *(include if feature involves data)*

- **Carreira salva**: o save com clube, técnico, divisão, temporada, rodada e data. Já existe; só muda a apresentação.
- **Mundo (banco de dados)**: o mundo padrão ou um mod carregado, com países, divisões e clubes. Já existe.
- **Mod carregado**: pacote validado e guardado, com resumo. Já existe.
- **Preferências**: velocidade da rodada, pausa automática, tema, idioma, dicas e versão vista. Já existem.
- **Nota de versão**: versão, data e mudanças; a fase beta tem as suas. Já existem.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma pessoa que nunca viu o jogo cria uma carreira e completa uma rodada sem ajuda, no teste de usabilidade pendente da 016, feito com a nova interface (resultado registrado).
- **SC-002**: Criar uma carreira num mundo de 440 clubes leva menos de meio segundo, e filtrar a lista de clubes responde de forma imperceptível (abaixo de 200 ms).
- **SC-003**: Exportar uma carreira e importá-la em outro navegador devolve a carreira na mesma rodada, em todas as tentativas do teste.
- **SC-004**: Em todas as telas da feature, não há rolagem horizontal da página em 1 440, 1 280 e 1 024 px e nenhuma violação grave de acessibilidade nos dois temas.
- **SC-005**: Em todo formulário, cada campo tem rótulo, cada erro está ligado ao campo e o foco vai ao primeiro erro, verificado por teste.
- **SC-006**: 100% das opções, validações e mensagens das telas de hoje continuam disponíveis (checagem contra a lista de paridade).
- **SC-007**: Abrir cada tela da feature não fica mais lento que hoje: a mediana do tempo de abertura fica até 10% acima da medida antes da feature.
- **SC-008**: Os testes de ponta a ponta de nova carreira, carreiras salvas, mods e configurações continuam passando, atualizados.

## Assumptions

- **Telas existentes:** as sete telas já existem (`/`, `/nova-carreira`, `/carreiras`, `/configuracoes`, `/mods`, `/sobre`, `/notas-de-versao`); nenhuma tela nova nasce, e a lista do que precisa continuar é a de `docs/interface-nova.md` §5 e `docs/design.md` §11 e §12.
- **Continuar no menu:** o menu de hoje já oferece continuar a carreira recente; isso é paridade e fica. O pedido de não criar "Continuar carreira" refere-se a um item novo dos mockups que o jogo não tem.
- **Fundação e telas anteriores:** as telas usam os tokens, os componentes-base (`Tabs`, `Card`, `Notice`, `Badge`, `EmptyState`, `DataTable`, `Dialog`, `Field`) e os padrões das features 025 a 030; as telas de fora da carreira não têm a barra lateral.
- **Mundo de 440 clubes:** é o tamanho de referência do mundo grande; o plano confirma com os mundos que o repositório já tem.
- **Teste de usabilidade:** é feito por uma pessoa, com um roteiro; o resultado é registrado na especificação ou na linha de base, e não é automatizável.
- **Capturas da página Sobre:** continuam as geradas por `pnpm screenshots`; o plano decide se precisam ser regeneradas com a nova interface.
- **Dicas de primeiro acesso:** continuam funcionando; o texto e a âncora são revistos onde o elemento mudou de lugar.
- **Larguras:** 1 440, 1 280 e 1 024 px são os alvos de validação; a 768 px vale a estrutura da 025.
- **Branch e versão:** a feature sai de `release/v1.0.0` e volta para ela por um PR com essa base; o merge não publica nada; a versão do jogo não muda.
- **Fora de escopo:** editor de mods embutido, novas opções de jogo, conta de usuário, sincronização em nuvem, e as telas do clube (025 a 030).
