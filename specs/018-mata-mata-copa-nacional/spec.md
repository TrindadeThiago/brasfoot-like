# Feature Specification: Mata-mata e copa nacional

**Feature Branch**: `018-mata-mata-copa-nacional`

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description: "Formato de disputa em mata-mata e uma copa nacional no mundo padrão (ver docs/design.md §3, §6 e §14) — prompt `docs/speckit-prompts/marco7/prompt018.md`."

## Contexto

Segunda feature do Marco 7 (Copas). A 017 deu à temporada um calendário de datas em que várias
competições de pontos corridos convivem, com condição física, cartões por competição e sistemas
(finanças, torcida, diretoria, manchetes) reagindo a jogos de qualquer competição. Falta o formato
que torna a copa uma copa: o **mata-mata**. Hoje o tipo `knockout` é só reservado no formato de
mod (o banco que o usa é recusado), o motor de partida não decide empates (uma partida acaba nos 90
minutos) e o mundo padrão tem uma única liga.

Esta feature faz o formato `knockout` funcionar, com fases descritas só por dados, e dá ao mundo
padrão a sua **copa nacional**, disputada junto com o campeonato. Um confronto eliminatório sempre
termina com um classificado: se o placar não decide, entram prorrogação e pênaltis, também na
rodada ao vivo. Fase de grupos, vagas da copa para outras competições e supercopa ficam fora.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Copa nacional junto com o campeonato (Priority: P1)

O jogador começa uma carreira no mundo padrão e, além da liga, o clube dele disputa a copa nacional
em datas de meio de semana. Ele vê o chaveamento da copa, o próximo confronto dele, joga cada
partida ao vivo ou direto, e acompanha o torneio até a final.

**Why this priority**: é o objetivo da feature e o segundo critério de aceite. Sem a copa jogável
no calendário, as demais histórias não têm onde acontecer.

**Independent Test**: criar uma carreira no banco padrão, jogar a temporada inteira e conferir que o
clube alterna jogos de liga e de copa, que a copa avança fase a fase com o chaveamento atualizado e
que termina com um campeão.

**Acceptance Scenarios**:

1. **Given** uma carreira nova no banco padrão, **When** o jogador abre a Início, **Then** o calendário
   inclui a copa nacional e o próximo compromisso pode ser de liga ou de copa, com a fase indicada
   nos jogos da copa.
2. **Given** a copa em andamento, **When** o jogador abre o chaveamento, **Then** vê todas as fases,
   os confrontos já definidos com seus resultados, os classificados e os confrontos ainda por definir.
3. **Given** o clube do jogador foi eliminado, **When** o tempo passa, **Then** a copa continua sendo
   disputada sem ele (jogos simulados), e o chaveamento segue sendo atualizado até a final.
4. **Given** a final disputada, **When** a copa termina, **Then** o campeão fica registrado e visível
   na tela da copa e no histórico de campeões.
5. **Given** a temporada termina, **When** a virada acontece, **Then** a copa da temporada seguinte
   recomeça do zero, com novo sorteio.

---

### User Story 2 - Empate decidido na prorrogação ou nos pênaltis (Priority: P1)

Todo confronto eliminatório termina com um classificado. Quando o placar do jogo único (ou o
agregado da ida e volta) não decide, a fase manda para a prorrogação e, persistindo o empate, para
a disputa de pênaltis. O jogador acompanha tudo isso na rodada ao vivo, inclusive as cobranças.

**Why this priority**: é o que distingue o mata-mata da liga e o terceiro critério de aceite. Sem
isso, um empate trava o chaveamento.

**Independent Test**: simular um confronto empatado em 90 minutos e conferir que a prorrogação é
jogada, que, ainda empatado, os pênaltis são cobrados cobrança a cobrança e que há sempre um
vencedor; repetir ao vivo e conferir que o resultado é o mesmo que o direto.

**Acceptance Scenarios**:

1. **Given** um jogo único empatado ao fim dos 90 minutos, **When** a fase tem prorrogação, **Then**
   são jogados mais 30 minutos (dois tempos de 15) e o vencedor é quem estiver à frente no fim.
2. **Given** o empate persiste depois da prorrogação (ou a fase não tem prorrogação), **When** a
   decisão vai aos pênaltis, **Then** cada time cobra uma série de 5 cobranças alternadas, depois
   cobranças alternadas até haver diferença, e o resultado dos pênaltis fica registrado.
