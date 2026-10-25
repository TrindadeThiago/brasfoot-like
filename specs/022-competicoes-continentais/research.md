# Research: Competições continentais

Decisões técnicas da 022. Os números são pontos de partida (`CONTINENTAL_TUNING`, faixas do teste
longo), ajustados pela tarefa de linha de base (R9) e declarados nos testes.

## R1 — Competição entre países: `countryId` opcional

- **Decision**: `competition.countryId` passa a ser opcional. Ausente = competição entre países
  (continental). Ela vive em `CareerSeasonState.competitions` (as secundárias de qualquer país, 020
  R2), nunca é a principal de um país (`mainCompetitions` só considera as que têm `countryId`) e
  seus clubes têm de pertencer à principal de algum país. Validação nova `continental.*`: ao menos
  dois países entre os clubes; cada clube existe e está em alguma liga principal; `format` é
  `stages` ou `knockout`/`groups`.
- **Regras econômicas**: bilheteria, salários, mercado e torcida já são lidos pelo país do clube
  (020 R1, `rulesCompetitionOf`). Num jogo continental a bilheteria usa o país do **mandante**; em
  campo neutro, a capacidade da fase (`neutralCapacity`, 018). Auditoria na tarefa T001 dos pontos
  que ainda leem `competition.countryId` ou `world.competitions[0]` como "fonte das regras".
- **Rationale**: o motor já trata competição como lista de clubes + formato + agenda; o país era
  só o dono das regras. Tirar o dono (e usar o clube) é a menor mudança que representa o conceito.
- **Alternatives considered**: entidade `continent` com lista de países (conceito novo sem uso
  além da validação); `scope: "continental"` mantendo `countryId` (campo mentiroso); um país
  "continente" fictício (rompe `foreignLimit` e a escolha de clube por país).

## R2 — Estrutura da competição por composição de recursos existentes

- **Decision**: uma divisão única com `format.type = "stages"`: fase 1 mata-mata preliminar, fase 2
  grupos, fase 3 mata-mata final (ou qualquer sequência da 019). A menor idem, com menos
  fases. Os clubes que entram direto na fase de grupos têm `berths` com `entry.stage = 2`; o
  sorteio usa `draw.rules = [{ kind: "separate", attribute: "country" }]`, potes por reputação e
  `previousStagePot` (019). **Vagas por país** são `berths` com fonte `position` (liga do país),
  `champion` (copa nacional) e `champion` da própria competição (campeão anterior); o repasse é o
  `fallback` da 021.
