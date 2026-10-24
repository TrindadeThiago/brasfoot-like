# Research: Vários países e simulação em escala

Decisões técnicas da 020. Os números são pontos de partida (`SUMMARY_TUNING`, `SCALE_LIMITS`),
ajustados pelas medições da tarefa de linha de base (R12) e declarados nos testes.

## R1 — Regras do país = regras da competição principal do país

- **Decision**: não criar um bloco econômico novo no país. As "regras econômicas do país" (FR-002)
  são as já existentes em `competition.economy`, `market`, `board`, `fans`, `news`, `fitness`,
  lidas da **competição principal do país**: a primeira competição do arquivo com aquele
  `countryId`. O país ganha só `country.rules?: { foreignLimit?: inteiro(0, 25) }` (FR-002a).
  Escala de receitas, salários e público já existem como `fansBase`, `fanFactorPct`,
  `wageFactorPct`, `sponsorship`, `prizes` por divisão.
- **Rationale**: o motor lê tudo isso por `competitionId` (`economyRules(world, competitionId)`,
  `marketRules`, `boardRules`…). Trocar o argumento "competição principal do mundo" por "competição
  principal do país do clube" entrega regras por país sem formato novo, e mods antigos (um país)
  continuam idênticos. O salário já é `valor derivado × wageFactorPct` do clube (`finance/create.ts`),
  então "salário na escala do país de destino" (Q1) acontece sozinho quando o clube é consultado
  pelo seu país; o valor de mercado já depende só do jogador e da reputação do clube dono
  (`derived/economy.ts`), e a reputação é do clube (Q2).
- **Alternatives considered**: bloco `country.economy` novo (duas maneiras de dizer a mesma coisa,
  e o modder teria de repetir níveis de divisão); multiplicadores de escala sobre uma economia
  única (não cobre prêmios e patrocínio por divisão de cada país).
- **Consequence**: um helper único `rulesCompetitionOf(world, clubId)` (e `mainCompetitionOf(world,
  countryId)`) substitui os usos de `world.competitions[0]` (`market/squad.ts`, `market/value.ts`) e
  de `league.competitionId` como "fonte das regras" (auditoria na tarefa T001).

## R2 — Estado: `league`, `otherLeagues` e `competitions`

- **Decision**: `CareerSeasonState` mantém `league` como a **liga principal do país do técnico** e
  ganha `otherLeagues: LeagueSeason[]`: as ligas principais dos demais países, na ordem do banco.
  `competitions` continua sendo as secundárias (copas, regionais) de **qualquer** país. O papel de
  cada `LeagueSeason` é derivado do banco (`isCountryMain`) e não precisa de marca própria.
  `worldLeagues(state) = [league, ...otherLeagues]`.
- **Rationale**: a UI, o dia de jogos (`completeCareerDay`), a diretoria, a torcida e o histórico
  já leem `state.league`; manter `league` como "a do jogador" evita reescrever tudo. As demais ligas
  são mais uma lista que o dia de jogos percorre, exatamente como já faz com `competitions`.
- **Troca de país** (FR-010): `switchManagerCountry(state, clubId)` troca de lugar `league` e a
  entrada de `otherLeagues` do novo país. O calendário não muda (o dia é por data, FR-004). O
  conjunto de competições do jogador (R3) é recalculado a partir do clube novo.
- **Alternatives considered**: lista única `leagues` com índice do jogador (reescreve cada leitor
  de `state.league`, save e UI sem ganho); `otherLeagues` dentro de `competitions` (perde a
  distinção "liga com economia própria" × "competição secundária" que o dia de jogos usa).

## R3 — Simulação resumida: `summarizeMatch`

- **Decision**: novo módulo `match/summary.ts` com `summarizeMatch(input: MatchInput): MatchResult`
  (mesma assinatura de entrada e mesmo tipo de saída da partida completa, sem estado de partida):
  1. Forças por setor das duas escalações, com o mesmo `teamStrength` e a mesma adequação de
     posição, fadiga e mando da simulação completa (escalação automática dos clubes da IA).
  2. Gols: duas Poisson com média `λ = f(força do ataque, defesa rival, mando)`, em que `f` é a
     relação da simulação completa ajustada por regressão e guardada em `SUMMARY_TUNING`.
  3. Autores e assistências sorteados com os mesmos pesos do `picker` da partida; minutos dos
     eventos sorteados uniformemente.
  4. Cartões: amarelos e vermelhos por jogador com as taxas do `MATCH_TUNING`; dois amarelos viram
     vermelho.
  5. Lesões: por jogador com `injuryProneness`, na mesma taxa por minuto da completa.
  6. Sem substituições: titulares jogam 90 minutos (menos o vermelho); estatísticas (chutes,
     posse) estimadas pela força relativa.
  Toda aleatoriedade usa `createRng(fork do fixture.seed)`, sem relógio e sem estado de partida.
