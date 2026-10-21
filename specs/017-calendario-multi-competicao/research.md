# Research: Calendário multi-competição

Decisões técnicas da 017. Os números são os padrões iniciais (`DEFAULT_SCHEDULE`,
`DEFAULT_FITNESS`), ajustáveis por dados da competição e conferidos nos testes de simulação longa
(R15).

## R1 — Agenda da competição no formato do banco

- **Decision**: campo opcional `schedule` em cada competição de `competitions.json`:
  `{ weekday: 1..7 (ISO, 1 = segunda, 7 = domingo), startWeek: 0..51, everyWeeks: 1..4 }`. A rodada
  `r` (1..R) cai em `primeiro(weekday, início) + (startWeek + (r − 1) × everyWeeks) × 7` dias.
  `primeiro(weekday, início)` é o primeiro dia com esse dia da semana a partir do início da
  temporada. Sem `schedule`, vale `DEFAULT_SCHEDULE = { weekday: 7, startWeek: 0, everyWeeks: 1 }`:
  uma rodada por domingo, como o ritmo implícito de hoje. O `formatVersion` do mod não muda, e
  mods antigos continuam válidos.
- **Temporada**: começa em `seasonDate(manifest.referenceDate, year)`, a data que já é usada para
  as idades, e dura 52 semanas (364 dias). Uma competição cuja última rodada passe do último dia é
  recusada (R3).
- **Rationale**: dia da semana + semana inicial + intervalo cobre os dois casos do prompt (liga no
  fim de semana, copa no meio de semana a cada duas semanas) com três inteiros fáceis de editar. A
  data de cada rodada sai de aritmética inteira sobre `daysFromCivil` (`calendar/date.ts`), sem
  `Date` (Princípio II). O dia da semana é `(dias + 3) mod 7 + 1`, porque 1970-01-01 foi uma
  quinta-feira.
- **Alternatives considered**: lista explícita de datas por rodada (verbosa e frágil quando o
  número de clubes muda com mods); dois dias por fim de semana com rodada "sábado/domingo"
  (complica conflito e descanso sem ganho no jogo); datas absolutas `MM-DD` (amarram o mod ao
  calendário civil e quebram com anos bissextos).

## R2 — Quais competições jogam e qual é a principal

- **Decision**: todas as competições de `competitions.json` são disputadas. A **principal** é a
  primeira da lista, a mesma que o jogo usa hoje. Ela continua dona das regras de economia,
  mercado, diretoria, torcida e manchetes (`economyRules(world, competitionId)` e afins), das metas
  e premiações, do acesso e rebaixamento que definem a "divisão do clube" e do histórico atual.
  As demais são **secundárias**: só partidas, tabela, estatísticas e o próprio histórico.
- **Validação nova**: todo clube de uma competição secundária precisa estar na principal
  (`competition.club_outside_main`). Assim todo clube que joga tem finanças, diretoria e torcida.
  A regra `division.club_in_multiple` passa a valer **dentro** de uma competição. Entre
  competições, repetir clube passa a ser permitido.
- **Rationale**: a 017 é de um país só, e vários países ficam no M8. Ter uma competição dona da
  economia deixa intactos os sistemas da 008–014 e garante o comportamento igual com o banco
  padrão.
- **Alternatives considered**: regras de economia por competição (sem sentido sem prêmios de
  copa, que são da 018); clubes fora da principal com finanças próprias (aumenta escopo sem
  pedido).

## R3 — Montagem do calendário e validação de datas

