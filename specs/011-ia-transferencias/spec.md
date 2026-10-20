# Feature Specification: IA de transferências

**Feature Branch**: `011-ia-transferencias`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "Inteligência artificial de mercado para os clubes controlados pelo computador (ver docs/design.md §9) — prompt `docs/speckit-prompts/marco4/prompt011.md`."

## Contexto

Segunda feature do Marco 4. A 010 deu contratos, janelas, negociação, empréstimos e livres ao
jogador humano, mas os clubes da IA quase não usam o mercado: só respondem às ofertas do humano,
fazem propostas básicas pelos jogadores dele, renovam contratos por uma regra simples e repõem o
elenco com jovens da base. Nenhum jogador muda de um clube da IA para outro, e os livres que ninguém
contrata somem. Esta feature dá aos clubes da IA um mercado de verdade: cada clube avalia o que
falta ao elenco e age nas janelas comprando, vendendo, emprestando, contratando livres e renovando,
sempre com as mesmas regras e limites do humano. O resultado esperado é um mundo em que os grandes
atraem os melhores, os pequenos revelam e vendem, e os elencos continuam coerentes por décadas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Clubes da IA montam elencos coerentes (Priority: P1)

Ao longo das temporadas, cada clube da IA identifica suas carências (posições descobertas,
elenco envelhecido, qualidade abaixo da divisão ou da ambição) e as resolve no mercado, dentro do
que o caixa permite, sem inchar nenhuma posição.

**Why this priority**: é o objetivo central da feature e a base dos critérios de aceite.

**Independent Test**: simular temporadas sem interação e conferir, em todas as viradas e janelas,
que todo clube tem elenco válido, nenhuma posição passa do máximo e os clubes que precisavam de
reforço numa posição o receberam.

**Acceptance Scenarios**:

1. **Given** um clube da IA sem a cobertura mínima de uma posição, **When** a janela abre, **Then**
   ele busca reforço para essa posição (compra, empréstimo ou livre) antes de qualquer outra
   prioridade.
2. **Given** um clube com excesso numa posição, **When** a janela abre, **Then** ele tenta vender
   ou emprestar os excedentes de menor utilidade.
3. **Given** um clube com elenco envelhecido, **When** escolhe entre reforços parecidos, **Then**
   prefere os mais jovens.
4. **Given** um clube em crise ou com caixa baixo, **When** avalia compras, **Then** não compra
   acima do que pode pagar e tende a vender.
5. **Given** qualquer momento das simulações, **When** o elenco de um clube é verificado, **Then**
   ele respeita o tamanho mínimo e máximo, a cobertura mínima e o máximo por posição.

---

### User Story 2 - Transferências entre clubes da IA (Priority: P1)

Nas janelas, clubes da IA negociam entre si: compram, vendem e emprestam jogadores com as mesmas
regras de valor, contraproposta, interesse do atleta, caixa e elenco que valem para o humano.

**Why this priority**: sem transferências entre clubes da IA não existe mercado vivo nem o fluxo de
talentos pedido no critério de aceite.

**Independent Test**: simular uma janela e conferir que houve transferências entre clubes da IA,
que cada uma respeitou janela, caixa, limites de elenco e interesse do atleta, e que o dinheiro só
trocou de mãos.

**Acceptance Scenarios**:

1. **Given** a janela aberta, **When** a IA age, **Then** ocorrem compras e empréstimos entre
   clubes da IA, cada uma com valor, contrato e efeitos nas finanças como as do humano.
2. **Given** a janela fechada, **When** a IA age, **Then** não há compras nem empréstimos entre
   clubes, só contratações de livres e renovações.
3. **Given** um atleta sem interesse no clube comprador, **When** a IA tenta contratá-lo, **Then** a
   transferência não acontece.
4. **Given** uma transferência entre clubes da IA, **When** ela se conclui, **Then** a soma dos
   caixas de todos os clubes não muda.
5. **Given** a mesma carreira e a mesma seed, **When** as janelas são simuladas de novo, **Then**
   acontecem exatamente as mesmas transferências.

