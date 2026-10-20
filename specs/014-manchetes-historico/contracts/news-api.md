# Contrato: API do motor — `news/`

Funções puras e determinísticas; o motor só produz tipos e variáveis.

## Regras e estado

```ts
const DEFAULT_NEWS: NewsRules;
function newsRules(world: CompletedBank, competitionId: string): NewsRules;
function createNews(): NewsState;                         // feed, recordes e acumulados vazios
function variantOf(rules: NewsRules, careerSeed: string, key: string, type: HeadlineType): number;
```

## Rodada

```ts
interface NewsContext {
  world: CompletedBank;
  league: LeagueSeason;            // com a rodada já fechada
  news: NewsState;
  careerSeed: string;
  managerClubId: string;           // "" quando desempregado
  market?: MarketState;            // log da rodada (transferências)
  boardBefore?: BoardState;        // diff de técnicos (012)
  boardAfter?: BoardState;
  fans?: FansState;                // ídolos/clássicos (013)
}

/** Detecta os fatos da rodada, atualiza recordes e grava o feed da rodada (research.md R2–R5). */
function newsAfterRound(context: NewsContext, round: number): NewsState;

// Peças testáveis
function matchFacts(context: NewsContext, record: MatchRecord): Headline[];   // hatTrick, rout, comeback, upset, derby, result
function streakOf(season: Season, clubId: string, round: number): { kind: "win" | "loss" | "winless"; length: number };
function clinched(context: NewsContext, round: number): Headline[];           // título/acesso/rebaixamento matemáticos
function updateRecords(records: Records, candidates: RecordCandidate[]): { records: Records; broken: Headline[] };
function rankFeed(rules: NewsRules, headlines: Headline[], managerClubId: string): Headline[]; // agrupa por jogo, ordena, limita

interface CareerNews { state: NewsState; careerSeed: string }
// completeCareerRound(…, board?, fans?, news?) e advanceCareer(…, board?, fans?, news?)
// CareerRoundResult ganha `news?`; a notícia roda por último (vê diretoria e torcida já atualizadas).
```

## Virada

```ts
/** Etapa "news-new-season", depois de "record-history": artilheiros, acumulados (com poda), recordes
 *  de temporada, resumo da temporada e poda do feed. */
const newsNewSeasonStep: TurnoverStep;
// TurnoverOptions/Context/Result ganham `news?`.
```

## Consultas para a interface

```ts
function titlesByClub(history: SeasonHistoryEntry[]): { clubId: string; level: number; titles: number }[];
function allTimeScorers(news: NewsState, limit: number): { playerId: string; name: string; goals: number; matches: number }[];
function clubLegends(news: NewsState, clubId: string, limit: number): { byGoals: Legend[]; byMatches: Legend[] };
function headlinesOf(news: NewsState, season: number, round: number): Headline[];
function latestFeed(news: NewsState): RoundFeed | undefined;
```

## Schema

`competition.news` opcional (Zod, `.partial()`), campos de research.md R12.
