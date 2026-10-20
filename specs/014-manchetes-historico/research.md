# Research: Manchetes e histórico

Decisões técnicas da 014. Números são padrões iniciais de `DEFAULT_NEWS`, ajustáveis por
`competition.news` e calibrados por simulação (R12).

## R1 — Módulo e estado

- **Decision**: módulo novo do motor `news/`, com estado serializável `NewsState`:
  `feed: RoundFeed[]` (manchetes por rodada da temporada atual e da anterior), `records: Records`
  (recordes da liga e por clube), `allTime: AllTime` (gols e jogos acumulados por jogador e clube)
  e `seasons: SeasonNews[]` (artilheiro por divisão e resumo de cada temporada). Save v10 guarda
  `news`. Títulos por clube são **derivados** de `history` (já guardado), não armazenados.
- **Rationale**: o motor só produz dados estruturados (Princípio VII); o que já existe no save
  (campeões, classificações, trajetória do técnico) não é duplicado.

## R2 — Onde as manchetes nascem

- **Decision**: `completeCareerRound(…, board?, fans?, news?)` com `CareerNews { state, careerSeed }`.
  Depois da diretoria, `newsAfterRound` recebe a liga com a rodada fechada, o mundo, o log do
  mercado da rodada, a diretoria antes e depois (para detectar demissões e contratações) e a
  torcida (clássicos), e devolve o `NewsState` com a rodada nova no feed e os recordes atualizados.
  Na virada, a etapa `news-new-season` (depois de `record-history`) fecha a temporada: artilheiros,
  totais acumulados, recordes de temporada (pontos), manchete-resumo e poda do feed.
- **Rationale**: mesmo caminho de 009/011/012/013 para ao vivo, direto, testes e simulações. Na rodada
  ao vivo as manchetes aparecem ao fim da rodada (Assumptions da spec).

## R3 — Tipos de manchete e detecção

| Tipo | Detecção (padrões de R12) |
|---|---|
| `result` | todo jogo do clube do jogador (garante FR-002); variáveis: placar, adversário, mando, sequência |
| `hatTrick` | jogador com ≥ 3 gols no jogo (`players[id].goals`) |
| `rout` | diferença ≥ `routMargin` (4) |
| `comeback` | vencedor esteve atrás no placar (gols reconstruídos dos eventos `shot` com `outcome: "goal"` em ordem de minuto) |
| `upset` | vencedor com expectativa (012) ≥ `upsetGap` (8) postos pior que o perdedor |
| `derby` | jogo entre rivais (013), com a intensidade |
| `streak` | sequência de vitórias, derrotas ou jogos sem vencer ≥ `streakMin` (3), a cada novo jogo da sequência |
| `droughtEnd` | primeira vitória depois de ≥ `droughtMin` (6) jogos sem vencer |
| `record` | recorde de clube ou liga superado (R5) |
| `coachFired` / `coachHired` | vaga aberta / técnico contratado na rodada (diff da diretoria da 012) |
| `managerFired` / `managerHired` | aviso da diretoria do jogador na rodada |
| `bigTransfer` | maior transferência da rodada com valor ≥ `bigTransferMin` (percentil 90 dos valores de mercado do mundo) ou envolvendo ídolo (013) ou o clube do jogador |
| `titleClinched` | líder com pontos > 2º colocado + 3 × jogos restantes (matemático) |
| `promotionClinched` / `relegationConfirmed` | o mesmo critério nas zonas de acesso e rebaixamento |
| `seasonSummary` | na virada: campeões, acessos, rebaixamentos e artilheiro de cada divisão |

Sequências e jejuns são calculados dos `records` da temporada (sem estado extra); sequências não
atravessam temporadas.
- **Rationale**: cobre a lista do prompt com regras simples e verificáveis.

## R4 — Relevância, agrupamento e limite

- **Decision**: cada manchete tem `relevance` = base do tipo (`record` 90, `titleClinched` 85,
  `relegationConfirmed`/`promotionClinched` 80, `managerFired` 95, `hatTrick` 60, `comeback` 55,
  `upset` 55, `rout` 50, `derby` 45, `droughtEnd` 45, `streak` 40, `coachFired` 40, `bigTransfer`
  35, `coachHired` 20, `result` 10) `+ mineBonus` (40) se envolve o clube do jogador. Por jogo, fica
  só a manchete de maior relevância como principal; as demais do mesmo jogo viram `extras` (no
  máximo 1) dentro dela. O feed da rodada guarda as `feedLimit` (10) mais relevantes, desempate por
  tipo e ids; sempre inclui a melhor do clube do jogador (FR-002). A Início mostra as 3 primeiras.
