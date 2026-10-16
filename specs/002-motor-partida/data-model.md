# Data Model: Motor de partida

**Feature**: `002-motor-partida` | **Date**: 2026-10-16

Todos os tipos são objetos simples e serializáveis. Jogadores são `CompletedPlayer` da feature 001
(força, posição, características e atributos ocultos completos). API em
[contracts/match-api.md](contracts/match-api.md); erros em
[contracts/match-errors.md](contracts/match-errors.md).

## Catálogos fixos (código)

### Formation

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `"4-4-2" \| "4-3-3" \| "3-5-2" \| "4-5-1" \| "5-3-2" \| "4-2-3-1"` | — |
| `slots` | Slot[11] | exatamente 1 vaga com `position: "GK"` |

### Slot

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string | único no esquema (ex.: `gk`, `lb`, `lcb`, `rcb`, `rb`, `ldm`, `cm`, `lw`, `st`) |
| `position` | Position | posição esperada na vaga |

Pesos de setor por posição da vaga (`SECTOR_WEIGHTS`, research R3) e tabela de adequação
(`ADEQUACY`) também são catálogos fixos.

### Posture

`"defensive" | "balanced" | "attacking"`.

## Entrada

### MatchInput

| Campo | Tipo | Regras |
|---|---|---|
| `home`, `away` | TeamInput | clubes diferentes |
| `seed` | string \| number | obrigatório |
| `neutral` | boolean? | padrão `false` |
| `substitutionLimit` | inteiro? | padrão 5, 0–11 |
| `benchLimit` | inteiro? | padrão 12, 0–23 |

### TeamInput

| Campo | Tipo | Regras |
|---|---|---|
| `clubId` | Id | — |
| `squad` | CompletedPlayer[] | jogadores do clube (todos com `clubId` = `clubId`) |
| `lineup` | Lineup | — |
| `unavailable` | Id[]? | lesionados/suspensos; não podem ser escalados nem entrar |

### Lineup

| Campo | Tipo | Regras |
|---|---|---|
| `formation` | Formation id | do catálogo |
| `posture` | Posture | — |
| `starters` | Record<slotId, playerId> | exatamente as 11 vagas do esquema |
| `bench` | playerId[] | ≤ `benchLimit`, sem titulares, sem repetição |

## Estado

### MatchState

| Campo | Tipo | Descrição |
|---|---|---|
| `input` | MatchInput normalizado | entrada original (com padrões aplicados) |
| `clock` | `{ half: 1 \| 2; minute: number; stoppage: number }` | último minuto jogado (`minute: 0` antes do início) |
| `stoppage` | `{ first?: number; second?: number }` | acréscimos já definidos |
| `status` | `"not_started" \| "first_half" \| "half_time" \| "second_half" \| "finished" \| "abandoned"` | — |
| `score` | `{ home: number; away: number }` | — |
| `teams` | `{ home: TeamState; away: TeamState }` | — |
| `events` | MatchEvent[] | ordem cronológica, `seq` crescente |
| `possession` | `{ homeMinutes: number; totalMinutes: number }` | acumulado para a posse estimada |

Transições de `status`: `not_started` → `first_half` → `half_time` → `second_half` → `finished`;
de qualquer tempo jogado → `abandoned` quando um time fica com menos de 7 jogadores.

### TeamState

| Campo | Tipo | Descrição |
|---|---|---|
| `formation` | Formation id | atual |
| `posture` | Posture | atual |
| `onField` | Record<slotId, playerId \| null> | `null` = vaga vazia (expulsão/lesão sem troca) |
| `bench` | playerId[] | reservas ainda disponíveis |
| `substitutionsUsed` | number | — |
| `players` | Record<playerId, PlayerMatchState> | quem participou |
| `pending` | PendingChange[] | lesão ou goleiro expulso aguardando decisão |

### PlayerMatchState

| Campo | Tipo |
|---|---|
| `minutesPlayed` | number |
| `goals`, `assists` | number |
| `yellowCards` | 0 \| 1 \| 2 |
| `sentOff` | boolean |
| `injury` | `"minor" \| "moderate" \| "severe"` \| null |
| `subbedIn`, `subbedOut` | minuto \| null |

### PendingChange

`{ reason: "injury" | "goalkeeper_sent_off"; slotId: string; playerId: string }`.

## Mudanças

### MatchChange (discriminado por `type`)

| `type` | Campos | Regras |
|---|---|---|
| `substitution` | `out`, `in`, `slotId?` | `out` em campo, `in` no banco e disponível, limite não atingido; `slotId` padrão = vaga de `out` |
| `formation` | `formation`, `assignment: Record<slotId, playerId \| null>` | jogadores em campo redistribuídos nas vagas do novo esquema; número de vagas vazias preservado |
| `posture` | `posture` | — |

## Eventos

### MatchEvent (discriminado por `type`)

Campos comuns: `seq` (inteiro crescente), `half`, `minute`, `stoppage` (0 se não for acréscimo),
`side?` (`"home" | "away"`).

| `type` | Campos específicos |
|---|---|
| `kickoff`, `half_time`, `second_half`, `full_time` | — |
| `abandoned` | `side` (time reduzido) |
| `shot` | `playerId`, `kind` (`open` \| `header` \| `counter` \| `free_kick` \| `penalty`), `outcome` (`goal` \| `saved` \| `blocked` \| `off_target`), `assistId?`, `goalkeeperId?` |
| `penalty_awarded` | `playerId` (quem sofreu), `foulerId` |
| `yellow_card` | `playerId` |
| `red_card` | `playerId`, `reason` (`second_yellow` \| `direct`) |
| `injury` | `playerId`, `severity` |
| `substitution` | `outId`, `inId`, `slotId`, `automatic` |
| `formation_change` | `formation` |
| `posture_change` | `posture` |
| `reorganization` | `playerId`, `fromSlotId`, `toSlotId` (ex.: jogador de linha vai ao gol) |

Gols = eventos `shot` com `outcome: "goal"`. Placar e estatísticas sempre derivam dos eventos.

## Resultado

### MatchResult

| Campo | Tipo |
|---|---|
| `score` | `{ home, away }` (já com a regra de 3 a 0 se `abandoned`) |
| `status` | `"finished" \| "abandoned"` |
| `events` | MatchEvent[] |
| `stats` | `{ home: TeamStats; away: TeamStats }` |
| `players` | Record<playerId, PlayerMatchState> (dos dois times) |

### TeamStats

| Campo | Regra |
|---|---|
| `shots` | eventos `shot` do time |
| `shotsOnTarget` | `outcome` ∈ {`goal`, `saved`} |
| `possession` | % inteiro; `home + away = 100` |
| `yellowCards`, `redCards` | contagem de eventos |
| `penalties`, `penaltiesScored` | `shot` com `kind: "penalty"` |

## Calibragem

- `MATCH_TUNING`: taxa base de chances, constante de domínio do meio, multiplicadores de mando e
  postura, pesos de tipo de chance, probabilidades de desfecho, efeitos das características,
  taxas de cartão/lesão/pênalti, fórmula de acréscimos.
- `MATCH_REALISM_LIMITS`: as faixas de FR-040 a FR-049, consumidas pelos testes de realismo.
