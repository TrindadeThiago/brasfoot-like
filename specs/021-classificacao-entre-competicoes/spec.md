# Feature Specification: Classificação entre competições

**Feature Branch**: `021-classificacao-entre-competicoes`

**Created**: 2026-10-24

**Status**: Draft

**Input**: User description: "Vagas de uma competição para outra e supercopas, como regras de dados (ver docs/design.md §3 e §11) — prompt `docs/speckit-prompts/marco8/prompt021.md`."

## Contexto

Segunda feature do Marco 8 (Mundo). Hoje cada competição do banco é independente: a liga se renova por
acesso e rebaixamento, e a copa nacional tem os seus participantes definidos pelo país. Esta feature
faz as competições **se alimentarem umas das outras de uma temporada para a seguinte**, como no
futebol real: a posição na liga ou o título da copa dão vaga em outra competição, campeões se
enfrentam em supercopas, e o desempenho numa competição pode dar acesso a outra (inclusive de outro
formato ou região). Tudo é descrito no banco, sem código específico por competição.

Fica fora desta feature: as competições continentais propriamente ditas (022) e os estaduais (023).
Esta feature entrega o **mecanismo** de vagas que elas vão usar.

## Clarifications

### Session 2026-10-24

Nenhuma pergunta aberta: as decisões de escopo estão em Assumptions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver na tabela quais posições dão vaga (Priority: P1)

Como jogador, quero ver na tabela de uma competição quais posições dão vaga em outras competições,
com legenda por competição, para saber o que meu clube disputa na temporada seguinte.

**Why this priority**: é a parte visível do mecanismo e o que torna a regra compreensível ao jogador.

**Independent Test**: carregar um banco de teste em que a posição 1 a 3 da liga dá vaga na competição
B e o título da copa dá vaga na competição C; abrir a tabela da liga e conferir faixas coloridas, com
legenda, nas posições corretas.

**Acceptance Scenarios**:

1. **Given** uma liga cujas posições 1 a 3 dão vaga na competição B, **When** o jogador abre a
   tabela, **Then** essas posições aparecem destacadas e a legenda diz "vaga na competição B" (e a
   fase de entrada, quando não for a primeira).
2. **Given** uma liga com zonas de vaga e de rebaixamento, **When** a tabela é exibida, **Then** as
   zonas aparecem distintas e a legenda identifica cada uma pela competição de destino.
3. **Given** uma competição sem nenhuma regra de vaga, **When** a tabela é exibida, **Then** nenhuma
   zona de vaga nem legenda extra aparece (comportamento atual).
4. **Given** uma vaga que já foi repassada por outro caminho, **When** a temporada termina, **Then** a
   tabela final mostra para quem a vaga efetivamente foi.

---

### User Story 2 - Chegar a outra competição por título ou campanha (Priority: P1)

Como jogador, quero que o título da copa ou uma boa campanha na liga levem o meu clube a outra
competição na temporada seguinte, e que as vagas não usadas passem adiante.

**Why this priority**: é o efeito central da feature; sem ele as regras de vaga não mudam o jogo.

**Independent Test**: simular uma temporada num banco de teste com liga, copa e competição B cujos
participantes vêm das duas; conferir que, na temporada seguinte, B começa com exatamente os clubes que
as regras determinam, inclusive repasses.

**Acceptance Scenarios**:

1. **Given** que o clube do jogador termina em posição que dá vaga na competição B, **When** a
   temporada seguinte começa, **Then** o clube está entre os participantes de B, na fase definida
   pela regra, e o calendário do jogador inclui B.
2. **Given** que o clube ganha a copa e a copa dá vaga em B, **When** a temporada seguinte começa,
   **Then** o clube participa de B.
3. **Given** que o clube já está classificado para B por outro caminho, **When** uma segunda regra
   também lhe daria vaga em B, **Then** ele entra uma única vez e a segunda vaga é repassada conforme
   a ordem definida nos dados.
4. **Given** que o clube classificado foi rebaixado ou não pode usar a vaga, **When** a temporada
   seguinte é montada, **Then** a vaga é repassada pela ordem definida nos dados.
5. **Given** que a vaga foi dada a um clube que o jogador não treina, **When** o jogador abre a
   página da competição, **Then** vê de onde veio cada participante (posição na liga, título da copa,
   acesso, repasse, banco inicial).

---

### User Story 3 - Supercopas entre campeões (Priority: P2)

Como jogador, quero que os campeões de duas competições se enfrentem numa supercopa, e que o
confronto continue fazendo sentido quando o mesmo clube ganha as duas.

