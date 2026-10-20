# Contrato: API do motor — `market/`

Exportado por `@brasfoot/engine` (via `index.ts`). Funções puras: nunca alteram a entrada;
respostas determinísticas por `careerSeed`. Tipos em [data-model.md](../data-model.md).

## Contexto comum

```ts
interface MarketContext {
  world: CompletedBank;          // mundo vivo (contratos nos jogadores)
  league: LeagueSeason;          // temporada atual (ano, rodada jogada, divisões)
  finances: FinanceState;
  market: MarketState;
  managerClubId: string;
  careerSeed: string;
}

interface MarketUpdate {         // retorno das ações que mudam estado
  world: CompletedBank;
  finances: FinanceState;
  market: MarketState;
  /** Jogadores que saíram do clube do usuário (para ajustar a escalação). */
  departed: string[];
}

type MarketResult<T> = { ok: true; value: T } | { ok: false; error: MarketError };
// MarketError.code ∈ market.window_closed | market.insufficient_cash | market.squad_full |
//   market.squad_minimum | market.player_on_loan | market.already_negotiating |
//   market.invalid_duration | market.invalid_amount | market.not_found | market.invalid_stage
// params: { opensAtRound?, needed?, … } para as mensagens de errors.json
```

## Regras, contratos e valor

```ts
const DEFAULT_MARKET: MarketRules;
function marketRules(world: CompletedBank, competitionId: string): MarketRules;
function initialContract(player, club, year: number, rng: Rng, rules): Contract;
function ensureContracts(world, year: number, careerSeed: string): CompletedBank; // só gera os que faltam
function isLastYear(contract: Contract, year: number): boolean;
function marketValue(player, world, year: number, referenceDate: string): number; // 0 para livre
```

## Janelas

```ts
function transferWindows(league: LeagueSeason, rules: MarketRules): { fromRound: number; toRound: number }[];
function isWindowOpen(league: LeagueSeason, rules: MarketRules): boolean;
function nextWindowRound(league: LeagueSeason, rules: MarketRules): number | undefined; // undefined = próxima temporada
```

## Busca e comparação

```ts
interface PlayerFilters {
  positions?: Position[]; strength?: [number, number]; age?: [number, number];
  maxValue?: number; maxWage?: number; contractUntilMax?: number;
  scope?: "all" | "clubs" | "free"; excludeClubId?: string; text?: string;
}
interface MarketRow {           // só atributos visíveis (nunca hidden)
  playerId; displayName; position; age; strength; traits; clubId?: string;
  value: number; wage: number; untilYear?: number; onLoan: boolean; free: boolean;
}
function searchPlayers(ctx: MarketContext, filters: PlayerFilters,
  sort?: { key: keyof MarketRow; dir: "asc" | "desc" }): MarketRow[];
function comparePlayers(ctx: MarketContext, ids: string[]): MarketRow[]; // 2..4 ids
```

## Negociação (usuário)

```ts
function startNegotiation(ctx, input:
  | { kind: "buy" | "loan"; playerId: string; fee: number }
  | { kind: "free" | "renew"; playerId: string }):
  MarketResult<{ update: MarketUpdate; negotiation: Negotiation; response?: ClubResponse }>;
// buy/loan: valida janela, atleta não emprestado, limites; resposta imediata do clube.

type ClubResponse = { kind: "accepted" } | { kind: "countered"; fee: number } | { kind: "refused"; reason: "low_offer" | "squad_minimum" | "key_player" };

function answerClubCounter(ctx, negotiationId: string, accept: boolean): MarketResult<{ update: MarketUpdate }>;

function proposeContract(ctx, negotiationId: string, offer: { wage: number; years: number }):
  MarketResult<{ update: MarketUpdate; response: PlayerResponse }>;
type PlayerResponse = { kind: "accepted" } | { kind: "demanded"; wage: number } | { kind: "refused"; reason: "no_interest" | "low_wage" };
// accepted ⇒ efeitos aplicados (compra/empréstimo/livre/renovação) em `update`.

function answerPlayerDemand(ctx, negotiationId: string, accept: boolean): MarketResult<{ update: MarketUpdate }>;
function cancelNegotiation(ctx, negotiationId: string): MarketUpdate;
```

Garantias: no máximo uma contraproposta por lado (estados únicos, R8); nenhum dinheiro move antes
da conclusão; conclusão revalida janela (exceto livre/renovação), caixa e limites de elenco.

## Propostas recebidas

```ts
function marketAfterRound(ctx): MarketUpdate;
// chamada pelo save após completeCareerRound: expira propostas/negociações de clube fora da
// janela ou vencidas e gera novas propostas da IA (R10).
function answerIncomingOffer(ctx, offerId: string,
  answer: { kind: "accept" } | { kind: "refuse" } | { kind: "counter"; fee: number }):
  MarketResult<{ update: MarketUpdate; response?: "accepted" | "refused" }>;
```

## Virada

Etapas registradas em `DEFAULT_TURNOVER_STEPS` (R12): `return-loans`, `expire-contracts`,
`age-out-free-agents`, `reset-market`; `balance-squads` envia dispensados para livres quando
`context.market` existe. `TurnoverOptions.market?`/`TurnoverContext.market?`/`TurnoverResult.market?`.

## Finanças

`LEDGER_CATEGORIES` + `transfer_purchase`, `transfer_sale`; `annualWageBill` lê `contract.wage`.
