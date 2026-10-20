# Data Model: Carreira do técnico e diretoria

Tudo em `BoardState` (save v8, campo `board`). Valores inteiros. Regras em
[research.md](research.md).

## BoardState

| Campo | Tipo | Regra |
|---|---|---|
| `manager` | `ManagerProfile` | técnico do jogador |
| `clubs` | `Record<clubId, ClubBoard>` | um por clube da competição |
| `coaches` | `Coach[]` | técnicos da IA (empregados e pool de livres) |
| `vacancies` | `Vacancy[]` | vagas abertas |
| `offers` | `JobOffer[]` | propostas ao jogador (pendentes e recentes) |
| `evaluation?` | `SeasonEvaluation` | última avaliação do jogador, até a virada |
| `notice?` | `BoardNotice` | demissão/assunção a mostrar na Início até dispensar |
| `history` | `ManagerHistory` | passagens e temporadas do técnico |
| `nextSeq` | int | ids de técnicos, vagas e propostas |

## ManagerProfile

| Campo | Tipo | Regra |
|---|---|---|
| `reputation` | int 1–100 | inicial `initialReputation` (R9) |
| `noFiring` | boolean | gravado na criação; imutável |
| `clubId` | `string \| null` | `null` = desempregado; para o motor vira `""` (R3) |
| `hired?` | `{ season, round }` | rodada da contratação (carência) |
| `graceUntil?` | `{ season, round }` | carência explícita (migração) |
| `firedBy?` | `{ clubId, season }` | impede proposta do mesmo clube na temporada |

## ClubBoard

| Campo | Tipo | Regra |
|---|---|---|
| `clubId` | string | |
| `coachId` | `string \| null` | técnico da IA; `null` se é o clube do jogador ou está vago |
| `goals?` | `SeasonGoals` | ausentes antes da primeira virada em save migrado com liga encerrada |
| `confidence` | int 0–100 | |
| `hired` | `{ season, round }` | carência |
| `recent` | `ConfidenceChange[]` | só no clube do jogador; máx. `keepRecent` |

## SeasonGoals

| Campo | Tipo |
|---|---|
| `season` | int |
| `round` | int — rodadas jogadas quando as metas foram definidas |
| `sport` | `{ tier: GoalTierId; position: int; expectation: int; midSeason?: boolean }` |
| `finance` | `{ kind: "nonNegativeCash" \| "keepCash" \| "noCrisis"; startCash: int }` |

`GoalTierId = "title" | "promotion" | "top4" | "topHalf" | "avoidRelegation" | "avoidBottom"`.

## ConfidenceChange

`{ season, round, delta, value, factors: { kind: ConfidenceFactor; amount }[] }` com
`ConfidenceFactor = "win" | "draw" | "loss" | "belowGoal" | "aheadOfGoal" | "crisis" |
"financeGoal" | "seasonStart" | "hired"`.

## GoalProgress (calculado, não persistido)

`{ sport: { required, current, met: boolean }, finance: { kind, met: boolean, cash, startCash, inCrisis } }`.

## SeasonEvaluation

| Campo | Tipo |
|---|---|
| `season`, `clubId` | |
| `sport` | `{ tier, required, final, met }` |
| `finance` | `{ kind, met }` |
| `finalConfidence` | int |
| `decision` | `"kept" \| "fired" \| "wouldFire"` |
| `reputationBefore`, `reputationAfter` | int |
| `achievements` | `("title" \| "promotion" \| "relegation")[]` |

## Coach (IA)

`{ id: "coach-<seq>", name, reputation (1–100), clubId: string | null }`. Livres: `clubId = null`,
máx. `maxFreeCoaches`.

## Vacancy

`{ id, clubId, season, round, considered: boolean, offerId?: string }` — `considered` = já passou
pelo sorteio de proposta; removida quando preenchida.

## JobOffer

| Campo | Tipo |
|---|---|
| `id`, `clubId` | |
| `season`, `round` | criação |
| `expiresRound` | `round + offerRounds` (na virada: rodada `offerRounds` da nova temporada) |
| `goals` | `SeasonGoals` esperadas (R5) |
| `status` | `"pending" \| "accepted" \| "declined" \| "expired"` |

Só as pendentes e as da temporada atual ficam guardadas.

## ManagerHistory

- `stints: Stint[]` — `{ clubId: string | null, from: { season, round }, to?: { season, round },
  exit?: "fired" | "left" | "offerAccepted" }`; `clubId: null` = período sem clube.
- `seasons: ManagerSeasonRecord[]` — `{ season, year, clubId, level, position, goals: { sportTier,
  sportMet, financeKind, financeMet }, achievements, reputation, decision }`; uma por clube
  treinado na temporada (troca no meio gera duas, só a do clube final avaliada), mais uma sem clube
  se terminou desempregado.

## BoardRules (`competition.board`, padrões `DEFAULT_BOARD`)

Campos de research.md R17.

## Transições

```text
Empregado ──(confiança ≤ fireThreshold, fora da carência, !noFiring)──► Desempregado
Empregado ──(avaliação: confiançaFinal < endFireThreshold, !noFiring)─► Desempregado
Empregado ──(aceita proposta)──────────────────────────────────────────► Empregado (outro clube)
Desempregado ──(aceita proposta)───────────────────────────────────────► Empregado
JobOffer: pending ──► accepted | declined | expired
Vacancy: aberta ──► preenchida (jogador aceitou | IA após vacancyRounds/expiração)
```

## Invariantes

- `manager.clubId` não é `null` ⇒ `clubs[manager.clubId].coachId === null` e `save.clubId ===
  manager.clubId`.
- Todo clube da IA tem `coachId` de um `Coach` com `clubId` igual, ou uma `Vacancy` aberta.
- Cada `Coach` treina no máximo um clube; no máximo uma vaga por clube.
- `reputation` em [1, 100]; `confidence` em [0, 100].
- `noFiring` ⇒ nenhuma transição para desempregado por demissão.
- No máximo `maxOpenOffers` propostas `pending`; nenhuma do clube atual nem de `firedBy` na
  mesma temporada.
- Última `Stint` sem `to` corresponde ao estado atual (clube ou sem clube).
