# Tasks: Telas de entrada e configuração

**Input**: `specs/031-telas-de-entrada-e-configuracao/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)
**Tests**: incluídos (constituição IX; a spec exige formulários verificados por teste, desempenho e e2e atualizados).
**Formato**: `- [ ] T### [P?] [US?] Descrição com caminho`. `W` = `apps/web`. Base de trabalho e do PR: `release/v1.0.0`.

**Lições das features anteriores (valem aqui):** `aria-label` que não contém o texto visível reprova no axe (`label-content-name-mismatch`); texto só para leitor de tela (`visually-hidden`) precisa de ancestral `position: relative`; chave de i18n sem uso derruba `test/i18n/no-literals.test.ts` (cada história acrescenta as suas chaves junto com o componente, e chave antiga sem uso é removida na mesma tarefa); props opcionais precisam de `| undefined` (`exactOptionalPropertyTypes`); testes pesados com timeout explícito; dado de teste tem de passar na validação de load do save; clicar fora de um diálogo só fecha com `dismissOnBackdrop`; nos e2e, esperar cada diálogo fechar antes do próximo Esc; `getByRole("heading", {name})` não pode achar mais de um título; a suíte completa de unidade roda da **raiz** (`pnpm exec vitest run`); helpers de teste ficam em `W/test/helpers/` (importar de arquivo `.test` registra os testes de novo); `role="log"` em `div`, não em `ul`; esperar a URL chegar antes de clicar nos e2e.

**Componentes compartilhados:** `ShortcutsHelp` e `UpdateNotice` aparecem em todas as telas (conferir `W/test/ui/` e os e2e `keyboard`, `update`); `CsvPanel` e `ValidationReport` só em Mods; `Crest`, `DataTable`, `Dialog` e `Field` são da fundação e não mudam de API.

## Phase 1: Setup

- [X] T001 Medir a linha de base em `specs/031-telas-de-entrada-e-configuracao/baseline.md`: `pnpm build:web`, tamanho de `W/out`, tempo de abertura de cada tela da feature (menu, nova carreira, carreiras salvas, configurações, mods, sobre, notas de versão; mediana de 5 aberturas, método fixo do Playwright), criação de carreira com 440 clubes (`createCareer` no Vitest, mediana de 5) e o filtro da lista sobre 440 clubes
- [X] T002 Listar em `baseline.md` os testes que tocam as telas (`W/test/flows/new-career.test.tsx`, `saves.test.tsx`, `mods.test.tsx`, `save-file.test.tsx`, `performance.test.tsx`, `world.test.tsx`; e2e `first-run`, `career`, `save-file`, `mods`, `settings`, `update`, `offline`, `world`, `football-world`, `a11y`, `layout`) e montar a **tabela de paridade** (FR-019, SC-006): cada opção, validação e mensagem das telas de hoje (menu: Continuar, avisos, dica; nova carreira: nome e limite, Sem demissão e aviso, seed, banco, país, divisão, busca, contagem, colunas, erros por código; carreiras: progresso, data, futura, corrompida, Continuar, Exportar, Apagar, Importar, mensagens de importação, conflito de id; configurações: velocidade, pausa, tema, idioma, dicas; mods: documentação, exemplo, mundo padrão, carregar, relatório, listar, substituir, remover, planilhas; sobre: seções e capturas; notas; atalhos; atualização) com a coluna "onde fica agora", conferida em T040

## Phase 2: Foundational (bloqueia as histórias)

- [X] T003 [P] Testes de `validateNewCareerForm` (nome vazio, só espaços e acima de `MANAGER_NAME_MAX`; sem clube; qualquer texto de seed é aceito (sem erro de seed); ordem dos erros nome, clube; vazio quando tudo é válido; códigos e parâmetros iguais aos de hoje) em `W/test/game/new-career-form.test.ts`
- [X] T004 Implementar `W/src/game/new-career-form.ts` (puro; `validateNewCareerForm` devolve `FormError[]` com `field`, `code`, `params`; reaproveita as regras de nome do `save`, sem regra nova; extrai também `filterClubs(clubs, {country, division, query})` com a busca sem acento, hoje inline em `nova-carreira/page.tsx`, para a tela e o teste de desempenho usarem a mesma função)
- [X] T005 [P] Testes de `saves-view` (quantidade inclui corrompidas e de versão futura; ordem do mais recente ao mais antigo; rótulo de progresso `rodada N` ou `temporada encerrada`; estado `ok`, `future`, `corrupt`) em `W/test/game/saves-view.test.ts`
- [X] T006 Implementar `W/src/game/saves-view.ts` (puro; `savesView`, `saveRow`; reaproveita os campos que `carreiras/page.tsx` e `page.tsx` já leem)
- [X] T007 [P] Criar `W/src/ui/entry/EntryShell.tsx` com `EntryShell.module.css` (cabeçalho com o link Voltar, `h1`, área de conteúdo com largura máxima, a 768 px uma coluna) e teste em `W/test/ui/entry-shell.test.tsx`
- [X] T008 [P] Testes de desempenho em `W/test/flows/performance.test.tsx` (acrescentar): criar carreira com 440 clubes em menos de 0,5 s e filtrar a lista de 440 clubes com `filterClubs` (T004) em menos de 200 ms, com timeout explícito

