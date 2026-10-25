# Feature Specification: Competições continentais

**Feature Branch**: `022-competicoes-continentais`

**Created**: 2026-10-25

**Status**: Draft

**Input**: User description: "Competições entre clubes de vários países, no modelo das copas continentais (ver docs/design.md §14) — prompt `docs/speckit-prompts/marco9/prompt022.md`."

## Contexto

Primeira feature do Marco 9 (Futebol sul-americano). Até aqui cada país tem a sua liga e a sua copa
nacional, e a 021 entregou o **mecanismo** de vagas entre competições. Esta feature usa esse
mecanismo para criar o topo da pirâmide: **duas competições continentais** (uma maior e uma
menor) reunindo os melhores clubes de vários países, com preliminares, fase de grupos e
mata-mata final, e com prêmios, reputação e expectativa que pesam na carreira do técnico.

Tudo é descrito no banco (vagas por país, fases, datas, prêmios, ligação entre as duas
competições), sem código específico por competição. Os nomes das competições são fictícios e vêm do
banco.

Fica fora desta feature: mundial de clubes, supercopa continental, seleções nacionais, viagens e
fuso horário (ver Assumptions).

## Clarifications

### Session 2026-10-25

Nenhuma pergunta aberta: as decisões de escopo estão em Assumptions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Classificar o meu clube e disputar a competição continental (Priority: P1)

Como jogador, quero que uma boa campanha na liga ou na copa nacional (ou o título continental do
ano anterior) classifique o meu clube para a competição continental, e quero disputá-la do início ao
fim contra clubes de outros países, na mesma temporada da liga e da copa nacional.

**Why this priority**: é o coração da feature; sem ela não existe competição continental jogável.

**Independent Test**: num banco de teste com 3 países, simular uma temporada em que o clube do
jogador termina numa posição que dá vaga continental; na temporada seguinte, conferir que ele está
na competição, na fase prevista, e jogar a temporada inteira (liga, copa nacional e continental)
até o fim, sem conflito de datas.

**Acceptance Scenarios**:

1. **Given** que o clube do jogador termina em posição que dá vaga continental, **When** a
   temporada seguinte começa, **Then** ele está entre os participantes da competição, na fase
   definida pela regra, e o calendário passa a incluir os jogos continentais.
2. **Given** um clube que entra na fase preliminar, **When** ele vence os confrontos preliminares,
   **Then** avança para a fase de grupos; se perde, é eliminado ou, se a regra de ligação mandar,
   passa à competição menor.
3. **Given** a fase de grupos, **When** o sorteio é feito, **Then** nenhum grupo tem dois clubes do
   mesmo país, enquanto houver arranjo possível (regra da 019).
4. **Given** que o clube passa dos grupos, **When** o mata-mata final é disputado, **Then** o
   jogador vê o chaveamento atualizado a cada rodada e, ao final, há um campeão continental.
5. **Given** que o clube do jogador não se classificou, **When** a temporada acontece, **Then** ele
   segue só com liga e copa nacional, mas pode acompanhar a competição continental pelas abas.

---

### User Story 2 - A campanha continental tem peso na carreira (Priority: P1)

Como jogador, quero que a campanha continental renda prêmios em dinheiro, renda de bilheteria,
reputação para o clube, e que alimente as metas da diretoria, a expectativa da torcida, as manchetes
e o histórico.

**Why this priority**: sem consequências, a competição seria só mais um calendário; o peso é o que
a torna um objetivo de carreira.

**Independent Test**: simular uma campanha continental completa do clube do jogador (eliminado nos
grupos numa execução, campeão em outra) e comparar caixa, reputação, avaliação da diretoria,
humor da torcida, manchetes e histórico nas duas.

**Acceptance Scenarios**:

1. **Given** que o clube joga a competição, **When** cada fase é concluída e cada jogo é vencido,
   **Then** o clube recebe os prêmios previstos nos dados, e o extrato financeiro mostra a origem de
   cada valor.
2. **Given** jogos continentais em casa, **When** a partida termina, **Then** a renda de bilheteria
   é creditada ao clube mandante pela mesma regra de bilheteria do resto do jogo.
3. **Given** uma boa campanha, **When** a temporada termina, **Then** a reputação do clube sobe em
   proporção à fase alcançada (mais alto para o campeão), dentro dos limites de reputação do jogo.
4. **Given** uma meta da diretoria do tipo "chegar à fase X da competição continental", **When** a
   temporada termina, **Then** a meta é avaliada e influencia a confiança da diretoria.
