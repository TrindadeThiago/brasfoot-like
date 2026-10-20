# Implementation Plan: Saves portáteis e formato de mod

**Branch**: `015-saves-portateis-mods` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/015-saves-portateis-mods/spec.md`

## Summary

Duas frentes. **Saves portáteis**: o pacote `save` ganha `exportSave`/`importSave` — um arquivo
`.blsave` (gzip de um envelope JSON com o save) reconhecido pelo conteúdo, que passa pelas migrações
e validação já existentes; a tela de Carreiras ganha Exportar, Importar e o diálogo de conflito de id
(substituir ou cópia). **Formato aberto**: um pacote novo, `modkit` (TypeScript puro), lê pacotes
`.zip` de mod (limites de tamanho, JSONs, validação do motor, imagens PNG/JPEG/WebP com dimensões
lidas do cabeçalho), gera pacotes e faz ida e volta de clubes e jogadores em CSV com erros por linha
e coluna. Escudos podem ser imagens (`crest.image`), copiadas para o save (v11, `assets`) para que
remover o mod não afete carreiras. A web ganha a tela Mods (carregar, relatório, lista, remover, CSV,
documentação, exemplo) e o seletor de banco na nova carreira; o IndexedDB passa à versão 2 com o
store `mods`. `docs/mod-format.md` documenta o formato inteiro, com teste que garante todos os
códigos de erro no texto, e `mods/exemplo` (Norvália, 2 divisões de 12 clubes) é gerado pelo
gerador do banco agora configurável. Dependência nova: `fflate`. Detalhes em
[research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.x (`strict`), Node 22

**Primary Dependencies**: motor, save, i18n do workspace; Next.js 16.4 (static export), React 19.3;
Zod; idb; **nova: `fflate`** (zip/gzip síncronos, puro JS, MIT)

**Storage**: IndexedDB v2 (`saves`, `summaries`, `mods`); save v11 (`assets`); arquivos `.blsave` e
`.zip` lidos e gerados no navegador

**Testing**: Vitest (save, modkit, motor, app); Playwright (exportar/importar save, carregar mod de
exemplo e jogar)

**Target Platform**: navegadores modernos, desktop ≥ 1280px

**Project Type**: biblioteca (motor) + pacotes `save` e `modkit` + mods + aplicação web estática +
ferramentas

**Performance Goals**: exportar/importar save de 30 temporadas < 5 s (esperado < 1 s); carregar o
pacote padrão < 2 s

**Constraints**: offline e sem servidor; nenhuma imagem SVG; limites de research.md R4; o motor
continua sem APIs de plataforma (o `modkit` também é puro e testado no Node); i18n; banco padrão
inalterado

**Scale/Scope**: pacotes até 20 MB; banco padrão ~1.000 jogadores; mod de exemplo 24 clubes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação pré-pesquisa e pós-design (ambas ✅):

- [x] **I. Motor separado:** o motor só ganha `crest.image` no schema e o gerador configurável; ler
  zip, imagens e CSV fica no `modkit` (puro, sem DOM) e a persistência na web.
- [x] **II. Determinismo:** exportar/importar não toca o estado do jogo; o mod de exemplo é gerado
  com seed fixa; o banco padrão continua idêntico (teste dourado).
- [x] **III. Dados, não código:** o mod de exemplo (outro país) roda sem mudar a lógica do motor;
  validação Zod com mensagens por arquivo/item/campo, agora também para pacote, imagens e CSV.
- [x] **IV. Nenhum conteúdo protegido:** o jogo distribui só o banco padrão e o exemplo, ambos
  fictícios; conteúdo real vem de mods da comunidade.
- [x] **V. Balanceamento verificável:** não se aplica a sistemas novos; o mod de exemplo joga uma
  temporada e faz a virada em teste.
- [x] **VI. Saves versionados:** v11 com migração v10 → v11; import passa por todas as migrações;
  versão futura recusada.
- [x] **VII. i18n:** mensagens novas em `errors.json`/`ui.json`, frases completas.
- [x] **VIII. Offline e gratuito:** tudo no navegador; `fflate` é empacotado no build estático.
- [x] **IX. Testes primeiro:** `modkit` e `exportSave`/`importSave` começam pelos testes; o schema do
  motor também.
- [x] **Stack (v1.1.0):** sem servidor; Biome; Vitest. Dependência nova justificada em research.md
  R1.

Nenhuma violação; Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/015-saves-portateis-mods/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/
│   ├── modkit-and-save.md   # API de save (arquivo) e modkit
│   └── ui.md                # telas, armazenamento, i18n
├── checklists/requirements.md
└── tasks.md                 # /speckit-tasks
```

### Source Code (repository root)

```text
packages/modkit/                    # novo
├── src/{index,limits,package,images,csv,summary}.ts
└── test/{package,images,csv,example,docs}.test.ts
packages/save/src/{file.ts,format.ts,create.ts,migrate.ts}   # exportSave/importSave, v11 assets
packages/engine/src/model/schemas.ts       # crest.image
packages/engine/src/validation/issues.ts   # seções package/images, códigos novos
packages/engine/src/worldgen/{generate.ts,name-banks/exemplo.json}
packages/i18n/locales/pt-BR/{ui,errors}.json
mods/exemplo/                       # novo (gerado)
docs/mod-format.md                  # novo
apps/web/
├── public/mods/exemplo.zip
├── src/storage/{indexeddb.ts,mods.ts}
├── src/app/carreiras/page.tsx      # exportar/importar
├── src/app/mods/page.tsx           # novo
├── src/app/nova-carreira/page.tsx  # seletor de banco
├── src/ui/{Crest.tsx,AssetsProvider.tsx}  src/ui/mods/{ValidationReport,ModList,CsvPanel}.tsx
├── src/game/GameProvider.tsx       # createCareer com mod; importSave
├── test/flows/{save-file,mods}.test.tsx  e2e/{save-file,mods}.spec.ts
tools/src/{gen-example-mod.ts,validate-bank.ts,fs-bank.ts}
```

**Structure Decision**: o `modkit` é um pacote próprio porque ler e gerar arquivos de mod (zip,
imagens, CSV) não é regra de jogo e não deve entrar no motor (Princípio I), mas precisa ser puro e
testável no Node, e é usado tanto pela web quanto pelas ferramentas.

## Complexity Tracking

Sem violações da constituição.
