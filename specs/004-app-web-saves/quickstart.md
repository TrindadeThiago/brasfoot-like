# Quickstart: validar a feature 004

Telas em [contracts/ui.md](contracts/ui.md); save em
[contracts/save-format.md](contracts/save-format.md).

## Pré-requisitos

Node 22, pnpm 11, `pnpm install`. Para o E2E, uma vez:
`pnpm --filter @brasfoot-like/web exec playwright install chromium`. No Linux/WSL o Chromium
precisa das bibliotecas do sistema (`libnss3`, `libnspr4`...):
`sudo pnpm --filter @brasfoot-like/web exec playwright install-deps chromium`. Sem sudo, dá para
baixar os pacotes com `apt-get download libnss3 libnspr4`, extrair com `dpkg-deb -x` numa pasta e
rodar o E2E com `LD_LIBRARY_PATH=<pasta>/usr/lib/x86_64-linux-gnu`.

## 1. Gates

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Inclui os testes de `packages/save` e de `apps/web` (componentes e fluxos com IndexedDB simulado).

## 2. Rodar o jogo

```bash
pnpm dev:web          # desenvolvimento em http://localhost:3000
pnpm build:web        # static export em apps/web/out (+ precache do service worker)
pnpm preview:web      # serve apps/web/out em http://localhost:4173
```

**Roteiro manual**:

1. Abrir `/`, escolher "Nova carreira", informar o nome, ordenar os clubes por força e escolher um.
2. Na tela inicial do clube, conferir próximo jogo e rodada 1/38; navegar com `1`–`4` e abrir a
   ajuda com `?`.
3. Apertar `S` três vezes; conferir resultados, tabela e calendário atualizados e o indicador
   "salvo".
4. Recarregar a página → "Continuar" leva à rodada 4.
5. Criar uma segunda carreira com outro clube; conferir as duas em "Carreiras salvas"; apagar uma
   e continuar a outra.
6. No build de produção (`preview:web`), após a primeira visita, desligar a rede no navegador e
   recarregar: o jogo abre e a carreira continua.

## 3. E2E

```bash
pnpm build:web && pnpm test:e2e
```

O Playwright serve `apps/web/out` em http://localhost:4173; sem o build ele não tem o que servir.

Cobre: criar carreira → recarregar → continuar no mesmo ponto; duas carreiras; abrir offline
depois da primeira visita.

## 4. Suítes

| Critério | Suíte |
|---|---|
| SC-004 migração / versão futura / corrompido | `packages/save/test/*.test.ts` |
| SC-002, SC-003 recarregar, duas carreiras | `apps/web/test/flows/*.test.tsx`, `apps/web/e2e/*.spec.ts` |
| FR-011 autosave e falha ao salvar | `apps/web/test/flows/autosave.test.tsx` |
| FR-013 duas abas | `apps/web/test/storage/conflict.test.ts` |
| FR-020 atalhos | `apps/web/test/ui/shortcuts.test.tsx` |
| FR-021 escudos | `apps/web/test/ui/crest.test.tsx` |
| SC-006 nenhuma string fora do i18n | `apps/web/test/i18n/no-literals.test.ts` |
| SC-007 offline | `apps/web/e2e/offline.spec.ts` |