5. **Given** que o clube joga a competição, **When** o torcedor forma expectativa para o ano,
   **Then** a expectativa considera a competição (um clube que disputa o torneio espera mais do que
   um que não disputa).
6. **Given** fatos relevantes da campanha (classificação, eliminação, título, goleada), **When**
   acontecem, **Then** geram manchetes, e o campeão entra no histórico de campeões continentais e
   no histórico do técnico.

---

### User Story 3 - Duas competições ligadas (maior e menor) (Priority: P2)

Como jogador, quero que os clubes eliminados em certas fases da competição maior passem à
menor, para que uma eliminação não signifique sempre o fim da temporada continental.

**Why this priority**: dá profundidade à pirâmide continental, mas depende das duas competições
existirem.

**Independent Test**: simular uma temporada num banco de teste em que os terceiros colocados dos
grupos da maior entram na fase de mata-mata da menor; conferir que exatamente esses clubes
aparecem lá, na fase prevista.

**Acceptance Scenarios**:

1. **Given** uma regra de ligação "eliminados na fase X da maior entram na fase Y da
   menor", **When** a fase X termina, **Then** os clubes eliminados passam a ser participantes
   da menor, na fase Y, e o calendário do jogador é atualizado se for o caso.
2. **Given** que um clube já estava na menor por outro caminho, **When** a ligação o enviaria
   de novo, **Then** ele entra uma única vez e a vaga é repassada pela regra de dados.
3. **Given** uma competição menor cuja fase de entrada já aconteceu quando o clube é
   eliminado, **When** a ligação é aplicada, **Then** o sistema não cria jogos no passado e segue a
   regra de dados (fica de fora ou entra na próxima fase).
4. **Given** que o jogador foi eliminado da maior e passou à menor, **When** abre o
   calendário, **Then** vê os novos jogos nas datas de meio de semana.

---

### User Story 4 - Acompanhar grupos, chaveamento e campanha (Priority: P2)

Como jogador, quero telas com os grupos, o chaveamento e a campanha do meu clube, e abas da
competição continental ao lado das competições nacionais.

**Why this priority**: sem a visualização o jogador não entende onde está nem o que falta; é a
parte visível da feature.

**Independent Test**: abrir, no meio de uma temporada, a competição continental; navegar entre
grupos, chaveamento e campanha do clube, e conferir que os dados batem com os resultados já
jogados.

**Acceptance Scenarios**:

1. **Given** a fase de grupos em andamento, **When** o jogador abre a competição, **Then** vê cada
   grupo com a tabela, a legenda de quem avança e de quem passa à menor, e os jogos da rodada.
2. **Given** o mata-mata, **When** o jogador abre o chaveamento, **Then** vê os confrontos, os
   placares de ida e volta, o vencedor e o caminho até a final.
3. **Given** o clube do jogador na competição, **When** abre "campanha", **Then** vê todos os jogos
   dele na competição, a fase atual, os prêmios recebidos e o que falta disputar.
4. **Given** as competições do jogador, **When** a tela de competições é aberta, **Then** a
   competição continental aparece como aba ao lado de liga e copa nacional, e os nomes vêm do banco.
5. **Given** que o clube não participa, **When** abre a aba, **Then** consegue ver a competição,
   mas sem a campanha dele.

---

### User Story 5 - Definir vagas e fases só com dados (Priority: P2)

Como modder, quero definir as vagas de cada país e as fases da competição continental só com dados,
sem tocar no código.

**Why this priority**: é a promessa de modding do jogo; garante que a feature seja reutilizável por
outros mundos além do sul-americano.

**Independent Test**: criar dois mods de teste com continentes diferentes (4 e 6 países, formatos de
fase diferentes) e rodar uma temporada em cada, sem alterar o motor; conferir que cada um respeita
suas vagas e fases.

**Acceptance Scenarios**:

1. **Given** um mod que declara a competição, suas fases (preliminares, grupos, mata-mata), o número
   de vagas por país e a fase de entrada de cada vaga, **When** o mod é carregado, **Then** o jogo
   disputa a competição exatamente como declarado.
2. **Given** um mod com vaga em fase que não existe, vagas que somam mais que a fase comporta, ou
   participantes de país inexistente, **When** é carregado, **Then** a validação rejeita com mensagem
   que indica o arquivo e o campo.
3. **Given** um mod sem competição continental, **When** o jogo é carregado, **Then** tudo funciona
   como antes desta feature.
4. **Given** um mod que declara só uma competição continental (sem a menor), **When** é
   disputado, **Then** funciona, sem ligação entre competições.

---

### User Story 6 - Um mundo continental saudável em 30 temporadas (Priority: P3)

