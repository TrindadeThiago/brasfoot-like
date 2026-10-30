# Tasks: Telas estreitas, acessibilidade e fechamento do marco

**Input**: `specs/032-telas-estreitas-e-fechamento/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)
**Tests**: incluídos (constituição IX; a spec exige verificação de largura, acessibilidade, desempenho e consistência).
**Formato**: `- [ ] T### [P?] [US?] Descrição com caminho`. `W` = `apps/web`. Base de trabalho e do PR: `release/v1.0.0` (o PR final para a `main` só abre sob pedido explícito).

**Lições das features anteriores (valem aqui):** `aria-label` que não contém o texto visível reprova no axe (`label-content-name-mismatch`); chave de i18n sem uso derruba `test/i18n/no-literals.test.ts` (chave nova entra junto do componente que a usa; chave antiga sem uso sai na mesma tarefa); props opcionais precisam de `| undefined` (`exactOptionalPropertyTypes`); `page.getByRole("alert")` no e2e também acha o anunciador de rota do Next, então limitar ao `form`/`main`; `getByText` do Playwright casa por substring (usar `exact: true`); `click()` do Playwright acusa o link estendido de cartão como interceptador (usar `page.mouse.click`); o e2e roda contra o **build** (`pnpm build:web` antes, e depois de toda mudança de código); a suíte completa de unidade roda da **raiz** (`pnpm exec vitest run`) e `football-world-scale.test.ts` pode estourar o tempo sob carga (passa isolado); testes pesados com timeout explícito; helpers de teste ficam em `W/test/helpers/`; a pasta `test-results/` é apagada a cada execução do Playwright (capturas ficam em `W/screens-*`); `W/AGENTS.md` é gerado pelo `next dev` e não entra no commit.

**Regra do marco:** nenhuma tarefa muda motor, regras, formato de save, formato de mod ou dados (`SCALE_LIMITS` não é editado). Tudo que for texto de interface passa pelo i18n.

## Phase 1: Setup

- [X] T001 Medir a linha de base em `specs/032-telas-estreitas-e-fechamento/baseline.md`: `pnpm build:web`; tamanho de `W/out` (total, JS, CSS, arquivos do precache); abertura de **todas** as telas (menu, nova carreira, carreiras, configurações, mods, sobre, notas, as dez do clube, rodada ao vivo, fim de temporada; mediana de 5, método do Playwright das features 029 a 031); tempo de navegar entre as dez telas do clube; ordenar e filtrar as tabelas longas (440 clubes na Nova carreira, elenco, classificação, mercado) e comparar cada medida com o `baseline.md` da feature que a refez (tolerância de 10%)
- [X] T002 Registrar em `baseline.md` o ponto de partida das metas da 020: rodar `pnpm sim:world --scale --countries 3 --seasons 3` (curta, só para ver o formato) e anotar os valores de `SCALE_LIMITS` (`packages/save/src/scale-limits.ts`) que os gates vão conferir (dia 600 ms, virada 6 000 ms, heap 1 GiB, save 12,5 MB e 42 MB, export 6 MB); as simulações de 30 temporadas rodam na US7 (T043 a T045)

## Phase 2: Foundational (bloqueia as histórias)

- [X] T003 Criar a lista única de telas, abas e diálogos em `W/e2e/screens-list.ts`: cada item com nome, caminho (e `?c=` quando é do clube), a ação para abrir a aba ou o diálogo (as mesmas ações de `a11y.spec.ts` e `layout.spec.ts`: modal do jogador, comparação, oferta, abas de Finanças e Carreira, Notícias com filtro, ajuda de atalhos, rodada pausada com Meu time e diálogo de saída, fim de temporada, apagar carreira, remover e substituir mod, erros da Nova carreira); passar `a11y.spec.ts` e `layout.spec.ts` a usá-la, sem mudar o que verificam
- [X] T004 [P] Auxiliares do e2e em `W/e2e/helpers.ts`: `setTheme(page, theme)` (preferência `theme` antes de carregar), `setViewport(page, width)` e `zoomTo200(page)` (janela de 1 280 px com `deviceScaleFactor` e zoom por `page.addInitScript`/CSS zoom, o que equivale a 640 px úteis), reaproveitando `skipTips`/`createCareer`

**Checkpoint**: lista única e auxiliares prontos; as histórias montam seus testes em cima delas.

## Phase 3: User Story 1 — Jogar em tablet ou em janela estreita (P1) 🎯 MVP

