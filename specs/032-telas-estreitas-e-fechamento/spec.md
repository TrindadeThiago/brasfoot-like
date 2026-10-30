# Feature Specification: Telas estreitas, acessibilidade e fechamento do marco

**Feature Branch**: `032-telas-estreitas-e-fechamento`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: "Fechamento da refatoração visual (Marco 10): adaptação a telas menores (de 768 px em diante sem rolagem horizontal da página; abaixo disso a barra lateral empilha e as colunas viram uma só), revisão de acessibilidade nos dois temas com o critério da 016, revisão de desempenho com a lista de metas da 020 como teto, consistência com docs/interface-nova.md e remoção do estilo antigo, dicas, ajuda de atalhos e aviso de atualização revisados, vitrine (capturas do Sobre e da página do jogo com a interface nova e o tema escuro, ícones, design.md e README), nota do 1.0.0 revisada para resumir o marco, gates do release sobre a branch e lançamento oficial por PR de release/v1.0.0 para a main com merge commit, tag v1.0.0 e Release do GitHub como lançamento." (prompt032, Marco 10)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Jogar em tablet ou em janela estreita (Priority: P1)

Como jogador em um tablet ou em uma janela estreita, quero jogar sem rolar a página para os lados, para usar o jogo inteiro em qualquer tamanho razoável de tela.

**Why this priority**: a interface nova foi desenhada para telas largas; sem esta adaptação ela não cabe num tablet e o lançamento deixa de servir a parte do público.

**Independent Test**: percorrer todas as telas, do menu à rodada ao vivo, em 1 440, 1 024 e 768 px de largura (e numa janela abaixo disso), nos dois temas, e conferir que a página não rola na horizontal, que nenhum texto é cortado e que nenhuma função some.

**Acceptance Scenarios**:

1. **Given** qualquer tela do jogo, **When** a janela tem de 768 px de largura em diante, **Then** a página não tem rolagem horizontal e todo texto e botão ficam inteiros e acessíveis.
2. **Given** uma janela abaixo de 768 px, **When** uma tela do clube abre, **Then** a barra lateral empilha acima do conteúdo, as colunas viram uma só e nenhuma função some.
3. **Given** uma tabela larga (classificação, elenco, mercado), **When** ela não cabe na largura, **Then** só a própria tabela rola na horizontal, nunca a página, e a primeira coluna continua identificável.
4. **Given** a rodada ao vivo em 768 px, **When** o jogo está em andamento ou pausado, **Then** o placar, o minuto, o estado, os controles e o painel Meu time continuam usáveis sem rolagem horizontal.
5. **Given** o texto ampliado pelo jogador (zoom do navegador a 200%), **When** uma tela abre, **Then** o conteúdo se reorganiza em uma coluna sem rolagem horizontal da página.
6. **Given** o nome longo de clube ou de jogador, **When** ele aparece numa tela estreita, **Then** quebra em linhas ou aparece com reticências e o nome completo continua acessível, sem estourar a largura.

---

### User Story 2 - Acessibilidade tão boa quanto na 016, nos dois temas (Priority: P1)

Como jogador com baixa visão, que usa leitor de tela ou só o teclado, quero que o jogo continue tão acessível quanto na 016, nos dois temas, para jogar com a interface nova sem perder nada.

**Why this priority**: a acessibilidade é um compromisso do projeto desde a 016; a interface nova refez todas as telas e ela precisa ser reverificada inteira antes do lançamento.

**Independent Test**: rodar a revisão de acessibilidade em todas as telas e diálogos, nos dois temas, e percorrer só com o teclado os fluxos de nova carreira, rodada ao vivo, mercado e diretoria.

**Acceptance Scenarios**:

1. **Given** o tema claro e o escuro, **When** se mede o contraste de texto e de componentes (bordas de campos, ícones, estados), **Then** todo texto normal tem pelo menos 4,5:1 e todo componente ou texto grande tem pelo menos 3:1.
2. **Given** qualquer elemento focável, **When** ele recebe o foco, **Then** há indicador de foco visível nos dois temas, e a ordem de tabulação segue a ordem visual da tela.
3. **Given** qualquer controle, imagem informativa, tabela, região ou diálogo, **When** um leitor de tela o encontra, **Then** ele tem nome acessível, cada tela tem um título principal e as regiões e títulos formam uma estrutura coerente.
4. **Given** a nova carreira, a rodada ao vivo (inclusive substituir, trocar a posição e responder a lesão ou goleiro expulso), o mercado e a diretoria, **When** o jogador usa só o teclado, **Then** conclui cada fluxo sem precisar do mouse.
5. **Given** a rodada ao vivo, **When** acontecem gols, expulsões, lesões, intervalo e fim, **Then** o leitor de tela anuncia os do meu jogo, em ordem, sem repetir e sem anunciar os de outros jogos.
6. **Given** a preferência do sistema por movimento reduzido, **When** o jogo é usado, **Then** animações e transições não essenciais ficam reduzidas ou desligadas, sem perder informação.
7. **Given** estado, erro, destaque ou seleção em qualquer tela, **When** a cor é removida, **Then** o significado continua claro por texto ou símbolo.

