# Tasks: Fundação visual e estrutura do jogo

**Input**: `specs/025-fundacao-visual-estrutura/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)
**Tests**: incluídos (constituição IX: testes antes/junto da implementação; spec exige regressão, contraste e e2e).
**Formato**: `- [ ] T### [P?] [US?] Descrição com caminho`. Caminhos relativos à raiz do repositório; `W` = `apps/web`.

## Phase 1: Setup

- [ ] T001 Medir a linha de base da 1.10.0: `pnpm build:web`, registrar tamanho de `apps/web/out` (total, JS, CSS) e o tempo de abertura em `specs/025-fundacao-visual-estrutura/baseline.md`; método fixo: Playwright mede o tempo até a primeira tela utilizável do menu inicial, mediana de 5 execuções, com o build servido localmente
- [ ] T002 [P] Baixar os subconjuntos woff2 (latin, latin-ext) de Space Grotesk e Inter para `apps/web/public/fonts/` com os textos de licença OFL (`OFL-SpaceGrotesk.txt`, `OFL-Inter.txt`)
- [ ] T003 [P] Criar `apps/web/src/styles/fonts.css` com os `@font-face` (`font-display: swap`) e importá-lo em `apps/web/src/app/layout.tsx`

## Phase 2: Foundational (bloqueia todas as histórias)

- [ ] T004 Reescrever `apps/web/src/styles/tokens.css` com as paletas escuro e claro de `contracts/design-tokens.md`, mantendo os nomes `--color-*` existentes e acrescentando `--color-accent`, `--color-on-accent`, `--color-sidebar`, `--color-control-border`, `--font-display`, `--font-body`, espaçamento e raios, e definir as pilhas de fontes com reserva de sistema (`--font-display`, `--font-body`) para que o texto continue legível se um woff2 falhar
- [ ] T005 Remover `body{min-width:1024px}` e conferir foco visível, `[data-tip-anchor]` e movimento reduzido em `apps/web/src/styles/global.css`; aplicar `--font-body` ao corpo e `--font-display` a títulos
- [ ] T006 [P] Adicionar as chaves novas de navegação, shell e "Fase beta" em `packages/i18n/src/locales/pt-BR/ui.json` (rótulos das dez telas já existentes são reaproveitados; novos: título da navegação, voltar, fase beta, "beta {version}", frase da fase beta)
- [ ] T007 [P] Criar `apps/web/src/ui/shell/icons.tsx` com os ícones SVG inline (`aria-hidden`) das dez telas e do rodapé, conforme os mockups em `docs/interface-nova/`

**Checkpoint**: base visual disponível; histórias podem começar.

## Phase 3: User Story 1 — Navegar pelo clube numa barra lateral (P1) 🎯 MVP

**Meta**: barra lateral com dez telas, contadores, rodapé, título de tela e telas de foco.
**Teste independente**: abrir uma carreira, ir a cada tela pela barra lateral; contadores de Mercado/Carreira aparecem; rodada e fim de temporada sem barra; a 768 px a barra empilha.

### Testes

- [ ] T008 [P] [US1] Teste de `Sidebar` (10 itens na ordem de `GAME_SCREENS`, `aria-current`, selo "Mercado (2)" no nome acessível, sem selo em zero, selo de 3 dígitos sem estourar, rodapé com Menu inicial/Configurações/Atalhos) em `apps/web/test/ui/shell/sidebar.test.tsx`
- [ ] T009 [P] [US1] Teste de `ScreenHeader` e `FocusScreen` (um `h1`, clube/técnico/série/temporada/rodada, Voltar fora da carreira, nome de clube/técnico muito longo truncado) em `apps/web/test/ui/shell/screen-header.test.tsx`
- [ ] T010 [P] [US1] Teste de `GameLayout` variantes `club`/`focus` por rota redirecionamento de desempregado e mensagens de carregando/erro dentro do shell em `apps/web/test/game/game-layout.test.tsx`

### Implementação

