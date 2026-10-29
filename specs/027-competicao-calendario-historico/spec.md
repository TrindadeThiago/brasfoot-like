# Feature Specification: Competição, calendário e histórico

**Feature Branch**: `027-competicao-calendario-historico`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "Refazer as telas de acompanhamento do mundo e da temporada na nova interface: Competição (abas Minhas competições e Demais competições, cartões por competição, classificação, resultados, artilharia, chaveamento, fases, campanha), Calendário mensal (um mês por página, dias de jogo destacados) e Histórico (as abas existentes, com estado vazio explicativo), sem perder nenhuma função. Entra na branch release/v1.0.0 e acrescenta à nota única do 1.0.0." (`docs/speckit-prompts/marco10/prompt027.md`)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trocar de país e de competição e ler a tabela (Priority: P1)

Como jogador, quero trocar de país e de competição sem me perder, e ver a classificação, os resultados e a artilharia de cada uma, começando pelas competições que meu clube disputa.

**Why this priority**: é a tela de acompanhamento mais usada depois do Início, e hoje a faixa de abas por nome não escala para um mundo com dezenas de competições.

**Independent Test**: com o mundo padrão, abrir a Competição, conferir as duas abas, escolher uma competição de outro país e uma continental, e ler classificação, resultados e artilharia de cada uma.

**Acceptance Scenarios**:

1. **Given** uma carreira aberta, **When** o jogador abre a Competição, **Then** vê duas abas, **Minhas competições** (a padrão) e **Demais competições**, e a competição principal do clube já escolhida.
2. **Given** a aba Minhas competições, **When** o jogador olha os cartões, **Then** vê uma competição por cartão, para as que o clube disputa ou vai disputar na temporada (inclusive as de que já saiu), com a situação em cada cartão: em disputa, eliminado ou "começa em" uma data.
3. **Given** a aba Demais competições, **When** o jogador a abre, **Then** vê as outras competições do banco, com o seletor de país e a contagem de competições, e escolhe uma delas pelo cartão.
4. **Given** uma competição escolhida, **When** é de liga, **Then** o jogador vê as seções Classificação, Resultados e Artilharia, com as divisões da competição, e o clube dele destacado em toda tabela em que aparece.
5. **Given** a classificação, **When** o jogador lê as linhas, **Then** as zonas de acesso, rebaixamento e vaga continental estão marcadas com texto ou rótulo além da cor, e a forma recente de cada clube aparece.
6. **Given** uma competição em que o clube joga, **When** ela é escolhida, **Then** o painel de campanha do clube aparece; **And** nas competições em que o clube não joga aparece o aviso "seu clube não participa", sem o painel.
7. **Given** uma competição que ainda não começou, **When** é escolhida, **Then** o jogador vê o início, a vaga (quem se classifica) e o formato, em vez de uma tabela vazia.
8. **Given** um mundo de um só país ou de uma só competição, **When** o jogador abre a Competição, **Then** a tela continua clara, sem seletores inúteis.

---

### User Story 2 - Entender um mata-mata e as fases de relance (Priority: P1)

Como jogador, quero entender um mata-mata de relance, com o meu clube destacado e o caminho até a final, e ver as fases (grupos e mata-mata) com a origem das vagas.

**Why this priority**: copas, taças continentais e estaduais com grupos são a parte mais difícil de ler hoje.

**Independent Test**: abrir uma copa, uma taça continental e um estadual com grupos e mata-mata e conferir chaveamento, fases, origem das vagas e campanha.

**Acceptance Scenarios**:

1. **Given** uma competição de mata-mata, **When** o jogador a escolhe, **Then** vê o Chaveamento, com as rodadas em colunas, os confrontos com placar (e pênaltis, quando houver), o clube do jogador destacado e o caminho dele até a final.
2. **Given** uma competição com fases (grupos e mata-mata), **When** o jogador a escolhe, **Then** navega entre as fases, vê as tabelas dos grupos e o mata-mata, e vê a origem das vagas dos participantes.
3. **Given** um chaveamento de 32 clubes, **When** a tela abre e rola, **Then** continua legível e sem travar, rolando dentro do próprio quadro quando não cabe.
4. **Given** o mundo padrão, **When** o jogador parte da tela de Competição, **Then** chega à classificação, ao chaveamento e à campanha de uma competição continental e de um estadual em no máximo dois cliques.
5. **Given** uma competição sem classificados ou sem jogos, **When** é escolhida, **Then** aparece um estado vazio explicativo, e não uma área em branco.

---

### User Story 3 - Calendário mensal com os dias de jogo (Priority: P1)

Como jogador, quero um calendário mensal que mostre, nos dias de jogo, o adversário e o resultado, e me leve ao próximo jogo.

