# Feature Specification: Fase de grupos e competições em fases

**Feature Branch**: `019-fase-grupos-competicoes-fases`

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: "Fase de grupos e competições compostas por fases encadeadas (ver docs/design.md §3 e §14) — prompt `docs/speckit-prompts/marco7/prompt019.md`."

## Contexto

Terceira feature do Marco 7 (Copas). A 017 deu à temporada um calendário de datas com várias
competições; a 018 fez o formato `knockout` funcionar e deu ao mundo padrão a copa nacional. Falta
o formato que completa o desenho de §3 do design: a **fase de grupos**, hoje só reservada (um banco
que a usa é recusado).

Três limites de hoje motivam esta feature:

- o formato `groups` não funciona;
- o formato é da competição inteira: todas as divisões de uma competição são de pontos corridos, ou
  a competição é uma copa de mata-mata isolada, com os clubes já definidos e sem nenhuma fase
  anterior que os classifique;
- o clube tem país e cidade, mas nenhum atributo que permita separar ou agrupar clubes por região
  num sorteio.

Esta feature faz a fase de grupos funcionar e permite que uma competição (ou uma divisão dela) seja
uma **sequência de fases**: pontos corridos seguidos de mata-mata (playoff), grupos seguidos de
mata-mata, ou várias fases de grupos. É a base de competições como a quarta divisão nacional, os
estaduais e as competições continentais, que chegam nos Marcos 8 e 9. O mundo padrão não ganha
nenhuma competição nova: a prova é um banco de teste.

## Clarifications

### Session 2026-10-23

- Q: Como fica a posição final dos clubes numa divisão disputada em fases (para prêmios, metas da
  diretoria, torcida, resumo da temporada e histórico)? → A: Pela fase mais alcançada, desempatando
  pela classificação geral: campeão e vice saem da final; os eliminados em cada fase ficam atrás de
  quem foi mais longe, ordenados pela classificação geral entre os que caíram na mesma fase.
- Q: Quando nenhuma distribuição respeita uma regra de separação, o que o sorteio faz? → A: Numa
  carreira, nunca trava o jogador: o sorteio sempre conclui, todo clube cai em algum grupo, violando
  o mínimo possível (escolha determinística pela seed), e registra um aviso explicando quais clubes
  ficaram juntos. Na validação do mod e nos testes do sorteio, a separação impossível segue estrita:
  o banco é recusado ou o sorteio falha com erro claro.
- Q: De onde saem os "melhores entre os demais" (vagas extras além dos N primeiros de cada grupo)?
  → A: Só da posição seguinte: as vagas extras saem dos clubes na posição N+1 de cada grupo (por
  exemplo, os "melhores terceiros" quando N = 2), ordenados pela classificação geral.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Acompanhar meu grupo e a zona de classificação (Priority: P1)

O jogador comanda um clube numa divisão disputada em grupos. Ele vê a tabela do grupo dele, com a
zona de classificação marcada, joga os jogos da fase (ao vivo ou direto) e, quando os grupos
terminam, vê quem avançou e o chaveamento da fase seguinte.

**Why this priority**: é a primeira história do pedido e o que torna a fase de grupos jogável.
Sem ela, as demais histórias não têm onde acontecer.

**Independent Test**: criar uma carreira num banco de teste cuja divisão do jogador é em grupos
seguidos de mata-mata, jogar a fase de grupos inteira e conferir que a tabela do grupo se atualiza
a cada rodada, que a zona de classificação está marcada e que, ao fim, os classificados aparecem no
chaveamento.

**Acceptance Scenarios**:

1. **Given** uma carreira cuja divisão é em grupos, **When** o jogador abre a competição, **Then**
   vê a tabela do grupo dele e pode alternar para os demais grupos.
2. **Given** a fase de grupos em andamento, **When** uma rodada é jogada, **Then** a tabela de cada
   grupo é atualizada com os critérios de pontuação e desempate da competição.
3. **Given** a tabela de um grupo, **When** o jogador a observa, **Then** as posições que dão
   classificação estão marcadas, inclusive a posição que pode dar vaga extra (os melhores da posição
   seguinte), quando a competição as tem.
4. **Given** a fase de grupos terminada, **When** o jogador abre a competição, **Then** vê os
   classificados de cada grupo e o chaveamento da fase seguinte já montado pela posição no grupo.
5. **Given** o clube do jogador eliminado na fase de grupos, **When** o tempo passa, **Then** a
   competição continua sendo disputada sem ele (jogos simulados), e as telas seguem atualizadas.
6. **Given** um clube do jogador classificado, **When** ele abre a Início, **Then** o próximo
   compromisso mostra o confronto da fase eliminatória com o nome da fase.

