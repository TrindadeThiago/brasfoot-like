# Feature Specification: Carreira do técnico e diretoria

**Feature Branch**: `012-carreira-tecnico`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "Carreira do técnico: reputação, diretoria, metas, demissão e propostas (ver docs/design.md §7 e §10) — prompt `docs/speckit-prompts/marco5/prompt012.md`."

## Contexto

Primeira feature do Marco 5 (Drama). Hoje o jogador escolhe um clube e o comanda para sempre:
nenhum resultado tem consequência para ele, e não existe a jornada de começar num clube pequeno e
chegar a um gigante. Esta feature transforma o jogador em um técnico com carreira: ele tem uma
reputação própria, a diretoria do clube fixa metas a cada temporada, acompanha os resultados com um
nível de confiança visível e pode demiti-lo. Outros clubes podem chamá-lo, inclusive durante a
temporada, e, quando demitido, ele recebe propostas compatíveis com a reputação ou aguarda, sem
perder o save. Os clubes da IA também trocam de técnico quando vão mal, o que abre as vagas que
alimentam as propostas. Torcida (013), manchetes (014), vestiário e coletivas ficam fora.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Metas da diretoria no início da temporada (Priority: P1)

Ao começar cada temporada (e ao assumir um clube), o jogador recebe da diretoria as metas da
temporada: uma meta esportiva de classificação (ex.: título, acesso, meio de tabela, evitar o
rebaixamento) e uma meta financeira (ex.: não fechar a temporada no vermelho, não entrar em crise).
A exigência é proporcional à força do elenco na divisão, à reputação do clube e à reputação do
técnico.

**Why this priority**: as metas são a régua de todo o resto (confiança, avaliação, demissão,
reputação) e são o primeiro critério de aceite.

**Independent Test**: criar carreiras com um clube grande e com um clube pequeno da mesma divisão
e comparar as metas recebidas.

**Acceptance Scenarios**:

1. **Given** um técnico que assume o clube de elenco mais forte da divisão, **When** recebe as
   metas, **Then** a meta esportiva é das mais exigentes (ex.: título ou acesso).
2. **Given** um técnico que assume um dos clubes mais fracos da mesma divisão, **When** recebe as
   metas, **Then** a meta esportiva é menos exigente que a do clube grande (ex.: evitar o
   rebaixamento).
3. **Given** um clube com caixa apertado ou em crise, **When** a diretoria define as metas,
   **Then** a meta financeira exige ao menos não fechar a temporada no vermelho.
4. **Given** uma nova temporada que começa, **When** o jogador abre a tela da diretoria, **Then**
   vê as metas da temporada, o que cada uma exige e como está o andamento em relação a ela.

---

### User Story 2 - Confiança da diretoria visível e reativa (Priority: P1)

O jogador acompanha, a qualquer momento, o nível de confiança da diretoria nele. A confiança sobe
e desce ao longo da temporada conforme os resultados das partidas, o andamento das metas
(posição atual em relação à meta) e a situação financeira do clube.

**Why this priority**: é o termômetro que dá peso a cada rodada, objetivo central da feature.

**Independent Test**: jogar rodadas com sequências de vitórias e de derrotas e conferir que a
confiança muda no sentido esperado e que o motivo da mudança é exibido.

**Acceptance Scenarios**:

1. **Given** uma sequência de derrotas com o clube abaixo da meta, **When** as rodadas terminam,
   **Then** a confiança cai.
2. **Given** uma sequência de vitórias com o clube dentro ou acima da meta, **When** as rodadas
   terminam, **Then** a confiança sobe.
3. **Given** o clube entra em crise financeira, **When** a rodada termina, **Then** a confiança
   cai, e cai mais se a meta financeira estiver sendo descumprida.
4. **Given** qualquer momento da carreira empregada, **When** o jogador olha a tela inicial,
   **Then** vê o nível de confiança atual, a tendência recente e os principais fatores que a
   explicam.

---

### User Story 3 - Avaliação de fim de temporada e demissão (Priority: P1)

