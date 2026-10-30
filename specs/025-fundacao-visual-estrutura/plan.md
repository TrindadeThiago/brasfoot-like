# Implementation Plan: Fundação visual e estrutura do jogo

**Branch**: `025-fundacao-visual-estrutura` | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/025-fundacao-visual-estrutura/spec.md`

## Summary

Primeira entrega do Marco 10 (nova interface): troca a base visual do jogo (tokens de cor nos temas
escuro e claro, fontes Space Grotesk e Inter distribuídas offline, componentes-base) e a estrutura
das telas (barra lateral com as dez telas do clube e contadores, cabeçalho de tela, telas de foco
sem barra lateral, layout que funciona de 768 a 1440 px). Também reinicia a versão para 1.0.0, com
as 23 notas atuais movidas para um arquivo "beta" e uma única nota 1.0.0.

Abordagem técnica: manter os nomes dos tokens `--color-*` existentes e trocar seus valores
(os 63 módulos CSS herdam a nova paleta sem edição), migrar os 6 módulos com cores fixas, adicionar
um módulo `ui/shell/` (Sidebar, ScreenHeader, FocusScreen) e componentes-base novos em `ui/`.
Nenhuma mudança no motor, nos saves ou nos dados.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Next.js 16.4.2 (export estático, `trailingSlash`), Node 22

**Primary Dependencies**: CSS Modules, Zod; sem dependência nova (fontes como arquivos woff2 versionados)

**Storage**: N/A para dados de jogo; preferências de tema já existentes em localStorage (`brasfoot-like:preferences`)

**Testing**: Vitest + happy-dom + Testing Library (unidade/UI); Playwright (e2e: a11y com axe nos dois temas, offline, teclado, sem terceiros); Biome (lint)

**Target Platform**: navegadores modernos desktop, PWA offline via service worker; largura mínima 768 px

**Project Type**: web (monorepo pnpm: `apps/web`, `packages/*`, `tools`)

**Performance Goals**: tempo de abertura de referência até 10% pior que a 1.10.0 (SC-007); sem rolagem horizontal da página em 1440/1024/768 px

**Constraints**: offline e sem requisições a terceiros (fontes locais); contraste mínimo 4,5:1 texto, 3:1 componentes; atalhos, guarda de saída e redirecionamento de desempregado preservados

**Scale/Scope**: 19 telas validadas; 63 módulos CSS (6 com cores fixas a migrar); 10 itens de navegação

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Motor separado:** nenhuma mudança no motor; só `apps/web` e `packages/i18n`
- [x] **II. Determinismo:** não toca simulação; sem `Math.random`/`Date.now` novos
- [x] **III. Dados, não código:** notas de versão continuam em JSON validado por Zod (arquivo beta usa o mesmo esquema)
- [x] **IV. Sem conteúdo protegido:** fontes com licença OFL (redistribuíveis); sem marcas
- [x] **V. Balanceamento verificável:** não se aplica (sem mudança de regras)
- [x] **VI. Saves versionados:** nenhuma mudança de formato de save ou de preferências; sem migração
- [x] **VII. i18n:** todo texto novo (rótulos de navegação, "Fase beta", "beta X.Y.Z", títulos) em `ui.json`
- [x] **VIII. Offline e gratuito:** fontes locais precacheadas pelo service worker; nenhuma rede
- [x] **IX. Testes primeiro:** testes de contraste dos tokens, do shell e das notas antes/junto da implementação

Pós-design: todos os gates continuam passando; sem violações a justificar.

## Project Structure

### Documentation (this feature)

```text
specs/025-fundacao-visual-estrutura/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── design-tokens.md
│   ├── ui-shell.md
│   └── release-notes.md
└── tasks.md             # gerado por /speckit-tasks
```

### Source Code (repository root)

```text
package.json                              # version 1.0.0
packages/i18n/
├── src/release-notes.ts                  # + betaReleaseNotes()
├── src/locales/pt-BR/release-notes.json  # somente a nota 1.0.0
├── src/locales/pt-BR/release-notes-beta.json  # as 23 notas atuais (mesmo esquema)
├── src/locales/pt-BR/ui.json             # chaves novas (navegação, beta, shell)
└── test/release-notes.test.ts
apps/web/
├── public/fonts/                         # woff2 Space Grotesk + Inter (latin, latin-ext) + licenças OFL
├── src/styles/tokens.css                 # paletas escuro/claro, destaque, tipografia, espaçamento, raios
├── src/styles/fonts.css                  # @font-face
├── src/styles/global.css                 # remove min-width 1024; foco e movimento reduzido mantidos
├── src/ui/shell/                         # Sidebar, ScreenHeader, FocusScreen, screens.ts, icons.tsx
├── src/ui/{Card,Tabs,Badge,Meter,Field,Notice,EmptyState,SectionLabel}.tsx (+ .module.css)
├── src/ui/Button.tsx                     # + variante texto
├── src/ui/AppHeader.tsx                  # substituído pelo shell (GAME_SCREENS migra para shell/screens.ts)
├── src/game/GameLayout.tsx               # variante clube | foco
├── src/app/notas-de-versao/page.tsx      # seção "Fase beta" recolhível
├── test/ui/                              # shell, componentes-base, tokens, versão
└── e2e/layout.spec.ts                    # sem rolagem horizontal, 19 telas × 2 temas × 3 larguras
tools/test/check-release.test.ts
```

**Structure Decision**: monorepo existente. Código novo concentrado em `apps/web/src/ui/shell/` e
`apps/web/src/ui/` (componentes-base); `packages/i18n` ganha o arquivo beta. Sem pacotes novos.

## Complexity Tracking

Sem violações da constituição a justificar.
