# Feature Specification: Vários países e simulação em escala

**Feature Branch**: `020-varios-paises-escala`

**Created**: 2026-10-24

**Status**: Draft

**Input**: User description: "Mundo com vários países, cada um com a sua pirâmide de competições, e simulação capaz de sustentar centenas de clubes (ver docs/design.md §3, §11 e §12) — prompt `docs/speckit-prompts/marco8/prompt020.md`."

## Contexto

Primeira feature do Marco 8 (Mundo). Até aqui o banco tem um único país: as divisões, a copa, a
economia, o mercado e as propostas de emprego acontecem todos dentro dele. Esta feature faz o banco
poder ter **vários países ao mesmo tempo**, cada um com a sua pirâmide de competições, as suas regras
econômicas e o seu banco de nomes, e faz o jogo continuar rápido e com saves de tamanho aceitável
quando o mundo passa de algumas dezenas para centenas de clubes e milhares de jogadores.

Para isso há dois eixos de trabalho:

- **Conteúdo e regras do mundo**: países com competições e economia próprias, mercado e propostas de
  emprego entre países, novo jogo com escolha de clube por país e divisão, renovação do mundo com
  nomes do país do clube.
- **Escala**: os jogos que não envolvem o clube do jogador passam a ser simulados de forma resumida
  (só o necessário aos demais sistemas), e o mundo ganha metas declaradas e testadas de tamanho de
  save, tempo e memória.

O banco padrão (um país) continua funcionando sem mudanças visíveis. As vagas entre competições
(021), as competições continentais (022) e as seleções nacionais ficam fora desta feature.

## Clarifications

### Session 2026-10-24

- Q: Que regra de escala vale numa transferência internacional? → A: O valor de mercado do jogador é universal (depende só de qualidade e idade); o salário e o contrato seguem a escala do país de destino; a taxa é paga em valor universal, sem conversão.
- Q: Como a reputação se compara entre países nas propostas de emprego? → A: Cada clube tem reputação própria e universal, declarada no banco; propostas, metas da diretoria e interesse de jogadores usam essa reputação em qualquer país.
- Q: Existe limite de jogadores estrangeiros por clube? → A: Limite opcional por clube, declarado nas regras do país como dado; sem a declaração, não há limite (o banco padrão não declara).
- Q: O que o histórico resumido de competições alheias guarda? → A: Por temporada e divisão, a classificação final completa e os 10 principais artilheiros; sem os resultados jogo a jogo.
- Q: Quando a troca de país vale ao aceitar uma proposta? → A: A qualquer momento; o jogador assume o novo clube na temporada em curso, no ponto do calendário em que está.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Começar a carreira em qualquer país do banco (Priority: P1)

Como jogador, ao criar uma carreira num banco com vários países, quero escolher o clube inicial
filtrando por país e por divisão, e jogar a temporada num mundo em que todos os países disputam as
suas competições ao mesmo tempo.

**Why this priority**: é a razão de ser da feature. Sem ela, o resto (mercado, propostas, escala) não
tem como ser vivido.

**Independent Test**: carregar um banco de teste com 10 países, criar uma carreira num clube de um
país não inicial, avançar uma temporada completa e conferir que todos os países terminaram as suas
competições, com campeões, acessos e rebaixamentos próprios.

**Acceptance Scenarios**:

1. **Given** um banco com vários países, **When** o jogador abre a escolha de clube, **Then** pode
   filtrar por país e por divisão e vê só os clubes que atendem ao filtro.
2. **Given** uma carreira num clube do país B, **When** a temporada avança, **Then** as competições do
   país B (e só elas) formam o calendário do jogador, e as dos demais países também são disputadas e
   encerradas na mesma virada de temporada.
3. **Given** o banco padrão de um único país, **When** o jogador cria uma carreira, **Then** a escolha
   de clube e a temporada funcionam como antes, sem filtro de país visível desnecessário.
4. **Given** países com escalas econômicas diferentes, **When** a temporada corre, **Then** receitas,
   salários e público de cada clube refletem as regras do seu país.

---

### User Story 2 - Propostas de emprego e contratações entre países (Priority: P2)

Como jogador, quero receber propostas de trabalho de clubes de qualquer país e contratar jogadores de
outros países, e que a IA dos demais clubes também negocie entre países.

**Why this priority**: dá ao mundo grande o efeito de "mundo único" em vez de países isolados; depende
da US1.