---

### User Story 2 - Descrever uma competição em fases só com dados (Priority: P1)

Quem faz um mod monta uma competição como uma sequência de fases: grupos seguidos de mata-mata,
pontos corridos seguidos de playoff, ou várias fases de grupos. Cada fase declara o próprio
formato. O jogo valida a descrição e recusa, com mensagem clara, a que não fecha.

**Why this priority**: é a segunda história do pedido e o princípio de dados, não código: sem isso
a fase de grupos só funcionaria para um caso fixo no código.

**Independent Test**: carregar um banco com uma competição em fases descrita em dados e conferir
que é aceito e jogável; carregar variantes inválidas (grupos que não fecham com o número de clubes,
classificados incompatíveis com a fase seguinte, fase seguinte inexistente) e conferir que cada uma
é recusada apontando o arquivo e o campo.

**Acceptance Scenarios**:

1. **Given** um mod com grupos seguidos de mata-mata, **When** o banco é carregado, **Then** é
   aceito e a competição aparece no calendário sem nenhuma mudança na lógica do jogo.
2. **Given** um mod com pontos corridos seguidos de playoff entre os primeiros colocados, **When**
   o banco é carregado, **Then** é aceito e jogável.
3. **Given** um mod com duas fases de grupos em sequência, **When** o banco é carregado, **Then** é
   aceito, e os classificados da primeira são os clubes da segunda.
4. **Given** uma divisão em fases numa competição cujas outras divisões são de pontos corridos,
   **When** o banco é carregado, **Then** é aceito: cada divisão declara a sua sequência.
5. **Given** grupos de tamanho 4 numa fase com 18 clubes, **When** o banco é carregado, **Then** é
   recusado com mensagem que diz a fase, o tamanho do grupo e quantos clubes sobram ou faltam.
6. **Given** uma fase que classifica um número de clubes incompatível com a fase seguinte, **When**
   o banco é carregado, **Then** é recusado com mensagem que diz as duas fases e os números em
   causa.
7. **Given** o formato documentado, **When** o modder lê a referência, **Then** encontra os campos
   de cada tipo de fase, os padrões, um exemplo completo e a lista dos novos erros.

---

### User Story 3 - Sorteio com potes e regras por competição, determinístico (Priority: P1)

O sorteio dos grupos usa potes (os clubes mais bem ranqueados em potes diferentes) e regras por
atributo do clube, **declaradas por cada competição**. Há dois tipos de regra: a **separação**, que
é obrigatória (por exemplo, numa competição continental, clubes do mesmo país não caem no mesmo
grupo, exceto os do pote 4, formado pelos classificados da fase preliminar), e a **concentração**,
que é uma preferência (por exemplo, na quarta divisão nacional, clubes de uma mesma região ficam
em grupos próximos). O sorteio é determinístico pela seed. Se não for possível respeitar uma regra
de separação numa carreira, o sorteio não trava o jogador: ele conclui violando o mínimo possível e
avisa quais clubes ficaram juntos; já na validação do mod e nos testes, a separação impossível é
estrita e falha com um erro claro. A concentração é uma preferência e nunca faz o sorteio falhar.

**Why this priority**: é um requisito explícito do pedido e o segundo critério de aceite. Um
sorteio que viola uma regra de separação sem avisar quebra a confiança em toda a competição, e um
que trava a carreira a interrompe.

**Independent Test**: sortear o mesmo banco duas vezes com a mesma seed e conferir que os grupos
são idênticos; sortear com muitas seeds e conferir que nenhuma regra de separação é violada em
nenhum sorteio possível e que a concentração por região se cumpre; montar um banco cujas regras de
separação são impossíveis e conferir o erro claro na validação; simular uma carreira em que a
composição dos clubes torna a separação impossível e conferir que o sorteio conclui com aviso.

**Acceptance Scenarios**:

1. **Given** a mesma seed e o mesmo banco, **When** os grupos são sorteados duas vezes, **Then** a
   composição de todos os grupos é idêntica, inclusive depois de salvar e carregar.
2. **Given** uma fase com potes, **When** ela é sorteada, **Then** cada grupo recebe no máximo um
   clube de cada pote, e os potes são formados pela reputação dos clubes ou, no caso de um pote
   declarado assim, pelos clubes que vêm classificados da fase anterior.
3. **Given** uma regra de separação "mesmo país não cai no mesmo grupo", **When** o sorteio
   acontece, **Then** nenhum grupo tem dois clubes do mesmo país.
4. **Given** uma regra de separação que isenta o pote 4 (os classificados da fase preliminar),
   **When** o sorteio acontece, **Then** nenhum grupo tem dois clubes do mesmo país, exceto os que
   vêm do pote isento, que podem dividir o grupo com clubes do mesmo país.
