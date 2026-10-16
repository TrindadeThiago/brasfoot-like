# Feature Specification: Rodada ao vivo e telas da competição

**Feature Branch**: `006-rodada-ao-vivo`

**Created**: 2026-10-16

**Status**: Draft

**Input**: User description: "Rodada ao vivo em texto e telas de acompanhamento da competição (ver docs/design.md §6 e §13, marco M2) — prompt `docs/speckit-prompts/marco2/prompt006.md`."

## Contexto

Última feature do Marco 2 ("jogo uma temporada inteira no navegador"). Hoje o jogador escala o
time (005) e aperta "Simular próxima rodada", que mostra os resultados de uma vez. Esta feature
entrega a assinatura emocional do Brasfoot: todos os jogos da rodada acontecendo ao mesmo tempo,
com o relógio correndo, placares mudando e eventos aparecendo em texto; pausas para substituir e
mudar a tática; o resumo da partida do jogador; e as telas para acompanhar a competição até o
campeão. O motor de partida já avança minuto a minuto, aceita substituições (com limite) e
mudanças de esquema e postura durante o jogo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Assistir à rodada ao vivo (Priority: P1)

O jogador inicia a rodada e vê os 10 jogos ao mesmo tempo: o relógio corre do apito inicial ao
final (cerca de 45 segundos por rodada na velocidade normal), os placares mudam na hora e um feed
em texto narra os eventos (gols, cartões, expulsões, lesões, substituições). O jogo do clube do
jogador fica em destaque, com um feed próprio. Ao fim, a rodada é salva e o jogador vê os
resultados.

**Why this priority**: é a assinatura do jogo e o centro do marco; sem ela a temporada é só uma
sequência de resultados.

**Independent Test**: iniciar uma rodada, ver o relógio avançar até o fim com os 10 placares
atualizando, conferir que cada gol aparece no feed no minuto certo e que os resultados finais são
os mesmos de "simular direto" para a mesma carreira.

**Acceptance Scenarios**:

1. **Given** uma carreira antes de uma rodada, **When** o jogador inicia a rodada ao vivo,
   **Then** vê os 10 jogos com placar 0 × 0, o relógio em 0' e começa a contagem.
2. **Given** a rodada em andamento, **When** acontece um gol em qualquer jogo, **Then** o placar
   daquele jogo muda imediatamente e o feed mostra o autor e o minuto.
3. **Given** a rodada em andamento, **When** o jogador muda a velocidade (lenta, normal, rápida),
   **Then** o relógio passa a correr no novo ritmo sem perder nem repetir eventos.
4. **Given** o fim dos 90 minutos (com acréscimos) de todos os jogos, **When** o último jogo
   termina, **Then** a rodada é salva automaticamente e o jogador vê os resultados e o resumo da
   sua partida.
5. **Given** a mesma carreira e as mesmas decisões, **When** a rodada é jogada ao vivo ou com
   "simular direto", **Then** os placares, eventos e estatísticas são idênticos.

---

### User Story 2 - Pausar, substituir e mudar a tática (Priority: P1)

A qualquer momento o jogador pausa a rodada, faz substituições no seu time e muda o esquema ou a
postura, e retoma. As mudanças valem a partir do minuto em que foram feitas.

**Why this priority**: é a decisão de técnico durante o jogo; o critério de aceite exige
substituições corretas.

**Independent Test**: pausar no minuto 60, fazer duas substituições e mudar a postura, retomar e
conferir no resumo que os reservas entraram no minuto 60, os substituídos não voltam e a postura
mudou.

**Acceptance Scenarios**:

1. **Given** a rodada em andamento, **When** o jogador pausa, **Then** o relógio de todos os
   jogos para e o painel do time mostra titulares em campo, reservas disponíveis, substituições
   restantes, esquema e postura.
2. **Given** a rodada pausada, **When** o jogador troca um titular por um reserva, **Then** a
   troca é registrada no minuto atual, o substituído vai para a lista de "já substituídos" e o
   contador de substituições diminui.
3. **Given** que o limite de substituições foi atingido, **When** o jogador tenta mais uma,
   **Then** a troca é recusada com aviso.
4. **Given** um jogador já substituído, **When** o jogador tenta colocá-lo de volta, **Then** a
   troca é recusada; ele não aparece entre os reservas disponíveis.
