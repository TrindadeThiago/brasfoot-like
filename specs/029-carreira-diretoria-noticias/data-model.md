# Modelo de dados: Carreira, diretoria e notícias

Nenhum dado persistido muda. Tudo abaixo são visões derivadas, calculadas na hora a partir do save.

## Visões de Carreira (`apps/web/src/game/board-view.ts`)

| Visão | Campos | Origem |
|---|---|---|
| `GoalRow` | `kind` (`sport`, `finance`, `continental`, `regional`), `status` (`onTrack`, `atRisk`, `inProgress`, `met`, `missed`) | `goalProgress` e `goals.continental/regional.result` |
| `ConfidenceLevel` | `high` (≥ 60), `medium` (30 a 59), `low` (< 30) | valor da confiança e as faixas do medidor atual |
| `Trend` | `up`, `flat`, `down` | soma das três últimas mudanças (já existe em `confidenceTrend` e `trendOf`) |
| `ReasonRow` | `kind`, `amount` | `recent[].factors` da confiança e da torcida, mais novos primeiro |
| `RoundChange` | `round`, `value`, `delta`, `factors` | `club.recent` da confiança, da mais nova à mais antiga |

Regras de derivação: ver research R3. Cada `status` e `Trend` tem texto e símbolo; a cor só reforça.

## Visões de Notícias (`apps/web/src/game/news-view.ts`)

| Visão | Campos | Origem |
|---|---|---|
| `HeadlineCompetition` | id da competição ou `undefined` ("Geral") | `vars.competition`, a liga principal, ou nada (R6) |
| `NewsGroup` | `id` (`mine`, id de competição ou `general`), `name`, `headlines` | `groupHeadlines` |
| `NewsFilter` | `scope` (`all`, `mine`), `competition` (id ou nenhum) | estado local da tela |
| `RoundNav` | rodada anterior e próxima (ou nenhuma) | lista `save.news.feed` |

Regras: uma manchete `mine` está em "Do seu clube" e na seção da sua competição; as contagens saem da lista agrupada; `Geral` só aparece se tiver manchetes.

## Estado da tela (local, não persistido)

- Carreira: aba aberta (`?aba=`) e a divisão escolhida em Técnicos.
- Notícias: rodada escolhida e `NewsFilter`.

## Validação

- Nenhuma entrada nova de usuário. Toda visão é função pura do save; o teste de cada uma cobre os casos de borda do spec (sem metas, sem motivos, sem competição, primeira e última rodada).
