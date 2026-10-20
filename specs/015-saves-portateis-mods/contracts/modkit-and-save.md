# Contrato: `save` (arquivo) e `modkit` (pacote, imagens, CSV)

## Pacote `save`

```ts
const SAVE_FILE_FORMAT = "brasfoot-like-save";
function exportSave(save: SaveFile, now: string): Uint8Array;            // gzip
function saveFileName(save: SaveFile): string;                           // "<técnico>-<clube>-<data>.blsave"
type ImportResult =
  | { status: "ok"; save: SaveFile; migratedFrom?: number }
  | { status: "not_a_save" }
  | { status: "corrupt"; reason: string }
  | { status: "future_version"; version: number };
function importSave(bytes: Uint8Array): ImportResult;                    // aceita gzip ou JSON puro
function asCopy(save: SaveFile, id: string, now: string): SaveFile;       // id novo
// createSave({ …, defaultBank, assets? }) — assets do mod copiados para o save (v11)
```

## Pacote `modkit` (novo, TypeScript puro, sem DOM)

```ts
const MOD_LIMITS: { package: number; json: number; image: number; images: number; dimension: number };
function readModPackage(bytes: Uint8Array): ModPackageResult;
function writeModPackage(bank: ModPackage, images: Record<string, string>): Uint8Array;  // zip
function imageInfo(bytes: Uint8Array): { format: "png" | "jpeg" | "webp"; width: number; height: number } | undefined;
function summarizeMod(bank: ValidatedBank, images: Record<string, string>): ModSummary;

// CSV
function clubsToCsv(bank: ModPackage): string;      // UTF-8 com BOM, separador ","
function playersToCsv(bank: ModPackage): string;
function parseCsv(text: string, file: string): { rows: Record<string, string>[]; issues: CsvIssue[] };
function applyCsv(
  bank: ModPackage,
  csv: { clubs?: string; players?: string },
): { ok: true; bank: ValidatedBank; warnings: ValidationIssue[] } | { ok: false; errors: ValidationIssue[] };
```

Garantias: determinístico; nunca lança para entrada inválida (devolve erros); todos os códigos com
mensagem em `errors.json` e linha na documentação.

## Motor

- `crestSchema.image?: string` (caminho `images/…` com extensão aceita).
- `generateDefaultBank({ seed, names?, countryId?, competitionName?, divisionSize?, slots? })` com
  os padrões atuais (banco padrão idêntico).
- `SECTIONS` ganha `package` e `images` para localizar os erros novos.

## Ferramentas

- `pnpm gen:example-mod` → `mods/exemplo/` e `apps/web/public/mods/exemplo.zip`.
- `pnpm validate-bank <pasta|arquivo.zip>`.