5. **Given** uma regra de concentração por região, **When** o sorteio acontece, **Then** os clubes
   de cada região ficam no menor número possível de grupos, e esses grupos são vizinhos na ordem
   dos grupos.
6. **Given** uma regra de separação que nenhuma distribuição consegue respeitar, **When** o sorteio
   é pedido numa carreira, **Then** ele conclui mesmo assim: todo clube cai em algum grupo, o número
   de pares de clubes que violam a separação é o menor possível, a escolha entre as distribuições
   igualmente boas é determinística pela seed, e um aviso diz a regra e os clubes que ficaram juntos.
7. **Given** uma regra de concentração que não cabe nos dados (por exemplo, regiões que não se
   encaixam nos grupos), **When** o sorteio acontece, **Then** ele conclui mesmo assim, sem erro,
   concentrando o máximo possível.
8. **Given** uma regra de separação e uma de concentração na mesma fase que se contradizem para um
   clube, **When** o sorteio acontece, **Then** a separação vence.
9. **Given** um sorteio feito na virada de temporada de uma carreira com separação impossível,
   **When** o sorteio conclui com aviso, **Then** a carreira segue normalmente para a temporada
   seguinte, e o jogador pode ler o aviso na tela da competição.
10. **Given** regras de separação impossíveis já nos dados (por exemplo, mais clubes de um mesmo
    país, fora dos potes isentos, do que grupos), **When** o banco é validado, **Then** ele é
    recusado antes do jogo, apontando a fase e a regra.
11. **Given** o sorteio chamado pela validação do mod ou por um teste, com separação impossível,
    **When** ele é pedido, **Then** falha com um erro que diz a fase, a regra e os clubes em
    conflito, e nenhum grupo é montado.

---

### User Story 4 - Competição como sequência de fases e classificação geral (Priority: P1)

Uma competição passa de uma fase para a seguinte: os classificados dos grupos (os N primeiros de
cada grupo e, opcionalmente, os melhores da posição seguinte) entram no mata-mata, chaveados pela
posição no grupo. A classificação geral da fase de grupos (todos os grupos juntos) fica disponível
e é usada por outras regras: o mando de campo no mata-mata e o rebaixamento.

**Why this priority**: é o que liga as fases e o que dá sentido à classificação geral; sem isso
a fase de grupos seria uma tabela isolada.

**Independent Test**: jogar uma competição de grupos seguidos de mata-mata e conferir que os
classificados são exatamente os previstos nos dados, que o chaveamento segue a posição no grupo e
que o mando do mata-mata respeita a classificação geral; repetir com pontos corridos seguidos de
playoff.

**Acceptance Scenarios**:

1. **Given** grupos que classificam 2 por grupo, **When** a fase termina, **Then** os dois
   primeiros de cada grupo entram na fase seguinte, e nenhum outro.
2. **Given** grupos que classificam 2 por grupo mais os 2 melhores terceiros, **When** a fase
   termina, **Then** os 2 melhores terceiros, ordenados pela classificação geral entre os terceiros
   colocados de todos os grupos, também entram, e nenhum quarto colocado entra.
3. **Given** a fase seguinte em mata-mata, **When** o chaveamento é montado, **Then** os confrontos
   cruzam a posição no grupo (por exemplo, o 1º de um grupo contra o 2º de outro) e dois clubes do
   mesmo grupo não se enfrentam na primeira fase eliminatória enquanto houver como evitar.
4. **Given** a classificação geral da fase de grupos, **When** ela é calculada, **Then** todos os
   clubes de todos os grupos aparecem ordenados pelos critérios da competição, com os desempates
   que só valem dentro de um grupo (como o confronto direto) tratados de forma declarada.
5. **Given** uma regra de mando "pela classificação geral", **When** um confronto do mata-mata é
   definido, **Then** o mandante é o clube melhor colocado na classificação geral da fase de grupos.
6. **Given** pontos corridos seguidos de playoff, **When** a primeira fase termina, **Then** os
   primeiros colocados da tabela entram no playoff, com a posição na tabela definindo o chaveamento.
7. **Given** cada fase eliminatória com o seu formato, **When** a competição avança, **Then** cada
   uma segue o formato próprio (por exemplo, jogo único até a semifinal e final em ida e volta).

---

### User Story 5 - Acesso e rebaixamento em divisões disputadas em fases (Priority: P2)

Quando uma divisão é disputada em fases, o acesso e o rebaixamento usam o resultado das fases: por
exemplo, sobem os finalistas do mata-mata e caem os piores da classificação geral dos grupos. A
divisão de cima recebe os promovidos, e a de baixo (quando existe) recebe os rebaixados.

