# Research: Polimento e publicação (016)

Decisões técnicas da feature. Base: estado do código em 2026-10-20 (após a 015) e medições feitas
para este plano.

## Estado de partida

- Atalhos: `apps/web/src/ui/useShortcuts.ts` (ignora campos de texto e modificadores) usado em
  `GameLayout`, rodada, escalação, fim de temporada e abas de divisão; a ajuda
  (`ui/ShortcutsHelp.tsx`) tem uma lista fixa e só existe dentro do jogo.
- Preferências: `apps/web/src/storage/preferences.ts` (localStorage, chave
  `brasfoot-like:preferences`) já guarda `roundSpeed`, `autoPause`, `roundMode`, filtros.
- Tema: só escuro, tokens em `apps/web/src/styles/tokens.css` (`:root`).
- Offline: `public/sw.js` + `tools/src/precache.ts` (lista do build); o SW chama
  `skipWaiting()` sempre e apaga caches antigos no `activate`.
- i18n: `apps/web/test/i18n/no-literals.test.ts` já falha com texto JSX/atributos literais e com
  chave usada inexistente; não detecta chave sem uso.
- Sem CI (`.github/` não existe), sem manifesto de app instalável, sem versão visível;
  `app.title` = "brasfoot-like".

## R1 — Medições e limites de desempenho (FR-028, SC-005)

Medido (Node 22, WSL2), carreira do banco padrão após 30 temporadas (save 1,7 MB em JSON),
só o motor/save (sem IndexedDB nem React):

| Operação | Medido | Limite (teste) |
|---|---|---|
| Virada de temporada (`advanceCareerSeason`) | 64–83 ms | **< 400 ms** |
| Rodada direta das duas divisões + sistemas (`completeCareerRound`) | 20–75 ms | **< 250 ms** |
| Rodada direta pela interface (clique → resultado, inclui salvar) | 320 ms (happy-dom) | **< 1 s** |
| Virada pela interface (inclui salvar e resumo) | 212 ms (happy-dom) | **< 2 s** |

Medição da implementação (2026-10-20, mesma máquina; testes `long-career` e
`performance.test.tsx`): virada no motor 65 ms e rodada da carreira (início + fim + sistemas)
66 ms na temporada 31; pela interface, valores da tabela acima. Gates da release rodados
localmente: typecheck, lint, 2578 testes unitários, 23 e2e (2× seguidas), `check-release` com
`GITHUB_REF_NAME=v1.0.0`, `sim:world` e `sim:economy` de 30 temporadas — todos verdes.

- **Decision**: limites ~4–5× acima do medido, para tolerar máquinas mais lentas e o ambiente de
  CI; teste de motor em `packages/save/test/long-career.test.ts` (gera a carreira de 30
  temporadas uma vez, mede a mediana de 5 execuções) e teste de interface estendendo
  `apps/web/test/flows/performance.test.tsx` com um save de 30 temporadas. Indicador de
  progresso (FR-029) em qualquer operação assíncrona que passe de 1 s (virada já tem tela própria;
  a rodada direta ganha estado "Simulando…").
- **Rationale**: hoje há folga grande; o teste vira regressão para as próximas features.
- **Alternatives**: limites colados no medido (instáveis no CI); medir só pela interface (lento
  e ruidoso no happy-dom).

## R2 — Hospedagem e publicação (FR-032–FR-034, clarificação)

