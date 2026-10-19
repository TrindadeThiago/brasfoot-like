# Research: Múltiplas divisões e virada de temporada

Decisões de design da feature 007. Cada item: decisão, razão e alternativas consideradas. O ponto
de partida é o código da 006: `Season` representa **uma** divisão (`clubIds`, `calendar`,
`records`, `status`, `nextRound`), a rodada ao vivo (`LiveRound`) é montada a partir de uma
`Season`, o save v2 guarda uma única `season` e a idade dos jogadores é calculada com
`ageOn(birthDate, bank.manifest.referenceDate)`.

## R1. Unidade de estado: `LeagueSeason` com uma `Season` por divisão

**Decisão**: novo tipo do motor `LeagueSeason` = temporada da competição do país inteira:
`{ competitionId, number, year, seed, divisions: Season[] }`, com `divisions` ordenado por nível.
`Season` continua sendo a temporada de uma divisão e não muda de forma (só ganha a opção
`clubIds` na criação, R4). Classificação, artilharia, disciplina e resultados continuam
calculados por `Season`, sem mudança.

**Razão**: reaproveita 100% das regras de temporada já testadas (calendário, desempates,
disciplina, lesões, registros) e mantém as divisões independentes (nenhum dado cruzado entre
elas durante a temporada). A única coordenação nova é "todas as divisões jogam a mesma rodada".

**Alternativas**: (a) uma `Season` com várias divisões dentro — exigiria reescrever standings,
stats e disciplina para filtrar por divisão; (b) temporadas independentes soltas no save sem tipo
agregador — espalharia a regra de sincronização de rodadas pela UI (viola o Princípio I).

## R2. Rodada da liga: uma única `LiveRound` com as partidas de todas as divisões

**Decisão**: `startLeagueRound(league, world, lineups)` monta **uma** `LiveRound` cujas
`matches` são as partidas da rodada de todas as divisões; cada `LiveMatch` ganha
`divisionLevel`. `advanceRound`, `applyRoundChange`, `finishRound` e `isRoundFinished` não mudam.
`completeLeagueRound(league, world, round)` separa as partidas por divisão e chama o
`completeRound` existente em cada `Season`. A UI da rodada ao vivo mostra só as partidas da
divisão do clube do jogador (filtro de apresentação); as demais avançam junto, invisíveis.
`advanceLeague(league, world, step, lineups)` (equivalente de `advanceSeason`) usa o mesmo
caminho: `startLeagueRound` → `finishRound` → `completeLeagueRound`.

**Razão**: equivalência ao vivo × direto continua garantida **por construção** (FR-004), como na
006; as decisões do jogador só afetam a partida do seu clube; nada de simulação "extra" no
fechamento. Custo: o tick passa de 10 para 20 partidas — o motor já faz 10 partidas em bem menos
de 5 ms por tick, e a temporada inteira de uma divisão em < 2 s (teste de desempenho atual).

**Alternativas**: (a) só a divisão do jogador na `LiveRound` e simular as outras em
`completeLeagueRound` — também determinístico, mas concentra o custo no fim da rodada e cria dois
caminhos de simulação; (b) uma `LiveRound` por divisão — a UI teria que coordenar várias rodadas.

## R3. Seeds por temporada, compatíveis com saves e testes existentes

**Decisão**: a seed da temporada número `n` é `careerSeed` para `n = 1` e `` `${careerSeed}:s${n}` ``
para `n ≥ 2`. Todas as divisões da mesma temporada usam a mesma seed (as seeds de partida já
incluem os clubes — `fixtureSeed(seed, round, home, away)` — e as chaves de sorteio de desempate
incluem o clube, então divisões diferentes nunca colidem). Etapas da virada usam
`createRng(`${careerSeed}:turnover:${n}:${stepId}`)`.

**Razão**: mantém idêntica a Série A de uma carreira nova (e de todo save v2 migrado), o que
preserva os testes de determinismo e credibilidade e os fixtures; a temporada seguinte tem
calendário e partidas diferentes (FR-012) e reproduzíveis (FR-013). RNG por etapa evita que
registrar uma etapa nova altere o sorteio das outras.

**Alternativas**: seed derivada do ano (`:2028`) — equivalente, mas `number` é mais robusto se um
mod mudar a data de referência; um único PRNG compartilhado pela virada — acoplaria etapas entre
si.

## R4. Composição das divisões

