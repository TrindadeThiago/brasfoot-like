# Feature Specification: Calendário multi-competição

**Feature Branch**: `017-calendario-multi-competicao`

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description: "Temporada organizada por datas, com um clube disputando várias competições ao mesmo tempo (ver docs/design.md §3, §6 e §14) — prompt `docs/speckit-prompts/marco7/prompt017.md`."

## Contexto

Primeira feature do Marco 7 (Copas). Hoje a temporada é uma sequência de rodadas numeradas de uma
única liga (com suas divisões): avançar a carreira é jogar a próxima rodada, e quase tudo o que
acontece fora de campo é medido em rodadas: janelas de transferência, evolução do meio da
temporada, salários, bilheteria, humor da torcida, diretoria e manchetes. Não existe condição
física. O jogador escala o melhor time toda semana sem custo nenhum.

Esta feature troca a rodada pela **data** como unidade da temporada. Cada competição do banco diz,
como dado, em que dias joga (ex.: ligas no fim de semana, copas no meio de semana). O calendário da
temporada é montado a partir das competições do banco, e um clube pode ter jogos de competições
diferentes na mesma semana. Para que essa sequência pese, os jogadores passam a ter **condição
física**, que cai com os jogos e se recupera com os dias de descanso. Suspensões passam a valer por
competição. Os sistemas que hoje contam rodadas passam a contar datas e reagem a jogos de qualquer
competição. Carreiras salvas migram sem perder nada.

O formato das competições continua sendo só pontos corridos. Mata-mata, fase de grupos, vários
países e vagas entre competições ficam para as próximas features (018 em diante). Esta feature
só prepara o terreno. Com o banco padrão (uma liga, duas divisões), o jogo deve se comportar como
hoje.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Temporada montada por datas a partir das competições do banco (Priority: P1)

O banco descreve, para cada competição, em que dias da semana ela joga e em que período da
temporada. Ao começar uma temporada, o jogo monta o calendário de todas as competições, data a
data, e garante que nenhum clube tenha dois jogos no mesmo dia. Um banco com datas impossíveis é
recusado com uma mensagem que diz qual competição, qual clube e qual data causaram o problema.

**Why this priority**: é a base de todas as outras histórias e do primeiro critério de aceite. Sem
um calendário por datas, não existe próximo compromisso, calendário do clube nem descanso entre
jogos.

**Independent Test**: carregar um banco de teste com duas competições de pontos corridos em datas
intercaladas (fim de semana e meio de semana) e clubes em comum, montar a temporada e conferir que
todos os jogos de cada competição têm data, que nenhum clube joga duas vezes no mesmo dia e que a
mesma seed gera o mesmo calendário.

**Acceptance Scenarios**:

1. **Given** o banco padrão (uma liga, duas divisões, sem datas declaradas), **When** uma temporada
   começa, **Then** cada rodada da liga recebe uma data, uma por semana no fim de semana, e a ordem
   dos confrontos é a mesma que o jogo gera hoje para a mesma seed.
2. **Given** um banco com uma liga no fim de semana e uma segunda competição de pontos corridos no
   meio de semana, com clubes em comum, **When** a temporada começa, **Then** as duas competições
   aparecem no calendário em datas intercaladas e nenhum clube tem dois jogos na mesma data.
3. **Given** um banco em que duas competições com clubes em comum jogam no mesmo dia da semana e no
   mesmo período, **When** o banco é carregado (novo jogo ou mod importado), **Then** ele é recusado
   com uma mensagem clara que diz as duas competições, um clube em comum e a primeira data em
   conflito.
4. **Given** um banco em que uma competição tem mais rodadas do que datas disponíveis no período
   declarado, **When** o banco é carregado, **Then** ele é recusado com uma mensagem clara que diz a
   competição, quantas datas ela precisa e quantas o período oferece.
5. **Given** a mesma seed e as mesmas escolhas, **When** a temporada é montada duas vezes (inclusive
   após salvar e carregar), **Then** o calendário é idêntico data a data.

---

### User Story 2 - Próximo compromisso, de qualquer competição (Priority: P1)

Na Início, o jogador vê o próximo jogo do seu clube, com data, adversário, mando e competição. Ao
avançar, a carreira vai até essa data. As datas no meio, em que o clube do jogador não joga, são
simuladas sem parar. O jogo dessa data pode ser jogado ao vivo ou simulado direto, como hoje.