---

### User Story 3 - Desempenho sem regressão (Priority: P2)

Como jogador, quero que a interface nova abra e navegue tão rápido quanto a anterior e que tabelas longas não travem, para que o visual novo não custe fluidez.

**Why this priority**: o marco promete "sem regressão de desempenho"; as features anteriores mediram cada tela, mas falta a revisão do conjunto antes de publicar.

**Independent Test**: medir abertura, navegação entre telas e tabelas longas contra a lista de metas da 020 e contra as linhas de base das features anteriores, e conferir que o tempo da virada de temporada e o tamanho do save não mudam.

**Acceptance Scenarios**:

1. **Given** as metas de desempenho da 020 (dia, virada de temporada, memória, tamanho do save), **When** a interface nova é medida num mundo grande, **Then** nenhuma meta é ultrapassada.
2. **Given** a virada de temporada, **When** ela roda com a interface nova, **Then** leva o mesmo tempo de antes (dentro da variação de medição) e o save tem o mesmo tamanho.
3. **Given** uma tabela longa (440 clubes, elencos, classificações, mercado), **When** o jogador ordena, filtra ou rola, **Then** a interface responde sem travar.
4. **Given** a abertura de cada tela e a navegação entre elas, **When** medidas, **Then** ficam dentro da tolerância definida no plano em relação à linha de base de cada feature.
5. **Given** o pacote do jogo, **When** o primeiro carregamento termina, **Then** ele continua funcionando offline e o tamanho do pacote fica dentro do limite definido no plano.

---

### User Story 4 - Interface consistente e sem estilo antigo (Priority: P2)

Como pessoa que mantém o jogo, quero que todas as telas usem os mesmos elementos de projeto, para que a interface seja coerente e fácil de manter.

**Why this priority**: o marco refez as telas em dez features; sobraram valores soltos, cópias de componentes e estilo antigo que podem divergir e quebrar o tema.

**Independent Test**: revisar cada tela contra `docs/interface-nova.md` e conferir que não há cor, espaçamento ou tamanho solto fora dos tokens, que não há cópia de componente compartilhado e que o estilo antigo sem uso foi removido.

**Acceptance Scenarios**:

1. **Given** cada tela e cada diálogo, **When** revistos contra `docs/interface-nova.md`, **Then** usam os tokens de cor, espaçamento, raio e tipografia em vez de valores soltos.
2. **Given** um padrão que já existe como componente compartilhado (cartão, aviso, selo, campo, diálogo, tabela, estado vazio, medidor, abas), **When** uma tela precisa dele, **Then** usa o componente compartilhado, sem cópia própria.
3. **Given** o código de estilo, **When** revisado, **Then** não há regra, arquivo ou texto de interface que não seja mais usado.
4. **Given** a revisão cruzada, **When** termina, **Then** a lista do que foi ajustado está registrada e nenhuma função de nenhuma tela foi perdida.

---

### User Story 5 - Dicas, atalhos e aviso de atualização revisados (Priority: P2)

Como jogador novo, quero que as dicas de primeiro acesso apontem para os elementos certos da interface nova, para que me ajudem de verdade.

**Why this priority**: as dicas e a ajuda de atalhos foram escritas para a interface antiga e apontam para elementos que mudaram de lugar ou de nome.

**Independent Test**: abrir cada tela com as dicas ligadas e conferir que cada dica aponta para um elemento que existe, e abrir a ajuda de atalhos e o aviso de atualização em todas as telas.

**Acceptance Scenarios**:

