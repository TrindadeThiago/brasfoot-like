# Feature Specification: Aplicação web, novo jogo e saves

**Feature Branch**: `004-app-web-saves`

**Created**: 2026-10-16

**Status**: Draft

**Input**: User description: "Aplicação web base: criar uma nova carreira, gerenciar saves e navegar pelo jogo (ver docs/design.md §2, §7, §12 e §15) — prompt `docs/speckit-prompts/marco2/prompt004.md`."

## Clarifications

### Session 2026-10-16

- Q: A 004 inclui uma ação provisória para avançar rodadas antes da rodada ao vivo (006)? → A: Sim — "Simular próxima rodada", resultado instantâneo com escalação automática também para o clube do jogador; vira a entrada da rodada ao vivo na 006.

## Contexto

Primeira feature do Marco 2 (uma temporada jogável no navegador) e primeira com interface. O
motor já existe (Marco 1): mundo fictício, motor de partida e temporada de pontos corridos com
tabela, disciplina e estatísticas. Esta feature entrega a casca do jogo: criar carreira, salvar,
continuar e navegar. Escalação (005) e rodada ao vivo (006) vêm nas próximas features.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Criar uma carreira escolhendo um clube (Priority: P1)

O jogador abre o jogo, escolhe "Nova carreira", informa o nome do técnico e escolhe livremente
qualquer clube da Série A, comparando as informações básicas de cada um (escudo, nome, cidade,
reputação, força média do elenco, capacidade do estádio). Ao confirmar, entra no jogo como técnico
do clube escolhido.

**Why this priority**: é a porta de entrada do jogo; sem carreira não há nada para jogar.

**Independent Test**: criar uma carreira com um nome e um clube e conferir que a tela inicial do
clube mostra o nome do técnico, o clube escolhido, a temporada e a rodada 1.

**Acceptance Scenarios**:

1. **Given** o jogo aberto pela primeira vez, **When** o jogador escolhe "Nova carreira", **Then**
   vê os 20 clubes da Série A com escudo, nome, cidade, reputação, força média e capacidade do
   estádio, e pode ordená-los por esses critérios.
2. **Given** o jogador informou o nome "Ana Souza" e escolheu um clube, **When** confirma,
   **Then** a carreira é criada e ele vê a tela inicial do clube com seu nome, o clube, a
   temporada e a rodada 1 de 38.
3. **Given** o campo de nome vazio ou só com espaços, **When** o jogador tenta confirmar, **Then**
   a criação é bloqueada com uma mensagem clara.
4. **Given** dois jogadores que criam carreiras com o mesmo clube e a mesma seed informada,
   **When** comparam o calendário e os elencos, **Then** são idênticos.

---

### User Story 2 - Saves: continuar, várias carreiras, apagar (Priority: P1)

O jogador pode sair e voltar sem perder progresso. Tem várias carreiras salvas, vê de cada uma o
técnico, o clube, a temporada, a rodada e quando foi salva pela última vez, escolhe qual continuar
e apaga as que não quer.

**Why this priority**: "sair e voltar sem perder progresso" é o objetivo da feature; sem saves o
jogo não é jogável.

**Independent Test**: criar duas carreiras com clubes diferentes, recarregar a página, conferir
que as duas aparecem com seus dados, continuar cada uma e ver o estado certo; apagar uma e
conferir que a outra não muda.

**Acceptance Scenarios**:

1. **Given** uma carreira criada, **When** o jogador recarrega a página e escolhe "Continuar",
   **Then** volta exatamente ao mesmo ponto (clube, temporada, rodada, tabela).
2. **Given** duas carreiras salvas, **When** o jogador abre a lista de carreiras, **Then** vê as
   duas com técnico, clube (com escudo), temporada, rodada e data/hora do último salvamento,
   ordenadas da mais recente para a mais antiga.
3. **Given** duas carreiras, **When** o jogador avança uma delas, **Then** a outra permanece
   exatamente como estava.
4. **Given** uma carreira, **When** o jogador escolhe apagá-la e confirma, **Then** ela some da
   lista e não pode mais ser aberta; sem confirmação, nada é apagado.
