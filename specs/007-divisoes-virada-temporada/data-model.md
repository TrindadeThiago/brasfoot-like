# Data Model: Múltiplas divisões e virada de temporada

Tipos novos ou alterados. `Season`, `Round`, `Fixture`, `MatchRecord`, `PlayerStatus` e
`StandingRow` continuam como na 003/006 (ver `packages/engine/src/season/types.ts`).

## Motor (`@brasfoot-like/engine`)

### SeasonOptions (alterado)

| Campo | Tipo | Regra |
|---|---|---|
| `clubIds` | `string[]?` | Novo. Composição da divisão nesta temporada; padrão: `division.clubIds` do banco. Todos os ids existem no banco, sem repetição, mínimo 2. |
| `status` | `Record<string, PlayerStatus>?` | Novo. Situação inicial dos jogadores (lesões herdadas, R7); padrão `{}`. |

### LeagueSeason (novo)

Temporada da competição do país inteira.

| Campo | Tipo | Regra |
|---|---|---|
| `competitionId` | `string` | Competição do banco (formato `league`). |
| `number` | `int ≥ 1` | Número da temporada na carreira (1 = primeira). |
| `year` | `int` | Ano exibido; inicial = ano de `manifest.referenceDate`. |
| `seed` | `string` | Seed da temporada (R3): `careerSeed` se `number = 1`, senão `` `${careerSeed}:s${number}` ``. Igual à `seed` de todas as `divisions`. |
| `divisions` | `Season[]` | Uma por divisão da competição, ordenadas por `divisionLevel` crescente (1, 2, …). |

**Invariantes**

- Todo clube de `competition.divisions[*].clubIds` (do banco) está em exatamente uma `Season`
  da `LeagueSeason`; o tamanho de cada divisão é o mesmo do banco (FR-009).
- **Rodada da liga** = `max(nextRound)` entre as divisões ainda não encerradas; todas as divisões
  não encerradas têm o mesmo `nextRound` (avançam juntas).
- **Encerrada** quando todas as `Season` estão encerradas (`isSeasonOver`).

**Estados**

```text
em andamento (rodada r) ──completeLeagueRound──▶ em andamento (r+1) … ──▶ encerrada
encerrada ──seasonTurnover──▶ nova LeagueSeason (number+1, year+1, rodada 1)
```

### LiveMatch (alterado)

| Campo | Tipo | Regra |
|---|---|---|
| `divisionLevel` | `int` | Novo. Divisão da partida; a UI filtra por ele. Ausente/1 em rodadas criadas pelo `startRound` de uma `Season` isolada (compatível). |

`LiveRound` não muda de forma; em uma rodada da liga, `matches` contém as partidas de todas as
divisões, em ordem de nível e depois da ordem do calendário de cada divisão.

### DivisionZones (novo, derivado)

`{ level, promotion: int, relegation: int }` — vagas lidas do banco para marcar a classificação
(FR-006). `promotion` = `promotionSlots` da divisão; `relegation` = `relegationSlots`.

### SeasonHistoryEntry (novo)

| Campo | Tipo | Regra |
|---|---|---|
| `number` | `int` | `LeagueSeason.number` da temporada encerrada. |
| `year` | `int` | Ano da temporada encerrada. |
| `competitionId` | `string` | |
| `divisions` | `HistoryDivision[]` | Uma por divisão, por nível. |

`HistoryDivision` = `{ level, championId, standings: HistoryRow[], promoted: string[],
relegated: string[] }`; `championId` = `standings[0].clubId`; `promoted` = clubes que **saíram
desta divisão para cima**, `relegated` = os que **saíram para baixo** (vazios onde não há vaga).

`HistoryRow` = `{ position, clubId, points, played, wins, draws, losses, goalsFor, goalsAgainst }`
(subconjunto de `StandingRow`).

### TurnoverStep, TurnoverContext (novos)

| Tipo | Campos |
|---|---|
| `TurnoverStep` | `id: string` (kebab-case, único), `run(ctx): TurnoverContext` (pura; não altera `ctx`). |
| `TurnoverRegistration` | `{ step: TurnoverStep; before: string }` ou `{ step; after: string }` (id de outra etapa). |
| `TurnoverContext` | `world`; `careerSeed`; `finished: LeagueSeason` (somente leitura); `finalStandings: Record<number, StandingRow[]>`; `history: SeasonHistoryEntry[]`; `next: NextSeasonDraft`; `league?: LeagueSeason` (preenchido por `generate-calendars`); `rng(stepId): Rng`. |
| `NextSeasonDraft` | `{ number, year, seed, composition: Record<number, string[]>, carryOver: Record<string, PlayerStatus> }` |

**Etapas padrão** (ids estáveis, ordem fixa — FR-017):

| Ordem | id | Efeito |
|---|---|---|
| 1 | `record-history` | Acrescenta `SeasonHistoryEntry` a `history` a partir de `finalStandings` e das vagas. |
| 2 | `promotion-relegation` | Calcula `next.composition` (R4). |
| 3 | `advance-year` | `next.number = finished.number + 1`, `next.year = finished.year + 1`, `next.seed` (R3). |
| 4 | `reset-season-stats` | `next.carryOver` = só lesões restantes, sem amarelos/suspensões (R7). |
| 5 | `generate-calendars` | Cria `league` com uma `Season` por nível (`createSeason` com `clubIds` e `status`). |

**Regras do pipeline**: extras ficam imediatamente antes/depois da âncora; extras com a mesma
âncora e direção são ordenadas por `id`; id duplicado ou âncora inexistente → erro
`turnover.invalid_steps`; ao fim, `league` deve existir e respeitar os invariantes da
`LeagueSeason` (senão `turnover.invalid_result`).

## Save (`@brasfoot-like/save`) — formato v3

| Campo | v2 | v3 |
|---|---|---|
| `formatVersion` | 2 | 3 |
| `season` | `Season` | **removido** |
| `league` | — | `LeagueSeason` |
| `history` | — | `SeasonHistoryEntry[]` (vazio na 1ª temporada) |
| demais (`id`, `createdAt`, `savedAt`, `managerName`, `clubId`, `seed`, `bank`, `lineup`, `lineupNotice`) | | sem mudança |

**Validação ao abrir (v3)**: envelope Zod; banco válido; `league.divisions` não vazio, cada uma
com `seed === league.seed`; `league.seed` coerente com `save.seed` e `league.number` (R3); o
clube do jogador está em exatamente uma divisão; escalação legível (regra atual).

**Derivados** (funções do pacote save): `userSeason(save)` (a `Season` da divisão do clube),
`userDivisionLevel(save)`, `seasonYearOf(save)` → `league.year`, `currentDate(save)` →
`seasonDate(referenceDate, league.year)`; `SaveSummary` ganha `divisionLevel` e usa
`league.year`.

**Migração v2 → v3** (R9): ver `contracts/save-format-v3.md`.