Como jogador (e mantenedor), quero que, ao longo de muitas temporadas, a competição continental
premie os clubes fortes sem desequilibrar a economia nem monopolizar os títulos.

**Why this priority**: é o critério de equilíbrio exigido pela constituição para qualquer sistema
que afete o mundo; fica por último por ser verificação sobre o resto.

**Independent Test**: simular 30 temporadas sem interação no banco de teste de vários países e
medir título por país e por clube, força dos campeões e caixa dos participantes assíduos.

**Acceptance Scenarios**:

1. **Given** 30 temporadas simuladas, **When** os campeões continentais são analisados, **Then** a
   força média deles fica acima da média dos participantes, e países com mais vagas e clubes mais
   fortes vencem mais vezes, dentro das faixas declaradas.
2. **Given** os clubes que disputam a competição todo ano, **When** o caixa deles é medido ao longo
   de 30 temporadas, **Then** não há acúmulo sem limite: ficam dentro das faixas de economia da 008.
3. **Given** as 30 temporadas, **When** a competição é analisada, **Then** nenhum clube vence todas
   as edições e há mais de um campeão distinto.
4. **Given** clubes da IA, **When** disputam a competição, **Then** seguem as mesmas regras do
   jogador: rodízio de elenco e desgaste valem para eles.

---

### Edge Cases

- Um país sem clubes suficientes para preencher suas vagas: as vagas sobram e são repassadas pela
  regra de dados (021); a competição nunca começa com menos participantes que o formato exige.
- Número de clubes que não fecha os grupos ou a chave: o formato declarado define como completar
  (por exemplo, vagas de repasse); o carregamento rejeita formatos que não fecham.
- Mesmo clube classificado por vários caminhos (liga, copa nacional, campeão anterior): entra uma
  única vez; as vagas excedentes são repassadas (021).
- O campeão continental do ano anterior fica de fora do país de origem por rebaixamento: segue a
  regra de repasse e a regra de rebaixado da 021.
- Sorteio de grupos que não admite arranjo sem repetir país: o sorteio relaxa a restrição pelo
  mínimo necessário, de forma determinística, e registra isso.
- Conflito de data entre rodada continental e rodada nacional: não pode acontecer; o carregamento
  rejeita o calendário que o provoque, e o jogo nunca marca duas partidas do mesmo clube no mesmo
  dia.
- Eliminado da maior que entra na menor numa fase cuja data já passou: segue a regra de
  dados, sem criar jogo no passado.
- Fim de temporada com a final continental em aberto por adiamento: a temporada só encerra depois da
  final; premiações e vagas da edição seguinte só são resolvidas então.
- Jogador demitido ou trocando de clube no meio da edição: a campanha continua pelo novo clube, e o
  histórico do técnico registra a campanha de cada um.
- Mod removendo a competição continental com save em andamento: o save mantém a sua própria cópia
  do banco, então a carreira continua.
- Jogo continental com empate no mata-mata: usa o critério de desempate declarado nos dados
  (prorrogação, pênaltis, gols fora), como na copa nacional (018).
- Saves antigos (sem competição continental): abrem normalmente, sem a competição.

## Requirements *(mandatory)*

### Functional Requirements

**Competição e formato**

- **FR-001**: O banco MUST permitir descrever, como dados, uma competição continental com clubes de
  vários países, composta por fases preliminares em mata-mata, fase de grupos e mata-mata final, com
  o número de clubes de cada fase.
- **FR-002**: O banco MUST permitir declarar uma competição maior e uma menor, cada uma com
  suas fases, e a competição menor MUST ser opcional.
- **FR-003**: Cada fase MUST ter formato, número de jogos (ida e volta ou jogo único), critério de
  desempate e datas, tudo declarado nos dados, reaproveitando os formatos de grupos e mata-mata das
  competições nacionais (018, 019).
- **FR-004**: O sorteio de grupos MUST respeitar a restrição de país da 019 (sem dois clubes do mesmo
  país no mesmo grupo, enquanto houver arranjo) e MUST ser determinístico dada a seed.
- **FR-005**: As datas das fases continentais MUST cair no meio de semana e MUST NOT conflitar com as
  datas das competições nacionais (017); um clube MUST NOT ter duas partidas no mesmo dia.

**Vagas e ligação entre competições**

- **FR-006**: As vagas MUST ser descritas por país, com a fase de entrada de cada vaga, e MUST vir
  das regras de classificação da 021: posição na liga, título ou campanha na copa nacional e título
  continental da edição anterior.