**Why this priority**: o calendário atual é uma lista; o jogador quer ver a temporada como mês e achar o próximo jogo de imediato.

**Independent Test**: abrir o Calendário no meio da temporada, navegar entre meses, filtrar por competição, escolher um dia de jogo e usar "Ir para o próximo jogo".

**Acceptance Scenarios**:

1. **Given** o Calendário, **When** ele abre, **Then** mostra um mês por página, no mês do próximo jogo, com setas de mês anterior e próximo.
2. **Given** a faixa de meses, **When** o jogador a olha, **Then** vê cada mês da temporada com a contagem de jogos, e escolhe um deles; **And** o atalho "Ir para o próximo jogo" volta ao mês do próximo jogo.
3. **Given** um dia de jogo, **When** o jogador olha o dia no mês, **Then** vê o adversário, o mando e o resultado (jogo disputado) ou a fase (jogo futuro), com uma faixa de cor por resultado nos disputados e por competição nos futuros, e a cor nunca é a única informação (V, E, D e o nome da competição aparecem em texto).
4. **Given** o mês aberto, **When** o jogador procura o dia atual e o próximo jogo, **Then** ambos estão marcados.
5. **Given** o filtro por competição, **When** o jogador escolhe uma, **Then** o calendário mostra só os jogos dela.
6. **Given** um dia de jogo escolhido (clique ou teclado), **When** ele o seleciona, **Then** um painel mostra data, adversário, mando, competição, fase, resultado e as ações Resumo e Ver jogos da rodada, como na tela atual.
7. **Given** quem navega só pelo teclado, **When** ele usa o calendário, **Then** o calendário em grade é navegável por setas, cada dia tem texto equivalente para leitor de tela e o painel do dia traz a mesma informação e as mesmas ações.
8. **Given** uma temporada completa, **When** o calendário abre e o jogador troca de mês, **Then** a resposta é imediata, sem travar.

---

### User Story 4 - Consultar o histórico de qualquer temporada (Priority: P2)

Como jogador, quero consultar campeões, artilheiros, recordes e lendas de qualquer temporada, mesmo antes de ter uma temporada encerrada.

**Why this priority**: é consulta, não decisão de jogo; mas hoje o vazio e a navegação são pouco claros.

**Independent Test**: abrir o Histórico antes e depois de uma temporada encerrada e percorrer as abas.

**Acceptance Scenarios**:

1. **Given** o Histórico, **When** o jogador o abre, **Then** vê as abas Temporadas, Títulos, Artilheiros, Recordes, Clubes, Copas e Continental, e a de Estaduais quando houver histórico de estaduais.
2. **Given** nenhuma temporada encerrada, **When** o jogador abre qualquer aba, **Then** vê um estado vazio que explica o que aparecerá e quando.
3. **Given** uma temporada encerrada, **When** o jogador a escolhe na aba Temporadas, **Then** vê o resumo dela, com as classificações finais das temporadas passadas, como hoje.
4. **Given** o Histórico, **When** o jogador quer ver a trajetória como técnico, **Then** há uma ligação para ela.
5. **Given** tabelas largas do Histórico, **When** o espaço não basta, **Then** rolam dentro do quadro, com a primeira coluna fixa quando for útil.

---

### User Story 5 - Telas rápidas, acessíveis e sem rolagem da página (Priority: P2)

Como jogador, quero que as três telas abram e rolem sem travar em qualquer largura, sem depender só de cor para entender zonas e resultados.

**Why this priority**: calendários de temporada inteira, classificações com forma e chaveamentos de 32 clubes são os pontos mais pesados da interface.

**Independent Test**: abrir as telas em 1 440, 1 280 e 1 024 px, nos dois temas, com o mundo padrão e com um mundo grande, só com o teclado.

**Acceptance Scenarios**:

1. **Given** qualquer uma das três telas, **When** abre em 1 440, 1 280 ou 1 024 px, **Then** a página não tem rolagem horizontal, e tabelas com mais colunas do que cabem rolam no próprio quadro.
2. **Given** as telas nos dois temas, **When** o jogador as lê, **Then** o contraste respeita o mínimo da 016 e cor nunca é o único sinal.
3. **Given** só o teclado, **When** o jogador percorre as telas, **Then** alcança cartões, abas, divisões, fases, dias do calendário e abas do histórico, com foco visível e os atalhos atuais funcionando.
4. **Given** um país sem competições, uma competição sem jogos ou sem classificados, **When** o jogador chega a elas, **Then** vê um estado vazio ou de erro desenhado.

---

### Edge Cases

