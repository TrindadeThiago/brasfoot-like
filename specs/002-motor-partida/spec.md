# Feature Specification: Motor de partida

**Feature Branch**: `002-motor-partida`

**Created**: 2026-10-16

**Status**: Draft

**Input**: User description: "Motor de simulação de partidas minuto a minuto (ver docs/design.md §4 e §6) — prompt `docs/speckit-prompts/marco1/prompt002.md`."

## Contexto

Esta feature usa o mundo da feature 001: jogadores com posição (`GK`, `FB`, `CB`, `DM`, `MF`,
`FW`), força 1–100, até 2 características e atributos ocultos completos (potencial,
temperamento e propensão a lesões, preenchidos pela seed da carreira). O motor de partida não
tem interface: quem o usa é a rodada ao vivo e o "simular direto" (Marco 2), a IA dos clubes e
os testes de temporada (feature 003).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Simular uma partida completa (Priority: P1)

Dados dois clubes com suas escalações, esquemas e posturas, o mando de campo e uma seed, o
jogo simula os 90 minutos (mais acréscimos) e devolve o placar, a lista de eventos com o minuto
de cada um, estatísticas básicas e o estado de cada jogador ao final. A mesma entrada com a mesma
seed sempre produz exatamente a mesma partida.

**Why this priority**: sem partidas não há temporada; é o núcleo do Marco 1 e de todo o jogo.

**Independent Test**: montar duas escalações válidas, simular com uma seed fixa, conferir que o
resultado é coerente (placar = gols nos eventos, estatísticas consistentes) e que repetir a
simulação gera exatamente os mesmos eventos.

**Acceptance Scenarios**:

1. **Given** duas escalações válidas e a seed 42, **When** a partida é simulada, **Then** o
   resultado traz placar, eventos em ordem cronológica, estatísticas de cada time e estado de
   cada jogador que entrou em campo.
2. **Given** a mesma entrada e a mesma seed, **When** a partida é simulada duas vezes, **Then**
   as duas sequências de eventos e os dois resultados são idênticos.
3. **Given** o resultado de uma partida, **When** se contam os eventos de gol de cada time,
   **Then** a contagem é igual ao placar e todo gol tem autor (e assistência quando houver).
4. **Given** uma escalação inválida (ex.: 10 titulares, jogador repetido, jogador de outro
   clube), **When** se tenta iniciar a partida, **Then** ela é rejeitada com um erro codificado
   que identifica o problema, sem simular nada.

---

### User Story 2 - Resultados críveis em grande volume (Priority: P2)

Quem joga espera que o futebol simulado se pareça com o real: placares típicos, empates
frequentes, vantagem de jogar em casa, favoritos vencendo na maioria das vezes mas com zebras,
e decisões táticas com efeito perceptível.

**Why this priority**: o critério de pronto do Marco 1 é "placares realistas, favoritos
geralmente no topo". Sem calibragem verificável, a temporada da feature 003 não fica crível.

**Independent Test**: simular milhares de partidas entre times de forças variadas, sem
interação, e medir automaticamente as estatísticas contra as faixas de FR-040 a FR-049.

**Acceptance Scenarios**:

1. **Given** milhares de partidas entre times de forças variadas, **When** as estatísticas são
   medidas, **Then** gols por jogo, empates, mando de campo, cartões, lesões e pênaltis ficam
   dentro das faixas definidas.
2. **Given** dois times idênticos, um com postura ofensiva e outro equilibrada, **When**
   milhares de partidas são simuladas, **Then** o time ofensivo marca e sofre mensuravelmente
   mais gols do que marcaria com postura equilibrada.
3. **Given** um time que perde um jogador expulso cedo, **When** milhares de partidas são
   simuladas, **Then** seu desempenho é mensuravelmente pior do que com 11 jogadores.

---

### User Story 3 - Avançar em passos e mudar a partida no meio (Priority: P3)

A rodada ao vivo mostra os jogos minuto a minuto e permite pausar para substituir jogadores,
trocar o esquema ou a postura. O motor permite avançar a partida em passos e aplicar mudanças
entre passos; o "simular direto" é o mesmo motor avançando até o fim sem mudanças.

**Why this priority**: viabiliza a rodada ao vivo do Marco 2 e garante que os dois modos de
jogo produzem o mesmo resultado. Depende da US1.

**Independent Test**: simular uma partida minuto a minuto sem mudanças e comparar com a
simulação direta (devem ser idênticas); depois aplicar uma substituição no minuto 60 e
conferir que ela aparece nos eventos e afeta o restante da partida, de forma determinística.

**Acceptance Scenarios**:

