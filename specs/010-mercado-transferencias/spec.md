# Feature Specification: Contratos e mercado de transferências

**Feature Branch**: `010-mercado-transferencias`

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description: "Contratos de jogadores e mercado de transferências para o jogador humano (ver docs/design.md §9) — prompt `docs/speckit-prompts/marco4/prompt010.md`."

## Contexto

Primeira feature do Marco 4 ("a IA monta elencos coerentes por 30 temporadas"). Desde o Marco 3 a
carreira é contínua: o dinheiro circula (008) e o mundo se renova com evolução, aposentadoria, jovens
e dispensas (009). Mas o elenco do jogador só muda sozinho: ele não pode comprar, vender, emprestar
nem renovar ninguém, e os salários são derivados da força, sem contrato. Esta feature introduz
contratos com salário e duração, o mercado com janelas, negociação curta (no máximo uma
contraproposta de cada lado), empréstimos simples, renovações e jogadores livres. A IA, por
enquanto, só responde às ofertas do jogador e faz propostas básicas pelos jogadores dele; as
transferências entre clubes da IA vêm na 011.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Buscar e comparar jogadores (Priority: P1)

O jogador abre o mercado e busca jogadores de todos os clubes e livres, filtrando por posição,
força, idade, valor de mercado, salário e tempo de contrato, e compara dois ou mais lado a lado.

**Why this priority**: é a porta de entrada de toda decisão de mercado; sem busca não há compra,
empréstimo nem contratação de livres.

**Independent Test**: abrir o mercado, aplicar filtros combinados e conferir que a lista só traz
jogadores que atendem a todos; selecionar três e ver a comparação.

**Acceptance Scenarios**:

1. **Given** o mercado aberto, **When** o jogador filtra por posição, faixa de força, faixa de idade,
   valor máximo, salário máximo e contrato terminando, **Then** a lista mostra só jogadores que
   atendem a todos os filtros, de qualquer clube ou livres.
2. **Given** a lista, **When** o jogador ordena por uma coluna, **Then** a ordem muda e os filtros
   continuam valendo.
3. **Given** dois a quatro jogadores selecionados, **When** o jogador abre a comparação, **Then** vê
   lado a lado posição, força, idade, características, clube, valor, salário e contrato.
4. **Given** o mercado, **When** o jogador procura só livres, **Then** vê apenas jogadores sem clube.
5. **Given** um jogador de outro clube, **When** o jogador o abre, **Then** vê só atributos visíveis
   (nunca potencial, temperamento ou propensão a lesões).

---

### User Story 2 - Comprar jogador de outro clube (Priority: P1)

Durante a janela, o jogador faz uma oferta em dinheiro por um jogador. O clube vendedor aceita,
recusa ou faz uma única contraproposta de valor, que o jogador aceita ou recusa. Com o valor
acertado, o jogador negocia salário e duração com o atleta (US3). Concluído, o dinheiro sai do caixa
do comprador, entra no do vendedor e o atleta muda de clube.

**Why this priority**: é o centro do mercado e dos critérios de aceite.

**Independent Test**: durante a janela, fazer uma oferta abaixo do valor (recusa ou contraproposta),
aceitar a contraproposta, fechar o contrato e conferir caixa dos dois clubes, elencos e contrato
novo; fora da janela, a oferta é bloqueada.

**Acceptance Scenarios**:

1. **Given** a janela aberta e caixa suficiente, **When** o jogador oferece um valor por um atleta de
   outro clube, **Then** o clube responde aceitando, recusando ou com uma contraproposta de valor.
2. **Given** uma contraproposta do clube, **When** o jogador a aceita, **Then** o valor fica acertado e
   segue para o contrato com o atleta; **When** recusa, a negociação termina.
3. **Given** uma contraproposta do clube, **When** o jogador tenta fazer outra oferta na mesma
   negociação, **Then** o jogo não permite (no máximo uma contraproposta de cada lado).
4. **Given** a janela fechada, **When** o jogador tenta oferecer por um atleta de outro clube, **Then**
   o jogo recusa e mostra quando abre a próxima janela.
5. **Given** a transferência concluída, **When** o jogador confere as finanças, **Then** o valor aparece
   como despesa do comprador e receita do vendedor, e a soma de caixa dos clubes não muda.
6. **Given** caixa insuficiente para o valor, **When** o jogador tenta fechar, **Then** o jogo recusa
   com o motivo.
7. **Given** um clube que ficaria abaixo do elenco mínimo, **When** recebe a oferta, **Then** recusa a
   venda; um comprador acima do elenco máximo não pode fechar.

---

### User Story 3 - Negociar contrato com o atleta (Priority: P1)

