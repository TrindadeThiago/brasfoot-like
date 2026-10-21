# Contrato: API do motor (mata-mata)

Funções puras de `@brasfoot-like/engine`; nenhuma usa `Date` nem aleatoriedade fora do PRNG com
seed (Princípio II). Tipos em [data-model.md](../data-model.md).

## Partida (`match/`)

```ts
// MatchInput ganha `decider?: Decider`. Sem ele, startMatch/advanceMatch/simulateMatch são
// exatamente os de hoje.
startMatch(input): StartResult
advanceMatch(state, { minutes } | { toEnd: true }): MatchState   // passos: minutos (até 120) + cobranças
matchResult(state): MatchResult                                   // + decision?

shootoutOrder(state, side): string[]                // cobradores (R9)
penaltyChance(kicker, keeper): number               // probabilidade de gol
```

- Garantia: com `decider`, `advanceMatch(..., { toEnd: true })` termina sempre em `finished` com
  `decision`, e ao vivo (passo a passo) = direto (mesmo estado final).
- `matchTicks(state)` conta os passos da prorrogação e das cobranças.
- Substituições: o limite sobe em 1 ao começar a prorrogação.

## Copa (`knockout/`)

```ts
createCupSeason(world, options): { ok: true; season: Season } | { ok: false; error: SeasonError }
ensurePhaseDrawn(season, world, phase): Season       // sorteia a fase se preciso (idempotente)
drawPhase(participants, rules, seed): { home: string; away: string }[]   // R6, R7 (cabeças: n/4)
drawReady(season, world): Season                     // sorteia todas as fases prontas
tieState(season, phaseIndex, tieId): TieState
phaseParticipants(season, world, phase): string[]
phaseWinners(season, phase): string[]
cupChampion(season): { championId: string; runnerUpId: string } | undefined
deciderFor(world, season, fixture): Decider | undefined     // só na última perna do confronto
cupPrizes(world, season, dayMatches): { clubId: string; amount: number; phase: number; date: string }[]
cupEvents(world, season, dayMatches): CupEvent[]     // eliminações e título do dia (torcida, diretoria, manchetes)
cupEnd(world, season, dayMatches): CupEnd | undefined // desfecho quando a final foi jogada
cupEntry(league): CupHistoryEntry | undefined
cupReached(season): Record<string, number>           // fase mais alta alcançada por clube
```

## Integrações alteradas

| Função | Mudança |
|---|---|
| `createCareerSeason` | cria a `Season` eliminatória das competições `knockout` |
| `calendarCompetitions` | `rounds = Σ legs`, `gapWeeks`, participantes da divisão da copa |
| `startCareerDay` / `completeCareerDay` | `ensurePhaseDrawn` antes do jogo; `decider` da última perna; prêmios do dia |
| `prepareFixture` (season) | repassa `decider` ao `MatchInput` (campo neutro com `MatchInput.neutral`) |
| `applyExtraGates` / `applyCupPrizes` | renda neutra dividida entre os dois clubes; prêmios na categoria `prize` |
| `roundMatches` / `DayMatch` | inclui `decision` no `record` |
| `fansAfterCup`, `boardAfterCup`, `newsAfterCup` | fatores e fatos de copa (eliminação, título, meta de copa, zebra, final) |
| `seasonTurnover` | `CupHistoryEntry` por copa encerrada; nova `Season` da copa (novo sorteio) |
| `validateBank` | regras `knockout.*` (R3) |
| `generateDefaultBank` | opção `cup?: boolean` (padrão `false`) |

## Erros novos (`errors.json`, ICU)

| Código | Parâmetros |
|---|---|
| `knockout.phase_count` | `phase`, `count`, `delta` (sobra/falta para fechar) |
| `knockout.entry_phase` | `phase`, `phases` |
| `knockout.entry_duplicate` | `clubId` |
| `knockout.entry_not_participant` | `clubId` |
| `knockout.no_decider` | `phase` |
| `knockout.neutral_two_legs` | `phase` |
| `knockout.single_division` | `divisions` |