---

### User Story 3 - Grandes compram, pequenos revelam e vendem (Priority: P1)

Clubes de maior reputação e caixa tendem a comprar os melhores jogadores; clubes menores revelam
jovens e os vendem com lucro, o que lhes dá dinheiro para seguir competindo.

**Why this priority**: é o segundo critério de aceite e o que torna o mundo crível para quem joga.

**Independent Test**: ao fim de 30 temporadas simuladas, medir para onde foram os bons jogadores
transferidos e conferir que a maioria seguiu para clubes de reputação maior que a do vendedor.

**Acceptance Scenarios**:

1. **Given** um jogador de destaque num clube pequeno, **When** passam as janelas, **Then** é
   provável que clubes maiores façam ofertas e ele seja vendido.
2. **Given** a venda de um jogador revelado na base, **When** o clube pequeno recebe o valor,
   **Then** o caixa dele melhora.
3. **Given** 30 temporadas simuladas, **When** se mede a força média dos elencos, **Then** clubes de
   reputação maior têm, em média, elencos mais fortes.

---

### User Story 4 - Empréstimos de jovens e contratação de livres pela IA (Priority: P2)

Clubes da IA emprestam jovens promissores que não jogam para clubes onde terão minutos, e
contratam livres quando eles resolvem uma carência de forma barata.

**Why this priority**: aproveita a evolução por minutagem da 009 e dá destino aos livres da 010,
mas o mundo já fica coerente só com compras e vendas.

**Independent Test**: simular temporadas e conferir que houve empréstimos de jovens entre clubes da
IA, que esses jovens jogaram mais no clube que os recebeu e que livres foram contratados por
clubes da IA.

**Acceptance Scenarios**:

1. **Given** um jovem com potencial alto e poucos minutos, **When** a janela abre, **Then** o clube
   pode emprestá-lo a um clube onde ele seria titular.
2. **Given** um livre que cobre uma carência de um clube da IA, **When** o clube age, **Then** ele
   pode contratá-lo, dentro ou fora da janela.
3. **Given** o empréstimo de um jovem, **When** a temporada termina, **Then** ele volta ao clube de
   origem.

---

### User Story 5 - Renovações e liberações por necessidade (Priority: P2)

A IA decide renovar ou liberar contratos olhando o valor do jogador para o elenco, a idade, o
salário e o caixa, em vez de uma regra fixa.

**Why this priority**: substitui a regra simples da 010 por decisões coerentes com as necessidades,
mas a regra atual já evita elencos vazios.

**Independent Test**: simular viradas e conferir que titulares importantes são renovados, que
jogadores caros e pouco úteis são liberados e que nenhum clube fica sem a cobertura mínima por
causa de liberações.

**Acceptance Scenarios**:

1. **Given** um titular importante com contrato terminando, **When** a IA decide, **Then** ele é
   renovado se o atleta aceitar e o caixa permitir.
2. **Given** um jogador caro, veterano e reserva, **When** o contrato termina, **Then** a IA tende a
   liberá-lo.
3. **Given** a liberação de jogadores, **When** a virada termina, **Then** o elenco continua válido.

---

### User Story 6 - Propostas críveis pelos jogadores do humano (Priority: P2)

As propostas que os clubes da IA fazem pelos jogadores do humano passam a nascer das mesmas
necessidades e capacidades: quem precisa da posição e pode pagar oferece valores coerentes com o
valor do jogador, com frequência compatível com o mercado.

**Why this priority**: o humano sente o mercado pelas propostas que recebe; a 010 já tem uma versão
básica.

**Independent Test**: simular janelas e conferir que as propostas vêm de clubes com carência na
posição e caixa suficiente, com valores numa faixa em torno do valor de mercado e em quantidade
limitada por janela.

**Acceptance Scenarios**:

1. **Given** um jogador do humano numa posição em que um clube da IA tem carência, **When** a
   janela está aberta, **Then** esse clube pode fazer uma proposta.
