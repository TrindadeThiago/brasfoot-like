# Data Model: Contratos e mercado de transferências

Valores monetários são inteiros na moeda do jogo; anos são anos de temporada (`LeagueSeason.year`).

## Contract (em `bank.players[].contract`, opcional no schema do mod)

| Campo | Tipo | Regra |
|---|---|---|
| `wage` | int ≥ 0 | salário mensal, múltiplo de 100 |
| `untilYear` | int | último ano de contrato; ≥ ano da temporada atual |
| `loan?` | `{ fromClubId, untilYear }` | presente durante empréstimo; `clubId` do jogador = clube que recebe |

- Duração ao assinar: `untilYear − ano atual + 1 ∈ [minYears, maxYears]` (≥ 33 anos: `[1, veteranMaxYears]`).
- Último ano: `untilYear === ano da temporada atual`.
- Em carreira (save v6) todo jogador do banco tem contrato (`ensureContracts`).

## FreeAgent (em `MarketState.freeAgents`)

| Campo | Tipo |
|---|---|
| `player` | jogador do banco sem `clubId` e sem `contract` |
| `lastClubId` | string |
| `sinceYear` | int — ano em que ficou livre |

## Negotiation

| Campo | Tipo | Regra |
|---|---|---|
| `id` | string | `neg-<seq>` |
| `playerId` | string | uma negociação aberta por atleta |
| `kind` | `buy` \| `loan` \| `free` \| `renew` | |
| `clubId` | string | clube do usuário |
| `fromClubId?` | string | `buy`/`loan` |
| `stage` | `club_offer` \| `club_countered` \| `contract` \| `player_demanded` | ver transições |
| `fee?` | int | oferta do usuário |
| `counterFee?` | int | contraproposta do clube |
| `agreedFee?` | int | taxa acertada |
| `wage?`, `years?` | int | proposta de contrato |
| `demandWage?` | int | pedido do atleta |
| `openedRound` | int | rodada em que abriu |

Transições (R8):

```text
buy/loan: club_offer ─aceita─▶ contract ─aceita─▶ concluída
              │ contraproposta        │ pedido
              ▼                       ▼
          club_countered ─aceita─▶  player_demanded ─aceita─▶ concluída
              │ recusa                │ recusa
              ▼                       ▼
          encerrada               encerrada
free/renew: começam em contract.
Recusa em club_offer, contract ou qualquer resposta "recusa" ⇒ encerrada.
```

## IncomingOffer

| Campo | Tipo |
|---|---|
| `id` | `off-<seq>` |
| `playerId`, `fromClubId` | string |
| `fee` | int |
| `kind` | `buy` |
| `expiresRound` | int |
| `countered?` | `{ fee }` — uma única contraproposta do usuário; a IA responde na hora |

## TransferRecord (log da temporada)

`{ season, round, playerId, displayName, kind: buy|loan|free|renew|sale|loan_out|expired|released, fromClubId?, toClubId?, fee, wage?, untilYear? }`
e desfechos de negociação encerrada `{ …, outcome: "refused_club" | "refused_player" | "rejected_by_user" | "expired" , reason? }`.

## MarketState (save v6, campo `market`)

| Campo | Tipo |
|---|---|
| `freeAgents` | `FreeAgent[]` (por id do jogador) |
| `negotiations` | `Negotiation[]` (abertas) |
| `incoming` | `IncomingOffer[]` (abertas) |
| `log` | `TransferRecord[]` (temporada atual) |
| `nextSeq` | int — próximo número de id de negociação/proposta |

## MarketRules (`competition.market` com padrões `DEFAULT_MARKET`)

| Campo | Padrão |
|---|---|
| `windows?` | início `{0,3}`, meio `{m−1, m+2}` (m = rodada central) |
| `contractYears` | `{ min: 1, max: 5, veteranAge: 33, veteranMax: 2 }` |
| `lastYearValuePct` / `twoYearsValuePct` | 60 / 85 |
| `club` | `{ counterThresholdPct: 70, keyPlayerPct: 125, noiseMinPct: 95, noiseMaxPct: 110, maxBidMinPct: 100, maxBidMaxPct: 120, loanFeePct: 10 }` |
| `player` | `{ demandThresholdPct: 80, interestMargin: 25, divisionBonus: [10, -10, -20] }` |
| `incoming` | `{ chancePct: 20, maxOpen: 3, expireRounds: 3, minPct: 85, maxPct: 110, cashBufferMonths: 6 }` |
| `freeAgents` | `{ maxSeasons: 1, retireAge: 33 }` |
| `ai` | `{ renewMaxAge: 31, renewTopN: 18 }` |

## Finanças (008)

- `LEDGER_CATEGORIES` ganha `transfer_purchase` (despesa) e `transfer_sale` (receita).
- `annualWageBill` usa `contract.wage` (fallback `deriveWage`).

## Validação

- Banco: `contract` opcional (`wage` ≥ 0, `untilYear` inteiro, `loan.fromClubId` clube existente e ≠ `clubId`).
- Save v6: todo jogador do banco com contrato; nenhum id em `freeAgents` também em `bank.players`;
  uma negociação por atleta; propostas só para jogadores do clube do usuário.