1. **Given** cada dica de primeiro acesso, **When** a tela abre, **Then** a dica aponta para um elemento que existe na interface nova, na posição certa, em 768 px e em 1 440 px.
2. **Given** a ajuda de atalhos, **When** aberta em cada tela, **Then** lista os atalhos que de fato existem naquela tela, com o texto atual.
3. **Given** uma versão nova disponível, **When** o aviso aparece, **Then** usa o visual novo, não cobre controles importantes em telas estreitas e nunca aparece na rodada ao vivo.

---

### User Story 6 - Vitrine atualizada (Priority: P2)

Como visitante da página do jogo, quero ver capturas que mostrem a interface de verdade, para saber o que vou encontrar.

**Why this priority**: as capturas e a documentação ainda mostram ou descrevem a interface antiga e a numeração antiga; é a primeira coisa que um visitante vê.

**Independent Test**: abrir a página Sobre, a página do jogo e a documentação do projeto e conferir que as capturas mostram a interface nova, no tema escuro, e que os textos citam a numeração nova.

**Acceptance Scenarios**:

1. **Given** a página Sobre, **When** abre, **Then** as capturas mostram a interface nova no tema escuro, com o texto alternativo descrevendo o que aparece.
2. **Given** a página do jogo (a vitrine pública do projeto), **When** abre, **Then** as capturas e a descrição mostram a interface nova.
3. **Given** os ícones do aplicativo, **When** revistos, **Then** continuam legíveis nos fundos claro e escuro e coerentes com a interface nova, sem redesenho da identidade.
4. **Given** a documentação do projeto (`docs/design.md`, README), **When** lida, **Then** descreve a interface nova, o estado do marco 10 e a numeração nova, sem citar a numeração antiga como a atual.

---

### User Story 7 - Lançamento oficial 1.0.0 (Priority: P1)

Como pessoa que mantém o jogo, quero fechar o marco com um lançamento oficial verificado, para publicar a versão 1.0.0 com a interface nova inteira e sem surpresas.

**Why this priority**: é o objetivo do marco; sem ele o trabalho das oito features fica parado na branch.

**Independent Test**: rodar os gates do release sobre a branch de release, conferir a nota do 1.0.0 e os textos de versão, e (só quando autorizado) abrir o PR para a `main` e conferir a tag e o Release.

**Acceptance Scenarios**:

1. **Given** a nota do 1.0.0 enriquecida pelas features anteriores, **When** é revisada, **Then** resume o marco inteiro (o que mudou na interface) e diz que o jogo e os saves seguem os mesmos, sem repetir detalhes de cada parte.
2. **Given** a branch de release, **When** os gates do release rodam (simulações de 30 temporadas, verificação do release e e2e completo), **Then** todos passam, e o que falhar é corrigido na própria branch antes do PR final.
3. **Given** os gates verdes, **When** o PR de `release/v1.0.0` para a `main` é aberto e mesclado com merge commit, **Then** o histórico das features é preservado e o fluxo de release publica a versão 1.0.0 com a tag `v1.0.0` e o Release do GitHub como lançamento, não como pré-lançamento.
4. **Given** a versão publicada, **When** o jogo, a página Sobre e a página de notas abrem, **Then** mostram "versão 1.0.0", e as notas da fase beta ficam acessíveis na seção recolhida "Fase beta".
5. **Given** a documentação do projeto, **When** lida depois do lançamento, **Then** cita a numeração nova e o estado final do marco 10, e as branches de feature já mescladas podem ser apagadas.
6. **Given** a `main` congelada durante o marco, **When** o lançamento acontece, **Then** é a primeira e única publicação do marco, sem releases no meio.

---

### Edge Cases

