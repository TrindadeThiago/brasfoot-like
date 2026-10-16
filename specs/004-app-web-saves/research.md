# Research: Aplicação web, novo jogo e saves

**Feature**: `004-app-web-saves` | **Date**: 2026-10-16

Primeira feature com interface. A constituição (v1.1.0) fixa Next.js **só em static export**,
Biome, Vitest e IndexedDB. Formato: Decisão / Razão / Alternativas.

## R1. Organização: `apps/web` + pacote `save`

- **Decisão**: novo app `apps/web` (Next.js 16, App Router, `output: "export"`) e novo pacote puro
  `packages/save` (formato do save, validação e migrações, sem DOM). O adaptador de IndexedDB fica
  em `apps/web/src/storage/`. O banco padrão vira o pacote de workspace
  `@brasfoot-like/default-mod` (`mods/default/package.json`), importável pelo app.
- **Razão**: formato e migrações são regras testáveis em Node (Princípio VI) e serão reaproveitadas
  no Electron (arquivo em disco) e na exportação de saves (015); só o armazenamento muda. Tratar o
  banco padrão como pacote deixa o app importá-lo sem caminhos relativos para fora do projeto.
- **Alternativas**: tudo dentro do app (migração presa ao navegador); servir `mods/default` como
  arquivo estático e buscar com `fetch` (funciona, mas acrescenta estados de carregamento e
  dependência do cache para algo que pode ir no bundle).

## R2. Rotas em static export

- **Decisão**: rotas estáticas `/` (abertura), `/nova-carreira`, `/carreiras` e `/jogo`,
  `/jogo/elenco`, `/jogo/competicao`, `/jogo/calendario`. A carreira aberta é identificada pelo
  parâmetro `?c=<id>` e lida no cliente. Todas as páginas do jogo são componentes de cliente.
- **Razão**: o static export não gera rotas dinâmicas sem `generateStaticParams`, e ids de carreira
  só existem no navegador. Rotas fixas com parâmetro de busca funcionam em qualquer hospedagem
  estática (GitHub Pages, itch.io).
- **Alternativas**: `/jogo/[id]` (impossível em static export com ids criados no cliente); uma única
  página com abas (perde histórico do navegador e links diretos).

## R3. Estado e motor no navegador

- **Decisão**: um `GameProvider` (React context + `useReducer`) guarda a carreira aberta. As ações
  (`createCareer`, `simulateNextRound`, `deleteCareer`) chamam o motor de forma síncrona e depois o
  armazenamento. Sem biblioteca de estado. Pacotes do workspace entram via `transpilePackages`.
- **Razão**: criar uma carreira (~150 ms: validar banco, completar ocultos, esquemas preferidos) e
  simular uma rodada (~10 ms) cabem na thread principal; o estado é um único objeto (o save).
- **Alternativas**: Web Worker (útil se a 006 precisar; hoje é complexidade sem ganho); Redux ou
  Zustand (um objeto de estado não justifica dependência).

## R4. Formato do save e migrações (`packages/save`)

- **Decisão**: `SaveFile { formatVersion, id, createdAt, savedAt, managerName, clubId, seed, bank,
  season }`, com `SAVE_FORMAT_VERSION = 1`. `migrateSave(raw, migrations = MIGRATIONS)` aplica as
  migrações em cadeia (`n → n+1`) e valida o resultado com Zod (envelope) + `validateBank` +
  checagem de forma da temporada. Resultado: `ok`, `future_version`, `corrupt`. As migrações são
  injetáveis para que o teste simule um save "v0" com uma migração fictícia v0→v1.
- **Razão**: atende FR-009/FR-010 e o Princípio VI desde a primeira versão; o teste do critério de
  aceite ("save de versão anterior migrado") usa a mesma função que rodará com migrações reais.
- **Alternativas**: inventar uma v0 real só para ter migração (código morto); migração sem
  validação (save corrompido derrubaria o app).

## R5. IndexedDB

- **Decisão**: banco `brasfoot-like` (versão 1) com dois object stores: `saves` (id → `SaveFile`)
  e `summaries` (id → `SaveSummary`), gravados na mesma transação. A lista de carreiras lê só
  `summaries` (FR-007, SC-005). Biblioteca `idb` (wrapper de promessas, ~1 KB). Armazenamento
  indisponível ou cheio vira erro tipado mostrado ao jogador. Pedido de armazenamento persistente
  (`navigator.storage.persist()`) na criação da primeira carreira.
