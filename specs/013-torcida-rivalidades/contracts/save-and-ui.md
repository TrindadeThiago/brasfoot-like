# Contrato: banco padrão, save v9, provider e telas

## Banco padrão

- `mods/default/rivalries.json` gerado por `pnpm gen:default-bank` (mesma seed; demais arquivos
  inalterados); `mods/default/package.json` exporta o arquivo.
- Carregadores do banco (web `default-bank.ts`, `tools/src/fs-bank.ts`, fixtures de teste) passam a
  incluir `rivalries.json` quando existir.

## Save v9

- `formatVersion: 9`; campo `fans: FansState`.
- `createSave`: `fans = createFans(bank, league)`.
- Migração v8 → v9: `fans` neutros; banco `manifest.id === "default"` sem rivalidades recebe
  `generateRivalries(bank.clubs, DEFAULT_SEED)`.
- Rodada (`withRoundResult`) e virada (`advanceCareerSeason`) gravam `fans`.
- Validação do save: todo clube da liga tem `ClubFans` com humor em [0, 100].

## Provider

`commitRound` passa `{ state: save.fans }` a `completeCareerRound`. Sem ações novas.

## Telas

| Onde | O quê |
|---|---|
| Início | cartão Torcida: faixa, valor (medidor), tendência, 3 motivos; selo "Clássico" no próximo jogo |
| Calendário | selo "Clássico" nos jogos contra rivais |
| Rodada ao vivo e resultados da rodada | selo "Clássico" nos jogos entre rivais |
| Carreira › Torcida | humor e motivos recentes; rivais do clube (nome, divisão, intensidade) |
| Finanças | estimativa de bilheteria com o humor (automático) |

## i18n

`ui.json`: `fans.*` (título, faixas, tendência, fatores, rivais, intensidade 1–3), `derby.*`
(selo, rótulo acessível), `career.tab.fans`, `board.factor.derbyWin/derbyDraw/derbyLoss/fans`.
`errors.json`: `rivalry.same_club`, `rivalry.duplicate_pair`.