**Meta**: todas as telas usáveis de 768 px em diante sem rolagem horizontal da página; abaixo disso a barra empilha e as colunas viram uma.
**Teste independente**: percorrer a lista única em 1 440, 1 024, 768 e 600 px e com zoom de 200%, nos dois temas.

- [X] T005 [US1] Teste da matriz responsiva em `W/e2e/responsive.spec.ts`: para cada item de `screens-list.ts`, nas larguras 1 440, 1 024, 768 e 600 px e com zoom de 200%, nos dois temas, conferir (a) `scrollWidth` do documento não passa de `clientWidth`, (b) sem texto cortado (a verificação `expectNoClippedText` de `layout.spec.ts`, extraída para `helpers.ts`), (c) a ação principal da tela visível e acionável, (d) abaixo de 768 px o menu de navegação fica acima do conteúdo e tem as dez telas; o teste vai falhar nas telas que quebram e o resultado alimenta T006 a T011
- [X] T006 [US1] Rodar `responsive.spec.ts` e registrar em `baseline.md` a lista das falhas (tela, largura, tema, causa); agrupar por causa (coluna que não vira uma, tabela sem contêiner, nome longo, diálogo maior que a janela, barra de controle da rodada, cartão fixo)
- [X] T007 [P] [US1] Corrigir colunas e estrutura em telas estreitas: ajustar as consultas de largura em `W/src/ui/shell/*.module.css`, `W/src/app/jogo/**/page.module.css` e módulos de `W/src/ui/**` apontados em T006, para que colunas virem uma abaixo de 768 px e painéis laterais (Notícias, Competição, Carreira) fiquem acima ou abaixo do conteúdo sem perder função
- [X] T008 [P] [US1] Tabelas largas e nomes longos: garantir que toda tabela use `W/src/ui/DataTable.tsx` (contêiner com rolagem própria e `stickyFirst` quando preciso) e aplicar `overflow-wrap: anywhere` e reticências com o nome completo acessível (`title` ou nome acessível) nos nomes de clube, jogador, competição e mod em `W/src/ui/**.module.css` apontados em T006
- [X] T009 [P] [US1] Rodada ao vivo em 768 px e abaixo: placar, minuto, estado, barra de controle e painel Meu time sem sobreposição e sem rolagem horizontal, em `W/src/ui/live/*.module.css` e `W/src/app/jogo/rodada/page.module.css`; conferir que o aviso de atualização continua fora da rodada
- [X] T010 [P] [US1] Diálogos em janela estreita: o diálogo cabe na janela, rola por dentro e mantém o foco preso, em `W/src/ui/Dialog.module.css`; conferir modais do jogador, comparação, oferta, ajuda, apagar, remover, substituir e saída
- [X] T011 [US1] Rodar `pnpm build:web` e `responsive.spec.ts` até ficar verde nas quatro larguras, no zoom de 200% e nos dois temas; atualizar `layout.spec.ts` para cobrir a largura de 600 px em todas as telas (hoje só o Elenco) reaproveitando a lista única

**Checkpoint**: nenhuma tela rola na horizontal de 768 px em diante e todas funcionam abaixo disso.

## Phase 4: User Story 2 — Acessibilidade tão boa quanto na 016 (P1)

**Meta**: contraste, foco, nomes, títulos, teclado, anúncios e movimento reduzido nos dois temas.
**Teste independente**: revisão de acessibilidade em todas as telas e diálogos da lista única, nos dois temas, e os quatro fluxos só com o teclado.