- [ ] T011 [US1] Mover `GAME_SCREENS`, `availableScreens`, `screenHref` de `apps/web/src/ui/AppHeader.tsx` para `apps/web/src/ui/shell/screens.ts` e atualizar os imports (incl. `GlobalShortcuts`/atalhos `go-*`)
- [ ] T012 [P] [US1] Criar `apps/web/src/ui/shell/Sidebar.tsx` e `Sidebar.module.css` (sticky ≥768 px, empilhada <768 px, contadores dentro do link com limite de largura para valores grandes, rodapé com Menu inicial, Configurações, botão Atalhos via `useOpenShortcutsHelp` e `confirmLeave()` herdado do `AppHeader`)
- [ ] T013 [P] [US1] Criar `apps/web/src/ui/shell/ScreenHeader.tsx` e `.module.css` (título com clube, técnico, série, temporada, rodada; nomes longos truncados com reticências sem sobrepor; `SaveIndicator` e ações na linha do título)
- [ ] T014 [P] [US1] Criar `apps/web/src/ui/shell/FocusScreen.tsx` e `.module.css` (sem barra lateral, Voltar quando fora da carreira)
- [ ] T015 [US1] Adaptar `apps/web/src/game/GameLayout.tsx` e `.module.css` para a variante `club | focus` (foco em `/jogo/rodada` e `/jogo/fim-de-temporada`), preservando atalhos, `confirmLeave()`, `TipHost` e diálogos
- [ ] T016 [US1] Aplicar `FocusScreen` às páginas de fora da carreira (menu, nova carreira, carreiras, configurações, mods, sobre, notas) em `apps/web/src/app/**/page.tsx`
- [ ] T017 [US1] Remover `apps/web/src/ui/AppHeader.tsx` e `.module.css` após migrar todos os usos (destinos: `SaveIndicator` no `ScreenHeader`; Atalhos, Menu inicial, Configurações e `confirmLeave()` na `Sidebar`)

**Checkpoint**: US1 funcional e testável sozinha.

## Phase 4: User Story 2 — Visual consistente em todas as telas (P1)

**Meta**: componentes-base compartilhados; telas atuais coerentes sem refazê-las.
**Teste independente**: percorrer as 19 telas sem texto ilegível, tabela largas rolando no próprio quadro.

- [ ] T018 [P] [US2] Testes dos componentes-base (estados, variantes, acessibilidade) em `apps/web/test/ui/base-components.test.tsx`
- [ ] T019 [P] [US2] Adicionar variante texto a `apps/web/src/ui/Button.tsx` e `Button.module.css` (primário, secundário, perigo, texto; estados hover/foco/desabilitado)
- [ ] T020 [P] [US2] Criar `Card.tsx` + `Card.module.css` em `apps/web/src/ui/`
- [ ] T021 [P] [US2] Criar `Tabs.tsx` + `Tabs.module.css` (papel `tablist`, setas do teclado) em `apps/web/src/ui/`
- [ ] T022 [P] [US2] Criar `Badge.tsx` + `Badge.module.css` e `Meter.tsx` + `Meter.module.css` (barra de indicador; reaproveitar `FitnessMeter`) em `apps/web/src/ui/`
- [ ] T023 [P] [US2] Criar `Field.tsx` + `Field.module.css` (campo e seletor com rótulo e erro) em `apps/web/src/ui/`
- [ ] T024 [P] [US2] Criar `Notice.tsx` + `Notice.module.css` (informação, atenção, perigo) e migrar `LineupNotice`, `MarketNotice`, `SquadChangeNotice`, `UpdateNotice` para usá-lo sem alterar seus testes
- [ ] T025 [P] [US2] Criar `EmptyState.tsx` e `SectionLabel.tsx` com módulos CSS em `apps/web/src/ui/`
- [ ] T026 [US2] Ajustar `apps/web/src/ui/DataTable.tsx` e `DataTable.module.css` e `Dialog.module.css` ao novo visual; tabelas largas rolam no próprio quadro
- [ ] T027 [US2] Revisar visualmente as 10 telas do clube nos dois temas e corrigir módulos CSS que fiquem ilegíveis (`apps/web/src/**/*.module.css`)

## Phase 5: User Story 3 — Tema escuro e claro com a mesma qualidade (P1)

**Meta**: contraste mínimo em ambos os temas; troca instantânea e persistente.
**Teste independente**: alternar Sistema/Escuro/Claro com a página aberta; axe sem violações em todas as telas.

- [ ] T028 [P] [US3] Estender `apps/web/test/ui/contrast.test.ts` (016) com os pares novos nos dois temas: `--color-accent`, `--color-on-accent`, `--color-sidebar`, `--color-control-border` (texto ≥ 4,5:1; borda de controle ≥ 3:1)
- [ ] T029 [P] [US3] Migrar cores fixas para tokens em `Pitch.module.css`, `MatchHighlights.module.css`, `continental/CampaignPanel.module.css`, `PlayerCondition.module.css`, `tips.module.css`, `UpdateNotice.module.css` (em `apps/web/src/`)
- [ ] T030 [US3] Garantir que `THEME_SCRIPT`/`ThemeSync` em `apps/web/src/ui/ThemeProvider.tsx` aplicam os novos tokens sem piscar e que o padrão continua "Sistema" com reserva escura; ajustar teste existente se necessário; acrescentar testes de: acompanhar mudança da preferência do sistema em tempo real, preferência de tema salva antes respeitada, troca de tema sem interromper a rodada ao vivo, e legibilidade dos cartões sobre o campo da escalação no tema claro (axe na tela de escalação)
- [ ] T031 [US3] Estender `apps/web/e2e/a11y.spec.ts` para cobrir as 19 telas nos dois temas com axe

