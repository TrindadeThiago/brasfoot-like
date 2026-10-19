# Feature Specification: Múltiplas divisões e virada de temporada

**Feature Branch**: `007-divisoes-virada-temporada`

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description: "Série B, acesso e rebaixamento e a transição entre temporadas (ver docs/design.md §3 e §13, marco M3) — prompt `docs/speckit-prompts/marco3/prompt007.md`."

## Contexto

Primeira feature do Marco 3 ("jogo 5 temporadas e o mundo continua saudável"). Hoje a carreira
é uma única temporada da Série A: o jogador escolhe um clube da Série A, joga as 38 rodadas (ao
vivo ou direto) e a carreira termina na tela do campeão. O banco padrão já descreve as duas
divisões do país fictício (20 clubes cada) e as vagas de acesso e rebaixamento como dados, mas só
a Série A é disputada. Esta feature transforma a temporada isolada em uma carreira contínua: as
duas divisões são disputadas em paralelo, os 4 últimos da Série A trocam de lugar com os 4
primeiros da Série B e a carreira segue para a temporada seguinte, indefinidamente.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Duas divisões disputadas em paralelo (Priority: P1)

A cada rodada, todos os jogos das duas divisões são disputados. O jogador assiste ao vivo aos
jogos da divisão do seu clube; os jogos da outra divisão são simulados ao mesmo tempo e os
resultados aparecem ao fim da rodada. O jogador acompanha a classificação, os resultados e a
artilharia das duas divisões.

**Why this priority**: sem a Série B disputada não existe acesso nem rebaixamento; é a base de
toda a feature.

**Independent Test**: começar uma carreira, jogar uma rodada e conferir que as duas divisões
avançaram uma rodada (10 jogos cada), que a classificação de cada uma reflete só os seus jogos e
que os resultados da divisão não assistida são idênticos aos de uma simulação direta da mesma
carreira.

**Acceptance Scenarios**:

1. **Given** uma carreira antes de uma rodada, **When** o jogador joga a rodada (ao vivo ou
   direto), **Then** os 10 jogos da Série A e os 10 da Série B daquela rodada são disputados e
   salvos juntos.
2. **Given** a rodada ao vivo, **When** ela está em andamento, **Then** o jogador vê ao vivo só os
   jogos da divisão do seu clube; ao fim, os resultados da outra divisão ficam disponíveis.
3. **Given** rodadas disputadas, **When** o jogador abre classificação, resultados ou artilharia,
   **Then** pode alternar entre Série A e Série B, e a divisão do seu clube aparece primeiro.
4. **Given** a mesma carreira e as mesmas decisões, **When** a rodada é jogada ao vivo ou com
   "simular direto", **Then** os resultados das duas divisões são idênticos.
5. **Given** a classificação de cada divisão, **When** o jogador a consulta, **Then** as zonas de
   acesso (Série B) e de rebaixamento (Série A) aparecem marcadas.

---

### User Story 2 - Virada de temporada com acesso e rebaixamento (Priority: P1)

Depois da última rodada, o jogador avança para a próxima temporada. Os 4 últimos da Série A vão
para a Série B e os 4 primeiros da Série B sobem para a Série A; cada divisão ganha um calendário
novo, as estatísticas da temporada recomeçam do zero, o tempo avança um ano (os jogadores ficam um
ano mais velhos) e campeões e classificações finais vão para o histórico. A carreira continua com
o mesmo clube, agora na divisão em que ele terminou.

**Why this priority**: é o que transforma a temporada isolada em carreira; os dois critérios de
aceite dependem dela.

**Independent Test**: simular uma temporada inteira, avançar e conferir que os 4 últimos da Série
A estão na Série B e os 4 primeiros da Série B estão na Série A, que cada divisão tem 20 clubes,
um calendário completo e classificação zerada, e que o histórico registra os campeões.

**Acceptance Scenarios**:

1. **Given** a última rodada disputada, **When** o jogador avança para a próxima temporada,
   **Then** os clubes nas zonas de rebaixamento e de acesso trocam de divisão segundo as vagas
   definidas nos dados da competição.
2. **Given** a nova temporada, **When** o jogador abre a classificação, **Then** as duas divisões
   têm 20 clubes, todos com zero jogos e zero pontos.