5. **Given** um save criado por uma versão anterior do jogo, **When** o jogador o abre, **Then** o
   save é migrado para a versão atual e abre corretamente, sem perder dados.

---

### User Story 3 - Salvamento automático ao fim de cada rodada (Priority: P2)

Ao fim de cada rodada disputada, o jogo salva sozinho. O jogador nunca perde mais do que a rodada
em andamento.

**Why this priority**: autosave é requisito do design (§12) e base para a rodada ao vivo (006).
Depende de US2.

**Independent Test**: usar "Simular próxima rodada", recarregar a página sem salvar manualmente
e conferir que a rodada avançada foi mantida.

**Acceptance Scenarios**:

1. **Given** uma carreira na rodada 3, **When** o jogador usa "Simular próxima rodada", **Then**
   vê os resultados da rodada 3, a carreira é salva automaticamente e um indicador discreto
   confirma o salvamento.
2. **Given** a rodada 3 terminada e salva, **When** o jogador recarrega a página, **Then**
   continua na rodada 4.
3. **Given** uma falha ao salvar (ex.: armazenamento cheio), **When** o salvamento automático é
   tentado, **Then** o jogador vê um aviso claro e o jogo continua utilizável.

---

### User Story 4 - Navegar pelas telas principais (Priority: P2)

Dentro de uma carreira, o jogador navega entre as telas principais — Início do clube, Elenco,
Competição e Calendário — com uma interface moderna, legível e com atalhos de teclado.

**Why this priority**: é a estrutura sobre a qual escalação (005) e rodada ao vivo (006) serão
construídas. Pode ser desenvolvida em paralelo com US2/US3 após US1.

**Independent Test**: dentro de uma carreira, visitar as quatro telas pelo menu e pelos atalhos
de teclado, conferindo o conteúdo de cada uma.

**Acceptance Scenarios**:

1. **Given** uma carreira aberta, **When** o jogador está no Início do clube, **Then** vê o
   próximo jogo (adversário, mando, rodada), a posição do clube na tabela e os últimos resultados.
2. **Given** a tela Elenco, **When** ela é aberta, **Then** lista todos os jogadores do clube com
   posição, nome, idade, força e características, ordenável por qualquer coluna, sem mostrar
   atributos ocultos.
3. **Given** a tela Competição, **When** ela é aberta, **Then** mostra a tabela da Série A com
   posição, clube (com escudo), pontos, jogos, V, E, D, gols pró, gols contra, saldo e últimos
   resultados, com o clube do jogador destacado.
4. **Given** a tela Calendário, **When** ela é aberta, **Then** mostra as 38 rodadas com os jogos
   do clube do jogador (adversário, mando e, se disputado, o placar), com a próxima rodada
   destacada.
5. **Given** qualquer tela do jogo, **When** o jogador usa os atalhos de teclado, **Then** navega
   entre as quatro telas sem o mouse, e um atalho de ajuda lista todos os atalhos.

---

### Edge Cases

- Nome de técnico muito longo → limitado a 40 caracteres, com aviso.
- Nenhuma carreira salva → a tela inicial oferece só "Nova carreira" (sem "Continuar").
- Save corrompido ou ilegível → aparece na lista marcado como danificado, não abre, pode ser
  apagado; as demais carreiras não são afetadas.
- Save de versão futura (mais nova que o jogo) → não abre, com mensagem explicando que é de uma
  versão mais nova; não é alterado.
- Armazenamento local indisponível (ex.: navegação privada que o bloqueia) → aviso claro na
  abertura; o jogo deixa jogar, avisando que nada será salvo.
- Armazenamento cheio ao salvar → aviso claro; o estado em memória continua.
- Duas abas abertas com a mesma carreira → a aba que salva por último prevalece; o jogo avisa ao
  detectar que a carreira foi alterada em outra aba.
- Seed informada manualmente inválida (vazia) → usa uma seed gerada automaticamente.
- Fim da temporada (rodada 38 concluída) → a tela inicial mostra que a temporada acabou, com a
  tabela final; virada de temporada fica para o Marco 3.
