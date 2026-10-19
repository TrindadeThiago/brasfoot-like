# Data Model: Evolução, aposentadoria e renovação do mundo

## Mundo vivo (`CompletedBank` do save)

Sem mudança de forma; muda o conteúdo ao longo da carreira (research.md R2):

- `players[].strength` evolui (sempre `20 ≤ força ≤ potencial`, ≤ 99);
- jogadores aposentados ou dispensados saem de `players`;
- jovens novos entram com `id` `jogador-NNNNN` sequencial, `birthDate` coerente com 16–18 anos na
  data da temporada, `hidden` completo (`potential > strength`);
- `manifest.referenceDate` acompanha a temporada (etapa `advance-year`), para que as idades dos
  jogadores gerados sigam válidas pelo schema do banco; o jogo só usa dia e mês dela.

### Country (alterado no formato do mod)

| Campo | Tipo | Regra |
|---|---|---|
| `names` | `{ firstNames: string[]; surnames: string[] }?` | Novo, opcional. Ao menos 20 nomes e 20 sobrenomes, cada um com 1–30 caracteres. |

## Motor (`@brasfoot-like/engine`, módulo `renewal/`)

### RegulatorState

| Campo | Tipo | Regra |
|---|---|---|
| `strengthOffset` | `number` | Somado à força base dos jovens; `−8 ≤ x ≤ 8`. |
| `potentialBonus` | `number` | Somado à margem de potencial dos jovens; `−5 ≤ x ≤ 10`. |
| `lastMeasure` | `WorldMeasure?` | Última medida (para depuração e tela futura). |

### WorldMeasure

`{ players, mean, p10, p50, p90, max, stars, meanAge }` — calculada sobre os jogadores dos clubes da
competição na data da temporada; `stars` = força ≥ 80.

### EvolutionRecord

`{ season: number; moment: "mid" | "end"; deltas: Record<playerId, number>; minutes:
Record<playerId, number> }` — última evolução aplicada (para a coluna do elenco).

### SquadChangeNotice

`{ season: number; clubId; retired: PlayerRef[]; arrived: PlayerRef[]; released: PlayerRef[];
promoted: PlayerRef[]; risers: PlayerDelta[]; fallers: PlayerDelta[] }` com
`PlayerRef = { playerId, displayName, position, age, strength }` (cópia, porque aposentados e
dispensados já não existem no mundo) e `PlayerDelta = PlayerRef & { delta }`.

### RenewalState

| Campo | Tipo | Regra |
|---|---|---|
| `nextPlayerSeq` | `int` | Próximo número de id de jogador; maior que todos os existentes. |
| `regulator` | `RegulatorState` | |
| `lastEvolution` | `EvolutionRecord?` | |
| `squadNotice` | `SquadChangeNotice?` | Do clube do jogador; some quando dispensado. |

### Regras (constantes versionadas no motor: `EVOLUTION_RULES`, `RETIREMENT_RULES`, `YOUTH_RULES`, `SQUAD_RULES`, `REGULATOR_RULES`)

Valores iniciais em research.md R4–R8; calibrados pelo teste de 30 temporadas.

**Ordem por evolução** (determinística, jogadores por id):

```text
para cada jogador da competição: minutos do período → delta (R4) → força nova
```

**Etapas da virada** (R11): `evolve-players` → `retire-players` → `regulate-world` →
`generate-youth` → `balance-squads`.

## Save (`@brasfoot-like/save`) — formato v5

| Campo | v4 | v5 |
|---|---|---|
| `formatVersion` | 4 | 5 |
| `renewal` | — | `RenewalState` |
| `bank` | cópia do mod | mundo vivo da carreira (mesma forma) |

**Migração v4 → v5**: `renewal = initialRenewal(bank)`. **Validação**: banco válido (mesmo schema e
regras semânticas), `nextPlayerSeq` maior que os ids existentes, clube do jogador com elenco
dentro das regras.