3. **Given** um confronto de ida e volta, **When** o agregado dos dois jogos está empatado, **Then**
   o critério da fase decide: gols fora de casa (se a fase os usa), depois prorrogação (se houver)
   e por fim pênaltis, jogados depois da volta.
4. **Given** um confronto de ida e volta com vencedor no agregado, **When** a volta termina, **Then**
   não há prorrogação nem pênaltis.
5. **Given** uma disputa de pênaltis na rodada ao vivo, **When** ela acontece, **Then** o jogador vê
   cada cobrança (quem cobrou, gol ou defesa/trave/fora) e o resultado final, e o placar
   dos 90 minutos fica separado do dos pênaltis.
6. **Given** a mesma seed e as mesmas escolhas, **When** o confronto é simulado direto ou ao vivo,
   **Then** o resultado, incluindo a prorrogação e os pênaltis, é o mesmo.

---

### User Story 3 - Descrever uma copa só com dados (Priority: P1)

Quem faz um mod descreve uma copa no banco: o número de clubes, as fases, se cada fase é jogo
único ou ida e volta, como se desempata, como é o sorteio, onde os clubes entram, como se define o
mando e quanto cada fase paga. O jogo valida a descrição e recusa, com mensagem clara, uma copa
cujos números não fecham.

**Why this priority**: o princípio de dados, não código; permite a copa do mundo padrão e copas de
mods, e prepara as copas continentais do Marco 9.

**Independent Test**: carregar um banco com uma copa descrita em dados e conferir que é aceito e
jogável; carregar variantes inválidas (número de clubes incompatível com as fases, entrada em fase
inexistente, fase sem desempate possível) e conferir que cada uma é recusada apontando o arquivo e
o campo.

**Acceptance Scenarios**:

1. **Given** um mod com uma copa descrita por fases, **When** o banco é carregado, **Then** ele é
   aceito e a copa aparece no calendário sem nenhuma mudança de lógica do jogo.
2. **Given** uma copa cujos clubes, somados às entradas por fase, não fecham as vagas de cada fase,
   **When** o banco é carregado, **Then** é recusado com uma mensagem que diz a fase e quantos
   clubes sobram ou faltam.
3. **Given** um clube que entra numa fase que não existe, **When** o banco é carregado, **Then** é
   recusado apontando o campo.
4. **Given** uma fase de ida e volta sem nenhum critério que sempre decida (nem pênaltis), **When** o
   banco é carregado, **Then** é recusado: todo confronto precisa terminar com um classificado.
5. **Given** o formato documentado, **When** o modder lê a referência, **Then** encontra os campos
   da copa, os padrões, um exemplo e a lista dos novos erros de validação.

---

### User Story 4 - Sorteio, cabeças de chave, entradas e mando (Priority: P2)

O sorteio de cada fase é feito pela seed, com cabeças de chave opcionais (os mais bem colocados não
se enfrentam cedo). Os clubes mais fortes podem entrar nas fases seguintes. O mando de campo
segue uma regra definida em dados.

**Why this priority**: dá realismo e é parte do pedido, mas a copa já funciona com um sorteio
simples.

**Independent Test**: sortear a mesma copa duas vezes com a mesma seed e conferir que o chaveamento é
idêntico; conferir que os cabeças de chave não se cruzam na primeira fase em que são sorteados, que
os clubes com entrada tardia só aparecem na fase prevista e que o mando segue a regra.

**Acceptance Scenarios**:

1. **Given** a mesma seed e o mesmo banco, **When** a copa é sorteada duas vezes, **Then** os
   confrontos de todas as fases sorteadas são idênticos.
2. **Given** uma fase com cabeças de chave, **When** ela é sorteada, **Then** nenhum cabeça de chave
   enfrenta outro cabeça de chave, desde que haja vagas para isso.
3. **Given** clubes de entrada tardia, **When** a copa começa, **Then** eles só aparecem a partir da
   fase em que entram, contra os classificados das fases anteriores.
4. **Given** a regra de mando "por sorteio", "por ranking" ou "por divisão", **When** o confronto é
   definido, **Then** o mandante é o previsto pela regra (sorteado, o melhor ranqueado ou o de
   divisão mais baixa), e em ida e volta o mando se inverte na volta.
