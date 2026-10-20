# Data Model: Torcida e rivalidades

Regras em [research.md](research.md).

## Rivalry (banco/mod, `rivalries.json`)

| Campo | Tipo | Regra |
|---|---|---|
| `clubIds` | `[string, string]` | clubes existentes, diferentes |
| `intensity` | int 1–3 | 1 regional, 2 tradicional, 3 maior clássico |

Invariantes (validação): par sem repetição em qualquer ordem; `ModPackage.rivalries?` ausente =
lista vazia. Banco padrão: todo clube com 1 a 3 rivais.

## FansState (save v9, campo `fans`)

| Campo | Tipo |
|---|---|
| `clubs` | `Record<clubId, ClubFans>` — um por clube da competição |

### ClubFans

| Campo | Tipo | Regra |
|---|---|---|
| `mood` | int 0–100 | inicial `neutral` (50) |
| `recent` | `MoodChange[]` | só no clube do jogador; máx. `keepRecent` |

### MoodChange

`{ season, round, delta, value, factors: { kind: MoodFactor; amount }[] }` com
`MoodFactor = "win" | "draw" | "loss" | "derbyWin" | "derbyDraw" | "derbyLoss" | "belowExpectation" |
"aheadOfExpectation" | "calm" | "idolLost" | "starSigned" | "seasonStart"`.

## MoodBand (derivado)

`"furious" | "unhappy" | "neutral" | "happy" | "euphoric"` pelos limites `bands`.

## Ídolos (derivado, não guardado)

Os `idolCount` jogadores mais fortes do elenco atual do clube (desempate por id).

## ConfidenceFactor (012, ampliado)

Novos valores: `derbyWin`, `derbyDraw`, `derbyLoss`, `fans`.

## FansRules (`competition.fans`, padrões `DEFAULT_FANS`)

Campos de research.md R14.

## Invariantes

- Todo clube da competição tem `ClubFans`; `mood` em [0, 100].
- Mesmo estado + mesma seed ⇒ mesmo humor (clubes em ordem de id; nenhuma aleatoriedade nova).