2. **Given** um clube da IA sem caixa, **When** a janela está aberta, **Then** ele não faz
   propostas acima do que pode pagar.
3. **Given** uma janela, **When** se contam as propostas recebidas pelo humano, **Then** a
   quantidade fica dentro dos limites definidos nas regras.

---

### User Story 7 - Resumo das transferências da janela (Priority: P3)

O jogador vê um resumo das transferências relevantes da janela no mundo todo: maiores valores,
transferências envolvendo sua divisão e jogadores de destaque.

**Why this priority**: torna o mercado da IA visível, mas não muda o funcionamento do mundo.

**Independent Test**: após uma janela com transferências, abrir o resumo e conferir que lista as
principais, com jogador, clubes de origem e destino, tipo e valor.

**Acceptance Scenarios**:

1. **Given** uma janela com transferências entre clubes da IA, **When** o jogador abre o resumo,
   **Then** vê as mais relevantes, ordenadas por importância (valor e força).
2. **Given** o resumo, **When** o jogador filtra pela sua divisão, **Then** vê só as transferências
   que envolvem clubes dela.
3. **Given** uma janela que acabou de fechar, **When** o jogador entra no jogo, **Then** um aviso
   indica que há um resumo novo da janela.

---

### Edge Cases

- **Clube sem caixa e com carência**: recorre a livres, empréstimos ou jovens da base; nunca compra
  sem caixa.
- **Atleta disputado por vários clubes**: só uma transferência acontece; a ordem é determinística.
- **Jogador do humano**: a IA nunca transfere, empresta ou renova jogadores do humano por conta
  própria; só faz propostas que o humano responde.
- **Negociação do humano em andamento**: a IA não compra um atleta que o humano está negociando.
- **Excesso por posição vindo da base**: o clube vende ou empresta os excedentes; a base continua a
  repor só o que falta.
- **Clube recém-promovido ou rebaixado**: reavalia a qualidade em relação à nova divisão.
- **Janela sem negócios possíveis**: nada acontece, sem erro.
- **Livres em excesso**: a IA contrata os úteis; os demais continuam saindo do mercado como na 010.
- **Save antigo**: abre sem histórico de transferências da IA; o mercado da IA começa na próxima
  janela.

## Requirements *(mandatory)*

### Functional Requirements

**Necessidades**

- **FR-001**: Cada clube da IA DEVE ter uma avaliação de necessidades que considere cobertura por
  posição, idade do elenco, qualidade em relação à divisão e à reputação (ambição) e situação
  financeira.
- **FR-002**: A avaliação DEVE priorizar, nessa ordem: cobertura mínima de posição, posições fracas
  em relação à ambição, renovação do elenco envelhecido e excedentes a vender.

**Ações nas janelas**

- **FR-003**: Durante as janelas, clubes da IA DEVEM poder comprar e emprestar jogadores de outros
  clubes da IA e vender ou emprestar os seus.
- **FR-004**: Clubes da IA DEVEM poder contratar livres a qualquer momento e renovar ou liberar
  contratos na virada, pelas necessidades.
- **FR-005**: Clubes da IA DEVEM emprestar jovens de potencial alto e pouca minutagem a clubes onde
  seriam titulares.
- **FR-006**: Todas as ações da IA DEVEM usar as mesmas regras do humano: janelas, valor de mercado,
  resposta do clube vendedor, interesse e pedida do atleta, duração de contrato, caixa, limites de
  elenco e efeitos nas finanças.
- **FR-007**: A IA NÃO PODE transferir, emprestar, renovar ou liberar jogadores do humano; com eles,
  só faz propostas.
- **FR-008**: A IA NÃO PODE comprar acima do caixa disponível, descontada uma reserva para salários
  definida nas regras.

**Composição dos elencos**

- **FR-009**: Nenhuma ação da IA PODE deixar um clube fora do tamanho mínimo e máximo, da cobertura
  mínima por posição ou acima de um máximo por posição definido nas regras (por exemplo, no máximo
  4 goleiros).