## Phase 6: User Story 4 — Teclado, atalhos e comportamentos atuais (P2)

**Meta**: nada do que existia regride.
**Teste independente**: suíte atual de teclado/atalhos/offline passa; fluxo criar carreira → jogar rodada completa.

- [ ] T032 [P] [US4] Teste de ordem de Tab e foco visível sidebar → conteúdo em `apps/web/e2e/keyboard.spec.ts` (estender)
- [ ] T033 [P] [US4] Criar `apps/web/e2e/layout.spec.ts`: sem rolagem horizontal da página em 1440/1024/768 px, 19 telas × 2 temas; a 600 px, barra lateral acima do conteúdo com as dez telas presentes e sem rolagem horizontal
- [ ] T034 [US4] Verificar atalhos `go-*`, ajuda de atalhos, trava de saída, dicas, aviso de atualização e clube desempregado contra a nova estrutura; corrigir regressões em `apps/web/src/ui/GlobalShortcuts.tsx` e `apps/web/src/game/GameLayout.tsx`
- [ ] T035 [US4] Confirmar `apps/web/e2e/offline.spec.ts` e `no-third-party.spec.ts` com as fontes locais; ajustar `tools/src/precache.ts` se `public/fonts` não entrar no precache; acrescentar ao e2e offline a checagem de que os woff2 são servidos do cache sem requisição externa

## Phase 7: User Story 5 — Numeração reiniciada e notas da fase beta (P2)

**Meta**: versão 1.0.0; 23 notas preservadas como beta; uma única nota 1.0.0.
**Teste independente**: `/notas-de-versao/` mostra a nota 1.0.0 e "Fase beta" recolhida com 23 notas; `check-release` passa.

- [ ] T036 [P] [US5] Atualizar `packages/i18n/test/release-notes.test.ts` (nota atual única 1.0.0 = versão do `package.json`; beta com 23 notas, estritamente decrescentes, mesmo esquema)
- [ ] T037 [P] [US5] Atualizar `apps/web/test/ui/version.test.tsx` (h2 = notas atuais; `<details>` "Fase beta" com 23 h3 "beta X.Y.Z") e `tools/test/check-release.test.ts`
- [ ] T038 [US5] Mover as 23 notas para `packages/i18n/src/locales/pt-BR/release-notes-beta.json` e deixar em `release-notes.json` somente a nota 1.0.0
- [ ] T039 [US5] Adicionar `betaReleaseNotes()` em `packages/i18n/src/release-notes.ts` reaproveitando o esquema Zod
- [ ] T040 [US5] Atualizar `apps/web/src/app/notas-de-versao/page.tsx` com a seção recolhida "Fase beta"
- [ ] T041 [US5] Subir `package.json` raiz para 1.0.0 e verificar menu inicial, Sobre e o aviso de novidades (`seen !== APP_VERSION`) para quem viu 1.10.0
- [ ] T042 [US5] Rodar `tools/src/check-release.ts` e confirmar que lê só `release-notes.json`; conferir `.github/workflows/release.yml` sem mudanças necessárias

## Phase 8: Polish & transversais

- [ ] T043 [P] Rodar `pnpm lint` e `pnpm typecheck` e corrigir pendências
- [ ] T044 Rodar `pnpm test` e `pnpm test:e2e` completos
- [ ] T045 Medir novamente o build e comparar com `baseline.md` (abertura ≤ +10%, SC-007); registrar o resultado
- [ ] T046 Executar a validação manual de `specs/025-fundacao-visual-estrutura/quickstart.md`
- [ ] T047 Abrir PR com `--base release/v1.0.0` (versão e notas no mesmo PR)

## Dependências

- Setup → Foundational → histórias. US1, US2 e US3 podem andar em paralelo após a Phase 2, mas US1 antes de T027/T033/T034 (precisam da estrutura).
- US3 (T029) e US2 (T024) tocam `UpdateNotice`: fazer T024 antes de T029.
- US4 e a Phase 8 dependem de US1–US3 e US5 prontos; US5 é independente das demais.

## Execução paralela (exemplos)

- Após Phase 2: T008–T010 (testes US1), T018 e T028 em paralelo.
- US2: T019–T025 (arquivos distintos) em paralelo.
- US5: T036 e T037 em paralelo, depois T038–T040.

## Estratégia

MVP = Phase 1 + 2 + US1 (navegação nova funcionando). Depois US2/US3 (visual e temas), US4 (regressão), US5 (versão). Um PR único para `release/v1.0.0`, commits por fase.