- **Rationale**: o feed não é inundado (FR-006) e nunca repete um fato.

## R5 — Recordes

- **Decision**: `Records { league: Record<RecordKind, RecordEntry>, clubs: Record<clubId,
  Partial<Record<ClubRecordKind, RecordEntry>>> }`. Tipos de liga: `biggestWin` (diferença, desempate
  por gols marcados), `mostGoalsMatch` (gols num jogo, soma), `mostPlayerGoalsSeason`,
  `mostPointsSeason`, `longestWinStreak`. Por clube: `biggestWin`, `biggestLoss`,
  `mostPlayerGoalsSeason`, `mostPointsSeason`. `RecordEntry { value, secondary?, clubId?,
  opponentId?, playerId?, playerName?, season, year, round? }`. Um recorde é **superado** só se o
  valor novo for estritamente maior (empate não conta, SC-002). Ao superar, a manchete `record` leva
  o recorde anterior inteiro nas variáveis; na primeira marca de um tipo (sem anterior) só registra,
  sem manchete. Recordes de temporada (pontos) são checados na virada; gols de jogador na temporada
  a cada rodada (a manchete sai uma vez, quando passa do recorde).
- **Rationale**: SC-002 e FR-009/FR-010; nome do jogador guardado no recorde para sobreviver à
  aposentadoria.

## R6 — Variações determinísticas

- **Decision**: cada tipo tem `variants[type]` variações (padrão 3, `result` 6, `seasonSummary` 2)
  com chaves `news.<type>.<n>` em `ui.json`. Índice = `hash(careerSeed:season:round:type:ids) mod
  variants`, com o `cyrb128` do motor. Teste confere que toda chave existe e que a distribuição numa
  temporada não concentra mais da metade numa variação (SC-005).
- **Rationale**: Princípio II; sem LLM (Princípio VIII); variações por dado, frases completas no i18n
  com plural (sequência, gols) e o tratamento de gênero de R7.

## R7 — Gênero e plural

- **Decision**: os templates usam ICU `plural` para números e evitam artigo antes do nome do clube
  ("Ribeira Funda vence…"), o que dispensa gênero de clube. Para jogadores, o banco não tem gênero;
  os templates usam formas neutras ("o atacante" não; "{player} marca três"). Estrutura `select`
  pronta para gênero quando o banco tiver o campo (pós-MVP).
- **Rationale**: FR-005 sem campo novo no banco; tradução futura continua possível.

## R8 — Histórico acumulado e lendas

- **Decision**: na virada, `seasonStats` de cada divisão alimenta `allTime.players[playerId] =
  { name, goals, matches, clubs: { [clubId]: { goals, matches } } }`. Para limitar o tamanho (FR-015),
  depois de acumular a poda mantém: jogadores ainda no banco **ou** entre os `allTimeTop` (100)
  artilheiros da liga **ou** entre os `legendsPerClub` (10) com mais gols ou mais jogos de algum
  clube. `seasons[]` guarda por temporada e divisão o artilheiro (id, nome, clube, gols).
- **Rationale**: aposentados que importam continuam (lendas, artilheiros históricos); o resto some.

## R9 — Feed e poda

- **Decision**: `feed` guarda `RoundFeed { season, round, headlines }` da temporada atual e da
  anterior; na virada, rodadas de temporadas mais antigas saem. O resumo da temporada é uma manchete
  `seasonSummary` gravada na rodada 0 da nova temporada.
- **Rationale**: FR-014 e FR-015.

## R10 — Save v10 e migração

- **Decision**: `formatVersion: 10`; `news: NewsState`. Criação: `createNews()` (vazio). Migração
  v9 → v10: feed vazio, recordes e acumulados vazios, `seasons` com uma entrada por temporada
  encerrada sem artilheiro (os gols por jogador dessas temporadas não foram guardados); campeões e
  títulos continuam vindo de `history`.
- **Rationale**: Princípio VI; SC-008.

## R11 — Limite de tamanho do save (critério de aceite 3)

