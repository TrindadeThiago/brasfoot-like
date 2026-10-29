# Research: Fundação visual e estrutura do jogo

## R1 — Tokens: manter nomes, trocar valores
- **Decisão**: manter os `--color-*` existentes em `tokens.css`, reescrever os valores dos dois temas a partir dos mockups e acrescentar o grupo `--color-accent*` (destaque como parâmetro interno).
- **Razão**: 57 dos 63 módulos CSS já usam os tokens; herdam a paleta sem edição. Só 6 têm cores fixas (Pitch, MatchHighlights, continental/CampaignPanel, PlayerCondition, tips, UpdateNotice) e serão migrados.
- **Alternativas**: renomear todos os tokens (alto risco, diff enorme, sem ganho); biblioteca de CSS-in-JS (contraria a stack).

## R2 — Paleta clara e contraste
- **Decisão**: derivar o tema claro dos mesmos papéis semânticos; teste Vitest calcula a razão de contraste dos pares texto/superfície, destaque, perigo, aviso, info e borda de controle nos dois temas. Axe e2e nos dois temas já existe e segue.
- **Verificação feita**: escuro e claro passam (mín. 4,5:1 texto; 3:1 bordas de controle). Menor razão de texto: destaque sobre fundo claro 4,77:1; borda de controle clara 4,40:1.
- **Alternativas**: só validar por axe (não cobre tokens não renderizados).

## R3 — Fontes offline
- **Decisão**: commitar subconjuntos woff2 (latin e latin-ext) de Space Grotesk e Inter em `apps/web/public/fonts/`, `@font-face` com `font-display: swap`, licenças OFL ao lado. O precache do service worker já inclui tudo em `out/`.
- **Razão**: garante offline e zero terceiros (gates VIII e e2e no-third-party) sem dependência npm.
- **Alternativas**: `@fontsource` (nova dependência, mesmo resultado); `next/font/google` (baixa na build, aceitável mas depende de rede na CI); CDN (proibido).

## R4 — Ícones
- **Decisão**: módulo de SVG inline (`shell/icons.tsx`) com os ícones de navegação dos mockups, `aria-hidden`.
- **Alternativas**: pacote de ícones (dependência e peso); sprite externo (requisição extra).

## R5 — Arquitetura do shell
- **Decisão**: novo `ui/shell/` com `Sidebar`, `ScreenHeader`, `FocusScreen`, `screens.ts` (move `GAME_SCREENS`, `availableScreens`, `screenHref`). `GameLayout` recebe variante `club | focus` (foco: rodada, fim de temporada; páginas fora da carreira usam moldura de foco com Voltar). Contadores (Mercado, Carreira) ficam como selo dentro do link com texto acessível "Mercado (2)" preservado, para manter e2e e leitores de tela.
- **Preservado**: atalhos `go-*` por índice, `confirmLeave()`, redirecionamento de desempregado, `SaveIndicator` na linha do título, `TipHost`.

## R6 — Responsividade
- **Decisão**: remover `body{min-width:1024px}`; barra lateral fixa (sticky) a partir de 768 px, empilhada abaixo disso; tabelas largas rolam na própria caixa. Conteúdo mantém largura máxima.
- **Alternativas**: breakpoint 1024 (contraria SC de 768).

## R7 — Componentes-base
- **Decisão**: estender `Button` (variante texto), reaproveitar `Dialog`, `DataTable`, `FitnessMeter`; criar `Card`, `Tabs`, `Badge`, `Meter`, `Field`, `Notice`, `EmptyState`, `SectionLabel`. Unificar avisos existentes (Lineup/Market/SquadChange/Update) em `Notice` gradualmente, sem quebrar testes.
- **Razão**: as telas 026–031 consomem estes componentes.

## R8 — Versão 1.0.0 e notas beta
- **Decisão**: `package.json` raiz → 1.0.0; `release-notes-beta.json` (23 notas, mesmo esquema Zod, `betaReleaseNotes()`); `release-notes.json` com só a nota 1.0.0. Página de notas: h2 da nota atual + `<details>` "Fase beta" com h3 "beta X.Y.Z". `check-release` e workflow continuam lendo só `release-notes.json`. Ajustar `version.test.tsx` (contagem de h2) e `release-notes.test.ts`.
- **Risco**: o workflow de release cria tag/Release pela versão; a main fica congelada, então 1.0.0 só publica no PR final. A build em `release/v1.0.0` não dispara release.
- **Alternativas**: manter uma lista única com rótulo (esquema exige semver decrescente; beta 1.10.0 > 1.0.0 quebraria a ordem).

## R9 — Testes
- Unidade: contraste dos tokens, Sidebar (itens, contadores, item ativo `aria-current`), ScreenHeader, FocusScreen, componentes-base, notas beta.
- E2E novo `layout.spec.ts`: sem rolagem horizontal da página em 1440/1024/768 nos dois temas para as 19 telas. Existentes (a11y, teclado, offline, sem terceiros, update) permanecem.

## R10 — Desempenho
- Medir `out/` e tempo de abertura da 1.10.0 antes de alterar (linha de base: out 4,1 MB, JS ~1,9 MB, CSS ~45 KB); comparar ao fim com limite de 10%. Fontes: apenas dois pesos variáveis/subconjuntos para limitar o peso.

## R11 — Entrega
- PR com base `release/v1.0.0`; versão e notas no mesmo PR (sem PR de release separado); main congelada, sem preview online.
