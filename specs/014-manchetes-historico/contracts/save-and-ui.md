# Contrato: save v10, provider e telas

## Save v10

- `formatVersion: 10`; campo `news: NewsState`.
- `createSave`: `news = createNews()`.
- Migração v9 → v10: feed, recordes e acumulados vazios; `seasons` com uma entrada sem artilheiro
  por temporada já encerrada (research.md R10).
- `withRoundResult` e `advanceCareerSeason` gravam `news`; a rodada passa
  `{ state: save.news, careerSeed: save.seed }`.
- Validação: `feed` só com as duas últimas temporadas; cada rodada com no máximo `feedLimit`
  manchetes.
- Teste de tamanho `packages/save/test/size.test.ts` (research.md R11): 30 temporadas, início da 31ª
  ≤ 1,6 MB, crescimento médio ≤ 30 KB/temporada entre 10 e 30, última rodada ≤ 4,5 MB.

## Telas

| Onde | O quê |
|---|---|
| Início | cartão Manchetes: as 3 mais relevantes da última rodada + "Ver todas" |
| Notícias (`/jogo/noticias`, tecla J) | seletor de rodada (temporada atual e anterior), feed completo, resumo da temporada encerrada |
| Histórico › Temporadas | campeões por divisão e artilheiro de cada temporada (+ classificação, como hoje) |
| Histórico › Títulos | clubes por títulos de cada divisão |
| Histórico › Artilheiros | artilheiros históricos (gols, jogos, clube principal), aposentados incluídos |
| Histórico › Recordes | recordes da liga com valor, quem, contra quem e quando |
| Histórico › Clubes | seletor de clube: títulos, recordes do clube, lendas por gols e por jogos |
| Histórico | link para Carreira › Histórico (trajetória do técnico, 012) |

## i18n

`ui.json`: `news.<tipo>.<n>` (variações por tipo, ICU com plural), `news.extra.<tipo>`,
`news.title`, `news.round`, `news.season`, `news.empty`, `news.seeAll`, `news.summary.*`,
`nav.news`, `help.news`, `history.tab.*`, `history.titles.*`, `history.scorers.*`,
`history.records.*` (um texto por tipo de recorde), `history.clubs.*`, `history.legends.*`,
`history.managerLink`.