- **Decision**: função pura `buildSeasonCalendar(competitions, start)`. Ela calcula as datas de
  cada rodada (R1) e agrupa os pares (competição, rodada) por data em `SeasonCalendar.days`,
  ordenado por data. Dentro de um dia, os slots seguem a ordem de `competitions.json`. A
  validação, feita ao carregar o banco (novo jogo e importação), usa a mesma função com o número de
  rodadas de cada competição (`turns × (n − 1)`, ou `turns × n` com n ímpar, igual a
  `generateCalendar`) e detecta:
  - `calendar.club_double_booked { competitionId, otherCompetitionId, clubId, date }`: duas
    competições cujos conjuntos de clubes (todas as divisões) se cruzam têm uma data em comum.
    A verificação é conservadora e ignora folgas, porque o par de cada rodada depende da seed, e a
    validação não pode depender dela.
  - `calendar.competition_overflow { competitionId, needed, available }`: a última rodada passa
    do fim da temporada.
  - Os erros estruturais de `schedule` (dia fora de 1–7, semana fora de 0–51, intervalo fora de
    1–4) vêm do schema Zod, com arquivo e campo.
- **Rationale**: como o acesso e o rebaixamento acontecem dentro de cada competição, o conjunto de
  clubes de cada uma não muda entre temporadas. A checagem feita no carregamento vale para a
  carreira inteira. Recusar em vez de remarcar mantém o calendário previsível para quem faz mods
  (decisão da spec).
- **Alternatives considered**: remarcar automaticamente para o próximo dia livre (resultado difícil
  de prever e de validar); validar por temporada no momento da virada (o erro apareceria no meio
  da carreira).

## R4 — Temporadas por competição e o dia de jogos

- **Decision**: cada competição continua sendo uma `LeagueSeason` (uma `Season` por divisão), sem
  mudar o módulo `season/`. A principal fica em `save.league`, com o mesmo significado de hoje. As
  secundárias ficam em `save.competitions` (vazio no banco padrão). A seed da principal é a de hoje.
  A de cada secundária é `${seed}:${competitionId}`, e com isso os confrontos e partidas da principal
  saem idênticos (FR-005, SC-004).
- **Dia de jogos**: o avanço deixa de ser por rodada e passa a ser por dia do calendário
  (`SeasonCalendar.next`):
  - `startCareerDay(state, lineups?)` prepara a `LiveRound` da competição em que o clube do jogador
    joga naquele dia (via `startLeagueRound` da competição), se houver.
  - `completeCareerDay(state, live?)` fecha, na ordem dos slots, a rodada de cada competição do dia.
    A do jogador vem do ao vivo, e as outras são simuladas direto pelo mesmo caminho
    (`startLeagueRound` → `finishRound`). Depois aplica as consequências do dia (R7–R10).
  - `advanceCareerToNextMatch(state)` simula direto os dias sem jogo do clube do jogador e para no
    dia do próximo jogo dele (FR-011). Quando o clube não tem mais jogos, simula até o fim (FR-013).
  - `advanceCareerDays(state, step)` substitui `advanceCareer` nas simulações, com
    `{ days } | { toEnd }`.
- **Rationale**: reaproveita todo o caminho atual (`startLeagueRound`/`completeLeagueRound`,
  `LiveRound`, decisões ao vivo). Ao vivo e direto continuam iguais porque usam a mesma função de
  fechamento do dia (Princípio II). Com o banco padrão, cada dia tem exatamente um slot (a rodada da
  principal), e o dia equivale à rodada de hoje.
- **Alternatives considered**: uma `LiveRound` única com partidas de várias competições (a rodada ao
  vivo mostra uma competição por vez, decisão da spec); reescrever `Season` em torno de datas (toca
  o M1 inteiro sem ganho).

## R5 — Condição física

- **Decision**: estado `FitnessState { players: Record<playerId, { value: 0..100; date: ISO }> }`,
  com o valor logo após o último jogo e a data desse jogo. A ausência do jogador significa 100. A
  condição em um dia `d` é `min(100, value + (d − date) × recoveryPerDay)`, calculada sob demanda.
  Ao fim de cada jogo, quem atuou passa a ter
  `value = max(0, condição(d) − round(minutos × drainPer90 / 90))`. Quem volta a 100 sai do mapa
  na próxima atualização. Na virada, o mapa é zerado (FR-022).