- **FR-007**: O banco MUST permitir declarar a ligação entre as duas competições: clubes eliminados
  numa fase da maior entram numa fase da menor, como regra de dados, incluindo a seleção
  dos que passam (por exemplo, terceiros colocados dos grupos).
- **FR-008**: Um clube MUST NOT ocupar mais de uma vaga na mesma competição na mesma edição; vagas
  excedentes MUST ser repassadas pela regra da 021.
- **FR-009**: A ligação entre competições MUST ser aplicada ao fim da fase de origem, e os novos
  participantes MUST ser incluídos no calendário a partir da próxima rodada disponível, sem jogos no
  passado.
- **FR-010**: Uma edição MUST NOT começar com número de participantes diferente do que o formato
  exige; o repasse de vagas deve garantir o preenchimento.

**Calendário e disputa**

- **FR-011**: O calendário do jogador MUST incluir os jogos continentais do seu clube, e o jogador
  MUST poder jogar a temporada inteira (liga, copa nacional e continental) até o fim.
- **FR-012**: Os clubes da IA MUST seguir as mesmas regras do jogador nos jogos continentais,
  inclusive rodízio de elenco e desgaste.
- **FR-013**: A temporada MUST encerrar só depois da final continental; o encerramento MUST resolver
  premiações, reputação, vagas da edição seguinte e histórico.
- **FR-014**: As partidas continentais MUST ser simuladas pelo mesmo motor de partida das demais
  (rodada ao vivo e simular direto produzem o mesmo resultado).

**Prêmios e consequências**

- **FR-015**: O banco MUST permitir declarar prêmio por fase alcançada e por vitória (e, se for o
  caso, por empate), por competição.
- **FR-016**: A bilheteria dos jogos continentais MUST usar a regra de renda do jogo, creditada ao
  mandante, e os prêmios e rendas MUST aparecer no extrato financeiro com a origem identificada.
- **FR-017**: A reputação do clube MUST subir conforme a fase alcançada na competição, respeitando
  os limites de reputação já existentes.
- **FR-018**: Metas da diretoria MUST poder referir-se à competição continental (classificar-se,
  chegar a uma fase, ser campeão), avaliadas ao fim da temporada.
- **FR-019**: A expectativa da torcida MUST considerar a participação do clube na competição
  continental e a campanha anterior.
- **FR-020**: Manchetes MUST ser geradas para eventos relevantes da campanha continental
  (classificação, avanço, eliminação, título, goleada), sem texto fixo no motor.
- **FR-021**: O histórico MUST registrar os campeões continentais por edição e a campanha do técnico
  na competição.

**Interface**

- **FR-022**: O jogo MUST ter telas de grupos, chaveamento e campanha do clube, e abas da competição
  continental junto das competições nacionais.
- **FR-023**: A tabela de classificação nacional e a página da competição continental MUST mostrar
  de onde veio cada participante (vaga por liga, copa, campeão anterior, repasse ou ligação).
- **FR-024**: Todos os textos novos visíveis ao jogador MUST passar pelo sistema de tradução; nomes
  de competições, fases e clubes MUST vir do banco, nunca de tradução ou código.

**Dados e compatibilidade**

- **FR-025**: A validação do banco MUST rejeitar, com mensagem que indique o arquivo e o campo:
  vagas em fase inexistente, vagas que excedem o que a fase comporta, país inexistente, ligação para
  fase ou competição inexistente, e datas que conflitem com competições nacionais.
- **FR-026**: A competição continental MUST ser opcional por mod: sem ela, o jogo funciona como
  antes. Saves existentes MUST abrir sem alteração de comportamento e MUST ser migrados com teste
  (fixture da versão anterior).
- **FR-027**: A documentação do formato de mod MUST ser atualizada para descrever a competição
  continental, as vagas por país, as fases e a ligação entre competições.

**Equilíbrio**

- **FR-028**: A competição MUST ter teste de simulação longa (30 temporadas) com faixas declaradas
  para força dos campeões, distribuição de títulos por país e clube, e caixa dos participantes
  assíduos.

### Key Entities

- **Competição continental**: competição com clubes de vários países, composta por fases em ordem
  (preliminares, grupos, mata-mata); tem nome, vagas por país e prêmios vindos do banco. Existe em
  duas variantes (maior e menor) que podem estar ligadas.
- **Vaga continental**: direito de um clube entrar numa fase da competição, por país e critério de
  origem (posição na liga, copa nacional, campeão anterior, repasse ou ligação). Reaproveita o
  conceito de vaga da 021.
- **Fase continental**: etapa com formato, jogos, desempate, datas e número de participantes.
- **Ligação entre competições**: regra que leva clubes eliminados de uma fase da maior a uma
  fase da menor, com critério de seleção.
