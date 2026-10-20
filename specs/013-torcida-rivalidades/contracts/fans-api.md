# Contrato: API do motor — `fans/` e rivalidades

Funções puras e determinísticas.

## Rivalidades

```ts
interface Rivalry { clubIds: [string, string]; intensity: 1 | 2 | 3 }
// ModPackage.rivalries?: Rivalry[]  (seção "rivalries", arquivo "rivalries.json", opcional)

function rivalriesOf(world: CompletedBank): Rivalry[];             // [] se ausente
function rivalryOf(world: CompletedBank, a: string, b: string): Rivalry | undefined;
function rivalsOf(world: CompletedBank, clubId: string): { clubId: string; intensity: number }[];
function isDerby(world: CompletedBank, fixture: { home: string; away: string }): boolean;

/** Rivalidades do banco padrão por regiões geradas (research.md R2). */
function generateRivalries(clubs: readonly Club[], seed: string | number): Rivalry[];
```

Validação (`validateBank`): seção `rivalries` com schema próprio; códigos novos
`rivalry.same_club` (`clubId`) e `rivalry.duplicate_pair` (`clubA`, `clubB`, `otherIndex`);
`ref.club_not_found` reusado com a seção `rivalries` e o caminho `[index, "clubIds", 0|1]`.

## Torcida

```ts
const DEFAULT_FANS: FansRules;
function fansRules(world: CompletedBank, competitionId: string): FansRules;
function createFans(world: CompletedBank, league: LeagueSeason): FansState;   // todos neutros
function moodBand(rules: FansRules, mood: number): MoodBand;
function idolsOf(world: CompletedBank, clubId: string, count: number): CompletedPlayer[];

/** Humor de todos os clubes depois de uma rodada fechada (R4, R6). */
function fansAfterRound(context: FansContext, round: number, managerClubId: string): FansState;
// FansContext = { world, league, finances, market?: MarketState (log da rodada) , fans }

function moodChange(context: FansContext, clubId: string, round: number): MoodChange; // peça testável
function gateMoodFactor(rules: FansRules, mood: number): number;

/** Etapa "fans-new-season", depois de "record-history" (R9). */
const fansNewSeasonStep: TurnoverStep;
```

## Integrações

```ts
interface CareerFans { state: FansState }
// completeCareerRound(league, finances, world, round, managerClubId, renewal?, market?, board?, fans?)
// advanceCareer(league, finances, world, step, managerClubId, lineups?, renewal?, market?, board?, fans?)
// CareerRoundResult ganha `fans?`; ordem: finanças (com humor) → mercado → torcida → diretoria.
// applyRoundFinances(finances, league, world, round, managerClubId, fans?)
// gateFor(finances, league, world, fixture, price, { noise?, mood? })
// nextHomeGateEstimate(finances, league, world, clubId, price, fans?)
// BoardContext ganha `fans?`; confidenceChange usa clássico e fator "fans" (research.md R7, R8).
// TurnoverOptions/Context/Result ganham `fans?`.
```

## Schema

`competition.fans` opcional (Zod, `.partial()`), campos de research.md R14; `competition.board`
ganha `derbyPct`.