Ao fim de cada temporada, a diretoria avalia o técnico: compara o resultado final com as metas,
considera a confiança acumulada e decide mantê-lo ou demiti-lo. Em casos extremos (confiança no
nível mínimo), a demissão pode acontecer no meio da temporada. Com a opção "sem demissão" ativa, o
jogador nunca é demitido, mas continua vendo metas, confiança e avaliação.

**Why this priority**: a demissão é a consequência que torna as metas reais; sem ela a confiança é
decorativa.

**Independent Test**: simular uma temporada em que o clube termina muito abaixo da meta e
conferir a demissão na avaliação; repetir com "sem demissão" e conferir que o jogador permanece.

**Acceptance Scenarios**:

1. **Given** uma temporada encerrada com as metas cumpridas, **When** a avaliação acontece,
   **Then** o técnico é mantido e a confiança da nova temporada parte de um patamar bom.
2. **Given** uma temporada encerrada muito abaixo da meta e com confiança baixa, **When** a
   avaliação acontece, **Then** o técnico é demitido.
3. **Given** a confiança chega ao nível mínimo no meio da temporada, fora do período de carência
   de um técnico recém-contratado, **When** a rodada termina, **Then** o técnico é demitido
   imediatamente.
4. **Given** a opção "sem demissão" ativa, **When** qualquer condição de demissão é atingida,
   **Then** o técnico não é demitido, a confiança continua visível e a avaliação informa que a
   diretoria o demitiria.
5. **Given** a avaliação de fim de temporada, **When** ela é exibida, **Then** o jogador vê cada
   meta, se foi cumprida, a decisão da diretoria e a mudança na sua reputação.

---

### User Story 4 - Desemprego e recomeço no mesmo save (Priority: P1)

Quando demitido, o jogador fica sem clube, mas a carreira continua no mesmo save: o mundo segue
simulando, ele recebe propostas de clubes compatíveis com sua reputação e pode aceitar uma ou
aguardar por outras.

**Why this priority**: é o terceiro critério de aceite; uma demissão que encerra o jogo destrói
a carreira longa, centro do projeto.

**Independent Test**: provocar uma demissão, avançar rodadas desempregado, aceitar uma proposta e
continuar jogando com o novo clube no mesmo save.

**Acceptance Scenarios**:

1. **Given** o jogador acabou de ser demitido, **When** a demissão é exibida, **Then** ele passa a
   desempregado, o clube anterior passa a ser controlado pela IA e a carreira continua.
2. **Given** um técnico desempregado, **When** avança as rodadas, **Then** o mundo continua
   simulando (rodadas, janelas, viradas) e ele pode consultar classificação, resultados e seu
   histórico.
3. **Given** um técnico desempregado, **When** surgem vagas compatíveis com sua reputação, **Then**
   ele recebe propostas e pode aceitar uma, recusar ou aguardar.
4. **Given** o técnico aceita uma proposta, **When** a próxima rodada começa, **Then** ele comanda
   o novo clube com metas novas da diretoria desse clube e a confiança inicial.
5. **Given** um técnico desempregado sem propostas por muito tempo, **When** chega a virada de
   temporada, **Then** ele recebe ao menos uma proposta de algum clube, ainda que modesto.

---

### User Story 5 - Reputação do técnico (Priority: P2)

O técnico tem uma reputação própria que cresce com metas cumpridas, títulos, acessos e
campanhas acima do esperado, e cai com metas descumpridas, rebaixamentos e demissões. A reputação
define a exigência das metas, a paciência da diretoria e quais clubes o chamam.

**Why this priority**: é o motor da jornada "começar pequeno e chegar a um gigante", mas metas e
demissão já entregam valor sem ela variar.

**Independent Test**: simular temporadas cumprindo e descumprindo metas e conferir a evolução da
reputação, e que clubes maiores passam a fazer propostas conforme ela sobe.

**Acceptance Scenarios**:

1. **Given** um técnico que supera as metas, **When** a temporada termina, **Then** sua reputação
   sobe, e sobe mais com título ou acesso.