Medição antes da 014 (carreira com "sem demissão", mercado, diretoria e torcida, seed `medir`):

| Momento | Tamanho |
|---|---|
| Criação | 420 KB |
| Início da temporada 11 | 720 KB |
| Início da temporada 31 | 1.146 KB |
| Fim de qualquer temporada (com todas as partidas e eventos) | ≈ 1.150 KB + 2.860 KB da liga |

Crescimento ≈ 21 KB por temporada (histórico de classificações e resumos financeiros).

- **Decision**: limites verificados por teste (`save/test/size.test.ts`, 30 temporadas simuladas):
  - save no início da temporada 31 ≤ **1,6 MB** (a 014 pode acrescentar até ~450 KB);
  - crescimento médio por temporada entre as temporadas 10 e 30 ≤ **30 KB**;
  - save na última rodada de qualquer temporada ≤ **4,5 MB**.
- **Rationale**: valores concretos exigidos pelo prompt; a parte da 014 (feed de duas temporadas ≈
  2 × 38 × 10 × 200 B ≈ 150 KB, acumulados podados ≈ 150 KB, recordes e temporadas ≈ 20 KB) cabe com
  folga.

## R12 — Parâmetros (`competition.news`, padrões `DEFAULT_NEWS`)

| Grupo | Campos (padrão) |
|---|---|
| limiares | `routMargin` 4, `upsetGap` 8, `streakMin` 3, `droughtMin` 6, `bigTransferPct` 90 |
| relevância | `relevance` por tipo (R4), `mineBonus` 40 |
| feed | `feedLimit` 10, `homeLimit` 3, `extrasPerMatch` 1 |
| histórico | `allTimeTop` 100, `legendsPerClub` 10 |
| variações | `variants` por tipo (R6) |

Schema Zod opcional e `.partial()`.

## R13 — Interface

- **Decision**:
  - Início: cartão **Manchetes** com as 3 primeiras da última rodada e link "Ver todas".
  - Página nova `/jogo/noticias` (Notícias): seletor de rodada (temporada atual e anterior), lista
    completa da rodada, resumo da temporada encerrada.
  - Histórico (`/jogo/historico`) ganha abas: **Temporadas** (campeões + artilheiro, como hoje),
    **Títulos**, **Artilheiros**, **Recordes**, **Clubes** (seletor de clube: títulos, recordes,
    lendas) e link para Carreira › Histórico (trajetória do técnico).
  - Navegação: "Notícias" (tecla N já é da virada; usar **J**, de jornal).
- **Rationale**: FR-007, FR-013, FR-014; SC-006 (artilheiro de qualquer temporada em ≤ 3 cliques:
  Histórico → Temporadas → linha da temporada).

## Resultados da implementação

- **Tamanho do save** (`packages/save/test/size.test.ts`, 30 temporadas pelo caminho real do save,
  carreira com "sem demissão", seed `tamanho`):
  - início da temporada 31: **1.396 KB** (limite 1,6 MB);
  - crescimento médio entre as temporadas 10 e 30: **≈ 23,9 KB** por temporada (limite 30 KB);
  - última rodada da temporada 30: **4.587 KB** (limite 4,5 MB = 4.608 KB). A folga é pequena, mas
    o teste é determinístico; quase todo esse valor vem das partidas da temporada (≈ 2,9 MB, já
    existentes antes da 014) e do aviso de escalação que o teste nunca dispensa.
  - Na primeira medição a última rodada chegou a 4.672 KB. Duas economias resolveram: na virada, as
    rodadas da temporada encerrada ficam só com as `homeLimit` (3) manchetes mais relevantes (R9),
    e `playerIds` é omitido quando vazio. Reduzir o feed para 8 por rodada ganhou só ~20 KB e foi
    desfeito (o feed continua com 10).
- **Variedade**: `sim:world --seasons 30` registra 12 a 14 tipos de manchete por temporada sem
  técnico humano (limite 8 na ferramenta); com o técnico, `news/feed.test.ts` exige ≥ 10 (SC-005).
- **Desempenho**: `newsAfterRound` abaixo de 10 ms (mediana) depois de calcular expectativas e gols
  da temporada uma vez por divisão, não por jogo.
- **Ajuste de etapa**: a etapa `news-new-season` roda antes de `advance-year`, então a temporada
  nova é `encerrada + 1` (e não `context.next.number`, que ainda é a encerrada).