3. **Given** a nova temporada, **When** o jogador abre o calendário, **Then** cada divisão tem um
   calendário completo de turno e returno para os seus novos 20 clubes.
4. **Given** a nova temporada, **When** o jogador vê artilharia e estatísticas de disciplina
   (cartões, suspensões), **Then** elas recomeçam do zero; lesões em andamento seguem a regra
   descrita nas Assumptions.
5. **Given** um jogador com 24 anos na temporada N, **When** a temporada N+1 começa, **Then** ele
   aparece com 25 anos.
6. **Given** o clube do jogador rebaixado na temporada N, **When** a temporada N+1 começa,
   **Then** o jogador continua treinando o mesmo clube, agora na Série B.
7. **Given** uma temporada terminada, **When** o jogador ainda não avançou, **Then** pode
   consultar as classificações finais e os resultados da temporada antes de seguir.
8. **Given** um save salvo entre o fim da temporada e o avanço, **When** o jogador o abre de novo,
   **Then** continua no mesmo ponto e o avanço produz a mesma nova temporada.

---

### User Story 3 - Resumo de fim de temporada (Priority: P2)

Ao terminar a última rodada, o jogador vê um resumo da temporada: o campeão de cada divisão, os
clubes que subiram e os que caíram, e a posição final do seu clube (com destaque se ele foi
campeão, subiu ou caiu). Do resumo, ele avança para a próxima temporada.

**Why this priority**: dá peso narrativo à virada e explica o que mudou; sem ela, a troca de
divisões passa despercebida.

**Independent Test**: simular até o fim da temporada e conferir que o resumo lista os campeões
iguais ao 1º de cada classificação final, os 4 clubes que sobem e os 4 que descem, e a posição
final do clube do jogador.

**Acceptance Scenarios**:

1. **Given** a última rodada terminada, **When** os resultados são mostrados, **Then** o jogo leva
   ao resumo de fim de temporada.
2. **Given** o resumo, **When** o jogador o lê, **Then** vê o campeão da Série A, o campeão da
   Série B, os 4 que sobem, os 4 que descem e a posição final e a divisão do seu clube.
3. **Given** o clube do jogador promovido, rebaixado ou campeão, **When** o resumo é mostrado,
   **Then** essa situação aparece em destaque com uma mensagem própria.
4. **Given** o resumo, **When** o jogador escolhe "Próxima temporada", **Then** a virada acontece
   e a carreira volta à tela principal na nova temporada.

---

### User Story 4 - Começar em qualquer clube das duas divisões (Priority: P2)

Ao criar uma carreira, o jogador escolhe o clube entre os 40 das duas divisões, com a divisão de
cada clube visível.

**Why this priority**: amplia as escolhas (subir com um time pequeno é uma carreira clássica), mas
a carreira funciona sem isso começando só pela Série A.

**Independent Test**: criar uma carreira com um clube da Série B, jogar uma rodada ao vivo e
conferir que os jogos ao vivo são os da Série B.

**Acceptance Scenarios**:

1. **Given** a tela de nova carreira, **When** o jogador escolhe o clube, **Then** os 40 clubes
   aparecem agrupados ou filtráveis por divisão.
2. **Given** uma carreira criada com um clube da Série B, **When** o jogador abre a tela principal,
   **Then** a classificação, o calendário e a rodada ao vivo são os da Série B.

---

### User Story 5 - Histórico simples (Priority: P3)

O jogador consulta o histórico da carreira: para cada temporada encerrada, o campeão de cada
divisão, a classificação final completa das duas divisões e a posição e divisão do seu clube.

**Why this priority**: dá memória à carreira e serve de base para o drama do Marco 5, mas o jogo é
jogável sem uma tela dedicada.

**Independent Test**: simular 3 temporadas e conferir que o histórico tem 3 entradas, cada uma com
campeões e classificações finais iguais às mostradas no resumo daquela temporada.

**Acceptance Scenarios**:

1. **Given** temporadas encerradas, **When** o jogador abre o histórico, **Then** vê uma linha por
   temporada com o campeão de cada divisão e a posição e divisão do seu clube.
2. **Given** uma temporada no histórico, **When** o jogador a escolhe, **Then** vê as
   classificações finais completas das duas divisões daquela temporada.

---

### User Story 6 - Pontos de extensão da virada (Priority: P2)

