# Contrato: API do motor — `market/ai/`

Funções puras e determinísticas; reusam `MarketContext`/`MarketUpdate` da 010.

## Regras e necessidades

```ts
const DEFAULT_AI_MARKET: AiMarketRules;
function aiMarketRules(world: CompletedBank, competitionId: string): AiMarketRules;
function clubNeeds(context: MarketContext, clubId: string): ClubNeeds;
```

## Rodada da IA

```ts
/** Uma rodada de decisões dos clubes da IA (clubes em ordem de id). Janela aberta: compras,
 *  empréstimos de jovens e vendas de excedentes; qualquer rodada: livres por carência. */
function aiMarketRound(context: MarketContext): MarketUpdate;

interface CareerMarket { state: MarketState; careerSeed: string }
// completeCareerRound(league, finances, world, round, managerClubId, renewal?, market?)
// advanceCareer(league, finances, world, step, managerClubId, lineups?, renewal?, market?)
// CareerRoundResult ganha `market?: MarketState`; a rodada aplica aiMarketRound e marketAfterRound.
```

Garantias: nunca toca jogadores do `managerClubId`; respeita janela, orçamento, limites de elenco e
teto por posição; transferências conservam a soma dos caixas.

## Peças (testáveis isoladamente)

```ts
function purchaseTarget(context, needs: ClubNeeds, position: Position): CompletedPlayer | undefined;
function sellerAccepts(context, player: CompletedPlayer, buyerId: string): boolean;
function youthLoan(context, clubId: string): { playerId: string; toClubId: string } | undefined;
function freeAgentFor(context, needs: ClubNeeds): FreeAgent | undefined;
function aiRenewalDecision(context: TurnoverContext, clubId: string, expiring: CompletedPlayer[]): Set<string>; // ids renovados
function incomingOfferFor(context, rng): Omit<IncomingOffer, "id" | "expiresRound"> | undefined;
```

## Resumo da janela

```ts
function closeWindowReport(context: MarketContext, window: number): MarketState; // grava em reports
function reportHighlights(report: WindowReport, limit: number): ReportEntry[];
function reportForDivision(report: WindowReport, level: number): ReportEntry[];
```

## Teto por posição

`positionMax` em `DEFAULT_AI_MARKET`; `canAddPlayer(world, clubId, position?)` passa a checar o
teto quando a posição é informada; `balanceSquads` libera acima do teto.