5. **Given** uma fase marcada como campo neutro (a final), **When** o jogo acontece, **Then** nenhum
   clube tem vantagem de mando.

---

### User Story 5 - Prêmios, bilheteria e integração com o drama (Priority: P2)

A copa mexe com o resto do jogo: cada fase paga prêmio aos classificados e o clube que joga em casa
embolsa a bilheteria. Zebras, eliminações e o título viram manchetes. A torcida sofre com a
eliminação e vibra com o título. A diretoria pode ter meta de copa. O título entra no histórico do
clube e do técnico.

**Why this priority**: faz a copa ter peso na carreira, mas a disputa em si funciona sem isso.

**Independent Test**: jogar uma copa inteira e conferir os prêmios no caixa, as manchetes de zebra e
título, a variação do humor da torcida na eliminação e no título e o registro do campeão no
histórico do clube e do técnico.

**Acceptance Scenarios**:

1. **Given** um clube que avança de fase, **When** o confronto termina, **Then** recebe o prêmio da
   fase em que chegou, lançado no caixa com a competição de origem.
2. **Given** um jogo em casa da copa, **When** ele termina, **Then** a bilheteria entra no caixa do
   mandante com o mesmo cálculo de público e renda dos demais jogos; em campo neutro, a renda é
   dividida igualmente.
3. **Given** um clube de divisão baixa elimina um de divisão alta, **When** o confronto termina,
   **Then** pode virar manchete de zebra, e as eliminações e o título do jogador viram manchetes.
4. **Given** a eliminação do clube do jogador, **When** ela acontece, **Then** a torcida perde
   humor, mais quanto mais avançada a fase em que ele era favorito; o título dá um impulso grande.
5. **Given** uma meta de copa para o clube (opcional, ligada à reputação), **When** a copa termina,
   **Then** a diretoria a avalia junto das demais metas e o resultado pesa na confiança.
6. **Given** a copa terminada, **When** o jogador abre o histórico, **Then** vê o campeão da copa de
   cada temporada, os títulos de cada clube e a campanha do clube dele na copa.

---

### User Story 6 - Telas da copa (Priority: P2)

O jogador acompanha a copa por telas próprias: o chaveamento por fase, os próximos confrontos, os
resultados de cada fase e o campeão, além do histórico de campeões da copa.

**Why this priority**: sem telas a copa existe, mas não se acompanha; porém o calendário e a Início
já mostram o essencial do clube do jogador.

**Independent Test**: com a copa em andamento, abrir as telas e conferir que o chaveamento, os
resultados por fase e os próximos confrontos refletem o estado; com a copa terminada, conferir o
campeão e o histórico.

**Acceptance Scenarios**:

1. **Given** a copa em andamento, **When** o jogador escolhe a copa nas abas de competição, **Then**
   vê o chaveamento com as fases e os confrontos.
2. **Given** uma fase concluída, **When** o jogador a abre, **Then** vê cada confronto com o
   placar (e prorrogação/pênaltis, quando houve) e o classificado destacado.
3. **Given** o clube do jogador ainda vivo na copa, **When** ele abre a Início, **Then** o próximo
   compromisso mostra o confronto da copa com a fase e, em ida e volta, qual jogo é.
4. **Given** várias temporadas, **When** o jogador abre o histórico da copa, **Then** vê o campeão e
   o vice de cada edição.

---

### Edge Cases

- Clube do jogador sem jogo numa fase por ter entrado depois: o calendário do clube só lista os jogos
  das fases em que ele disputa; ele não "perde" fases.
- Número de clubes que não é potência de dois: a copa precisa de entradas tardias ou de uma fase
  preliminar para fechar as vagas; o banco que não fecha é recusado (US3).
- Ida e volta com desempate nos pênaltis: acontecem logo depois da volta, no campo do mandante da
  volta, e o jogo da volta ao vivo termina só depois deles.
- Jogador lesionado ou suspenso na copa: cartões contam só na copa (017), lesões valem para todas.
- Expulsões e substituições na prorrogação: o limite de substituições do jogo vale para os 120
  minutos, com mais uma substituição permitida na prorrogação.
- Pênaltis com poucos jogadores em campo (expulsões): cobram os jogadores que terminaram em campo,
  repetindo a ordem quando a série passa do número de cobradores.
- Condição física: a prorrogação desgasta proporcionalmente aos minutos jogados; a fase seguinte
  chega com o descanso previsto pelo calendário.