- **Competição em que a vaga ainda está em disputa:** não participa nem tem vaga confirmada; o plano decide se aparece em Minhas competições com a situação "vaga em disputa" ou em Demais competições, e a escolha vale para todo o mundo.
- **Competição de que o clube já saiu:** continua em Minhas competições, com a situação "eliminado".
- **Competição que ainda não começou:** mostra início, vaga e formato.
- **Mundo de um só país, ou só uma competição:** o seletor de país e a segunda aba não aparecem vazios; a tela mostra só o que existe.
- **Estadual:** só o da região do clube entra em Minhas competições; os demais estão em Demais.
- **Mês sem jogos:** o calendário do mês aparece vazio com a mensagem "Sem jogos neste mês", e as setas continuam.
- **Dia com mais de um jogo (liga e copa no mesmo dia):** o dia mostra todos, sem esconder nenhum.
- **Temporada encerrada:** o calendário mostra os jogos disputados; o "Ir para o próximo jogo" fica desativado e diz por quê.
- **Clube desempregado (012):** o calendário e a competição seguem as regras de hoje para quem não tem clube.
- **Nomes longos** de competição, clube ou fase quebram ou cortam com reticências sem sobrepor outros elementos.
- **Classificação de temporada passada:** abre como hoje, em tabela larga que rola no quadro.
- **Mundo grande** (dezenas de países): trocar de país e de competição continua rápido.

## Requirements *(mandatory)*

### Functional Requirements

**Competição**

- **FR-001**: A Competição MUST ter duas abas, **Minhas competições** (a padrão) e **Demais competições**, e cada competição MUST ser um cartão selecionável, no lugar da faixa de abas por nome.
- **FR-002**: Minhas competições MUST listar as competições que o clube disputa ou vai disputar na temporada (inclusive as de que já saiu), com a situação em cada cartão: em disputa, eliminado, encerrada ou "começa em" uma data (ou "vaga confirmada", quando a data ainda não é conhecida); o critério MUST ser definido em dados (o clube participa ou tem vaga confirmada).
- **FR-003**: Demais competições MUST listar as outras, com o seletor de país e a contagem de competições.
- **FR-004**: Para uma competição de liga, a tela MUST mostrar Classificação, Resultados e Artilharia e as divisões; para um mata-mata, o Chaveamento; para uma competição com fases, a navegação entre fases com a origem das vagas.
- **FR-005**: A classificação MUST marcar as zonas de acesso, rebaixamento e vaga continental com rótulo em texto além da cor, mostrar a forma recente e destacar o clube do jogador.
- **FR-006**: O painel de campanha do clube MUST aparecer só nas competições em que ele joga; nas demais, MUST aparecer o aviso "seu clube não participa".
- **FR-007**: Uma competição que ainda não começou MUST mostrar início, vaga e formato.
- **FR-008**: O Chaveamento MUST mostrar os confrontos com placar e pênaltis, destacar o clube do jogador e o caminho dele até a final.
- **FR-009**: Resultados e Artilharia MUST manter tudo o que as telas atuais mostram, inclusive a navegação por rodada e por divisão.

**Calendário**

- **FR-010**: O Calendário MUST ser mensal, um mês por página, abrir no mês do próximo jogo, com setas de mês anterior e próximo, a faixa de meses com a contagem de jogos e o atalho "Ir para o próximo jogo".
- **FR-011**: O dia de jogo MUST mostrar adversário, mando e resultado (disputado) ou fase (futuro), com faixa de cor por resultado e por competição e sempre com o texto equivalente; o próximo jogo e o dia atual MUST estar marcados.
- **FR-012**: O Calendário MUST ter filtro por competição, painel do jogo escolhido (data, adversário, mando, competição, fase, resultado, gols e cartões, Resumo e Ver jogos); não há lista dos jogos do mês, porque o painel e a grade dão a mesma informação.
- **FR-013**: O Calendário MUST ser usável só com o teclado e MUST mostrar todos os jogos de um dia que tenha mais de um.

**Histórico**

- **FR-014**: O Histórico MUST ter as abas Temporadas, Títulos, Artilheiros, Recordes, Clubes, Copas e Continental, e a de Estaduais quando existir histórico, com estado vazio explicativo antes da primeira temporada encerrada.
- **FR-015**: O Histórico MUST manter o resumo de cada temporada e as classificações de temporadas passadas, e ter uma ligação para a trajetória do técnico.

**Transversais**