- Janela abaixo de 1280px → o layout continua utilizável sem barra de rolagem horizontal na
  página até 1024px; abaixo disso pode ficar apertado, mas não quebra.

## Requirements *(mandatory)*

### Functional Requirements

**Carreira**

- **FR-001**: O jogador DEVE poder criar uma carreira informando o nome do técnico (1 a 40
  caracteres, sem contar espaços nas pontas) e escolhendo qualquer clube da Série A do banco
  padrão.
- **FR-002**: A escolha de clube DEVE mostrar, para cada clube: escudo, nome, cidade, reputação,
  força média do elenco (média dos 16 melhores, mesmo critério do motor) e capacidade do
  estádio, permitindo ordenar por reputação, força e estádio.
- **FR-003**: Ao criar a carreira, o jogo DEVE copiar o banco padrão para dentro da carreira,
  completar os atributos ocultos com a seed da carreira e criar a temporada da Série A com essa
  seed. Mudanças futuras no banco padrão do jogo não afetam carreiras existentes.
- **FR-004**: A seed da carreira DEVE ser gerada automaticamente; o jogador PODE informar uma seed
  própria (opção avançada) — mesma seed e mesmo clube ⇒ mesma carreira.
- **FR-005**: Os atributos ocultos dos jogadores NUNCA DEVEM ser exibidos na interface.

**Saves**

- **FR-006**: Cada carreira DEVE ser salva localmente no navegador, sem servidor; várias carreiras
  DEVEM coexistir sem interferência.
- **FR-007**: A lista de carreiras DEVE mostrar, para cada uma: nome do técnico, clube (escudo e
  nome), temporada, rodada atual e data/hora do último salvamento, da mais recente para a mais
  antiga, sem precisar abrir a carreira inteira.
- **FR-008**: O jogador DEVE poder continuar qualquer carreira da lista e apagar qualquer uma,
  com confirmação antes de apagar.
- **FR-009**: O save DEVE ter número de versão desde a primeira versão. Ao abrir um save de versão
  anterior, o jogo DEVE aplicar as migrações em sequência até a versão atual e salvar o resultado
  migrado; saves de versão futura NÃO DEVEM ser abertos nem alterados.
- **FR-010**: Saves danificados (ilegíveis ou inválidos) DEVEM ser identificados na lista, não
  abrir e poder ser apagados, sem afetar os demais.
- **FR-011**: O jogo DEVE salvar automaticamente ao fim de cada rodada e mostrar um indicador
  discreto de "salvo"; falhas ao salvar DEVEM gerar aviso sem travar o jogo.
- **FR-012**: Dentro da carreira DEVE haver a ação "Simular próxima rodada", que simula de uma
  vez todos os jogos da rodada (com escalação automática também para o clube do jogador), mostra
  os resultados da rodada e dispara o salvamento automático. Na feature 006, essa ação passa a ser
  a entrada da rodada ao vivo e do modo "simular direto".
- **FR-013**: Se a mesma carreira estiver aberta em duas abas, o jogo DEVE detectar que ela foi
  salva em outra aba e avisar o jogador antes de sobrescrever.

**Navegação e interface**

- **FR-014**: A tela de abertura DEVE oferecer "Continuar" (última carreira jogada, se houver),
  "Nova carreira" e "Carreiras salvas".
- **FR-015**: Dentro de uma carreira, DEVE haver navegação entre Início do clube, Elenco,
  Competição e Calendário, sempre visível, com o clube e a rodada atual identificados.
- **FR-016**: Início do clube DEVE mostrar o próximo jogo (adversário com escudo, mando, rodada),
  a posição na tabela e os resultados das últimas 5 partidas; ao fim da temporada, a posição
  final e a tabela final.
- **FR-017**: Elenco DEVE listar os jogadores do clube com posição (sigla traduzida), nome de
  exibição, idade, força e características (rótulos traduzidos), ordenável por coluna, e indicar
  jogadores suspensos ou lesionados.