**Why this priority**: caso de uso importante do mecanismo, mas depende das vagas básicas.

**Independent Test**: num banco de teste com supercopa entre campeão da liga e campeão da copa,
simular duas temporadas: uma em que campeões são clubes diferentes e outra em que é o mesmo clube;
conferir os participantes da supercopa em cada caso.

**Acceptance Scenarios**:

1. **Given** uma supercopa entre o campeão da liga e o da copa, **When** a temporada seguinte começa,
   **Then** a supercopa tem os dois campeões como participantes e é disputada na fase e no momento do
   calendário definidos nos dados.
2. **Given** que o mesmo clube ganha a liga e a copa, **When** a supercopa é montada, **Then** a vaga
   do segundo título é repassada conforme os dados (por exemplo, para o vice-campeão de uma das
   competições), e a supercopa continua com o número certo de participantes.
3. **Given** que o clube do jogador joga a supercopa, **When** ela é disputada, **Then** o jogo usa as
   mesmas regras de partida e calendário das demais competições do clube.
4. **Given** que um campeão deixou de existir ou não pode disputar, **When** a supercopa é montada,
   **Then** o repasse definido nos dados preenche a vaga.

---

### User Story 4 - Acesso entre competições diferentes (Priority: P2)

Como jogador, quero que o desempenho numa competição regional ou de outro tipo possa dar vaga na copa
nacional ou na divisão nacional mais baixa, para que o clube tenha caminhos de acesso além da
pirâmide principal.

**Why this priority**: amplia o mecanismo para estruturas que 022 e 023 vão usar; pode vir depois do
núcleo.

**Independent Test**: num banco de teste em que os melhores colocados de uma competição regional
ganham vaga na copa nacional e o campeão ganha vaga na divisão nacional mais baixa, simular 2
temporadas e conferir que os participantes dessas competições incluem os clubes da regional.

**Acceptance Scenarios**:

1. **Given** uma competição regional com vagas na copa nacional, **When** a temporada seguinte é
   montada, **Then** a copa inclui os clubes que a regional classificou, nas fases definidas.
2. **Given** vaga na divisão nacional mais baixa para o campeão da regional, **When** a temporada é
   montada, **Then** o campeão entra na divisão e um clube é retirado dela pelo mecanismo de
   acesso e rebaixamento, mantendo o número de participantes.

---

### User Story 5 - Descrever vagas só com dados (Priority: P2)

Como autor de mod, quero descrever todas as vagas, repasses e supercopas só nos dados do banco, com
erros claros quando a configuração for incoerente.

**Why this priority**: é o requisito de "dados, não código"; sem validação, mods inválidos quebrariam
as temporadas.

**Independent Test**: montar um mod com 3 países de estruturas diferentes, com vagas, repasses e
supercopa; carregar sem alterar o jogo; carregar mods com cada tipo de erro e conferir mensagens com
arquivo e campo.

**Acceptance Scenarios**:

1. **Given** um mod com regras de vaga válidas, **When** é carregado, **Then** o jogo as aplica sem
   nenhuma mudança de lógica.
2. **Given** uma regra que aponta para competição ou fase inexistente, **When** o mod é carregado,
   **Then** é recusado com mensagem que indica arquivo e campo.
3. **Given** que o número de vagas por todas as origens não fecha com o número de participantes de uma
   fase, **When** o mod é carregado, **Then** é recusado com mensagem que indica a competição, a fase
   e a diferença.
4. **Given** dois ciclos de dependência entre competições que impossibilitam montar a primeira
   temporada, **When** o mod é carregado, **Then** é recusado com mensagem clara.

---

### User Story 6 - Metas, manchetes e histórico ligados às vagas (Priority: P3)

Como jogador, quero que a diretoria possa cobrar vagas ("classificar para a competição X") e que
manchetes e histórico registrem as classificações.

**Why this priority**: integração que dá sentido narrativo às vagas; independente do núcleo.

**Independent Test**: num banco de teste em que a diretoria tem meta de classificar para B, terminar
a temporada dentro e fora da zona de vaga, e conferir resultado da meta, manchete e histórico.

**Acceptance Scenarios**:

1. **Given** uma meta "classificar para a competição X", **When** a temporada termina, **Then** a meta
   é cumprida se o clube está entre os participantes de X na temporada seguinte (por qualquer
   caminho definido pelas regras) e falhada caso contrário.
2. **Given** que um clube se classifica para uma competição, **When** a temporada termina, **Then**
   há manchete para classificações relevantes (as do clube do jogador e as de campeões) e o histórico
   do clube registra a classificação e o caminho.