- **Quem usa qual** (FR-014/FR-015): uma competição é "do jogador" se o clube em foco (o do técnico,
  ou o último que treinou se desempregado) é participante dela em qualquer divisão ou fase; todos
  os jogos dela usam a completa. Os jogos das demais competições usam a resumida. A decisão é
  função pura de `(state, competição)`, então ao vivo = direto e salvar/carregar não mudam nada.
- **Equivalência** (FR-016): teste de 6 000 partidas por simulação em pares de forças variados,
  comparando média de gols, % de vitória da casa/empate/visitante, distância de variação total
  da distribuição de placares, amarelos e vermelhos por jogo e lesões por jogo, com faixas
  declaradas no teste (R12). Se a regressão ficar fora das faixas, `SUMMARY_TUNING` é recalibrado
  por `pnpm sim:matches --summary`.
- **Rationale**: a completa custa ~minuto a minuto; para jogos que ninguém assiste só importam os
  dados que os outros sistemas leem (R5). Poisson por força é o modelo mais simples que reproduz
  placar, e a calibração é verificada por teste, não por intuição (Princípio V).
- **Alternatives considered**: rodar a completa e descartar eventos (não reduz custo); resultado
  só com placar (quebra artilharia, suspensões, lesões e evolução); sorteio por tabela de
  probabilidades de placar (perde autores e cartões coerentes com as escalações).

## R4 — Registro compacto para o jogo resumido

- **Decision**: `MatchRecord` ganha `summary?: true` e, nele, `players` guarda só quem teve
  gol, assistência, cartão ou lesão; os titulares ficam em `starters: Record<Side, string[]>` e os
  minutos de quem não consta são derivados (90, ou até o vermelho). O acessor
  `playerLines(record)` devolve o `Record<string, PlayerLine>` completo para quem precisa (estatística,
  evolução, cartões), de modo que os leitores trocam `record.players` por `playerLines(record)`.
  `events` guarda só gols, cartões e lesões. `stats` é preenchido (estimado) para não tornar o campo
  opcional.
- **Rationale**: o maior custo do save é o registro de partidas da temporada em curso
  (hoje ~44 linhas de jogador por jogo, 4,5 MB de limite para 40 clubes). Com ~190 jogos por rodada
  em 10 países, guardar 4–6 linhas em vez de 44 corta o registro à metade do tamanho ou menos.
- **Alternatives considered**: não guardar registro de jogos alheios (quebra artilharia e
  suspensões, que leem o registro); comprimir só no arquivo exportado (não reduz IndexedDB nem a
  memória).

## R5 — O que os sistemas leem do jogo e o que a resumida precisa produzir

Conferido por leitura do código; a tarefa T002 repete a busca como teste de contrato
(`summary-contract.test.ts`): classificação e desempate (placar, mando), artilharia e assistências
(`season/stats.ts`), cartões e suspensões (`season/discipline.ts`), lesões (`career/injuries.ts`),
minutos e jogos disputados (evolução e jovens da 009, fadiga da 017), bilheteria e prêmios
(finanças da 008, só placar e mando), humor da torcida e diretoria (placar), manchetes (placar,
gols, vermelhos). Nada além disso lê eventos de partida de jogos alheios.

## R6 — Várias ligas principais no dia de jogos e na virada

- **Decision**:
  - **Dia de jogos** (`completeCareerDay`): para cada `slot` do dia, a temporada é buscada em
    `league`, `otherLeagues` ou `competitions`; a rodada é fechada pelo caminho completo (competição
    do jogador) ou resumido; se o `slot` é de uma liga principal (`isCountryMain`), as consequências
    da rodada (finanças, evolução, mercado da IA, torcida, diretoria, notícias — hoje chamadas em
    `applyRoundSystems` só para a principal) rodam **para os clubes daquela liga** com as regras do
    país dela. `applyRoundSystems` ganha o parâmetro da liga e é chamado uma vez por liga principal
    jogada no dia.
  - **Virada** (`seasonTurnover`): a composição por nível (acesso/rebaixamento) é calculada por
    país; as etapas de renovação, finanças, mercado, diretoria, torcida e notícias recebem as ligas
    de todos os países e iteram por país (regras por clube via R1). Histórico: cada país escreve
    suas entradas em `history`; as dos países alheios no formato resumido (R7).
  - **Janelas**: cada país abre e fecha a sua janela pelas rodadas da sua liga principal (como hoje
    para o país único). Uma transferência internacional exige as duas janelas abertas.
