# Feature Specification: Fundação visual e estrutura do jogo

**Feature Branch**: `025-fundacao-visual-estrutura`

**Created**: 2026-10-28

**Status**: Draft

**Input**: User description: "Base da nova interface: linguagem visual, tema claro e escuro, componentes compartilhados e a estrutura de navegação do jogo — prompt `docs/speckit-prompts/marco10/prompt025.md`."

## Contexto

Primeira feature do **Marco 10 — Nova interface**, a refatoração visual do jogo (ver `docs/interface-nova.md`). O marco **não muda nenhuma regra**: motor, saves e dados ficam como estão. Esta feature entrega a **fundação**: a linguagem visual, os dois temas, os componentes compartilhados e a estrutura de navegação. As telas são refeitas nas features 026 a 031; até lá, as telas atuais **continuam funcionando**, herdando o novo visual e a nova estrutura.

A direção visual vem dos mockups exportados do Claude Design (`docs/interface-nova/`), que desenham o tema escuro. O **tema claro não foi desenhado** e é parte desta feature.

Esta feature também **reinicia a numeração de versões**: as versões 1.0.0 a 1.10.0 passam a ser a **fase beta**, e o jogo volta a se chamar 1.0.0, até o lançamento oficial no fim do marco (`docs/interface-nova.md` §6). As tags e os Releases da fase beta já foram renomeados para `beta-vX.Y.Z`.

A feature é desenvolvida na branch `release/v1.0.0`: o merge dela **não publica nada**, porque o release só dispara na `main`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navegar pelo clube numa barra lateral (Priority: P1)

Como jogador, quero chegar a qualquer tela do clube a partir de uma barra lateral que mostre onde estou e avise o que pede atenção, para não precisar procurar nada.

**Why this priority**: é a mudança mais visível do marco e a estrutura em que todas as telas se apoiam; sem ela as próximas features não têm onde entrar.

**Independent Test**: abrir uma carreira e percorrer as dez telas do clube pela barra lateral, conferindo a tela ativa, os contadores e os links do rodapé.

**Acceptance Scenarios**:

1. **Given** uma carreira aberta, **When** o jogador olha a barra lateral, **Then** vê as dez telas do clube (Início, Elenco, Escalação, Competição, Calendário, Finanças, Histórico, Mercado, Carreira, Notícias), cada uma com um ícone, e a tela atual destacada.
2. **Given** propostas de emprego pendentes ou negociações do mercado que pedem resposta, **When** o jogador olha a barra lateral, **Then** a tela correspondente mostra um contador com a quantidade.
3. **Given** qualquer tela do clube, **When** o jogador usa o rodapé da barra, **Then** chega ao Menu inicial, às Configurações e à ajuda de Atalhos de teclado.
4. **Given** qualquer tela do clube, **When** ela abre, **Then** o título dela mostra o clube, o técnico, a série, a temporada e a rodada.
5. **Given** o jogador sem clube (desempregado), **When** abre a carreira, **Then** a barra mostra só as telas que o estado permite e as telas do clube continuam levando ao Início, como hoje.
6. **Given** a rodada ao vivo ou outra tela de foco, **When** a tela abre, **Then** não há barra lateral e há um jeito claro de voltar ou sair.

---

### User Story 2 - Visual consistente em todas as telas (Priority: P1)

Como jogador, quero um visual limpo e consistente, com títulos e números fáceis de ler, em todas as telas, mesmo nas que ainda não foram refeitas.

**Why this priority**: a fundação só vale se alcançar o jogo inteiro; telas com aparências diferentes quebram a identidade que o marco busca.

**Independent Test**: abrir todas as telas atuais (as dez do clube, rodada ao vivo, fim de temporada, menu inicial, nova carreira, carreiras salvas, configurações, mods, sobre e notas de versão) e conferir fontes, cores, espaçamentos e componentes.

**Acceptance Scenarios**:

1. **Given** qualquer tela atual, **When** ela abre, **Then** usa as mesmas fontes, cores, espaçamentos e raios, e nenhum texto, botão ou tabela fica com o visual antigo.
2. **Given** tabelas largas das telas atuais, **When** a janela é estreita, **Then** a tabela rola dentro do próprio quadro e a página não ganha rolagem horizontal.
3. **Given** botões, abas, campos, diálogos, avisos, selos e barras de indicador nas telas atuais, **When** o jogador os usa, **Then** todos têm a mesma aparência e os mesmos estados (normal, foco, desativado, selecionado, erro).
4. **Given** o jogo sem conexão com a internet, **When** uma tela abre, **Then** as fontes e os ícones aparecem normalmente, sem nada vindo de fora.

---

### User Story 3 - Tema escuro e claro com a mesma qualidade (Priority: P1)

