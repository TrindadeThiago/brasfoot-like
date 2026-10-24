# Data Model: Fase de grupos e competições em fases

Tipos em TypeScript descritivo. Os do formato de mod saem dos schemas Zod (`model/schemas.ts`); os
de estado são tipos do motor, serializados como JSON no save. Referências `R#` apontam para
[research.md](research.md).

## 1. Formato de mod (dados)

### Competição e divisão

```text
Competition.format:  LeagueFormat | KnockoutFormat | GroupsFormat | StagesFormat
GroupsFormat   = GroupsStage                          // type: "groups": uma única fase de grupos
StagesFormat   = { type: "stages", stages: StageFormat[] }   // 1 a 8 fases
Division.stages?: StageFormat[]                       // substitui o formato da competição nesta divisão
Club.region?: string                                  // texto(1, 40); opcional
```

`StageFormat = LeagueStage | GroupsStage | KnockoutStage`. `stagesOf(competition, division)` devolve
a lista normalizada (R1): `division.stages`, senão `format.stages`, senão a fase única do `format`.

### LeagueStage (`type: "league"`)

| Campo | Tipo | Padrão | Regra |
|---|---|---|---|
| `rounds` | inteiro(1, 4) | — | turnos, como a liga de hoje |
| `points` | `{ win, draw, loss }` | — | vitória > empate ≥ derrota |
| `tiebreakers` | lista de critérios | — | os da liga; sem repetição |
| `qualified` | inteiro(1, n − 1) | ausente | quantos primeiros avançam; ausente = última fase |
| `enter` | lista de id | `[]` | clubes que entram nesta fase (só depois da 1ª) |
| `gapWeeks` | inteiro(0, 8) | 0 | respiro antes da 1ª rodada da fase |

### GroupsStage (`type: "groups"`)

| Campo | Tipo | Padrão | Regra |
|---|---|---|---|
| `groupSize` | inteiro(3, 8) | — | clubes por grupo; todos os grupos da fase têm o mesmo |
| `rounds` | 1 ou 2 | — | turno único ou ida e volta |
| `points` / `tiebreakers` | como a liga | — | `draw-lots` é acrescentado se faltar (R5) |
| `qualified` | inteiro(1, groupSize − 1) | ausente | primeiros de cada grupo que avançam |
| `extra` | inteiro(0, grupos) | 0 | vagas extras: melhores da posição `qualified + 1` (FR-017) |
| `enter` | lista de id | `[]` | clubes que entram nesta fase (pote de origem, R6) |
| `gapWeeks` | inteiro(0, 8) | 0 | respiro antes da 1ª rodada |
| `draw` | `GroupDraw` | ausente | sorteio com potes e regras (abaixo) |

`GroupDraw`:

| Campo | Tipo | Padrão | Regra |
|---|---|---|---|
| `pots` | inteiro(2, 8) | ausente | número de potes; precisa ser igual a `groupSize` (`stages.pots_range`); ausente = sem potes (FR-010) |
| `previousStagePot` | verdadeiro/falso | falso | o último pote são os classificados da fase anterior |
| `rules` | lista de `DrawRule` | `[]` | regras de sorteio |

`DrawRule` (união por `kind`):

```text
{ kind: "separate",    attribute: "country" | "region", exemptPots?: inteiro(1, pots)[] }   // obrigatória
{ kind: "concentrate", attribute: "region" }                                               // preferência
```

### KnockoutStage (`type: "knockout"`)

É o `KnockoutFormat` da 018 (`phases` de 2 a 8, `entries`), mais:

| Campo | Tipo | Padrão | Regra |
|---|---|---|---|
| `pairing` | `"position"` \| `"draw"` | `position` se vier depois de uma fase de pontos; `draw` caso contrário | como a 1ª fase é montada (R7) |
| `pairs` | lista de `[origem, origem]` | ausente | tabela própria de confrontos; origens `A1`, `B2`, `T3`, `X1` |
| `enter` | lista de id | `[]` | clubes que entram nesta fase (preliminar, pote de origem) |