5. **Given** a rodada pausada, **When** o jogador muda o esquema ou a postura, **Then** a mudança
   vale a partir do minuto atual e aparece no feed.
6. **Given** um jogador do time do jogador expulso ou lesionado, **When** isso acontece, **Then**
   o jogo trata como no "simular direto" (lesionado sai pela regra automática se houver
   substituição disponível; expulso deixa o time com um a menos) e o evento aparece em destaque.
7. **Given** a rodada pausada, **When** o jogador retoma, **Then** o relógio continua de onde
   parou.

---

### User Story 3 - Simular direto (Priority: P1)

O jogador prefere não assistir: escolhe "simular direto" e vê o resultado da rodada de uma vez. Ou
começa ao vivo e, a qualquer momento, pede "terminar agora".

**Why this priority**: necessário para jogar 38 rodadas num tempo razoável; já existe hoje e
precisa continuar igual ao ao vivo.

**Independent Test**: simular direto uma rodada e comparar com a mesma rodada jogada ao vivo sem
decisões: resultados idênticos.

**Acceptance Scenarios**:

1. **Given** uma carreira antes de uma rodada, **When** o jogador escolhe "simular direto",
   **Then** a rodada inteira é disputada de uma vez, salva e os resultados aparecem.
2. **Given** a rodada ao vivo no minuto 30 sem decisões novas, **When** o jogador pede "terminar
   agora", **Then** os jogos vão até o fim de uma vez com o mesmo resultado que teriam ao vivo.
3. **Given** que o jogador escolheu "simular direto" antes, **When** volta à tela inicial,
   **Then** a escolha (ao vivo ou direto) é lembrada como padrão.

---

### User Story 4 - Resumo da minha partida (Priority: P2)

Ao fim da rodada, o jogador vê o resumo do jogo do seu clube: placar, autores dos gols com minuto
(e assistência), cartões, expulsões, lesões, substituições e estatísticas (finalizações, no alvo,
posse, cartões, pênaltis).

**Why this priority**: fecha a experiência da rodada; dá contexto às decisões.

**Independent Test**: depois de uma rodada, conferir que o resumo bate com os eventos e as
estatísticas registradas da partida.

**Acceptance Scenarios**:

1. **Given** o fim da rodada, **When** o jogador abre o resumo, **Then** vê placar, autores com
   minuto, cartões, lesões, substituições e as estatísticas dos dois times.
2. **Given** uma rodada já disputada, **When** o jogador escolhe essa rodada nos resultados,
   **Then** pode abrir o resumo de qualquer partida dela.

---

### User Story 5 - Acompanhar a competição (Priority: P2)

O jogador acompanha a Série A: classificação, resultados de todas as rodadas (qualquer rodada,
todos os jogos), calendário do seu clube e artilharia (gols e assistências).

**Why this priority**: dá sentido à temporada; parte das telas já existe (classificação,
calendário) e ganha resultados por rodada e artilharia.

**Independent Test**: depois de 5 rodadas, conferir que a tela de resultados mostra os 10 jogos de
cada rodada e que a artilharia lista os maiores goleadores com os mesmos números das partidas.

**Acceptance Scenarios**:

1. **Given** rodadas disputadas, **When** o jogador abre "Resultados" e escolhe uma rodada,
   **Then** vê os 10 jogos com placar e pode abrir o resumo de cada um.
2. **Given** rodadas disputadas, **When** o jogador abre "Artilharia", **Then** vê os maiores
   goleadores (jogador, clube, gols) e os maiores assistentes, com os jogadores do seu clube
   destacados.
3. **Given** uma rodada ainda não disputada, **When** o jogador a escolhe nos resultados, **Then**
   vê os confrontos marcados como "a disputar".

---

### User Story 6 - Fim de temporada (Priority: P2)

Depois da 38ª rodada, o jogador vê a classificação final, o campeão em destaque e a posição final
do seu clube.

**Why this priority**: fecha o marco ("jogar a temporada inteira").

**Independent Test**: jogar (ou simular direto) até o fim e conferir a tela de fim de temporada
com o campeão igual ao 1º da classificação.

**Acceptance Scenarios**:

1. **Given** a 38ª rodada terminada, **When** os resultados são mostrados, **Then** o jogo leva à
   tela de fim de temporada com o campeão, a classificação final e a posição do clube do jogador.
2. **Given** a temporada encerrada, **When** o jogador volta ao jogo depois, **Then** a tela
   inicial mostra o campeão e a posição final e não oferece mais rodadas.

---

### Edge Cases

- **Sair no meio da rodada** (fechar a aba, recarregar, ir para outra tela): a rodada em andamento
  não é salva; ao voltar, a carreira está antes da rodada e ela recomeça do início. Trocar de tela
  no jogo durante a rodada pede confirmação.
- **Escalação inválida ao iniciar**: as mesmas regras da 005 (bloqueio ou confirmação) valem antes
  de começar ao vivo ou simular direto.
- **Substituição de jogador lesionado já substituído automaticamente**: o reserva que entrou pela
  regra automática conta no limite; o jogador vê isso no painel.
- **Mudança de esquema com um a menos**: o esquema vale para os jogadores em campo; as vagas sem
  jogador continuam vazias (o motor já trata).
- **Jogo abandonado** (regra do motor: menos de 7 em campo): o jogo termina antes; o feed avisa e
  o resultado segue a regra da temporada.
- **Navegador lento ou aba em segundo plano**: o relógio pode atrasar, mas nenhum evento é
  perdido, repetido ou fora de ordem; ao voltar, a rodada continua de onde parou.
- **Velocidade mudada várias vezes**: o resultado não muda.
- **Última rodada**: ao terminar, leva ao fim de temporada (US6).

## Requirements *(mandatory)*

### Functional Requirements

**Rodada ao vivo**