- Copa com ida e volta no mesmo fim de semana de uma data da liga: o banco é recusado pela regra
  de datas da 017; a agenda da copa deve fugir das datas da liga para os clubes em comum.
- Final em campo neutro: nenhuma das duas torcidas conta como mandante; público e renda seguem uma
  praça neutra definida em dados.
- Clube que sai da copa mas continua na liga: nada muda para a liga, só para o calendário dele.
- Carreira salva antes da copa: continua sem copa (o banco dela não a tem), até o jogador começar
  uma nova carreira.
- Empate de sorteio impossível (poucos clubes para os cabeças de chave): o sorteio relaxa a regra de
  cabeças de chave na ordem determinada em dados, em vez de falhar.

## Requirements *(mandatory)*

### Functional Requirements

**Formato da copa em dados**

- **FR-001**: O formato de competição `knockout` DEVE deixar de ser reservado e funcionar: o banco
  que o usa é aceito se for válido.
- **FR-002**: Uma copa DEVE descrever, só com dados, uma lista de **fases** em ordem. Cada fase tem
  nome, se é jogo único ou ida e volta, os critérios de desempate e se a final é em campo neutro.
- **FR-003**: Os critérios de desempate de uma fase DEVEM poder incluir, em ordem: saldo no
  agregado (sempre), gols fora de casa (opcional), prorrogação (opcional) e pênaltis. Toda fase
  DEVE terminar com um critério que sempre decide (pênaltis ou, em jogo único, prorrogação seguida
  de pênaltis).
- **FR-004**: Cada clube participante DEVE poder declarar a fase em que **entra** (padrão: a
  primeira). Os clubes mais fortes ou de divisão mais alta podem entrar depois.
- **FR-005**: A copa DEVE poder declarar uma regra de **mando** por fase: por sorteio, por ranking
  (o melhor ranqueado em casa) ou por divisão (o de divisão mais baixa em casa), com inversão na
  volta; a final pode ser em campo neutro.
- **FR-006**: A copa DEVE poder declarar **prêmios por fase** (valor pago a quem chega à fase e ao
  campeão) e a **agenda** nas datas do calendário (dia da semana e intervalo entre fases, como na
  017).
- **FR-007**: O banco DEVE ser recusado, com mensagem clara que aponta o arquivo e o campo, quando:
  o número de clubes não fecha as vagas de alguma fase (sobram ou faltam clubes), um clube entra
  numa fase inexistente, uma fase não tem critério que sempre decida, os prêmios ou a agenda estão
  fora dos limites, ou a copa não cabe na temporada.

**Sorteio e chaveamento**

- **FR-008**: O sorteio DEVE ser determinístico pela seed da temporada: mesma seed, mesmo banco e
  mesmas escolhas geram o mesmo chaveamento e os mesmos resultados, inclusive após salvar e carregar.
- **FR-009**: O sorteio DEVE ser feito fase a fase, com os classificados da fase anterior mais os
  clubes que entram nela. Cada fase pode declarar **cabeças de chave** (opcionais): os melhor
  ranqueados não se enfrentam enquanto houver vagas.
- **FR-010**: O ranking usado para cabeças de chave e para o mando é a reputação do clube, com
  desempate por identificação; a divisão do clube vem do banco.
- **FR-011**: O chaveamento DEVE ser atualizado a cada confronto e guardar, para cada confronto, os
  jogos, o placar de cada um, o agregado, a prorrogação e os pênaltis quando houve e o classificado.

**Partida e desempate**

- **FR-012**: O motor de partida NÃO DEVE mudar nos 90 minutos; a prorrogação e os pênaltis são
  extensões. Mesmo estado e mesma seed produzem o mesmo resultado, direto ou ao vivo.
- **FR-013**: A prorrogação DEVE ser de 30 minutos (dois tempos de 15) sem pausa para sorteio, com
  as mesmas regras de eventos, cartões, lesões e substituições dos 90 minutos (mais uma
  substituição permitida), e cansaço proporcional aos minutos.
- **FR-014**: A disputa de pênaltis DEVE ter séries alternadas de 5 cobranças e, persistindo o empate,
  cobranças alternadas até haver diferença. A ordem dos cobradores e o resultado de cada cobrança
  (gol, defendido, trave, fora) DEVEM depender da força dos jogadores e da seed, e ser registrados.
