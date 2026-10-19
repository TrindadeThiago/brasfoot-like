# Contrato: temporada da liga e virada no motor (`packages/engine/src/career/`)

Funções puras, exportadas por `@brasfoot-like/engine` (`src/index.ts`). Nenhuma altera a entrada.
Tipos em [data-model.md](../data-model.md). As funções por `Season` da 003/006 (`createSeason`,
`advanceSeason`, `startRound`, `completeRound`, `standings`, `seasonStats`…) continuam públicas e
inalteradas, exceto pelas opções novas de `createSeason`.

## Temporada da liga

```ts
interface LeagueSeasonOptions {
  competitionId: string;
  careerSeed: string;
  /** Padrão 1. */
  number?: number;
  /** Padrão: ano de manifest.referenceDate. */
  year?: number;
  /** Composição por nível; padrão: a do banco. */
  composition?: Record<number, string[]>;
  /** Situação inicial dos jogadores (lesões herdadas). */
  status?: Record<string, PlayerStatus>;
  rules?: Partial<DisciplineRules>;
}

type LeagueResult = { ok: true; league: LeagueSeason } | { ok: false; error: SeasonError };

/** Uma Season por divisão da competição, todas com a seed da temporada (R3). */
function createLeagueSeason(world: CompletedBank, options: LeagueSeasonOptions): LeagueResult;

/** Seed da temporada `number` de uma carreira (R3). */
function leagueSeasonSeed(careerSeed: string, number: number): string;

/** Rodada atual da liga (1..R) ou R + 1 se encerrada. */
function leagueRound(league: LeagueSeason): number;
function isLeagueSeasonOver(league: LeagueSeason): boolean;

/** Season da divisão de um nível, ou da divisão que contém o clube. */
function divisionSeason(league: LeagueSeason, level: number): Season | undefined;
function clubDivision(league: LeagueSeason, clubId: string): Season | undefined;

/** Vagas de acesso/rebaixamento da divisão, para marcar a classificação (FR-006). */
function divisionZones(world: CompletedBank, competitionId: string, level: number): DivisionZones;
```

## Rodada da liga (R2)

```ts
/**
 * Prepara a rodada atual de todas as divisões não encerradas numa única LiveRound; cada
 * LiveMatch traz divisionLevel. `lineups` (escalação externa por clube) vale para o clube de
 * qualquer divisão; clube que não joga a rodada → season.lineup_not_playing.
 */
function startLeagueRound(
  league: LeagueSeason,
  world: CompletedBank,
  lineups?: Record<string, Lineup>,
): { ok: true; round: LiveRound } | { ok: false; error: SeasonError };

/** Fecha a rodada em cada divisão (completeRound por divisão) e devolve a liga avançada. */
function completeLeagueRound(
  league: LeagueSeason,
  world: CompletedBank,
  round: LiveRound,
): LeagueResult;

/** Equivalente de advanceSeason para a liga: N rodadas ou até o fim, mesmo caminho do ao vivo. */
function advanceLeague(
  league: LeagueSeason,
  world: CompletedBank,
  step: SeasonStep,
  lineups?: Record<string, Lineup>,
): LeagueResult;
```

`advanceRound`, `applyRoundChange`, `finishRound`, `isRoundFinished` e `matchOf` funcionam sem
mudança sobre a `LiveRound` da liga.

**Garantias**: `advanceLeague(l, w, { rounds: 1 }, x)` ≡ `completeLeagueRound(l, w,
finishRound(startLeagueRound(l, w, x).round))`; a parte de cada divisão em `completeLeagueRound`
é idêntica a `completeRound` aplicado à `Season` daquela divisão com as mesmas partidas.

## Virada de temporada (R5)

```ts
interface TurnoverOptions {
  careerSeed: string;
  /** Etapas extras (sistemas futuros); padrão nenhuma. */
  extraSteps?: readonly TurnoverRegistration[];
}

type TurnoverResult =
  | { ok: true; league: LeagueSeason; history: SeasonHistoryEntry[] }
  | { ok: false; error: SeasonError };

/** Etapas padrão, na ordem fixa documentada. */
const DEFAULT_TURNOVER_STEPS: readonly TurnoverStep[];
/** Ids estáveis das etapas padrão. */
const TURNOVER_STEP_IDS: readonly [
  "record-history",
  "promotion-relegation",
  "advance-year",
  "reset-season-stats",
  "generate-calendars",
];

/** Ordem final das etapas (padrão + extras), ou erro turnover.invalid_steps. */
function resolveTurnoverSteps(
  extras?: readonly TurnoverRegistration[],
): { ok: true; steps: TurnoverStep[] } | { ok: false; error: SeasonError };

/**
 * Executa a virada sobre uma liga encerrada (senão turnover.season_not_over). Determinística:
 * mesma liga + mesmo histórico + mesmas etapas ⇒ mesmo resultado.
 */
function seasonTurnover(
  league: LeagueSeason,
  world: CompletedBank,
  history: readonly SeasonHistoryEntry[],
  options: TurnoverOptions,
): TurnoverResult;

/** Composição da próxima temporada a partir das classificações finais (R4), exposta para testes e UI. */
function nextComposition(
  league: LeagueSeason,
  world: CompletedBank,
): { composition: Record<number, string[]>; promoted: Record<number, string[]>; relegated: Record<number, string[]> };
```

## Data da temporada (R6)

```ts
/** referenceDate com o ano trocado; 29/02 vira 28/02 em ano não bissexto. */
function seasonDate(referenceDate: string, year: number): string;
```

## Erros novos (`SeasonErrorCode`, com parâmetros e textos em `season-errors.json`)

| Código | Parâmetros | Quando |
|---|---|---|
| `season.invalid_composition` | `level`, `reason` | `clubIds`/`composition` com clube inexistente, repetido, fora da competição ou tamanho errado |
| `turnover.season_not_over` | `round` | virada pedida com rodadas por disputar |
| `turnover.invalid_steps` | `stepId`, `reason` | id duplicado ou âncora inexistente |
| `turnover.invalid_result` | `reason` | etapa extra deixou a nova liga violando invariantes |
