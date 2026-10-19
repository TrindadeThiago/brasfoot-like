# Contrato: save v5, nomes no mod e telas (009)

## Save v5 (`packages/save`)

- `SAVE_FORMAT_VERSION = 5`; `SaveFile.renewal: RenewalState`; `bank` é o mundo vivo.
- `createSave`: `renewal = initialRenewal(bank)`.
- Rodada (app): `completeCareerRound(..., save.renewal, save.seed)` → grava `league`, `finances`,
  `bank` (mundo) e `renewal`; escalação ajustada se um jogador sumir (não acontece no meio da
  temporada, só na virada).
- `advanceCareerSeason`: passa `world: save.bank` e `renewal`; grava o mundo e o estado devolvidos;
  ajusta a escalação (aposentados/dispensados saem; `lineupNotice` registra as trocas).
- `dismissSquadNotice(save)`: remove `renewal.squadNotice`.
- **Migração v4 → v5**: `renewal = initialRenewal(bank)`; o resto igual. Fixtures v4 (meio de
  temporada e encerrada); cadeia v1 → v5.

## Nomes no formato do mod

`countries.json`: campo opcional `names: { firstNames: string[], surnames: string[] }` (≥ 20 cada,
1–30 caracteres). O banco padrão grava os nomes do gerador no país fictício. Validação: códigos
`country.names_too_few` (`kind`, `count`, `min`) com mensagem em `errors.json`.

## Telas

- **Elenco** (`/jogo/elenco`): nova coluna "Evolução" com `+N`/`−N`/`=` desde a última evolução
  (de `renewal.lastEvolution`), ordenável; detalhes do jogador mostram a mesma variação.
- **Início** da nova temporada: cartão "Mudanças no elenco" (`renewal.squadNotice`) com
  aposentados, chegadas (jovens), dispensas, promoções por reposição, até 5 maiores altas e quedas;
  botão "Dispensar".
- Textos em `packages/i18n/locales/pt-BR/ui.json` (`renewal.*`, `col.evolution`).
