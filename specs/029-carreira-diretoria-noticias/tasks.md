# Tasks: Carreira, diretoria e notícias

**Input**: `specs/029-carreira-diretoria-noticias/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)
**Tests**: incluídos (constituição IX; a spec exige paridade, o critério de teclado e os e2e atualizados).
**Formato**: `- [ ] T### [P?] [US?] Descrição com caminho`. `W` = `apps/web`. Base de trabalho e do PR: `release/v1.0.0`.

**Lições das features anteriores (valem aqui):** `useSearchParams` só dentro do filho de `GameLayout` (Suspense), nunca no componente de página; `aria-label` que não contém o texto visível reprova no axe (`label-content-name-mismatch`); texto só para leitor de tela (`visually-hidden`) precisa de ancestral `position: relative` dentro de quadros que rolam; chave de i18n sem uso derruba `test/i18n/no-literals.test.ts`; props opcionais precisam de `| undefined` (`exactOptionalPropertyTypes`); testes pesados com timeout explícito (`, 60_000`); dado de teste tem de passar na validação de load do save; clicar fora de um diálogo de consulta só fecha com `dismissOnBackdrop`; nos e2e de teclado, esperar cada diálogo fechar antes do próximo Esc.

## Phase 1: Setup

- [X] T001 Medir a linha de base: `pnpm build:web`, tamanho de `W/out`, tempo de abertura da Carreira (aba Diretoria) e das Notícias com o mundo padrão (mediana de 5 execuções, método fixo do Playwright usado na 028) em `specs/029-carreira-diretoria-noticias/baseline.md`
- [X] T002 Listar em `baseline.md` os testes que tocam as duas telas como referência de paridade: `W/test/flows/board.test.tsx`, `fans.test.tsx`, `news.test.tsx`, e2e `career-board`, `career`, `fans`, `news`, `keyboard`, `a11y`, `layout`; o resultado é o do CI da 028 (PR #54) e vale para a base `release/v1.0.0`, sem repetir a suíte aqui; montar também a **tabela de paridade** (FR-022) em `baseline.md`: cada dado, ação e aviso das telas de hoje (reputação, aviso de carreira sem demissão, metas e situação, confiança e motivos, mudanças por rodada, torcida e rivais, propostas com país e validade, passagens e temporadas, técnicos "considerados" e vagas, manchetes com fatos complementares, seletor de rodada, avisos de demissão, contratação e propostas) com a coluna "onde fica agora", conferida em T036

## Phase 2: Foundational (bloqueia as histórias)

- [X] T003 [P] Testes de `board-view` (situação das metas: esportiva e financeira por `goalProgress`, continental e estadual por `result`; nível da confiança em 60 e 30 e nos limites; tendência pelas três últimas mudanças; motivos mais novos primeiro e mudanças por rodada; save sem metas) em `W/test/game/board-view.test.ts`
- [X] T004 Implementar `W/src/game/board-view.ts` (puro; `goalRows`, `confidenceLevel`, `trendOf`, `reasonsOf`, `roundChanges`; reaproveita `goalProgress` e `moodBand`; **move** `confidenceTrend` (`ui/board/ConfidenceMeter.tsx`) e o `trendOf` local de `ui/fans/FansCard.tsx` para cá e remove as cópias, sem regra nova)
- [X] T005 [P] Testes de `news-view` (`headlineCompetition`: `vars.competition`, liga principal nos fatos da liga, "Geral" nos tipos de pessoas e transferências; `groupHeadlines`: "Do seu clube", uma seção por competição na ordem do banco, manchete do clube nas duas seções, contagens iguais ao tamanho das listas, "Geral" só com manchetes; filtro por escopo e por competição; `roundNav` com a primeira e a última rodada; um teste que falha se um tipo de `HEADLINE_TYPES` não está classificado) em `W/test/game/news-view.test.ts`
- [X] T006 Implementar `W/src/game/news-view.ts` (puro; constantes dos tipos sem competição ao lado de `HEADLINE_TYPES`; `headlineCompetition`, `groupHeadlines`, `filterHeadlines`, `roundNav`)
- [X] T007 [P] Chaves de i18n novas (situação das metas, nível da confiança, símbolos e textos de tendência, rótulos das colunas e dos cartões de proposta, estados vazios, painel e seções das Notícias, contagens com plural, setas de rodada) em `packages/i18n/locales/pt-BR/ui.json`; sem chave sem uso (`test/i18n/no-literals.test.ts`)

**Checkpoint**: derivações testadas e textos criados.

## Phase 3: User Story 1 — Diretoria: contente, confiança e metas (P1) 🎯 MVP

**Meta**: a Carreira em `Tabs` e a aba Diretoria com metas, confiança e motivos, sem rolagem em 1 440 px.
**Teste independente**: abrir a Carreira numa temporada em andamento e conferir a aba Diretoria em 1 440 × 900.

- [X] T008 [P] [US1] Testes da Carreira e da Diretoria (cinco abas em `Tabs` com setas; `?aba=offers` abre Propostas; contagem no nome da aba Propostas; cada meta com situação em texto e símbolo; confiança com nível e tendência em texto e símbolo; motivos com efeito; lista de mudanças por rodada da mais nova à mais antiga; reputação e aviso de carreira sem demissão; estado vazio de metas ainda sem situação; estado vazio de "sem motivos"; clube desempregado com a reputação; meta continental ou estadual já decidida com "cumprida" ou "não cumprida") em `W/test/ui/career-board.test.tsx`
- [X] T009 [US1] Refazer `W/src/ui/board/GoalsList.tsx` (uma linha por meta com rótulo, texto, `Badge` de situação com texto e símbolo `aria-hidden`; usa `goalRows`) e `board.module.css`; manter as exportações `goalTierText` e `financeGoalText` e a assinatura de `GoalsList`, porque `BoardCard` (Início), `Evaluation`, `ManagerHistory` e `JobOffers` os usam (R13)
- [X] T010 [US1] Refazer `W/src/ui/board/ConfidenceMeter.tsx` (valor, `Meter`, nível em texto, tendência em texto e símbolo, três motivos com efeito) e criar `W/src/ui/board/ConfidenceChanges.tsx` (mudanças por rodada, lista com altura limitada e rolagem própria, `tabIndex={0}` no quadro rolante); manter o nome e as props de `ConfidenceMeter`, usado também por `BoardCard` (Início); conferir `W/test/ui/home.test.tsx` e o cartão da Diretoria na Início
- [X] T011 [US1] Refazer `W/src/app/jogo/carreira/page.tsx` com `Tabs` (ids `board`, `fans`, `offers`, `history`, `coaches`; `?aba=` via `initial`; contagem em Propostas); a aba Diretoria em duas colunas (Metas com reputação e aviso de carreira sem demissão; Confiança com motivos) e o cartão Mudanças por rodada abaixo; estado de desempregado com `EmptyState`; envolver o `Tabs` num `div` com `data-tip-anchor="board"` (a dica de primeiro acesso `board` depende dele; conferir `W/test/ui/tips.test.tsx`); as outras abas seguem com os componentes de hoje até as histórias seguintes

**Checkpoint**: Diretoria entregue e testada; a Carreira já navega por `Tabs`.

## Phase 4: User Story 2 — Torcida (P1)

**Meta**: a aba Torcida com faixa, tendência e motivos.
**Teste independente**: abrir a aba Torcida num clube com histórico e num clube novo.

- [X] T012 [P] [US2] Testes da Torcida (faixa em texto, valor, tendência em texto e símbolo, motivos com efeito, rivais; estado vazio sem motivos; clube desempregado) em `W/test/ui/career-fans.test.tsx` e atualizar `W/test/flows/fans.test.tsx`
- [X] T013 [US2] Refazer `W/src/ui/fans/FansCard.tsx` e `fans.module.css` (faixa de `moodBand`, `Meter`, tendência com símbolo, motivos com efeito, estado vazio) manter o nome e as props de `FansCard`, usado também na Início (conferir `W/test/ui/home.test.tsx` e o e2e de layout da Início); ligar a aba Torcida na página da Carreira com os rivais ao lado

## Phase 5: User Story 3 — Propostas de emprego (P1)

**Meta**: propostas avaliadas com tudo para decidir, aceitas só com o teclado.
**Teste independente**: demitir o técnico, abrir a Carreira e aceitar uma proposta só com o teclado.

- [X] T014 [P] [US3] Testes das propostas (cartão com clube, divisão e posição, reputação, país, metas esperadas e validade; aviso de mudança de país antes de Aceitar e Recusar; Aceitar e Recusar como hoje; estado vazio com o que influencia receber; ações desativadas com a rodada ao vivo e o motivo escrito; contador na barra lateral igual ao número de propostas pendentes) em `W/test/ui/career-offers.test.tsx` e atualizar `W/test/flows/board.test.tsx`
- [X] T015 [US3] Refazer `W/src/ui/board/JobOffers.tsx` (um `article` por proposta com o nome do clube, escudo, campos em lista de definição, aviso de mudança de país em `Notice tone="warning"` antes dos botões, `EmptyState` sem propostas) e `board.module.css`
- [X] T016 [US3] Ligar a aba Propostas na página da Carreira (com a trava da rodada ao vivo e o motivo escrito) e conferir que o foco não se perde ao aceitar; o contador da barra lateral já existe (`attentionCount` em `W/src/ui/shell/screens.ts` conta as propostas pendentes), então aqui só se verifica, pelo teste de T014, que ele continua certo

## Phase 6: User Story 4 — Histórico e Técnicos (P2)

**Meta**: passagens e temporadas do técnico e a tabela dos técnicos da divisão.
**Teste independente**: abrir as duas abas numa carreira com mais de uma temporada e numa sem histórico.

- [X] T017 [P] [US4] Testes do Histórico e dos Técnicos (passagens com período e saída; temporadas com divisão, posição, meta, conquistas, decisão da diretoria, reputação e campanha continental; tabela de técnicos com reputação, confiança, o jogador destacado e as vagas; estados vazios; desempregado: as duas abas seguem mostrando os dados) em `W/test/ui/career-history.test.tsx`
- [X] T018 [P] [US4] Refazer `W/src/ui/board/ManagerHistory.tsx` (tabelas em `Card`, `EmptyState` sem passagens e sem temporadas) e `W/src/ui/board/CoachesTable.tsx` (`DataTable` com `highlight` no jogador e vagas em texto); ligar as abas na página da Carreira

## Phase 7: User Story 5 — Notícias (P1)

**Meta**: manchetes em cartões, agrupadas por "Do seu clube" e por competição, com painel de filtros e setas de rodada.
**Teste independente**: trocar de rodada com as setas, filtrar Do meu clube e por uma competição.

- [X] T019 [P] [US5] Testes da tela de Notícias (seletor de temporada e rodada com setas desativadas nas pontas; um cartão por manchete com competição, rodada, título e texto; "Do seu clube" e uma seção por competição com contagem; painel com resumo, Todas, Do meu clube e competições com contagem; um clique filtra; estados vazios; fato complementar no cartão; manchete do clube marcada em texto; só existem as seções "Do seu clube", por competição e "Geral", sem agrupamento por tipo) em `W/test/ui/news-screen.test.tsx` e atualizar `W/test/flows/news.test.tsx`
- [X] T020 [P] [US5] Criar `W/src/ui/news/HeadlineCard.tsx` (`article` com competição, rodada, título = frase da manchete, texto = `extras`, marca "Do seu clube" em texto) e reaproveitar `headlineVars` de `Headline.tsx`; estilos em `news.module.css`
- [X] T021 [P] [US5] Criar `W/src/ui/news/NewsFilters.tsx` (resumo da rodada, Todas e Do meu clube com `aria-pressed`, lista de competições com contagem em botões) e `NewsGroup.tsx` (`section` com nome e contagem)
- [X] T022 [US5] Refazer `W/src/app/jogo/noticias/page.tsx` (seletor com setas Rodada anterior e Próxima rodada via `roundNav`; painel à esquerda fixo e lista que rola; grupos por `groupHeadlines`; estados vazios; filtro sem resultado com o botão que volta a Todas)
- [X] T023 [US5] Atualizar `W/src/ui/news/RoundFeed.tsx` e `NewsCard.tsx` (cartão da Início) para usarem `HeadlineCard`, mantendo o limite e o link "ver todas"; remover o componente `Headline` (`W/src/ui/news/Headline.tsx`), que fica sem uso, e manter só `headlineVars` (mover para `news-view.ts` ou para o próprio `HeadlineCard`); ajustar `W/test/ui/home.test.tsx` se o texto mudar

## Phase 8: User Story 6 — Avisos com o mesmo componente (P2)

**Meta**: demissão, nova contratação e propostas com `Notice`.
**Teste independente**: provocar uma demissão e uma proposta e conferir os avisos nas telas onde já apareciam.

- [X] T024 [P] [US6] Testes dos avisos (demissão com `tone` de perigo, nova contratação e propostas informativas; texto e ação de dispensar iguais aos de hoje; gravidade em texto; o aviso de propostas continua anunciado como `status` e o de demissão com o papel de hoje; a ordem dos títulos no grupo "Antes do jogo" é válida) em `W/test/ui/career-notices.test.tsx` e atualizar `W/test/flows/board.test.tsx`
- [X] T025 [US6] Refazer `W/src/ui/board/BoardNotice.tsx` com `Notice` e o aviso de propostas da Início (`career.offers.notice`, hoje um `<p role="status">` em `W/src/app/jogo/page.tsx`) com `Notice`, repassando o `role` de hoje (`status`, ou `alert` onde há); os avisos só aparecem na Início; manter `data-tip-anchor` e as dicas de primeiro acesso (`W/src/ui/tips/`) apontando para o elemento certo

## Phase 9: Polish e entrega

- [X] T026 Atualizar o e2e de diretoria `W/e2e/career-board.spec.ts` (Diretoria com metas, confiança e motivos; a página não rola na vertical em 1 440 × 900; se não couber, aplicar o plano B de R2: recolher o cartão das mudanças por rodada em `<details>` e repetir a medida) e `W/e2e/career.spec.ts`
- [X] T027 [P] Novo e2e de propostas só com o teclado em `W/e2e/career-board.spec.ts`: demitir o técnico, abrir a Carreira, ler a proposta e aceitar uma só com Tab e Enter (critério de aceite 1)
- [X] T028 [P] Atualizar `W/e2e/fans.spec.ts` (aba Torcida) e `W/e2e/news.spec.ts` (setas de rodada, Do meu clube, uma competição, contagens)
- [X] T029 [P] Estender `W/e2e/layout.spec.ts` (Carreira nas cinco abas e Notícias, sem rolagem horizontal em 1 440, 1 280 e 1 024 px, sem texto cortado), `W/e2e/a11y.spec.ts` (cada aba da Carreira e as Notícias nos dois temas) e `W/e2e/keyboard.spec.ts` (setas nas abas da Carreira, setas de rodada nas Notícias, foco visível)
- [X] T030 [P] Conferir que situação e tendência não dependem só da cor, nos dois temas (verificação por Playwright dos textos e símbolos em cada aba); o contraste 016 já fica coberto pelo axe de T029 e por `W/test/ui/contrast.test.ts` com os tokens novos
- [X] T031 [P] Acrescentar o item "Nova interface, quinta parte" à nota única do 1.0.0 em `packages/i18n/locales/pt-BR/release-notes.json` (a versão não muda; `docs/interface-nova.md` §6)
- [X] T032 Atualizar `docs/interface-nova.md` §4 (Carreira e Notícias entregues) e `docs/design.md` §10 se o texto da tela mudou
- [X] T033 Rodar `pnpm exec biome check`, `pnpm -r typecheck`, a suíte completa de unidade e o e2e completo; corrigir o que quebrar
- [X] T034 Medir de novo build, abertura da Carreira e das Notícias e comparar com `baseline.md`; a mediana de abertura fica até 10% acima da linha de base (SC-007), ou se explica a diferença
- [X] T035 Validar o `quickstart.md` à mão (Diretoria em 1 440 × 900, Propostas só com o teclado, Notícias com setas e filtros, nos dois temas e nas três larguras) e conferir a tabela de paridade de T002: nenhum dado, ação ou aviso sumiu
- [X] T036 Abrir o PR com `--base release/v1.0.0` (nota do 1.0.0 atualizada no mesmo PR; versão inalterada) e acompanhar o CI

## Dependências e ordem

- **Phase 1 → Phase 2 → histórias**: as derivações (T004, T006) e os textos (T007) bloqueiam todas as histórias.
- **US1 cria a estrutura** da página da Carreira (T011); **US2, US3 e US4** só ligam o conteúdo de cada aba nela, então vêm depois de US1.
- **US5 (Notícias)** não depende de US1 a US4: depende só de T005, T006 e T007; pode andar em paralelo com a Carreira.
- **US6** vem depois de US3 (compartilha `board.module.css` e o aviso de propostas) e de US5 (o cartão da Início).
- **Polish** vem depois de todas as histórias.

## Paralelismo

- **Fundação**: T003, T005 e T007 em paralelo; T004 e T006 depois dos respectivos testes.
- **Carreira**: T012, T014 e T017 (testes) em paralelo entre si; T018 em paralelo com T015.
- **Notícias**: T019, T020 e T021 em paralelo; T022 depois de T020 e T021.
- **Polish**: T027 a T031 em paralelo.

## Estratégia de implementação

- **MVP**: Phase 1, Phase 2 e US1 (Diretoria), que já resolve o critério de rolagem.
- **Entrega incremental**: US3 (Propostas, o critério de teclado) e US5 (Notícias) em seguida; US2, US4 e US6 completam a paridade; Polish fecha.
- **Regra de ouro**: nenhuma regra, dado ou save muda; cada tela refeita é conferida contra a lista de paridade (`docs/interface-nova.md` §5, `docs/design.md` §10) antes de sair.