- **FR-018**: Competição DEVE mostrar a tabela completa da Série A com as colunas da feature 003,
  escudos e o clube do jogador destacado.
- **FR-019**: Calendário DEVE mostrar as rodadas com os jogos do clube do jogador (adversário,
  mando, placar quando disputado) e permitir ver todos os jogos de uma rodada.
- **FR-020**: Toda ação de navegação DEVE ter atalho de teclado; um atalho de ajuda DEVE listar os
  atalhos; todos os controles DEVEM ser alcançáveis pelo teclado com foco visível.
- **FR-021**: Os escudos DEVEM ser desenhados a partir dos dados do clube (forma, cores e
  iniciais), nítidos em qualquer tamanho usado na interface.
- **FR-022**: Todo texto visível DEVE vir do sistema de idiomas (pt-BR), incluindo nomes de
  posições, características, mensagens de erro e datas/números formatados no padrão brasileiro.
- **FR-023**: O layout DEVE ser plenamente utilizável a partir de 1280px de largura e não ter
  rolagem horizontal da página até 1024px.

**Offline**

- **FR-024**: O jogo DEVE funcionar sem servidor: é um conjunto de arquivos estáticos; nenhuma
  funcionalidade depende de rede.
- **FR-025**: Depois da primeira visita, o jogo DEVE abrir e funcionar mesmo sem conexão.

### Key Entities *(include if feature involves data)*

- **Carreira (save)**: identificador, versão do formato, nome do técnico, clube do técnico, seed,
  cópia do banco (com atributos ocultos completos), estado da temporada, datas de criação e do
  último salvamento.
- **Resumo da carreira**: o necessário para a lista de saves (técnico, clube, temporada, rodada,
  último salvamento, situação: ok, danificado, versão futura), legível sem abrir o save inteiro.
- **Migração de save**: transformação de uma versão do formato para a seguinte; aplicadas em
  cadeia.
- **Preferências da interface**: última carreira jogada e opções de exibição (ex.: ordenação do
  elenco).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um jogador novo cria uma carreira e chega à tela inicial do clube em menos de 1
  minuto, sem instruções.
- **SC-002**: Em 100% dos testes, criar uma carreira, recarregar a página e continuar leva ao
  mesmo estado (clube, temporada, rodada, tabela, elencos).
- **SC-003**: Em 100% dos testes, duas carreiras coexistem: alterar ou apagar uma não muda a
  outra.
- **SC-004**: Um save de versão anterior (preparado em teste) é migrado e abre com todos os dados
  preservados; um save de versão futura não abre e não é alterado.
- **SC-005**: A tela de carreiras salvas aparece em menos de 1 segundo com até 10 carreiras; abrir
  uma carreira leva menos de 2 segundos; o salvamento automático não trava a interface por mais
  de 200 ms.
- **SC-006**: Todas as telas são navegáveis apenas pelo teclado, e nenhuma string visível está
  fora do sistema de idiomas (verificado automaticamente).
- **SC-007**: Depois da primeira visita, o jogo abre e uma carreira pode ser continuada com o
  navegador sem conexão.

## Assumptions

- Público: um jogador por navegador; não há contas nem nuvem.
- O banco padrão é o único banco disponível nesta feature; escolher outro mod fica para depois.
- "Temporada" é identificada pelo ano da data de referência do banco (ex.: 2027) e a rodada atual
  da temporada; não há datas de calendário nas rodadas.
- A data/hora do último salvamento usa o relógio do dispositivo (camada de interface, fora do
  motor).
- A seed gerada automaticamente vem de uma fonte aleatória do navegador na camada de interface; o
  motor continua recebendo seeds explícitas.
- Exportar/importar save em arquivo, opção "sem demissão", Série B, escalação e partidas ao vivo
  estão fora do escopo (features 005, 006, 012 e 015). A "Simular próxima rodada" é instantânea e
  sem acompanhamento minuto a minuto.
- Mobile está fora do escopo; o layout só precisa não quebrar em telas menores.
- O tamanho de um save (banco copiado + temporada) fica na ordem de poucos megabytes, dentro do
  que navegadores comuns permitem armazenar localmente.