**Independent Test**: num banco de teste, deixar a reputação do jogador subir até receber uma proposta
de um clube de outro país, aceitar, e conferir que a carreira passa a ser nesse país; separadamente,
fazer uma transferência internacional e conferir valores, salário e vaga de elenco.

**Acceptance Scenarios**:

1. **Given** um técnico com reputação compatível com um clube de outro país, **When** surgem propostas
   de emprego, **Then** a lista inclui clubes de qualquer país, com país e divisão visíveis.
2. **Given** uma proposta de emprego de outro país, **When** o jogador a aceita, **Then** passa a
   comandar o novo clube, no calendário e nas regras econômicas do novo país.
3. **Given** a janela de transferências, **When** o jogador procura reforços, **Then** pode negociar
   jogadores de clubes de outros países pelas mesmas regras de oferta e contraproposta.
4. **Given** várias temporadas simuladas, **When** se observa o mercado, **Then** há transferências
   entre países feitas pela IA, em volume dentro de faixa declarada.

---

### User Story 3 - Mundo grande, rápido e com saves de tamanho aceitável (Priority: P2)

Como jogador, quero que o jogo continue rápido e que o save continue de tamanho aceitável mesmo com
centenas de clubes, com os jogos dos outros clubes resolvidos de forma resumida, sem perder a
coerência dos resultados, cartões, lesões e artilharia que o resto do jogo usa.

**Why this priority**: sem isso a US1 é inviável em banco grande; mas pode ser entregue depois do
suporte básico a vários países.

**Independent Test**: simular 30 temporadas num banco de teste de ~400 clubes dentro das metas
declaradas de tamanho de save, tempo de rodada e de virada e memória, e comparar as distribuições
estatísticas das simulações resumida e completa.

**Acceptance Scenarios**:

1. **Given** um jogo do clube do jogador ou de uma competição do clube do jogador, **When** é jogado,
   **Then** usa a simulação completa (ao vivo, eventos, escalação, substituições).
2. **Given** um jogo fora das competições do clube do jogador, **When** é jogado, **Then** usa a
   simulação resumida e produz resultado, gols (autores), cartões e lesões para os demais sistemas.
3. **Given** um grande número de jogos simulados pelas duas simulações, **When** se comparam as
   distribuições de placar, gols por jogo e cartões, **Then** ficam equivalentes dentro das faixas
   declaradas no teste.
4. **Given** o mesmo estado e a mesma semente, **When** o mundo é simulado duas vezes (inclusive com
   salvar e carregar no meio), **Then** o resultado é idêntico, com as duas simulações.
5. **Given** competições que não são do jogador, **When** a temporada termina, **Then** o histórico
   delas é guardado de forma resumida (campeões, classificação final, artilheiros e recordes
   necessários), sem crescer indefinidamente no save.

---

### User Story 4 - Criar um banco com vários países (Priority: P3)

Como autor de mod, quero criar um banco com vários países, cada um com a sua estrutura de competições,
as suas regras econômicas e o seu banco de nomes, sem exigir mudança no jogo.

**Why this priority**: o banco de teste e o mundo grande dependem do formato, mas a edição por modders
é a camada de conteúdo em cima dele.

**Independent Test**: montar um mod com 3 países de estruturas diferentes (uma divisão, duas divisões,
com e sem copa) e carregá-lo; um mod com campo inválido ou país incoerente recebe mensagem clara.

**Acceptance Scenarios**:

1. **Given** um mod com vários países, **When** é carregado, **Then** cada país tem as suas
   competições, as suas regras econômicas e o seu banco de nomes, e o jogo funciona sem alteração de
   lógica.
2. **Given** um mod com país sem banco de nomes, sem clubes suficientes para a estrutura ou com regras
   econômicas inválidas, **When** é carregado, **Then** é recusado com mensagem que indica o arquivo
   e o campo.
3. **Given** a renovação do mundo, **When** surgem jogadores novos num clube, **Then** os nomes vêm do
   banco de nomes do país do clube.

---

### Edge Cases

- Um país com uma só divisão: não há acesso nem rebaixamento nele, e a oferta de vagas é coerente.
- Países com número de clubes e formatos de competição diferentes na mesma virada de temporada.
- O jogador aceita uma proposta de emprego de outro país no meio da temporada: calendário, contas,
  metas da diretoria e competições do clube anterior e do novo são tratados sem perda nem duplicação.