Como jogador, quero escolher entre o tema escuro, o claro e o do sistema, e ter os três com a mesma qualidade.

**Why this priority**: o tema claro não foi desenhado e é a maior lacuna da fundação; dois temas pela metade seriam pior que um só.

**Independent Test**: percorrer todas as telas nos dois temas e verificar contraste e legibilidade; trocar o tema nas Configurações e conferir que ele vale em todas as telas.

**Acceptance Scenarios**:

1. **Given** as Configurações, **When** o jogador escolhe Escuro, Claro ou Sistema, **Then** o jogo muda na hora em todas as telas e a escolha fica salva.
2. **Given** o tema Sistema, **When** a preferência do sistema operacional muda, **Then** o jogo acompanha.
3. **Given** qualquer tela nos dois temas, **When** o jogador lê textos, selos, barras e bordas, **Then** o contraste respeita o mínimo da revisão de acessibilidade da 016.
4. **Given** o campo da escalação, que é sempre gramado escuro, **When** o tema é o claro, **Then** os cartões e textos sobre o campo continuam legíveis.
5. **Given** um jogador que já tinha uma preferência de tema, **When** abre a nova versão, **Then** a preferência é respeitada, sem precisar escolher de novo.

---

### User Story 4 - Teclado, atalhos e comportamentos atuais intactos (Priority: P2)

Como jogador que usa só o teclado, quero que tudo continue acessível, com foco sempre visível e os mesmos atalhos de navegação.

**Why this priority**: a acessibilidade da 016 é uma promessa já feita; uma refatoração visual não pode regredir nela.

**Independent Test**: percorrer a barra lateral e uma tela do clube só com o teclado, e disparar cada atalho da 016.

**Acceptance Scenarios**:

1. **Given** qualquer tela, **When** o jogador usa Tab e Shift+Tab, **Then** o foco passa pela barra lateral e pelo conteúdo numa ordem lógica, com o foco sempre visível nos dois temas.
2. **Given** os atalhos de teclado da 016, **When** o jogador os usa, **Then** continuam navegando e jogando a rodada como antes, e a ajuda de atalhos continua abrindo em todas as telas.
3. **Given** uma alteração pendente (por exemplo, uma escalação inválida), **When** o jogador tenta sair da tela, **Then** a trava de saída continua avisando, como hoje.
4. **Given** as dicas de primeiro acesso, **When** o jogador abre uma tela pela primeira vez, **Then** elas continuam aparecendo, ligadas aos elementos certos da nova estrutura.
5. **Given** o aviso de atualização, **When** uma nova versão está disponível, **Then** ele continua aparecendo e funcionando.

---

### User Story 5 - Numeração reiniciada e notas da fase beta (Priority: P2)

Como jogador, quero que o jogo mostre a versão 1.0.0 e que as notas de versão mantenham o histórico, para eu saber em que versão estou e o que mudou antes.

**Why this priority**: sem o reinício, a numeração do marco não fecha com o lançamento oficial no fim; e as notas antigas não podem se perder nem se confundir com as novas.

**Independent Test**: abrir o menu inicial, a página Sobre e a página de notas de versão e conferir a versão exibida, a nota do 1.0.0 e a seção da fase beta.

**Acceptance Scenarios**:

1. **Given** o jogo, **When** o jogador abre o menu inicial ou a página Sobre, **Then** vê "versão 1.0.0".
2. **Given** a página de notas de versão, **When** ela abre, **Then** mostra uma única nota nova, a do 1.0.0, e, no fim, uma seção recolhida "Fase beta".
3. **Given** a seção "Fase beta", **When** o jogador a abre, **Then** vê as 23 notas antigas (1.0.0 a 1.10.0, de 21 a 28 de outubro de 2026), rotuladas como "beta 1.10.0" e assim por diante, com uma frase explicando que o jogo passou por uma fase beta.
4. **Given** um jogador que tinha visto a 1.10.0, **When** abre o jogo na versão 1.0.0, **Then** vê o aviso de novidades da nova versão.
5. **Given** as verificações de publicação, **When** elas procuram a nota da versão atual, **Then** encontram a do 1.0.0 e nunca uma nota da fase beta.

---

### Edge Cases