- [X] T012 [P] [US2] Ampliar `W/test/ui/contrast.test.ts` com os pares dos componentes novos nos dois temas: selos (`Badge`, cinco tons), avisos (`Notice`, três tons e o título), estados desabilitados, bordas de campos e de selects, medidores (`Meter`), texto sobre o destaque, marca "Nova", links nos cartões; falhar com texto abaixo de 4,5:1 e componente ou texto grande abaixo de 3:1
- [X] T013 [P] [US2] Teste de títulos e regiões em `W/test/ui/headings.test.tsx`: renderizar cada tela (rotas de `W/test/helpers/app.tsx`) e conferir um único `h1`, níveis sem salto (h1 → h2 → h3) e nome único para cada região (`section` com nome) na tela
- [X] T014 [P] [US2] Ampliar `W/e2e/a11y.spec.ts` (já usa a lista única pela T003) com as telas e diálogos que ainda não estavam: fim de temporada, diálogos de Mods (substituir e remover), ajuda aberta a partir de cada tela de fora, Nova carreira com o mundo grande e com erros, e, abaixo de 768 px (600 px), as telas principais; falha com violação `serious` ou `critical`, nos dois temas
- [X] T015 [P] [US2] Ampliar `W/e2e/keyboard.spec.ts`: (a) ordem de tabulação — nas telas de duas colunas (Notícias, Competição, Carreira, rodada ao vivo) a sequência de Tab segue a ordem visual (comparar a posição vertical e horizontal de cada parada), (b) nova carreira só com o teclado (nome, escolher clube pela linha com Enter, Começar carreira), (c) diretoria só com o teclado (abas por setas, aceitar proposta), mantendo os fluxos de rodada ao vivo e mercado que já existem
- [X] T016 [P] [US2] Teste de movimento reduzido em `W/e2e/reduced-motion.spec.ts`: com `reducedMotion: "reduce"`, em cada tela que anima (barra de andamento da rodada, diálogos, abas, medidores, rolagem), conferir que nenhum elemento tem `transition-duration` ou `animation-duration` acima de 0,01 ms e que o `scroll-behavior` é `auto`; também ligar a preferência durante o jogo e conferir que vale sem recarregar
- [X] T017 [US2] Rodar T012 a T016 e registrar em `baseline.md` cada falha (tela, tema, critério, elemento); corrigir em `W/src/styles/tokens.css` (cores com contraste insuficiente), `W/src/styles/global.css` (foco, movimento), `W/src/ui/**` (nomes, títulos, ordem do DOM) e `W/src/app/**` (títulos e regiões); toda cor corrigida vira token, não valor solto; chaves de i18n novas junto do componente
- [X] T018 [US2] Conferir os anúncios da rodada ao vivo sem mudar o comportamento: `W/test/ui/live-announce.test.tsx` e o e2e `W/e2e/live-round.spec.ts` continuam verdes (todos os lances do meu jogo, em ordem, sem repetir e sem os de outros jogos); registrar em `baseline.md`
- [X] T019 [US2] `pnpm build:web` e rodar `a11y.spec.ts`, `keyboard.spec.ts`, `reduced-motion.spec.ts` até ficarem verdes, nos dois temas

**Checkpoint**: a revisão de acessibilidade não acha contraste abaixo do mínimo, foco invisível nem elemento sem nome.

## Phase 5: User Story 3 — Desempenho sem regressão (P2)

**Meta**: abertura, navegação e tabelas dentro da tolerância; pacote dentro do limite; nenhuma meta da 020 ultrapassada.
**Teste independente**: medir contra `baseline.md` (T001) e contra `SCALE_LIMITS`.

- [X] T020 [US3] Teste de tamanho do pacote em `W/test/build-size.test.ts`: depois de `pnpm build:web`, falhar se `W/out` passar de 4,5 MB no total ou de 2,0 MB de JS (limites do R6); pular se `W/out` não existe (rodar o build antes no CI do e2e já cobre)
- [X] T021 [P] [US3] Medir de novo abertura de todas as telas, navegação entre as dez telas e tabelas longas (mesmo método da T001) e registrar a comparação em `baseline.md` com o resultado "dentro" ou "fora" da tolerância de 10% por medida
- [X] T022 [US3] Para cada medida "fora" em T021 ou do pacote em T020, achar a causa (JS, CSS, fonte, imagem, renderização de lista longa) e corrigir em `W/src/**` (carregamento tardio de painéis pesados, memoização de linhas, remoção de CSS e JS sem uso); medir de novo até ficar dentro; sem mudar função
- [X] T023 [US3] Conferir que o e2e offline (`W/e2e/offline.spec.ts`) continua verde depois das correções e registrar o tamanho final do precache em `baseline.md`
- [X] T024 [US3] A virada de temporada e o tamanho do save: as simulações de 30 temporadas dos gates (T043 a T045) provam que continuam dentro de `SCALE_LIMITS`; aqui registrar em `baseline.md` o par "antes (025) × agora" do tempo da virada em `W/test/flows/performance.test.tsx` (a medida de 10 carreiras longas) e do tamanho de um save novo (`packages/save`), sem editar `SCALE_LIMITS`

**Checkpoint**: nada na interface custa fluidez, o pacote respeita o limite e as metas da 020 são conferidas.