2. **Given** um técnico rebaixado ou demitido, **When** o fato acontece, **Then** sua reputação cai.
3. **Given** um técnico de reputação baixa, **When** recebe propostas, **Then** elas vêm de clubes
   de reputação compatível (menores ou de divisão inferior), e não dos gigantes.
4. **Given** a reputação do técnico subiu ao longo de temporadas, **When** surgem vagas em clubes
   maiores, **Then** ele passa a recebê-las.
5. **Given** dois técnicos que assumem o mesmo clube com reputações diferentes, **When** as
   metas são definidas, **Then** o de reputação maior recebe metas iguais ou mais exigentes e a
   diretoria tem mais paciência com ele.

---

### User Story 6 - Propostas de outros clubes com o técnico empregado (Priority: P2)

Mesmo empregado, o jogador pode receber propostas de clubes com vaga aberta, inclusive no meio da
temporada, e escolher aceitar (trocando de clube) ou recusar.

**Why this priority**: completa a jornada de ascensão, mas depende de reputação e de vagas da IA.

**Independent Test**: com um técnico de boa reputação, avançar até que um clube da IA demita seu
técnico e conferir a proposta recebida, aceitando-a e recusando-a em saves diferentes.

**Acceptance Scenarios**:

1. **Given** um clube da IA demitiu o técnico e o perfil do jogador é compatível, **When** a vaga
   abre, **Then** o jogador pode receber uma proposta com o clube, sua divisão, sua situação na
   tabela e as metas esperadas.
2. **Given** uma proposta recebida, **When** o jogador a recusa, **Then** continua no clube atual
   sem efeito na confiança da diretoria atual.
3. **Given** uma proposta recebida no meio da temporada, **When** o jogador a aceita, **Then** deixa
   o clube atual, que passa à IA, e assume o novo clube a partir da próxima rodada.
4. **Given** uma proposta não respondida, **When** o prazo dela vence, **Then** ela expira e a vaga
   é preenchida pela IA.

---

### User Story 7 - Opção "sem demissão" ao criar a carreira (Priority: P2)

Ao criar uma nova carreira, o jogador pode ativar a opção "sem demissão".

**Why this priority**: é um requisito explícito para quem quer jogar sem pressão, mas o jogo
funciona sem ela.

**Independent Test**: criar uma carreira com a opção ativa, provocar condições de demissão e
conferir que o técnico permanece.

**Acceptance Scenarios**:

1. **Given** a tela de nova carreira, **When** o jogador abre as opções, **Then** vê a opção
   "sem demissão", desativada por padrão, com uma explicação curta.
2. **Given** uma carreira criada com a opção ativa, **When** o jogador consulta a carreira, **Then**
   a opção aparece indicada e não pode ser alterada depois.
3. **Given** uma carreira com a opção ativa, **When** o jogador recebe propostas, **Then** ainda
   pode aceitá-las e trocar de clube por vontade própria.

---

### User Story 8 - Clubes da IA trocam de técnico (Priority: P2)

Clubes controlados pelo computador também demitem e contratam técnicos, de forma simplificada,
quando vão mal em relação ao que se espera deles.

**Why this priority**: dá vida ao mundo e é a fonte das vagas que geram propostas ao jogador.

**Independent Test**: simular temporadas sem interação e conferir que há trocas de técnico entre
clubes da IA, concentradas nos clubes que foram mal, sem trocas em excesso.

**Acceptance Scenarios**:

1. **Given** um clube da IA muito abaixo do esperado para sua força, **When** a situação persiste,
   **Then** ele pode demitir o técnico durante a temporada ou na virada.
2. **Given** um clube da IA dentro ou acima do esperado, **When** a rodada ou a virada termina,
   **Then** ele não demite o técnico.
3. **Given** um clube da IA que demitiu o técnico, **When** a vaga não é preenchida pelo jogador,
   **Then** ele contrata outro técnico da IA em pouco tempo e segue normalmente.
4. **Given** a lista de clubes, **When** o jogador consulta um clube, **Then** vê o nome do técnico
   atual.

