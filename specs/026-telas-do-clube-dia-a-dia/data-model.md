# Data Model: Telas do clube — Início, Elenco e Escalação

Sem mudança em saves, dados de jogo ou formato de preferências.

## PlayerRow (UI, Elenco)
- Derivada de `CompletedPlayer` + `lineupContext(save)`: posição, nome, idade, força, características, situação (disponível, lesionado, suspenso, pendurado, emprestado), lugar na escalação (titular(posição), reserva, fora), condição (0–100), evolução e ano do contrato.
- Filtros (`SquadSector`, `SquadAvailability`) e ordenação continuam em `preferences` (`squadFilter`, `squadSort`).

## PlayerModalData (UI)
- `player` (bank), `country`, `condition` (`clubUnavailability`), `stats` (`seasonStats`), `row: MarketRow` (de `marketRowOf`: `wage`, `value`, `untilYear`, `onLoan`).
- Ações habilitadas: Renovar (não emprestado, não em rodada ao vivo), Vender e Rescindir (não em rodada ao vivo; regras do `DisposalDialog`).
- Estados: `closed → open → (selling | terminating | renewing) → open|closed`.

## MarketRow (motor, existente)
- `marketRowOf(context, playerId): MarketRow | undefined` — mesma forma e valores de `marketRows(context)` para o jogador.

## HomeBlock (UI, Início)
- `NextMatch`: adversário, competição, mando, data, rodada, forma recente; ou estado alternativo (temporada acabada, sem mais jogos).
- `Notice[]`: board, jobOffers, squadChange, market, lineupAdjusted, crisis.
- `Standing`, `Results`, `Fans`, `BoardGoals`, `Headlines` com os dados atuais.

## LineupScreenState (UI, Escalação)
- Estado existente (`source`, `focused`, `details`, `message`) inalterado; `outside` (lesionados/suspensos) com motivo e jogos restantes.