- **Padrões** (`DEFAULT_FITNESS`): `drainPer90 = 30`, `recoveryPerDay = 5`,
  `penaltyBpPerPoint = 40`. Assim, 7 dias recuperam 35 (cheio depois de 90 min) e 3 dias recuperam
  15 (85%, ainda abaixo), como pede FR-017. Os valores são dados opcionais em
  `competition.fitness` da principal.
- **Efeito no jogo**: na preparação de cada partida (`prepareFixture`), o elenco passa por
  `squadWithFitness(squad, fitness, date, rules)`, que devolve cópias dos jogadores com
  `strength = round(strength × (10000 − (100 − c) × penaltyBpPerPoint) / 10000)`. Com 85%, o
  rendimento cai 6%. Com 70%, cai 12%. Com 0%, cai 40%. O motor de partida, a força de time e
  `autoLineup` não mudam. A IA, que escala por `autoLineup` sobre esse elenco ajustado, passa a
  preferir reservas descansados quando o titular cansado rende menos (FR-021), com as mesmas
  regras do jogador. O botão "escalar automático" do jogador usa o mesmo elenco ajustado.
- **Rationale**: com todos em 100, o elenco ajustado é o mesmo objeto e os resultados são
  idênticos (SC-004). Ajustar a força na entrada da partida mantém o ao vivo e o direto iguais e não
  toca no motor minuto a minuto. O cálculo sob demanda evita processar todos os jogadores do mundo
  a cada dia.
- **Alternatives considered**: cansaço dentro da partida (muda placares do banco padrão); condição
  guardada em `PlayerStatus` (que é por competição, e a condição é do jogador); efeito no risco de
  lesão (fora, por decisão da spec).

## R6 — Disciplina por competição e lesões globais

- **Decision**: cartões e suspensões já vivem no `status` de cada `Season`, que é por competição, e
  por isso já ficam separados sem código novo (FR-023). As regras vêm de `competition.discipline`
  (`{ yellowsForSuspension, matchesPerRed }`, opcional), com `DEFAULT_DISCIPLINE_RULES` como padrão
  (FR-024).
- **Lesões**: a autoridade é o `status` da principal, porque todo clube está nela (R2). Antes de
  preparar a rodada de uma secundária, o dia copia o campo `injury` de cada jogador dos clubes que
  jogam, da principal para a secundária. Depois de fechar a rodada, copia de volta, incluindo as
  lesões novas e o desconto da partida cumprida. Um clube joga no máximo uma vez por dia (R3), e por
  isso a cópia é consistente (FR-025).
- **Escalação**: `clubUnavailability` recebe a `Season` da competição do próximo jogo do clube. A
  lesão vem dela (já sincronizada) e a suspensão é dessa competição. A tela mostra as suspensões em
  outras competições como informação, sem bloquear (FR-026).
- **Rationale**: nenhum estado novo de disponibilidade, nenhuma mudança no `season/`, e o banco
  padrão fica igual (só a principal existe).
- **Alternatives considered**: mapa global de lesões fora das `Season` (duplica a fonte da verdade
  e exige mudar o módulo da temporada e seus testes).

## R7 — Finanças por dia

- **Decision**: `applyDayFinances` substitui `applyRoundFinances`:
  - bilheteria para **todo** jogo em casa do dia, de qualquer competição, com o mesmo `gateFor`
    (público, humor e preço), usando a liga principal como contexto de reputação e fase (FR-027);
  - folha, juros, obras, crise e revisão da IA **só nos dias com rodada da principal**, com a mesma
    parcela `wageInstalment(annual, round, total)`.
  - As entradas do livro-caixa ganham `date` e, nas bilheterias, `competitionId`.
- **Rationale**: a liga principal é o relógio da economia. Os totais anuais com o banco padrão
  ficam idênticos (FR-028, SC-004), e as secundárias só somam renda de jogos em casa, sem custo
  extra. Isso gera um caixa um pouco maior para quem joga mais, o que é coerente com o futebol e
  verificado em R15.
