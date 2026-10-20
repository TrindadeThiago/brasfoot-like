# Contrato: API do motor — `board/`

Funções puras e determinísticas. `BoardContext` = `{ world, league, finances, board,
careerSeed }`; o clube do jogador vem de `board.manager.clubId`.

## Regras e criação

```ts
const DEFAULT_BOARD: BoardRules;
function boardRules(world: CompletedBank, competitionId: string): BoardRules;

/** Diretorias de todos os clubes, técnicos da IA e metas da temporada atual. */
function createBoard(
  world: CompletedBank,
  league: LeagueSeason,
  finances: FinanceState,
  careerSeed: string,
  manager?: { clubId: string; noFiring: boolean; reputation?: number; graceToSeasonEnd?: boolean },
): BoardState; // sem `manager`: todos os clubes da IA (simulações)

/** Clube do jogador para as chamadas do motor: "" quando desempregado (R3). */
function managerClubOf(board: BoardState): string;
```

## Metas

```ts
function goalTiersFor(world, league, level: number): { tier: GoalTierId; position: number }[];
function expectationOf(context: BoardContext, clubId: string): number;      // posto na divisão
function seasonGoals(context: BoardContext, clubId: string, coachReputation: number,
  options?: { midSeason?: boolean }): SeasonGoals;
function goalProgress(context: BoardContext, clubId: string): GoalProgress | undefined;
```

Garantia: para clubes A e B da mesma divisão, `expectation(A) < expectation(B)` ⇒ nível de A
igual ou mais exigente que o de B, para a mesma reputação do técnico (FR-007, SC-001).

## Rodada

```ts
/** Confiança de todos os clubes, demissões, vagas, propostas e expirações; avaliação quando a
 *  liga termina nesta rodada. Clubes em ordem de id. */
function boardAfterRound(context: BoardContext, round: number): BoardUpdate;

interface BoardUpdate {
  board: BoardState;
  /** Jogador perdeu o clube nesta rodada (demissão). */
  managerReleased?: string;
}

interface CareerBoard { state: BoardState; careerSeed: string }
// completeCareerRound(league, finances, world, round, managerClubId, renewal?, market?, board?)
// advanceCareer(league, finances, world, step, managerClubId, lineups?, renewal?, market?, board?)
// Com `board`, o managerClubId efetivo é managerClubOf(board.state) e pode mudar no meio de um
// advanceCareer (demissão); CareerRoundResult ganha `board?: BoardState`. Ao liberar o clube do
// jogador, a rodada aplica releaseManagerClub ao mercado.
```

Peças testáveis isoladamente:

```ts
function confidenceChange(context, clubId, round, coachReputation): ConfidenceChange;
function shouldFireMidSeason(context, clubId, round, rng?): boolean;   // rng só para a IA
function evaluateSeason(context, clubId, round): SeasonEvaluation | undefined;
function reputationDelta(input: ReputationInput): number;
function compatibleClub(rules, managerReputation, clubReputation, currentClubReputation?): boolean;
function hireCoach(draft: BoardState, context, clubId, rng): Coach; // altera o rascunho
```

## Ações do jogador

```ts
type BoardError = { code: "board.offer_not_found" | "board.offer_expired"; params: Record<string, string | number> };

/** Aceita: jogador assume na próxima rodada; demais propostas descartadas; clube deixado passa à IA. */
function acceptJobOffer(context: BoardContext & { market: MarketState }, offerId: string, rng: Rng):
  { ok: true; board: BoardState; market: MarketState; previousClubId?: string } | { ok: false; error: BoardError };
function declineJobOffer(board: BoardState, offerId: string): BoardState;
function dismissBoardNotice(board: BoardState): BoardState;
```

## Virada

```ts
/** Etapa "board-new-season", registrada depois de "reset-market": contrata para vagas, metas da
 *  nova temporada, confiança inicial, garantia de proposta ao desempregado, limpa a avaliação. */
const boardNewSeasonStep: TurnoverStep;
// TurnoverContext/TurnoverOptions/TurnoverResult ganham `board?: BoardState`.
```

## Mercado

```ts
/** Cancela negociações abertas do clube (motivo "manager_left") e descarta propostas recebidas. */
function releaseManagerClub(context: MarketContext, clubId: string): MarketState;
```

## Schema

`competition.board` opcional em `competitionSchema` (Zod, `.partial()`), campos de research.md R17.