---

### User Story 9 - Histórico do técnico (Priority: P3)

O jogador consulta o histórico da própria carreira: clubes treinados, período, campanhas por
temporada (divisão, posição final, metas cumpridas), títulos, acessos, rebaixamentos, saídas
(demissão ou troca) e a evolução da reputação.

**Why this priority**: dá memória à jornada, mas não muda o andamento do jogo.

**Independent Test**: jogar uma carreira com troca de clube e conferir que o histórico registra
cada passagem corretamente.

**Acceptance Scenarios**:

1. **Given** um técnico que passou por dois clubes, **When** abre o histórico, **Then** vê as duas
   passagens com datas, temporadas e motivo da saída.
2. **Given** uma temporada encerrada, **When** abre o histórico, **Then** a temporada aparece com
   divisão, posição final, metas e se foram cumpridas.
3. **Given** períodos de desemprego, **When** abre o histórico, **Then** eles aparecem como
   períodos sem clube.

---

### Edge Cases

- Técnico recém-contratado (no início ou no meio da temporada) tem um período de carência em que
  não pode ser demitido no meio da temporada, mesmo com confiança mínima.
- Técnico que assume no meio da temporada recebe metas ajustadas à situação atual do clube na
  tabela, e não às metas originais da temporada.
- Clube rebaixado com a meta "evitar o rebaixamento" descumprida: avaliação negativa, mas a
  demissão ainda depende da confiança acumulada e da reputação.
