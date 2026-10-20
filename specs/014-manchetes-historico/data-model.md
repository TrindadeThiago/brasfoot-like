# Data Model: Manchetes e histórico

Tudo em `NewsState` (save v10, campo `news`). Regras em [research.md](research.md).

## NewsState

| Campo | Tipo | Regra |
|---|---|---|
| `feed` | `RoundFeed[]` | temporada atual e anterior; ordem (temporada, rodada) |
| `records` | `Records` | recordes da liga e por clube |
| `allTime` | `AllTime` | acumulados por jogador, podados (R8) |
| `seasons` | `SeasonNews[]` | uma por temporada encerrada |

## RoundFeed

`{ season, round, headlines: Headline[] }` — `round: 0` guarda o resumo da temporada anterior.
Máx. `feedLimit` manchetes.

## Headline

| Campo | Tipo |
|---|---|
| `id` | `"<temporada>-<rodada>-<n>"` |
| `type` | `HeadlineType` (research.md R3) |
| `relevance` | int |
| `variant` | int — índice da variação (0..variants−1) |
| `clubIds` | string[] (o principal primeiro) |
| `playerIds` | string[] |
| `vars` | `Record<string, string | number>` — placar, adversário, sequência, recorde anterior… |
| `extras?` | `{ type, vars }[]` — fatos complementares do mesmo jogo (máx. `extrasPerMatch`) |
| `mine` | boolean — envolve o clube do jogador |

`HeadlineType = "result" | "hatTrick" | "rout" | "comeback" | "upset" | "derby" | "streak" |
"droughtEnd" | "record" | "coachFired" | "coachHired" | "managerFired" | "managerHired" |
"bigTransfer" | "titleClinched" | "promotionClinched" | "relegationConfirmed" | "seasonSummary"`.

## Records

- `league: Partial<Record<LeagueRecordKind, RecordEntry>>`,
  `LeagueRecordKind = "biggestWin" | "mostGoalsMatch" | "mostPlayerGoalsSeason" |
  "mostPointsSeason" | "longestWinStreak"`.
- `clubs: Record<clubId, Partial<Record<ClubRecordKind, RecordEntry>>>`,
  `ClubRecordKind = "biggestWin" | "biggestLoss" | "mostPlayerGoalsSeason" | "mostPointsSeason"`.

### RecordEntry

`{ value, secondary?, clubId?, opponentId?, playerId?, playerName?, score?: [int, int], season,
year, round? }`. Superado só com `value` estritamente maior (ou igual com `secondary` maior, quando
definido).

## AllTime

`players: Record<playerId, { name, goals, matches, clubs: Record<clubId, { goals, matches }> }>` —
poda na virada: ativo no banco **ou** top `allTimeTop` da liga **ou** top `legendsPerClub` de algum
clube (gols ou jogos).

## SeasonNews

`{ season, year, scorers: { level, playerId?, name?, clubId?, goals }[] }` — artilheiro por
divisão; vazio para temporadas anteriores à migração.

## Derivados (não guardados)

- **Títulos por clube**: contagem de `history[].divisions[].championId` por nível.
- **Lendas do clube**: top `legendsPerClub` de `allTime` por gols e por jogos no clube.
- **Artilheiros históricos**: top `allTimeTop` de `allTime` por gols.

## NewsRules (`competition.news`, padrões `DEFAULT_NEWS`)

Campos de research.md R12.

## Invariantes

- Toda rodada jogada com o técnico empregado tem ao menos uma manchete `mine`.
- Nenhuma rodada com mais de `feedLimit` manchetes; nenhum jogo com mais de uma manchete principal.
- `feed` só tem temporadas `≥ atual − 1`.
- Recorde atualizado só quando superado; manchete `record` sempre com o recorde anterior em `vars`.