**Why this priority**: é o ciclo central do jogo com o calendário novo. Sem ele, o jogador não
consegue disputar a segunda competição, que é o primeiro critério de aceite.

**Independent Test**: com o banco de teste de duas competições, avançar a carreira várias vezes e
conferir que cada avanço para no próximo jogo do clube do jogador, alternando entre as competições
conforme o calendário. Os jogos das datas puladas devem ficar com resultado.

**Acceptance Scenarios**:

1. **Given** o próximo jogo do clube do jogador é de uma competição de meio de semana, **When** ele
   abre a Início, **Then** vê data, adversário, mando e o nome da competição desse jogo.
2. **Given** há datas sem jogo do clube do jogador antes do próximo compromisso, **When** ele avança,
   **Then** os jogos dessas datas são simulados, os resultados entram nas tabelas, e a carreira para
   na data do próximo jogo do clube.
3. **Given** a data do próximo jogo do clube do jogador, **When** ele escolhe jogar ao vivo, **Then**
   a rodada ao vivo mostra os jogos dessa competição naquela data, como hoje. Ao simular direto, o
   resultado é o mesmo do ao vivo (mesmo estado e mesma seed).
4. **Given** o clube do jogador já cumpriu todos os seus jogos e outras competições ainda têm datas,
   **When** ele avança, **Then** as datas restantes são simuladas e a temporada vira normalmente.
5. **Given** a última data da temporada passou, **When** ele avança, **Then** a virada de temporada
   acontece uma vez só, depois do último jogo de todas as competições.

---

### User Story 3 - Descanso entre jogos e condição física (Priority: P1)

Cada jogador tem uma condição física. Ela cai com os minutos jogados e se recupera a cada dia sem
jogo. Jogar cansado rende menos. Com dois jogos na mesma semana, escalar sempre os mesmos onze cobra
seu preço, e o rodízio passa a fazer sentido. Os clubes da IA seguem as mesmas regras e também
poupam jogadores cansados.

**Why this priority**: é o que faz jogos em sequência pesarem (terceira história do usuário).
Também é a condição para o comportamento com o banco padrão continuar igual: com uma semana entre os
jogos, a condição se recupera por completo.

**Independent Test**: com o banco de teste, jogar duas partidas com três dias de intervalo
escalando os mesmos onze. Conferir que a condição deles é menor no segundo jogo e que o rendimento
do time cai em relação a escalar reservas descansados. Com o banco padrão, conferir que todos chegam
a cada jogo com a condição cheia.

**Acceptance Scenarios**:

1. **Given** um jogador que atuou os 90 minutos, **When** o jogo termina, **Then** a condição física
   dele cai. Quem entrou no segundo tempo perde menos, e quem não jogou não perde nada.
2. **Given** dias sem jogo, **When** as datas passam, **Then** a condição de cada jogador se recupera
   a cada dia até o máximo.
3. **Given** uma semana inteira (7 dias) entre dois jogos, **When** o segundo jogo começa, **Then**
   todo jogador que atuou no primeiro está com a condição cheia.
4. **Given** dois jogos com 3 dias de intervalo, **When** o segundo começa, **Then** quem jogou os
   90 minutos do primeiro ainda não está com a condição cheia e rende menos que um companheiro
   igual, mas descansado.
5. **Given** a tela de escalação, **When** o jogador escolhe os titulares, **Then** vê a condição
   física de cada jogador do elenco.
6. **Given** um clube da IA com jogadores cansados e reservas descansados de força próxima, **When**
   a IA escala o time, **Then** ela leva a condição em conta e poupa parte dos cansados.

---

### User Story 4 - Calendário do clube com todos os jogos da temporada (Priority: P2)

Uma tela de calendário lista todos os jogos do clube do jogador na temporada, de todas as
competições, em ordem de data: data, competição, adversário, mando e, nos jogos já disputados, o
placar. O jogador pode filtrar por competição.

**Why this priority**: é a segunda história do usuário. Ela ajuda a planejar o rodízio, mas o jogo
continua jogável sem ela.

**Independent Test**: com o banco de teste, abrir o calendário no meio da temporada e conferir que
os jogos das duas competições aparecem em ordem de data, que os disputados têm placar e que o filtro
mostra só os jogos da competição escolhida.