- **Alternatives considered**: folha mensal por datas civis (muda os totais do banco padrão e os
  testes da 008 sem pedido do jogador).

## R8 — Mercado e janelas

- **Decision**: as janelas continuam definidas em rodadas jogadas da **principal**, tanto as do mod
  quanto as padrão, e o mercado da IA e as expirações continuam rodando nos dias com rodada da
  principal. O calendário dá a data de cada rodada (`dateOfRound(calendar, competitionId, round)`):
  a UI do mercado mostra "aberta até {data}" e "abre em {data}" (FR-031), e um mod com janelas em
  rodadas continua válido (FR-032).
- **Rationale**: as janelas já ficam presas a datas por meio das rodadas. Mudar o eixo interno não
  traria efeito visível e exigiria migrar o estado de negociações.
- **Alternatives considered**: janelas em datas civis no formato do mod (útil só com várias ligas
  em ritmos diferentes, no M8).

## R9 — Evolução do meio da temporada

- **Decision**: continua no dia da rodada `midSeasonRound(principal)`. `minutesInRounds` passa a
  somar os minutos de todas as competições do período e a normalizar pelo total de minutos
  possíveis dos jogos do clube no período, e não só pelas rodadas da principal.
- **Rationale**: a minutagem em copas também deve contar ("minutagem acelera o crescimento").
  Com só a principal, os números são os mesmos.

## R10 — Torcida, diretoria e manchetes por dia

- **Decision**: `fansAfterRound`, `boardAfterRound` e `newsAfterRound` passam a receber os jogos
  do dia (`DayMatch[] = { competitionId, divisionLevel, record }`) em vez de buscar
  `league.divisions[].records` por número de rodada. Expectativa, metas e classificação continuam
  lidas da principal. Os gatilhos "a partir da rodada N" (`checkFromRound`) usam as rodadas já
  jogadas da principal. Os templates de manchete ganham a variável `competition` (nome vindo do
  banco) para resultados de secundárias.
- **Rationale**: o mesmo resultado vale o mesmo para torcida, diretoria e manchetes, em qualquer
  competição (FR-029). Com o banco padrão, os jogos do dia são exatamente os da rodada.

## R11 — Virada de temporada

- **Decision**: a etapa `generate-calendars` gera a nova `LeagueSeason` de cada competição. A
  principal segue o caminho atual. Cada secundária aplica o próprio acesso e rebaixamento entre as
  suas divisões, com a mesma função de composição. A etapa também monta o `SeasonCalendar` novo e
  zera a condição física. O histórico das secundárias entra em `competitionHistory`. O `history` da
  principal não muda de formato nem de significado (FR-034).
- **Rationale**: o histórico, os recordes e as lendas existentes (014) não precisam saber de
  outras competições na 017. Os consumidores atuais não mudam.

## R12 — Save v12 e migração v11 → v12

- **Decision**: `SAVE_FORMAT_VERSION = 12`. O save ganha `calendar: SeasonCalendar`,
  `competitions: LeagueSeason[]`, `fitness: FitnessState` e `competitionHistory:
  SeasonHistoryEntry[]`. A migração:
  - mantém `league` e `history`;
  - monta `calendar` com a agenda padrão sobre as rodadas existentes da principal, com `next` igual
    ao dia da rodada `leagueRound(league)`;
  - deixa `competitions = []`, `fitness = { players: {} }` e `competitionHistory = []`.
  
  Amarelos e suspensões já estão na principal (FR-041). Se o banco salvo tiver outras competições,
  o que antes era ignorado, elas entram na carreira a partir da próxima virada, e não no meio da
  temporada. A migração vale para o import (`file.ts` já passa pela cadeia). Haverá fixtures v11 no
  início, no meio e no fim da temporada, e uma com várias temporadas (FR-042).
- **Rationale**: o eixo novo é derivado das rodadas existentes, e nada do progresso muda. Encaixar
  uma competição nova no meio da temporada exigiria inventar resultados passados.