- **Janela estreita:** a partir de 768 px de largura, nenhuma tela ganha rolagem horizontal da página; abaixo disso, a barra lateral empilha acima do conteúdo, sem perder nenhuma tela.
- **Nome de clube ou de técnico muito longo:** o título da tela e a barra lateral quebram ou cortam com reticências sem sobrepor outros elementos.
- **Contadores grandes:** um contador com muitos itens não estoura o espaço dele.
- **Fontes que não carregam:** se uma fonte falhar, o texto continua legível com uma fonte substituta, sem layout quebrado.
- **Clube desempregado:** o comportamento atual (012) é mantido, inclusive o redirecionamento das telas do clube para o Início.
- **Carregamento e erro de carreira:** as mensagens de "carregando" e de erro continuam aparecendo dentro da nova estrutura.
- **Telas ainda não refeitas:** elementos com cor fixa do visual antigo não podem ficar ilegíveis no tema claro.
- **Preferências e saves antigos:** abrem normalmente; nenhum save é alterado.
- **Troca de tema com a rodada ao vivo em andamento:** a rodada não é interrompida.
- **Primeiro acesso sem preferência salva:** o jogo abre no tema do sistema (a opção "Sistema" é o padrão hoje) e cai no escuro quando o sistema não informa preferência.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O jogo MUST ter um conjunto único de elementos visuais básicos (cores, tipografia, espaçamento, raio, estados) para os dois temas, que todas as telas usam, e a cor de destaque MUST ser um parâmetro do tema, de modo que mudar o destaque não exija refazer telas.
- **FR-002**: O jogo MUST ter o tema escuro, o tema claro e o tema do sistema; a escolha MUST ficar salva como hoje e valer na hora em todas as telas.
- **FR-003**: Os dois temas MUST cumprir o mesmo contraste mínimo da revisão de acessibilidade da 016 para textos, selos, barras, bordas e foco, em todas as telas.
- **FR-004**: As fontes dos títulos e dos números (Space Grotesk) e do texto corrido (Inter) MUST ser distribuídas com o jogo, e nenhuma fonte ou ícone pode ser pedido a servidores externos.
- **FR-005**: O jogo MUST ter componentes compartilhados: botões (primário, secundário, perigo e só texto), cartão, abas, tabela com rolagem própria, selo, barra de indicador (condição, força, confiança), campos e seletores, diálogo, aviso (informação, atenção e perigo), estado vazio e rótulo de seção; todos com os mesmos estados em ambos os temas.
- **FR-006**: Dentro da carreira, o jogo MUST ter uma barra lateral com as dez telas do clube, ícones, a tela atual destacada e contadores de atenção (propostas de emprego pendentes e negociações do mercado), mais um rodapé com Menu inicial, Configurações e Atalhos de teclado.
- **FR-007**: Cada tela do clube MUST mostrar um título com o clube, o técnico, a série, a temporada e a rodada.
- **FR-008**: As telas de foco (rodada ao vivo, fim de temporada e as telas de fora da carreira) MUST ter uma estrutura sem a barra lateral, com um jeito claro de voltar ou sair.
- **FR-009**: As telas atuais MUST continuar funcionando e MUST ficar coerentes com a nova estrutura sem exigir que já estejam refeitas: herdam o novo visual, e nenhuma delas pode ficar ilegível em nenhum dos temas.
- **FR-010**: As tabelas largas das telas atuais MUST rolar dentro do próprio quadro, sem rolagem horizontal da página.
- **FR-011**: A partir de 768 px de largura, a estrutura MUST funcionar sem rolagem horizontal da página; abaixo disso, a barra lateral MUST empilhar acima do conteúdo.
- **FR-012**: Os atalhos de teclado, a ajuda de atalhos, a trava de saída com alterações pendentes, as dicas de primeiro acesso, o aviso de atualização e o comportamento de clube desempregado MUST continuar como estão.
- **FR-013**: A navegação por teclado MUST alcançar a barra lateral e o conteúdo, com o foco sempre visível nos dois temas.
- **FR-014**: Todo texto novo MUST passar pelo sistema de internacionalização, em frases completas.
- **FR-015**: Nenhuma regra, dado ou formato de save MUST mudar; nenhum save existente pode ser alterado nem exigir migração.
- **FR-016**: O jogo MUST funcionar sem conexão depois do primeiro carregamento, como hoje.
- **FR-017**: A versão do jogo MUST passar a ser 1.0.0 e aparecer assim no menu inicial e na página Sobre.
- **FR-018**: As 23 notas de versão da fase beta (1.0.0 a 1.10.0) MUST ser preservadas, sem perder nenhuma, num arquivo próprio; as notas da versão atual MUST ficar separadas e começar por uma única nota do 1.0.0, que as próximas features enriquecem.
- **FR-019**: A página de notas de versão MUST mostrar a nota do 1.0.0 e, no fim, uma seção recolhida "Fase beta" com as notas antigas rotuladas como "beta" e uma frase que explique o que foi a fase.
- **FR-020**: As verificações de publicação (versão e notas) MUST continuar funcionando e MUST NOT confundir uma nota da fase beta com a da versão atual.
- **FR-021**: O aviso de novidades MUST aparecer para quem já tinha visto uma versão anterior diferente, inclusive a 1.10.0.

