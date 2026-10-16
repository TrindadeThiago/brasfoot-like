# Contrato: códigos de erro da temporada

`{ code, params }`, mensagem pt-BR via `formatSeasonError`. Toda linha precisa de mensagem e de um
caso de teste (SC-006).

| Código | Quando | Params |
|---|---|---|
| `season.unknown_competition` | competição inexistente | `competitionId` |
| `season.unknown_division` | divisão inexistente na competição | `competitionId`, `level` |
| `season.unsupported_format` | formato não é pontos corridos | `format` |
| `season.too_few_clubs` | divisão com menos de 2 clubes | `count` |
| `season.invalid_rules` | regra disciplinar fora da faixa | `rule`, `value`, `min`, `max` |
| `season.lineup_unavailable` | escalação externa com jogador indisponível | `clubId`, `playerId` |
| `season.invalid_lineup` | escalação externa rejeitada pelo motor de partida | `clubId`, `matchErrorCode` |
| `season.lineup_not_playing` | escalação externa para clube que não joga a próxima rodada | `clubId`, `round` |

Exemplos pt-BR:

- `season.lineup_unavailable` → "A escalação do clube {clubId} inclui {playerId}, que está suspenso ou lesionado."
- `season.too_few_clubs` → "A divisão tem {count, plural, one {# clube} other {# clubes}}; são necessários ao menos 2."