3. **Given** que o clube do jogador perdeu a vaga por repasse ou por já estar classificado, **When**
   o resumo da temporada é exibido, **Then** o jogador vê o que aconteceu com cada vaga que estava ao
   seu alcance.

---

### Edge Cases

- Mesmo clube campeão de várias competições que dão vaga na mesma competição: ocupa uma vaga só, e as
  demais vão para o repasse definido.
- Cadeia de repasse esgotada (nenhum clube elegível): a competição usa um critério de fechamento
  definido nos dados; sem ele, o banco é recusado na validação de que a cadeia sempre fecha.
- Clube classificado que é rebaixado, extinto ou não existe mais no mundo: a vaga é repassada.
- Competição sem edição na temporada anterior (primeira temporada do banco): participantes definidos
  no próprio banco.
- Clube que deve estar em duas competições com datas conflitantes: o conflito de calendário é
  detectado na validação ou pelo calendário existente (017) sem perder jogos.
- Vagas entre países: o clube de um país classificado para competição de outro (quando o banco
  permitir) mantém sua economia e seu calendário de origem.
- A fase de entrada da vaga é depois da primeira (entrada tardia): clubes só aparecem na competição
  a partir dessa fase, com os demais já definidos.
- Empates na posição que definem vaga: usam os critérios de desempate já declarados na competição.
- Competição cuja regra de vaga muda de uma temporada para outra: vale a regra do banco no início da
  temporada em que a vaga é consumida.
- Save antigo (sem regras de vaga): abre normalmente e continua jogando sem vagas entre competições.
- Mod sem nenhuma regra de vaga (banco padrão): nenhuma diferença visível.

## Requirements *(mandatory)*

### Functional Requirements

**Regras de vaga**

- **FR-001**: O banco MUST permitir descrever, como dados, regras de vaga em que posições, o título ou
  a fase alcançada de uma competição A dão vaga numa competição B, numa fase definida de B, na
  temporada seguinte.
- **FR-002**: Cada regra MUST indicar a competição de origem, o critério de origem (faixa de
  posições, título ou fase alcançada), a competição de destino e a fase de entrada.
- **FR-003**: As vagas MUST ser resolvidas no encerramento da temporada e ficar registradas para
  montar a temporada seguinte, junto com a origem de cada participante.
- **FR-004**: A mesma regra MUST poder ser usada por qualquer competição e qualquer formato (pontos
  corridos, mata-mata, grupos), sem código específico por competição.

**Repasse e unicidade**

- **FR-005**: O banco MUST permitir definir, como dados, a ordem de repasse de uma vaga que não pode
  ser usada ou cujo clube já está classificado por outro caminho.
- **FR-006**: Uma vaga MUST ser repassada quando o clube já estiver classificado para a mesma
  competição por outro caminho, ou quando não puder usá-la (por exemplo, por rebaixamento).
- **FR-007**: Nenhum clube MUST ocupar mais de uma vaga na mesma fase de uma competição, e nenhuma
  vaga MUST ficar sem destino nem ser dada duas vezes.
- **FR-008**: Quando a cadeia de repasse se esgota, o fechamento MUST seguir critério definido nos
  dados.

**Supercopa**

- **FR-009**: O banco MUST permitir definir competições de confronto entre campeões (ou outras
  colocações) de duas ou mais competições, com participantes originados por regras de vaga.
- **FR-010**: Quando um mesmo clube ganha mais de uma competição de origem, a supercopa MUST preencher
  a vaga excedente pelo repasse definido nos dados, mantendo o número certo de participantes.
- **FR-011**: A supercopa MUST ter sua fase e sua data no calendário definidas nos dados, e usar as
  mesmas regras de partida e calendário das demais competições (017, 018, 019).

**Acesso entre competições**

- **FR-012**: Uma regra de vaga MUST poder ligar competições de tipos, países ou regiões diferentes
  (por exemplo, regional para copa nacional ou divisão nacional mais baixa).
- **FR-013**: Quando uma vaga ocupa uma divisão com número fixo de participantes, o mecanismo de
  acesso e rebaixamento MUST ajustar o número de participantes, sem duplicar clubes.

**Participantes iniciais**

- **FR-014**: Os participantes da primeira temporada MUST ser definidos no banco, e a primeira
  temporada MUST respeitar o mesmo critério de número de participantes por fase das seguintes.

**Interface**

- **FR-015**: A tabela de classificação MUST destacar as posições que dão vaga, com legenda por
  competição de destino e fase.
- **FR-016**: A página da competição MUST mostrar de onde veio cada participante (posição ou título
  em outra competição, acesso, repasse ou banco inicial).