**Why this priority**: é o que integra a competição em fases à carreira de várias temporadas, e o
primeiro critério de aceite; mas a competição em fases já funciona sem isso, só sem consequência
para o ano seguinte.

**Independent Test**: com um banco de teste de uma divisão de baixo em grupos regionais seguidos
de mata-mata, jogar uma temporada e conferir que os finalistas sobem, que os piores da
classificação geral caem (quando há divisão abaixo) e que a divisão de cima rebaixa o mesmo número
de clubes que a de baixo promove.

**Acceptance Scenarios**:

1. **Given** uma divisão em fases com 2 vagas de acesso, **When** a temporada termina, **Then** os
   dois finalistas do mata-mata sobem para a divisão de cima.
2. **Given** uma divisão em fases com vagas de rebaixamento, **When** a temporada termina, **Then**
   caem os piores colocados da classificação geral da fase de grupos que não chegaram ao
   mata-mata.
3. **Given** a divisão de cima de pontos corridos, **When** a temporada termina, **Then** ela
   rebaixa tantos clubes quantos a divisão em fases promove, e os clubes trocam de divisão.
4. **Given** a virada de temporada, **When** os clubes mudam de divisão, **Then** a fase de grupos
   da temporada seguinte é sorteada com a nova composição, respeitando as regras de separação.
5. **Given** o clube do jogador promovido pelo mata-mata, **When** a temporada termina, **Then** o
   resumo da temporada e o histórico registram o acesso e quem foi campeão.
6. **Given** a temporada terminada, **When** o jogador abre o resumo, **Then** vê a posição final de
   cada clube da divisão em fases, com campeão e vice vindos da final e os eliminados ordenados pela
   fase alcançada e pela classificação geral.

---

### User Story 6 - Telas das fases (Priority: P2)

O jogador acompanha a competição por telas próprias: as tabelas por grupo, a zona de
classificação marcada, a classificação geral da fase de grupos e o chaveamento das fases
seguintes.

**Why this priority**: sem telas a competição existe, mas não se acompanha; a Início e o
calendário do clube já mostram o essencial do jogador.

**Independent Test**: com a competição em andamento, abrir as telas e conferir que as tabelas, a
zona marcada, a classificação geral e o chaveamento refletem o estado; com a competição terminada,
conferir o campeão e os promovidos.

**Acceptance Scenarios**:

1. **Given** uma competição em grupos, **When** o jogador a abre, **Then** vê uma tabela por grupo,
   com o grupo do clube dele em destaque, e a legenda da zona de classificação.
2. **Given** a fase de grupos em andamento, **When** o jogador abre a classificação geral, **Then**
   vê todos os clubes ordenados, com marcação de quem se classificaria e de quem cairia hoje.
3. **Given** a fase eliminatória definida, **When** o jogador abre o chaveamento, **Then** vê as
   fases, os confrontos já definidos com resultados e os confrontos ainda por definir, indicando de
   onde vem cada vaga (por exemplo, "1º do Grupo B").
4. **Given** várias fases na mesma competição, **When** o jogador navega, **Then** pode abrir
   qualquer fase já jogada, com tabelas e resultados.

---

### Edge Cases

- Grupos com todos os jogos decididos antes da última rodada: a zona de classificação mostra quem já
  está classificado e quem já está eliminado, sem esperar o fim da fase.
- Empate na posição que decide a classificação (dentro do grupo ou na comparação dos clubes da
  posição seguinte): vale a ordem dos critérios da competição; o último critério é o sorteio pela
  seed, de modo que sempre há uma ordem total.
- Comparação entre grupos de jogos diferentes: grupos de uma mesma fase têm o mesmo tamanho e o
  mesmo número de rodadas, então pontos e saldos são comparáveis; o confronto direto só vale
  dentro do grupo.
- Número de clubes que não é múltiplo do tamanho do grupo: o banco é recusado; não há grupos de
  tamanhos diferentes na mesma fase.
- Grupo com número ímpar de clubes: em cada rodada um clube folga, como numa liga ímpar.
- Regra de separação que só um sorteio sistemático consegue satisfazer: o sorteio não desiste na
  primeira tentativa; só afrouxa a separação quando nenhuma distribuição a respeita.
- Separação impossível numa carreira (composição de clubes após acessos e rebaixamentos): o sorteio
  conclui com aviso e a carreira nunca fica parada na virada; a mesma situação nos dados do mod é
  recusada na validação.
- Clube sem o atributo de região: não entra na concentração nem na separação por região; a regra
  por país continua valendo.