- **Razão**: o save tem ~1–2 MB (banco + registros); ler todos para montar a lista seria lento. Uma
  transação garante save e resumo consistentes.
- **Alternativas**: `localStorage` (limite de ~5 MB e síncrono); IndexedDB cru (verboso e propenso
  a erro).

## R6. Duas abas

- **Decisão**: cada aba guarda o `savedAt` da carreira aberta. Antes de gravar, relê o `savedAt` do
  resumo; se for mais novo que o seu, não grava e mostra o aviso "carreira alterada em outra aba"
  com as opções recarregar ou sobrescrever. Um `BroadcastChannel` avisa as outras abas a cada
  gravação, para o aviso aparecer de imediato.
- **Razão**: FR-013 sem travas; a checagem antes de gravar funciona mesmo sem `BroadcastChannel`.

## R7. Offline: service worker próprio

- **Decisão**: `public/sw.js` com cache primeiro para requisições GET da mesma origem. A lista de
  arquivos a pré-carregar é gerada depois do `next build` por um script (`tools`) que varre `out/`
  e grava `out/precache.json` com um hash de versão; o service worker instala esses arquivos e
  descarta caches de versões anteriores. Registro do service worker só no build de produção.
- **Razão**: FR-025/SC-007 sem dependência nova; o Serwist/next-pwa depende de integração com o
  bundler que não cobre bem o static export com Turbopack.
- **Alternativas**: Serwist (integração frágil com Turbopack); só cache HTTP (não garante abrir
  offline).

## R8. Escudos em SVG

- **Decisão**: componente `Crest` que desenha a forma (`classic`, `round`, `triangle`,
  `rectangle`) num `viewBox` fixo, com as cores do clube em faixas e as iniciais centralizadas,
  ajustando o tamanho da fonte ao número de letras. Cores de texto escolhidas pelo contraste com o
  fundo.
- **Razão**: FR-021; vetorial é nítido em qualquer tamanho e não tem arquivos de imagem.

## R9. i18n na interface

- **Decisão**: mensagens da UI em `packages/i18n/locales/pt-BR/ui.json` (ICU), expostas por
  `formatUi(key, values)`; no app, um hook `useT()` e o componente `<T k="…" />`. Datas e números
  com `Intl.DateTimeFormat`/`Intl.NumberFormat` em pt-BR. Um teste varre os `.tsx` do app e falha
  se encontrar texto literal com letras em JSX ou em atributos visíveis (`title`, `aria-label`,
  `placeholder`, `alt`).
- **Razão**: Princípio VII com verificação automática (SC-006); reaproveita o pacote de i18n e o
  formato ICU já usados.
- **Alternativas**: react-intl/next-intl (traz roteamento por idioma que não precisamos; o pacote
  atual já formata ICU).

## R10. Estilo e acessibilidade

- **Decisão**: CSS Modules + variáveis CSS (cores, espaçamentos, tipografia) num tema escuro e
  legível; fontes do sistema (nada de fontes remotas, para funcionar offline). Atalhos de teclado
  num hook global (`1`–`4` telas, `S` simular rodada, `?` ajuda, `Esc` fecha diálogos), ignorados
  quando o foco está num campo de texto. Foco visível em todos os controles; tabelas com
  cabeçalhos de coluna ordenáveis por teclado.
- **Razão**: FR-020/FR-023 sem dependências; CSS Modules já vêm com o Next.js.
- **Alternativas**: Tailwind (mais uma ferramenta e configuração; dá para adotar depois se o
  polimento da 016 pedir).

## R11. Testes da interface

- **Decisão**:
  - `packages/save`: Vitest em Node (formato, migrações, versão futura, corrompido).
  - `apps/web`: Vitest + Testing Library + happy-dom + `fake-indexeddb` para componentes e fluxos
    (criar carreira, "recarregar" remontando o app sobre o mesmo banco, duas carreiras, apagar,
    autosave, aviso de duas abas, atalhos, escudos, i18n).
  - **E2E** com Playwright (Chromium) sobre o build estático servido localmente: criar carreira →
    recarregar → continuar; abrir offline depois da primeira visita. Fica em `pnpm test:e2e`, fora
    do `pnpm test` (exige baixar o navegador), e é executado antes de cada PR desta feature em
    diante.
- **Razão**: a maior parte dos critérios é verificável sem navegador real; só reload real e
  offline precisam dele.
- **Alternativas**: só Playwright (lento); só happy-dom (não prova service worker nem reload real).