Sistemas futuros (finanças, evolução de jogadores, mercado, diretoria) precisam executar lógica na
virada de temporada em uma ordem conhecida, sem alterar o código da virada. A virada é organizada
como uma sequência de etapas nomeadas e ordenadas, na qual novas etapas podem ser registradas
antes, entre ou depois das etapas desta feature.

**Why this priority**: não é visível ao jogador, mas evita reescrever a virada a cada feature do
Marco 3 em diante (finanças, evolução e jovens são as próximas).

**Independent Test**: registrar, em teste, duas etapas extras com posições definidas e conferir que
rodam na ordem esperada em relação às etapas padrão, que recebem o estado da temporada encerrada
e que o resultado da virada continua determinístico.

**Acceptance Scenarios**:

1. **Given** a virada padrão, **When** ela é executada, **Then** as etapas desta feature rodam
   sempre na mesma ordem documentada (encerrar e registrar histórico → aplicar acesso/rebaixamento
   → avançar o ano → zerar estatísticas → gerar calendários).
2. **Given** uma etapa extra registrada com posição relativa a uma etapa padrão, **When** a virada
   é executada, **Then** a etapa extra roda exatamente naquela posição.
3. **Given** duas etapas extras na mesma posição, **When** a virada é executada, **Then** a ordem
   entre elas é estável e definida (não depende da ordem acidental de registro).
4. **Given** uma etapa que usa aleatoriedade, **When** a virada é repetida a partir do mesmo
   estado, **Then** o resultado é idêntico.

---

### Edge Cases

- **Empate de critérios na linha de acesso/rebaixamento**: decidido pelos critérios de desempate
  da competição já existentes; o desempate é sempre determinístico (nunca depende da ordem de
  armazenamento).
- **Clube do jogador rebaixado ou promovido**: continua com o mesmo clube; a tela principal e a
  rodada ao vivo passam a mostrar a nova divisão.
- **Vagas diferentes do padrão em um mod** (ex.: 3 sobem e 3 descem, ou três divisões): a virada
  usa as vagas e os níveis dos dados; nenhuma regra fixa de "4" ou de "duas divisões" no motor.
- **Mod com uma só divisão**: não há acesso nem rebaixamento; a virada só gera a nova temporada.
- **Divisões com número diferente de clubes** (ex.: 20 e 18): permitido se as vagas de subida e
  descida entre níveis forem iguais (regra já validada); cada divisão mantém seu tamanho.
- **Fechar o jogo no meio da virada**: a virada é atômica; o save fica no estado anterior (fim da
  temporada) ou no posterior (nova temporada), nunca no meio.
- **Abrir um save antigo** (formato anterior, só a Série A, inclusive um com a temporada
  encerrada): o save é migrado; a Série B passa a existir na temporada atual a partir da rodada
  em que a carreira está, e um save já encerrado pode avançar para a próxima temporada.
- **Jogadores suspensos ou lesionados na última rodada**: tratados como nas Assumptions; a virada
  não pode deixar suspensões "penduradas" de forma inconsistente.
- **Carreira muito longa** (dezenas de temporadas): o histórico cresce uma entrada por temporada e
  o save continua abrindo e salvando em tempo aceitável.
- **Artilharia e estatísticas de temporadas anteriores**: não ficam acessíveis nesta feature além
  do histórico simples (campeões e classificações).

## Requirements *(mandatory)*

### Functional Requirements

**Divisões em paralelo**

- **FR-001**: Cada temporada DEVE disputar todas as divisões definidas na competição do país; no
  banco padrão, Série A e Série B com 20 clubes cada, turno e returno (38 rodadas).
- **FR-002**: Cada rodada da carreira DEVE disputar a rodada correspondente de todas as divisões e
  salvar tudo junto, ao fim da rodada.
- **FR-003**: Na rodada ao vivo, o jogador DEVE ver os jogos da divisão do seu clube; os jogos das
  outras divisões DEVEM ser simulados com o mesmo motor e ter seus resultados disponíveis ao fim
  da rodada.
- **FR-004**: Os resultados de todas as divisões DEVEM ser idênticos entre rodada ao vivo e
  "simular direto" para a mesma carreira e as mesmas decisões.