- Região com mais clubes que o tamanho de um grupo: ela ocupa mais de um grupo, sempre vizinhos; uma
  região que começa no meio de um grupo pode ocupar um grupo a mais que o mínimo.
- Clubes sem região, ou de regiões pequenas, preenchem as vagas que sobram depois da concentração.
- Clubes de pote isento da separação: as regras de separação deixam de valer para eles, mas eles
  continuam contando como membros do grupo para todos os outros fins (tamanho do grupo, tabela).
- Mata-mata com número de classificados que não é potência de dois: a fase eliminatória precisa de
  entradas ou de uma fase preliminar para fechar as vagas, como na 018; o banco que não fecha é
  recusado.
- Clube que está em duas competições (liga e fase de grupos de outra): as datas não conflitam pela
  regra da 017.
- Divisão em fases no meio da pirâmide: ela promove e rebaixa ao mesmo tempo; os clubes que não
  chegam ao mata-mata e não caem permanecem na divisão.
- Carreira salva antes desta feature: continua abrindo e sendo jogada como antes (sem fases).
- Clube do jogador demitido ou trocando de clube no meio das fases: as telas passam a mostrar a
  competição do novo clube, como já acontece com as outras competições.
- Cartões e suspensões: valem por competição (017); as fases de uma mesma competição somam os
  cartões, e a suspensão acumulada vale nas fases seguintes.

## Requirements *(mandatory)*

### Functional Requirements

**Formato em dados**

- **FR-001**: O formato de competição `groups` DEVE deixar de ser reservado e funcionar: o banco que
  o usa é aceito se for válido.
- **FR-002**: Uma competição, ou cada divisão dela, DEVE poder ser descrita como uma **sequência
  ordenada de fases**, em dados. Os tipos de fase são pontos corridos, grupos e mata-mata. Cada
  divisão declara a sua sequência, de modo que divisões de pontos corridos e uma divisão em fases
  convivem na mesma competição.
- **FR-003**: Uma **fase de grupos** DEVE declarar: o tamanho do grupo, se é turno único ou ida e
  volta, os pontos de vitória, empate e derrota, os critérios de desempate (os mesmos da liga), quantos
  clubes se classificam por grupo e quantas vagas extras existem para os melhores da posição seguinte
  (a N+1 de cada grupo; padrão: nenhuma). O número de vagas extras não pode passar do número de
  grupos.
- **FR-004**: Uma fase de **pontos corridos** seguida de outra fase DEVE declarar quantos primeiros
  colocados se classificam; a posição na tabela define o chaveamento da fase seguinte.
- **FR-005**: Cada fase **eliminatória** DEVE usar o formato de mata-mata da 018 (jogo único ou ida e
  volta, critérios de desempate, mando, campo neutro, prêmio, agenda), e cada fase de uma mesma
  competição pode ter o seu (por exemplo, jogo único até a semifinal e final em ida e volta).
- **FR-006**: O mando de campo de uma fase eliminatória DEVE poder seguir a **classificação geral**
  da fase de grupos anterior (o melhor colocado joga em casa), além das regras da 018.
- **FR-007**: O banco DEVE ser recusado, com mensagem clara que aponta o arquivo e o campo, quando:
  o número de clubes da fase não for múltiplo do tamanho do grupo; as vagas extras passarem do número
  de grupos; os classificados de uma fase não
  fecharem as vagas da fase seguinte; uma fase seguinte não existir ou ficar sem clubes; uma fase de
  grupos for a última sem definir campeão ou acesso (a última fase DEVE definir a classificação final
  da divisão); os números de acesso e rebaixamento entre divisões não coincidirem; ou a competição
  não couber na temporada.
- **FR-008**: O formato `groups` DEVE ser validado como as demais seções do banco, com os mesmos
  limites de tamanho dos campos e mensagens que indicam arquivo e campo.

**Sorteio**

- **FR-009**: O sorteio dos grupos DEVE ser determinístico pela seed da temporada: mesma seed,
  mesmo banco e mesmas escolhas geram os mesmos grupos, inclusive após salvar e carregar.
- **FR-010**: O sorteio DEVE aceitar **potes**: cada grupo recebe no máximo um clube de cada pote. A
  fase declara quantos potes usa (padrão: sorteio sem potes). Um pote é formado pela reputação dos
  clubes, em ordem decrescente, ou, quando a fase o declara, pelos clubes que chegam classificados
  da fase anterior (por exemplo, o pote 4 de uma competição continental, formado pelos
  classificados da fase preliminar).
- **FR-011**: As regras de sorteio DEVEM ser **declaradas por fase, nos dados da competição**: cada
  competição escolhe as suas, e uma fase pode não ter nenhuma. Há dois tipos de regra, definidos
  pelo atributo do clube em que atuam: o **país** (já existente) e a **região** (atributo novo e
  opcional do clube, definido nos dados).