- Jogador estrangeiro num clube: salário e contrato na economia do clube de destino; sem erro quando
  país de origem e de destino têm escalas diferentes.
- Banco de teste com clubes demais para a meta: o jogo avisa ou o teste falha, nunca degrada em
  silêncio.
- Um clube do jogador sobe ou desce de divisão, ou joga uma copa: seus jogos continuam na simulação
  completa em qualquer competição que dispute.
- Save antigo (um país) abre normalmente e continua jogando.
- Mod com um único país, como o banco padrão: nenhuma diferença visível.

## Requirements *(mandatory)*

### Functional Requirements

**Mundo com vários países**

- **FR-001**: O banco MUST aceitar vários países, cada um com as suas divisões, copa (quando houver) e
  regras de acesso e rebaixamento próprias, tudo como dados.
- **FR-002**: Cada país MUST ter regras econômicas próprias (escala de receitas, salários e público)
  declaradas como dados, aplicadas a todos os clubes do país.
- **FR-002a**: As regras do país MUST poder declarar, de forma opcional, um limite de jogadores
  estrangeiros por clube; sem a declaração não há limite. Quando declarado, vale para o jogador e
  para a IA nas contratações, e um clube não pode ultrapassá-lo.
- **FR-003**: Cada país MUST ter o seu banco de nomes para a geração de jogadores.
- **FR-004**: Todos os países MUST disputar as suas competições na mesma temporada e virar de ano
  juntos, cada um com campeões, acessos e rebaixamentos próprios.
- **FR-005**: Adicionar um país MUST ser trabalho de dados, sem alterar a lógica do jogo.
- **FR-006**: O banco MUST ser validado, com mensagens que indiquem arquivo e campo, recusando país
  sem banco de nomes, sem regras econômicas, com clubes insuficientes para a estrutura declarada ou
  com clube repetido em mais de um país.
- **FR-007**: A renovação do mundo MUST gerar jogadores novos com nomes do banco de nomes do país do
  clube.

**Carreira, mercado e diretoria**

- **FR-008**: A criação de carreira MUST permitir escolher o clube com filtro por país e por divisão.
- **FR-009**: A diretoria MUST poder fazer propostas de emprego de clubes de qualquer país, indicando
  país e divisão do clube; a elegibilidade usa a reputação própria e universal do clube (declarada
  no banco), a mesma que define metas da diretoria e interesse de jogadores.
- **FR-010**: Ao aceitar uma proposta de outro país, o jogador MUST passar a comandar o novo clube
  sob o calendário e as regras econômicas do novo país, a qualquer momento da temporada: assume o
  novo clube no ponto do calendário em que está, com as competições em curso dele e sem duplicar
  nem perder jogos, contas ou metas.
- **FR-011**: O mercado MUST permitir transferências internacionais, com as mesmas regras de
  oferta, contraproposta, contrato e janela das nacionais.
- **FR-012**: A IA de transferências MUST considerar clubes e jogadores de outros países, respeitando
  as mesmas regras do jogador.
- **FR-013**: Numa transferência internacional, o valor de mercado do jogador MUST ser universal
  (só qualidade e idade) e a taxa MUST ser paga nesse valor, sem conversão; o salário e o contrato
  MUST seguir a escala econômica do país de destino.

**Simulação em escala**

- **FR-014**: Jogos do clube do jogador e de todas as competições em que ele joga MUST usar a
  simulação completa.
- **FR-015**: Todos os demais jogos MUST usar uma simulação resumida que produza resultado, gols com
  autores, cartões e lesões necessários aos outros sistemas (classificação, artilharia, suspensões,
  elencos, evolução de jogadores, finanças).
- **FR-016**: As duas simulações MUST produzir distribuições estatisticamente equivalentes de placar,
  gols por jogo e cartões, dentro de faixas declaradas em teste.
- **FR-017**: O determinismo MUST ser mantido: mesmo estado e mesma semente dão o mesmo resultado
  com as duas simulações, inclusive após salvar e carregar.
- **FR-018**: O histórico de competições alheias MUST ser guardado de forma resumida (por temporada e
  divisão: classificação final completa e os 10 principais artilheiros, sem resultados jogo a jogo),
  de modo que o save cresça de forma limitada com o número de temporadas.
