# Contrato: códigos de erro do motor de partida

Cada erro: `{ code, side?, params }`. Mensagem pt-BR via `formatMatchError` (ICU). Toda linha
precisa de mensagem e de ao menos um caso de teste (SC-004).

## Entrada da partida (`startMatch`)

| Código | Quando | Params |
|---|---|---|
| `input.same_club` | mandante e visitante são o mesmo clube | `clubId` |
| `input.invalid_option` | `substitutionLimit`/`benchLimit` fora da faixa | `option`, `value`, `min`, `max` |
| `lineup.unknown_formation` | esquema fora do catálogo | `formation` |
| `lineup.slots_mismatch` | vagas dos titulares ≠ vagas do esquema | `expected`, `received` |
| `lineup.duplicate_player` | jogador repetido entre titulares/banco | `playerId` |
| `lineup.player_not_in_squad` | jogador fora do elenco do clube | `playerId` |
| `lineup.player_in_both_teams` | jogador nas duas escalações | `playerId` |
| `lineup.bench_too_large` | banco maior que o limite | `count`, `max` |
| `lineup.player_unavailable` | jogador indisponível escalado | `playerId` |

## Mudanças (`applyChange`)

| Código | Quando | Params |
|---|---|---|
| `change.match_finished` | partida encerrada | — |
| `change.not_started` | partida ainda não iniciada | — |
| `change.limit_reached` | substituições esgotadas | `limit` |
| `change.player_not_on_field` | quem sai não está em campo | `playerId` |
| `change.player_not_on_bench` | quem entra não está no banco | `playerId` |
| `change.player_unavailable` | quem entra está indisponível | `playerId` |
| `change.unknown_slot` | vaga inexistente no esquema atual | `slotId` |
| `change.invalid_assignment` | redistribuição do novo esquema não cobre exatamente os jogadores em campo | `formation` |

## Escalação automática (`autoLineup`)

| Código | Quando | Params |
|---|---|---|
| `auto_lineup.not_enough_players` | menos de 11 jogadores disponíveis | `available`, `required` |

## Exemplos pt-BR

- `change.limit_reached` → "O time já fez as {limit} substituições permitidas."
- `lineup.slots_mismatch` → "{side, select, home {Mandante: } away {Visitante: } other {}}a escalação preenche {received} vagas, mas o esquema tem {expected}." (erros de escalação começam pelo time)
- `auto_lineup.not_enough_players` → "Há apenas {available, plural, one {# jogador disponível} other {# jogadores disponíveis}}; são necessários {required}."
