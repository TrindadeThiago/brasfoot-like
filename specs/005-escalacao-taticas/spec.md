# Feature Specification: Escalação e táticas

**Feature Branch**: `005-escalacao-taticas`

**Created**: 2026-10-16

**Status**: Draft

**Input**: User description: "Tela de elenco, escalação e táticas do clube do jogador (ver docs/design.md §4 e §6) — prompt `docs/speckit-prompts/marco2/prompt005.md`."

## Contexto

Segunda feature do Marco 2. A 004 entregou a casca do jogo (carreira, saves, telas e "Simular
próxima rodada"), mas o clube do jogador ainda é escalado automaticamente, como os clubes
controlados pelo computador. Esta feature dá ao jogador o controle do time antes de cada partida:
ler o elenco de relance, escolher esquema e postura, definir titulares e reservas, ou pedir a
escalação automática — no espírito do Brasfoot, decisões rápidas e informadas. O motor de partida
já conhece esquemas, posturas, rendimento fora de posição e a escalação automática usada pelos
clubes do computador; a temporada já aceita uma escalação externa e recusa jogadores
indisponíveis.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Montar a escalação: esquema, postura, titulares e reservas (Priority: P1)

Antes da próxima partida, o jogador abre a tela de escalação, escolhe o esquema tático (entre os
esquemas do jogo, ex.: 4-4-2, 4-3-3, 3-5-2) e a postura (defensiva, equilibrada, ofensiva), coloca
um jogador em cada uma das 11 vagas do esquema e escolhe os reservas. A partida seguinte é
disputada com essa escalação.

**Why this priority**: é o coração da feature; sem isso o jogador não influencia as partidas.

**Independent Test**: montar uma escalação diferente da automática, simular a próxima rodada e
conferir no resultado que os titulares, o esquema e a postura usados foram os escolhidos.

**Acceptance Scenarios**:

1. **Given** uma carreira na rodada 1, **When** o jogador abre a escalação, **Then** vê o esquema
   e a postura atuais, as 11 vagas do esquema com o jogador de cada uma, os reservas e os demais
   jogadores do elenco fora da relação.
2. **Given** a tela de escalação, **When** o jogador troca o esquema, **Then** as vagas passam a
   ser as do novo esquema e os mesmos 11 titulares são reacomodados nas vagas novas, priorizando a
   posição de cada um; ninguém sai do time.
3. **Given** uma vaga ocupada, **When** o jogador coloca nela outro jogador (do banco, de fora da
   relação ou de outra vaga), **Then** os dois trocam de lugar e nenhum jogador aparece em dois
   lugares ao mesmo tempo.
4. **Given** uma escalação válida, **When** o jogador simula a próxima rodada, **Then** a partida
   usa exatamente esses titulares, reservas, esquema e postura.
5. **Given** que o jogador saiu do jogo e voltou depois, **When** abre a escalação, **Then** ela
   está como ele deixou.
6. **Given** um jogador escalado numa vaga de outra posição, **When** o jogador olha a vaga,
   **Then** vê a indicação de "fora de posição" com o rendimento esperado nela (ex.: "rende 85%").

---

### User Story 2 - Escalar automaticamente (Priority: P1)

O jogador aperta "Escalar automaticamente" e o jogo monta o melhor time para o esquema escolhido,
com os mesmos critérios que o computador usa para os outros clubes.

**Why this priority**: é o caminho rápido; muitos jogadores só ajustam um ou dois nomes depois.

**Independent Test**: para um esquema e um elenco com indisponíveis, comparar o time montado pelo
botão com o que o computador escolheria para o mesmo clube, esquema e indisponíveis.

**Acceptance Scenarios**:

1. **Given** qualquer esquema e o elenco atual, **When** o jogador aperta "Escalar
   automaticamente", **Then** titulares e reservas ficam idênticos aos que o computador escolheria
   para o clube nesse esquema, já sem os lesionados e suspensos.
2. **Given** uma escalação montada à mão, **When** o jogador usa a escalação automática, **Then**
   a escalação anterior é substituída inteira (esquema e postura são mantidos).
3. **Given** uma carreira nova, **When** o jogador abre a escalação pela primeira vez, **Then** ela
   já vem preenchida com a escalação automática no esquema preferido do clube.

---

### User Story 3 - Avisos e bloqueio de escalação inválida (Priority: P1)

O jogo não deixa a partida começar com uma escalação inválida e explica o problema: titular
lesionado ou suspenso, vaga vazia, jogador repetido. Também avisa quando não há goleiro de ofício
no gol e mostra, em cada vaga, quando o jogador está fora de posição.

**Why this priority**: critério de aceite da feature — nenhuma partida com escalação inválida.

**Independent Test**: tentar simular a rodada com um titular suspenso e com uma vaga vazia e
conferir que a rodada não avança e o motivo aparece.

**Acceptance Scenarios**:

1. **Given** um jogador lesionado ou suspenso, **When** o jogador tenta colocá-lo como titular ou
   reserva, **Then** a escalação mostra o impedimento (motivo e partidas restantes) e fica
   marcada como inválida.
2. **Given** uma escalação inválida (vaga vazia, indisponível escalado ou jogador repetido),
   **When** o jogador tenta simular a rodada, **Then** a rodada não é disputada, a tela mostra o
   que precisa ser corrigido e oferece ir para a escalação.
3. **Given** um jogador de linha no gol, **When** o jogador confirma a escalação ou tenta simular,
   **Then** recebe um aviso de "time sem goleiro" com a perda de rendimento e pode corrigir ou
   seguir mesmo assim.
4. **Given** a lista de problemas, **When** a escalação é corrigida, **Then** os avisos somem na
   hora, sem precisar salvar ou recarregar.

---

### User Story 4 - Elenco: condição, ordenação e filtros (Priority: P2)

O jogador lê o elenco de relance: posição, força, idade, características e condição (disponível,
lesionado ou suspenso, com partidas restantes), além de onde cada um está na escalação (titular,
reserva ou fora). Pode ordenar por qualquer coluna e filtrar por posição e por disponibilidade.

**Why this priority**: informa as decisões de escalação; a 004 já mostra o elenco, aqui ele ganha
filtros e a ligação com a escalação.

**Independent Test**: filtrar o elenco por "atacantes disponíveis" e conferir que só aparecem
atacantes sem impedimento, ordenados pela coluna escolhida.

**Acceptance Scenarios**:

1. **Given** o elenco, **When** o jogador filtra por uma posição, **Then** só aparecem jogadores
   dessa posição; limpar o filtro volta a mostrar todos.
2. **Given** o elenco, **When** o jogador filtra por "disponíveis" ou "indisponíveis", **Then** a
   lista respeita a condição de cada jogador.
3. **Given** o elenco, **When** o jogador ordena por uma coluna e depois aplica um filtro, **Then**
   a ordenação é mantida.
4. **Given** um jogador titular, reserva ou fora da relação, **When** o jogador olha o elenco,
   **Then** vê essa situação na linha do jogador.

---

### User Story 5 - Detalhes do jogador (Priority: P3)

O jogador abre os detalhes de qualquer atleta do seu elenco e vê os atributos visíveis (posição,
força, idade, nacionalidade, características, condição) e o histórico na temporada (jogos,
minutos, gols, assistências, cartões, partidas suspenso e lesionado). Atributos ocultos não
aparecem em lugar nenhum.

**Why this priority**: ajuda a decidir, mas a escalação funciona sem isso.

**Independent Test**: depois de algumas rodadas, abrir os detalhes de um titular e conferir que os
números da temporada batem com os registros das partidas e que nenhum atributo oculto aparece.

**Acceptance Scenarios**:

1. **Given** o elenco ou a escalação, **When** o jogador abre os detalhes de um atleta, **Then**
   vê os atributos visíveis e o histórico da temporada.
2. **Given** um atleta que ainda não jogou, **When** o jogador abre os detalhes, **Then** o
   histórico aparece zerado com a indicação de que ele não jogou na temporada.
3. **Given** qualquer tela desta feature, **When** se inspeciona o que é exibido, **Then** não há
   potencial, temperamento nem propensão a lesões.

---

### Edge Cases

- **Titular fica indisponível entre rodadas** (lesão ou suspensão na partida anterior): antes da
  próxima partida, a escalação é ajustada automaticamente — o indisponível sai, a vaga é ocupada
  pelo melhor jogador disponível para ela (reserva ou de fora da relação, pelos critérios da
  escalação automática) e o restante da escolha do jogador é mantido. Um aviso lista as trocas
  feitas; o jogador pode refazê-las.
- **Reserva fica indisponível**: sai do banco, com o mesmo aviso; o banco não é completado
  automaticamente.
- **Jogador volta de lesão/suspensão**: não volta sozinho à escalação; fica disponível para ser
  escolhido.
- **Menos de 11 jogadores disponíveis no elenco**: a escalação automática completa o time com os
  indisponíveis de menor impedimento, como o computador faz para os outros clubes, e o jogo avisa
  que isso aconteceu; é a única situação em que um indisponível entra em campo.
- **Elenco sem nenhum goleiro disponível**: a escalação automática põe no gol o melhor jogador
  disponível, como faz para o computador, e o aviso de "time sem goleiro" aparece.
- **Troca de esquema com titulares que não cabem nas posições** (ex.: 3 zagueiros para 2 vagas de
  zagueiro): o excedente ocupa a vaga em que rende mais (ex.: volante), com o aviso de "fora de
  posição"; o jogador ajusta se quiser.
- **Banco cheio**: tentar colocar mais reservas que o limite é recusado com aviso.
- **Carreira criada antes desta feature** (save antigo): abre normalmente, com a escalação
  automática no esquema preferido do clube.
- **Temporada encerrada**: a escalação continua visível, mas não há partida a preparar.

## Requirements *(mandatory)*

### Functional Requirements

**Escalação**

- **FR-001**: A escalação do clube do jogador DEVE ter esquema tático (um dos esquemas do jogo),
  postura (defensiva, equilibrada ou ofensiva), exatamente um jogador por vaga do esquema (11
  titulares) e até o limite de reservas do jogo (12).
- **FR-002**: O jogador DEVE poder trocar o esquema, a postura, o jogador de cada vaga e a lista de
  reservas, por mouse e por teclado.
- **FR-003**: Colocar um jogador num lugar já ocupado DEVE trocar os dois de lugar; um jogador
  nunca ocupa dois lugares.
- **FR-004**: Ao trocar o esquema, os mesmos titulares DEVEM ser reacomodados nas vagas novas
  priorizando a posição de cada um (melhor rendimento total); ninguém sai do time.
- **FR-005**: A escalação DEVE ficar salva na carreira entre rodadas e entre sessões, e a partida
  do clube do jogador DEVE ser disputada exatamente com ela.
- **FR-006**: Clubes controlados pelo computador continuam escalados automaticamente, como antes.

**Escalação automática**

- **FR-007**: "Escalar automaticamente" DEVE produzir titulares e reservas idênticos aos que o
  computador escolheria para o clube no esquema atual, considerando os indisponíveis.
- **FR-008**: A escalação automática DEVE manter o esquema e a postura escolhidos e substituir
  titulares e reservas inteiros.
- **FR-009**: Uma carreira nova, ou criada antes desta feature, DEVE começar com a escalação
  automática no esquema preferido do clube e postura equilibrada.

**Validação e avisos**

- **FR-010**: A escalação DEVE ser considerada inválida quando houver vaga vazia, jogador repetido,
  jogador que não é do clube ou jogador lesionado/suspenso entre titulares ou reservas.
- **FR-011**: NÃO DEVE ser possível disputar uma partida com escalação inválida; a tentativa DEVE
  ser recusada com a lista do que corrigir e um atalho para a escalação.
- **FR-012**: Um time sem goleiro de ofício no gol DEVE gerar um aviso (com a perda de rendimento)
  que o jogador pode aceitar; não é um bloqueio.
- **FR-013**: Cada vaga ocupada por um jogador de outra posição DEVE indicar "fora de posição" e o
  rendimento esperado (percentual do motor para aquela combinação de posições).
- **FR-014**: Os avisos DEVEM ser atualizados imediatamente a cada mudança na escalação.
- **FR-015**: Antes de cada partida, titulares que ficaram indisponíveis DEVEM ser substituídos
  automaticamente pelo melhor disponível para a vaga, e reservas indisponíveis DEVEM sair do banco;
  o jogador DEVE ver um aviso com as trocas feitas.
- **FR-016**: Com menos de 11 disponíveis, a escalação DEVE ser completada com os indisponíveis de
  menor impedimento, como o computador faz, com aviso.

**Elenco e detalhes**

- **FR-017**: O elenco DEVE mostrar, por jogador: posição, nome, idade, força, características,
  condição (disponível, lesionado ou suspenso, com partidas restantes) e situação na escalação
  (titular com a vaga, reserva ou fora).
- **FR-018**: O elenco DEVE ser ordenável por qualquer coluna e filtrável por posição e por
  disponibilidade, com filtros combináveis e a ordenação mantida ao filtrar.
- **FR-019**: Os detalhes do jogador DEVEM mostrar posição, força, idade, nacionalidade,
  características, condição e o histórico da temporada (jogos, minutos, gols, assistências,
  amarelos, vermelhos, partidas suspenso e lesionado).
- **FR-020**: Nenhuma tela DEVE exibir atributos ocultos (potencial, temperamento, propensão a
  lesões).

**Interface e dados**

- **FR-021**: Todas as ações desta feature DEVEM ser operáveis só por teclado e só por mouse, com
  foco visível e atalhos documentados na ajuda.
- **FR-022**: A escalação DEVE ficar acessível pela navegação principal do jogo e por atalho de
  teclado.
- **FR-023**: Todo texto visível DEVE vir do sistema de idiomas (pt-BR).
- **FR-024**: Carreiras salvas antes desta feature DEVEM continuar abrindo, migradas para o novo
  formato sem perda de dados.

### Key Entities *(include if feature involves data)*

- **Escalação do jogador**: esquema, postura, mapa vaga → jogador (11 titulares), lista ordenada de
  reservas. Fica na carreira e é usada na partida do clube.
- **Problema da escalação**: tipo (vaga vazia, repetido, fora do clube, indisponível, sem
  goleiro), gravidade (bloqueia ou só avisa) e jogadores/vagas envolvidos.
- **Ajuste automático**: trocas feitas antes de uma partida (quem saiu, por quê, quem entrou em
  qual vaga), mostradas ao jogador.
- **Histórico do jogador na temporada**: jogos, minutos, gols, assistências, cartões, partidas
  suspenso e lesionado, derivados dos registros das partidas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos testes, nenhuma partida do clube do jogador é disputada com escalação
  inválida (vaga vazia, repetido, fora do clube ou indisponível sem a exceção de elenco curto).
- **SC-002**: Em 100% dos casos testados (todos os esquemas, com e sem indisponíveis), a escalação
  automática do jogador é idêntica à que o computador escolheria para o mesmo clube.
- **SC-003**: Em 100% dos testes, a partida usa exatamente a escalação definida pelo jogador, e a
  escalação sobrevive a recarregar a página.
- **SC-004**: Um jogador consegue trocar o esquema, usar a escalação automática e substituir um
  titular em menos de 30 segundos, usando só o teclado.
- **SC-005**: Ao longo de uma temporada simulada inteira com a escalação do jogador, toda
  indisponibilidade de titular é resolvida pelo ajuste automático, com aviso, sem bloquear o jogo.
- **SC-006**: Nenhum atributo oculto aparece em qualquer tela (verificado automaticamente), e
  nenhuma string visível está fora do sistema de idiomas.
- **SC-007**: Um save criado na versão anterior abre com todos os dados preservados e uma escalação
  válida.

## Assumptions

- Esquemas, posturas, limite de reservas (12) e a tabela de rendimento fora de posição são os do
  motor já existente; esta feature não cria nem rebalanceia esquemas.
- A postura escolhida passa a valer para o clube do jogador; os clubes do computador continuam com
  postura equilibrada.
- "Time sem goleiro" é aviso, não bloqueio: o motor permite um jogador de linha no gol (com grande
  perda de rendimento) e há situações reais em que isso acontece.
- A ordem dos reservas é a ordem em que o jogador os coloca; ela só passa a importar com as
  substituições da 006.
- O ajuste automático não reescolhe a escalação inteira: troca só o necessário, para respeitar as
  decisões do jogador.
- Treino, moral, negociação de jogadores e substituições/mudanças táticas durante a partida estão
  fora do escopo (006 e seguintes).
- Os detalhes do jogador cobrem só a temporada atual; histórico de carreira entre temporadas vem
  quando houver mais de uma temporada.