**Decisão**: a composição inicial vem do banco (`competition.divisions[].clubIds`); a partir daí
a composição de cada temporada é o `clubIds` de cada `Season` da `LeagueSeason`. `createSeason`
ganha a opção `clubIds?: string[]` (padrão: os do banco). O banco do save **não** é alterado na
virada. Nova composição (FR-007 a FR-009), genérica para N níveis: para cada par de níveis
adjacentes (L, L+1), os `relegationSlots` últimos da classificação final de L descem e os
`promotionSlots` primeiros de L+1 sobem (a validação do banco já garante que os números batem
e cabem). Os `clubIds` resultantes são ordenados por id antes de gerar o calendário.

**Razão**: o banco continua sendo a "fotografia inicial do mod" (Princípio VI: o save tem a
própria cópia do banco); nada de números fixos (Princípio III); o calendário já embaralha a
ordem pela seed, então ordenar por id só remove dependência de ordem de inserção (Princípio II).

**Alternativas**: reescrever `bank.competitions[].divisions[].clubIds` a cada virada — misturaria
estado da carreira com dados do mod e tornaria o "banco" do save diferente do mod de origem.

## R5. Virada como pipeline de etapas ordenadas (pontos de extensão)

**Decisão**: `TurnoverStep = { id: string; run(ctx: TurnoverContext): TurnoverContext }`.
Etapas padrão, nesta ordem: `record-history` → `promotion-relegation` → `advance-year` →
`reset-season-stats` → `generate-calendars`. Etapas extras são registradas com
`{ step, before?: id, after?: id }` (exatamente um dos dois) e a ordem final é resolvida por
`resolveTurnoverSteps(extras)`: cada extra fica imediatamente antes/depois da âncora; várias
extras na mesma posição são ordenadas por `id` (nunca pela ordem do array de registro); âncora
desconhecida ou id duplicado é erro. `seasonTurnover(league, world, history, options)` executa
o pipeline e devolve `{ league, history }` novos, sem alterar a entrada.

O contexto carrega: `world`, `finished` (a `LeagueSeason` encerrada, somente leitura),
`finalStandings` por nível, `history` (acumulado), o rascunho da próxima temporada
(`next: { number, year, seed, composition, carryOver }`) e `rng(stepId)`. A etapa
`generate-calendars` cria as `Season` a partir do rascunho — sistemas futuros que mudam elencos
(mercado, jovens) rodam antes dela; os que leem o resultado (diretoria) rodam depois de
`record-history`.

**Razão**: atende FR-017 a FR-019 sem framework genérico de plugins: é uma lista ordenada e
funções puras. O desempate por `id` cumpre o requisito de ordem estável e independente do
registro.

**Alternativas**: prioridades numéricas (ex.: 100, 200…) — frágeis e sem semântica; eventos
(pub/sub) — ordem implícita, difícil de testar; deixar a virada monolítica e editá-la a cada
feature — o que o prompt pede para evitar.

## R6. Avançar idades: ano da temporada no estado, data derivada

**Decisão**: `LeagueSeason.year` é o ano da temporada (inicial: ano de
`manifest.referenceDate`). Nova função do motor `seasonDate(referenceDate, year)` devolve a data
de referência com o ano trocado (29/02 vira 28/02 em ano não bissexto). Toda idade exibida usa
`ageOn(birthDate, seasonDate(referenceDate, league.year))`. A etapa `advance-year` só faz
`year + 1` e `number + 1`.

**Razão**: idade é derivada (não há campo de idade para incrementar); um ano no estado basta e é
serializável. O mesmo dia e mês todo ano casa com a Assumption da spec.

**Alternativas**: guardar uma data atual completa — desnecessário enquanto o calendário de
partidas não tem datas reais; alterar `birthDate` dos jogadores — destrói o dado do mod.

## R7. O que zera e o que continua na virada

**Decisão**: nova `Season` começa com `records: []`, `warnings: []`, `nextRound: 1` e `status`
contendo **só** os jogadores com lesão restante, com `{ yellows: 0, suspension: 0, injury }`
(Assumption da spec). As formações preferidas dos clubes são recalculadas; o esquema do clube do
jogador é o da escalação dele (camada de save, como hoje em `commitLineup`).

**Razão**: estatística é da temporada (classificação/artilharia saem dos `records`); lesão é
condição do jogador. Suspensão pendente zerada evita "dívidas" entre temporadas.

**Alternativas**: carregar suspensões — regra comum em ligas reais, mas a spec escolheu zerar;
pode virar opção de regra da competição no futuro.

