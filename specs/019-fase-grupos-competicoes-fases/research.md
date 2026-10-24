# Research: Fase de grupos e competições em fases

Decisões técnicas da 019. Os números são os padrões iniciais (`DEFAULT_STAGES`, `GROUP_DRAW_TUNING`),
ajustáveis por dados ou calibrados nos testes de simulação (R15).

## R1 — Sequência de fases em dados: `StageFormat`, `format.type` e `division.stages`

- **Decision**: o formato de disputa ganha um tipo de **fase** (`StageFormat`), uma união
  discriminada por `type`:

  ```text
  league:    { type, rounds 1..4, points{win,draw,loss}, tiebreakers[], qualified? }   // o formato da liga de hoje
  groups:    { type, groupSize 3..8, rounds 1|2, points, tiebreakers[], qualified, extra?,
               gapWeeks?, enter?: clubId[], draw?: { pots?, previousStagePot?, rules?[] } }
  knockout:  { type, phases[], entries?[], pairing?: "position" | "draw", pairs?[], enter?: clubId[] }
  ```

  `knockout` é o `KnockoutFormat` da 018 (as fases `phases` e as `entries` por fase não mudam), com
  três campos novos que só valem dentro de uma sequência: `pairing`, `pairs` e `enter`.

  Onde declarar, sem criar duas maneiras de dizer a mesma coisa:

  - `competition.format.type` aceita `"league"` e `"knockout"` (como hoje), `"groups"` (a competição
    é uma única fase de grupos) e `"stages"` (`{ type: "stages", stages: StageFormat[] }`).
  - `division.stages?: StageFormat[]` **substitui** o formato da competição naquela divisão. É o que
    deixa divisões de pontos corridos e uma divisão em fases na mesma competição (FR-002).
  - Uma função `stagesOf(competition, division): StageFormat[]` normaliza tudo para a lista de
    fases: `league` → `[league]`, `knockout` → `[knockout]` (a copa da 018 segue no caminho
    próprio dela), `groups` → `[groups]`, `stages` → a lista, e `division.stages` vence. O resto do
    motor só conhece essa lista.
  - `RESERVED_FORMAT_TYPES` fica vazia (`groups` deixa de ser reservado, FR-001).
- **Rationale**: o princípio III pede que adicionar uma competição seja trabalho de dados. Uma
  sequência de fases é o conceito que faltava (FR-002); `division.stages` resolve a mistura de
  divisões sem tocar nas que já funcionam, e `groups`/`stages` no nível da competição cobrem a
  copa continental de uma só divisão do Marco 9.
- **Alternatives considered**: um `phases[]` na competição com um formato por fase e as divisões
  apontando para elas (mais indireção para o modder); só `division.stages` (exigiria repetir a
  sequência em toda divisão de uma competição de divisão única); um tipo `phased` à parte (nome
  que repete `stages`).

## R2 — Estado em execução: `Season.stages`, rodadas absolutas e `Fixture.stage`

- **Decision**: uma divisão em fases continua sendo **uma `Season`** (a unidade de que `LeagueSeason`,
  o dia de jogos, os cartões, as lesões e o calendário já dependem). Ela ganha `stages?: StageState[]`,
  uma entrada por fase com `kind`, `clubIds` (os participantes), `rounds` (números **absolutos**
  das rodadas no calendário da divisão) e o que for próprio do tipo (`groups` sorteados;
  `bracket` de uma fase eliminatória). `Season.calendar` tem, desde a criação, uma rodada para cada
  rodada de cada fase (como a copa da 018), com `fixtures: []` até a fase começar. `Season.clubIds`
  continua sendo todos os clubes da divisão.

  - `Fixture.stage?: { index; kind; group?: string }` marca de que fase e grupo é o jogo (FR-030).
  - `Round.byes?: string[]` guarda os clubes que folgam quando o grupo tem número ímpar (`bye`
    único continua para as ligas, que não o leem em nenhum lugar além do calendário).
  - `generateCalendar` ganha um deslocamento opcional (`firstRound`) para numerar as rodadas de uma
    fase a partir da posição dela; o padrão (1) mantém a liga idêntica.
  - Chaveamento por fase eliminatória em `StageState.bracket` (não em `Season.bracket`), para que
    `cupSeasonOf` e o histórico de copas da 018 (que identificam uma copa por `Season.bracket`) não
    confundam uma divisão em fases com uma copa.