- **FR-012**: A regra de **separação** é obrigatória: nenhum grupo contém dois clubes com o mesmo
  valor do atributo. Ela DEVE poder isentar potes declarados (por exemplo, o pote dos classificados
  da fase preliminar), cujos clubes não ficam sujeitos à separação.
- **FR-013**: A regra de **concentração** é uma preferência: o sorteio DEVE colocar os clubes de
  cada valor do atributo (por exemplo, uma região) no menor número possível de grupos, e esses
  grupos DEVEM ser vizinhos na ordem dos grupos. Ela NUNCA faz o sorteio falhar: quando não cabe,
  concentra o máximo possível. A separação vence a concentração em caso de contradição.
- **FR-014**: O sorteio DEVE buscar de forma sistemática uma distribuição que respeite potes e
  separações. Numa **carreira**, quando nenhuma existe, o sorteio NUNCA DEVE falhar nem travar o
  jogador: todo clube DEVE cair em algum grupo, o número de pares de clubes que violam uma
  separação DEVE ser o menor possível, a escolha entre distribuições igualmente boas DEVE ser
  determinística pela seed, e DEVE ser registrado um aviso (fase, regra e clubes que ficaram
  juntos) visível na tela da competição. Os potes nunca são afrouxados.
- **FR-015**: Na **validação do mod** e nos **testes do sorteio**, a separação é estrita: o banco
  DEVE ser recusado já na validação quando as separações são impossíveis de cumprir com os clubes
  dados (por exemplo, mais clubes de um mesmo país, fora dos potes isentos, do que grupos), e um
  sorteio pedido nesse modo com separação impossível DEVE falhar com um erro claro que diga a
  fase, a regra e os clubes em conflito, sem montar grupos.

**Classificação e chaveamento**

- **FR-016**: A tabela de cada grupo DEVE seguir os critérios de pontuação e desempate da fase, na
  ordem declarada.
- **FR-017**: Os classificados de cada grupo DEVEM ser os N primeiros do grupo e, quando a fase
  declara vagas extras, os melhores da posição seguinte (N+1) de todos os grupos, escolhidos pela
  classificação geral entre os clubes que ocupam essa posição. Nenhum clube de posição mais baixa
  que N+1 recebe vaga extra.
- **FR-018**: DEVE existir a **classificação geral da fase de grupos** (todos os grupos juntos),
  ordenada pelos critérios da fase. Os critérios que só têm sentido dentro de um grupo (confronto
  direto) DEVEM ser ignorados na comparação entre grupos, e o último critério sempre desempata
  (sorteio pela seed), de modo que a ordem seja total e determinística.
- **FR-019**: O chaveamento da fase seguinte DEVE ser definido pela posição no grupo (ou na
  tabela): os primeiros colocados enfrentam clubes de outras posições, e dois clubes do mesmo grupo
  não se enfrentam na primeira fase eliminatória enquanto houver como evitar.
- **FR-020**: A classificação geral DEVE ser usada pelo mando de campo no mata-mata (FR-006) e pelo
  rebaixamento (FR-022), e DEVE ficar disponível para as telas.

**Acesso e rebaixamento**

- **FR-021**: O **acesso** de uma divisão em fases DEVE poder ser definido pelo resultado do
  mata-mata (por exemplo, sobem os finalistas) ou pela tabela final de uma fase, conforme os dados.
- **FR-022**: O **rebaixamento** de uma divisão em fases DEVE poder ser definido pela classificação
  geral da fase de grupos (caem os piores colocados), conforme os dados.
- **FR-023**: Na virada de temporada, os clubes promovidos e rebaixados DEVEM trocar de divisão
  nos números declarados, e o sorteio da fase de grupos da temporada seguinte DEVE usar a nova
  composição.
- **FR-024**: Ao fim da temporada, todo clube de uma divisão em fases DEVE ter uma **posição final**
  única, de 1 ao número de clubes da divisão, definida assim: o campeão e o vice saem da última fase
  eliminatória; os clubes eliminados em cada fase ficam atrás de quem foi mais longe, ordenados pela
  classificação geral entre os que caíram na mesma fase; quem não passou dos grupos fica ordenado
  pela classificação geral dos grupos. Essa posição DEVE ser a usada por prêmios da divisão,
  metas da diretoria, torcida, resumo da temporada e histórico, que continuam funcionando como
  numa divisão de pontos corridos.

**Calendário, partida e sistemas**

- **FR-025**: As fases DEVEM ocupar as suas datas no calendário da temporada, segundo a agenda
  declarada, sem conflito de datas para clubes em comum (regra da 017). Uma fase só começa depois
  de a anterior terminar.