Ao contratar (compra, livre, renovação), o jogador propõe salário mensal e duração. O atleta aceita,
recusa ou pede um salário maior uma única vez. O interesse dele depende da reputação do clube e da
divisão; pode recusar por falta de interesse mesmo com salário alto.

**Why this priority**: o contrato decide quanto o reforço custa por temporada e completa a compra.

**Independent Test**: propor salário abaixo da pedida (contraproposta), aceitar; tentar contratar um
atleta muito acima do nível do clube (recusa por interesse).

**Acceptance Scenarios**:

1. **Given** uma contratação em andamento, **When** o jogador propõe salário e duração, **Then** o
   atleta aceita, recusa ou pede um salário maior uma vez.
2. **Given** um pedido do atleta, **When** o jogador aceita, **Then** o contrato é assinado; **When**
   recusa, a contratação não acontece (e a compra combinada com o clube é desfeita sem custo).
3. **Given** um clube de reputação baixa ou de divisão inferior, **When** tenta contratar um atleta de
   nível muito acima, **Then** o atleta pode recusar por falta de interesse, com o motivo mostrado.
4. **Given** uma duração fora dos limites permitidos, **When** o jogador propõe, **Then** o jogo recusa.

---

### User Story 4 - Propostas pelos meus jogadores (Priority: P2)

Durante a janela, outros clubes fazem propostas por jogadores do clube do jogador. Ele aceita,
recusa ou contrapropõe uma vez; o clube interessado responde aceitando ou recusando.

**Why this priority**: cria o dilema de vender ou segurar; a IA aqui só faz propostas básicas.

**Independent Test**: simular rodadas na janela até chegar uma proposta; contrapropor e ver a
resposta final; aceitar outra e conferir caixa e elenco.

**Acceptance Scenarios**:

1. **Given** a janela aberta, **When** rodadas passam, **Then** clubes da IA podem fazer propostas por
   jogadores do clube do jogador, que aparecem numa caixa de propostas.
2. **Given** uma proposta, **When** o jogador aceita, **Then** o atleta é vendido e o valor entra no
   caixa; **When** recusa, ela some.
3. **Given** uma proposta, **When** o jogador contrapropõe, **Then** o clube responde aceitando ou
   recusando, sem nova rodada.
4. **Given** uma proposta não respondida, **When** a janela fecha, **Then** ela expira.

---

### User Story 5 - Empréstimos simples (Priority: P2)

O jogador pega jogadores emprestados de outros clubes e cede os seus, até o fim da temporada, sem
opção de compra. Quem recebe paga o salário durante o empréstimo.

**Why this priority**: dá flexibilidade sem custo de compra; prevista no design.

**Independent Test**: pedir um empréstimo na janela, ver o atleta no elenco, jogar com ele, e
conferir que ele volta ao clube de origem na virada; ceder um jogador e ver a folha cair.

**Acceptance Scenarios**:

1. **Given** a janela aberta, **When** o jogador pede um atleta emprestado (com taxa opcional), **Then**
   o clube responde como numa oferta (aceita, recusa ou uma contraproposta).
2. **Given** um empréstimo fechado, **When** a temporada segue, **Then** o atleta joga pelo clube que o
   recebeu, que paga o salário dele.
3. **Given** a virada de temporada, **When** ela acontece, **Then** todo emprestado volta ao clube de
   origem.
4. **Given** um atleta emprestado, **When** alguém tenta comprá-lo ou emprestá-lo de novo, **Then** o
   jogo não permite durante o empréstimo.

---

### User Story 6 - Renovar contratos e contratos terminando (Priority: P1)

O jogador é avisado dos contratos que terminam ao fim da temporada e pode renovar (salário e
duração) a qualquer momento. Atletas no último ano valem menos; quem não renova sai de graça na
virada e vira livre.

**Why this priority**: é o critério de aceite de contratos expirados e a principal decisão de gestão
de elenco ao longo das temporadas.

**Independent Test**: com um contrato terminando, renovar um atleta e deixar outro expirar; na
virada, o renovado continua e o outro está livre.

**Acceptance Scenarios**:

1. **Given** atletas no último ano de contrato, **When** o jogador abre o elenco ou a caixa de avisos,
   **Then** vê quais contratos terminam ao fim da temporada.
2. **Given** um atleta do clube, **When** o jogador propõe renovação, **Then** a negociação segue as
   regras do contrato (US3).
3. **Given** um atleta no último ano, **When** o valor de mercado é mostrado, **Then** é menor do que
   seria com mais contrato.
4. **Given** a virada de temporada, **When** um contrato termina sem renovação, **Then** o atleta vira
   livre e sai do elenco, sem pagamento ao clube.

---

### User Story 7 - Contratar jogadores livres (Priority: P2)

