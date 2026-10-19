# Data Model: Finanças do clube

Tipos novos ou alterados. `LeagueSeason`, `Season`, `MatchRecord`, `SeasonHistoryEntry` seguem
como na 007. Valores monetários são inteiros na moeda do jogo.

## Motor (`@brasfoot-like/engine`, módulo `finance/`)

### ClubFinance

| Campo | Tipo | Regra |
|---|---|---|
| `clubId` | `string` | Clube da competição. |
| `cash` | `int` | Caixa atual; pode ser negativo. Sempre `saldo inicial da temporada + Σ lançamentos da temporada`. |
| `debt` | `int ≥ 0` | Dívida bancária; `≤ limite de crédito` no momento em que foi tomada. |
| `ticketPrice` | `int` | Dentro de `economy.priceRange`. Vale a partir do próximo jogo em casa. |
| `capacity` | `int` | Capacidade atual (inicial = `club.stadiumCapacity`); `≤ stadium.maxCapacity`. |
| `works` | `StadiumWorks?` | Obra em andamento (no máximo uma). |
| `negativeRounds` | `int ≥ 0` | Rodadas seguidas fechadas com caixa < 0. |
| `inCrisis` | `boolean` | `negativeRounds ≥ crisisRounds` até o caixa fechar uma rodada ≥ 0. |
| `seasonStartCash` | `int` | Caixa no início da temporada (para o resumo). |

### StadiumWorks

| Campo | Tipo | Regra |
|---|---|---|
| `seats` | `int > 0` | Aumento de capacidade (uma das opções do mod). |
| `cost` | `int > 0` | Pago à vista na contratação (lançamento `stadium`). |
| `remainingRounds` | `int ≥ 0` | Diminui 1 a cada rodada da liga fechada; em 0 a capacidade aumenta e a obra some. |

### LedgerEntry

`{ clubId, season: int, round: int (0 = virada/início), category, amount: int }` — `category ∈
gate | sponsorship | prize | loan_in | wages | interest | loan_out | stadium`; receitas positivas,
despesas negativas.

### GateRecord

`{ season, round, clubId (mandante), opponentId, attendance: int, capacity: int, price: int,
revenue: int }` — `attendance ≤ capacity`, `revenue = attendance × price`.

### FinanceSeasonSummary

`{ season: int (número da temporada), year: int, clubId, startCash, endCash, totals:
Record<category, int>, debtEnd, capacityEnd }` — `endCash = startCash + Σ totals`.

### CrisisRecord

`{ clubId, startSeason, startRound, endSeason?, endRound? }`.

### FinanceState

| Campo | Tipo | Regra |
|---|---|---|
| `clubs` | `Record<string, ClubFinance>` | Um por clube da competição. |
| `ledger` | `LedgerEntry[]` | Só da temporada atual (descartado na virada, R8). |
| `gates` | `GateRecord[]` | Só da temporada atual. |
| `seasons` | `FinanceSeasonSummary[]` | Histórico de todas as temporadas encerradas. |
| `crises` | `CrisisRecord[]` | Histórico de crises (abertas e fechadas). |

**Invariantes**: para todo clube, `cash = seasonStartCash + Σ ledger(clube)`; `Σ Δcash da rodada =
Σ lançamentos da rodada` (SC-005); `0 ≤ debt`; `capacity ≤ maxCapacity`.

**Transições por rodada** (`applyRoundFinances`, em ordem fixa, clubes por id):

```text
1. bilheteria de cada jogo da rodada (mandante)        → gate
2. folha da rodada de cada clube cuja divisão jogou     → wages
3. juros da dívida                                      → interest
4. obras: remainingRounds − 1; em 0, capacity += seats
5. crise: atualiza negativeRounds / inCrisis / crises
6. IA: preço (a cada 4 rodadas), crédito, obra          → loan_in / loan_out / stadium
```

**Virada** (etapas, R8): `pay-prizes` → `close-finance-season` → (calendários) → `pay-sponsorship`
→ `ai-finance-review`.

### EconomyRules (dados do mod, `competition.economy`, opcional)

| Campo | Padrão | Observação |
|---|---|---|
| `fansBase` | 16.000 | torcida = (fansBase + fansPerReputation × rep) × fanFactor |
| `fansPerReputation` | 50 | |
| `priceElasticityPct` | 150 | elasticidade × 100, múltiplo de 25 |
| `priceRange` | `{ min: 5, max: 200 }` | |
| `divisions[level].referencePrice` | A 12 · B 8 | |
| `divisions[level].fanFactorPct` | A 100 · B 70 | |
| `divisions[level].sponsorship` | A `{ base: 1.500.000, perReputation: 0, wageSharePct: 18 }` · B `{ 600.000, 0, 55 }` | calibrado (R10); `wageSharePct` = % da folha anual |
| `divisions[level].prizes` | A `{ first: 2.000.000, last: 300.000, title: 1.000.000 }` · B `{ 900.000, 150.000, 400.000 }` | |
| `divisions[level].creditBase` | A 2.000.000 · B 1.000.000 | |
| `credit` | `{ perReputation: 30.000, interestBp: 30 }` | |
| `stadium` | `{ maxCapacity: 100.000, options: [{2.000, 1.500.000, 6}, {5.000, 4.000.000, 12}, {10.000, 9.000.000, 20}] }` | `{seats, cost, rounds}` |
| `crisisRounds` | 10 | |
| `wageFactorPct` | 100 | multiplica `deriveWage` (calibração) |

Validação Zod: inteiros não negativos, `min ≤ max`, opções com valores > 0, divisões que existem.

## Save (`@brasfoot-like/save`) — formato v4

| Campo | v3 | v4 |
|---|---|---|
| `formatVersion` | 3 | 4 |
| `finances` | — | `FinanceState` |
| demais | | sem mudança |

**Migração v3 → v4**: `createFinances(bank, league)` (R12). **Validação**: todo clube da liga tem
`ClubFinance`; invariante de caixa vale; preços na faixa.
