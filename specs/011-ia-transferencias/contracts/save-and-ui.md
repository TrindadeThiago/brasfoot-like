# Contrato: save v7, provider e telas

## Save v7

- `formatVersion: 7`; `market.reports: WindowReport[]`, `market.reportSeen?: string`.
- Migração v6 → v7: `reports = []`.
- Rodada (`commitRound`): `completeCareerRound` com `{ state: save.market, careerSeed: save.seed }`;
  grava `market` do resultado (substitui a chamada separada a `marketAfterRoundOf`).
- `dismissWindowReport(save)`: `reportSeen = reports.at(-1)?.id`.

## GameProvider

Ação nova `dismissWindowReport()`.

## Telas

| Onde | O quê |
|---|---|
| Mercado › Resumo da janela | última janela: 15 transferências mais relevantes (jogador, posição, força, de → para, tipo, valor) e, à parte, as da divisão do jogador; seletor das janelas guardadas |
| Início | aviso "Resumo da janela disponível" com link para a aba, até dispensar |

## i18n

`ui.json`: `market.tab.report`, `market.report.*` (título, janela, colunas, vazio, divisão,
aviso, dispensar), `market.report.kind.*`.