- **Rationale**: o número de rodadas e a data de cada dia já são dados por competição (017). Cada
  sistema de rodada é por clube e por liga; chamá-lo uma vez por liga principal evita um segundo
  caminho de simulação.
- **Ordem determinística**: ligas em ordem do banco; clubes por id; um fork de PRNG por país e por
  etapa (`${seed}:country:${id}:${etapa}`), de modo que acrescentar um país não altera os outros.
  A seed da temporada de cada liga principal depende só do banco: o **primeiro país de
  `countries.json`** usa `leagueSeasonSeed(careerSeed, número)` como hoje (banco de um país
  idêntico); os demais usam `${seedDaTemporada}:country:${id}`. O país do clube em foco não
  entra na conta, então `switchManagerCountry` não altera nenhuma seed.

## R7 — Histórico resumido de competições alheias

- **Decision** (Q4): `SeasonHistoryEntry` ganha `topScorers?: { playerId, clubId, goals }[]` (10). As
  entradas de todo país, o do jogador ou não, guardam a classificação final completa de cada divisão
  (`HistoryRow`, já compacta) mais esses artilheiros; nenhum resultado jogo a jogo. A liga principal
  do país do jogador segue em `history`; as dos demais países vão para `worldHistory`, uma entrada
  por país e temporada, com `competitionId`, no mesmo formato.
  Ao trocar de país, a história do novo país continua consultável no mesmo formato.
- **Rationale**: é o que o jogador consulta sobre mundos que não joga (campeões, tabela final,
  artilheiros), com custo fixo por temporada (10 países × 2 divisões × 20 linhas ≈ 40 KB).
- **Alternatives considered**: guardar só campeão (perde a tabela que a diretoria e as manchetes
  citam); guardar resultados dos últimos anos (cresce sem ganho de consulta).

## R8 — Mercado entre países e limite de estrangeiros

- **Decision**:
  - **Valor** (Q1): o valor de mercado é universal. `marketValue` continua usando as regras de
    mercado da **primeira competição do banco** para o fator de contrato (`lastYearValuePct`,
    `twoYearsValuePct`); o valor base (`deriveMarketValue`) depende só do jogador e da reputação
    do clube. Janelas, ofertas e IA seguem as regras do país do clube. A taxa é paga e recebida em
    valor de mercado, sem conversão. O salário do contrato é derivado na hora
    da folha pelo `wageFactorPct` do país do clube atual (já é assim, R1).
  - **IA** (FR-012): `market/ai` itera sobre os clubes de todos os países; a lista de alvos
    (`purchaseTarget`) considera jogadores de qualquer país, filtrando pelo limite de estrangeiros
    do país do comprador e pela janela aberta dos dois lados. Para manter o custo linear, a busca
    de alvos usa um índice por posição e faixa de força construído uma vez por janela, não varrendo
    todos os jogadores por clube.
  - **Limite de estrangeiros** (Q3, FR-002a): `foreignCount(club)` = jogadores com
    `nationalityId ≠ club.countryId`. Contratar, receber por empréstimo ou assinar livre que
    ultrapasse `country.rules.foreignLimit` é recusado (`market.foreign_limit` para o jogador;
    filtro silencioso para a IA). A renovação de jogadores já no clube e a revelação de jovens
    nunca são bloqueadas; um clube acima do limite (por exemplo, após troca de país de um jogador
    por dados) não perde ninguém, só não contrata estrangeiros até voltar ao limite.
  - **Reputação para propostas** (Q2): `compatibleClub` já compara reputação do técnico e do clube;
    o conjunto de vagas passa a ser o de todos os clubes do mundo (R9).
- **Alternatives considered**: câmbio entre economias (rejeitado em Q1); limite fixo do jogo
  (rejeitado em Q3).

## R9 — Diretoria e propostas de qualquer país; troca de país a qualquer momento

- **Decision**: `BoardState` já guarda técnico e vagas por clube; a criação do estado e
  `considerVacancies` passam a cobrir os clubes de todas as ligas principais. A proposta carrega
  `countryId` do clube (derivável do banco, exibido na UI). `acceptOffer` de clube de outro país
  chama `switchManagerCountry` (R2) depois das regras de hoje (liberar o clube atual, abrir o
  vínculo, metas de meio de temporada com `midSeason: true` — já existe para trocas dentro do país).
  O novo clube entra no calendário na data atual: suas competições já têm rodadas no mesmo
  calendário; as rodadas passadas ficam como estão e as metas partem do ponto em que a
  temporada está (FR-010, Q5).