- **Rationale**: modelar cada grupo como uma `Season` própria duplicaria registros, cartões e
  lesões; manter a `Season` única reaproveita tudo (`records`, `status`, `warnings`, `formations`).
  Rodadas absolutas prontas são o que torna o calendário por datas da 017 independente do sorteio.
- **Alternatives considered**: uma `Season` por grupo (duplica o estado e quebra
  `clubFixtures`/`roundMatches`); recalcular o calendário a cada fase (a data de cada rodada
  deixaria de ser função só do banco, ferindo a 017 R4).

## R3 — Reaproveitar o mata-mata da 018 por uma "visão" da fase

- **Decision**: o módulo `knockout/` (sorteio de fase, `tieState`, `phaseDecided`, prêmios, eventos)
  continua trabalhando sobre uma `Season` com `bracket`. Para uma fase eliminatória de uma divisão
  em fases, `stages/cup-view.ts` monta uma **visão**: uma `Season` com `bracket` = o da fase,
  `clubIds` = os participantes da fase e o `KnockoutFormat` dela, e devolve o resultado (novas
  `fixtures` e `bracket`) para dentro de `Season.stages`. Duas mudanças pequenas no `knockout/`: as
  funções que hoje chamam `knockoutFormat(world, season.competitionId)` passam a aceitar o formato
  da visão (`cupFormat(world, season)`), e `drawPhase` ganha o pareamento por posição (R7).
  As copas da 018 não passam pela visão e ficam idênticas.
- **Rationale**: a 018 já resolveu pernas, agregado, prorrogação, pênaltis, mando e prêmios; o que
  é novo aqui é só quem entra na fase e como o primeiro confronto é montado.
- **Alternatives considered**: copiar o módulo para o `stages/` (duas implementações de
  agregado/desempate para manter); trocar tudo para um `CupRef` explícito (reescreve ~500 linhas
  da 018 sem ganho para esta feature).

## R4 — Avanço das fases: `advanceStages`, idempotente, a cada rodada fechada

- **Decision**: `advanceStages(season, world)` roda ao fim de `completeRound` (uma chamada, para
  qualquer `Season` com `stages`; sem `stages` é um `return season` imediato). Ele percorre as fases
  em ordem: se a fase `k` terminou (todas as suas rodadas jogadas e, numa eliminatória, todos os
  confrontos decididos) e a `k+1` ainda não começou, define os participantes da `k+1`
  (classificados da `k` + `enter` da `k+1`), faz o que o tipo pede (sorteio dos grupos e
  `generateCalendar` por grupo; calendário da liga; sorteio/pareamento da 1ª fase eliminatória) e
  preenche as `fixtures` das rodadas da fase. A fase 0 começa em `createStagedSeason`.
  `createSeason`/`createLeagueSeason` despacham para ela quando `stagesOf(...)` tem mais de uma fase
  ou uma fase que não é a liga simples.
- **Rationale**: é o mesmo gancho da copa (`drawReady` a cada rodada), então o jogador vê o
  adversário da fase seguinte assim que ela existe, e nenhuma rodada começa sem `fixtures`.
- **Alternatives considered**: sortear tudo na criação (os classificados ainda não existem);
  sortear só no início do dia da fase (o ao vivo e o direto passariam por caminhos diferentes).

## R5 — Classificação, classificados e classificação geral

- **Decision**: o cálculo de `standings.ts` vira uma função de baixo nível reutilizável,
  `rankRows(clubIds, records, points, tiebreakers, seed, options)`, que `standings()` (liga) usa sem
  mudar nada. Em cima dela:

  - **tabela de grupo**: `groupStandings(season, world, stageIndex, groupId)` filtra os registros
    das rodadas da fase e dos clubes do grupo, com a pontuação e os desempates da fase;
  - **classificação geral**: `overallStandings(season, world, stageIndex)` junta as linhas de todos
    os grupos e ordena por pontos e pelos critérios da fase **sem o confronto direto** (que só vale
    dentro de um grupo); o último critério é sempre o sorteio pela seed (`draw-lots`, acrescentado se
    a fase não o listar), de modo que a ordem é total (FR-018);
  - **classificados**: `stageQualifiers(...)` devolve os `qualified` primeiros de cada grupo e, com
    `extra > 0`, os `extra` melhores **da posição `qualified + 1`** de todos os grupos pela
    classificação geral entre eles (FR-017); ninguém de posição mais baixa recebe vaga. Cada
    classificado vem com a posição no grupo e a posição na classificação geral (entrada do
    pareamento, R7).
  - fase de pontos corridos: `qualified` primeiros da tabela.