- **FR-005**: Classificação, resultados por rodada e artilharia DEVEM estar disponíveis para cada
  divisão, com a divisão do clube do jogador como padrão.
- **FR-006**: A classificação DEVE marcar as posições de acesso e de rebaixamento conforme as vagas
  da competição.

**Acesso e rebaixamento**

- **FR-007**: As vagas de acesso e rebaixamento entre divisões DEVEM vir dos dados da competição
  (padrão do banco: 4 descem da Série A, 4 sobem da Série B); o motor NÃO PODE fixar números de
  vagas, de divisões ou de clubes.
- **FR-008**: Ao fim da temporada, os N últimos de cada divisão com rebaixamento DEVEM ir para a
  divisão imediatamente inferior e os N primeiros de cada divisão com acesso DEVEM ir para a
  imediatamente superior, usando a classificação final com os critérios de desempate da
  competição.
- **FR-009**: Após a virada, cada divisão DEVE ter exatamente o mesmo número de clubes que tinha na
  temporada anterior, e todo clube DEVE estar em exatamente uma divisão.

**Virada de temporada**

- **FR-010**: Depois da última rodada, a carreira DEVE ficar no estado "temporada encerrada", em que
  o jogador consulta as telas da temporada e escolhe avançar; não há mais rodadas a jogar até o
  avanço.
- **FR-011**: Ao avançar, o jogo DEVE: registrar no histórico o campeão e a classificação final de
  cada divisão; aplicar acesso e rebaixamento; avançar o calendário do jogo para a temporada
  seguinte (o que deixa todos os jogadores um ano mais velhos); zerar as estatísticas da
  temporada (classificação, artilharia, disciplina); e gerar um calendário novo para cada
  divisão.
- **FR-012**: O calendário de cada nova temporada DEVE ser gerado de forma determinística a partir
  do estado da carreira, e PODE variar a ordem dos confrontos de uma temporada para outra.
- **FR-013**: A virada DEVE ser determinística: o mesmo save no fim da temporada DEVE produzir sempre
  a mesma nova temporada, inclusive após salvar e carregar.
- **FR-014**: A virada DEVE ser atômica e salva automaticamente ao terminar.
- **FR-015**: O clube do jogador DEVE ser mantido na virada, na divisão em que ele terminou após
  acesso/rebaixamento.
- **FR-016**: O número de temporadas da carreira NÃO PODE ter limite; a carreira continua até o
  jogador parar.

**Pontos de extensão**

- **FR-017**: A virada DEVE ser composta por etapas nomeadas executadas em ordem documentada e
  estável; as etapas desta feature são: registrar histórico, aplicar acesso/rebaixamento, avançar
  o ano, zerar estatísticas da temporada e gerar calendários.
- **FR-018**: DEVE ser possível registrar novas etapas com posição relativa às etapas existentes
  (antes ou depois de uma etapa nomeada) sem modificar as etapas existentes; empates de posição
  DEVEM ter desempate estável e definido.
- **FR-019**: Cada etapa DEVE receber o estado da temporada encerrada (classificações finais,
  registros) e poder alterar o estado da nova temporada; toda aleatoriedade usada por etapas DEVE
  vir do gerador de números com seed da carreira.

**Resumo e histórico**

- **FR-020**: Ao fim da última rodada, o jogo DEVE mostrar o resumo de fim de temporada com o
  campeão de cada divisão, os clubes que sobem e os que descem, e a posição final e a divisão do
  clube do jogador, com destaque quando ele foi campeão, subiu ou caiu.
- **FR-021**: Do resumo de fim de temporada, o jogador DEVE poder avançar para a próxima temporada.
- **FR-022**: O jogo DEVE manter um histórico com uma entrada por temporada encerrada contendo o ano
  da temporada, o campeão e a classificação final completa de cada divisão e a posição e divisão
  do clube do jogador; o histórico DEVE ser consultável em uma tela.

**Nova carreira e saves**

- **FR-023**: Ao criar uma carreira, o jogador DEVE poder escolher qualquer clube de qualquer
  divisão, vendo a divisão de cada clube.
- **FR-024**: O formato de save DEVE ganhar uma nova versão com migração da anterior: saves
  existentes (só Série A, em qualquer rodada ou já encerrados) DEVEM abrir e continuar com as duas
  divisões.
