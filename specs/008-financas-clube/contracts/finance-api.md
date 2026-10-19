# Contrato: finanças no motor (`packages/engine/src/finance/`)

Funções puras exportadas por `@brasfoot-like/engine`. Nenhuma altera a entrada. Tipos em
[data-model.md](../data-model.md).

## Regras e estado inicial

```ts
/** Regras econômicas da competição: `competition.economy` com os padrões preenchidos. */
function economyRules(world: CompletedBank, competitionId: string): EconomyRules;

/**
 * Finanças iniciais da carreira: caixa = initialCash, preço padrão, capacidade do banco, sem dívida,
 * obra ou crise; lança o patrocínio da temporada atual (rodada 0).
 */
function createFinances(world: CompletedBank, league: LeagueSeason): FinanceState;

/** Folha anual do clube (12 × Σ salários × wageFactorPct). */
function annualWageBill(world: CompletedBank, clubId: string, referenceDate: string): number;
```

## Rodada

```ts
/**
 * Movimentação de uma rodada já fechada na liga (ordem fixa, data-model.md): bilheteria, folha,
 * juros, obras, crise e decisões da IA. `managerClubId` não recebe decisões da IA.
 */
function applyRoundFinances(
  finances: FinanceState,
  league: LeagueSeason,         // liga depois de completeLeagueRound
  world: CompletedBank,
  round: number,
  managerClubId: string,
): FinanceState;

/** completeLeagueRound + applyRoundFinances, num passo (ao vivo e direto usam este caminho). */
function completeCareerRound(
  league: LeagueSeason,
  finances: FinanceState,
  world: CompletedBank,
  round: LiveRound,
  managerClubId: string,
): { ok: true; league: LeagueSeason; finances: FinanceState } | { ok: false; error: SeasonError };

/** Equivalente de advanceLeague com finanças (simulações e testes). */
function advanceCareer(
  league: LeagueSeason, finances: FinanceState, world: CompletedBank, step: SeasonStep,
  managerClubId: string, lineups?: Record<string, Lineup>,
): { ok: true; league: LeagueSeason; finances: FinanceState } | { ok: false; error: SeasonError };
```

## Bilheteria

```ts
interface GateEstimate { attendance: number; capacity: number; price: number; revenue: number }

/** Público e renda de um jogo em casa (R5). `noise: false` dá a estimativa sem variação. */
function gateFor(
  finances: FinanceState, league: LeagueSeason, world: CompletedBank,
  fixture: { home: string; away: string; seed: string }, price: number, options?: { noise?: boolean },
): GateEstimate;

/** Estimativa do próximo jogo em casa do clube com um preço (FR-017); nada se não houver. */
function nextHomeGateEstimate(
  finances: FinanceState, league: LeagueSeason, world: CompletedBank, clubId: string, price: number,
): GateEstimate | undefined;
```

## Ações do clube (jogador e IA usam as mesmas)

```ts
type FinanceResult = { ok: true; finances: FinanceState } | { ok: false; error: FinanceError };

function setTicketPrice(finances: FinanceState, world: CompletedBank, competitionId: string, clubId: string, price: number): FinanceResult;
function takeLoan(finances: FinanceState, league: LeagueSeason, world: CompletedBank, clubId: string, amount: number): FinanceResult;
function repayLoan(finances: FinanceState, league: LeagueSeason, clubId: string, amount: number): FinanceResult;
function startStadiumWorks(finances: FinanceState, league: LeagueSeason, world: CompletedBank, clubId: string, optionIndex: number): FinanceResult;

/** Limite de crédito e disponível agora. */
function creditLine(finances: FinanceState, league: LeagueSeason, world: CompletedBank, clubId: string):
  { limit: number; available: number; interestBp: number; interestPerRound: number };
```

## Virada

`seasonTurnover(league, world, history, options)` passa a receber e devolver `finances`
(`options.finances`; resultado `{ league, history, finances }`). Etapas padrão novas:
`pay-prizes` (depois de `record-history`), `close-finance-season` (depois de `pay-prizes`),
`pay-sponsorship` (depois de `generate-calendars`), `ai-finance-review` (depois de
`pay-sponsorship`). `TurnoverContext` ganha `finances` e `managerClubId?`.

## Resumos para a tela

```ts
/** Totais por categoria da temporada atual do clube, e saldo inicial. */
function seasonFinanceSummary(finances: FinanceState, clubId: string):
  { startCash: number; cash: number; totals: Record<LedgerCategory, number> };
```

## Erros (`FinanceErrorCode`, textos em `packages/i18n/locales/pt-BR/finance-errors.json`)

| Código | Parâmetros | Quando |
|---|---|---|
| `finance.price_out_of_range` | `price`, `min`, `max` | preço fora da faixa |
| `finance.invalid_amount` | `amount` | valor ≤ 0 ou não inteiro |
| `finance.credit_limit` | `amount`, `available` | empréstimo acima do disponível |
| `finance.insufficient_cash` | `amount`, `cash` | amortização ou obra sem caixa |
| `finance.no_debt` | — | amortizar sem dívida |
| `finance.works_in_progress` | `remainingRounds` | já há obra |
| `finance.max_capacity` | `capacity`, `max` | obra passaria do máximo |
| `finance.unknown_option` | `index` | opção de obra inexistente |