- **FR-017**: Todos os textos novos visíveis ao jogador MUST passar pelo sistema de tradução; nomes
  de competição vêm do banco.

**Integração**

- **FR-018**: Metas da diretoria MUST poder ser "classificar para a competição X", avaliadas pelo
  resultado das vagas ao fim da temporada.
- **FR-019**: Manchetes e histórico MUST registrar as classificações relevantes e seu caminho.

**Validação**

- **FR-020**: O banco MUST ser validado: regras apontam para competições e fases existentes; as fases
  de entrada existem; o número de vagas fecha com o número de participantes de cada fase; as
  cadeias de repasse sempre fecham; sem ciclos que impeçam montar a primeira temporada. Erros MUST
  indicar arquivo e campo.
- **FR-021**: A documentação do formato do banco MUST ser atualizada com regras de vaga, repasse e
  supercopa.

**Compatibilidade e qualidade**

- **FR-022**: Bancos sem regras de vaga e saves anteriores MUST continuar funcionando sem mudanças
  visíveis ao jogador.
- **FR-023**: O resultado MUST ser determinístico: mesmo estado e mesma semente dão as mesmas vagas e
  repasses, inclusive após salvar e carregar no meio.
- **FR-024**: O jogo MUST ter teste de simulação longa que verifica, em várias temporadas, número de
  participantes por fase e unicidade dos clubes.

### Key Entities

- **Regra de vaga**: ligação entre origem (competição, faixa de posições, título ou fase alcançada) e
  destino (competição, fase), declarada como dado.
- **Ordem de repasse**: sequência declarada de alternativas para preencher uma vaga que não pode ser
  usada, ou cujo clube já está classificado.
- **Supercopa**: competição de confronto entre campeões ou outras colocações de duas ou mais
  competições.
- **Zona de vaga**: faixa de posições da tabela associada a uma regra de vaga, com legenda.
- **Origem do participante**: registro de como o clube chegou à fase (posição, título, acesso,
  repasse, banco inicial).
- **Classificação resolvida**: resultado, no fim da temporada, de todas as vagas e repasses, que
  alimenta a montagem da temporada seguinte.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 30 temporadas de um banco de teste com liga, copa e supercopa em vários países,
  toda competição começa sempre com o número certo de participantes em cada fase, e nenhum clube
  aparece duas vezes na mesma fase, em 100% das temporadas.
- **SC-002**: Quando o campeão da liga também ganha a copa, a supercopa e as vagas ficam preenchidas
  pelo repasse definido nos dados, com o número certo de participantes, em 100% das ocorrências do
  teste.
- **SC-003**: O jogador identifica, só pela tabela e pela página da competição, para onde cada posição
  leva e de onde veio cada participante, sem consultar dados externos.
- **SC-004**: Um autor de mod descreve vagas, repasses e supercopa só com dados, sem mudar o jogo, e
  cada tipo de erro de coerência (competição ou fase inexistente, vagas que não fecham, cadeia de
  repasse aberta) é recusado com mensagem que indica arquivo e campo.
- **SC-005**: O banco padrão e saves antigos produzem resultados indistinguíveis dos de antes para o
  jogador.
- **SC-006**: O mesmo estado e a mesma semente produzem as mesmas vagas e repasses em 100% das
  execuções repetidas, com e sem salvar e carregar no meio.
- **SC-007**: Metas "classificar para a competição X" são avaliadas corretamente em 100% dos casos do
  teste (dentro da vaga, fora da vaga, vaga por repasse).

## Assumptions

- A classificação é resolvida no encerramento de cada temporada e vale para a temporada seguinte; não
  há vaga que atravesse mais de uma temporada.
- Posição na tabela segue os critérios de desempate já declarados na competição; "fase alcançada"
  usa as fases já existentes nas competições em fases (018, 019).
- Quando a cadeia de repasse se esgota, o critério de fechamento é definido nos dados (por exemplo,
  próximo melhor colocado de uma competição de referência).
- Clube só pode ser repassado para uma vaga se pertencer ao mundo da temporada seguinte (não extinto).
- Vagas entre países são permitidas pelo mesmo mecanismo se o banco as declarar; o banco padrão
  continua de um país e sem regras entre países.
- As competições continentais (022) e os estaduais (023) usarão este mecanismo; seus conteúdos não
  fazem parte desta feature.
- O banco de teste de simulação longa é fictício e gerado, como os anteriores.
- A feature depende do calendário multi-competição (017), das copas e fases (018, 019) e do mundo com
  vários países (020).