**Checkpoint**: validação e visão das carreiras testadas, invólucro pronto, medida de desempenho escrita.

## Phase 3: User Story 1 — Abrir o jogo e entender por onde começar (P1) 🎯 MVP

**Meta**: o menu diz o que é o jogo e por onde começar, com a quantidade de carreiras.
**Teste independente**: abrir sem carreira e com carreiras e conferir chamada, ações, quantidade, rodapé e avisos.

- [X] T009 [P] [US1] Testes do menu (chamada principal; ações Nova carreira, Carreiras salvas com a quantidade em plural e Mods; Continuar só com carreira recente, com técnico, clube e rodada; rodapé Configurações, Sobre, Atalhos e versão com link para as notas; aviso de novidades dispensável; aviso de armazenamento indisponível; dica de primeiro acesso em Nova carreira) em `W/test/ui/opening.test.tsx`
- [X] T010 [US1] Refazer `W/src/app/page.tsx` e `page.module.css` (chamada principal e cartões de ação, quantidade vinda de `savesView`, avisos em `Notice`; manter `data-tip-anchor="new-career"`, `TipHost` e `writePreferences`) com as chaves de i18n da chamada e da quantidade (`saves.count` com plural)
- [X] T011 [US1] Atualizar `W/e2e/first-run.spec.ts` e `W/test/flows/` que dependem do menu (links por nome acessível com a quantidade)

**Checkpoint**: menu novo; as demais histórias ligam-se a ele pelos links.

## Phase 4: User Story 2 — Montar uma carreira comparando os clubes (P1)

**Meta**: formulário acessível, tabela comparativa, escolha por teclado e rodapé fixo.
**Teste independente**: criar carreira com e sem Sem demissão, com mundo padrão e com mod, só com o teclado.

- [X] T012 [P] [US2] Testes da tela (rótulo em todo campo; Sem demissão com explicação e aviso; seed recolhida (texto livre, qualquer valor aceito); banco com descrição e link para Mods; filtro de país só em vários países; busca e contagem sempre visíveis; tabela com escudo, clube, reputação, força média, estádio e divisão, ordenável; escolha por clique e por botão do nome; linha escolhida marcada por texto; vazio com "Limpar filtros"; erros por campo com `aria-invalid`/`aria-describedby` e foco no primeiro; nada criado com erro; rodapé com clube escolhido e "criando carreira"; erro de criação em `Notice`; clube escolhido que some do filtro continua escolhido e visível no rodapé; mod escolhido que deixa de existir faz o campo Banco de dados voltar ao mundo padrão; a mesma seed e o mesmo clube dão a mesma carreira, constituição II) em `W/test/ui/new-career-form.test.tsx`
- [X] T013 [P] [US2] Criar `W/src/ui/entry/ClubPicker.tsx` (busca, contagem `role="status"`, `DataTable` com escolha por clique e por Enter/Espaço na linha, selo "Escolhido", estado vazio) com `ClubPicker.module.css` e as chaves de i18n da busca sempre visível, de "limpar filtros" e do vazio
- [X] T014 [US2] Refazer `W/src/app/nova-carreira/page.tsx` e `page.module.css`: `EntryShell`, campos com `Field`, `validateNewCareerForm`, foco no primeiro erro (nome, tabela; `details` da seed abre só se um erro de criação for ligado a ela), rodapé `sticky` com o clube escolhido e o botão (`aria-busy`), `Notice` de erro de criação; manter `useCompetitionClubs`, `divisionsOf`, `countriesOf`, `groupsOf`, `plain` e o mundo padrão gerado no cliente
- [X] T015 [US2] (depois de T011, que também edita `first-run.spec.ts`) Atualizar `W/test/flows/new-career.test.tsx`, `W/e2e/first-run.spec.ts`, `W/e2e/career.spec.ts` e demais e2e que criam carreira (escolha do clube pelo botão do nome ou pela linha; botão Começar carreira; mensagens de erro)

**Checkpoint**: criar carreira funciona com formulário novo e medida de 440 clubes dentro do limite.

## Phase 5: User Story 3 — Achar, continuar, exportar, importar e apagar carreiras (P1)

**Meta**: lista de carreiras clara e segura.
**Teste independente**: com duas carreiras, continuar, exportar, apagar com confirmação e importar; inválido e versão futura.

