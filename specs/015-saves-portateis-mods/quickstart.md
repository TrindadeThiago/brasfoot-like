# Quickstart: validar saves portáteis e mods

Pré-requisitos: Node ≥ 22.13, `pnpm install` (inclui `fflate`). Contratos em [contracts/](contracts/).

## 1. Save

```bash
pnpm test packages/save
```

- `file.test.ts` (**critério de aceite 1**): `importSave(exportSave(s))` igual a `s` (exceto
  `savedAt`) no início, meio e fim de temporada e depois de várias temporadas; arquivos de versões
  antigas migram; lixo ⇒ `not_a_save`; versão futura ⇒ `future_version`; JSON corrompido ⇒
  `corrupt`; `asCopy` gera id novo; tempo de export/import de 30 temporadas < 5 s.
- `migrate-v11.test.ts`: v10 → v11 com `assets` vazio.

## 2. modkit

```bash
pnpm test packages/modkit
```

- `package.test.ts`: banco padrão compactado é aceito; arquivo faltando, JSON inválido, campo fora da
  faixa e clube inexistente listados com arquivo/item/campo; limites de tamanho; pasta de topo.
- `images.test.ts`: PNG/JPEG/WebP com dimensões lidas do cabeçalho; SVG e lixo recusados; imagem
  referenciada ausente ⇒ `image.missing`; não referenciada ⇒ aviso.
- `csv.test.ts`: ida e volta do banco padrão sem edição (SC-006); `;` e `,`; aspas; BOM; erros com
  linha e coluna.
- `example.test.ts` (**critério de aceite 2**): `mods/exemplo` válido e uma carreira com ele joga uma
  temporada e faz a virada.
- `docs.test.ts` (**critério de aceite 3**, SC-004): todo código de erro aparece em
  `docs/mod-format.md`.

## 3. Ferramentas

```bash
pnpm gen:example-mod && git diff --stat mods/exemplo   # sem mudanças se já gerado
pnpm validate-bank mods/exemplo
pnpm validate-bank apps/web/public/mods/exemplo.zip
```

## 4. App

`pnpm test apps/web` e `pnpm dev:web`. Roteiro: Carreiras → Exportar → apagar → Importar → mesma
rodada; importar de novo → conflito (substituir/cópia); Mods → baixar o exemplo → Carregar → Nova
carreira com "Norvália" → jogar; Mods → carregar pacote com defeito → relatório; Exportar CSV →
editar → Importar CSV → pacote gerado.

## Gates

`pnpm typecheck && pnpm lint && pnpm test`; `pnpm build:web && pnpm test:e2e`.