**Acceptance Scenarios**:

1. **Given** um clube em duas competições, **When** o jogador abre o calendário, **Then** vê todos os
   jogos do clube na temporada, de ambas as competições, em ordem de data.
2. **Given** jogos já disputados, **When** ele olha o calendário, **Then** esses jogos mostram o
   placar e o próximo jogo aparece destacado.
3. **Given** o filtro por competição, **When** ele escolhe uma competição, **Then** só os jogos dessa
   competição aparecem, e ele pode voltar a ver todos.
4. **Given** o banco padrão, **When** ele abre o calendário, **Then** vê os jogos da sua divisão com
   datas, e o filtro não aparece (só há uma competição).

---

### User Story 5 - Telas por competição (Priority: P2)

Onde o conteúdo depende da competição (tabela, resultados da rodada, artilharia e estatísticas),
o jogador escolhe a competição por abas. As abas só aparecem quando há mais de uma competição
disponível. A competição do próximo jogo do clube vem selecionada.

**Why this priority**: sem as abas, a segunda competição não pode ser acompanhada. É o mínimo para
o jogador disputar as duas com informação.

**Independent Test**: com o banco de teste, abrir a tabela e os resultados e alternar entre as abas
das duas competições. Com o banco padrão, conferir que as telas continuam como hoje, sem abas novas.

**Acceptance Scenarios**:

1. **Given** um clube em duas competições, **When** o jogador abre a tabela, **Then** vê uma aba para
   cada competição, e a competição do próximo jogo vem selecionada.
2. **Given** a aba de uma competição, **When** ele a escolhe, **Then** a tabela, os resultados e as
   estatísticas mostrados são só dessa competição.
3. **Given** o banco padrão, **When** ele abre essas telas, **Then** elas ficam como hoje: só a
   escolha de divisão que já existe, sem abas de competição.

---

### User Story 6 - Finanças, diretoria, torcida, manchetes, mercado e evolução por datas (Priority: P2)

Os sistemas que hoje contam rodadas passam a contar datas e reagem a jogos de qualquer competição.
Todo jogo em casa gera renda. Toda vitória ou derrota mexe com a torcida e a diretoria e pode virar
manchete. As janelas de transferência abrem e fecham em datas. A evolução do meio da temporada
acontece na data do meio da temporada.

**Why this priority**: sem isso, a segunda competição seria um jogo sem consequência. Com o banco
padrão, a mudança é invisível, por isso vem depois das histórias que abrem o novo calendário.

**Independent Test**: com o banco de teste, jogar um jogo em casa da segunda competição e conferir a
renda no caixa, a reação da torcida, o efeito na confiança da diretoria e a manchete. Conferir também
que as janelas abrem e fecham nas datas esperadas.

**Acceptance Scenarios**:

1. **Given** um jogo em casa de qualquer competição, **When** ele termina, **Then** a bilheteria entra
   no caixa do mandante, com o mesmo cálculo de público e renda que a liga usa hoje.
2. **Given** um resultado de qualquer competição, **When** ele termina, **Then** a torcida, a
   diretoria e as manchetes reagem a ele como reagem hoje a um jogo da liga, incluindo o peso extra
   de clássico.
3. **Given** as janelas de transferência da temporada, **When** as datas passam, **Then** cada janela
   abre e fecha em uma data, e o mercado mostra até quando a janela atual fica aberta (ou quando
   abre a próxima) como data.
4. **Given** um mod que declara janelas em rodadas da liga, como hoje, **When** a temporada é
   montada, **Then** cada janela é convertida para as datas dessas rodadas da liga principal, e o
   mod continua válido.
5. **Given** o banco padrão, **When** 30 temporadas são simuladas sem interação, **Then** a economia
   e as forças ficam dentro dos limites da 008 e da 009.

---

### User Story 7 - Suspensões por competição (Priority: P2)

Cartões recebidos em uma competição só geram suspensão nessa competição. Um jogador suspenso na liga
pode jogar a copa da mesma semana. Lesões continuam valendo para tudo. A regra é dado da competição:
por padrão, cada competição conta os próprios cartões.

**Why this priority**: é a regra que o futebol real segue e que o jogador espera. Ela só aparece
quando há mais de uma competição.

**Independent Test**: com o banco de teste, fazer um jogador ser expulso na competição A e conferir
que ele fica suspenso no próximo jogo de A, mas pode ser escalado no jogo de B que vem antes.