- **FR-010**: Clubes com excesso numa posição DEVEM tentar reduzi-lo nas janelas.

**Fluxo de talentos**

- **FR-011**: A escolha de alvos e a disposição de vender DEVEM fazer clubes de maior reputação e
  caixa tenderem a comprar os melhores jogadores, e clubes menores tenderem a vender seus destaques.

**Propostas ao humano**

- **FR-012**: As propostas pelos jogadores do humano DEVEM vir de clubes com carência na posição e
  caixa suficiente, com valores numa faixa definida em torno do valor de mercado e quantidade
  limitada por janela.

**Visibilidade**

- **FR-013**: O jogo DEVE manter o registro das transferências de cada janela e mostrar ao jogador um
  resumo das mais relevantes (por valor e força), com filtro pela divisão dele.
- **FR-014**: O jogo DEVE avisar o jogador quando houver um resumo novo de janela.

**Regras, determinismo e persistência**

- **FR-015**: Os parâmetros da IA de mercado (quantidade de negócios por janela, reservas, máximo
  por posição, preferências de idade, faixas de valor) DEVEM ser regras centralizadas e testadas.
- **FR-016**: As decisões da IA DEVEM ser determinísticas pela seed da carreira.
- **FR-017**: O save DEVE ganhar o histórico de transferências das janelas, com migração da versão
  anterior.
- **FR-018**: Todo texto visível DEVE vir do sistema de idiomas (pt-BR).

### Key Entities *(include if feature involves data)*

- **Necessidade do clube**: posições carentes, excedentes, idade média, qualidade em relação à
  divisão e à ambição, orçamento disponível.
- **Ação da IA**: compra, venda, empréstimo, contratação de livre, renovação ou liberação, com
  clube, jogador, valor e contrato.
- **Resumo da janela**: temporada, janela e as transferências relevantes do mundo.
- **Regras da IA de mercado**: limites e preferências que guiam as decisões.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 30 temporadas simuladas com mercado ativo (2 seeds), nenhum clube fica com elenco
  inválido em nenhuma virada.
- **SC-002**: Nas mesmas simulações, nenhum clube passa do máximo por posição (por exemplo, mais de 4
  goleiros) em nenhuma virada.
- **SC-003**: A economia continua dentro dos limites da 008 e a distribuição de forças dentro dos
  limites da 009, em todas as temporadas.
- **SC-004**: Das transferências entre clubes da IA de jogadores entre os 10% mais fortes do mundo,
  pelo menos 60% vão para um clube de reputação maior que a do vendedor.
- **SC-005**: Ao fim das 30 temporadas, a correlação entre reputação dos clubes e força média dos
  elencos é positiva e forte (pelo menos 0,5).
- **SC-006**: Toda janela simulada tem transferências entre clubes da IA, e a soma dos caixas dos
  clubes não muda por causa delas.
- **SC-007**: Repetir a mesma carreira produz exatamente as mesmas transferências.
- **SC-008**: O jogador encontra as principais transferências da janela em menos de 30 segundos.
- **SC-009**: Saves da versão anterior abrem em 100% dos fixtures.

## Assumptions

- A IA age uma vez por rodada dentro das janelas (e na virada para renovações e liberações), com
  limite de negócios por clube e por janela para manter o volume crível.
- "Ambição" é derivada da reputação do clube e da divisão; não há metas de diretoria (fora de escopo).
- O máximo por posição é definido nas regras (padrão: 4 goleiros e um teto para as demais
  posições); a base da 009 continua repondo só o que falta.
- A regra simples de renovação e a revisão anual de salários da 010 são substituídas ou absorvidas
  pela decisão por necessidade, mantendo a economia dentro dos limites da 008.
- O resumo da janela mostra uma quantidade limitada de transferências relevantes do mundo e, à
  parte, as que envolvem a divisão do jogador.
- Fora de escopo: personalidade de dirigentes, agentes e rivalidade afetando negociações.
