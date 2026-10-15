# Contrato: códigos de problemas de validação

Cada problema: `{ severity, code, section, path, entityId?, params }`. A mensagem é produzida
pelo i18n a partir de `code` + `params` (ICU MessageFormat). Toda linha abaixo precisa de mensagem
pt-BR e de ao menos um caso de teste (SC-003, SC-006).

Todos os códigos são **erros** (rejeitam o banco), exceto os marcados como **aviso**.

## Estruturais (fase 1 — schemas)

| Código | Quando | Params |
|---|---|---|
| `schema.required` | campo obrigatório ausente | `field` |
| `schema.unknown_field` | **aviso**: campo não previsto (descartado) | `field` |
| `schema.invalid_type` | tipo errado | `field`, `expected`, `received` |
| `schema.out_of_range` | número fora da faixa | `field`, `min`, `max`, `value` |
| `schema.invalid_length` | texto/lista com tamanho fora da faixa | `field`, `min`, `max`, `length` |
| `schema.invalid_format` | id, data, cor, sigla, semver mal formados | `field`, `format`, `value` |
| `schema.invalid_value` | valor fora do catálogo (posição, característica, forma, desempate) | `field`, `value`, `allowed` |
| `schema.not_integer` | número não inteiro | `field`, `value` |

## Formato e versão

| Código | Quando | Params |
|---|---|---|
| `manifest.unsupported_format_version` | `formatVersion` não suportada | `found`, `supported` |
| `format.unsupported` | `format.type` reservado (`knockout`, `groups`) | `type` |
| `format.points_order` | não vale `win > draw ≥ loss` | `win`, `draw`, `loss` |
| `format.duplicate_tiebreaker` | critério de desempate repetido | `tiebreaker` |

## Unicidade e referências

| Código | Quando | Params |
|---|---|---|
| `unique.duplicate_id` | id repetido no banco | `id`, `otherSection`, `otherIndex` |
| `unique.duplicate_abbreviation` | sigla de clube repetida | `abbreviation`, `otherClubId` |
| `unique.duplicate_country_code` | código de país repetido | `code`, `otherCountryId` |
| `ref.country_not_found` | `countryId`/`nationalityId` inexistente | `field`, `countryId` |
| `ref.club_not_found` | `clubId` (jogador ou divisão) inexistente | `clubId` |

## Competições e divisões

| Código | Quando | Params |
|---|---|---|
| `division.levels_not_contiguous` | níveis não formam 1..n | `levels` |
| `division.club_count` | divisão fora de 4–40 clubes | `count`, `min`, `max` |
| `division.duplicate_club` | clube repetido na mesma divisão | `clubId` |
| `division.club_in_multiple` | clube em mais de uma divisão | `clubId`, `otherCompetitionId`, `otherLevel` |
| `division.top_has_promotion` | nível 1 com `promotionSlots > 0` | `slots` |
| `division.bottom_has_relegation` | último nível com `relegationSlots > 0` | `slots` |
| `division.slots_mismatch` | rebaixados(n) ≠ promovidos(n+1) | `level`, `relegated`, `nextLevel`, `promoted` |
| `division.slots_exceed_clubs` | promovidos + rebaixados > clubes | `level`, `slots`, `clubs` |

## Clubes e jogadores

| Código | Quando | Params |
|---|---|---|
| `squad.size` | elenco fora de 16–40 | `clubId`, `count`, `min`, `max` |
| `squad.min_goalkeepers` | menos de 2 goleiros | `clubId`, `count`, `min` |
| `player.potential_below_strength` | potencial < força | `potential`, `strength` |
| `player.duplicate_trait` | característica repetida | `trait` |
| `player.age_out_of_range` | idade na data de referência fora de 15–45 | `age`, `min`, `max` |

## Leitura de arquivos (adaptador, fora do motor)

| Código | Quando | Params |
|---|---|---|
| `file.missing` | arquivo obrigatório ausente no diretório do mod | `file` |
| `file.invalid_json` | JSON malformado | `file`, `line`, `column` |

Os erros `file.*` são produzidos pelo script/adaptador que lê o disco, mas usam o mesmo tipo
`ValidationIssue` e o mesmo catálogo de mensagens.

## Exemplos de mensagens pt-BR

- `ref.club_not_found` → "O jogador {entityId} referencia o clube {clubId}, que não existe."
- `schema.out_of_range` → "O campo {field} vale {value}, mas deve estar entre {min} e {max}."
- `squad.min_goalkeepers` → "O clube {clubId} {count, plural, =0 {não tem goleiros} one {tem apenas # goleiro} other {tem apenas # goleiros}}; o mínimo é {min}."