- **FR-015**: Em ida e volta, o confronto empatado no agregado DEVE ser decidido na ordem dos
  critérios da fase; prorrogação e pênaltis só acontecem depois da volta.
- **FR-016**: Todo confronto DEVE terminar com exatamente um classificado. Nenhum estado da copa
  pode ficar sem classificado depois de jogados todos os jogos do confronto.

**Calendário, carreira e sistemas**

- **FR-017**: A copa DEVE ocupar as suas datas no calendário da temporada, de meio de semana por
  padrão, sem conflito de datas com os clubes em comum (regra da 017), e o jogador DEVE poder jogar
  cada jogo ao vivo ou direto, como nas demais competições.
- **FR-018**: A rodada ao vivo de uma partida de copa DEVE mostrar a prorrogação e a disputa de
  pênaltis cobrança a cobrança, e o jogador pode pausar e fazer substituições na prorrogação.
- **FR-019**: A bilheteria dos jogos da copa DEVE entrar no caixa do mandante (ou dividida, em campo
  neutro) e os prêmios DEVEM ser lançados ao fim de cada confronto, com a competição de origem.
- **FR-020**: As manchetes DEVEM cobrir zebras (clube de divisão mais baixa elimina um de divisão
  mais alta), eliminações do clube do jogador, classificação para a final e o título.
- **FR-021**: A torcida DEVE reagir à eliminação e ao título, com peso maior quanto mais avançada
  a fase; a diretoria DEVE poder ter **meta de copa opcional** por clube, ligada à reputação, e
  avaliá-la ao fim da copa.
- **FR-022**: O campeão (e o vice) de cada edição DEVE ficar registrado no histórico da copa, nos
  títulos do clube e no histórico do técnico.
- **FR-023**: A copa DEVE recomeçar a cada temporada com novo sorteio, na virada, para todos os
  clubes que a disputam no banco.

**Telas**

- **FR-024**: DEVE haver telas da copa: chaveamento por fase, próximos confrontos, resultados de
  cada fase com placar, prorrogação e pênaltis, e o campeão; a copa aparece nas abas de competição.
- **FR-025**: O histórico DEVE listar o campeão e o vice da copa de cada temporada e os títulos por
  clube.
- **FR-026**: Todo texto novo visível DEVE passar pelo i18n; nomes de competições, fases e prêmios
  vêm do banco ou de chaves, nunca fixos no código.

**Banco padrão, mods e saves**

- **FR-027**: O banco padrão DEVE ganhar a **copa nacional** com os 40 clubes das duas divisões, em
  fases com entradas escalonadas (os clubes da Série A entram depois), prêmios por fase e agenda de
  meio de semana, sem nenhum nome real.
- **FR-028**: O formato de mod documentado DEVE descrever os campos da copa, os padrões, um exemplo e
  os novos erros de validação; o mod de exemplo DEVE continuar válido.
- **FR-029**: O formato de save DEVE ganhar uma nova versão com a migração da anterior. Carreiras
  existentes continuam abrindo, na mesma rodada e com o mesmo histórico, sem copa (o banco delas não
  a tem).

**Balanceamento**

- **FR-030**: Com a copa no banco padrão, as simulações longas DEVEM continuar dentro dos limites da
  economia (008), das forças (009) e do calendário (017), e os prêmios e a renda da copa não podem
  desequilibrar o caixa dos clubes.

### Key Entities *(include if feature involves data)*

- **Copa (competição eliminatória)**: competição de formato mata-mata com clubes, fases, regra de
  mando, sorteio, prêmios e agenda; descrita só por dados.
- **Fase**: etapa da copa (ex.: primeira fase, oitavas, quartas, semifinal, final), com jogo único
  ou ida e volta, critérios de desempate, mando, campo neutro e prêmio.
- **Entrada**: a fase em que cada clube passa a disputar a copa.
- **Chaveamento**: o conjunto dos confrontos de todas as fases de uma edição, com seus resultados e
  classificados.
- **Confronto**: o duelo entre dois clubes numa fase, com um ou dois jogos, o agregado, a
  prorrogação, os pênaltis e o classificado.
- **Disputa de pênaltis**: a série de cobranças de um jogo, com cobrador, resultado de cada
  cobrança e placar.
