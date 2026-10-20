# Research: Saves portáteis e formato de mod

## R1 — Compactação (save e pacote de mod)

- **Decision**: dependência nova `fflate` (MIT, JavaScript puro, sem dependências, ~8 KB
  compactado): `gzipSync`/`gunzipSync` para o arquivo de save e `unzipSync`/`zipSync` para o pacote
  de mod. Funciona igual no navegador, no Node (testes e ferramentas) e offline.
- **Rationale**: o pacote de mod precisa ser um `.zip` comum (o modder compacta uma pasta);
  `CompressionStream` do navegador só faz gzip/deflate, não zip, e é assíncrono. Uma única biblioteca
  pequena cobre os dois casos de forma síncrona e determinística.
- **Alternatives considered**: JSZip (maior, assíncrona); formato próprio sem zip (pior para
  modders); `CompressionStream` + zip escrito à mão (mais código e risco).

## R2 — Arquivo de save

- **Decision**: arquivo `<técnico>-<clube>-<data>.blsave` = gzip de um JSON
  `{ "format": "brasfoot-like-save", "exportedAt": "<ISO>", "save": <SaveFile> }`. Importar:
  gunzip (ou JSON puro, para tolerar arquivos descompactados) → conferir `format` → `migrateSave`
  (migrações e validação já existentes) → gravar. O reconhecimento é pelo conteúdo, não pela
  extensão. Funções puras no pacote `save`: `exportSave(save, now): Uint8Array` e
  `importSave(bytes): ImportResult` (`ok` | `not_a_save` | `corrupt` | `future_version`).
- **Mesmo id**: a UI pergunta substituir ou importar como cópia; a cópia recebe id novo e o nome da
  carreira ganha o sufixo "(cópia)" no resumo.
- **Estado idêntico** (SC-001): `importSave(exportSave(s)).save` deep-equal a `s`, exceto `savedAt`
  (atualizado ao gravar).
- **Rationale**: reaproveita todo o caminho de migração/validação (Princípio VI).

## R3 — Pacote de mod

- **Decision**: `.zip` com, na raiz (ou dentro de uma única pasta de topo, aceita também):
  `mod.json`, `countries.json`, `competitions.json`, `clubs.json`, `players.json`,
  `rivalries.json` (opcional) e `images/` (opcional). Pacote novo `packages/modkit` (TypeScript
  puro, sem DOM, depende de `engine` e `fflate`): `readModPackage(bytes): ModPackageResult` —
  descompacta, aplica limites (R4), lê JSONs (erros `file.missing`/`file.invalid_json` já
  existentes), valida com `validateBank` e confere as imagens (R5). Resultado: banco validado +
  `images: Record<path, dataUri>` + avisos, ou a lista completa de erros.
- **Rationale**: o mesmo formato de pasta dos mods atuais (`mods/default`); `modkit` é usado pela web
  e pelas ferramentas (`validate-bank` passa a aceitar `.zip`).

## R4 — Limites

| Limite | Valor | Código de erro |
|---|---|---|
| Pacote inteiro | 20 MB | `package.too_large` |
| Arquivo JSON | 10 MB | `file.too_large` |
| Imagem | 200 KB | `image.too_large` |
| Dimensões da imagem | 512 × 512 px | `image.too_big_dimensions` |
| Total de imagens | 5 MB | `package.images_too_large` |
| Formatos | PNG, JPEG, WebP (por assinatura dos bytes, não extensão) | `image.bad_format` |
| Não é zip | — | `package.not_zip` |

Dimensões lidas do cabeçalho de cada formato (PNG IHDR, JPEG SOF, WebP VP8/VP8L/VP8X), sem
decodificar a imagem; SVG e outros recusados (`image.bad_format`).
- **Rationale**: FR-008; mantém o save pequeno (as imagens vão para o save, R6).

## R5 — Escudos em imagem

- **Decision**: `crestSchema` ganha `image?: string` (caminho relativo dentro do pacote, ex.:
  `images/clube-001.png`). Validação semântica do `modkit`: imagem referenciada e ausente ⇒
  `image.missing` (clube, arquivo). Imagens no pacote não referenciadas viram aviso
  `image.unused`. Na interface, `Crest` mostra `<img>` com a imagem (texto alternativo = nome do
  clube) quando existe, senão o SVG gerado.
- **Rationale**: escudo gerado continua como fallback (FR-011); mods sem imagens não mudam.

## R6 — Imagens dentro do save

- **Decision**: save v11 ganha `assets: Record<path, dataUri>` (só as imagens referenciadas);
  `createSave` recebe `assets?`; migração v10 → v11: `assets = {}`. A exportação leva os assets. Um
  provedor React (`AssetsProvider`) entrega os assets da carreira (ou do mod em pré-visualização) ao
  `Crest`.
- **Rationale**: FR-010 — remover o mod não afeta a carreira; save exportado leva as imagens.

