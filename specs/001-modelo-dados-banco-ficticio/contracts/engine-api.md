# Contrato: API pública do motor (feature 001)

Pacote `@brasfoot-like/engine`. Tudo abaixo é exportado por `packages/engine/src/index.ts`;
nada além disso é API pública. Funções são puras: sem I/O, sem relógio, sem `Math.random`.

## PRNG

```ts
type RngState = { s: [number, number, number, number] }; // 4 × uint32, serializável

interface Rng {
  next(): number;                       // uint32
  float(): number;                      // [0, 1)
  int(min: number, max: number): number; // inteiro em [min, max]
  pick<T>(items: readonly T[]): T;
  weighted<T>(items: readonly { value: T; weight: number }[]): T;
  shuffle<T>(items: readonly T[]): T[]; // retorna cópia
  fork(label: string): Rng;             // sub-gerador independente e determinístico
  state(): RngState;
}

function createRng(seed: string | number): Rng;
function restoreRng(state: RngState): Rng;
```

Garantias: mesma seed ⇒ mesma sequência; `restoreRng(rng.state())` continua a sequência
exatamente; `fork(label)` não avança o gerador pai.

## Catálogos

```ts
const POSITIONS: readonly ["GK", "FB", "CB", "DM", "MF", "FW"];
const TRAITS: readonly ["finisher", "wall", "free-kick", "heading", "pace", "playmaker"];
const CREST_SHAPES: readonly ["classic", "round", "triangle", "rectangle"];
const TIEBREAKERS: readonly ["wins", "goal-difference", "goals-for", "head-to-head",
                            "fewest-red-cards", "draw-lots"];
const SUPPORTED_FORMAT_VERSIONS: readonly [1];
```

## Tipos do modelo

`ModPackage`, `Manifest`, `Country`, `Competition`, `CompetitionFormat`, `Division`, `Club`,
`Crest`, `Player`, `HiddenAttributes`, `Position`, `Trait`, `CrestShape`, `Tiebreaker` —
inferidos dos schemas Zod (ver [data-model.md](../data-model.md)).

`ValidatedBank` é um `ModPackage` marcado (*branded type*) que só pode ser obtido por
`validateBank`. Funções que exigem dados consistentes recebem `ValidatedBank` (FR-026).

`CompletedBank` é um `ValidatedBank` em que todo jogador tem `hidden` com os três campos
preenchidos; só pode ser obtido por `completeHiddenAttributes`.

## Validação

```ts
type Severity = "error" | "warning";

interface ValidationIssue {
  severity: Severity;
  code: IssueCode;
  section: "manifest" | "countries" | "competitions" | "clubs" | "players";
  path: (string | number)[];
  entityId?: string;
  params: Record<string, string | number>;
}

type ValidationResult =
  | { ok: true; bank: ValidatedBank; warnings: ValidationIssue[] }
  | { ok: false; errors: ValidationIssue[]; warnings: ValidationIssue[] };

function validateBank(input: unknown): ValidationResult;

const ISSUE_CODES: readonly IssueCode[]; // lista completa, usada pelo teste de cobertura i18n
```

- Entrada `unknown`: o motor não confia em nada vindo de fora.
- Retorna **todos** os erros e avisos (estruturais por item + semânticos sobre itens válidos).
- `ok` é `true` se, e somente se, não houver erros; o `bank` aceito não contém os campos
  desconhecidos que geraram avisos.
- Ordem determinística: por seção (`manifest`, `countries`, `competitions`, `clubs`,
  `players`), depois por índice, depois por código.
- Nunca lança exceção para entrada inválida.

## Atributos ocultos

```ts
function completeHiddenAttributes(bank: ValidatedBank, careerSeed: string | number): CompletedBank;
```

- Preserva valores definidos no banco; preenche os ausentes com `fork("hidden:" + player.id)`.
- Mesma seed + mesmo banco ⇒ mesmo resultado; independe da ordem dos jogadores (FR-017b).

## Gerador

```ts
interface GenerateOptions {
  seed: string | number;   // obrigatório
}

function generateDefaultBank(options: GenerateOptions): ValidatedBank;
```

- O banco gerado não contém `hidden` (FR-017a).
- Lança `Error` apenas se o próprio resultado não passar na validação sem erros e sem avisos
  (bug do gerador; coberto por teste, SC-007).

## Derivados

```ts
function ageOn(birthDate: string, referenceDate: string): number;
function deriveWage(player: CompletedPlayer, club: Club, referenceDate: string): number;
function deriveMarketValue(player: CompletedPlayer, club: Club, referenceDate: string): number;
```

`CompletedPlayer` é o tipo de jogador de um `CompletedBank` (potencial sempre presente).

## Limites do mundo gerado

```ts
const DISTRIBUTION_LIMITS: { ... };   // FR-030 a FR-036, usados pelos testes de distribuição
const REPUTATION_TIERS: { big: 75; medium: 55 };
function tierOf(reputation: number): "big" | "medium" | "small";
```

## Serialização

```ts
function toCanonicalJson(value: unknown): string;                 // chaves ordenadas, 2 espaços, "\n" final
function splitBankFiles(bank: ModPackage): Record<string, string>; // { "mod.json": ..., "clubs.json": ... }
function joinBankFiles(files: Record<string, unknown>): unknown;   // inverso, sem validar
```

`splitBankFiles`/`joinBankFiles` só convertem entre o objeto e o mapa de arquivos; ler e gravar
disco é responsabilidade do chamador (script Node, IndexedDB, Electron).

---

# Contrato: pacote `@brasfoot-like/i18n`

```ts
type Locale = "pt-BR";

function formatIssue(issue: ValidationIssue, locale: Locale): string;
function formatLabel(key: string, locale: Locale): string;       // "position.GK" → "GOL"
function formatMessage(key: string, values: Record<string, string | number>, locale: Locale): string;
function messageKeys(locale: Locale): string[];
```

- `formatIssue` exibe parâmetros de catálogo (`trait`, `tiebreaker`) pelo rótulo traduzido e,
  quando a entidade não tem id legível, identifica-a pela posição (`#5`).
- Mensagens gerais (ex.: resumo da CLI) em `packages/i18n/locales/pt-BR/messages.json`.

- Mensagens em `packages/i18n/locales/pt-BR/errors.json`, chave = código do problema, valor = ICU.
- Rótulos de catálogo em `packages/i18n/locales/pt-BR/catalog.json`
  (`position.GK` → "GOL", `trait.free-kick` → "Cobrador de falta" etc.).