- **FR-026**: O jogador DEVE poder jogar cada partida de qualquer fase ao vivo ou direto, como nas
  demais competições, e o resultado DEVE ser o mesmo nos dois modos.
- **FR-027**: As partidas da fase de grupos DEVEM ter bilheteria, condição física, cartões,
  finanças, torcida e diretoria como as partidas de liga; as partidas eliminatórias, como as da
  copa da 018 (prorrogação, pênaltis, prêmios).
- **FR-028**: A competição DEVE registrar, no histórico, o campeão (vencedor da última fase), os
  promovidos e os rebaixados de cada edição.

**Telas**

- **FR-029**: DEVE haver telas que mostrem: uma tabela por grupo com a zona de classificação
  marcada e legenda; a classificação geral da fase de grupos; o chaveamento das fases eliminatórias
  com a origem de cada vaga; e a navegação por fase, inclusive das já jogadas.
- **FR-030**: A Início e o calendário do clube DEVEM mostrar a fase em que o próximo jogo acontece
  (por exemplo, "Grupo B, rodada 3" ou "Semifinal").
- **FR-031**: Todo texto novo visível DEVE passar pelo i18n; nomes de competições, fases e grupos
  vêm do banco ou de chaves, nunca fixos no código.

**Mods, saves e compatibilidade**

- **FR-032**: O formato de mod documentado DEVE descrever os campos das fases, os padrões, um
  exemplo completo, o novo atributo de região do clube e os novos erros de validação; o mod de
  exemplo DEVE continuar válido.
- **FR-033**: O formato de save DEVE ganhar uma nova versão com a migração da anterior. Carreiras
  existentes continuam abrindo, na mesma rodada e com o mesmo histórico, sem fases (o banco delas
  não as tem).
- **FR-034**: O mundo padrão DEVE continuar idêntico ao de hoje: nenhuma competição nova, e uma
  carreira nele joga exatamente os mesmos resultados de antes desta feature.

### Key Entities *(include if feature involves data)*

- **Sequência de fases**: a lista ordenada de fases de uma divisão (ou competição), cada uma com o
  seu tipo e o seu formato.
- **Fase de grupos**: fase em que os clubes são divididos em grupos que jogam entre si, com
  tamanho, turnos, pontuação, desempate, quantos se classificam e potes.
- **Grupo**: conjunto de clubes de uma fase de grupos, com a sua tabela e os seus jogos.
- **Sorteio**: a distribuição dos clubes nos grupos, determinística pela seed, com potes e regras.
- **Pote**: conjunto de clubes de uma fase de grupos de que cada grupo recebe no máximo um; formado
  pela reputação ou pela origem (classificados da fase anterior); pode ser isento da separação.
- **Regra de separação**: regra obrigatória "nenhum grupo contém dois clubes com o mesmo valor do
  atributo", por país ou por região, com potes isentos opcionais.
- **Regra de concentração**: preferência de que os clubes com o mesmo valor do atributo (uma
  região) fiquem no menor número possível de grupos vizinhos.
- **Região (atributo do clube)**: rótulo opcional do clube que permite separar ou agrupar clubes no
  sorteio.
- **Zona de classificação**: as posições da tabela que dão vaga à fase seguinte (ou acesso, ou
  rebaixamento), marcadas nas telas.
- **Classificação geral da fase**: ordem de todos os clubes de todos os grupos, usada para os
  melhores da posição seguinte, o mando de campo e o rebaixamento.
- **Posição final**: posição única de cada clube na divisão ao fim da temporada, calculada pela fase
  mais alcançada e pela classificação geral; é o que os demais sistemas leem.
- **Origem da vaga**: de onde vem cada clube do chaveamento (por exemplo, o 2º do Grupo C).
- **Divisão em fases**: divisão cujo campeonato é uma sequência de fases e não uma só tabela.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um banco de teste com uma divisão em grupos regionais seguidos de mata-mata joga 30
  temporadas seguidas sem erro, e em 30 de 30 temporadas os promovidos à divisão de cima saem do
  mata-mata (os finalistas).
- **SC-002**: Em todos os sorteios do teste cuja separação é possível (no mínimo 300, entre
  temporadas e seeds), nenhuma regra de potes ou de separação é violada; os clubes de pote isento
  são o único caso em que dois clubes do mesmo país podem dividir o grupo.
- **SC-003**: Em todos os sorteios do banco de teste regional, os clubes de cada região ocupam
  grupos vizinhos, em no máximo um grupo além do mínimo (o número de clubes da região dividido pelo
  tamanho do grupo, arredondado para cima).