## R7 — Mods guardados no navegador

- **Decision**: IndexedDB do app passa para a versão 2 com o store `mods`
  (`id` → `{ manifest, summary, files, images, addedAt }`), atrás de uma interface `ModStore`
  (`list`, `get`, `put`, `remove`). Tela nova **Mods** (`/mods`): carregar pacote (com relatório de
  validação), lista com detalhes, remover, exportar CSV, importar CSV, link para a documentação. A
  tela de nova carreira ganha o seletor de banco (padrão + mods carregados); mod com o mesmo `id`
  pergunta se substitui.
- **Rationale**: FR-009; mesmo adaptador de armazenamento das carreiras.

## R8 — CSV

- **Decision**: no `modkit`, `playersToCsv(bank)`/`clubsToCsv(bank)` e
  `applyCsv(bank, { players?, clubs? }): CsvResult` que devolve o banco atualizado (validado) ou
  erros com linha e coluna. Colunas:
  - `clubs.csv`: `id, name, shortName, abbreviation, city, countryId, reputation, stadiumCapacity,
    initialCash, colorPrimary, colorSecondary, crestShape, crestColor1, crestColor2, crestColor3,
    crestInitials, crestImage`.
  - `players.csv`: `id, name, displayName, nationalityId, clubId, position, birthDate, strength,
    traits` (separadas por `|`), `potential, temperament, injuryProneness, contractWage,
    contractUntilYear` — os campos exatos seguem o `playerSchema` e são listados na documentação.
  Leitura: separador `,` ou `;` (detectado pelo cabeçalho), aspas duplas com escape `""`, UTF-8 com
  ou sem BOM, quebras CRLF/LF. Escrita: `,`, UTF-8 com BOM (planilhas abrem acentos corretamente).
  Códigos: `csv.missing_column` (coluna), `csv.unknown_column` (aviso), `csv.row_length` (linha),
  `csv.invalid_number` (linha, coluna, valor), `csv.unclosed_quote` (linha). Depois de aplicar, o
  banco passa pelo `validateBank`, e erros de validação apontam a linha do CSV de origem.
  Exportar → importar sem editar ⇒ pacote equivalente (SC-006, teste com o banco padrão).
- **Rationale**: FR-013 a FR-016; parser próprio pequeno, sem dependência.

## R9 — Documentação e mod de exemplo

- **Decision**: `docs/mod-format.md` (pt-BR): estrutura do pacote, cada arquivo e campo (tipo,
  obrigatório, faixa, exemplo), regras entre arquivos, seções opcionais (economia, mercado,
  diretoria, torcida, manchetes, rivalidades), escudos em imagem, CSV, limites e a tabela de **todos**
  os códigos de erro com a mensagem. Teste `modkit/test/docs.test.ts` garante que todo
  `ISSUE_CODES` e todo código de pacote/CSV aparece no documento (SC-004). Mod de exemplo em
  `mods/exemplo/` — país fictício "Norvália", liga com 2 divisões de 12 clubes (`promotionSlots`/
  `relegationSlots` 2), nomes de um banco de nomes próprio `worldgen/name-banks/exemplo.json`,
  gerado por `pnpm gen:example-mod` (ferramenta nova, seed fixa) e também publicado como
  `apps/web/public/mods/exemplo.zip` para download na tela de Mods. Testes: válido no
  `readModPackage`, e uma carreira com ele joga uma temporada e faz a virada (SC-003).
- **Rationale**: FR-017 a FR-019; o exemplo prova que o formato é independente do banco padrão
  (Princípio III).

## R10 — Gerador com tamanhos configuráveis

- **Decision**: `generateDefaultBank` ganha opções (`names`, `countryId`, `competitionName`,
  `divisionSize`, `slots`) com os padrões atuais; o banco padrão continua idêntico (teste dourado
  existente).
- **Rationale**: reaproveitar o gerador para o mod de exemplo sem duplicar código.

## R11 — Desempenho

- **Decision**: exportar/importar save de 30 temporadas (~1,5–4,5 MB) com gzip síncrono: medir em
  teste (`< 5 s`, SC-007; esperado < 1 s). Carregar o pacote padrão (~1 MB) em < 2 s.
- **Medido (2026-10-20, Node 22, WSL2)**: carreira após 10 temporadas — save em JSON 890 KB,
  `.blsave` 134 KB (gzip ≈ 15 %); exportar 40 ms, importar (descompactar + migrar + validar) 71 ms.
  Pacote do mod de exemplo (2 × 12 clubes, 614 jogadores) 22,8 KB; `readModPackage` 19 ms. O teste
  de 30 temporadas da 014 continua dentro do limite de tamanho do save.

## R12 — Textos

- **Decision**: mensagens novas em `errors.json` (códigos de pacote, imagem e CSV) e `ui.json`
  (tela de Mods, exportar/importar save, seletor de banco, conflito de id). Todas com variáveis e
  frases completas.
