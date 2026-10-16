# Implementation Plan: Aplicação web, novo jogo e saves

**Branch**: `004-app-web-saves` | **Date**: 2026-10-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-app-web-saves/spec.md`

## Summary

Primeira interface do jogo: app `apps/web` em Next.js 16 com static export (rotas fixas, carreira
identificada por `?c=<id>`), estado em um provider React que chama o motor de forma síncrona. O
formato do save, suas migrações e validação ficam num pacote puro novo, `packages/save`; o
armazenamento usa IndexedDB com resumos separados para a lista de carreiras e checagem de conflito
entre abas. Telas: abertura, nova carreira (escolha de clube com escudo, reputação, força e
estádio), carreiras salvas, e o jogo com Início, Elenco, Competição e Calendário, mais "Simular
próxima rodada" com salvamento automático. Escudos em SVG a partir dos dados, toda string via i18n
(com teste que proíbe literais), atalhos de teclado e service worker próprio para abrir offline.
Detalhes em [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.x (`strict`), Node 22

**Primary Dependencies**: Next.js 16.4 (App Router, `output: "export"`), React 19.3, `idb` 8;
dev: Vitest 5, Testing Library (react 16, user-event 14), happy-dom 21, fake-indexeddb 6,
Playwright 1.64 (E2E). Motor, i18n e o novo `packages/save` do workspace.

**Storage**: IndexedDB (`saves` + `summaries`); `localStorage` só para preferências

**Testing**: Vitest (save em Node; app com happy-dom + fake-indexeddb); Playwright para reload real
e offline (`pnpm test:e2e`)

**Target Platform**: navegadores modernos (Chromium, Firefox, Safari recentes), desktop ≥ 1280px

**Project Type**: aplicação web estática + pacotes de biblioteca

**Performance Goals**: lista de carreiras < 1 s; abrir carreira < 2 s; criar carreira < 1 s;
autosave sem travar a interface > 200 ms (SC-005)

**Constraints**: static export (sem servidor, sem rotas dinâmicas, sem APIs de servidor do Next);
offline depois da primeira visita; nenhuma string fora do i18n; motor intocado pela UI (só API
pública)

**Scale/Scope**: 7 rotas; save de ~1–2 MB; até dezenas de carreiras

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação pré-pesquisa e pós-design (ambas ✅):

- [x] **I. Motor separado:** a UI só chama a API pública do motor; nenhuma regra de jogo no app.
  Formato do save é um pacote puro (`packages/save`); IndexedDB fica num adaptador do app.
- [x] **II. Determinismo:** a seed da carreira é gerada na UI (fonte aleatória do navegador) e
  passada explícita ao motor; data/hora do salvamento vem da UI, nunca do motor.
- [x] **III. Dados, não código:** o banco padrão é copiado do mod para o save; nenhuma liga ou clube
  fixo no código da UI.
- [x] **IV. Sem conteúdo protegido:** só o banco fictício; escudos gerados a partir dos dados.
- [x] **V. Balanceamento verificável:** a UI não altera o equilíbrio; usa o motor calibrado.
- [x] **VI. Saves versionados:** `SAVE_FORMAT_VERSION = 1`, `migrateSave` com cadeia de migrações e
  teste com save de versão anterior simulado; versão futura não abre (R4).
- [x] **VII. i18n:** `ui.json` em ICU, hook `useT`, datas e números via `Intl` pt-BR; teste que
  falha com literais em JSX (R9).
- [x] **VIII. Offline e gratuito:** static export; service worker próprio para abrir offline;
  fontes do sistema; nenhuma chamada de rede (R7, R10).
- [x] **IX. Testes primeiro no motor:** o motor não muda; `packages/save` e os fluxos da UI começam
  por testes.
- [x] **Stack (v1.1.0):** Next.js só em static export, sem route handlers, SSR por requisição,
  server actions, middleware nem otimização de imagens; Biome; Vitest.

Nenhuma violação; Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/004-app-web-saves/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/
│   ├── save-format.md
│   └── ui.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
mods/default/package.json            # @brasfoot-like/default-mod (exporta os 5 JSON)

packages/save/                        # puro: formato, criação, migrações, resumo
├── src/{index,format,create,migrate,summary}.ts
└── test/{create,migrate,summary}.test.ts

packages/i18n/locales/pt-BR/ui.json   # textos da interface (+ formatUi)

apps/web/
├── next.config.ts                    # output: "export", transpilePackages
├── public/sw.js                      # service worker (cache primeiro)
├── src/
│   ├── app/                          # rotas: /, /nova-carreira, /carreiras, /jogo, /jogo/{elenco,competicao,calendario}
│   ├── game/                         # GameProvider, ações, seletores (próximo jogo, posição...)
│   ├── storage/                      # SaveStore IndexedDB, conflito entre abas, preferências
│   ├── ui/                           # Crest, Table, Button, Dialog, Shortcuts, SaveIndicator, AppHeader
│   ├── i18n/                         # useT, <T>, formatação de datas/números
│   └── styles/                       # tokens.css, global.css
├── test/
│   ├── setup.ts                      # happy-dom + fake-indexeddb
│   ├── flows/  storage/  ui/  i18n/
└── e2e/                              # Playwright: reload, duas carreiras, offline

tools/src/precache.ts                 # gera out/precache.json após o build
```

**Structure Decision**: o app vive em `apps/web` e consome os pacotes do workspace; a lógica de
save é um pacote puro para ser reaproveitada no Electron e na exportação (015). O banco padrão vira
pacote de workspace para ser importado pelo app e copiado para cada save.

## Complexity Tracking

Sem violações da constituição.
