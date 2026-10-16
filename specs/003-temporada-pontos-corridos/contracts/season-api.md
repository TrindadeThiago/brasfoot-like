# Contrato: API da temporada

Exportado por `packages/engine/src/index.ts`. Funções puras: não mutam a entrada, sem I/O nem
relógio. Tipos em [data-model.md](../data-model.md).

## Calendário

```ts
function generateCalendar(clubIds: readonly string[], turns: number, seed: string | number): Round[];
```

## Temporada

```ts
type CreateSeasonResult = { ok: true; season: Season } | { ok: false; error: SeasonError };
function createSeason(world: CompletedBank, options: SeasonOptions): CreateSeasonResult;

type SeasonStep = { rounds: number } | { toEnd: true };
type AdvanceSeasonResult = { ok: true; season: Season } | { ok: false; error: SeasonError };
function advanceSeason(
  season: Season,
  world: CompletedBank,
  step: SeasonStep,
  lineups?: Record<string, Lineup>,   // só vale para a próxima rodada (FR-008)
): AdvanceSeasonResult;

function isSeasonOver(season: Season): boolean;
function unavailablePlayers(season: Season, clubId: string, world?: CompletedBank): string[];
function fixtureSeed(seed: string | number, round: number, home: string, away: string): string;
function preferredFormation(squad: readonly CompletedPlayer[]): FormationId;
function applyMatchToStatus(status, record, side, rules, seed): void;   // disciplina (R7)
function injuryDuration(severity: InjurySeverity, seed, round: number, playerId: string): number;
```

Garantias:

- `advanceSeason(s, w, { toEnd: true })` ≡ avançar de 1 em 1 rodada (SC-001).
- `JSON.parse(JSON.stringify(season))` continua igual.
- Avançar uma temporada encerrada devolve o mesmo estado.
- `lineups` com jogador indisponível ou inválida pelo motor de partida → erro, estado inalterado.

## Tabela e estatísticas

```ts
function standings(season: Season, world: CompletedBank): StandingRow[];
function seasonStats(season: Season): PlayerSeasonStats[];
function topScorers(season: Season, limit?: number): PlayerSeasonStats[];
function topAssists(season: Season, limit?: number): PlayerSeasonStats[];
```

## Credibilidade

```ts
const SEASON_CREDIBILITY_LIMITS: { ... };   // FR-030 a FR-037
function clubStrength(world: CompletedBank, clubId: string): number;   // média dos 16 melhores
function seasonReport(season: Season, world: CompletedBank): SeasonReport;
function spearman(a: readonly number[], b: readonly number[]): number;
function aggregateCredibility(reports: readonly SeasonReport[]): CredibilityCheck[];
```

## Erros

```ts
interface SeasonError { code: SeasonErrorCode; params: Record<string, string | number> }
const SEASON_ERROR_CODES: readonly SeasonErrorCode[];
const SEASON_ERROR_PARAMS: Record<SeasonErrorCode, readonly string[]>;
```

---

# Contrato: i18n

```ts
function formatSeasonError(error: SeasonError, locale: Locale): string;
```

Mensagens em `packages/i18n/locales/pt-BR/season-errors.json`.

---

# Contrato: CLI

```bash
pnpm sim:season [--seed <seed>] [--seasons <n>]
```

- Sem `--seasons`: tabela final, 10 artilheiros, resumo de cartões/suspensões/lesões e
  relatório de credibilidade da temporada (FR-040).
- Com `--seasons N`: relatório agregado de FR-030 a FR-037 com valor, faixa e ✓/✗; código de
  saída 1 se algum falhar (FR-041).
- Divisão: a de nível 1 da primeira competição do banco padrão.
