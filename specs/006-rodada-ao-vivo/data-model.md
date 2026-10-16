# Data Model: Rodada ao vivo e telas da competição

**Feature**: `006-rodada-ao-vivo` | **Date**: 2026-10-16

API em [contracts/live-round-api.md](contracts/live-round-api.md). O save não muda (v2).

## LiveRound (motor, só em memória)

| Campo | Tipo | Regras |
|---|---|---|
| `round` | inteiro | número da rodada (= `season.nextRound` no início) |
| `tick` | inteiro | passos do relógio já dados (0 no início) |
| `matches` | `LiveMatch[]` | uma por confronto, na ordem do calendário |
| `decisions` | `RoundDecision[]` | decisões aplicadas, em ordem |

`LiveMatch`: `fixture` (Fixture), `state` (MatchState do motor), `sides` (`{ home, away }` →
clubId) e `prepared` (escalação, ausências e aviso de elenco curto de cada lado, como na
temporada). `tick` = maior `matchTicks(state)` entre as partidas.

Estados: `startRound` → (`advanceRound` | `applyRoundChange`)* → todas as partidas
`finished`/`abandoned` (`isRoundFinished`) → `completeRound` → nova `Season` com `nextRound + 1`.
`finishRound` = avançar até o fim.

## RoundDecision

| Campo | Tipo |
|---|---|
| `tick` | inteiro (tick em que foi aplicada) |
| `clubId` | string (clube do jogador) |
| `change` | `MatchChange` do motor (`substitution` \| `formation` \| `posture`) |

## Preferências da rodada (localStorage)

| Campo | Tipo | Padrão |
|---|---|---|
| `roundMode` | `"live" \| "direct"` | `"live"` |
| `roundSpeed` | `"slow" \| "normal" \| "fast"` | `"normal"` |
| `autoPause` | boolean | `true` |

## Estado no GameProvider

`GameState.live?: LiveRound` guarda a rodada preparada por `playRound("live")` até a tela da
rodada assumir; `simulateIssues` ganhou `mode` (ao vivo ou direto) para o "Jogar mesmo assim".

## Estado da tela da rodada (memória)

`{ live: LiveRound; paused: boolean; speed; feed: FeedItem[]; finished: boolean; summaryOpen }`.
`FeedItem` = evento do motor + partida, já com texto. A seleção da substituição usa o mesmo
modelo em dois passos da 005 (em campo → reserva).

## Derivados para as telas

- **Resumo da partida**: de `MatchRecord` (`score`, `events`, `stats`, `players`).
- **Resultados por rodada**: `season.calendar[r].fixtures` + `season.records` da rodada.
- **Artilharia**: `topScorers(season, 20)` e `topAssists(season, 20)` do motor.
- **Fim de temporada**: `standings(season, bank)`; campeão = 1º colocado.

## Textos de eventos (i18n)

Chave `event.<tipo>.<n>` com variações; `eventVariant(seed, seq, count)` escolhe `n` de forma
determinística. Parâmetros: `player`, `assist`, `club`, `minute`, `posture`, `formation`, `in`,
`out`.