## Phase 6: User Story 4 — Interface consistente e sem estilo antigo (P2)

**Meta**: tokens no lugar de valores soltos, componentes compartilhados no lugar de cópias, e nada de estilo morto.
**Teste independente**: `style-audit.test.ts` verde e a revisão cruzada contra `docs/interface-nova.md` registrada.

- [X] T025 [US4] Teste de auditoria em `W/test/ui/style-audit.test.ts`: ler todos os `W/src/**/*.module.css` e falhar com (a) cor literal (`#…`, `rgb(`, `rgba(`, `hsl(`) fora de `W/src/styles/tokens.css`, (b) `font-size`, `padding`, `margin` e `gap` em `px` que o `tokens.css` já tem como token (lista curta de exceções justificadas no próprio teste), (c) `!important` fora da regra de movimento reduzido em `global.css`, (d) classe declarada que nenhum `.tsx` importando o mesmo módulo usa; a mensagem lista arquivo e linha
- [X] T026 [US4] Rodar a auditoria e registrar a lista em `baseline.md` (data-model: Item de auditoria de estilo); corrigir cada item em `W/src/**.module.css`: valor solto vira token (criando o token em `tokens.css` só se o valor se repete), classe morta é removida, `!important` é refeito por especificidade; repetir até a auditoria ficar vazia
- [X] T027 [P] [US4] Revisão cruzada de componentes: buscar telas que montam à mão a aparência de `Card`, `Notice`, `Badge`, `Field`, `EmptyState`, `Dialog`, `DataTable`, `Meter` ou `Tabs` (por `section`/`div` com borda e fundo próprios, `role="alert"` solto, tabela sem `DataTable`) em `W/src/app/**` e `W/src/ui/**`, trocar pelo componente compartilhado mantendo os nomes acessíveis e as chaves de teste, e registrar cada troca em `baseline.md`
- [X] T028 [P] [US4] Revisão contra `docs/interface-nova.md` §2 a §5: conferir linguagem visual (tipografia, raios, rótulos de seção), estrutura (barra lateral, telas de foco) e paridade (a tabela de §5) tela a tela; registrar divergências e correções em `baseline.md`; nenhuma função de nenhuma tela pode sumir
- [X] T029 [US4] Remover texto de interface e chaves de i18n que ficaram sem uso e arquivos de estilo que nenhum componente importa (`pnpm exec vitest run W/test/i18n` e a auditoria da T025); `pnpm exec biome check` limpo

**Checkpoint**: a auditoria de estilo fica vazia e não há cópia de componente nem estilo antigo.

## Phase 7: User Story 5 — Dicas, atalhos e aviso de atualização revisados (P2)

**Meta**: dicas apontam para elementos que existem, em qualquer largura; ajuda lista os atalhos reais; aviso de atualização não cobre controles.
**Teste independente**: `tips-anchors.test.tsx` e o e2e responsivo das dicas.

- [X] T030 [P] [US5] Teste em `W/test/ui/tips-anchors.test.tsx`: para cada dica de `W/src/ui/tips/catalog.ts`, renderizar a tela (`screen`) com a condição da dica (primeiro acesso, `played`) e conferir que existe um elemento com o `data-tip-anchor` da dica, e que dicas sem âncora são de tela inteira; falha com a dica e a tela
- [X] T031 [P] [US5] Teste em `W/test/ui/shortcuts-registry.test.ts` (ampliar o existente): cada atalho listado na ajuda de cada tela (`helpGroups(screen)`) tem efeito nessa tela (existe a ação ou o controle que ele aciona) e o texto da ajuda vem do i18n
- [X] T032 [US5] Reancorar e ajustar as dicas apontadas por T030 em `W/src/ui/tips/catalog.ts` e nas telas (`data-tip-anchor`), e o texto em `packages/i18n/locales/pt-BR/ui.json`; corrigir a ajuda apontada por T031 em `W/src/ui/shortcuts.ts` e `W/src/ui/ShortcutsHelp.tsx`
- [X] T033 [US5] Dicas e aviso em tela estreita: em `W/src/ui/tips/TipHost.tsx` e `tips.module.css` posicionar a dica dentro da janela e sem cobrir o controle que ela explica a 768 e a 600 px; em `W/src/ui/UpdateNotice.module.css` empilhar o aviso acima do conteúdo (sem `position: fixed`) abaixo de 768 px; cobrir no e2e `W/e2e/responsive.spec.ts` (uma dica por tela principal) e em `W/e2e/update.spec.ts` (aviso sem cobrir o menu)
- [X] T034 [US5] `pnpm build:web` e rodar `tips-anchors.test.tsx`, `shortcuts-registry.test.ts`, `W/e2e/first-run.spec.ts`, `W/e2e/update.spec.ts` e `W/e2e/responsive.spec.ts` até ficarem verdes