## R13 — Interface

- **Decision**:
  - **Início**: o cartão "Próximo jogo" mostra data, dia da semana, competição, adversário e mando.
    O botão "Avançar" vira "Avançar para {data}" e simula os dias intermediários antes de oferecer
    ao vivo ou direto.
  - **Calendário** (`/jogo/calendario`): passa de lista de rodadas para lista por data dos jogos do
    clube (data, competição, adversário, mando, placar), com o próximo destacado e filtro por
    competição só quando o clube disputa mais de uma.
  - **Competição** (`/jogo/competicao/*`): ganha um seletor de competição por abas (parâmetro `comp`
    na URL, ao lado do `d` de divisão; `c` já é a carreira), que só aparece com mais de uma competição. Vem selecionada
    a do próximo jogo.
  - **Rodada ao vivo**: o título mostra a competição e a data.
  - **Escalação**: ganha a coluna "Condição física" (barra + %), um aviso para titular abaixo de
    75% e suspensões com o nome da competição. O componente existente `Condition`
    (disponível/lesionado/suspenso) mantém o nome. O novo é `FitnessMeter`, para não confundir.
  - **Mercado**: datas da janela.
  - Datas formatadas na camada de apresentação com `Intl.DateTimeFormat` do idioma ativo, a
    partir da data ISO do motor (Princípio VII). Dias da semana e rótulos vão para `ui.json`, e os
    erros novos para `errors.json`.
- **Rationale**: as telas atuais continuam iguais com uma competição (FR-037). Rotas e
  componentes existentes são reaproveitados.

## R14 — Banco de teste de duas competições

- **Decision**: fixture do motor `test/fixtures/two-competitions.ts`, derivada do banco padrão:
  - a principal fica como está (Série A e B, domingo);
  - a secundária, "Torneio de Teste", tem uma divisão com 10 clubes (6 da Série A e 4 da Série B),
    ida e volta (18 rodadas), toda quarta a cada 2 semanas a partir da semana 1, e cabe em 36
    semanas.
  
  Variantes inválidas da mesma fixture servirão aos testes de recusa: mesmo dia da semana; 40
  rodadas com `everyWeeks: 2`; clube fora da principal. Para o e2e, o mesmo banco é exportado como
  mod de teste (`apps/web/e2e/fixtures/`) e importado pelo fluxo de mods da 015.
- **Rationale**: atende o critério de aceite 1 sem mudar o mundo padrão (a copa nacional vem na
  018).

## R15 — Balanceamento e desempenho

- **Decision**:
  - os testes de 30 temporadas existentes (`renewal/long-run-*`, `board/long-run`,
    `fans/long-run`) passam a usar `advanceCareerDays` e continuam com os mesmos limites;
  - um teste novo, `calendar/long-run.test.ts`, roda 10 temporadas com o banco de duas competições,
    sem nenhum clube com dois jogos no mesmo dia, com placares médios e a economia dentro dos
    limites da 008 e condição média dos titulares da IA acima de 60%;
  - um teste de equivalência compara, com o banco padrão e a mesma seed, uma temporada no caminho
    novo com fixtures gravadas da versão atual (confrontos, placares e total anual por clube)
    (SC-004).
- **Resultado medido** (`calendar/long-run.test.ts`, 2 seeds × 10 temporadas, banco de duas
  competições, todos os sistemas): 850 jogos por temporada (760 da liga e 90 do torneio); gols por
  jogo entre 2,45 e 2,72 (limite 2,2–3,0); condição média de quem joga, medida antes do jogo, entre
  93,5 e 95,4 (limite ≥ 85 e < 100); nenhum clube em crise; nenhum clube com dois jogos no mesmo dia.
- **Performance Goals**: montar o calendário em menos de 5 ms; avanço até o próximo jogo em menos
  de 300 ms com o banco de teste; cada simulação de 30 temporadas continua abaixo de 120 s.