- **Rationale**: os grupos de uma fase têm o mesmo tamanho e as mesmas rodadas (validação), então
  pontos e saldo são comparáveis; o confronto direto exige adversários em comum, que só existem
  dentro do grupo.
- **Alternatives considered**: normalizar por jogo (desnecessário com grupos iguais); permitir
  grupos de tamanhos diferentes (quebraria a comparação entre grupos).

## R6 — Sorteio dos grupos: potes, separação, concentração, aviso e modos

- **Decision**: `drawGroups(clubs, rules, seed, mode)` em `stages/groups-draw.ts`. Entrada: os
  participantes com `reputation`, `countryId`, `region?` e, quando a fase o declara, a marca de
  que vieram da fase anterior; a regra da fase (`groups`, `draw`). Passos:

  1. **Potes** (FR-010): ordena por reputação (desc., empate pelo id) e corta em blocos do tamanho
     do número de grupos; com `previousStagePot`, os classificados da fase anterior formam o
     último pote e os demais se repartem em `pots − 1` blocos por reputação. Cada grupo recebe no
     máximo um clube de cada pote. Sem `pots`, o sorteio não tem potes.
  2. **Busca exata da separação** (FR-012): pote a pote, os clubes do pote são embaralhados pela seed
     (`fork("pot:n")`) e a busca em profundidade tenta, na ordem dos grupos, o primeiro grupo que
     não viola nenhuma `separate` (atributo `country` ou `region`; clubes de `exemptPots` não são
     checados nem contam para os outros), com retrocesso e verificação antecipada; devolve a
     primeira solução sem violações.
  3. **Concentração** (FR-013): sem potes, um preenchimento construtivo e determinístico coloca os
     clubes de cada valor do atributo em grupos consecutivos (regiões em ordem sorteada pela seed;
     cada região ocupa no máximo um grupo além do mínimo, SC-003); depois a separação é
     reaplicada pela busca do passo 2 como restrição, a concentração só desempata entre soluções.
     Com potes, a concentração é uma troca local (pares de clubes entre grupos que mantêm potes e
     separação e reduzem o custo `Σ grupos ocupados − mínimo`), em ordem fixa, até não melhorar.
  4. **Sem solução** (FR-014/FR-015): busca com ramificação e corte minimizando o número de pares
     que violam a separação, com teto de nós (`GROUP_DRAW_TUNING.nodeBudget`, 200.000, contado e não
     cronometrado); empates entre soluções iguais pela ordem da seed. No modo **`career`** devolve
     os grupos e um `DrawWarning { rule, clubIds }`; no modo **`strict`** (validação e testes)
     devolve o erro `stages.draw_impossible` (fase, regra, clubes em conflito) sem montar grupos.
  5. Os potes nunca são afrouxados; todo clube cai em algum grupo (FR-014).

  A validação (R10) já recusa o que dá para provar impossível nos dados (mais clubes do mesmo país
  fora dos potes isentos do que grupos).
- **Rationale**: bancos reais têm poucos clubes por grupo e poucos grupos, então a busca exata
  termina em milissegundos quando há solução; o teto de nós garante o fim quando não há e mantém
  o resultado determinístico. Separar os modos faz o jogo nunca travar sem esconder o erro de quem
  monta o mod.
- **Alternatives considered**: sorteio por tentativa e erro (não garante achar solução nem o
  mínimo de violações); relaxar também os potes (quebra a proposta da fase); falhar na carreira
  (trava o save na virada, contra o pedido).
- **Limite conhecido**: o "mínimo de violações" é exato dentro do teto de nós, o que cobre os
  bancos de teste e os mods realistas; acima do teto devolve a melhor solução encontrada (ainda
  determinística). A garantia de concentração do SC-003 vale para fases sem potes; com potes é
  melhor esforço.

## R7 — Chaveamento depois de uma fase de pontos: pareamento por posição