1. **Given** uma partida iniciada, **When** ela é avançada minuto a minuto até o fim sem
   mudanças, **Then** o resultado é idêntico ao da simulação direta com a mesma seed.
2. **Given** uma partida no minuto 60, **When** uma substituição válida é aplicada, **Then** o
   evento de substituição aparece no minuto 60, o jogador que saiu não volta e o que entrou
   passa a participar dos eventos seguintes.
3. **Given** um time que já usou todas as substituições, **When** tenta mais uma, **Then** a
   mudança é rejeitada com erro codificado e o estado da partida não muda.
4. **Given** uma partida com mudança de esquema e de postura no intervalo, **When** ela é
   repetida com a mesma seed e as mesmas mudanças nos mesmos minutos, **Then** o resultado é
   idêntico.
5. **Given** um jogador que se lesionou, **When** o controlador do time não faz a troca antes do
   passo seguinte, **Then** o motor aplica a substituição automática padrão (se houver
   substituição disponível) ou o time segue com um a menos.

---

### User Story 4 - Escalação automática (Priority: P4)

A IA dos clubes, e o jogador como sugestão, precisam de uma escalação razoável a partir de um
elenco e de um esquema: os melhores 11 nas posições do esquema e um banco de reservas que cubra
as posições.

**Why this priority**: necessária para a IA e para simular temporadas inteiras sem interação
(feature 003). Pode ser desenvolvida em paralelo com US2/US3.

**Independent Test**: para cada esquema do catálogo, gerar a escalação automática de vários
elencos do banco padrão e conferir validade, cobertura do banco e que nenhuma troca simples
entre titular e reserva melhora a força efetiva do time.

**Acceptance Scenarios**:

1. **Given** um elenco do banco padrão e o esquema 4-4-2, **When** a escalação automática é
   gerada, **Then** ela é válida, tem exatamente 1 goleiro de ofício no gol e 11 titulares.
2. **Given** a escalação automática, **When** se troca qualquer titular por qualquer reserva
   apto, **Then** a força efetiva do time não aumenta.
3. **Given** um elenco com jogadores indisponíveis (lesionados ou suspensos, informados na
   entrada), **When** a escalação é gerada, **Then** nenhum indisponível é escalado.
4. **Given** um elenco com 2 goleiros, **When** a escalação é gerada, **Then** um goleiro é
   titular e o outro fica no banco.

---

### Edge Cases

- Goleiro expulso com substituição disponível e goleiro no banco → a troca automática padrão
  coloca o goleiro reserva no lugar de um jogador de linha; sem goleiro no banco ou sem
  substituições, um jogador de linha vai para o gol, com rendimento muito menor.
- Goleiro lesionado sem goleiro no banco → um jogador de linha vai para o gol.
- Lesão sem substituição disponível → o time segue com um a menos até o fim.
- Jogador que já tem cartão amarelo recebe outro → segundo amarelo gera expulsão.
- Time reduzido a menos de 7 jogadores → a partida é encerrada; o adversário vence por 3 a 0,
  ou pelo placar do momento se for mais favorável a ele.
- Substituição de jogador expulso, de jogador que já saiu ou de reserva que já entrou e saiu →
  rejeitada com erro codificado.
- Reserva lesionado/indisponível chamado para entrar → rejeitado.
- Mudanças aplicadas depois do fim da partida → rejeitadas.
- Escalação com jogador de linha no gol ou goleiro na linha → aceita, com penalidade de
  rendimento por estar fora de posição.
- Vários eventos no mesmo minuto → ordem determinística e estável.
- Eventos nos acréscimos → registrados com o minuto base e o minuto de acréscimo (ex.: 45+2,
  90+4).
- Elenco sem goleiros disponíveis na escalação automática → o melhor jogador para a função vai
  ao gol (com penalidade) e a escalação continua válida.
- Elenco com menos de 11 jogadores disponíveis → a escalação automática informa erro
  codificado; não é possível iniciar a partida.

## Requirements *(mandatory)*

### Functional Requirements

**Entrada da partida**

- **FR-001**: A partida DEVE receber, para cada time (mandante e visitante): a escalação (11
  titulares, cada um associado a uma vaga do esquema), o banco de reservas, o esquema tático e a
  postura; além disso: indicação de campo neutro (padrão: não), limite de substituições (padrão
  5), tamanho máximo do banco (padrão 12) e a seed.
- **FR-002**: Os dados de cada jogador usados pelo motor DEVEM ser: posição, força,
  características e os atributos ocultos temperamento e propensão a lesões (do mundo com
  atributos ocultos completos, feature 001).
