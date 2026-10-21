# Contrato de publicação (016)

## Versão

- Fonte única: `version` do `package.json` raiz (semver). Primeira pública: `1.0.0`.
- Publicar = mergear na `main` uma versão nova no `package.json`; o workflow `release` cria a tag
  `vX.Y.Z` e o Release ao fim (alterado depois da 018: antes a tag era criada à mão).

## Workflows (GitHub Actions)

### `.github/workflows/ci.yml` — PR

1. `pnpm install --frozen-lockfile` (Node ≥ 22.13, pnpm do `packageManager`)
2. `pnpm typecheck && pnpm lint && pnpm test`
3. `pnpm build:web`
4. `pnpm exec playwright install --with-deps chromium` e `pnpm test:e2e` (inclui a11y,
   teclado, offline, sem terceiros)
5. Artefato do relatório do Playwright em falha.

### `.github/workflows/release.yml` — push na `main` com versão sem tag

1. Passos 1–4 do CI.
2. `pnpm sim:world --seasons 30` e `pnpm sim:economy --seasons 30` (falham fora dos limites).
3. `pnpm check-release` (`tools/src/check-release.ts`):
   - tag (`RELEASE_TAG` sem `v`, definida pelo workflow como `v<versão>`) = `package.json` `version`;
   - `release-notes.json` tem a versão;
   - `apps/web/out/` existe, tem `index.html`, `sw.js`, `precache.json` com a versão,
     `manifest.webmanifest`, `vercel.json`, `screenshots/` com ≥ 4 imagens;
   - nenhum HTML/manifesto de `out/` contém "brasfoot" (case insensitive) em texto ou metadado.
4. `npx vercel@<versão fixa> deploy apps/web/out --prod --yes --token "$VERCEL_TOKEN"` com
   `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID`.
5. Cria a release do GitHub com as notas da versão (texto de `release-notes.json`).

Qualquer passo falhando ⇒ nada é publicado; a versão anterior continua no ar.

Organização em jobs (revisão de tempo): `checks` (typecheck + lint), `unit` (4 shards,
`--maxWorkers=2`), `e2e` (build + `check-release` + e2e, envia o `out/` como artefato) e, no
release, `simulations`; o job `deploy` depende de todos e publica o artefato testado.

## Segredos (cadastrados pelo mantenedor)

`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. O projeto Vercel é criado **sem**
integração Git (nada publica sozinho).

## `apps/web/public/vercel.json` (vai para `out/`)

- `trailingSlash: true`, `cleanUrls: false`.
- Headers: `/sw.js` e `/precache.json` → `Cache-Control: no-cache`;
  `/_next/static/(.*)` → `Cache-Control: public, max-age=31536000, immutable`.

## Scripts novos (`package.json` raiz → `tools`)

| Script | Faz |
|---|---|
| `pnpm check-release` | verificações do passo 3 |
| `pnpm screenshots` | gera `apps/web/public/screenshots/*.webp` a partir do build (Playwright, seed fixa, banco fictício) |

## Roteiro de lançamento (manual, uma vez)

1. Criar o projeto na Vercel (Hobby), sem conectar o Git; anotar org/project id; criar token.
2. Cadastrar os 3 segredos no repositório.
3. Rodar o teste de usabilidade (quickstart) e registrar em `usability.md`.
4. `pnpm screenshots`, revisar as capturas, commitar.
5. Atualizar notas da 1.0.0, versão, merge na `main`, `git tag v1.0.0 && git push --tags`.
6. Abrir o endereço publicado num navegador limpo, jogar uma rodada, desligar a rede,
   recarregar, continuar.