- **Edição**: realização de uma competição em uma temporada, com participantes, grupos, chaveamento,
  resultados e campeão.
- **Campanha do clube**: sequência de jogos, fase alcançada e prêmios recebidos por um clube numa
  edição.
- **Prêmio continental**: valor por fase alcançada ou por vitória, definido nos dados.
- **Histórico de campeões continentais**: lista de campeões, vices e participantes de cada edição,
  usada na interface e no histórico do técnico.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 30 temporadas simuladas sem interação, a força média dos campeões continentais fica
  acima da força média dos participantes em pelo menos 90% das seeds de teste, e os países com mais
  vagas e clubes mais fortes vencem mais edições, dentro das faixas declaradas no teste.
- **SC-002**: Em 30 temporadas, nenhum clube vence todas as edições e há ao menos 5 campeões
  distintos (valor ajustável na faixa declarada), evitando monopólio.
- **SC-003**: Em 30 temporadas, o caixa dos clubes que disputam a competição todo ano permanece
  dentro das faixas de economia da 008 (sem acúmulo sem limite) e o total de prêmios pagos por
  temporada fica dentro de faixa declarada.
- **SC-004**: Uma carreira de teste disputa a competição continental do início ao fim numa
  temporada, junto com a liga e a copa nacional, sem nenhum conflito de datas e sem jogo duplicado
  no mesmo dia.
- **SC-005**: Em 100% das execuções de teste, nenhum grupo tem dois clubes do mesmo país quando
  existe arranjo possível, e a mesma seed produz o mesmo sorteio, o mesmo campeão e as mesmas
  premiações.
- **SC-006**: Um modder define uma nova competição continental (vagas, fases e ligação) usando só
  dados e documentação, e o jogo a disputa sem mudança de código; formatos inválidos são rejeitados
  com mensagem que aponta arquivo e campo.
- **SC-007**: O jogador encontra, em até 3 toques a partir da tela de competições, os grupos, o
  chaveamento e a campanha do seu clube.
- **SC-008**: Saves de versões anteriores abrem sem perda e o jogo funciona como antes quando o mod
  não declara competição continental.
- **SC-009**: Um clube campeão continental recebe prêmio e reputação maiores do que um eliminado na
  fase de grupos, e a diferença aparece no extrato financeiro e na reputação ao fim da temporada.

## Assumptions

- **Dependências**: usa as regras de vaga da 021 (liga, copa nacional, campeão anterior, repasse),
  o mata-mata da 018, a fase de grupos e restrição de país da 019, o mundo de vários países da 020 e
  o calendário multi-competição da 017. Não reimplementa esses mecanismos.
- **Duas competições**: uma maior e uma menor; a menor é opcional por mod. O número de
  fases preliminares, de grupos e de mata-mata é definido nos dados, e não por esta feature.
- **Datas**: as rodadas continentais ocorrem no meio de semana, em datas declaradas nos dados;
  conflito com competição nacional é erro de validação, não algo resolvido em tempo de jogo.
- **Ligação entre competições**: a regra de dados define quais eliminados passam (fase de origem,
  critério de seleção, fase de destino). Se a fase de destino já passou, o clube fica de fora.
- **Premiação**: valores por fase e por vitória vêm do banco e são calibrados para não romper as
  faixas da economia (008); a calibração faz parte desta feature e é verificada na simulação longa.
- **Reputação e torcida**: o aumento de reputação respeita os limites existentes; a expectativa da
  torcida passa a considerar a competição continental da mesma forma que considera as demais.
- **Metas da diretoria**: reutilizam o mecanismo de metas existente, acrescentando metas por
  competição continental.
- **Nomes**: nomes de competições e fases ficam no banco/mod, nunca em tradução ou código
  (Princípio IV); o banco padrão continua fictício.
- **Fora de escopo**: mundial de clubes, supercopa continental, seleções nacionais, viagens e fuso
  horário; estaduais (023) e o gerador do mod sul-americano (024).
- **Saves**: a feature pode exigir nova versão de save, com migração encadeada e fixture de teste
  (Princípio VI).
- **Determinismo**: sorteio, desempates e resultados dependem só da seed e do estado do jogo
  (Princípio II).
- **Equilíbrio**: as faixas numéricas das simulações longas são declaradas nos testes e podem ser
  ajustadas, com justificativa, na mesma alteração (Princípio V).
- **Execução de teste**: uma simulação de 30 temporadas com uma seed; o conjunto de seeds de teste é
  declarado no próprio teste.