**Checkpoint**: nenhuma dica aponta para o vazio e a ajuda e o aviso funcionam em qualquer largura.

## Phase 8: User Story 6 — Vitrine atualizada (P2)

**Meta**: capturas, ícones, README e design.md mostram a interface nova e a numeração nova.
**Teste independente**: abrir Sobre, README e documentação e conferir as capturas e os textos.

- [X] T035 [US6] Rever os ícones: gerar `W/public/icons/icon-192.png` e `icon-512.png` a partir de `icon.svg` (`pnpm screenshots` já o faz), conferir a legibilidade em fundo claro e escuro e a 192 px, e a `W/public/manifest`/`tools/src/manifest.ts` (cores de tema e de fundo coerentes com a interface nova); sem redesenhar; registrar em `baseline.md`
- [X] T036 [US6] Atualizar `tools/src/screenshots.ts` se alguma tela mudou de rota, de atalho ou de rótulo desde a 031 (atalhos `d`, `4`, `m`, `c`, `1`, botão Jogar rodada); manter tema escuro, 1 280 × 800, banco fictício e seed fixa
- [X] T037 [US6] **Depois de T011, T019, T022, T026 e T034 (todas as correções)**: `pnpm build:web` e `pnpm screenshots`; abrir cada uma das cinco imagens (`W/public/screenshots/{home,round,table,market,career}.png`) e conferir que mostram a interface nova no tema escuro, sem dica aberta e sem dado estranho; conferir o texto alternativo (`about.shot.*` em `ui.json`) contra o que aparece
- [X] T038 [P] [US6] Atualizar `README.md`: a captura `home.png` e a descrição, a seção de lançamento (fluxo `release/v1.0.0` → `main`, tags `beta-vX.Y.Z` e `vX.Y.Z`, nota única), a frase da fase beta e o comando `pnpm screenshots`; nada que cite a numeração antiga como a atual
- [X] T039 [P] [US6] Atualizar `docs/design.md`: §13 (M10 como concluído, com o que entrou), as menções "desde a 1.10" e à numeração antiga (linhas 30 e 139 e onde mais citar), §1 se citar a interface; conferir `docs/interface-nova.md` (§6 e §7: itens "em aberto" que se resolveram viram resolvidos)

**Checkpoint**: a vitrine reflete a interface nova e a numeração nova.

## Phase 9: User Story 7 — Lançamento oficial 1.0.0 (P1, por último: depende de todas as outras)

**Meta**: nota do 1.0.0 resumida, gates verdes sobre a branch, PR final preparado e (sob pedido) publicado.
**Teste independente**: gates verdes, `pnpm check-release` limpo e conferências do `contracts/release-process.md`.