- **FR-003**: O jogo DEVE oferecer um catálogo fixo de esquemas com ao menos 4-4-2, 4-3-3,
  3-5-2, 4-5-1, 5-3-2 e 4-2-3-1. Cada esquema define 11 vagas, cada uma com a posição esperada
  (exatamente uma vaga de goleiro).
- **FR-004**: As posturas DEVEM ser: defensiva, equilibrada e ofensiva.
- **FR-005**: A entrada DEVE ser validada antes da simulação: exatamente 11 titulares, todos os
  jogadores distintos, todos do respectivo clube, nenhum jogador nos dois times, banco dentro do
  tamanho máximo, nenhum jogador indisponível escalado. Problemas DEVEM ser reportados como
  erros codificados com parâmetros, traduzíveis pelo sistema de idiomas.

**Força efetiva**

- **FR-006**: A força efetiva de cada time DEVE ser calculada por setor — goleiro, defesa, meio
  e ataque — a partir da força dos jogadores em campo, da adequação de cada um à vaga que ocupa
  e de suas características.
- **FR-007**: Jogador fora de posição DEVE render menos; quanto mais distante a posição da vaga
  (ex.: lateral como zagueiro < lateral como atacante), maior a perda. Jogador de linha no gol e
  goleiro na linha DEVEM ter a maior perda.
- **FR-008**: O esquema DEVE influenciar o peso de cada setor (ex.: 5-3-2 fortalece a defesa e
  enfraquece o ataque em relação ao 4-3-3) e a postura DEVE deslocar o equilíbrio entre criar e
  evitar chances (ofensiva: mais chances a favor e contra; defensiva: menos de ambas).
- **FR-009**: As características DEVEM afetar situações específicas, cada uma com efeito
  mensurável na direção esperada:
  - Artilheiro: maior conversão de chances em gol.
  - Cabeceio: mais perigo em jogadas aéreas, no ataque e na defesa.
  - Muralha: goleiro defende mais; defensor bloqueia mais chances.
  - Cobrador de falta: maior conversão de faltas e pênaltis.
  - Velocidade: mais chances criadas em contra-ataques.
  - Armador: mais chances criadas e mais assistências.
- **FR-010**: Jogar com menos jogadores (expulsão ou lesão sem substituição) DEVE reduzir a força
  efetiva do time de forma proporcional e mensurável.
- **FR-011**: Jogar em casa DEVE dar uma vantagem ao mandante; em campo neutro, nenhum time tem
  vantagem.

**Simulação**

- **FR-012**: A partida DEVE ser simulada minuto a minuto: 2 tempos de 45 minutos, cada um com
  acréscimos de 0 a 5 minutos (1º tempo) e de 1 a 8 minutos (2º tempo), definidos pelo que
  aconteceu no tempo (gols, substituições, lesões, cartões).
- **FR-013**: A cada minuto, a partir das forças efetivas, do mando, do placar, do minuto e da
  aleatoriedade com seed, o motor DEVE poder gerar eventos: chance de gol (com desfecho: gol,
  defesa do goleiro, bloqueio ou para fora), gol (com autor e, quando houver, assistência),
  pênalti (marcado → convertido, defendido ou desperdiçado), cartão amarelo, cartão vermelho
  (direto ou por segundo amarelo) e lesão.
- **FR-014**: Autor de gol, assistente, faltoso e lesionado DEVEM ser escolhidos entre os
  jogadores em campo, com probabilidade coerente com posição, força e características (ex.:
  atacantes marcam mais que zagueiros; quem tem Armador dá mais assistências).
- **FR-015**: A chance de cartão de um jogador DEVE crescer com seu temperamento; a chance de
  lesão DEVE crescer com sua propensão a lesões.
- **FR-016**: Cada lesão DEVE ter uma gravidade (leve, média ou grave), registrada para uso
  futuro; o jogador lesionado não pode continuar em campo.
- **FR-017**: Jogador expulso DEVE sair sem reposição; jogador lesionado DEVE sair e pode ser
  substituído se houver substituição disponível.
- **FR-018**: Toda aleatoriedade DEVE vir da seed da partida: mesma entrada + mesma seed + mesmas
  mudanças nos mesmos minutos ⇒ mesma sequência de eventos e mesmo resultado.
- **FR-019**: Os eventos DEVEM ser dados estruturados (tipo, minuto, minuto de acréscimo, time,
  jogadores envolvidos, desfecho), sem texto pronto; a narração é responsabilidade de outra
  camada.
- **FR-020**: O motor DEVE registrar também marcos da partida como eventos: início, intervalo,
  reinício, fim.

