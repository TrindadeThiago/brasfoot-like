# Data Model: IA de transferências

## ClubNeeds (calculado, não persistido)

| Campo | Tipo | Regra |
|---|---|---|
| `clubId` | string | |
| `positions` | `Record<Position, PositionNeed>` | |
| `target` | number | força-alvo pela ambição (R2) |
| `meanAge` | number | idade média do elenco |
| `old` | boolean | `meanAge > oldSquadAge` |
| `budget` | int | caixa − reserva de salários; 0 em crise |
| `priorities` | `Position[]` | descobertas, depois fracas (maior déficit primeiro) |
| `surplus` | `string[]` | ids à venda/empréstimo (excesso, menor utilidade primeiro) |

### PositionNeed

`{ count, min, max, best, starter, uncovered: count < min, weak: starter < target − weakGap, excess: count > min + 2 || count > max }`

## AiMarketRules (`competition.market.aiMarket`, padrões `DEFAULT_AI_MARKET`)

Campos de research.md R12, todos inteiros (percentuais e frações como inteiros/escala por 100
onde necessário).

## WindowReport (save v7, `market.reports`)

| Campo | Tipo |
|---|---|
| `id` | `"<temporada>-<janela>"` |
| `season`, `year` | int |
| `window` | int — índice da janela na temporada |
| `transfers` | `ReportEntry[]` ordenados por relevância |

### ReportEntry

`TransferRecord` (010) + `strength`, `position`, `fromLevel?`, `toLevel?` (nível da divisão).

## MarketState (v7)

Campos da 010 + `reports: WindowReport[]` (máx. `keepReports`) e `reportSeen?: string`.

## Invariantes

- Nenhuma ação da IA envolve jogador do clube do humano, exceto propostas (`incoming`).
- Depois de qualquer ação: elencos em `[min, max]`, cada posição em `[positionMin, positionMax]`.
- Soma dos caixas inalterada por transferências; nenhuma compra acima do orçamento.