- **Rationale**: é exatamente o que a 021 construiu para essa feature ("entrega o mecanismo que
  elas vão usar"). Zero formato novo para vaga, fase, grupo ou sorteio.
- **Risco verificado**: vaga com fonte na própria competição (campeão anterior). A resolução da 021
  lê só temporadas encerradas, então não há ciclo; a ordem topológica considera só `require`/`forbid`.
  Teste novo cobre o campeão anterior de uma competição de primeira edição (sem fonte: a vaga é
  repassada pelo `fallback`).
- **Alternatives considered**: tipo `continental` próprio (duplica 018/019/021); vagas como cota
  por país declarada na competição (segunda forma de dizer o que `berths` já diz).

## R3 — Ligação entre a maior e a menor: `division.dropIns`

- **Decision**: a divisão de **destino** declara `dropIns: DropIn[]`. Cada `DropIn` tem `id`,
  `source` (`{ competitionId, stage, kind: "position", from, to }` para fases de pontos — posições
  na classificação do grupo ou da tabela — ou `{ kind: "eliminated", phase }` para os perdedores de
  uma fase eliminatória) e `entry: { stage, phase? }` na divisão de destino. O destino declara
  também, por `stage`, o número de clubes que chegam por ligação; a validação confere a contagem
  (`grupos × posições` ou `confrontos da fase`).
- **Mecânica** (única novidade de estado): `StageState.incoming?: { dropInId, clubIds }[]`. Ao
  fechar a rodada que termina a fase de origem, a ponte do dia (`career/day.ts`, depois de
  `advanceStages`) chama `sealDropIns(state)`: para cada `DropIn` cuja fase de origem terminou e
  cuja fase de destino ainda não começou, grava `incoming` (ordem por id) na `Season` de destino.
  `advanceStages` só começa a fase de destino quando a anterior terminou **e** todos os `dropIns`
  dela estão selados; os participantes são `qualificados + enter + incoming`. Idempotente.
- **Sem jogos no passado**: a validação (calendário) exige que a primeira rodada da fase de destino
  caia **depois** da última rodada da fase de origem (`continental.dropin_before_source`). Se, por
  data, o destino já começou (dado inválido num save), os `dropIns` são descartados e a fase segue
  sem eles (FR-009), com um aviso no estado.
- **Repasse e unicidade** (FR-008): se o clube já está na menor (vaga direta), a ligação o
  ignora e o próximo da fonte é usado (`position` mais baixa a seguir, desempate por id), até
  preencher a contagem; sem candidato suficiente é erro de dado explícito
  (`continental.dropin_exhausted`), nunca um participante a menos.
- **Rationale**: o dado de ligação fica no destino (como as vagas da 021, que tornam a contagem
  verificável), e a máquina de fases ganha uma única condição de espera. Nada é refeito no calendário:
  as rodadas já existem desde a criação da temporada.
- **Alternatives considered**: ligação declarada na origem ("os 3º vão para…", o destino precisa ser
  conferido do outro lado); transferir clubes entre `Season`s movendo estado (mexe em registros e
  classificações); reabrir a composição da temporada (a 021 resolve só no fim da temporada).

## R4 — Prêmios e bilheteria: `competition.awards`

- **Decision**: bloco opcional na competição: `win`, `draw`, `stage` (valor por fase de pontos ou
  eliminatória **alcançada**, pago uma vez quando a fase começa para o clube) e `title`. As fases
  eliminatórias continuam com o `prize` por confronto vencido da 018 (`cupPrizes`); `awards` cobre
  o que a 018 não cobre (grupos, participação, título). Novo `competitionAwards(world, season,
  matches, startedStages)` devolve o mesmo formato de prêmio que `postPrizes` já posta, com a
  origem no extrato (`category: "prize"`, `competitionId`).
- **Bilheteria**: `gateFor` já recebe a competição e o preço do mandante; passa a obter as regras do
  país do mandante também quando a competição não tem país (R1). Renda dos jogos continentais é
  creditada ao mandante (neutro: dividida, como na copa).
- **Economia (SC-003)**: os valores são calibrados na linha de base para que o total de prêmios
  por clube assíduo fique abaixo de uma fração declarada da receita anual (`awardsShareMax`, ponto
  de partida 15%) e o caixa não escape das faixas da 008. O reajuste das faixas só vale se
  justificado na mesma alteração (Princípio V).
- **Rationale**: o dado de prêmio fica junto da competição; o posting já existe e é reaproveitado.
- **Alternatives considered**: prêmio dentro de cada `stage` (duplica o `prize` da fase eliminatória);
  tabela de prêmio por país (o prêmio é da competição, não do país).

## R5 — Reputação do clube

- **Decision**: etapa de virada `continental-reputation` (depois da composição, antes da
  renovação que lê o mundo): para cada clube participante, `reputationBonus = awards.reputation[
  fase mais alta alcançada ]` (tabela em dados), sempre limitado por `awards.reputationCeiling`
  (padrão 95) e por `clampReputation` (1 a 100). O bônus é maior para o campeão e zero para quem
  caiu na preliminar. O mundo vivo é substituído como nas etapas de renovação (009).
- **Rationale**: a reputação do clube é a base de patrocínio, valor de jogador e jovens; o teto
  impede inflação com campeões recorrentes (verificado na simulação longa: distribuição de
  reputação dentro de faixa).
- **Alternatives considered**: reputação por jogo ganho (volátil e difícil de calibrar); sem teto
  (campeões convergem a 100).
- **Verificação (T001)**: confirmar onde a reputação do clube já muda hoje (renovação 009) para
  somar o bônus sem duplicar a regra.

## R6 — Metas da diretoria

- **Decision**: `SeasonGoals.continental?: { competitionId, target: { stage, phase? } }`, definido
  no início da temporada para o clube que a disputa. O alvo vem da posição da reputação do clube
  entre os participantes: tercil superior = chegar à semifinal; médio = fase de grupos concluída;
  inferior = passar a preliminar (pontos de corte em `board.continental` nos dados, com padrão).
  A avaliação ao fim da temporada compara com a fase alcançada e entra na confiança da diretoria
  como um fator (`continentalMet`/`continentalMissed`) e na reputação do técnico por `achievements`
  (título continental vale como `title` de divisão mais alta).
- **Rationale**: a meta esportiva atual é por posição na liga; a continental é independente e
  concorrente (um clube pode cumprir uma e perder a outra). A 021 já abriu `qualify` por competição.
- **Alternatives considered**: transformar a meta de liga em meta composta (quebra a avaliação da
  012); sem meta continental (viola FR-018).

## R7 — Torcida

- **Decision**: `fans` ganha `continental?: { matchWeightPct, expectationBoost, titleMood }` (nos
  dados da competição principal do país, com padrão): o humor reage ao resultado dos jogos
  continentais com o mesmo peso de uma partida da liga multiplicado por `matchWeightPct`, e a
  expectativa do ano sobe quando o clube joga a competição (e quando foi campeão no ano anterior).
- **Rationale**: o motor da 013 já recebe os jogos do dia (017); o que muda é o peso e a
  expectativa. Padrão neutro (peso 100%, boost 0) mantém bancos sem a competição idênticos.

## R8 — Manchetes e histórico

- **Decision**: modelos de manchete `continental.qualified`, `.advanced`, `.eliminated`,
  `.champion`, `.thrashing` (id + variáveis; texto no i18n). O histórico ganha
  `ContinentalEdition { competitionId, number, year, championId, runnerUpId, final, reached }`,
  uma por edição encerrada de cada competição entre países, calculada a partir da `Season`
  (reusa `cupEntry` para a última fase eliminatória e `stageOf` para a fase alcançada).
  `CareerHistory.continentalHistory` guarda as edições; a carreira do técnico (012) ganha a
  melhor fase por temporada e os títulos continentais.
- **Alternatives considered**: reaproveitar `cupHistory` (a final de uma `stages` com grupos não é
  uma `Season` com `bracket` simples; misturaria dois formatos de entrada).

## R9 — Equilíbrio, escala e calibração

- **Decision**: `generateWorldBank` ganha a opção `continental` (10 países, a maior com 40 clubes e
  a menor com 24, cotas por país proporcionais à força média dos países, drop-ins dos terceiros dos
  grupos). `continental-long-run.test.ts` roda 30 temporadas sem interação e declara:
  1. **Força dos campeões**: média da força do campeão > média dos participantes em ≥ 90% das
     seeds de teste (conjunto de seeds declarado no teste); correlação positiva entre cotas do país e títulos.
  2. **Distribuição**: ≥ 5 campeões distintos em 30 temporadas, nenhum clube com > 40% dos títulos.
  3. **Caixa**: caixa dos assíduos dentro das faixas da 008; prêmios totais por temporada dentro
     de `[awardsMin, awardsMax]`.
  4. **Reputação**: nenhum clube acima do teto; a reputação média do mundo não se desloca mais que
     `reputationDriftMax` em 30 temporadas.
  5. **Tamanho do save** e **tempo da virada** dentro de `SCALE_LIMITS` (020).
  Os limites começam com margem generosa e são apertados após a linha de base (T baseline), com
  justificativa registrada no próprio teste.
- **Rationale**: Princípio V; SC-001 a SC-003 só aparecem em simulação longa.

## R10 — Interface

- **Decision**: a página da competição ganha a aba **Continental** quando o clube (ou qualquer
  clube em foco) participa de uma competição entre países; mostra, por fase, grupos (019),
  chaveamento (018/019) e a nova **Campanha** (jogos do clube, fase atual, prêmios recebidos e o que
  falta). A origem de cada participante (vaga por país, repasse, ligação) usa `Origin` da 021 mais
  `dropIn` (novo valor). Tudo lê estruturas prontas do motor (`clubCampaign`, `continentalView`).
- **Alternatives considered**: tela separada fora das competições (quebra a navegação de abas da
  017); campanha só no histórico (não responde "o que falta disputar").

## R11 — IA e desgaste

- **Decision**: os jogos continentais passam pelo mesmo `completeCareerDay`: competições do clube em
  foco usam a simulação completa, as demais a resumida (020 R3), ambas lendo `fitness` (017) e
  escalação automática com rodízio (`autoLineup`). Teste de contrato novo: um clube da IA que joga
  quarta e domingo escala reservas quando a condição cai abaixo do limiar, como o clube do jogador
  sob `autoLineup`.
- **Rationale**: FR-012 pede regras iguais; nada novo no motor de partida.

## R12 — Save v17 e compatibilidade

- **Decision**: `SAVE_FORMAT_VERSION` 16 → 17. Campos novos opcionais: `StageState.incoming`,
  `SeasonGoals.continental`, `CareerHistory.continentalHistory`, entradas da carreira do técnico
  (`continentalBest`, `continentalTitles`). Migração v16 → v17 só carimba a versão; fixtures v16
  (início, meio, fim de temporada) abrem e continuam jogando. Mods sem competição entre países e
  saves antigos têm comportamento idêntico.