- **Decision**: a 1ª fase de um `knockout` que vem depois de `league`/`groups` usa
  `pairing: "position"` por padrão (`"draw"` volta ao sorteio da 018). `stages/pairing.ts` recebe os
  classificados já ordenados (melhores primeiro) pela posição no grupo (ou na tabela) e depois pela
  classificação geral:

  - o i-ésimo melhor enfrenta o i-ésimo pior (`i` × `M − 1 − i`); se forem do mesmo grupo, o
    parceiro troca com o vizinho mais próximo que resolve (ordem fixa, determinística), e se nada
    resolver mantém o par (FR-019: evita "enquanto houver como evitar");
  - o mandante (e a ida, em ida e volta) segue a regra `home` da fase; ela ganha o valor
    **`overall`**: o melhor colocado na classificação geral da fase de pontos anterior joga em casa
    (FR-006); `ranking`/`division`/`draw` continuam como na 018;
  - `pairs` (opcional) é uma tabela própria de confrontos por origem da vaga (`"A1"` = 1º do Grupo
    A, `"B2"`, ou `"T1"` = 1º da tabela, `"X1"` = primeira vaga extra): se existe, substitui o
    pareamento padrão.
- **Rationale**: é o chaveamento de campeonatos reais e usa só dados que o motor já tem.
- **Alternatives considered**: sortear livremente os classificados (um grupo inteiro poderia se
  reencontrar de saída); exigir sempre `pairs` (trabalho demais para o modder no caso comum).

## R8 — Posição final e `standings()` de uma divisão em fases

- **Decision**: `stages/ranking.ts` implementa `finalOrder(season, world)` (FR-024). Das últimas
  fases para as primeiras, os clubes da fase ainda não ordenados formam um bloco:

  - fase eliminatória: campeão e vice (se a final foi decidida), depois quem caiu em cada fase,
    da mais avançada para a menos avançada; dentro da mesma fase, pela classificação geral da
    fase de pontos anterior (sem fase de pontos antes, pela reputação, empate pelo id);
  - fase de grupos: pela classificação geral; fase de pontos corridos: pela tabela.

  `standings(season, world)` devolve, para uma `Season` com `stages`, as linhas nessa ordem
  (`position` 1..N). As estatísticas de cada linha (pontos, jogos, gols) vêm da última fase de
  pontos que o clube disputou; os jogos do mata-mata não entram nelas. Sem `stages`, devolve a
  tabela de hoje, sem mudar uma linha. Durante a temporada, o mesmo cálculo dá a "posição se
  acabasse hoje".

  Quem lê `standings()` (torcida, diretoria, composição da virada, histórico, resumo) não muda.
  `news/clinched.ts` (título/acesso/rebaixamento garantidos por pontos restantes) ignora
  divisões em fases, onde o conceito não se aplica.