A qualquer momento (dentro ou fora da janela), o jogador contrata atletas sem clube, negociando só o
contrato (US3).

**Why this priority**: é a válvula fora da janela e o destino dos contratos expirados e dispensados.

**Independent Test**: fora da janela, contratar um livre e conferir que ele entra no elenco com
contrato e salário na folha.

**Acceptance Scenarios**:

1. **Given** a janela fechada, **When** o jogador contrata um livre, **Then** a negociação é permitida
   e, com acordo, o atleta entra no elenco.
2. **Given** um livre que não é contratado por muito tempo, **When** passam as temporadas, **Then** ele
   deixa o mercado conforme as regras (aposentadoria ou saída), para o grupo de livres não crescer
   sem fim.

---

### Edge Cases

- **Elenco no limite**: compra e empréstimo recebido não podem passar do máximo; venda e cessão não
  podem deixar o clube abaixo do mínimo (nem sem a cobertura mínima de goleiros).
- **Atleta escalado vendido ou emprestado**: sai da escalação, com aviso (mesmo ajuste da 009).
- **Atleta lesionado ou suspenso**: pode ser negociado; a situação vai com ele.
- **Virada com negociação aberta**: negociações e propostas pendentes expiram.
- **Empréstimo e fim de contrato**: um contrato que termina durante um empréstimo termina na virada;
  o atleta vira livre (não volta ao clube de origem).
- **Caixa negativo**: o jogador não pode fechar compras que não cabem no caixa; vender continua
  permitido.
- **Renovação recusada**: o atleta mantém o contrato atual até o fim.
- **Dispensados da 009**: passam a virar livres (em vez de sair do jogo).
- **Save antigo**: abre com contratos gerados para todos os jogadores (salário atual e duração pela
  idade) e sem livres; a janela segue o calendário da temporada atual.
- **Mesmo atleta em duas negociações**: o jogador só pode ter uma negociação aberta por atleta.

## Requirements *(mandatory)*

### Functional Requirements

**Contratos**

- **FR-001**: Todo jogador com clube DEVE ter um contrato com salário mensal e temporada de término.
- **FR-002**: A folha salarial de um clube DEVE passar a ser a soma dos salários contratuais dos seus
  jogadores (incluindo emprestados a ele); as finanças (008) usam essa folha.
- **FR-003**: Contratos DEVEM ter duração entre um mínimo e um máximo de temporadas, definidos nas
  regras.
- **FR-004**: Ao fim da temporada em que o contrato termina, sem renovação, o jogador DEVE virar livre
  na virada, sem pagamento ao clube.
- **FR-005**: O jogo DEVE avisar o jogador dos contratos do seu elenco que terminam ao fim da
  temporada atual.

**Janela e mercado**

- **FR-006**: Janelas de transferência DEVEM ser configuráveis como dados (padrão: início da temporada
  e meio do ano, em rodadas definidas).
- **FR-007**: Fora da janela, compras e empréstimos com outros clubes NÃO PODEM ser feitos; contratar
  livres e renovar contratos é permitido a qualquer momento.
- **FR-008**: A busca DEVE cobrir jogadores de todos os clubes e livres, com filtros de posição, força,
  idade, valor de mercado, salário e término de contrato, ordenação e comparação de 2 a 4 jogadores.
- **FR-009**: O valor de mercado DEVE considerar força, idade, potencial (de forma não revelada) e
  tempo de contrato restante (último ano vale menos).

**Negociação**

- **FR-010**: Uma negociação com clube DEVE seguir: oferta → aceitação, recusa ou uma contraproposta
  → aceitação ou recusa da contraproposta; no máximo uma contraproposta de cada lado.
- **FR-011**: A resposta do clube DEVE depender do valor oferecido em relação ao valor de mercado e da
  importância do atleta para o elenco, de forma determinística pela seed.
- **FR-012**: Uma negociação de contrato DEVE seguir: proposta de salário e duração → aceitação,
  recusa ou um pedido de salário maior → aceitação ou recusa do pedido.
- **FR-013**: O atleta DEVE poder recusar por falta de interesse, considerando a reputação e a divisão
  do clube em relação ao nível dele; o motivo é mostrado.
- **FR-014**: Negociações pendentes DEVEM expirar ao fechar a janela (as de clube) ou na virada (todas).

**Efeitos**

- **FR-015**: Transferências DEVEM mover o valor do caixa do comprador para o do vendedor, como
  lançamentos das finanças, sem criar nem destruir dinheiro.
- **FR-016**: Compras e empréstimos recebidos NÃO PODEM deixar o comprador acima do elenco máximo;
  vendas e cessões NÃO PODEM deixar o vendedor abaixo do mínimo ou sem a cobertura mínima de goleiros.