- **SC-004**: A mesma seed e o mesmo banco geram o mesmo sorteio em 10 de 10 execuções, inclusive
  com salvar e carregar no meio da competição.
- **SC-005**: 100% dos bancos de teste com separação impossível já nos dados são recusados na
  validação, e o sorteio pedido em modo de teste falha com erro que nomeia a fase, a regra e os
  clubes em conflito; numa carreira, 100% dos sorteios com separação impossível concluem com aviso,
  com todo clube num grupo e o mínimo de violações, e a carreira nunca fica parada. Bancos com
  concentração impossível concluem o sorteio sem erro.
- **SC-006**: Em todas as temporadas simuladas de uma divisão em fases, cada clube termina com
  uma posição final única de 1 ao número de clubes, sem repetição nem lacuna, e o campeão é o
  vencedor da última fase.
- **SC-007**: 100% dos bancos de teste inválidos (grupos que não fecham com o número de clubes,
  classificados incompatíveis com a fase seguinte, fase inexistente, acesso e rebaixamento que não
  coincidem) são recusados com mensagem que diz a fase ou o campo.
- **SC-008**: Em todas as fases de grupos simuladas, o número de classificados é exatamente o
  declarado nos dados e nenhum clube aparece duas vezes na fase seguinte.
- **SC-009**: O jogador encontra a tabela do seu grupo, com a zona de classificação, a partir da
  Início em no máximo dois cliques.
- **SC-010**: Com o banco padrão, uma carreira joga resultados idênticos aos de antes desta
  feature, e o teste de 30 temporadas do mundo padrão continua dentro dos limites da 008
  (economia), da 009 (forças) e da 017 (calendário).

## Assumptions

- **Dependência:** a 017 (calendário por datas, várias competições, condição física, cartões por
  competição) e a 018 (mata-mata, prorrogação, pênaltis, prêmios, chaveamento) já estão no jogo e
  são a base desta feature.
- **Mundo padrão sem mudança:** nenhuma competição nova entra no banco padrão; a prova é um banco
  de teste com uma divisão em grupos regionais seguidos de mata-mata (formato de quarta divisão
  nacional). O mod de exemplo ganha a descrição de uma competição em fases na documentação, sem
  alterar o que já é válido.
- **Região do clube:** é um atributo opcional e novo no clube (texto). Clubes sem região não entram
  em regras por região. O país já existe.
- **Grupos de mesmo tamanho:** todos os grupos de uma fase têm o mesmo tamanho (3 a 8 clubes, como
  ponto de partida calibrável) e o mesmo número de rodadas, o que torna pontos e saldos comparáveis
  entre grupos.
- **Potes:** por padrão, formados pela reputação do clube, em ordem decrescente, em blocos de
  tamanho igual ao número de grupos; uma fase pode declarar um pote formado pelos classificados da
  fase anterior (como o pote 4 de uma competição continental).
- **Regras por competição:** separação e concentração são dados de cada competição, não regras
  fixas do jogo. Exemplos: uma competição continental separa clubes do mesmo país (isentando o pote
  dos classificados da fase preliminar); a quarta divisão nacional concentra clubes da mesma região
  em grupos vizinhos. As competições multi-país em si ficam para os Marcos 8 e 9; esta feature só
  garante que o formato as comporta, provado por bancos de teste.
- **"Grupos próximos":** significa vizinhos na ordem dos grupos (1, 2, 3…); não há noção de mapa ou
  distância geográfica real.
- **Critério entre grupos:** na classificação geral, valem pontos e os critérios da fase que não
  dependem de adversários específicos; o confronto direto só vale dentro do grupo; o sorteio pela
  seed é o último critério.
- **Chaveamento padrão após os grupos:** cruza a posição no grupo (o 1º de um grupo contra o 2º de
  outro) e evita confrontos do mesmo grupo; os dados podem declarar uma tabela própria.
- **Sorteio impossível:** acontece quase só em bancos de mods mal montados ou depois de acessos e
  rebaixamentos que mudam a composição; na validação, os casos provados impossíveis são recusados, e
  os que só aparecem na carreira concluem com aviso (FR-014), sem travar o jogador.
- **Sistemas existentes:** finanças, torcida, diretoria, manchetes e histórico tratam os jogos de
  grupo como jogos de liga e os eliminatórios como jogos de copa; esta feature não cria regras
  novas para eles além do registro do campeão, dos promovidos e dos rebaixados.
- **Clubes eliminados:** a competição segue sendo disputada, em jogos simulados, depois que o clube
  do jogador sai dela.
- **Fora de escopo:** competições com clubes de vários países (vem com o Marco 8), vagas entre
  competições (idem), competições continentais e estaduais em si (Marco 9), edição de competições
  dentro do jogo.