**Passos e mudanças**

- **FR-021**: O motor DEVE permitir iniciar uma partida, avançá-la em passos de N minutos (N ≥ 1)
  ou até o fim, e consultar o estado atual (minuto, placar, eventos até agora, jogadores em campo,
  substituições restantes) a qualquer momento.
- **FR-022**: Simular direto e avançar em passos sem mudanças DEVEM produzir resultados
  idênticos para a mesma entrada e seed.
- **FR-023**: Entre passos, o controlador de cada time DEVE poder aplicar: substituição (até o
  limite), troca de esquema (com nova distribuição dos jogadores nas vagas) e troca de postura.
  Mudanças também DEVEM poder ser aplicadas no intervalo.
- **FR-024**: Mudanças inválidas (limite de substituições atingido, jogador que não está no banco,
  jogador expulso ou já substituído, reserva indisponível, partida encerrada) DEVEM ser rejeitadas
  com erro codificado, sem alterar o estado da partida.
- **FR-025**: Quando um jogador se lesiona ou o goleiro é expulso, a partida DEVE sinalizar uma
  mudança pendente para o time. Se o controlador não resolver antes do passo seguinte, o motor
  DEVE aplicar a mudança automática padrão: substituir pelo reserva mais adequado (goleiro por
  goleiro) se houver substituição disponível; caso contrário, reorganizar o time (um jogador de
  linha vai ao gol, se necessário).
- **FR-026**: O estado da partida DEVE poder ser copiado/serializado e retomado, produzindo a
  mesma continuação (inclui o estado da aleatoriedade).

**Escalação automática**

- **FR-027**: Dado um elenco, a lista de jogadores indisponíveis e um esquema, o motor DEVE
  produzir uma escalação válida: 11 titulares nas vagas do esquema e um banco de até o tamanho
  máximo.
- **FR-028**: A escolha dos titulares DEVE maximizar a força efetiva do time no esquema, de modo
  que nenhuma troca entre um titular e um reserva disponível aumente essa força.
- **FR-029**: O banco DEVE priorizar cobertura de posições: incluir um goleiro reserva quando
  houver e ao menos um reserva para cada setor, completando com os melhores restantes.
- **FR-030**: A escalação automática DEVE ser determinística (mesmo elenco e esquema ⇒ mesma
  escalação), com desempate estável.

**Saída**

- **FR-031**: O resultado DEVE conter: placar, lista completa de eventos em ordem, se a partida
  terminou normalmente ou foi encerrada (menos de 7 jogadores), e as estatísticas de cada time:
  finalizações, finalizações no alvo, posse de bola estimada (os dois times somam 100%),
  cartões amarelos e vermelhos, pênaltis.
- **FR-032**: O resultado DEVE conter o estado de cada jogador que participou: minutos jogados,
  gols, assistências, cartões, se foi expulso, se se lesionou (e a gravidade), se entrou ou saiu
  por substituição.

**Faixas de realismo (verificadas por simulação longa, Princípio V)**

Medidas sobre ao menos 10.000 partidas entre times montados a partir do banco padrão, com
escalação automática, posturas equilibradas e mando normal, salvo indicação:

- **FR-040**: Média de gols por partida entre 2,2 e 3,0.
- **FR-041**: Proporção de empates entre 22% e 30%.
- **FR-042**: Entre times de força equivalente, o mandante vence entre 40% e 52% e o visitante
  entre 22% e 34%; em campo neutro, a diferença entre as vitórias dos dois lados fica abaixo de 4
  pontos percentuais.
- **FR-043**: Quando a força média dos titulares de um time supera a do outro em 10 pontos ou
  mais, o mais forte vence ao menos 60% e perde entre 5% e 20% das partidas (zebras acontecem).
- **FR-044**: Postura ofensiva (contra adversário equilibrado de mesma força) aumenta gols
  marcados e sofridos em ao menos 10% cada, em relação a jogar equilibrado; postura defensiva
  reduz ambos em ao menos 10%.
- **FR-045**: Um time com um jogador expulso até o minuto 30 vence ao menos 10 pontos
  percentuais a menos do que venceria com 11, contra o mesmo adversário.
- **FR-046**: Cartões amarelos entre 3 e 6 por partida; cartões vermelhos entre 0,05 e 0,30 por
  partida; jogadores com temperamento ≥ 80 recebem ao menos o dobro de cartões por minuto
  jogado que os com temperamento ≤ 20.
- **FR-047**: Lesões entre 0,1 e 0,5 por partida; jogadores com propensão ≥ 80 se lesionam ao
  menos o dobro por minuto jogado que os com propensão ≤ 20.
