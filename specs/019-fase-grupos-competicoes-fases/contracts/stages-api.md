# Contrato: API do motor (fases e fase de grupos)

Funções puras de `@brasfoot-like/engine`; nenhuma usa `Date` nem aleatoriedade fora do PRNG com
seed (Princípio II). Tipos em [data-model.md](../data-model.md). Tudo que está abaixo só atua em
`Season` com `stages`; ligas e copas da 018 seguem exatamente como hoje.

## Fases (`stages/`)

```ts
stagesOf(competition, division): StageFormat[]                 // R1: normaliza format/division.stages
stageRounds(stage: StageFormat, participants: number): number  // rodadas da fase (liga, grupos, pernas)
createStagedSeason(world, setup: StagedSetup): { ok: true; season: Season }   // chamado por createSeason, que valida antes
                                                               // todas as rodadas; fase 0 já começada
startStage(season, world, index, participants, fromPrevious): Season   // começa uma fase (stages/start.ts)
advanceStages(season, world): Season                           // idempotente; chamado ao fechar cada rodada
stageOfRound(season, round): StageState | undefined
isStagedSeason(season): boolean                                // season.stages !== undefined
```

- `createSeason`/`createLeagueSeason` chamam `createStagedSeason` quando a divisão tem mais de uma
  fase ou uma fase que não é a liga simples; ligas simples seguem pelo caminho de hoje.
- Garantia: `advanceStages` nunca altera `records`; devolve a mesma `Season` (referência) quando nada
  precisa avançar; depois de uma fase começar, a anterior não é tocada.
- Garantia: nenhuma rodada fica sem `fixtures` quando é a hora de jogá-la (a fase seguinte é montada
  no fechamento da última rodada da anterior).

## Sorteio dos grupos (`stages/groups-draw.ts`)

```ts
drawGroups(clubs: GroupDrawClub[], rule: GroupsRule, seed: string, mode: "career" | "strict"): DrawResult
```

- Mesma seed e mesmos clubes (em qualquer ordem de entrada) ⇒ os mesmos grupos.
- Cada grupo recebe no máximo um clube de cada pote; potes nunca são afrouxados.
- `separate`: sem solução, `mode: "career"` devolve `{ ok: true, groups, warnings }` (todo clube em
  algum grupo, o menor número de pares em violação encontrado dentro do teto de nós, empates pela
  seed); `mode: "strict"` devolve `{ ok: false, error: stages.draw_impossible }` sem grupos.
- `concentrate`: nunca produz erro nem aviso; sem potes, cada valor do atributo ocupa grupos
  consecutivos, no máximo um além do mínimo (SC-003).
- A busca termina sempre (teto de nós por contagem).

## Classificação e chaveamento (`stages/classification.ts`, `stages/pairing.ts`)

```ts
groupStandings(season, world, stageIndex, groupId): StandingRow[]
groupTables(season, world, stageIndex): { group: GroupState; rows: StandingRow[] }[]
overallStandings(season, world, stageIndex): OverallRow[]      // sem confronto direto; draw-lots por último
stageQualifiers(season, world, stageIndex): Qualifier[]        // N primeiros + extras da posição N+1
stageOrigin(season, world, stageIndex, clubId): Origin | undefined
pairByPosition(qualifiers: Qualifier[], options): { home: string; away: string }[]   // R7
```

- `stageQualifiers` devolve exatamente `qualified × grupos + extra` clubes, sem repetição, ou os
  `qualified` primeiros da tabela (fase de pontos corridos).
- `pairByPosition` é puro e determinístico: o i-ésimo melhor enfrenta o i-ésimo pior, evita o mesmo
  grupo quando existe troca, e o mandante segue `home` (`overall` usa a classificação geral).

## Posição final e leitura da tabela (`stages/ranking.ts`, `season/standings.ts`)

```ts
finalOrder(season, world): string[]                            // FR-024
standings(season, world): StandingRow[]                        // existente: com stages, na ordem de finalOrder
drawWarnings(season): DrawWarning[]
```

- `finalOrder` devolve todos os clubes da divisão, sem repetição nem lacuna, a qualquer momento da
  temporada; com a última fase eliminatória decidida, o primeiro é o campeão e o segundo o vice.
- `standings(season)` de uma `Season` sem `stages` é idêntico ao de hoje.

## Visão da fase eliminatória (`stages/cup-view.ts`)

```ts
cupView(season, world, stageIndex): Season                     // bracket, clubIds e formato da fase
applyCupView(season, view, stageIndex): Season                 // devolve fixtures e bracket para a fase
```

- As funções de `knockout/` (`ensurePhaseDrawn`, `tieState`, `phaseDecided`, `deciderFor`,
  `cupPrizes`, `cupEvents`) aceitam a visão; chamadas com uma `Season` de copa da 018 se comportam
  como hoje.

## Integrações alteradas

| Função | Mudança |
|---|---|
| `createSeason` / `createLeagueSeason` / `createCareerSeason` | despacham para `createStagedSeason` quando a divisão é em fases |
| `generateCalendar` | parâmetro opcional `firstRound` (padrão 1) |
| `completeRound` | chama `advanceStages` ao final |
| `calendarCompetitions` / `roundsOf` / `gapsOf` | rodadas e respiros de divisões em fases (R11) |
| `drawn` (`career/day.ts`) | a divisão em fases também recebe `advanceStages` (já vem de `completeRound`) |
| `cupFacts` / `withCupPrizes` (`career/day.ts`) | prêmios e eventos também para a fase eliminatória de uma divisão em fases, pela visão |
| `news/clinched` | ignora divisões em fases |
| `validateBank` | regras `stages.*` (R10); `format.unsupported` deixa de citar `groups` |
| `knockoutFormat` (uso interno) | `cupFormat(world, season)`: o formato da visão, se houver |

## Erros novos (`errors.json`, ICU)

Validação do banco (todos com arquivo e campo):

| Código | Parâmetros |
|---|---|
| `stages.group_size_mismatch` | `stage`, `clubs`, `groupSize` |
| `stages.group_count` | `stage`, `groups` |
| `stages.qualify_range` | `stage`, `qualified`, `max` |
| `stages.extra_exceeds_groups` | `stage`, `extra`, `groups` |
| `stages.qualify_mismatch` | `stage`, `qualifying`, `next`, `nextClubs` |
| `stages.qualified_without_next` | `stage` |
| `stages.knockout_count` | `stage`, `phase`, `count`, `delta` |
| `stages.enter_unknown_club` / `stages.enter_first_stage` / `stages.enter_duplicate` | `stage`, `clubId` |
| `stages.pots_range` | `stage`, `pots`, `groupSize` |
| `stages.pot_size` | `stage`, `pot`, `clubs`, `groups` |
| `stages.rule_exempt_pot` | `stage`, `pot`, `pots` |
| `stages.separation_impossible` | `stage`, `attribute`, `value`, `clubs`, `groups` |
| `stages.pairs_invalid` | `stage`, `origin` |
| `stages.relegation_exceeds_eliminated` | `level`, `relegation`, `eliminated` |
| `stages.gap_conflict` | `competitionId` |

Sorteio em modo `strict`: `stages.draw_impossible` (`stage`, `attribute`, `clubIds`). Na carreira o
sorteio não gera erro: gera `DrawWarning`.