- [X] T016 [P] [US3] Testes da tela (cartão com clube, técnico, divisão, temporada, rodada e data; futura e corrompida com marcação em texto e sem Continuar; Exportar, Apagar com diálogo que cita a carreira, foco inicial no Cancelar, Esc, cancelar sem apagar, foco devolvido; Importar com mensagens de arquivo inválido, versão futura, cota e falha; conflito de id com foco no Cancelar; estado vazio com Nova carreira e Importar; quantidade anunciada) em `W/test/ui/saves-screen.test.tsx`
- [X] T017 [P] [US3] Criar `W/src/ui/entry/SaveCard.tsx` com `SaveCard.module.css` (escudo, linhas de dados, `Badge` de estado, ações com nome que cita a carreira)
- [X] T018 [US3] Refazer `W/src/app/carreiras/page.tsx` e `page.module.css` (`EntryShell`, `savesView`, `SaveCard`, `EmptyState`, mensagens de importação em `Notice` ligadas ao campo de arquivo, diálogos com foco inicial no Cancelar) com as chaves de i18n novas
- [X] T019 [US3] Atualizar `W/test/flows/saves.test.tsx`, `save-file.test.tsx` e `W/e2e/save-file.spec.ts` (exportar e importar devolve a carreira na mesma rodada, SC-003)

**Checkpoint**: P1 completo (menu, nova carreira, carreiras salvas).

## Phase 6: User Story 4 — Ajustar o jogo em Configurações (P2)

**Meta**: ajustes em seções claras, dicas de novo com confirmação.
**Teste independente**: mudar velocidade, pausa, tema e idioma; mostrar as dicas de novo.

- [X] T020 [P] [US4] Testes da tela (seções Rodada ao vivo, Aparência e idioma, Dicas, Sobre; cada mudança grava na hora; reset de dicas com o resultado confirmado em texto e o Voltar pelo histórico; versão e links; sem "apagar todos os dados") em `W/test/ui/settings-screen.test.tsx`
- [X] T021 [US4] Refazer `W/src/app/configuracoes/page.tsx` e `page.module.css` (`EntryShell`, `Card` por seção, `Field`, `role="status"`)
- [X] T022 [US4] Atualizar `W/e2e/settings.spec.ts` e os testes de fluxo que usam a tela

## Phase 7: User Story 5 — Carregar mods e gerar pacotes (P2)

**Meta**: Mods em cartões, com estado vazio, mensagens claras e diálogos seguros.
**Teste independente**: baixar o mundo padrão, carregar mod válido e inválido, substituir, remover, usar planilhas.

- [X] T023 [P] [US5] Testes da tela (introdução com links; mundo padrão com descrição e download; carregar com relatório de erros e avisos em texto; lista com resumo e Remover; vazio desenhado; substituir e remover com foco no Cancelar e foco devolvido; planilhas; sem ativar/desativar) em `W/test/ui/mods-screen.test.tsx`
- [X] T024 [P] [US5] Criar `W/src/ui/entry/ModCard.tsx` com `ModCard.module.css` e refazer `W/src/ui/mods/CsvPanel.tsx`, `ValidationReport.tsx` e `mods.module.css` na linguagem nova (mesmas props e dados)
- [X] T025 [US5] Refazer `W/src/app/mods/page.tsx` (`EntryShell`, `Card`, `Notice`, `EmptyState`, diálogos com foco inicial no Cancelar) com as chaves de i18n novas
- [X] T026 [US5] Atualizar `W/test/flows/mods.test.tsx` e `W/e2e/mods.spec.ts`

## Phase 8: User Story 6 — Conhecer o jogo e ler as notas de versão (P2)

**Meta**: Sobre e Notas de versão com a estrutura nova e a fase beta recolhida.
**Teste independente**: abrir as duas páginas e conferir cada seção.

- [X] T027 [P] [US6] Testes (Sobre: apresentação, "O que dá para fazer", capturas com texto alternativo, aviso de nomes reais, gratuito, privacidade, levar carreiras a outro navegador, versão; Notas: versões recolhíveis, a atual aberta, "Nova" nas versões acima da última vista lida antes de gravar (todas, sem versão vista), a marca fica durante a visita, ao abrir grava a versão atual como vista, "Fase beta" recolhida no fim com a frase e as versões rotuladas "beta") em `W/test/ui/about-notes.test.tsx`
- [X] T028 [P] [US6] Refazer `W/src/app/sobre/page.tsx` e `page.module.css` (`EntryShell`, `Card` por seção, capturas) e `W/src/app/notas-de-versao/page.tsx` e `page.module.css` (`details` por versão, marcação de vista, rótulo "beta") com as chaves de i18n novas (`notes.new`, `notes.beta.label`)
- [X] T029 [US6] Regenerar as capturas `W/public/screenshots/{home,round,table,market,career}.png` com `pnpm screenshots` (interface nova, banco fictício), só depois de T014, T018, T021, T025 e das telas das features 025 a 030 estarem prontas; conferir o texto alternativo e o tamanho dos arquivos