- **FR-016**: Tabelas largas das três telas MUST rolar dentro do próprio quadro, com a primeira coluna fixa quando for útil.
- **FR-017**: Calendário de uma temporada completa, classificação de 20 clubes com forma e chaveamentos de 32 clubes MUST abrir e rolar sem travar.
- **FR-018**: Estados vazios e de erro MUST ser desenhados: competição sem jogos, sem classificados, país sem competições, mês sem jogos.
- **FR-019**: Cor MUST NOT ser o único sinal nas zonas da tabela e nos resultados (V, E, D).
- **FR-020**: Todo texto, plural e formato de número e data MUST passar pelo sistema de internacionalização.
- **FR-021**: Nenhuma regra de jogo, dado ou formato de save MUST mudar; nenhum save existente pode ser alterado nem exigir migração; nenhuma função atual MUST se perder (paridade funcional).
- **FR-022**: Os atalhos de teclado atuais, a ajuda de atalhos, as dicas de primeiro acesso e a trava de saída MUST continuar funcionando nas três telas.
- **FR-023**: A nota única do 1.0.0 MUST ganhar o que mudou nestas telas, no mesmo PR; a versão do jogo MUST continuar 1.0.0; o PR MUST ter a base `release/v1.0.0`.
- **FR-024**: Os testes de ponta a ponta de competição e de histórico MUST continuar passando, atualizados para os novos elementos.

### Key Entities *(include if feature involves data)*

- **Cartão de competição**: uma competição do banco, com o nome, o país (ou "entre países"), o formato e a situação do clube nela (em disputa, eliminado, começa em, não participa).
- **Participação do clube**: o critério, em dados, que define se uma competição entra em Minhas competições (o clube participa ou tem vaga confirmada).
- **Dia de jogo**: um dia do calendário com um ou mais jogos do clube, cada um com adversário, mando, competição, fase e resultado.
- **Mês do calendário**: um mês da temporada, com os dias e a contagem de jogos.
- **Chaveamento**: as rodadas de um mata-mata com os confrontos e o caminho do clube.
- **Aba do histórico**: uma das visões de consulta das temporadas encerradas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Com o mundo padrão, o jogador chega à classificação, ao chaveamento e à campanha de uma competição continental e de um estadual em no máximo dois cliques a partir da tela de Competição.
- **SC-002**: Em 1 440, 1 280 e 1 024 px de largura, nos dois temas, nenhuma das três telas tem rolagem horizontal da página nem texto cortado; tabelas mais largas que o espaço rolam no próprio quadro.
- **SC-003**: O calendário de uma temporada completa, a classificação de 20 clubes com forma e um chaveamento de 32 clubes abrem e respondem à rolagem e à troca de mês sem travar perceptivelmente (resposta em até 1 segundo).
- **SC-004**: Em 100% das zonas da tabela e dos resultados do calendário, o sinal tem texto ou rótulo além da cor.
- **SC-005**: As três telas são usadas inteiras só com o teclado, nos dois temas, e 100% dos atalhos da 016 respondem como antes.
- **SC-006**: Nenhum par de texto e fundo, selo ou faixa fica abaixo do contraste mínimo da 016 em nenhum dos dois temas.
- **SC-007**: 100% do que as telas atuais mostram continua disponível (conferido contra a lista de paridade), inclusive as classificações de temporadas passadas.
- **SC-008**: Os testes de ponta a ponta de competição e de histórico, atualizados, e a suíte atual passam; a nota do 1.0.0 descreve as três telas e a versão continua 1.0.0.

## Assumptions

- **Telas existentes:** Competição, Calendário e Histórico já existem; nenhuma tela nova nasce, e a lista do que precisa continuar é a de `docs/interface-nova.md` §5 e `docs/design.md` §3.
- **Critério de Minhas competições:** definido em dados (o clube participa ou tem vaga confirmada). Para uma competição em que a vaga ainda está em disputa, a suposição é mostrá-la em **Demais competições**, com a indicação "vaga em disputa" no cartão; o plano pode inverter, com justificativa, desde que valha para todo o mundo.
- **Estaduais:** como hoje, só o da região do clube aparece ao lado das nacionais em Minhas competições; os demais ficam em Demais competições.
- **Calendário:** mostra os jogos do clube do jogador, como a tela atual; calendário de outros clubes ou da liga inteira está fora de escopo.
- **Histórico:** as abas e os dados são os de hoje; a aba de Estaduais continua condicionada à existência de histórico regional.
- **Fundação da 025 e telas da 026:** as telas usam a barra lateral, os tokens, os componentes-base e os padrões de modal e linha clicável já entregues.
- **Larguras:** 1 440, 1 280 e 1 024 px são os alvos de validação; a 768 px vale a estrutura da 025.
- **Dicas de primeiro acesso:** continuam funcionando; o texto e a âncora são revistos onde o elemento mudou de lugar.
- **Branch e versão:** a feature sai de `release/v1.0.0` e volta para ela por um PR com essa base; o merge não publica nada; a versão do jogo não muda.
- **Fora de escopo:** gráficos de evolução, comparação entre temporadas, novas estatísticas, calendário de outros clubes e as demais telas do clube (028 a 029).
