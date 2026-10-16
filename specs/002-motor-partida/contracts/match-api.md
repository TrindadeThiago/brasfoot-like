# Contrato: API do motor de partida

Exportado por `packages/engine/src/index.ts` (pacote `@brasfoot-like/engine`). Todas as funções
são puras: não mutam a entrada, não fazem I/O, não usam relógio. Tipos em
[data-model.md](../data-model.md).

## Catálogos

```ts
const FORMATIONS: Record<FormationId, Formation>;   // 4-4-2, 4-3-3, 3-5-2, 4-5-1, 5-3-2, 4-2-3-1
const FORMATION_IDS: readonly FormationId[];
const POSTURES: readonly ["defensive", "balanced", "attacking"];
```

## Força efetiva

```ts
function adequacy(playerPosition: Position, slotPosition: Position): number; // 0–1
function teamStrength(team: {
  formation: FormationId;
  onField: Record<string, CompletedPlayer | null>;
}): { goalkeeper: number; defense: number; midfield: number; attack: number; overall: number };
```

## Partida

```ts
type StartResult =
  | { ok: true; state: MatchState }
  | { ok: false; errors: MatchError[] };

function startMatch(input: MatchInput): StartResult;

type Advance = { minutes: number } | { toEnd: true };
function advanceMatch(state: MatchState, step: Advance): MatchState;

type ChangeResult = { ok: true; state: MatchState } | { ok: false; error: MatchError };
function applyChange(state: MatchState, side: "home" | "away", change: MatchChange): ChangeResult;

function matchResult(state: MatchState): MatchResult;          // exige status finished/abandoned
function simulateMatch(input: MatchInput): { ok: true; result: MatchResult } | { ok: false; errors: MatchError[] };
```

Garantias:

- `simulateMatch(input)` ≡ `startMatch` + `advanceMatch(..., { toEnd: true })` ≡ avançar de 1 em 1
  minuto até o fim (mesmos eventos, mesmo resultado) — FR-022.
- `advanceMatch` resolve pendências não decididas pela política padrão antes de jogar o minuto
  seguinte (FR-025). Avançar uma partida encerrada devolve o mesmo estado.
- O intervalo é um passo: ao terminar o 1º tempo, `status = "half_time"`; o próximo
  `advanceMatch` começa o 2º tempo. Mudanças aplicadas em `half_time` valem para o 2º tempo.
- `applyChange` nunca altera o estado recebido; em erro, o chamador continua com o estado antigo.
- `JSON.parse(JSON.stringify(state))` é um estado válido que continua a partida igual (FR-026).

## Escalação automática

```ts
type AutoLineupResult =
  | { ok: true; lineup: Lineup }
  | { ok: false; error: MatchError };

function autoLineup(options: {
  squad: CompletedPlayer[];
  formation: FormationId;
  posture?: Posture;            // padrão "balanced"
  unavailable?: string[];
  benchLimit?: number;          // padrão 12
}): AutoLineupResult;
```

- Determinística; titulares maximizam a força efetiva (FR-028); banco com cobertura (FR-029).

## Erros

```ts
interface MatchError {
  code: MatchErrorCode;
  side?: "home" | "away";
  params: Record<string, string | number>;
}
const MATCH_ERROR_CODES: readonly MatchErrorCode[];
const MATCH_ERROR_PARAMS: Record<MatchErrorCode, readonly string[]>;
```

## Calibragem

```ts
const MATCH_TUNING: { ... };          // constantes do modelo (research R2, R9, R11)
const MATCH_REALISM_LIMITS: { ... };  // FR-040 a FR-049
function createMetricsAccumulator(): { add(input: MatchInput, result: MatchResult): void; summary(): MatchMetrics };
function checkRealism(metrics: MatchMetrics): MetricCheck[];   // faixas gerais (as de cenário ficam nos testes)
```

## Passos e acréscimos

- Um passo de `advanceMatch` é um minuto do relógio, **inclusive minutos de acréscimo**:
  `{ minutes: 45 }` a partir do início chega ao minuto 45; os acréscimos do 1º tempo vêm nos
  passos seguintes, e o último deles leva a `status: "half_time"`. O passo seguinte ao intervalo
  emite `second_half` e joga o minuto 46.
- Substituição de jogador lesionado: `out` pode ser o id do lesionado (que já saiu de campo); a
  vaga dele é a usada.

---

# Contrato: i18n

```ts
function formatMatchError(error: MatchError, locale: Locale): string;
```

- Mensagens em `packages/i18n/locales/pt-BR/match-errors.json` (ICU).
- Rótulos em `catalog.json`: `posture.defensive` → "Defensiva", `posture.balanced` →
  "Equilibrada", `posture.attacking` → "Ofensiva"; `formation.4-4-2` → "4-4-2" etc.