- **Rationale**: a lógica de proposta, expiração, metas de meio de temporada e histórico do técnico
  já existe; a diferença é o conjunto de clubes e a troca de papel das ligas.
- **Edge**: o clube do jogador some de `league` e a antiga liga passa a `otherLeagues`; nenhum
  jogo é duplicado, pois o dia é por competição e a rodada é fechada uma vez.

## R10 — Banco de teste e mod de exemplo com vários países

- **Decision**: `worldgen/world-example.ts` com `generateWorldBank({ seed, countries: 10,
  divisionsPerCountry: 2, clubsPerDivision: 20 })`: reaproveita `generateDefaultBank` por país com
  seed `${seed}:${código}`, banco de nomes próprio (gerado por tabelas de sílabas fictícias em
  `worldgen/name-banks/world/*.json`, 20+ nomes e sobrenomes por país), ids com prefixo do código do
  país, e economia por país com `wageFactorPct`/`fansBase` variados (de 40% a 160%). Países têm a
  mesma agenda, e o mundo gerado atende às faixas de 008/009 de cada país. A ferramenta
  `pnpm gen:world-mod` grava `mods/exemplo-mundo` (3 países com estruturas diferentes, FR-022/SC-008,
  não os 10 do teste).
- **Rationale**: o princípio IV pede dados fictícios; reaproveitar o gerador existente mantém a
  calibração de forças e de economia que já passa nos testes de 30 temporadas.

## R11 — Compatibilidade: formato de mod 1 e save v15

- **Decision**: o formato de mod continua `formatVersion: 1` (mudanças aditivas: `country.rules`,
  validações novas). Save v15: `league` e `competitions` iguais, `otherLeagues` novo (vazio em saves
  antigos e no banco de um país), `MatchRecord` ganha campos opcionais, `SeasonHistoryEntry` ganha
  `topScorers` opcional. A migração v14 → v15 só adiciona `otherLeagues: []` e sobe a versão.
  O mundo padrão deve ser **idêntico** ao de hoje (teste de equivalência: mesma seed, mesmos
  resultados de 5 temporadas).
- **Rationale**: Princípio VI; saves antigos são mundos de um país.

## R12 — Metas de escala (FR-019) e como são medidas

Medidas da implementação em `baseline.md` (10 países, 400 clubes, 30 temporadas):

| Meta | Medido | Limite (`SCALE_LIMITS`) |
|------|--------|-------------------------|
| Save no início da temporada 31 (JSON) | 10,83 MB | ≤ 12 MB |
| Crescimento médio por temporada (10ª–30ª) | 202 KB | ≤ 250 KB |
| Save na última rodada (JSON) | 37,0 MB | ≤ 42 MB |
| Arquivo exportado (`.blsave`, gzip) | 3,54 MB | ≤ 6 MB |
| Dia de jogos do mundo todo (mediana) | 250 ms | ≤ 600 ms |
| Virada de temporada (mediana) | 3,3 s | ≤ 6 s |
| Pico de memória (heap) | 536 MB | ≤ 1 GB |
| 30 temporadas sem interação | 15,9 min | ≤ 20 min |

Os limites vivem em `packages/save/src/scale-limits.ts`, lidos por `pnpm sim:world --scale` (que sai
com código ≠ 0 se algum falhar) e por `tools/test/simulate-scale.test.ts` (tamanho reduzido).

Equivalência das simulações (R3), faixas declaradas em `summary-equivalence.test.ts` (8 000 jogos):
média de gols ±0,08; % mandante, empate e visitante ±2,5 pontos; distância de variação total de
placares ≤ 0,045 (o ruído entre duas amostras só da completa é ~0,03); amarelos ±0,25, vermelhos
±0,03 e lesões ±0,03 por jogo; minutos de quem joga o jogo todo ±0,6.

## R13 — Balanceamento por país (SC-001)

- **Decision**: as medidas de 008 (economia) e 009 (renovação) passam a ser calculadas por país
  (`measureWorld(world, { countryId })`); o regulador global da 009 é aplicado por país (`regulator`
  ganha o grupo de clubes). O teste de 30 temporadas confere as faixas em **cada** um dos 10 países.
  Transferências internacionais da IA têm um teto de volume por janela declarado nos dados
  (`AiMarketRules.maxInternationalPerClub`), para a migração líquida não esvaziar um país.
- **Rationale**: o critério de aceite exige cada país dentro das faixas; sem medir por país, um país
  rico poderia drenar os outros sem o teste perceber.
- **Risk**: a migração líquida pode empurrar um país para fora da faixa; o teste de longo prazo
  mede e, se necessário, o teto e o limite de estrangeiros do banco de teste ajustam (dados).