- Meta esportiva que não faz sentido na divisão (ex.: "acesso" na divisão mais alta, "evitar
  rebaixamento" sem zona de rebaixamento): nunca é sorteada.
- Várias propostas simultâneas: o jogador vê todas e escolhe no máximo uma; aceitar uma descarta
  as outras.
- Proposta do próprio clube atual ou de clube que acabou de demiti-lo: nunca acontece.
- Demissão no meio de uma janela de transferências com negociações em andamento do jogador: as
  negociações pendentes são canceladas e o clube passa à IA.
- Demissão na última rodada ou na avaliação final: o jogador fica desempregado já na virada, e o
  clube antigo segue a virada sob a IA.
- Técnico desempregado durante a virada: a virada acontece normalmente e o jogador não recebe
  metas até assumir um clube.
- Opção "sem demissão" com confiança no mínimo por muito tempo: a confiança fica no mínimo, sem
  ficar negativa, e nada é bloqueado.
- Saves antigos (anteriores a esta feature) abrem com o técnico empregado no clube atual,
  reputação inicial, "sem demissão" desativada, confiança neutra e metas da temporada em andamento
  geradas na abertura, com carência até o fim da temporada.
- Mesma seed e mesmas decisões produzem exatamente as mesmas metas, mudanças de confiança,
  demissões, propostas e trocas de técnico da IA, inclusive após salvar e carregar.

## Requirements *(mandatory)*

### Functional Requirements

**Reputação do técnico**

- **FR-001**: O jogador DEVE ter uma reputação de técnico em escala de 1 a 100, visível, que
  começa num valor inicial fixo de técnico iniciante, igual para todas as carreiras novas.
- **FR-002**: A reputação DEVE subir com metas cumpridas ou superadas, títulos e acessos, e cair
  com metas descumpridas, rebaixamentos e demissões, sendo atualizada na avaliação de fim de
  temporada e no momento de uma demissão.
- **FR-003**: Ganhos e perdas de reputação DEVEM ser proporcionais ao contexto: cumprir uma meta
  exigente num clube grande vale mais que cumprir uma meta modesta; ser demitido de um clube
  pequeno pesa mais que de um clube grande com metas altas.
- **FR-004**: A reputação NÃO PODE sair da escala de 1 a 100.

**Metas da diretoria**

- **FR-005**: A diretoria DEVE definir, no início de cada temporada e sempre que o técnico assume
  um clube, uma meta esportiva de classificação e uma meta financeira.
- **FR-006**: As metas esportivas DEVEM vir de um conjunto de níveis definidos por dados (ex.:
  título, acesso, primeira metade da tabela, meio de tabela, evitar o rebaixamento), cada um
  expresso como uma posição final mínima na divisão.
- **FR-007**: O nível da meta esportiva DEVE ser definido pela força do elenco do clube em
  relação aos demais da divisão, pela reputação do clube e pela reputação do técnico, de forma
  que um clube mais forte e de maior reputação na mesma divisão receba meta igual ou mais exigente
  que um mais fraco.
- **FR-008**: A meta financeira DEVE vir de um conjunto definido por dados (ex.: não terminar a
  temporada com caixa negativo, não entrar em crise financeira, não fechar a temporada com caixa
  menor que o inicial), escolhida conforme a situação financeira do clube.
- **FR-009**: Metas impossíveis na divisão (acesso na divisão mais alta, evitar rebaixamento sem
  zona de rebaixamento) NÃO PODEM ser atribuídas.
- **FR-010**: Ao assumir um clube no meio da temporada, as metas DEVEM ser ajustadas à posição
  atual do clube e às rodadas restantes.
- **FR-011**: O jogador DEVE poder ver, a qualquer momento enquanto empregado, as metas da
  temporada e o andamento de cada uma (ex.: posição atual vs. exigida, caixa atual vs. exigido).

**Confiança da diretoria**

- **FR-012**: A diretoria DEVE ter um nível de confiança no técnico em escala de 0 a 100, visível
  na tela inicial e na tela da diretoria.
- **FR-013**: A confiança DEVE ser atualizada ao fim de cada rodada considerando o resultado da
  partida do clube, a distância entre a posição atual e a exigida pela meta esportiva e a
  situação financeira em relação à meta financeira (incluindo crise).
- **FR-014**: A sensibilidade da confiança DEVE depender da reputação do técnico: técnicos de
  reputação maior têm mais paciência (perdem menos confiança por resultado ruim).
- **FR-015**: O jogador DEVE ver a tendência recente da confiança e os principais fatores das
  últimas mudanças (ex.: "derrotas seguidas", "abaixo da meta", "crise financeira").
- **FR-016**: A confiança inicial ao assumir um clube DEVE ser um valor neutro definido por dados;
  na nova temporada, ela parte de um valor que reflete a avaliação da temporada anterior.

**Avaliação e demissão**

- **FR-017**: Ao fim de cada temporada, antes da virada, a diretoria DEVE avaliar o técnico
  comparando o resultado final com cada meta e considerando a confiança, decidindo entre manter
  ou demitir.
- **FR-018**: A avaliação DEVE ser exibida ao jogador com cada meta, se foi cumprida, a decisão da
  diretoria e a variação de reputação.
- **FR-019**: Durante a temporada, o técnico DEVE ser demitido ao fim da rodada em que a confiança
  atingir o limite mínimo de demissão, exceto durante o período de carência após a contratação.
- **FR-020**: O período de carência e os limites de confiança para demissão no meio e no fim da
  temporada DEVEM ser definidos por dados.
- **FR-021**: Com a opção "sem demissão" ativa, o técnico NÃO PODE ser demitido em nenhuma
  situação; metas, confiança, avaliação e reputação DEVEM continuar funcionando e sendo exibidas,
  e a avaliação DEVE informar quando a diretoria o teria demitido.
- **FR-022**: Ao ser demitido, o jogador DEVE ficar desempregado, o clube anterior DEVE passar a ser
  controlado pela IA (escalação, mercado, finanças) e as negociações pendentes do jogador DEVEM ser
  canceladas.

**Desemprego e propostas**

- **FR-023**: Um técnico desempregado DEVE poder avançar o jogo rodada a rodada, com o mundo
  simulando normalmente, e consultar classificação, resultados, clubes e seu histórico; ações de
  clube (escalação, mercado, finanças) ficam indisponíveis.
- **FR-024**: O sistema DEVE gerar propostas ao jogador a partir de vagas de técnico abertas em
  clubes da IA, apenas de clubes cuja reputação e divisão sejam compatíveis com a reputação do
  técnico, segundo uma regra definida por dados.
- **FR-025**: Propostas DEVEM poder surgir com o técnico empregado ou desempregado, em qualquer
  rodada da temporada e na virada, mostrando clube, divisão, situação atual na tabela, reputação do
  clube e as metas esperadas.
- **FR-026**: Cada proposta DEVE ter prazo de resposta em rodadas; ao vencer sem resposta, ela
  expira e o clube contrata um técnico da IA.
- **FR-027**: O jogador DEVE poder aceitar no máximo uma proposta por vez; aceitar descarta as
  demais e faz o técnico assumir o novo clube a partir da próxima rodada, com metas novas e
  confiança inicial; o clube deixado passa à IA.
- **FR-028**: Recusar uma proposta NÃO PODE afetar a confiança da diretoria atual.
- **FR-029**: Um clube NÃO PODE fazer proposta ao técnico que já o treina nem ao técnico que demitiu
  na mesma temporada.
- **FR-030**: Um técnico desempregado que não tiver recebido nenhuma proposta até a virada de
  temporada DEVE receber ao menos uma proposta na virada, ainda que de um clube modesto.

**Clubes da IA**

- **FR-031**: Todo clube DEVE ter um técnico identificado por nome (gerado a partir dos bancos de
  nomes locais); para clubes da IA, o técnico é simplificado (nome e reputação), sem influência no
  desempenho do time.
- **FR-032**: Clubes da IA DEVEM demitir o técnico, durante a temporada ou na virada, quando o
  desempenho fica persistentemente muito abaixo do esperado para a força do clube, segundo regra
  simplificada definida por dados, e NÃO PODEM demitir quando estão dentro ou acima do esperado.
- **FR-033**: Uma vaga aberta num clube da IA DEVE ser preenchida por um técnico da IA em poucas
  rodadas, salvo se for oferecida ao jogador e ele aceitar dentro do prazo.

**Histórico e criação da carreira**

- **FR-034**: O sistema DEVE manter o histórico do técnico: passagens por clube (clube, data de
  início e fim, motivo da saída: demissão, troca por proposta), campanhas por temporada (clube,
  divisão, posição final, metas e se foram cumpridas), títulos, acessos, rebaixamentos, períodos
  sem clube e a reputação ao fim de cada temporada.
- **FR-035**: A tela de nova carreira DEVE oferecer a opção "sem demissão", desativada por padrão;
  a escolha fica gravada na carreira, é exibida nela e não pode ser alterada depois.

**Determinismo, dados, saves e textos**

- **FR-036**: Metas, confiança, avaliação, demissões, propostas e trocas de técnico da IA DEVEM ser
  determinísticas: mesmo estado, mesma seed e mesmas decisões produzem os mesmos resultados,
  inclusive após salvar e carregar.
- **FR-037**: Os parâmetros de metas, confiança, carência, limites de demissão, reputação,
  compatibilidade de propostas e troca de técnico da IA DEVEM ser dados versionados, não regras
  fixas.
- **FR-038**: O formato de save DEVE ganhar nova versão com migração a partir da anterior: saves
  antigos abrem com o técnico empregado no clube atual, reputação inicial, "sem demissão"
  desativada, confiança neutra, técnicos da IA gerados para os demais clubes, histórico iniciado
  na temporada atual e metas da temporada em andamento geradas com carência até o fim dela.
- **FR-039**: Todos os textos novos (metas, fatores de confiança, avaliação, propostas, demissão,
  histórico) DEVEM passar pelo sistema de traduções; o motor produz eventos e dados estruturados.

### Key Entities *(include if feature involves data)*

- **Técnico do jogador**: nome, reputação (1–100), clube atual ou desempregado, opção "sem
  demissão", propostas pendentes.
- **Técnico da IA**: nome e reputação; pertence a um clube ou está livre; sem efeito nas partidas.
- **Metas da temporada**: clube, temporada, meta esportiva (nível e posição exigida), meta
  financeira (tipo e limite), se foram ajustadas por contratação no meio da temporada.
- **Confiança da diretoria**: valor (0–100), histórico recente com fatores de cada mudança,
  rodada da contratação (para a carência).
- **Avaliação de fim de temporada**: metas e cumprimento, decisão (mantido/demitido/teria sido
  demitido), variação de reputação.
- **Proposta de emprego**: clube, temporada e rodada de criação, prazo, metas esperadas, estado
  (pendente, aceita, recusada, expirada).
- **Vaga de técnico**: clube, rodada de abertura, se foi oferecida ao jogador.
- **Histórico do técnico**: passagens por clube, campanhas por temporada, conquistas, períodos sem
  clube e evolução da reputação.
- **Regras de carreira**: parâmetros versionados de metas, confiança, carência, demissão,
  reputação, propostas e troca de técnico da IA.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em todas as divisões, assumir o clube de elenco mais forte gera meta esportiva
  estritamente mais exigente que assumir o clube de elenco mais fraco, para qualquer reputação
  inicial de técnico.
- **SC-002**: Em simulações com "sem demissão" ativa e o clube sempre abaixo da meta, o técnico
  nunca é demitido em 10 temporadas, e a confiança permanece visível e atualizada a cada rodada.
- **SC-003**: Após uma demissão, o jogador consegue aceitar uma proposta e jogar ao menos uma
  temporada completa com o novo clube no mesmo save, sem perda de dados.
- **SC-004**: Em simulações longas de 30 temporadas sem interação, a cada temporada entre 5% e
  35% dos clubes da IA trocam de técnico, e pelo menos 70% das trocas acontecem em clubes que
  terminaram abaixo da expectativa para sua força.
- **SC-005**: Um técnico simulado que cumpre todas as metas por várias temporadas tem a reputação
  aumentando e passa a receber propostas de clubes de reputação maior que a do clube inicial; um
  que é demitido seguidamente tem a reputação caindo.
- **SC-006**: Um técnico desempregado recebe a primeira proposta em no máximo uma virada de
  temporada após a demissão em 100% dos casos simulados.
- **SC-007**: Em uma temporada típica jogada sem extremos, a confiança muda de forma perceptível
  (ao menos 5 pontos) em resposta a sequências de 3 resultados iguais, e o jogador identifica o
  motivo na tela.
- **SC-008**: Repetir uma carreira com a mesma seed e as mesmas decisões produz exatamente as
  mesmas metas, demissões, propostas e trocas de técnico da IA, inclusive com salvar e carregar no
  meio.
- **SC-009**: Saves da versão anterior abrem sem erro e seguem jogáveis com metas e confiança.

## Assumptions

- A reputação do clube continua sendo o valor fixo do banco de dados; esta feature não a altera
  (evolução de reputação de clube pode vir com torcida/histórico em features futuras).
- A meta esportiva considera apenas a classificação da divisão (única competição atual); metas de
  copa ficam para quando houver copas.
- A meta financeira usa os conceitos já existentes de caixa, caixa inicial da temporada e crise
  financeira.
- Técnicos da IA não influenciam o desempenho das partidas, a tática nem o mercado dos clubes; são
  simplificados para gerar trocas e vagas.
- O técnico do jogador não tem salário nem contrato com duração nesta feature; trocar de clube por
  proposta não gera multa.
- Um técnico desempregado não pode procurar vagas ativamente nem se candidatar; ele só responde a
  propostas.
- A pressão da torcida (013) e as manchetes (014) ainda não afetam a confiança; esta feature deixa
  a confiança aberta a fatores adicionais futuros.
- Valores concretos (reputação inicial, faixas de metas, sensibilidade da confiança, carência,
  limites de demissão, prazo das propostas) são definidos no plano como dados versionados e
  calibrados por simulação longa.
- A troca de clube por proposta durante uma janela de transferências cancela as negociações
  pendentes do jogador no clube antigo, como na demissão.
- Vestiário, coletivas de imprensa e moral ficam fora do escopo.