`KNOCKOUT_HOME_RULES` ganha **`overall`** (o melhor da classificação geral da fase de pontos
anterior joga em casa, FR-006). `KnockoutPhase.home` continua valendo por fase.

### Regras de validação (códigos `stages.*`, R10)

Participantes de uma fase `k`: na primeira, os clubes da divisão que não estão em nenhum `enter`; nas
seguintes, os classificados da fase `k − 1` mais os `enter` da fase `k`.

| Código | Quando |
|---|---|
| `stages.group_size_mismatch` | participantes de uma fase de grupos não são múltiplo de `groupSize` |
| `stages.group_count` | menos de 2 grupos |
| `stages.qualify_range` | `qualified` fora de 1..`groupSize − 1`, ou ausente numa fase que não é a última |
| `stages.extra_exceeds_groups` | `extra` maior que o número de grupos |
| `stages.qualify_mismatch` | classificados da fase ≠ participantes da seguinte (já contando `enter`) |
| `stages.qualified_without_next` | a última fase declara `qualified` ou `extra` |
| `stages.knockout_count` | a fase eliminatória não fecha as vagas (par em cada fase até a final) |
| `stages.enter_unknown_club` / `stages.enter_first_stage` / `stages.enter_duplicate` | `enter` com clube de fora, na 1ª fase ou repetido |
| `stages.pots_range` | `pots` diferente de `groupSize`, ou `previousStagePot` sem `pots` |
| `stages.pot_size` | um pote não tem exatamente um clube por grupo |
| `stages.rule_exempt_pot` | `exemptPots` aponta um pote inexistente |
| `stages.separation_impossible` | pelos dados, mais clubes do mesmo valor (fora dos potes isentos) do que grupos |
| `stages.pairs_invalid` | `pairs` com origem inexistente, clube repetido ou que não usa todos |
| `stages.relegation_exceeds_eliminated` | `relegationSlots` maior que os clubes que não passam da 1ª fase |
| `stages.gap_conflict` | `gapWeeks` numa competição de mais de uma divisão (a grade de datas é uma só) |

`division.slots_mismatch` e `calendar.*` (017) continuam valendo e passam a considerar as divisões
em fases. Um mod sem `stages`/`groups` nunca gera nenhum desses códigos.

## 2. Estado em execução (`Season`)

```text
Season (existente) ganha:
  stages?: StageState[]                     // ausente em ligas e copas

Round (existente) ganha:     byes?: string[]            // clubes que folgam num grupo de tamanho ímpar
Fixture (existente) ganha:   stage?: { index: number; kind: "league"|"groups"|"knockout"; group?: string }

StageState = {
  index: number                             // 0..n-1
  kind: "league" | "groups" | "knockout"
  started: boolean                          // participantes definidos e fixtures preenchidas
  clubIds: string[]                         // participantes (ordem de id); [] até começar
  rounds: number[]                          // rodadas absolutas de Season.calendar
  groups?: GroupState[]                     // só em "groups", depois do sorteio
  warnings?: DrawWarning[]                  // só em "groups": regras afrouxadas (FR-014)
  bracket?: Bracket                         // só em "knockout" (tipo da 018)
}

GroupState   = { id: string; clubIds: string[] }       // id = "A", "B", …
DrawWarning  = { stage: number; rule: DrawRuleRef; clubIds: string[] }
DrawRuleRef  = { kind: "separate"; attribute: "country" | "region" }
```

Invariantes:

- `Season.clubIds` = todos os clubes da divisão; `stages[0].clubIds` ⊆ `Season.clubIds`; a união
  dos `clubIds` de uma fase `k+1` ⊆ `clubIds(k)` ∪ `enter(k+1)`.
- `stages[k].rounds` formam intervalos contíguos e disjuntos que cobrem `Season.calendar` na ordem
  das fases; `Round.fixtures` de uma fase não começada é `[]`.
- Em uma fase de grupos, cada clube do grupo joga `theoreticalRounds(groupSize, rounds)` jogos,
  dentro do grupo, e `Round.byes` lista quem folga.