- **FR-019**: O jogo MUST declarar e testar metas para o mundo grande: tamanho do save, tempo de
  rodada, tempo de virada de temporada e uso de memória.

**Compatibilidade**

- **FR-020**: O banco padrão (um país) MUST continuar funcionando sem mudanças visíveis ao jogador.
- **FR-021**: Saves anteriores MUST continuar abrindo, tratados como um mundo de um só país.
- **FR-022**: O formato do banco de mods e a documentação do formato MUST ser atualizados para
  descrever países, regras econômicas e bancos de nomes por país.
- **FR-023**: Todos os textos novos visíveis ao jogador MUST passar pelo sistema de tradução.

### Key Entities

- **País**: unidade do mundo com suas divisões, copa, regras de acesso e rebaixamento, regras
  econômicas e banco de nomes; todo clube pertence a um país.
- **Regras econômicas do país**: escala de receitas, salários e público; dado do país.
- **Banco de nomes**: nomes e sobrenomes usados para gerar jogadores do país.
- **Transferência internacional**: transferência entre clubes de países diferentes; taxa em valor
  universal de mercado, salário e contrato na escala do país de destino.
- **Proposta de emprego**: oferta de um clube (qualquer país) ao técnico, com país e divisão visíveis.
- **Simulação resumida**: forma de resolver um jogo produzindo resultado, gols, cartões e lesões sem
  o detalhamento da simulação completa.
- **Histórico resumido**: registro compacto de competições alheias ao jogador (campeões, classificação
  final, artilharia, recordes).
- **Metas de escala**: limites declarados de tamanho de save, tempo de rodada e de virada e memória.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um banco de teste com 10 países e duas divisões cada (~400 clubes) roda 30 temporadas
  sem interação dentro das metas declaradas de tamanho de save e de tempo, e cada país permanece
  dentro das faixas de balanceamento já declaradas para a economia e para a renovação do mundo
  (008 e 009).
- **SC-002**: As distribuições de placar, gols por jogo e cartões das simulações resumida e completa
  ficam dentro das faixas de equivalência declaradas no teste, numa amostra grande de jogos.
- **SC-003**: Num mundo de ~400 clubes, avançar uma rodada leva um tempo que o jogador percebe como
  instantâneo (meta declarada no teste), e a virada de temporada completa dentro da meta declarada.
- **SC-004**: O tamanho do save após 30 temporadas no banco grande fica dentro da meta declarada, e
  cresce de forma limitada (e não linear com o número de temporadas) por causa do histórico resumido.
- **SC-005**: O jogador consegue trocar de país ao aceitar uma proposta de emprego, e a carreira segue
  jogável de ponta a ponta no novo país.
- **SC-006**: O banco padrão de um país produz resultados indistinguíveis dos de antes para o jogador,
  e saves antigos abrem sem perda.
- **SC-007**: O mesmo estado e a mesma semente produzem resultado idêntico em 100% das execuções
  repetidas do mundo grande, com e sem salvar e carregar no meio.
- **SC-008**: Um autor de mod monta um banco de 3 países com estruturas diferentes só com dados, sem
  mudar o jogo, e erros de dados são reportados com arquivo e campo.

## Assumptions

- A economia de cada país é independente: não há câmbio; o valor de mercado dos jogadores é universal
  e a escala do país afeta receitas, salários e público dos seus clubes.
- A simulação resumida não gera eventos de narração ao vivo; só os dados que os sistemas do jogo
  consomem. O jogador não assiste a jogos fora das suas competições.
- "Competições do clube do jogador" inclui a divisão, a copa e as fases em que ele joga; todos os
  jogos dessas competições (inclusive os de outros clubes) usam a simulação completa. Só os jogos
  de competições em que o jogador não participa usam a simulação resumida.
- O número de países e clubes é limitado pelas metas declaradas; o banco de teste de referência é de
  10 países, duas divisões cada, ~400 clubes.
- As metas numéricas exatas (tamanho do save, tempos, memória) serão fixadas no plano, com base nas
  medições do banco de teste.
- Clubes e jogadores do banco padrão são fictícios; o banco de teste também é fictício e gerado.
- Vagas entre competições (021), competições continentais (022) e seleções nacionais ficam fora
  desta feature.
- A feature depende da economia (008), da renovação do mundo (009), do calendário multi-competição
  (017) e das copas e fases (018, 019).
