# Data Model: Estaduais com duas divisões

Tudo é aditivo e opcional: bancos e saves sem estadual ficam idênticos aos de hoje.

## Pacote de mod / banco

### `competition.regional` (novo, opcional)

| Campo | Tipo | Regra |
|-------|------|-------|
| `region` | texto 1–40 | Igual ao `club.region` de todos os clubes das suas divisões |
| `weight.pct` | inteiro 0–200 | Peso base na diretoria e na torcida (padrão 100) |
| `weight.byReputation` | lista de `{ from, pct }` | `from` crescente na escala de reputação; opcional |

- Exige `countryId` presente. Nunca é a principal do país.
- Exige exatamente duas divisões (níveis 1 e 2), cada uma com `stages` (grupos → mata-mata) e a
  última fase eliminatória com a final em `legs: 2`.

### Divisão do estadual (campos já existentes)

| Campo | Uso |
|-------|-----|
| `clubIds` | Clubes da divisão (nacionais e regionais) |
| `stages` | Grupos (`groupSize`, `qualified`, `tiebreakers`, `draw`) e mata-mata (`legs`, `home`, `tiebreakers`) |
| `promotionSlots` | Só na 2ª: finalistas que sobem (padrão 2) |
| `relegationSlots` | Só na 1ª: piores da fase de grupos que caem |
| `berths` | Vagas para a copa nacional e a divisão nacional mais baixa (021), no lado destino |

### Clube

`club.region` (já existe) passa a ser obrigatório em países que declaram estaduais.

## Estado de jogo / save v18

### `RegionalEdition` (em `career.regionalHistory`, opcional)

| Campo | Tipo |
|-------|------|
| `season` | inteiro |
| `competitionId` | id |
| `divisions` | lista de `{ level, championId, runnerUpId, promotedIds, relegatedIds }` |

Compacto: só ids e posições. Entra no fim da temporada, antes da virada de composição.

### Meta `regional` (em `board.goals`, opcional)

| Campo | Tipo |
|-------|------|
| `kind` | `"regional"` |
| `target` | `{ stage, phase? }` ou `"title"` ou `"promotion"` |
| `weight` | calculado por `regionalWeightFor`, não guardado |

## Tipos derivados (não persistidos)

- `RegionalScope`: competição, região, divisões, clubes nacionais e regionais.
- `RegionalCampaign`: campanha do clube numa competição em fases (jogos, fase, o que falta).
- `RegionalWeight`: peso efetivo de um clube numa competição.
- `RegionalFact`: fato para manchete (título, vice, acesso, queda, eliminação, clássico).

## Regras de validação (semânticas, `regional.*`)

| Código | Condição |
|--------|----------|
| `regional.needs_country` | Competição regional sem `countryId` |
| `regional.divisions_count` | Não tem exatamente duas divisões |
| `regional.stages_missing` | Divisão sem grupos seguidos de mata-mata, ou final sem ida e volta |
| `regional.club_region` | Clube da divisão com região diferente da do estadual |
| `regional.club_country` | Clube da divisão de outro país |
| `regional.club_without_region` | País com estadual e clube sem `region` |
| `regional.duplicate_region` | Dois estaduais da mesma região no mesmo país |
| `regional.promotion_exceeds_knockout` | `promotionSlots` maior que os clubes que chegam ao mata-mata |
| `regional.weight_order` | `byReputation` fora de ordem crescente |
| `calendar.regional_after_national` | Estadual termina depois do início da competição principal do país |

Regras gerais que já valem para o estadual: `stages.group_size_mismatch`, `stages.knockout_count` e
`stages.qualify_mismatch` (grupos e fases fecham com o número de clubes);
`stages.relegation_exceeds_eliminated` (rebaixados saem dos eliminados nos grupos);
`division.slots_mismatch` (acesso da 2ª igual ao rebaixamento da 1ª), `division.top_has_promotion` e
`division.bottom_has_relegation`; `calendar.club_double_booked` (017).

## Transições

- **Fim da temporada**: grupos e mata-mata encerram → `finalOrder` por divisão → `nextComposition`
  troca os clubes entre divisões → 021 resolve vagas nacionais → `RegionalEdition` é registrada.
- **Início da temporada**: composição nova, sorteio de grupos por seed, calendário com o estadual
  antes das nacionais.