- Os registros (`records`) continuam únicos por `(round, home)`; a fase de um registro vem da
  rodada (`stages.find(rounds.includes(round))`).

### Transições

```text
createStagedSeason ──► stages[0] started (grupos sorteados / liga montada / 1ª fase eliminatória sorteada)
fechar rodada ──► advanceStages:
    fase k terminou (todas as rodadas jogadas e, se eliminatória, todos os confrontos decididos)
    e fase k+1 não começou ──► clubIds(k+1) = stageQualifiers(k) ∪ enter(k+1); start(k+1)
temporada acaba quando a última rodada do calendário é jogada (isSeasonOver, sem mudança)
virada: standings(season) = finalOrder ──► composição (acesso/rebaixamento) ──► nova Season
```

## 3. Classificações e resultados derivados (sem estado novo)

| Derivado | Definição |
|---|---|
| `groupStandings(season, world, stage, group)` | `StandingRow[]` do grupo: registros das rodadas da fase entre clubes do grupo, pontos e desempates da fase |
| `overallStandings(season, world, stage)` | `OverallRow[]` (`StandingRow` + `group` + `groupPosition`) de todos os grupos, sem confronto direto e com `draw-lots` por último |
| `stageQualifiers(season, world, stage)` | `Qualifier[]` ordenados do melhor ao pior: `{ clubId, group?, groupPosition, overallPosition, extra }` |
| `stageOrigin(season, world, stage, clubId)` | origem da vaga do clube numa fase eliminatória (`{ group, position }` ou `{ table: position }` ou `{ extra: n }`) |
| `finalOrder(season, world)` | clubes em ordem de posição final (FR-024) |
| `standings(season, world)` | para `Season` com `stages`: linhas `StandingRow` na ordem de `finalOrder` (estatísticas da última fase de pontos do clube); senão, a tabela de hoje |
| `drawWarnings(season)` | `DrawWarning[]` de todas as fases de grupos, para a tela |

`Qualifier.extra` é verdadeiro para quem entrou por vaga extra. `OverallRow.groupPosition` e
`Qualifier.groupPosition` partem de 1.

## 4. Sorteio dos grupos (`groups-draw`)

```text
GroupDrawClub = { id; reputation; countryId; region?; fromPreviousStage: boolean }
GroupsRule  = { groups: number; groupSize: number; pots?: number; previousStagePot: boolean; rules: DrawRule[] }
DrawResult  = { ok: true; groups: GroupState[]; warnings: DrawWarning[]; nodes: number }
            | { ok: false; error: { code: "stages.draw_impossible"; rule: DrawRuleRef; clubIds: string[]; stage: number } }
modo        = "career" (nunca falha; devolve warnings)  |  "strict" (validação e testes; devolve o erro)
```

`GROUP_DRAW_TUNING`: `nodeBudget` 200.000; ordem de candidatos: pela seed, depois pelo id.

## 5. Histórico e save

- `HistoryDivision` (existente) não muda: `championId` = posição 1 de `standings()` da divisão em
  fases; `standings` = linhas com posição final; `promoted`/`relegated` vindos da composição.
- Nenhum histórico novo (`cupHistory` continua só para copas).
- **Save v14**: `formatVersion: 14`; nada é removido nem renomeado; `Season.stages`, `Fixture.stage`
  e `Round.byes` aparecem apenas em temporadas criadas com divisões em fases. Migração v13 → v14:
  `formatVersion = 14`.

## 6. Relações

```text
Competition 1─* Division 1─ (stagesOf) ─* StageFormat        (dados)
LeagueSeason 1─* Season 1─? StageState 1─? GroupState, Bracket (execução)
Club ──region, countryId──► DrawRule (atributos usados pelo sorteio)
StageState(k).clubIds ◄── stageQualifiers(k−1) ∪ StageFormat(k).enter
standings(Season com stages) = finalOrder ──► composição, torcida, diretoria, histórico
```