- **Janela redimensionada com um diálogo aberto:** o diálogo cabe na janela estreita e o conteúdo dele rola dentro dele, sem rolagem da página.
- **Rodada ao vivo em 768 px com o painel Meu time aberto:** o painel e o placar não se sobrepõem; todas as ações continuam acessíveis.
- **Tabela larga em janela estreita:** a rolagem fica dentro da tabela e a ordem de tabulação continua coerente.
- **Orientação do tablet (retrato e paisagem):** as duas funcionam; a retrato usa a estrutura de 768 px.
- **Tema claro e tema escuro com preferência do sistema:** "seguir o sistema" muda os dois sem recarregar e sem perder contraste.
- **Zoom e texto grande:** o texto ampliado não corta rótulos nem sobrepõe controles.
- **Preferência de movimento reduzido ligada durante o jogo:** vale na hora, sem recarregar.
- **Um gate do release falha:** corrige-se na branch de release e os gates rodam de novo; o PR para a `main` só abre com todos verdes.
- **Conflito ao mesclar na `main`:** se a `main` recebeu uma correção urgente, ela é mesclada na branch de release antes e o conflito em versão e notas se resolve a favor do 1.0.0.
- **Versão já publicada:** se a tag `v1.0.0` já existisse, o fluxo de release não publicaria; antes do PR confere-se que ela está livre (as tags da fase beta têm o prefixo `beta-`).
- **Sem rede depois do primeiro carregamento:** o jogo abre e funciona; as capturas da página Sobre carregam do pacote.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Todas as telas e diálogos do jogo, do menu à rodada ao vivo, MUST ser usáveis de 768 px de largura em diante, sem rolagem horizontal da página, sem texto cortado e sem perda de função, nos dois temas.
- **FR-002**: Abaixo de 768 px, a barra lateral MUST empilhar acima do conteúdo e as colunas MUST virar uma só, sem perda de função; a versão dedicada ao telefone não faz parte desta feature.
- **FR-003**: Tabelas largas MUST rolar só dentro de si na horizontal, nunca a página, com o conteúdo identificável; nomes longos MUST quebrar ou usar reticências sem estourar a largura.
- **FR-004**: A revisão de acessibilidade MUST seguir o mesmo critério da 016 nos temas claro e escuro: contraste mínimo de 4,5:1 no texto normal e 3:1 no texto grande e nos componentes, foco visível, ordem de tabulação coerente, nome acessível em todo controle, títulos e regiões coerentes e tabelas com legenda e cabeçalhos.
- **FR-005**: Os fluxos de nova carreira, rodada ao vivo (substituir, trocar posição, responder a lesão e a goleiro expulso), mercado e diretoria MUST poder ser concluídos só com o teclado.
- **FR-006**: Os eventos do meu jogo na rodada ao vivo MUST ser anunciados ao leitor de tela, em ordem e sem repetição, sem anunciar os de outros jogos.
- **FR-007**: O jogo MUST respeitar a preferência do sistema por movimento reduzido em todas as telas; cor MUST NOT ser o único sinal de estado, erro, destaque ou seleção.
- **FR-008**: A abertura de cada tela, a navegação entre telas e as tabelas longas MUST ficar dentro das metas de desempenho da 020 e da tolerância definida no plano em relação às linhas de base das features anteriores.
- **FR-009**: A interface nova MUST NOT aumentar o tempo da virada de temporada nem o tamanho do save.
- **FR-010**: O pacote MUST continuar funcionando offline depois do primeiro carregamento, e seu tamanho MUST ficar dentro do limite definido no plano.
- **FR-011**: Toda tela MUST ser revista contra `docs/interface-nova.md`: tokens de cor, espaçamento, raio e tipografia em vez de valores soltos, componentes compartilhados em vez de cópias, e o estilo e os textos antigos sem uso MUST ser removidos, sem perda de função.
- **FR-012**: As dicas de primeiro acesso MUST apontar para elementos que existem na interface nova, também em telas estreitas; a ajuda de atalhos MUST listar os atalhos reais de cada tela; o aviso de atualização MUST usar o visual novo, MUST NOT cobrir controles importantes em telas estreitas e MUST NOT aparecer na rodada ao vivo.
- **FR-013**: As capturas da página Sobre e da página do jogo MUST ser regeneradas com a interface nova e o tema escuro, com texto alternativo; os ícones do aplicativo MUST ser revistos sem redesenhar a identidade.
- **FR-014**: A documentação do projeto (`docs/design.md`, README) MUST ser atualizada com a interface nova, o estado do marco 10 e a numeração nova; nada MUST citar a numeração antiga como a atual.
- **FR-015**: A nota do 1.0.0 MUST ser revisada para resumir o marco inteiro (o que mudou na interface) e dizer que o jogo e os saves seguem os mesmos; as notas da fase beta MUST continuar acessíveis na seção recolhida "Fase beta", com as versões rotuladas "beta".
- **FR-016**: Antes do PR final, os gates do release (simulações de 30 temporadas, verificação do release e e2e completo) MUST rodar sobre a branch de release e passar; o que falhar MUST ser corrigido nela.
- **FR-017**: O lançamento MUST ser um PR de `release/v1.0.0` para a `main` com merge commit; o fluxo de release MUST criar a tag `v1.0.0` e o Release do GitHub como lançamento (não pré-lançamento); a `main` MUST ficar congelada até esse PR, sem releases no meio do marco.
- **FR-018**: Depois da publicação, o jogo, a página Sobre e a página de notas MUST mostrar "versão 1.0.0".
- **FR-019**: Nenhuma mudança MUST ocorrer no motor, nas regras, no formato de save ou nos dados; nenhuma faixa numérica das simulações e do balanceamento MUST mudar (constituição, princípios I e VI).
- **FR-020**: Todo texto novo ou alterado MUST vir do i18n (princípio VII); as branches de feature já mescladas PODEM ser apagadas depois do lançamento.