**Acceptance Scenarios**:

1. **Given** um jogador expulso em um jogo da competição A, **When** o clube joga a competição B antes
   do próximo jogo de A, **Then** ele pode ser escalado em B e continua suspenso para o próximo jogo
   de A.
2. **Given** amarelos acumulados na competição A, **When** ele recebe amarelos na competição B,
   **Then** as contagens são separadas e só a da competição em que o limite foi atingido gera
   suspensão.
3. **Given** um jogador lesionado, **When** o clube joga qualquer competição, **Then** ele está
   indisponível até se recuperar, em todas as competições.
4. **Given** a escalação de um jogo, **When** o jogador vê o elenco, **Then** cada suspensão aparece
   com a competição a que se aplica.

---

### User Story 8 - Carreiras salvas migram sem perder nada (Priority: P1)

Uma carreira salva na versão anterior abre no novo formato na mesma rodada, agora com datas, com o
mesmo histórico, caixa, elenco, tabelas, humor da torcida e confiança da diretoria, e continua
jogável. Isso vale também para saves exportados e importados.

**Why this priority**: é critério de aceite e princípio da constituição (Saves Versionados). Perder
uma carreira é perder a confiança do jogador.

**Independent Test**: abrir saves fixos da versão anterior (no início, no meio e no fim de uma
temporada, e um com várias temporadas de histórico) e conferir que abrem no mesmo ponto, com o
mesmo histórico, e que a próxima rodada pode ser jogada.

**Acceptance Scenarios**:

1. **Given** um save da versão anterior parado depois da rodada 17, **When** ele é aberto, **Then** a
   carreira está na data correspondente à rodada 18, com as 17 rodadas jogadas, as tabelas e os
   resultados iguais aos de antes.
2. **Given** um save com várias temporadas de histórico, **When** ele é aberto, **Then** títulos,
   campanhas, recordes, lendas e manchetes antigas continuam iguais.
3. **Given** um save migrado, **When** o jogador avança, **Then** a temporada continua até o fim e
   vira normalmente.
4. **Given** um jogador suspenso ou com amarelos no save antigo, **When** o save é migrado, **Then** a
   suspensão e os amarelos passam a valer para a liga. Todos os jogadores começam com a condição
   física cheia.
5. **Given** um save exportado na versão anterior, **When** ele é importado, **Then** passa pela
   mesma migração e abre jogável.

---

### Edge Cases

- Banco sem nenhuma informação de datas (como o padrão e os mods atuais): a liga usa o padrão de um
  jogo por semana no fim de semana, a partir da data de início da temporada, e o banco continua
  válido.
- Competição com número ímpar de clubes: o clube de folga naquela data simplesmente não joga, como
  hoje. A folga não conta como jogo para condição, suspensão nem renda.
- Clube do jogador fora de uma das competições: o calendário do clube e o filtro mostram só as
  competições que o clube disputa. As abas de tabela, resultados e estatísticas mostram todas as
  competições do banco, para que ele acompanhe as outras.
- Datas de competições diferentes que caem no mesmo dia sem clubes em comum: permitido. Na rodada
  ao vivo, o jogador vê só os jogos da competição do seu jogo.
- Duas competições com clubes em comum em datas consecutivas (ex.: domingo e segunda): permitido.
  O desgaste é tratado pela condição física.
- Competição cujo período declarado começa antes do início ou termina depois do fim da temporada:
  recusado com erro claro, com a competição e as datas.
- Período ou dia da semana inválido (ex.: data que não existe, dia da semana fora da lista, fim antes
  do início): recusado com erro claro, com o arquivo e o campo, como as demais validações do banco.
- Jogador que muda de clube no meio da temporada: as suspensões pendentes em cada competição o
  acompanham, como hoje acontece na liga, e a condição física vai com ele.
- Jogador com a condição muito baixa: pode ser escalado (a escolha é do técnico), mas rende menos. A
  tela avisa que ele está cansado.
- Virada de temporada: a condição física de todos volta ao máximo na pré-temporada. Amarelos zeram
  como hoje, e suspensões pendentes seguem as regras atuais de virada para cada competição.
- Carreira salva no meio de uma rodada ao vivo (se o jogo hoje permite): a migração preserva o que
  o jogo atual preserva nesse caso, sem perder rodadas já jogadas.