## R8. Histórico compacto

**Decisão**: `SeasonHistoryEntry = { number, year, competitionId, divisions: [{ level, championId,
standings: HistoryRow[], promoted: string[], relegated: string[] }] }`, com `HistoryRow` =
`position, clubId, points, played, wins, draws, losses, goalsFor, goalsAgainst`. Nomes de divisão
e clube vêm do banco na exibição. A posição/divisão do clube do jogador é derivada da entrada (o
jogador não troca de clube nesta feature).

**Razão**: ~40 linhas pequenas por temporada (≈ 3 KB em JSON) — 50 temporadas ≈ 150 KB, sem
impacto no save. `promoted/relegated` gravados evitam recalcular com regras que um mod pode mudar.

**Alternativas**: guardar os `records` das temporadas passadas — vários MB por temporada,
fora do escopo (spec).

## R9. Save v3 e migração v2 → v3

**Decisão**: `SaveFile` troca `season: Season` por `league: LeagueSeason` e ganha
`history: SeasonHistoryEntry[]`. Migração v2 → v3: `league = { competitionId: season.competitionId,
number: 1, year: ano de referenceDate, seed: save.seed, divisions: [season v2, + uma Season para
cada outra divisão do banco] }`; as divisões novas são criadas com a mesma seed e **avançadas até
a mesma rodada** da Série A com `advanceSeason` (determinístico). Um save v2 encerrado vira uma
`LeagueSeason` encerrada, pronta para a virada. `history: []`. Fixture de save v2 (meio da
temporada e encerrado) com teste. A verificação "temporada coerente" passa a ser: alguma divisão
contém o clube e todas as `Season` têm a seed da temporada (R3).

**Razão**: Princípio VI; a carreira em andamento ganha a Série B sem perder nada.

**Alternativas**: manter `season` como "divisão do jogador" e adicionar `otherDivisions` —
quebra assim que o clube muda de divisão.

## R10. Clube do jogador em qualquer divisão

**Decisão**: `createSave` aceita qualquer clube de qualquer divisão da competição; o código de
erro `save.club_not_in_league` continua (compatibilidade) mas a mensagem passa a dizer "não
disputa a competição". O seletor `userSeason(save)` (pacote save) devolve a `Season` da divisão
que contém o clube; telas que hoje usam `save.season` passam a usar o seletor.

## R11. UI

**Decisão**: (a) **Nova carreira**: os 40 clubes agrupados por divisão (filtro por divisão,
padrão Série A); (b) **Rodada ao vivo**: `LiveGrid`/feed filtram `matches` pela divisão do
jogador; (c) **Competição** (classificação, resultados, artilharia): seletor de divisão (abas
"Série A | Série B", nome do mod), padrão a divisão do jogador, zonas de acesso/rebaixamento na
classificação; (d) **Fim de temporada** (`/jogo/fim-de-temporada`) vira o resumo: campeões,
sobem/descem, posição do clube com destaque e botão "Próxima temporada"; (e) **Histórico**
(`/jogo/historico`, nova rota estática): lista por temporada e detalhe com as classificações
finais; (f) cabeçalho, elenco e detalhes do jogador usam o ano/data da temporada (R6).
`GameProvider.advanceToNextSeason()` chama a virada, ajusta a escalação e salva uma vez
(atômico: um único `persist`).

**Razão**: reaproveita `CompetitionTabs`, `StandingsTable`, `RoundResults` e a tela de fim de
temporada da 006; nenhuma regra de jogo na UI (zonas vêm de uma função do motor).

## R12. Verificação de longa duração

**Decisão**: teste do motor `career/multi-season.test.ts`: 10 temporadas sem interação a partir
do banco de teste; a cada virada verifica 20 clubes por divisão, partição exata dos 40 clubes,
os 4+4 que trocam (comparando com as classificações finais) e que todo rebaixado em N está na
divisão inferior em N+1 (SC-001, SC-002). Variante com JSON ida-e-volta entre temporadas e
comparação de históricos de duas execuções (SC-003). Ferramenta `sim:season` ganha
`--career N` (temporadas seguidas; `--seasons` já existe e agrega seeds independentes) para inspeção manual. Teste de desempenho: rodada da liga (20 partidas) em modo
direto < 1 s na app (SC-006) e virada < 2 s (SC-005).

**Razão**: Princípios V e IX; os critérios de aceite do prompt viram testes automatizados.