- **Rationale**: um único ponto de leitura mantém a promessa do FR-024 ("continuam funcionando
  como numa divisão de pontos corridos") com a menor mudança possível.
- **Alternatives considered**: um `finalPosition` paralelo lido por cada sistema (sete lugares para
  adaptar); dar posição só a quem chegou ao mata-mata (deixaria os demais sistemas sem posição).

## R9 — Acesso e rebaixamento

- **Decision**: `nextComposition` (`career/composition.ts`) já usa a ordem de `standings()`; com R8,
  os `promotionSlots` primeiros sobem (os finalistas, com 2 vagas) e os `relegationSlots`
  últimos caem (os piores da classificação geral entre os que não passaram dos grupos). Nenhuma
  mudança na composição. Validação nova: o rebaixamento de uma divisão em fases não pode passar do
  número de clubes que ficam fora da fase seguinte à primeira (`stages.relegation_exceeds_eliminated`);
  o par `relegationSlots`/`promotionSlots` entre divisões já é conferido (`division.slots_mismatch`).
  O sorteio da temporada seguinte lê a composição nova (US5 cenário 4).
- **Rationale**: acesso e rebaixamento por posição final é o contrato já usado; a regra da divisão
  em fases só muda como a posição é calculada.
- **Alternatives considered**: campos de acesso próprios por fase (duplicaria `promotionSlots`).

## R10 — Validação do banco

- **Decision**: `validation/semantic/stages.ts` (códigos `stages.*`, mensagens em `errors.json`):
  `group_size_range` e `group_size_mismatch` (clubes da fase não são múltiplo do tamanho),
  `group_count` (< 2 grupos), `qualify_range` (`qualified` fora de 1..tamanho−1),
  `extra_exceeds_groups`, `qualify_mismatch` (classificados ≠ participantes da fase seguinte,
  contando `enter`), `qualified_without_next` (a última fase não classifica ninguém),
  `knockout_count` (confrontos sem número par de clubes, como `knockout.phase_count` da 018),
  `enter_unknown_club`/`enter_first_stage`/`enter_duplicate`, `pots_range`, `pot_size` (pote ≠
  número de grupos), `rule_exempt_pot` (isenção de pote inexistente), `separation_impossible`
  (mais clubes do mesmo país/região, fora dos potes isentos, do que grupos, quando dá para provar
  pelos dados), `pairs_invalid` (origem inexistente ou clube repetido), `relegation_exceeds_eliminated`
  (R9), `gap_conflict` (respiros numa competição de mais de uma divisão, R11). A validação
  estrutural deixa de recusar `format.type: "groups"` (`format.unsupported` fica só para tipos
  desconhecidos). `competitions.ts` passa a cobrir as divisões com `stages` nas contagens e vagas.
- **Interpretação do FR-007**: "uma fase de grupos for a última sem definir campeão ou acesso" vira
  duas regras verificáveis: a última fase não pode declarar classificados
  (`stages.qualified_without_next`) e as demais precisam declará-los (`stages.qualify_range`). Uma
  fase de grupos na última posição é válida: a classificação geral dela define a posição final
  (FR-024) e, com ela, o campeão e o acesso.
- **Rationale**: o princípio III exige erro claro por arquivo e campo; o prompt pede grupos que
  fecham com o número de clubes e classificados compatíveis com a fase seguinte.
- **Alternatives considered**: validar só em tempo de execução (o jogador veria o erro no meio da
  carreira).

## R11 — Calendário: rodadas, respiros e conflitos

- **Decision**: `calendar/season-calendar.ts` calcula `roundsOf(competition)` como o máximo, entre as
  divisões, da soma das rodadas das fases (`stageRounds`: liga `theoreticalRounds(participantes,
  turnos)`; grupos `theoreticalRounds(tamanho, turnos)`; eliminatória a soma das pernas). `gapsOf`
  junta os `gapWeeks` das fases (e das fases eliminatórias, como na 018) na grade de datas da
  competição; como as datas são uma grade só por competição, os respiros só cabem em competições
  de uma divisão (numa competição de mais de uma divisão eles são recusados com
  `stages.gap_conflict`). A regra de dois jogos no mesmo dia (017) continua
  valendo, agora com os clubes das divisões em fases. Uma fase eliminatória pode vir em qualquer
  posição da sequência (a preliminar de uma competição continental).
- **Rationale**: a 017 deixou a data de cada rodada como função do banco; fases são só mais
  rodadas na mesma grade.
- **Alternatives considered**: uma grade de datas por divisão (quebraria `dateOfRound` e o dia de
  jogos); proibir respiro em fases de grupos (o modder pode querer descanso antes do mata-mata).

## R12 — Sistemas que reagem a jogos

- **Decision**: jogos de fases de pontos (liga e grupos) seguem o caminho de jogos de liga
  (bilheteria, condição física, cartões por competição, torcida, diretoria, notícias); jogos de
  fase eliminatória usam os mesmos ganchos da copa da 018 (prorrogação, pênaltis, `cupPrizes` por
  fase, `cupEvents` com eliminação), via a visão (R3). Os eventos de **título** de copa, `cupEnd` e
  `cupHistory` ficam só para copas: o campeão de uma divisão em fases entra no histórico normal da
  temporada (`HistoryDivision.championId` = posição 1 de `standings()`). Prêmios de divisão (008)
  usam a posição final.
- **Rationale**: nenhuma regra nova de economia ou drama; a feature só dá a esses sistemas jogos de
  mais um tipo e a posição final.
- **Alternatives considered**: tratar toda fase eliminatória como "copa" no histórico (misturaria o
  título da quarta divisão com copas nacionais).

## R13 — Save v14

- **Decision**: `SAVE_FORMAT_VERSION` vai a 14. Os campos novos (`Season.stages`, `Fixture.stage`,
  `Round.byes`, `club.region`, `division.stages` no banco do save) são opcionais, então a migração
  v13 → v14 só atualiza `formatVersion` e é coberta por fixtures v13 (início, meio e fim de
  temporada, com copa em andamento). Carreiras antigas seguem sem fases (o banco delas não as tem).
  `equivalence.test.ts` não muda de linha de base: o mundo padrão não usa nenhum caminho novo.
- **Rationale**: o princípio VI pede versão e fixture a cada mudança de formato, mesmo aditiva;
  o custo é baixo e a regra fica uniforme com a 018.
- **Alternatives considered**: não subir a versão por ser aditivo (saves novos abririam em
  versões antigas e perderiam `stages` em silêncio).

## R14 — Telas

- **Decision**: a página da competição, quando a `Season` tem `stages`, mostra a navegação por fase
  (`StageNav`) e, por fase: tabelas por grupo com o grupo do clube em destaque, a legenda da zona
  de classificação e a marca da posição que dá vaga extra (`GroupTables`); a classificação geral
  (`OverallTable`) com marcação de quem se classificaria e de quem cairia hoje; o chaveamento da
  fase eliminatória com a origem de cada vaga ("1º do Grupo B", `StageBracket` sobre `Bracket`);
  o aviso de sorteio (`DrawNotice`) com as regras afrouxadas. A Início e o calendário mostram a fase
  e o grupo do próximo jogo (`Fixture.stage`). O resumo da temporada e o histórico mostram a posição
  final de FR-024 e quem foi campeão, promovido e rebaixado. Tudo vem do motor (`groupTables`,
  `overallStandings`, `stageQualifiers`, `finalOrder`, `drawWarnings`).
- **Rationale**: reaproveita `DataTable`, `StandingsTable` (ganha uma zona de classificação além de
  acesso/rebaixamento) e `Bracket`.
- **Alternatives considered**: uma tela por tipo de fase (mais rotas, mesma informação).

## R15 — Testes e balanceamento

- **Decision**: banco de teste `stages-bank.ts` (nomes fictícios, `region` nos clubes) com três
  variantes: (a) **regional**, gerada por `generateStagesBank` (também usada pelo mod de exemplo e
  pelos testes do web): divisão de cima de pontos corridos (8 clubes nos testes, 20 no mod) e a
  de baixo com 20 clubes em 4 grupos de 5 (regiões de 7, 5, 4 e 4 clubes, concentradas por região, 2
  classificados por grupo) seguidos de mata-mata de 8 clubes (quartas, semifinal e final), 2 vagas
  de acesso e 2 de rebaixamento; (b) **extras**, 24 clubes em 6 grupos de 4 (2 classificados por
  grupo mais as 4 melhores terceiras colocadas) seguidos de mata-mata de 16; (c) **continental**,
  uma competição de uma divisão com 28 clubes de 4 países: preliminar eliminatória de 16 clubes (4
  classificados), 4 grupos de 4 com 4 potes (o último, dos classificados da preliminar) e separação
  por país com esse pote isento, e mata-mata de 8 clubes. (O gerador de banco recusa uma divisão de
  32 clubes em turno duplo: 62 rodadas não cabem nas 52 semanas.) Testes: `groups-draw` (viável, inviável nos dois modos, potes, pote isento, concentração SC-003, 300+
  sorteios sem violação, determinismo), `classification` (grupo, geral sem confronto direto,
  extras só na posição seguinte), `pairing` (posição, mesmo grupo, `pairs`), `ranking` (posições
  únicas 1..N a cada rodada, FR-024), `advance` (idempotência, ao vivo = direto, salvar e carregar),
  `long-run` (30 temporadas: classificados exatos, promovidos vindos dos finalistas, sem clube
  duplicado), `validation` (um teste por código `stages.*`) e a equivalência do mundo padrão.
- **Medido** (`stages/long-run.test.ts`): 30 temporadas do banco regional em cerca de 4 s, sem
  nenhum erro; em 30 de 30 os promovidos são os finalistas; 8 classificados exatos por temporada e
  nenhum clube repetido na fase seguinte; posições finais únicas de 1 a 20; 300 sorteios sobre as
  composições reais com cada região em grupos consecutivos (no máximo um além do mínimo); 5
  temporadas do banco de vagas extras com 16 classificados (4 extras, todas de 3º lugar). Os
  limites do teste são os do spec e não precisaram de ajuste.
- **Rationale**: o princípio V pede limites declarados nos testes; o IX, testes antes do código.

## R16 — Riscos e alternativas descartadas

- **Risco: `standings()` com semântica nova** pode surpreender código que assume "tabela de
  pontos". Mitigação: só muda para `Season` com `stages`; consumidores conhecidos listados em R8;
  teste de posições únicas.
- **Risco: tempo do sorteio sem solução.** Mitigação: teto de nós e teste de desempenho.
- **Descartado**: um módulo de "competição composta" separado de `LeagueSeason` (duplicaria o dia
  de jogos); sorteio de grupos pelo mesmo `drawPhase` da 018 (modelo diferente: grupos com potes e
  atributos, não pares).