- Mod com janelas de transferência em rodadas que vão além do total de rodadas da liga: a janela
  termina na última data da liga, como hoje termina na última rodada.

## Requirements *(mandatory)*

### Functional Requirements

**Calendário por datas**

- **FR-001**: Cada competição do banco DEVE poder declarar, como dado, os dias da semana em que joga
  (ex.: sábado/domingo para ligas, quarta para copas) e o período da temporada em que joga (data
  inicial e data final, ou deslocamentos a partir do início da temporada).
- **FR-002**: Uma competição sem datas declaradas DEVE usar o padrão: uma rodada por semana no fim
  de semana, a partir do início da temporada. O banco padrão e os mods atuais continuam válidos sem
  alteração.
- **FR-003**: Ao começar uma temporada, o jogo DEVE montar o calendário de todas as competições do
  banco, atribuindo uma data a cada rodada de cada competição em ordem, a partir das datas declaradas
  pela competição.
- **FR-004**: A montagem DEVE ser determinística: mesma seed, mesmo banco e mesmas escolhas geram o
  mesmo calendário, data a data, inclusive após salvar e carregar.
- **FR-005**: Com o banco padrão, a ordem dos confrontos de cada divisão DEVE ser a mesma que o jogo
  gera hoje para a mesma seed. Só a data de cada rodada é nova.
- **FR-006**: O banco DEVE ser recusado, com erro claro, quando um mesmo clube ficaria com dois jogos
  na mesma data. A mensagem diz as competições, um clube em comum e a primeira data em conflito.
- **FR-007**: O banco DEVE ser recusado, com erro claro, quando uma competição não cabe no período
  declarado (mais rodadas que datas disponíveis) ou quando o período sai da temporada. A mensagem diz
  a competição, as datas necessárias e as disponíveis.
- **FR-008**: As validações de FR-006 e FR-007 DEVEM acontecer ao carregar o banco (novo jogo e
  importação de mod), antes de a carreira começar, e usar o mesmo formato de erro das demais
  validações do banco (arquivo, campo e mensagem traduzível).
- **FR-009**: A temporada DEVE terminar depois da última data de todas as competições, e a virada
  DEVE acontecer uma vez só, nesse ponto.

**Avanço da carreira**

- **FR-010**: A Início DEVE mostrar o próximo compromisso do clube do jogador: data, competição,
  adversário e mando.
- **FR-011**: Avançar a carreira DEVE simular todas as datas anteriores ao próximo jogo do clube do
  jogador e parar na data desse jogo.
- **FR-012**: O jogo do clube do jogador DEVE poder ser jogado ao vivo ou simulado direto, com o
  mesmo resultado para o mesmo estado e a mesma seed. A rodada ao vivo mostra os jogos da competição
  do jogador naquela data.
- **FR-013**: Quando o clube do jogador não tiver mais jogos na temporada, avançar DEVE simular as
  datas restantes e levar à virada de temporada.
- **FR-014**: O autosave DEVE acontecer ao fim de cada data em que o clube do jogador joga, como hoje
  acontece ao fim de cada rodada.

**Condição física**

- **FR-015**: Todo jogador DEVE ter uma condição física, de 0 a 100%, que começa cheia.
- **FR-016**: Ao fim de cada jogo, a condição de quem jogou DEVE cair em proporção aos minutos
  jogados. Quem não entrou em campo não perde condição.
- **FR-017**: A cada dia, a condição DEVE se recuperar até o máximo. A recuperação DEVE ser tal que
  7 dias de descanso recuperem por completo um jogador que atuou 90 minutos, e 3 dias não.
- **FR-018**: A condição DEVE reduzir o rendimento do jogador na partida: quanto mais baixa, menor a
  contribuição dele. Com a condição cheia, o rendimento é o de hoje.
- **FR-019**: As taxas de desgaste e de recuperação e o efeito no rendimento DEVEM ser dados com
  padrão definido (regras do banco), não constantes fixas no código.
- **FR-020**: A escalação DEVE mostrar a condição de cada jogador e avisar quando um titular está
  cansado.
- **FR-021**: A IA DEVE levar a condição em conta ao escalar os clubes dela, com as mesmas regras
  que valem para o jogador.
- **FR-022**: Na virada de temporada, a condição de todos os jogadores DEVE voltar ao máximo.