- [X] T040 [US7] Reescrever a nota do 1.0.0 em `packages/i18n/locales/pt-BR/release-notes.json` como resumo do marco (R10): poucos itens curtos — o que mudou na interface (visual novo e tema claro, barra lateral, telas refeitas, rodada ao vivo e fim de temporada, entrada e configuração, telas estreitas e acessibilidade), que o jogo, as regras e os saves seguem os mesmos, e a numeração (fase beta de 1.0.0 a 1.10.0; 1.0.0 oficial); manter a data 2026-10-28 até o lançamento; ajustar `W/test/ui/version.test.tsx`, `about-notes.test.tsx` e `packages/i18n/test` que contem itens
- [X] T041 [US7] Conferir os textos de versão: o jogo (`app.version`), a página Sobre e a página de notas mostram "versão 1.0.0" (`W/test/ui/version.test.tsx`), a seção "Fase beta" fica recolhida com as 23 versões rotuladas "beta", e `package.json` está em 1.0.0
- [X] T042 [US7] Rodar na branch os gates rápidos e registrar em `baseline.md` (seção "Gates"): `pnpm typecheck`, `pnpm lint`, `pnpm test` (a suíte completa da raiz; `football-world-scale` pode estourar o tempo sob carga e deve passar isolado), `pnpm build:web`, `pnpm check-release`, `pnpm test:e2e`
- [X] T043 [P] [US7] Gate de simulação em segundo plano: `pnpm sim:world --seasons 30` na branch; registrar o resultado e conferir que nenhuma faixa numérica mudou (comparar com a execução do CI da 031 ou com a `main`)
- [X] T044 [P] [US7] Gate de simulação em segundo plano: `pnpm sim:economy --seasons 30`; registrar o resultado e conferir que nenhuma faixa mudou
- [X] T045 [P] [US7] Gate de simulação em segundo plano: `pnpm sim:world --scale --countries 3 --seasons 30 --qualification`; registrar os valores medidos contra `SCALE_LIMITS` (dia, virada, heap, save, export) na seção "Gates" de `baseline.md`
- [X] T046 [US7] Corrigir na própria branch o que qualquer gate acusar (causa, correção, nova execução do gate), sem editar `SCALE_LIMITS` nem faixas de balanceamento; só seguir com todos verdes
- [X] T047 [US7] Conferências antes do PR final (`contracts/release-process.md` item 3): `git tag -l v1.0.0` vazio, `gh release list` sem `v1.0.0`, `main` sem commits novos desde o início do marco (`git log release/v1.0.0..origin/main`; se houver, mesclar a `main` na branch antes); registrar em `baseline.md`
- [ ] T048 [US7] Fechamento da feature: marcar a coluna de resultados de `baseline.md`, abrir o PR da 032 com base `release/v1.0.0` (como as features anteriores) e acompanhar o CI até ficar verde
- [ ] T049 [US7] **Só sob pedido explícito do mantenedor, depois do T048 mesclado e dos gates verdes**: abrir o PR de `release/v1.0.0` para a `main` com merge commit, acompanhar o CI do PR (`checks`, `unit`, `e2e`) e, ao mesclar, acompanhar o workflow de release até a tag `v1.0.0` e o Release do GitHub (como lançamento, não pré-lançamento); conferir o site (versão 1.0.0, capturas, notas com a fase beta recolhida)
- [ ] T050 [US7] **Depois do lançamento e sob pedido**: apagar as branches de feature já mescladas (025 a 032, locais e remotas) e atualizar `docs/design.md` com a data do lançamento; a `release/v1.0.0` só é apagada se o mantenedor pedir

## Dependências

- Setup (T001, T002) antes de qualquer mudança de código.
- Foundational (T003, T004) bloqueia as histórias de e2e (US1, US2, US5).
- US1 (T005 a T011) e US2 (T012 a T019) são independentes entre si e podem andar em paralelo depois da fundação; T017 e T007 a T010 mexem em CSS parecido, então rodar `responsive.spec.ts` e `a11y.spec.ts` juntas ao fim de cada uma.
- US3 (T020 a T024) mede depois das correções de US1 e US2; US4 (T025 a T029) e US5 (T030 a T034) são independentes e podem andar em paralelo com US1 e US2, mas as correções de estilo da US4 (T026) vêm antes de medir de novo (T021) e de gerar as capturas (T037).
- US6: T035, T036, T038, T039 podem andar a qualquer hora; T037 (capturas) só depois de T011, T019, T022, T026 e T034.
- US7 (P1) é a última pela dependência: T040 e T041 depois de US6; T042 a T047 depois de tudo; T049 e T050 só sob pedido.

## Paralelismo

- Fundação: T003 e T004 em paralelo (T003 primeiro se T004 usar a lista).
- US1: T007 a T010 em paralelo (arquivos de estilo diferentes), depois T011.
- US2: T012 a T016 em paralelo (arquivos de teste diferentes), depois T017.
- US4 e US5: T025 e T030/T031 em paralelo com US1 e US2.
- US6: T038 e T039 em paralelo.
- US7: T043, T044 e T045 em paralelo (segundo plano).

## Estratégia de implementação

1. Setup e fundação.
2. MVP: US1 e US2 (as duas P1 de usabilidade); com elas o jogo já cabe em tablet e é verificado em acessibilidade.
3. US3 a US5 em seguida, na ordem que os achados pedirem (a auditoria de estilo antes das medidas e das capturas).
4. US6 (capturas por último entre as correções) e US7: a nota, os gates sobre a branch e o PR da 032.
5. O lançamento oficial (T049) e a limpeza (T050) acontecem só quando o mantenedor pedir.