- **FR-025**: Todo texto visível novo (resumo, histórico, zonas da classificação, seleção por
  divisão) DEVE vir do sistema de idiomas (pt-BR); nomes de divisões vêm do mod.
- **FR-026**: As novas telas e ações (alternar divisão, avançar temporada, abrir histórico) DEVEM
  ser operáveis por teclado e por mouse.

### Key Entities *(include if feature involves data)*

- **Divisão**: nível dentro da competição do país, com nome (do mod), clubes da temporada atual e
  vagas de acesso e rebaixamento (dos dados).
- **Temporada**: o ano, as divisões com seus clubes e calendários, os registros das partidas e as
  estatísticas da temporada; termina no estado "encerrada" até o avanço.
- **Composição das divisões**: qual clube está em qual divisão em cada temporada; muda só na
  virada. A composição inicial vem do banco do mod.
- **Entrada de histórico**: ano da temporada, campeão e classificação final de cada divisão, e
  posição e divisão do clube do jogador.
- **Etapa da virada**: passo nomeado da virada de temporada, com posição na ordem; as etapas desta
  feature são as padrão e sistemas futuros registram as suas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Simular 10 temporadas seguidas sem interação mantém, ao início de cada temporada,
  exatamente 20 clubes em cada divisão, todo clube em exatamente uma divisão, e em 100% das
  viradas os 4 últimos da Série A e os 4 primeiros da Série B trocam de divisão (verificado por
  teste automatizado).
- **SC-002**: Em 100% dos casos testados, um clube rebaixado na temporada N disputa a Série B na
  temporada N+1 e um clube promovido disputa a Série A.
- **SC-003**: Repetir a simulação de 10 temporadas a partir da mesma carreira inicial produz
  históricos idênticos em 100% das execuções, inclusive salvando e carregando entre temporadas.
- **SC-004**: É possível jogar uma temporada no navegador, ver o resumo de fim de temporada,
  avançar e jogar a primeira rodada da temporada seguinte (verificado por um teste de ponta a
  ponta).
- **SC-005**: A virada de temporada termina, do clique em "Próxima temporada" à nova tela
  principal, em menos de 2 segundos.
- **SC-006**: Uma rodada com as duas divisões no modo "simular direto" não leva perceptivelmente
  mais tempo que hoje (menos de 1 segundo do clique aos resultados).
- **SC-007**: Saves de todas as versões anteriores abrem e continuam a carreira em 100% dos
  fixtures de teste.
- **SC-008**: Nenhuma string visível nova fica fora do sistema de idiomas (verificado
  automaticamente).

## Assumptions

- O banco padrão já descreve a Série A e a Série B com 20 clubes cada e 4 vagas de acesso e de
  rebaixamento; esta feature não muda o banco, só passa a disputar todas as divisões.
- Os clubes do computador jogam todas as partidas com as regras automáticas já existentes
  (escalação e substituições automáticas); não há decisões táticas da IA nesta feature.
- "Avançar idades" significa avançar a data do jogo em um ano; a idade continua derivada da data de
  nascimento e da data do jogo. Não há evolução de força, aposentadoria nem geração de jovens
  (fora de escopo; ficam para features seguintes do Marco 3 via pontos de extensão).
- Na virada, as estatísticas da temporada recomeçam: cartões acumulados e suspensões pendentes são
  zerados; lesões em andamento continuam com o tempo restante (são condição do jogador, não
  estatística).
- O elenco de cada clube permanece igual entre temporadas (sem mercado, contratos ou finanças).
- A temporada nova começa no mesmo dia e mês do calendário da temporada anterior, um ano depois.
- A rodada da carreira é única para todas as divisões: todas têm o mesmo número de rodadas no banco
  padrão. Se um mod tiver divisões com números de rodadas diferentes, as divisões mais curtas
  simplesmente não têm jogos nas rodadas finais.
- O histórico guarda só campeões e classificações finais (e a situação do clube do jogador);
  artilharia, registros de partidas e estatísticas de temporadas passadas não são mantidos, para
  limitar o tamanho do save.
- Não há troca de clube pelo jogador, demissão, metas da diretoria nem prêmios em dinheiro por
  posição (diretoria e finanças estão fora de escopo).
- Copas e outras competições continuam fora do escopo; a competição do país é a única.