- **Edição**: a copa de uma temporada, com o campeão e o vice registrados no histórico.
- **Meta de copa**: objetivo opcional da diretoria para o clube na copa (fase mínima a alcançar).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 1.000 copas simuladas no banco padrão, os 8 clubes mais fortes (por reputação)
  são campeões mais vezes do que os 8 mais fracos, e ainda assim os 8 mais fracos são campeões em
  pelo menos 1% das edições; as faixas ficam declaradas no teste.
- **SC-002**: Em 100% dos confrontos simulados (1.000 copas), o confronto termina com exatamente um
  classificado, inclusive os decididos na prorrogação e nos pênaltis.
- **SC-003**: Uma carreira joga uma temporada inteira com liga e copa no mesmo calendário, sem
  nenhum clube com dois jogos no mesmo dia, e a copa termina com um campeão registrado no histórico.
- **SC-004**: Uma disputa de pênaltis jogada ao vivo mostra todas as cobranças e o resultado, e o
  resultado é o mesmo que o do jogo simulado direto com a mesma seed (10 de 10 repetições).
- **SC-005**: Mesma seed e mesmas escolhas geram o mesmo sorteio e os mesmos resultados em 10 de 10
  execuções, inclusive com salvar e carregar no meio da copa.
- **SC-006**: 100% dos bancos de teste com copas inválidas (clubes que não fecham as fases, entrada
  em fase inexistente, fase sem critério que decida) são recusados com mensagem que diz a fase ou o
  campo em causa.
- **SC-007**: Com a copa no banco padrão, o teste de 30 temporadas continua dentro dos limites da 008
  (economia), da 009 (forças) e da 017 (calendário), e o jogo com o banco anterior (sem copa)
  continua idêntico ao de hoje.
- **SC-008**: O jogador encontra o chaveamento da copa e o próximo confronto dela a partir da
  Início em no máximo dois cliques.

## Assumptions

- **Dependência:** a 017 (calendário por datas, várias competições, condição física, cartões por
  competição) já está no jogo e é a base desta feature.
- **Copa padrão:** 40 clubes; 1ª fase com 16 clubes da Série B (8 jogos), depois a fase de 32
  (8 vencedores, os 4 outros da Série B e os 20 da Série A), oitavas, quartas, semifinais e final.
  Jogo único até as quartas, semifinais em ida e volta, final em jogo único em campo neutro. Os
  números exatos são o ponto de partida e podem ser calibrados no teste de simulação longa.
- **Desempate padrão:** jogo único ⇒ prorrogação e pênaltis; ida e volta ⇒ saldo no agregado,
  prorrogação e pênaltis; gols fora de casa desligados por padrão.
- **Agenda padrão:** quarta-feira, a cada 2 semanas a partir da semana 1, com as fases nessa ordem;
  a final pode usar um intervalo próprio. A agenda é dado da competição e cabe nas 52 semanas.
- **Mando:** nas fases de jogo único do padrão, o clube de divisão mais baixa joga em casa; empatada
  a divisão, vale o sorteio; em ida e volta, o mando da ida segue a regra e inverte na volta.
- **Cabeças de chave:** por padrão desligados no mundo padrão; a opção existe para mods. O ranking é
  a reputação do clube.
- **Prêmios:** por fase alcançada e pelo título, em valores que mantêm o caixa dos clubes dentro dos
  limites da 008; os valores exatos saem da calibração.
- **Bilheteria:** mesmo cálculo de público e renda da liga; em campo neutro, a renda é dividida
  igualmente entre os dois clubes e o público usa a capacidade de uma praça neutra definida em dados.
- **Meta de copa da diretoria:** opcional, derivada da reputação do clube (clubes grandes têm meta
  mais alta); não há demissão só por causa da copa.
- **Pênaltis e prorrogação:** a prorrogação usa o mesmo motor de eventos dos 90 minutos, aplicado
  aos 30 minutos adicionais; os pênaltis são sorteados por força do cobrador e do goleiro, sem
  mudar o motor dos 90 minutos.
- **Saves antigos:** carreiras salvas antes desta feature continuam sem copa, porque cada save tem a
  sua cópia do banco; só carreiras novas no banco padrão novo têm a copa.
- **Fora de escopo:** fase de grupos, vagas da copa para outras competições (ex.: classificar para
  um torneio continental), supercopa, vários países e competições continentais (Marcos 8 e 9).