### Key Entities *(include if feature involves data)*

- **Tema**: o conjunto de cores e estados do jogo (escuro, claro ou o do sistema), com a cor de destaque como parâmetro; a escolha do jogador fica na preferência salva.
- **Tela do clube**: cada uma das dez telas de dentro da carreira, listadas na barra lateral.
- **Tela de foco**: tela sem a barra lateral (rodada ao vivo, fim de temporada e telas de fora da carreira).
- **Contador de atenção**: o número que a barra lateral mostra ao lado de uma tela quando há algo pendente (propostas de emprego, negociações do mercado).
- **Nota de versão**: uma versão do jogo, a data e a lista do que mudou; as da fase beta ficam à parte e aparecem rotuladas como "beta".

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: As 19 telas atuais (as dez do clube, rodada ao vivo, fim de temporada, menu inicial, nova carreira, carreiras salvas, configurações, mods, sobre e notas de versão) abrem na nova estrutura, nos dois temas e em 1440, 1024 e 768 px de largura, sem texto cortado, sem elementos sobrepostos e sem rolagem horizontal da página.
- **SC-002**: Nenhum par de texto e fundo, selo, barra ou foco, em nenhuma tela e em nenhum dos dois temas, fica abaixo do contraste mínimo da 016.
- **SC-003**: Um jogador chega a cada uma das dez telas do clube a partir da barra lateral só com o teclado, e 100% dos atalhos da 016 continuam respondendo como antes.
- **SC-004**: Com o jogo sem conexão, 100% das telas abrem com as fontes e os ícones corretos, e nenhuma requisição de fonte ou ícone sai para fora do jogo.
- **SC-005**: Trocar o tema vale em todas as telas na hora, sem recarregar, e a escolha sobrevive a fechar e abrir o jogo.
- **SC-006**: O fluxo de criar uma carreira e jogar uma rodada continua completando sem erro e sem ajuda, e os testes automatizados atuais passam.
- **SC-007**: O tempo até a primeira tela utilizável do jogo e o tamanho do pacote publicado não pioram além do que o plano justificar; como referência, o tempo de abertura não piora mais de 10% em relação à versão 1.10.0.
- **SC-008**: Todos os lugares que mostram a versão mostram 1.0.0; a página de notas mostra uma nota do 1.0.0 e a seção "Fase beta" com exatamente as 23 notas antigas, e as verificações de publicação passam.
- **SC-009**: Quem abre a nova versão depois de ter visto a 1.10.0 vê o aviso de novidades.

## Assumptions

- **Dez telas do clube**: as da barra lateral são as já existentes (Início, Elenco, Escalação, Competição, Calendário, Finanças, Histórico, Mercado, Carreira e Notícias); nenhuma tela nova nasce nesta feature, e clube desempregado vê só as que o estado permite, como hoje.
- **Contadores de atenção**: os que a interface atual já mostra (propostas de emprego pendentes e negociações do mercado); novos contadores ficam para as features das telas.
- **Cor de destaque**: é um parâmetro interno do tema, com o verde do jogo como valor padrão; o jogador **não** escolhe o destaque nesta feature.
- **Tema claro**: já existe no jogo (016), mas com a paleta antiga, e não foi desenhado nos mockups; a paleta nova dele é definida no plano, derivada do escuro, e validada pelo mesmo critério de contraste. O campo da escalação segue sempre gramado escuro nos dois temas.
- **Tema padrão**: "Sistema", como hoje, quando não há preferência salva; o escuro é o valor de reserva quando o sistema não informa preferência.
- **Tamanho de tela**: o alvo é de 768 px em diante; a versão para telefone fica no pós-lançamento (`docs/design.md` §14).
- **Telas atuais**: o conteúdo e a composição delas só mudam nas features 026 a 031; aqui elas herdam o visual. Onde uma tela atual tiver um detalhe visual que não cabe na estrutura nova, a correção mínima é feita aqui e o redesenho fica para a feature da tela.
- **Dicas de primeiro acesso**: continuam funcionando; o texto e a ligação aos elementos de cada tela são revistos nas features das telas.
- **Mockups como referência**: os arquivos em `docs/interface-nova/` mostram o visual e a composição, não a lista de funções (`docs/interface-nova.md` §5).
- **Fontes**: licenças livres para uso e redistribuição com o jogo; a verificação delas fica no plano.
- **Versão e branch**: a versão 1.0.0 vale até o lançamento oficial; a feature é entregue por um PR com base `release/v1.0.0`, e o merge não publica nada; os testes que dependem das notas passam a olhar a nota do 1.0.0.
- **Fora de escopo**: refazer o conteúdo das telas (026 a 031), versão para telefone, novas funções de jogo, ilustrações e escudos.