- **FR-001**: O jogador DEVE poder iniciar a próxima rodada ao vivo, com os 10 jogos acontecendo
  ao mesmo tempo sob um relógio único (do 0' ao fim, com intervalo e acréscimos).
- **FR-002**: A duração padrão de uma rodada DEVE ficar entre 30 e 60 segundos; o jogador DEVE
  poder escolher entre pelo menos três velocidades e mudar a qualquer momento.
- **FR-003**: Cada jogo DEVE mostrar os escudos, os placares atualizados no minuto do gol e
  indicação de expulsões; o jogo do clube do jogador DEVE ficar em destaque.
- **FR-004**: Um feed em texto DEVE narrar, em ordem, gols (autor, assistência, minuto), cartões
  amarelos, expulsões, lesões, substituições, mudanças de esquema/postura e intervalo/fim; o feed
  do jogo do jogador DEVE ser mostrado à parte.
- **FR-005**: Os textos do feed DEVEM vir de modelos traduzíveis com pelo menos três variações
  para gols e duas para pênaltis, cartões, expulsões, lesões, substituições e mudanças táticas
  (início, intervalo e fim podem ter uma só); a variação escolhida DEVE ser sempre a mesma para o
  mesmo evento da mesma carreira.
- **FR-006**: Ao fim da rodada, ela DEVE ser salva automaticamente; o estado no meio da rodada não
  é salvo.

**Decisões durante a partida**

- **FR-007**: O jogador DEVE poder pausar e retomar a rodada a qualquer momento; pausado, o relógio
  de todos os jogos para.
- **FR-008**: Pausado, o jogador DEVE poder substituir jogadores do seu time (reserva da relação
  por jogador em campo), mudar o esquema e a postura; as mudanças valem a partir do minuto atual.
- **FR-009**: Substituições DEVEM respeitar o limite por partida (5); jogadores substituídos ou
  expulsos NÃO PODEM voltar; o painel DEVE mostrar as substituições restantes.
- **FR-010**: O jogo DEVE oferecer pausa automática (desligável) quando um jogador do time do
  jogador se lesionar ou for expulso.
- **FR-011**: Clubes do computador seguem as regras automáticas do motor (iguais às do "simular
  direto"); não fazem mudanças táticas por conta própria nesta feature.

**Simular direto e equivalência**

- **FR-012**: O jogador DEVE poder simular a rodada direto (resultado de uma vez) e, durante a
  rodada ao vivo, pedir "terminar agora".
- **FR-013**: Ao vivo, "terminar agora" e "simular direto" DEVEM chegar ao mesmo resultado
  (placares, eventos, estatísticas, disciplina e lesões) para a mesma carreira e as mesmas
  decisões nos mesmos minutos.
- **FR-014**: A preferência entre ao vivo e direto e a velocidade DEVEM ser lembradas.

**Resumo e competição**

- **FR-015**: Ao fim da rodada, o jogador DEVE ver o resumo da sua partida: placar, autores com
  minuto e assistência, cartões, expulsões, lesões, substituições e estatísticas dos dois times.
- **FR-016**: Uma tela de resultados DEVE mostrar os jogos de qualquer rodada (disputada ou não) e
  permitir abrir o resumo de qualquer partida disputada.
- **FR-017**: Uma tela de artilharia DEVE listar os maiores goleadores e assistentes da
  competição (jogador, clube, número), com os do clube do jogador destacados.
- **FR-018**: A classificação e o calendário continuam disponíveis e refletem cada rodada assim
  que ela termina.
- **FR-019**: Ao fim da 38ª rodada, o jogo DEVE mostrar a tela de fim de temporada com o campeão,
  a classificação final e a posição do clube do jogador; depois disso não há mais rodadas.

**Interface**

- **FR-020**: Todas as ações (iniciar, pausar, retomar, velocidade, substituir, esquema, postura,
  terminar agora, simular direto) DEVEM ser operáveis por teclado e por mouse, com atalhos
  documentados na ajuda.
- **FR-021**: Os placares e eventos importantes do jogo do jogador DEVEM ser anunciados para
  leitores de tela sem inundar com todos os eventos de todos os jogos.
- **FR-022**: Todo texto visível DEVE vir do sistema de idiomas (pt-BR).

### Key Entities *(include if feature involves data)*

- **Rodada em andamento**: o relógio, o estado de cada um dos 10 jogos, as decisões do jogador já
  aplicadas e a velocidade; existe só na memória enquanto a rodada acontece.
- **Decisão do jogador**: substituição, mudança de esquema ou de postura, com o minuto em que foi
  feita.
- **Texto de evento**: modelo traduzível com variações por tipo de evento (gol, cartão, lesão…),
  preenchido com jogador, clube e minuto.
- **Resumo da partida**: placar, eventos do jogo e estatísticas dos dois times, derivados do
  registro da partida.
- **Artilharia**: gols e assistências por jogador na competição, derivados dos registros.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: É possível jogar as 38 rodadas da Série A do início ao fim no navegador, terminando
  na tela do campeão (verificado por um teste de ponta a ponta).
- **SC-002**: Em 100% dos testes, para a mesma carreira e as mesmas decisões, a rodada ao vivo e o
  "simular direto" produzem placares, eventos e estatísticas idênticos.
- **SC-003**: Em 100% dos testes, nenhuma partida tem mais substituições que o limite e nenhum
  jogador substituído ou expulso volta a campo.
- **SC-004**: Na velocidade normal, uma rodada dura entre 30 e 60 segundos; a interface atualiza os
  10 placares sem travar perceptivelmente (cada atualização em menos de 50 ms).
- **SC-005**: Uma temporada inteira com "simular direto" leva menos de 2 minutos de interação.
- **SC-006**: Todo evento do feed usa texto traduzível; nenhuma string visível fica fora do sistema
  de idiomas (verificado automaticamente).
- **SC-007**: Todas as ações da rodada são realizáveis só com o teclado.

## Assumptions

- O limite de substituições é o do motor (5 por partida) e as regras de substituição automática de
  lesionados também; esta feature não muda o motor de partida, só passa a avançar os jogos minuto
  a minuto e a aplicar as decisões do jogador.
- Clubes do computador não fazem substituições táticas nem mudam esquema/postura durante o jogo
  (só as regras automáticas do motor), para que ao vivo e direto coincidam.
- A rodada ao vivo não é salvável no meio (requisito do prompt); sair dela descarta o andamento.
- A narração é em texto; não há som nem animação de campo.
- Artilharia e resultados cobrem só a temporada atual da Série A; Série B, virada de temporada,
  finanças e manchetes estão fora do escopo.
- O fim de temporada encerra a carreira nesta versão (não há "próxima temporada" até o Marco 3).