**Suspensões por competição**

- **FR-023**: Amarelos e suspensões DEVEM ser contados por competição. Cartões de uma competição não
  suspendem em outra.
- **FR-024**: Cada competição DEVE poder declarar, como dado, as próprias regras de cartões (limite
  de amarelos, jogos por vermelho). Sem declaração, valem as regras atuais da liga.
- **FR-025**: Lesões DEVEM continuar valendo para todas as competições, contadas pelo tempo
  (datas/jogos) como hoje.
- **FR-026**: A escalação DEVE mostrar, para cada jogador suspenso, a competição em que ele cumpre
  a suspensão, e só bloqueá-lo nos jogos dessa competição.

**Sistemas por data**

- **FR-027**: Todo jogo em casa, de qualquer competição, DEVE gerar bilheteria para o mandante, com
  o mesmo cálculo de público e renda que a liga usa hoje.
- **FR-028**: Receitas e despesas periódicas que hoje acontecem por rodada (como salários) DEVEM
  passar a acontecer por data (período do calendário). Com o banco padrão, o total anual DEVE ficar
  igual ao de hoje.
- **FR-029**: Torcida, diretoria e manchetes DEVEM reagir a jogos de qualquer competição, com as
  mesmas regras de hoje, incluindo o peso extra de clássico.
- **FR-030**: Metas da diretoria e premiações continuam ligadas à liga. Metas e premiações de outras
  competições ficam para as features que trouxerem copas.
- **FR-031**: As janelas de transferência DEVEM abrir e fechar em datas. O mercado mostra as datas da
  janela atual ou da próxima.
- **FR-032**: Mods que declaram janelas em rodadas da liga DEVEM continuar válidos. Cada janela é
  convertida para as datas dessas rodadas da liga principal.
- **FR-033**: A evolução do meio da temporada DEVE acontecer na data do meio da temporada, e a de
  fim de temporada na virada, como hoje.
- **FR-034**: Histórico, recordes e estatísticas DEVEM registrar a competição de cada jogo. Os
  registros da liga continuam como hoje.

**Telas**

- **FR-035**: DEVE existir uma tela de calendário do clube com todos os jogos da temporada, de todas
  as competições, em ordem de data. Cada jogo mostra data, competição, adversário, mando e o placar
  quando já foi disputado.
- **FR-036**: O calendário DEVE ter um filtro por competição quando o clube disputa mais de uma.
- **FR-037**: Tabela, resultados e estatísticas DEVEM ter abas por competição quando houver mais de
  uma. A competição do próximo jogo do clube vem selecionada. Com uma só competição, as telas ficam
  como hoje.
- **FR-038**: Todo texto novo visível (dias da semana, datas, rótulos, avisos, erros de validação)
  DEVE passar pelo i18n. Datas aparecem no formato do idioma.
- **FR-039**: Os nomes das competições DEVEM vir do banco, nunca das traduções.

**Saves e formato do banco**

- **FR-040**: O formato de save DEVE ganhar uma nova versão, com migração da versão anterior. A
  carreira migrada fica na data da próxima rodada que ainda não foi jogada, com o mesmo histórico,
  caixa, elencos, tabelas, humor da torcida e confiança da diretoria.
- **FR-041**: Na migração, amarelos e suspensões existentes DEVEM passar a valer para a liga, e todo
  jogador DEVE começar com a condição física cheia.
- **FR-042**: A migração DEVE valer também para saves exportados e importados, e DEVE haver testes com
  saves fixos da versão anterior (início, meio e fim de temporada, e um com várias temporadas).
- **FR-043**: O formato de mod documentado (`docs/mod-format.md`) DEVE descrever os novos campos de
  datas, regras de cartões e condição física por competição, e os novos erros de validação.

**Balanceamento**

- **FR-044**: Com o banco padrão, o teste de 30 temporadas DEVE continuar dentro dos limites da 008
  (economia) e da 009 (forças).
- **FR-045**: Com o banco de teste de duas competições, uma simulação longa sem interação DEVE jogar
  temporadas completas sem conflito de datas, com placares médios e economia dentro dos limites
  atuais.

### Key Entities *(include if feature involves data)*

- **Agenda da competição**: o que a competição declara no banco sobre quando joga: dias da semana e
  período na temporada. Também pode declarar regras de cartões. Tem um padrão para quem não declara
  nada.
