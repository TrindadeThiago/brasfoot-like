# Data Model: Mercado e finanças

Sem mudança em saves, dados de jogo ou preferências. Tudo é derivado em tempo de exibição.

## MarketRow (motor, existente)
- `playerId`, `displayName`, `position`, `age`, `strength`, `traits`, `clubId?`, `value`, `wage`, `untilYear?`, `onLoan`, `free`, `countryId?`. A lista é montada uma vez por save (`marketRows`).

## Comparison (UI)
- `Set<playerId>` com no máximo 4; `CompareTray` mostra os escolhidos; `ComparePanel` abre com 2 a 4.

## NegotiationTarget (UI, existente)
- `{ kind: "buy" | "loan" | "free" | "renew"; row: MarketRow }`; as respostas vêm de `Negotiation`/`NegotiationStep` do motor.

## FinanceSeries (UI, `game/finance-series.ts`)
- `balanceSeries`: `{ label, cash }[]` (por mês ou por rodada) ou `undefined` se a conciliação com `cash` falha.
- `monthlyFlows`: `{ month, income, expense }[]`.
- `breakdown`: `{ category, amount, percent }[]` para origem (`gate`, `sponsorship`, `prize`, `loan_in`, `transfer_sale`) e destino (`wages`, `interest`, `loan_out`, `stadium`, `transfer_purchase`).
- `debtSeries`: `{ label, debt }[]` ou `undefined` se a conciliação falha.
- `attendanceSeries`: `{ date, attendance, capacity, opponentId }[]` (de `gates`).
- `seasonHistory`: `{ season, year, startCash, endCash, totals, debtEnd }[]` + `crises`.
- Regra: cada série devolve `undefined` quando a conciliação com o save falha, e a tela mostra a tabela no lugar.

## ChartSummary (UI)
- Texto de resumo para leitor de tela e linhas da legenda `{ label, value, percent? }`; uma por gráfico.