### Key Entities *(include if feature involves data)*

- **Lista de metas de desempenho (020)**: os tetos de tempo do dia, da virada de temporada, de memória e de tamanho do save. Já existe; esta feature mede contra ela.
- **Nota do 1.0.0**: o resumo do marco, acrescido pelas features 025 a 031. Já existe; é revisada aqui.
- **Branch de release**: `release/v1.0.0`, onde o marco foi desenvolvido; é de onde sai o lançamento.
- **Capturas e ícones**: imagens da página Sobre e da página do jogo, e os ícones do aplicativo. Já existem; são regenerados.
- **Linhas de base das features**: as medidas de tamanho e de abertura registradas em cada feature (025 a 031), usadas como referência.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Percorrendo o jogo em 1 440, 1 024 e 768 px de largura, nos dois temas, 100% das telas e diálogos abrem sem rolagem horizontal da página, sem texto cortado e sem perda de função.
- **SC-002**: A revisão de acessibilidade não encontra nenhum contraste abaixo do mínimo, nenhum foco invisível e nenhum elemento sem nome acessível, nos dois temas, em 100% das telas e diálogos.
- **SC-003**: Os quatro fluxos principais (nova carreira, rodada ao vivo, mercado, diretoria) são concluídos só com o teclado, em todas as tentativas do teste.
- **SC-004**: O tempo da virada de temporada e o tamanho do save ficam iguais aos de antes da interface nova (dentro da variação de medição) e nenhuma meta da 020 é ultrapassada.
- **SC-005**: A abertura de cada tela e o tamanho do pacote ficam dentro da tolerância e do limite que o plano definir; o jogo abre offline depois do primeiro carregamento.
- **SC-006**: Os testes de ponta a ponta, de simulação e de balanceamento passam sem alterar nenhuma faixa numérica.
- **SC-007**: 100% das capturas da página Sobre e da página do jogo mostram a interface nova no tema escuro.
- **SC-008**: Os gates do release passam na branch de release antes do PR final.
- **SC-009**: Depois do merge na `main`, a tag `v1.0.0` e o Release do GitHub (como lançamento) existem, e o jogo, a página Sobre e a página de notas mostram "versão 1.0.0", com as notas da fase beta na seção recolhida.

## Assumptions

- **Telefone fora do escopo:** abaixo de 768 px o jogo é usável (barra empilhada, uma coluna), mas a versão dedicada ao telefone continua pós-lançamento (`docs/design.md` §14).
- **"Página do jogo":** é a vitrine pública do projeto (a página inicial do repositório e a descrição do site); as capturas dela e as da página Sobre usam as mesmas imagens regeneradas.
- **Metas da 020:** os tetos de dia, virada, memória e tamanho do save da lista de metas da 020 são os limites desta feature; a tolerância das medidas de abertura (hoje 10%) e o limite do tamanho do pacote são definidos no plano.
- **Critério de acessibilidade:** o da 016 (contraste de 4,5:1 e 3:1, foco visível, nomes acessíveis, teclado, anúncios, movimento reduzido); nenhum critério novo é criado.
- **Lançamento sob autorização:** abrir o PR para a `main` e mesclá-lo publica a versão 1.0.0 de verdade (tag, Release e site); isso só acontece quando a pessoa que mantém o jogo pedir, depois dos gates verdes. Esta feature prepara tudo até o PR e o documenta.
- **Sem mudança de dados:** motor, regras, formato de save, formato de mod e dados do jogo não mudam; a revisão de desempenho só corrige a interface.
- **Features 025 a 031 concluídas:** já estão na `release/v1.0.0`; os itens abertos delas (teste de usabilidade da 031) não bloqueiam esta feature, mas entram na revisão final.
- **Fora de escopo:** versão para telefone, novas funções de jogo, novos idiomas e redesenho do ícone e da identidade além do que a interface nova pedir.