- **Calendário da temporada**: a lista de datas da temporada, em ordem. Cada data guarda os jogos de
  cada competição que acontecem nela. É montado a partir das agendas e substitui a lista de rodadas
  como o eixo da temporada.
- **Data de jogo**: um dia do calendário com jogos de uma ou mais competições. Para cada competição,
  tem o número da rodada dela e os confrontos.
- **Próximo compromisso**: o primeiro jogo ainda não disputado do clube do jogador (data, competição,
  adversário, mando).
- **Condição física**: valor de 0 a 100% por jogador. Cai com minutos jogados, sobe a cada dia sem
  jogo e afeta o rendimento.
- **Situação disciplinar por competição**: amarelos acumulados e jogos de suspensão de um jogador em
  uma competição.
- **Janela de transferência**: período com data de abertura e de fechamento. Pode vir de datas ou ser
  convertida das rodadas da liga.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um banco de teste com duas competições de pontos corridos, em datas intercaladas e com
  clubes em comum, joga 100% das datas de uma temporada completa sem nenhum clube com dois jogos no
  mesmo dia, e o jogador disputa todos os jogos do seu clube nas duas competições.
- **SC-002**: Em 100% dos saves fixos da versão anterior, a carreira abre na mesma rodada, com o
  mesmo histórico (títulos, campanhas, recordes, manchetes), e a temporada pode ser jogada até a
  virada sem erro.
- **SC-003**: Com o banco padrão, o teste de 30 temporadas sem interação fica dentro de todos os
  limites declarados da 008 (economia) e da 009 (forças).
- **SC-004**: Com o banco padrão e a mesma seed, os confrontos de todas as rodadas e o total anual de
  receitas e despesas de cada clube na primeira temporada são iguais aos da versão anterior. Com a
  condição cheia a cada jogo, os placares não mudam.
- **SC-005**: Mesma seed e mesmas escolhas produzem o mesmo calendário e os mesmos resultados em
  10 de 10 execuções, inclusive com salvar e carregar no meio da temporada.
- **SC-006**: 100% dos bancos de teste com datas impossíveis (dois jogos do mesmo clube no mesmo
  dia; competição que não cabe na temporada; período fora da temporada) são recusados com uma
  mensagem que diz a competição e a data ou campo em causa.
- **SC-007**: Com dois jogos em 3 dias, um time que repete os onze titulares tem condição média
  menor no segundo jogo do que um time que faz rodízio. Em simulação longa, o time cansado tem um
  rendimento médio mensuravelmente menor.
- **SC-008**: A partir da Início, o jogador encontra o próximo compromisso (data, competição e
  adversário) sem navegar, e o calendário do clube a um clique.

## Assumptions

- O formato de disputa continua só de pontos corridos. Mata-mata, fase de grupos, vários países,
  vagas entre competições, metas da diretoria e premiações de outras competições ficam fora
  (018 em diante).
- Data de início e de fim da temporada: o padrão é a temporada de hoje (a partir da data de
  referência do banco). A liga do banco padrão joga uma rodada por semana no fim de semana, e o
  período da temporada é longo o bastante para ela.
- Conflitos de data são recusados, não resolvidos: o jogo não remarca jogos automaticamente. Um
  banco precisa declarar agendas compatíveis.
- Jogos de competições diferentes em dias consecutivos são permitidos. O descanso mínimo não é uma
  regra de validação, só pesa pela condição física.
- A condição física afeta só o rendimento na partida. O efeito sobre o risco de lesão fica fora
  desta feature, para não mexer no balanceamento das lesões.
- A condição física é exibida em percentual e começa cheia em novos jogos e em saves migrados.
- Por padrão, cada competição conta os próprios cartões, com as regras atuais de cartões da liga.
- A rodada ao vivo continua mostrando os jogos de uma competição por vez: a do jogo do jogador
  naquela data.
- Dois dias da semana no padrão de liga (sábado e domingo) são tratados como um mesmo fim de semana:
  cada rodada da liga ocupa uma data. Um banco pode escolher o dia.
- Os nomes de dias da semana e o formato das datas vêm do i18n (pt-BR no lançamento).
- O banco de teste de duas competições é dado de teste do motor, não conteúdo do jogo. O mundo
  padrão só ganha uma segunda competição (a copa nacional) na feature de mata-mata.
