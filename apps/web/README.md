# @brasfoot-like/web

Interface web do jogo: Next.js em **static export** (só arquivos estáticos, sem servidor), estado
em memória num provider React que chama o motor (`@brasfoot-like/engine`) e saves no IndexedDB do
navegador. Funciona offline depois da primeira visita (service worker próprio).

## Comandos (na raiz do repositório)

| Comando | O que faz |
|---|---|
| `pnpm dev:web` | desenvolvimento em http://localhost:3000 (sem service worker) |
| `pnpm build:web` | static export em `apps/web/out` + `precache.json` e versão do `sw.js` |
| `pnpm preview:web` | serve `apps/web/out` em http://localhost:4173 |
| `pnpm test` | inclui os testes do app (Vitest + happy-dom + fake-indexeddb) |
| `pnpm test:e2e` | Playwright contra o build (rode `pnpm build:web` antes) |

Para o E2E, instale o navegador uma vez: `pnpm --filter @brasfoot-like/web exec playwright install
chromium`. No Linux/WSL ele precisa das bibliotecas do sistema (`sudo pnpm --filter
@brasfoot-like/web exec playwright install-deps chromium`).

## Estrutura

- `src/app/` — rotas: `/`, `/nova-carreira`, `/carreiras`, `/jogo`, `/jogo/elenco`,
  `/jogo/competicao`, `/jogo/calendario`. A carreira vai na query (`?c=<id>`), porque o static
  export não tem rotas dinâmicas.
- `src/game/` — `GameProvider` (criar, abrir, apagar, simular rodada, salvar), seletores e layout.
- `src/storage/` — `SaveStore` sobre IndexedDB (saves + resumos, conflito entre abas),
  preferências no `localStorage`, aviso entre abas por `BroadcastChannel`.
- `src/ui/` — componentes (escudo SVG gerado dos dados, tabela ordenável, diálogos, atalhos).
- `src/i18n/` — `t`/`useT`/`<T>` sobre `packages/i18n/locales/pt-BR/ui.json`.
- `public/sw.js` — cache primeiro para todos os arquivos do build.

## Regras

- **Static export**: proibidos route handlers, SSR por requisição, server actions, middleware e
  otimização de imagens (constituição v1.1.0).
- **Nenhuma string visível no código**: tudo passa pelo i18n; `test/i18n/no-literals.test.ts`
  falha com texto literal em JSX ou em `title`/`aria-label`/`placeholder`/`alt`, e com chaves que
  não existem em `ui.json`.
- **Nenhuma regra de jogo na UI**: o app só usa a API pública do motor; o formato do save, as
  migrações e a validação ficam em `packages/save`.
