# Data Model: Saves portáteis e formato de mod

Regras em [research.md](research.md).

## Arquivo de save (`.blsave`)

gzip de `{ format: "brasfoot-like-save", exportedAt: string, save: SaveFile }`.

| Resultado de importar | Quando |
|---|---|
| `ok` (+ `migratedFrom?`) | save válido (migrado se antigo) |
| `not_a_save` | não descompacta / não é JSON / `format` diferente |
| `corrupt` (+ `reason`) | `migrateSave` recusou |
| `future_version` (+ `version`) | versão maior que a do jogo |

## SaveFile v11

Campos da v10 + `assets: Record<string, string>` — caminho no pacote (`images/…`) → data URI das
imagens referenciadas por `bank.clubs[].crest.image`. Migração v10 → v11: `assets = {}`.

## Crest (banco)

Campos atuais + `image?: string` — caminho relativo no pacote (máx. 120 caracteres, deve começar com
`images/` e terminar em `.png`, `.jpg`, `.jpeg` ou `.webp`).

## Pacote de mod (`.zip`)

```text
mod.json  countries.json  competitions.json  clubs.json  players.json
rivalries.json   (opcional)
images/…         (opcional; PNG, JPEG, WebP)
```

Aceito também dentro de uma única pasta de topo.

## ModPackageResult (`modkit`)

`{ ok: true, bank: ValidatedBank, images: Record<path, dataUri>, warnings: ValidationIssue[],
summary: ModSummary }` | `{ ok: false, errors: ValidationIssue[], warnings: ValidationIssue[] }`.

`ValidationIssue` ganha a seção `package` e `images` para os códigos novos.

## ModSummary

`{ id, name, author, version, countries: string[], competition, divisions: { level, name, clubs }[],
clubs, players, images }`.

## Mod guardado (IndexedDB `mods`)

`{ id, summary, files: Record<fileName, unknown>, images: Record<path, dataUri>, addedAt }`.

## CSV

- `clubs.csv` e `players.csv` com as colunas de research.md R8; uma linha por item; células vazias =
  campo ausente (opcionais).
- `CsvIssue`: `{ code, file, line, column?, params }` — também convertido em `ValidationIssue`
  com `section` e `path` do item.

## Códigos novos

| Código | Parâmetros |
|---|---|
| `package.not_zip` | — |
| `package.too_large` | `size`, `max` |
| `package.images_too_large` | `size`, `max` |
| `file.too_large` | `file`, `size`, `max` |
| `image.missing` | `clubId`, `file` |
| `image.unused` (aviso) | `file` |
| `image.too_large` | `file`, `size`, `max` |
| `image.too_big_dimensions` | `file`, `width`, `height`, `max` |
| `image.bad_format` | `file` |
| `csv.missing_column` | `file`, `column` |
| `csv.unknown_column` (aviso) | `file`, `column` |
| `csv.row_length` | `file`, `line`, `found`, `expected` |
| `csv.invalid_number` | `file`, `line`, `column`, `value` |
| `csv.unclosed_quote` | `file`, `line` |

## Invariantes

- Toda imagem referenciada existe em `assets` do save (ou em `images` do pacote).
- Remover um mod não altera nenhum save.
- `importSave(exportSave(s))` = `s` (exceto `savedAt`).
