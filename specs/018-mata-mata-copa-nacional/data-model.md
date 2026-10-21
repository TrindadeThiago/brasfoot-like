# Data Model: Mata-mata e copa nacional

## Formato do banco (`competitions.json`, competição `knockout`)

| Entidade | Campos | Regras |
|---|---|---|
| `format` (união por `type`) | `type: "knockout"`, `phases[]`, `entries?[]` | `type: "league"` mantém `rounds`, `points`, `tiebreakers`; `groups` segue reservado (`format.unsupported`) |
| `KnockoutPhase` | `name` (texto 1–40), `legs` (1\|2), `tiebreakers[]`, `neutral?` (bool), `home`, `seeded?` (bool), `prize` (inteiro 0–10⁹), `gapWeeks?` (0–8), `neutralCapacity?` (1.000–150.000) | 2 a 8 fases; `tiebreakers` ⊆ `["away-goals","extra-time","penalties"]` em ordem, sem repetição, terminando em `penalties`; `neutral` só com `legs: 1`; `neutralCapacity` só com `neutral` (padrão 40.000) |
| `KnockoutEntry` | `phase` (inteiro 1..n−1), `clubIds[]` | clubes que entram numa fase posterior; cada clube em no máximo uma entrada, e todos precisam estar na divisão da copa |
| `divisions` da copa | exatamente uma: `level 1`, `name`, `clubIds` (participantes), `promotionSlots 0`, `relegationSlots 0` | `knockout.single_division` se houver mais de uma; clubes da copa precisam estar na competição principal (017) |

`home`: `"draw"` \| `"ranking"` \| `"division"` (R7).

Números por fase `p`: `n₀ = participantes − Σ entradas`; `n_p = n_{p−1} / 2 + |entries[p]|`. Cada
`n_p` precisa ser par (a última fase tem exatamente 2); `knockout.phase_count` diz a fase e a
sobra ou falta.

## Motor de partida

### `Decider` (novo, opcional em `MatchInput`)

```text
Decider {
  before: Record<Side, { goals: number; awayGoals: number }>  // jogos anteriores do confronto
  awayGoals: boolean      // gols fora de casa desempatam o agregado
  extraTime: boolean      // joga prorrogação se o agregado seguir empatado
  // pênaltis: sempre o último critério
}
```

### Estados e eventos

| Item | Mudança |
|---|---|
| `MatchClock.half` | `1 \| 2 \| 3 \| 4` (3 e 4 = prorrogação) |
| `MatchStatus` | + `"extra_first_half"`, `"extra_half_time"`, `"extra_second_half"`, `"penalties"` |
| `MatchState` | + `shootout?: { order: Record<Side, string[]>, kicks: ShootoutKick[], score: Record<Side, number> }`, + `extraSubstitutions` (1 a mais com a prorrogação) |
| `MatchEvent` | + `extra_time_start`, `extra_half_time`, `extra_time_end`, `shootout_start`, `shootout_kick`, `shootout_end` |
| `ShootoutKick` | `{ order, side, playerId, outcome: "goal" \| "saved" \| "post" \| "off" }` |
| `MatchResult` / `MatchRecord` | + `decision?: { by: "aggregate" \| "away-goals" \| "extra-time" \| "penalties", winner: Side, extraTimeScore?: Record<Side, number>, shootout?: { kicks, score } }` |

Placar: `score` é o placar após a prorrogação (gols da prorrogação contam); `shootout.score` é
separado. Sem `decider`, nada disso existe.

## Estado da copa dentro de `Season`

```text
Season (acréscimos)
  bracket?: Bracket            // só em competições knockout

Bracket   { phases: BracketPhase[] }
BracketPhase { index: number; drawn: boolean; rounds: number[]; ties: Tie[] }
Tie       { id: string; home: string; away: string }      // sorteado; resultados derivados

Round     { number; fixtures: Fixture[]; bye? }            // fixtures vazias até o sorteio
Fixture   (acréscimos) { tie?: { phase: number; id: string; leg: 1 | 2; legs: 1 | 2 } }
```

Derivados (`tieState`): `aggregate`, `played`, `decided`, `winner`, `decidedBy`, `loser`.
`phaseWinners(bracket, season, phase)`, `champion(season)`, `runnerUp(season)`.

Invariantes: cada `Tie` tem 1 ou 2 jogos conforme `legs`; a volta tem o mando invertido; toda
fase `p ≥ 1` só é sorteada depois de decidida a `p − 1`; o confronto decidido tem exatamente um
vencedor.

## Histórico e save

| Item | Forma |
|---|---|
| `CupHistoryEntry` | `{ number, year, competitionId, championId, runnerUpId, final: { home, away, score, decidedBy }, reached: Record<clubId, phaseIndex> }` |
| `save.cupHistory` | `CupHistoryEntry[]` (uma por edição encerrada de cada copa) |
| `save.formatVersion` | 13 (migração v12 → v13: `cupHistory: []`) |
| histórico do técnico | `ManagerStint`/temporada registra a fase alcançada na copa (campo opcional `cup?: { competitionId, phase, champion }`) |

## Sistemas

| Sistema | Acréscimo |
|---|---|
| Finanças | `LedgerEntry` de `prize` com `competitionId` e `date` (campos da 017); bilheteria neutra dividida |
| Torcida | `MoodFactor` + `cupOut`, `cupTitle`; regras `fans.cup` |
| Diretoria | `ConfidenceFactor` + `cupGoal`; `club.goals.cup?: { phase }`; regras `board.cup` |
| Notícias | `HeadlineType` + `cupUpset`, `cupElimination`, `cupFinal`, `cupChampion` |

## Transições (dia da copa)

```text
perna k da fase p (data D)
  ├─ ensurePhaseDrawn(p) se ainda não sorteada (vencedores de p−1 + entradas de p; R6, R7)
  ├─ startCareerDay / completeCareerDay: partida com `decider` na última perna do confronto
  ├─ registros ⇒ tieState; vencedores ⇒ prêmios do dia (R12); fatos de copa (R13)
  └─ a fase seguinte é sorteada no dia de sua primeira perna
fim da temporada: CupHistoryEntry; nova Season da copa (novo sorteio) na virada
```