- **FR-048**: Pênaltis entre 0,15 e 0,40 por partida, com conversão entre 70% e 85%.
- **FR-049**: Finalizações entre 18 e 30 por partida (somando os dois times), com 30% a 45% no
  alvo; menos de 0,5% das partidas têm um time marcando 7 gols ou mais; posse de bola de cada
  time entre 30% e 70% em ao menos 95% das partidas, maior para o time de meio-campo mais forte.

**Mensagens**

- **FR-050**: Todo erro de entrada ou de mudança DEVE ter código e parâmetros, com mensagem
  pt-BR no sistema de idiomas (mesmo padrão da feature 001).

### Key Entities *(include if feature involves data)*

- **Esquema**: item de um catálogo fixo (ex.: 4-4-2); 11 vagas, cada uma com a posição esperada e
  o setor a que pertence.
- **Postura**: defensiva, equilibrada ou ofensiva.
- **Escalação**: esquema, postura, 11 titulares (jogador ↔ vaga) e banco de reservas.
- **Entrada da partida**: escalações do mandante e do visitante, jogadores de cada clube (com
  atributos ocultos completos), campo neutro, limite de substituições, tamanho do banco, seed.
- **Estado da partida**: minuto atual, tempo (1º/2º), acréscimos, placar, jogadores em campo e
  nas vagas, banco, substituições usadas, cartões, mudanças pendentes, eventos até agora e estado
  da aleatoriedade.
- **Evento**: tipo, minuto (e acréscimo), time, jogadores envolvidos, desfecho.
- **Mudança**: substituição (sai, entra, vaga), troca de esquema (com nova distribuição) ou troca
  de postura, aplicada por um time entre passos.
- **Resultado**: placar, eventos, término normal ou encerrado, estatísticas por time e estado
  final de cada jogador.
- **Erro de partida**: código e parâmetros (ex.: escalação com 10 titulares, substituição além do
  limite), traduzido pelo sistema de idiomas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos testes, a mesma entrada com a mesma seed (e as mesmas mudanças nos
  mesmos minutos) produz a mesma sequência de eventos; avançar em passos sem mudanças dá o mesmo
  resultado que simular direto.
- **SC-002**: Todas as faixas de FR-040 a FR-049 são atendidas em simulações longas automáticas.
- **SC-003**: Cada característica do catálogo mostra, em simulação longa, efeito mensurável na
  direção esperada sobre a estatística relacionada (FR-009).
- **SC-004**: Toda regra de validação de entrada e de mudança tem ao menos um caso de teste que a
  rejeita com o código esperado; 100% dos códigos têm mensagem pt-BR.
- **SC-005**: A escalação automática é válida para 100% dos elencos do banco padrão em todos os
  esquemas do catálogo, e nenhuma troca titular↔reserva aumenta a força efetiva.
- **SC-006**: Uma rodada completa (10 partidas) é simulada direto em menos de 100 ms, e 10.000
  partidas em menos de 60 s, em um computador comum.
- **SC-007**: Em 100% das partidas simuladas, o resultado é consistente: placar igual aos gols nos
  eventos, nenhum jogador participa de eventos depois de sair, substituições nunca passam do
  limite e estatísticas fecham com os eventos.

## Assumptions

- Não há interface nem narração em texto nesta feature; o uso é pela API do motor, por scripts e
  testes.
- Não há cansaço dentro da partida nem acumulado entre partidas, nem moral; a força de um jogador
  é constante durante o jogo (exceto por estar fora de posição ou o time estar com menos jogadores).
- Indisponibilidade (lesão, suspensão) vem pronta na entrada; a duração de lesões e suspensões é
  tratada nas features de temporada e carreira.
- O banco de reservas padrão tem até 12 jogadores e o limite padrão é 5 substituições, ambos
  configuráveis; não há limite de "janelas" de substituição.
- O catálogo de esquemas é fixo no jogo (o motor precisa conhecer suas vagas), como posições e
  características na feature 001.
- A posse de bola é estimada a partir do domínio do meio-campo ao longo da partida, não medida
  lance a lance.
- A vantagem de mando é uma constante do jogo nesta feature; torcida e estádio passam a
  influenciar no Marco 5.
- "Força equivalente" e "força média dos titulares" usam a força dos 11 titulares em suas posições
  de origem; as faixas de realismo são medidas com times montados por escalação automática a
  partir do banco padrão e de variações dele.
- A partida encerrada por falta de jogadores segue a regra do placar mínimo de 3 a 0 para o
  adversário, como no futebol real.