- **FR-017**: Um atleta vendido ou cedido DEVE sair da escalação do clube do jogador, com aviso.

**Empréstimos**

- **FR-018**: Empréstimos DEVEM durar até o fim da temporada, com taxa opcional, sem opção de compra;
  o clube que recebe paga o salário durante o empréstimo; o atleta volta ao clube de origem na virada.
- **FR-019**: Um atleta emprestado NÃO PODE ser transferido nem emprestado de novo durante o
  empréstimo.

**Livres**

- **FR-020**: O jogador DEVE poder contratar livres a qualquer momento, negociando só o contrato.
- **FR-021**: Contratos expirados e dispensas (009) DEVEM gerar livres; livres não contratados por um
  tempo definido nas regras deixam o mercado.

**IA nesta feature**

- **FR-022**: Clubes da IA DEVEM responder às ofertas do jogador pelas mesmas regras e fazer propostas
  básicas pelos jogadores do clube do jogador durante as janelas; transferências entre clubes da IA
  ficam para a 011.
- **FR-023**: Clubes da IA DEVEM renovar ou deixar expirar contratos dos seus jogadores por regras
  simples, para que contratos expirados não esvaziem os elencos.

**Persistência e textos**

- **FR-024**: O save DEVE ganhar uma nova versão com migração da anterior (caso "Save antigo").
- **FR-025**: Todo texto visível DEVE vir do sistema de idiomas (pt-BR), com valores em moeda.
- **FR-026**: As ações do mercado DEVEM ser operáveis por teclado e mouse.

### Key Entities *(include if feature involves data)*

- **Contrato**: salário mensal, temporada de término e, se houver, empréstimo (clube de origem, até
  quando).
- **Jogador livre**: jogador sem clube, com pedida salarial e há quanto tempo está livre.
- **Janela de transferência**: intervalos de rodadas em que compras e empréstimos são permitidos.
- **Negociação com clube**: atleta, clubes, tipo (compra ou empréstimo), oferta, contraproposta e
  estado.
- **Negociação de contrato**: atleta, clube, salário, duração, pedido do atleta e estado.
- **Proposta recebida**: oferta de um clube da IA por um jogador do clube do jogador, com prazo.
- **Regras de mercado**: janelas, limites de duração, fórmula de valor, sensibilidade das respostas,
  interesse do atleta, tempo dos livres.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das tentativas testadas, comprar ou pegar emprestado de outro clube fora da
  janela é recusado, e contratar livres fora da janela é permitido.
- **SC-002**: Em 100% das negociações testadas, há no máximo uma contraproposta de cada lado.
- **SC-003**: Em 100% dos casos testados, um jogador com contrato expirado está livre depois da
  virada de temporada, e um renovado continua no clube.
- **SC-004**: Em 100% das transferências testadas, a soma dos caixas dos clubes não muda (o valor só
  troca de mãos).
- **SC-005**: Em 100% das operações testadas, nenhum clube fica acima do elenco máximo ou abaixo do
  mínimo por causa do mercado.
- **SC-006**: Em 30 temporadas simuladas sem interação, a economia (008) e o mundo (009) continuam
  dentro dos seus limites com contratos ativos, e o grupo de livres não cresce sem limite.
- **SC-007**: O jogador encontra um atleta por filtros e conclui uma compra (oferta, contrato) em menos
  de 2 minutos.
- **SC-008**: Saves das versões anteriores abrem com contratos válidos em 100% dos fixtures.
- **SC-009**: Nenhum texto visível novo fica fora do sistema de idiomas.

## Assumptions

- As janelas padrão são um período no início da temporada (antes da primeira rodada até algumas
  rodadas depois) e outro ao redor da rodada central; os limites exatos ficam no plano.
- Os contratos iniciais são gerados ao criar a carreira (e na migração): salário igual ao derivado
  atual e duração pela idade (jovens mais longos, veteranos curtos); jovens da 009 recebem contrato
  ao surgir.
- O valor de mercado parte do valor derivado já existente e passa a considerar o contrato restante.
- A negociação é imediata (resposta na hora); não há agentes, cláusulas, bônus nem luvas.
- Empréstimos têm taxa opcional (pode ser zero) e não têm opção de compra.
- A IA faz propostas pelos jogadores do clube do jogador com baixa frequência e por regras simples
  (necessidade de posição e caixa); não negocia entre clubes da IA.
- Livres são todos os jogadores sem clube; os não contratados por uma temporada inteira se aposentam
  ou deixam o mercado, para manter o grupo pequeno.
- O tamanho de elenco usa os limites da 009 (mínimo e máximo por clube e cobertura de goleiros).
- Fora de escopo: IA de transferências entre clubes da IA (011), agentes, cláusulas complexas, opção de
  compra em empréstimos.