- **Decision**: Vercel (Hobby), projeto **sem integração Git** (nada publica a cada push).
  Publicação por GitHub Actions:
  - `.github/workflows/ci.yml` — em PR e push na `main`: install, typecheck, lint, test, build,
    e2e (com axe), verificação de textos.
  - `.github/workflows/release.yml` — em tag `v*.*.*`: os mesmos gates + `sim:world` e
    `sim:economy` (30 temporadas) + `tools/src/check-release.ts` (tag = versão do
    `package.json`, notas da versão existem, nenhum "brasfoot" visível no `out/`), então
    `vercel deploy apps/web/out --prod` com `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
    `VERCEL_PROJECT_ID` (segredos do repositório).
  - `apps/web/public/vercel.json` → copiado para `out/`: `sw.js` e `precache.json` com
    `Cache-Control: no-cache`; `trailingSlash: true`.
- **Rationale**: o FR-034 exige que só publique depois das verificações; deploy pelo CLI a partir
  do build já testado garante que o que foi testado é o que vai ao ar. Static export roda na
  raiz, sem `basePath`.
- **Alternatives**: integração Git da Vercel (publica antes/independente dos gates); GitHub
  Pages (exige repo público e subcaminho); Cloudflare Pages (equivalente, preterida pelo
  mantenedor).

## R3 — Atualização do service worker (FR-027, edge case da rodada ao vivo)

- **Decision**: o SW só chama `skipWaiting()` na primeira instalação (sem worker ativo). Numa
  atualização, o novo worker fica em espera; a página detecta (`registration.waiting` /
  `updatefound`) e mostra o aviso "Nova versão disponível — Recarregar" (fora da rodada ao
  vivo); ao confirmar, envia `{type: "SKIP_WAITING"}` e recarrega no `controllerchange`. O cache
  antigo só é apagado no `activate` do novo worker.
- **Rationale**: hoje uma versão nova ativa sozinha e apaga o cache com a página antiga aberta —
  chunks carregados sob demanda podem falhar. O save fica no IndexedDB e não é afetado.
- **Alternatives**: recarregar automaticamente (interrompe a rodada); manter o comportamento
  atual (risco acima).

## R4 — Tema claro/escuro (FR-007, FR-010, FR-017)

- **Decision**: tokens do tema escuro continuam em `:root`; tokens do claro em
  `[data-theme="light"]`. `data-theme` é aplicado no `<html>` por um script inline mínimo no
  `<head>` do `layout.tsx` (lê a preferência e `prefers-color-scheme` antes da pintura, sem
  flash) e atualizado ao vivo por um `ThemeProvider` (inclui ouvir mudança do sistema quando o
  tema é "sistema"). `color-scheme` acompanha (controles nativos).
- Contraste verificado por teste unitário (`apps/web/test/ui/contrast.test.ts`) que lê os
  tokens dos dois temas em `tokens.css` e confere os pares texto/fundo (4,5:1) e
  borda/controle/foco (3:1) pela fórmula de luminância relativa (WCAG 2.x).
- **Rationale**: tokens já centralizam cores; o script inline é permitido no static export.
- **Alternatives**: só `prefers-color-scheme` (sem escolha do jogador); CSS-in-JS (dependência
  nova sem ganho).

## R5 — Atalhos: fonte única (FR-013–FR-016)

- **Decision**: `apps/web/src/ui/shortcuts.ts` com o registro `SHORTCUTS` (`id`, `keys`,
  `labelKey`, `scope: "global" | ScreenId`). `useShortcuts` passa a receber
  `{ [id]: handler }` e resolve as teclas pelo registro; a ajuda lista o registro filtrado por
  "global" + tela atual (`ShortcutScopeProvider` define a tela). Globais novos: `?` ajuda (em
  todas as telas, inclusive fora do jogo), `,` configurações, `Esc` fecha diálogo/dica.
  Teste: nenhuma tecla repetida dentro de um escopo nem entre global e tela; todo `id` usado
  por uma tela existe; toda entrada tem texto.
- **Rationale**: elimina a lista fixa da ajuda divergindo do comportamento (SC-007).
- **Alternatives**: biblioteca de hotkeys (dependência para algo já resolvido).

## R6 — Dicas e primeiro acesso (FR-001–FR-006)

- **Decision**: catálogo `apps/web/src/ui/tips/catalog.ts` (`id`, `screen`, `titleKey`,
  `bodyKey`, `shortcutId?`, `anchor?` = seletor `data-tip-anchor`). `TipsProvider` (estado em
  preferências) e `<TipHost screen=…>` mostram a primeira dica não vista da tela, como painel
  não modal (`role="dialog"` não modal, `aria-labelledby`, foco movido para ele e devolvido ao
  fechar; Esc fecha), ancorado ao elemento quando visível, senão no canto da tela. Espera
  qualquer diálogo modal fechar. Boas-vindas na tela inicial quando não há carreiras salvas nem
  dicas registradas. Dicas: welcome, home-next-step, lineup, round-live, round-direct, table,
  market, board.
- **Rationale**: dicas nas telas reais, sem carreira de tutorial (premissa da spec).
- **Alternatives**: biblioteca de tour (peso e acessibilidade incertos); tutorial em carreira
  separada (fora do escopo).

## R7 — Configurações (FR-007–FR-012)

- **Decision**: rota `apps/web/src/app/configuracoes/page.tsx`; campos ligados às mesmas
  preferências (`roundSpeed`, `autoPause` existentes; novos `theme`, `locale`, `tips`).
  Leitura validada por schema Zod pequeno com `catch` para o padrão em cada campo (valores
  desconhecidos voltam ao padrão, FR-012). Idiomas listados de `packages/i18n` (`LOCALES`
  derivado das pastas de locales, só `pt-BR`). "Voltar" volta ao `document.referrer`/rota
  anterior (router `back`, com fallback para `/`).
- **Rationale**: reaproveita o que a rodada ao vivo já lê (FR-009).

## R8 — Versão e notas (FR-024–FR-026)

- **Decision**: versão única = `version` do `package.json` raiz (vai a **1.0.0**), exposta ao app
  por `next.config.ts` (`env.NEXT_PUBLIC_APP_VERSION`). Notas em
  `packages/i18n/locales/pt-BR/release-notes.json` (`[{version, date, changes: string[]}]`,
  validado por Zod), exibidas em `/notas-de-versao/`. Teste/`check-release`: a versão atual tem
  notas. Aviso de novidades: `lastSeenVersion` nas preferências; se existe e difere da atual →
  aviso único na tela inicial; se não existe e há carreiras → também (veio de antes da 016).
- **Rationale**: notas são conteúdo por idioma (Princípio VII), offline (no build).

## R9 — Acessibilidade e consistência (FR-017–FR-023)

- **Decision**: `@axe-core/playwright` no e2e (`apps/web/e2e/a11y.spec.ts`) nas telas: inicial,
  nova carreira, carreiras, mods, configurações, sobre, jogo (início, elenco, escalação,
  competição, rodada ao vivo, mercado, carreira), nos dois temas; falha em violações
  `serious`/`critical`. E2e de teclado (`keyboard.spec.ts`): nova carreira → escalação →
  rodada → tabela → mercado → salvar só com teclado. `:focus-visible` global com o anel de foco
  nos dois temas; `@media (prefers-reduced-motion: reduce)` zera transições/animações. Revisão
  visual tela a tela com checklist (`contracts/ui.md`) — títulos, botões, vazios, erros.
- **Rationale**: varredura automática pega a maioria dos problemas; o resto é revisão guiada.

## R10 — Textos e nome (FR-030, FR-031, FR-038)

- **Decision**: estender `no-literals.test.ts` para também falhar com **chave sem uso**
  (chaves definidas em `ui.json` não referenciadas; prefixos montados dinamicamente declarados
  numa lista `DYNAMIC_PREFIXES` no teste). Nome do jogo em `app.name` = "Treinador FC" usado por
  `app.title`, manifesto, página de apresentação; teste que falha se algum valor de
  `ui.json`/`errors.json`/notas ou o HTML/manifesto do build contiver "brasfoot" (case
  insensitive). Glossário curto em `docs/glossario.md`; revisão manual de todo `ui.json`.
- Identificadores internos (pacotes `@brasfoot-like/*`, chave de localStorage, nome do cache do
  SW, IndexedDB) **não mudam**: não são visíveis e trocar perderia dados dos jogadores atuais.

## R11 — Página de apresentação, capturas e app instalável (FR-035, FR-036)

- **Decision**: rota `/sobre/` com descrição, ≥ 4 capturas, aviso de conteúdo (sem nomes,
  escudos ou marcas reais; nomes reais só via mods), "gratuito e sem anúncios", link para jogar
  e para as notas. Link "Sobre o jogo" na tela inicial. Capturas geradas por
  `tools/src/screenshots.ts` (Playwright sobre o build, seed fixa, banco fictício) em
  `apps/web/public/screenshots/*.webp` (`pnpm screenshots`), versionadas. Manifesto
  `public/manifest.webmanifest` (nome "Treinador FC", ícones gerados do escudo do jogo, tema) e
  meta tags (`description`, Open Graph com uma captura).
- **Rationale**: capturas reproduzíveis garantem que não há conteúdo real (FR-036).

## R12 — Sem rede de terceiros (FR-037, SC-010)

- **Decision**: e2e `no-third-party.spec.ts` registra todas as requisições durante criar
  carreira e jogar uma rodada e falha com qualquer origem diferente da do site. Nenhuma fonte,
  script ou analytics externo é adicionado.

## R13 — Teste com quem nunca viu o jogo (SC-001)

- **Decision**: roteiro em `quickstart.md` §Teste de usabilidade (tarefa, regras do observador,
  o que anotar); resultado registrado em `specs/016-polimento-publicacao/usability.md` antes da
  tag 1.0.0. Problemas encontrados viram ajustes de dica/texto antes do lançamento.

## Revisão de consistência (T039, implementação)

Checklist de `contracts/ui.md` aplicado tela a tela (código + varredura axe/teclado do e2e):

- **Títulos**: dentro do jogo o `<h1>` é o clube (cabeçalho). Mercado, Finanças, Histórico,
  Notícias, Carreira, Fim de temporada e Rodada ao vivo tinham um segundo `<h1>` com o nome da
  tela → viraram `<h2 class="screen-title">` (mesmo tamanho visual, `--text-xl`). Fora do jogo,
  cada tela tem um `<h1>` (inicial, carreiras, nova carreira, mods, configurações, sobre, notas).
- **Voltar**: Nova carreira era a única tela fora do jogo sem "Voltar" → link no topo, como em
  Carreiras, Mods, Sobre e Notas. Configurações usa botão (volta à rota anterior).
- **Saída do jogo**: não havia caminho do jogo para o menu inicial (nem por teclado) → link
  "Menu inicial" no cabeçalho do jogo, com o mesmo aviso de saída da rodada ao vivo.
- **Foco visível**: anel de foco trocado de `box-shadow` para `outline` (não some dentro de
  áreas com `overflow` nem no alto contraste); `DataTable` alinhado ao mesmo estilo.
- **Movimento reduzido**: `prefers-reduced-motion: reduce` zera animações/transições (único
  caso: o destaque de gol da `LiveGrid`).
- **Tabelas**: `DataTable` já gera `caption` e `th scope="col"`; o comparador do mercado usa
  `aria-label` no lugar do `caption`. Sem mudança.
- **Estados vazios/erros e anúncios**: erros com `role="alert"`, salvamento com `aria-live`,
  importação e mods com `role="status"` — já atendiam. Novos: "Simulando a rodada…",
  novidades da versão e aviso de nova versão com `role="status"`.
- **Ajuda de atalhos**: sem frases "(na Escalação)" etc., agora que a ajuda separa "Gerais" e
  "Desta tela".
- Resultado da varredura axe (WCAG 2.1 A/AA) nas 15 telas/estados, nos dois temas: 0 violações
  de qualquer gravidade.

## Tempo dos testes (revisão pós-implementação)

- O `pnpm test` levava ~19 min no CI: repositório privado → runner com 2 vCPUs, e o Vitest usa
  `cores − 1` = 1 worker. O CI agora divide os testes unitários em 4 shards paralelos com
  `--maxWorkers=2` e roda typecheck/lint e e2e em jobs próprios (o release também; o deploy usa
  o build testado pelo e2e).
- Carreiras de 30 temporadas simuladas mais de uma vez: o desempenho do motor (016) passou para
  o mesmo arquivo do teste de tamanho do save (014), `packages/save/test/long-career.test.ts`,
  com uma única simulação; o teste de interface usa 10 temporadas.
- `engine/test/renewal/long-run.test.ts` (121 s, o caminho crítico local) virou um arquivo por
  seed, para as duas rodarem em paralelo; mesma cobertura.
- E2E local: no WSL com rede "mirrored" a verificação de porta do Playwright em 127.0.0.1
  esperava ~2,5 min por execução; fora do CI ela usa `[::1]`.