## Phase 9: User Story 7 — Ajuda de atalhos e aviso de atualização (P3)

**Meta**: os dois componentes com o visual novo, sem mudar o comportamento.
**Teste independente**: abrir a ajuda em duas telas e provocar o aviso de versão nova.

- [X] T030 [P] [US7] Testes (ajuda: grupos gerais e da tela, foco preso e devolvido, Esc fecha; atualização: `Notice` com Recarregar, não aparece na rodada ao vivo) em `W/test/ui/shortcuts-update.test.tsx`
- [X] T031 [US7] Refazer `W/src/ui/ShortcutsHelp.tsx` (grupos em `Card`) e `W/src/ui/UpdateNotice.tsx` (`Notice` info) e seus CSS; atualizar `W/e2e/update.spec.ts` e `W/e2e/keyboard.spec.ts` se dependerem do markup

## Phase 10: Polish & cross-cutting

- [X] T032 Acessibilidade e layout: acrescentar as sete telas e os diálogos de ajuda, apagar, remover e substituir ao `W/e2e/a11y.spec.ts` (temas claro e escuro, axe sem violação grave) e ao `W/e2e/layout.spec.ts` (sem rolagem horizontal em 1 440, 1 280 e 1 024 px; a 768 px a estrutura da 025; rodapé fixo da Nova carreira sem cobrir o último campo); conferir também que estado e erro têm sinal em texto além da cor (linha escolhida, "Nova", "beta", marcação de carreira corrompida, erros de campo) (FR-020)
- [X] T033 Teste de formulários (SC-005): em `W/test/ui/forms-a11y.test.tsx`, percorrer Nova carreira, Carreiras salvas (importar), Configurações, Mods (carregar mod e planilhas) e conferir que todo campo tem rótulo, que cada erro está ligado ao campo (`aria-describedby`) e que na Nova carreira o foco vai ao primeiro campo com erro
- [X] T034 Atualizar `packages/i18n/locales/pt-BR/release-notes.json` (nota única do 1.0.0 ganha o item "telas de entrada e configuração"; versão em `W/src/app-info.ts` e `package.json` não mudam) e conferir `docs/interface-nova.md` §6
- [X] T035 Remover CSS e chaves de i18n que ficaram sem uso nas telas refeitas (`pnpm exec vitest run W/test/i18n`)
- [X] T036 Medir de novo o que T001 mediu e registrar em `baseline.md`: tamanho do pacote, abertura de cada tela (até 10% acima, SC-007), criação com 440 clubes (< 0,5 s) e filtro (< 200 ms)
- [X] T037 Rodar `pnpm exec biome check`, `pnpm -r typecheck`, a suíte de unidade da raiz (`pnpm exec vitest run`) e o Playwright completo (`pnpm build:web` antes)
- [ ] T038 Validação manual do `quickstart.md` itens 1 a 9, nos dois temas e nas três larguras; anotar o resultado
- [ ] T039 Teste de usabilidade (SC-001), com uma pessoa que nunca viu o jogo e sem ajuda: abrir, criar carreira e completar uma rodada; registrar tempo, tropeços e conclusão em `baseline.md`
- [X] T040 Marcar a coluna "Conferido" da tabela de paridade em `baseline.md` (100% das linhas, SC-006)

## Dependências

- Setup (T001, T002) antes de qualquer mudança de código.
- Foundational (T003 a T008) bloqueia as histórias; T004 depende de T003, T006 de T005, T008 de T004.
- US1 (T009 a T011) depende de T006; US2 (T012 a T015) de T004, T007 e T008; US3 (T016 a T019) de T006 e T007. As três podem andar em paralelo depois da fundação; MVP = US1 + US2 + US3.
- US4 a US7 dependem só de T007 (US7 de nada) e podem andar em paralelo.
- T029 (capturas) depende das telas das US2, US3, US4 e US5; T032 a T040 só no fim.

## Paralelismo

- Fundação: T003, T005 e T007 em paralelo (T008 depois de T004).
- Por história: o teste e o componente de apoio (`[P]`) em paralelo, depois a página.
- US4, US5, US6 e US7 em paralelo entre si.

## Estratégia de implementação

1. Setup e fundação.
2. MVP: US1, US2 e US3 (a primeira impressão, a criação e as carreiras).
3. US4 a US7 em seguida, em qualquer ordem.
4. Polish: capturas, acessibilidade e layout, nota do 1.0.0, medidas, validação manual e teste de usabilidade.
