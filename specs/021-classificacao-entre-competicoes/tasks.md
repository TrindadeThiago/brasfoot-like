---

description: "Lista de tarefas da feature 021 — Classificação entre competições"
---

# Tasks: Classificação entre competições

**Input**: Design documents from `specs/021-classificacao-entre-competicoes/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: o motor segue o Princípio IX (testes antes, devem falhar primeiro): fontes de vaga,
repasse, unicidade, condições, fechamento, supercopa, saída da pirâmide, validação, metas e
migração. O equilíbrio tem simulação longa com limites declarados (Princípio V); o save v16 tem
migração e fixtures (Princípio VI). Fluxos de interface com happy-dom + fake-indexeddb; e2e com
Playwright.

**Organization**: tarefas por user story, em ordem de prioridade. A base comum (formato de dados,
validação, tipos, fontes e resolução, etapa de virada, save v16) fica na Fase 2:

- P1: US1 (zonas de vaga na tabela), US2 (chegar a outra competição por título ou campanha)
- P2: US3 (supercopa), US4 (acesso entre competições diferentes), US5 (descrever só com dados)
- P3: US6 (metas, manchetes e histórico)

US1 depende só de a Fase 2 expor as vagas; US2 depende da resolução; US3 e US4 dependem da US2; US5
(validação mais completa, mod de exemplo e documentação) depende da Fase 2; US6 depende da US2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 … US6 (spec.md)
- Caminhos relativos à raiz do repositório

## Referências rápidas

- **API do motor:** `specs/021-classificacao-entre-competicoes/contracts/qualification-api.md`
- **Mod, save e telas:** `specs/021-classificacao-entre-competicoes/contracts/mod-format-and-ui.md`
- **Decisões R1–R11:** `research.md`; **tipos:** `data-model.md`; **roteiro:** `quickstart.md`
- **Já existentes:**
  - composição e virada: `nextComposition` (`packages/engine/src/career/composition.ts`),
    `seasonTurnover`/`TURNOVER_STEP_IDS`/`generateCalendars` (`career/turnover.ts`),
    `TurnoverContext`/`NextSeasonDraft`/`LeagueSeason`/`SeasonHistoryEntry` (`career/types.ts`),
    `createCareerSeason` (`career/season-state.ts`), `createLeagueSeason`/`compositionProblem`/
    `divisionZones` (`career/league.ts`), `startNextSeason` (`career/next-season.ts`)
  - fases e copas: `createStagedSeason` (`stages/create.ts`), `stageParticipantCounts`/`stagesOf`
    (`stages/rules.ts`), `startStage` (`stages/start.ts`), `cupEntry`/`cupSeasonOf` e
    `cupChampion`/`cupReached` (`knockout/history.ts`, `knockout/tie.ts`), `createCupSeason`
  - classificação: `standings` (`season/standings.ts`), `topScorers` (`season/stats.ts`)
  - diretoria e notícias: `goalTiersFor`/`playedRounds` (`board/goals.ts`), `GOAL_TIERS`
    (`board/types.ts`), `evaluation.ts`, `news/{rules,turnover}.ts`
  - dados e validação: `divisionSchema`/`knockoutFormatSchema` (`model/schemas.ts`),
    `validateBank` (`validation/validate.ts`), `semantic/{competitions,knockout,stages,references}.ts`,
    `makeIssue`/códigos (`validation/issues.ts`)
  - gerador: `generateWorldBank` (`worldgen/world-example.ts`), `tools/src/{gen-world-example-mod,simulate-world}.ts`
  - **Estado da 020 entregue:** não existe `otherLeagues`; as ligas dos outros países ficam em
    `competitions` e a história delas em `competitionHistory`. A resolução lê `league` +
    `competitions`.
  - save: `SAVE_FORMAT_VERSION = 15` (`packages/save/src/format.ts`), `migrate.ts`
  - telas: `apps/web/src/app/jogo/{competicao,historico,carreira,noticias}`, `apps/web/src/ui/{DataTable,DivisionTabs,CompetitionSelect}.tsx`

---

## Phase 1: Setup (linha de base)

**Purpose**: congelar o comportamento atual para provar a compatibilidade (FR-022). Nada aqui muda
comportamento.

- [X] T001 Criar `packages/engine/test/career/composition-baseline.test.ts`: para o banco padrão, o banco de estágios (`generateStagesBank`) e o banco de 3 países, grava como snapshot de teste a composição e as classificações finais de 3 temporadas simuladas; é a referência de "sem `berths` nada muda" (T040)
- [X] T002 [P] Verificar e registrar em `specs/021-classificacao-entre-competicoes/audit.md` os pontos em aberto do plano: (a) a avaliação das metas em `board/evaluation.ts` roda depois do ponto onde a etapa `resolve-qualification` ficará; (b) `validation/semantic/knockout.ts` aceita copa de 2 clubes e `knockoutFormatSchema` aceita 1 fase; (c) `buildSeasonCalendar` recusa dois jogos do mesmo clube no mesmo dia; (d) onde `enter`/`entries.clubIds` são lidos em `stages/` e `knockout/`

---

## Phase 2: Foundational (pré-requisitos de todas as histórias)

**Purpose**: formato de dados, validação estrutural, tipos, fontes, resolução, etapa de virada e save v16.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Dados e validação estrutural (Princípio III)

- [X] T003 [P] Escrever `packages/engine/test/validation/qualification-schema.test.ts`: `division.berths` aceito com cada tipo de fonte (`position`, `champion`, `runnerUp`, `reached`), `entry`, `fallback`, `require`, `forbid`; recusado por faixa (`from > to`, nível 0), campo desconhecido e id repetido; `knockout.phases` aceita 1 fase; banco sem `berths` segue válido
- [X] T004 Adicionar `berthSchema`/`berthSourceSchema` a `divisionSchema` e abrir `knockoutFormatSchema.phases` para 1 a 8 em `packages/engine/src/model/schemas.ts`; tipos `Berth`, `BerthSource`, `DivisionRef` em `model/types.ts`
- [X] T005 [P] Escrever `packages/engine/test/knockout/single-phase.test.ts`: copa de uma fase com 2 clubes é criada, sorteada e jogada (ida e volta e jogo único), tem campeão e vice e entra no histórico de copas; as validações de contagem e de decisor de `validation/semantic/knockout.ts` aceitam 2 clubes
- [X] T006 Ajustar `packages/engine/src/knockout/{bracket,rules,tie,draw}.ts` e `validation/semantic/knockout.ts` para a final única (resultado do audit T002 b) e registrar em `docs/mod-format.md` o novo limite de fases

### Tipos, fontes e resolução (Princípios I e II)

- [X] T007 [P] Criar `packages/engine/src/qualification/types.ts` com `Origin`, `PassReason`, `QualificationRecord`, `QualificationResult`, `BerthZone` conforme `data-model.md`
- [X] T008 [P] Escrever `packages/engine/test/qualification/pools.test.ts`: `poolOf(source, finished)` devolve a lista ordenada: `position` (faixa da tabela final), `champion`/`runnerUp` (liga: 1º/2º da divisão 1; copa e fases: final), `reached` (fase decrescente, depois aproveitamento nos jogos da competição, depois id); fonte de competição ausente da temporada encerrada dá erro claro
- [X] T009 Criar `packages/engine/src/qualification/pools.ts` com `poolOf` usando `standings`, `cupChampion`/`cupReached` e a tabela final das fases
- [X] T010 [P] Escrever `packages/engine/test/qualification/order.test.ts`: `resolutionOrder` ordena competições alimentadas pelas dependências `require`/`forbid` (ordem do banco quando não há), e `findCycle` devolve o ciclo A→B→A e o autorreferente
- [X] T011 Criar `packages/engine/src/qualification/order.ts` (`resolutionOrder`, `findCycle`)
- [X] T012 [P] Escrever `packages/engine/test/qualification/resolve.test.ts` (banco mínimo de teste): vaga direta por posição e título; unicidade no mesmo destino; repasse por clube já classificado (`duplicate`), por `require` (clube rebaixado) e por `forbid`; clube extinto; ordem de repasse com 3 níveis; fechamento esgotado → `qualification.exhausted` com competição e vaga; determinismo (duas execuções iguais); número de participantes por fase sempre igual ao esperado
- [X] T013 Criar `packages/engine/src/qualification/resolve.ts` com `resolveQualification` (R2/R3) e exportar tudo em `packages/engine/src/index.ts`; sem PRNG e sem `Date`
- [X] T014 [P] Escrever `packages/engine/test/qualification/entrants.test.ts`: `entry.stage`/`entry.phase` produzem `entrants`; competição em fases e copa recebem, na temporada ≥ 2, os clubes que entram tarde a partir de `entrants` em vez de `enter`/`entries` do banco (T002 d); temporada 1 continua com os dados estáticos
- [X] T015 Ajustar `packages/engine/src/stages/{create,rules,start}.ts` e `knockout/{bracket,draw}.ts` para consumirem `entrants` por competição e nível (parâmetro opcional de `createSeason`/`createCupSeason`); `createLeagueSeason` aceita `entrants` e valida `compositionProblem` contra as vagas

### Etapa de virada e estado (Princípios I, II e VI)

- [X] T016 [P] Escrever `packages/engine/test/career/qualification-step.test.ts`: `resolve-qualification` fica entre `promotion-relegation` e `advance-year` em `TURNOVER_STEP_IDS`; sem `berths` não altera nada; com `berths` substitui a composição da divisão, preenche `next.entrants`/`next.origins` e acrescenta o `QualificationRecord`; competições de países diferentes se alimentam
- [X] T017 Em `packages/engine/src/career/{turnover,types,next-season,season-state}.ts`: adicionar a etapa `resolve-qualification`, `next.compositions`/`entrants`/`origins` em `NextSeasonDraft`, `origins?` em `LeagueSeason`, `qualificationHistory` em `CareerHistory`/`TurnoverResult`; fazer `generateCalendars` e `createCareerSeason` usarem as composições e `entrants` de todas as competições
- [X] T018 [P] Escrever `packages/save/test/migrate-v16.test.ts` e criar fixtures `packages/save/test/fixtures/save-v15-*.ts` (início, meio e fim de temporada, com copa e fases): v15 abre como mundo sem vagas e segue jogável
- [X] T019 Subir `SAVE_FORMAT_VERSION` para 16 em `packages/save/src/format.ts`, incluir `qualificationHistory` e `origins` em `SaveFile` (opcionais), migração v15 → v16 em `migrate.ts` e ajustes em `career.ts`/`create.ts`/`summary.ts`
- [X] T020 [P] Códigos de erro e mensagens: registrar em `packages/engine/src/validation/issues.ts` e `packages/i18n/locales/pt-BR/errors.json` os códigos de `contracts/qualification-api.md` (`qualification.*`) com `season-errors-coverage`/`errors-coverage` verdes

**Checkpoint**: formato, tipos, resolução, etapa de virada e save v16 prontos; bancos sem `berths` não mudaram (T040).

---

## Phase 3: User Story 1 — Ver na tabela quais posições dão vaga (Priority: P1) 🎯 MVP

**Goal**: a tabela mostra faixas e legenda das posições que dão vaga em outras competições.

**Independent Test**: banco de teste em que as posições 1 a 3 da liga dão vaga na competição B e o
título da copa dá vaga em C; abrir a tabela da liga e conferir faixas e legenda (`quickstart.md` §4).

### Tests for User Story 1 ⚠️

- [X] T021 [P] [US1] `packages/engine/test/qualification/zones.test.ts`: `berthZones` devolve faixas por destino e fase de entrada a partir das vagas de todos os destinos cuja fonte é a divisão; `champion`/`runnerUp` de liga de divisão única viram posições 1 e 2; competição sem vagas devolve lista vazia; `divisionZones` expõe `berths` sem mudar `promotion`/`relegation`
- [X] T022 [P] [US1] `apps/web/test/flows/qualification.test.tsx` (parte 1): a tabela mostra a faixa e a legenda "vaga na {competição}" (e a fase quando não é a primeira); sem vagas, nenhuma legenda nova

### Implementation for User Story 1

- [X] T023 [US1] Criar `packages/engine/src/qualification/zones.ts` (`berthZones`) e estender `divisionZones` em `career/league.ts`
- [X] T024 [US1] Em `apps/web/src/app/jogo/competicao/*` e `apps/web/src/ui/DataTable.tsx`/`DivisionTabs.tsx`, exibir faixas de cor por destino e legenda por competição (cores com contraste suficiente nos dois temas); textos em `packages/i18n/locales/pt-BR/ui.json` (`table.berth.*`)
- [X] T025 [US1] Fim da temporada: a prévia das vagas resolvidas (`qualificationPreview`, `packages/save/src/career.ts`) aparece em `fim-de-temporada` e, depois da virada, o `QualificationRecord` aparece em Histórico (a tabela da temporada já virou); testes na `qualification.test.tsx`

**Checkpoint**: US1 verificável com o banco de teste do T026 (ou fixtures dos testes).

---

## Phase 4: User Story 2 — Chegar a outra competição por título ou campanha (Priority: P1)

**Goal**: título, campanha ou repasse levam o clube a outra competição na temporada seguinte, sem
sobra de vagas nem clube duplicado.

**Independent Test**: simular uma temporada num banco com liga, copa e competição B alimentada por
ambas; B começa a seguinte com os clubes certos, inclusive por repasse (`quickstart.md` §2).

### Tests for User Story 2 ⚠️

- [X] T026 [P] [US2] Estender `packages/engine/src/worldgen/world-example.ts` e criar `packages/engine/test/worldgen/world-qualification.test.ts`: o banco de teste de países (liga de 2 divisões, copa e uma competição alimentada pela liga e pela copa por país) é válido (`validateBank`), determinístico por seed e com nomes sem colisão com a blocklist
- [X] T027 [P] [US2] `packages/engine/test/career/qualification-season.test.ts`: após uma temporada, a competição alimentada começa com os clubes de `QualificationRecord`; o clube do jogador, classificado por posição ou por título, aparece no calendário (`clubFixtures`) em B, na fase certa; o mesmo clube em duas vagas entra uma vez e a segunda vaga é repassada
- [X] T028 [P] [US2] `packages/engine/test/qualification/long-run.test.ts`: 30 temporadas (banco reduzido para o CI: 3 países; completo no job de simulação) com limites declarados no teste: participantes por fase sempre iguais ao esperado em 100% das temporadas, nenhum clube repetido na mesma competição, vagas repassadas dentro de faixa, determinismo com salvar e carregar no meio (SC-001, SC-006)
- [X] T029 [P] [US2] `apps/web/test/flows/qualification.test.tsx` (parte 2): a página da competição lista a origem de cada participante (posição ou título em outra competição, acesso, repasse, banco inicial)

### Implementation for User Story 2

- [X] T030 [US2] Criar `generateWorldBank` com competições alimentadas (T026) e conferir que `createCareerSeason` e a virada rodam as três listas (`league`, `competitions`) com a etapa `resolve-qualification` por todos os países
- [X] T031 [US2] `packages/engine/src/career/history.ts` e `next-season.ts`: gravar o `QualificationRecord` da temporada encerrada e expor `participantOrigins`, `qualificationOutcome`, `clubQualification` (`contracts/qualification-api.md`)
- [X] T032 [US2] Página da competição em `apps/web/src/app/jogo/competicao/*`: seção "Origem dos participantes" (`ui/qualification/ParticipantOrigins.tsx`); textos em `ui.json` (`competition.origin.*`)
- [X] T033 [US2] Resumo de fim de temporada em `apps/web/src/app/jogo/fim-de-temporada/*`: vagas conquistadas, perdidas por repasse e por já estar classificado (US6 cenário 3 usa a mesma tela); textos em `ui.json`
- [X] T034 [US2] Ajustar `tools/src/simulate-world.ts` com `--qualification` (30 temporadas, imprime violações de participantes por fase e repetição), usado em `quickstart.md` §2 e no job de simulação do `release.yml`

**Checkpoint**: US2 jogável de ponta a ponta; as competições se alimentam e o número de participantes fecha.

---

## Phase 5: User Story 3 — Supercopas entre campeões (Priority: P2)

**Goal**: supercopa entre campeões de duas competições, com repasse quando o mesmo clube ganha as duas.

**Independent Test**: banco de teste com supercopa entre campeão da liga e da copa; duas temporadas,
uma com campeões diferentes e outra com o mesmo clube; participantes certos em cada caso.

### Tests for User Story 3 ⚠️

- [X] T035 [P] [US3] `packages/engine/test/qualification/supercup.test.ts`: campeões diferentes → dois participantes; mesmo campeão → vice da liga (ou o que o `fallback` definir) preenche; competição de origem sem campeão (extinta) → repasse; a supercopa entra no calendário na data de `schedule`, é jogada e tem campeão no histórico de copas
- [X] T036 [P] [US3] Acrescentar à `qualification/long-run.test.ts` (T028) o caso "campeão da liga ganha também a copa" em pelo menos uma temporada da amostra, com assert direto sobre os participantes da supercopa e o preenchimento por repasse (SC-002)

### Implementation for User Story 3

- [X] T037 [US3] Banco de teste (`worldgen/world-example.ts`) e `mods/exemplo-mundo` ganham uma supercopa por país (`knockout` de 1 fase) com vagas `champion`/`runnerUp` e fechamento por tabela; regenerar com `tools/src/gen-world-example-mod.ts`
- [X] T038 [US3] Garantir o jogo da supercopa para o clube do jogador com as mesmas regras de partida e calendário (017/018) e mostrar o confronto em `apps/web/src/app/jogo/calendario/*` e na página da competição; teste de fluxo em `qualification.test.tsx`

**Checkpoint**: supercopas funcionando, inclusive com repasse.

---

## Phase 6: User Story 4 — Acesso entre competições diferentes (Priority: P2)

**Goal**: o desempenho numa competição regional dá vaga na copa nacional ou na divisão nacional mais baixa.

**Independent Test**: regional com vagas na copa e campeão com vaga na divisão nacional mais baixa;
2 temporadas, participantes das duas competições conferidos.

### Tests for User Story 4 ⚠️

- [X] T039 [P] [US4] `packages/engine/test/qualification/pyramid-exit.test.ts`: a última divisão com `relegationSlots` n e n vagas externas mantém o total; os clubes rebaixados saem da pirâmide e são elegíveis para a vaga de origem se esta o permitir; `nextComposition` devolve `relegatedOut`; sem vagas externas e com `relegationSlots > 0` na última divisão continua recusado (`division.bottom_has_relegation`)
- [X] T040 [P] [US4] `packages/engine/test/career/qualification-compat.test.ts`: bancos sem `berths` reproduzem os snapshots de T001 (SC-005); saves v15 abrem e jogam uma temporada sem vagas

### Implementation for User Story 4

- [X] T041 [US4] `career/composition.ts`: `nextComposition` ganha `relegatedOut` e `promotedOut`; `validation/semantic/competitions.ts` aceita `relegationSlots`/`promotionSlots` nas pontas da pirâmide só com vagas externas somando o mesmo número (`qualification.pyramid_exit_mismatch` caso contrário)
- [X] T042 [US4] Banco de teste e `mods/exemplo-mundo`: taça dos classificados por país (`qualifiersCupOf` em `worldgen/world-example.ts`), alimentada pela liga com entrada tardia na 2ª fase; regenerar com `gen-world-example-mod.ts`. **Desvio:** uma regional com clubes de fora da pirâmide é recusada por `competition.club_outside_main` e as finanças, torcidas e diretorias só existem para clubes das ligas principais; estender isso fica para 022/023 (ver `audit.md`)
- [X] T043 [US4] Cobrir entrada tardia (`entry.phase` > 1) em copa e em estágios nas fases de `qualification/entrants.test.ts` e na longa (T028)

**Checkpoint**: acesso entre competições e saída da pirâmide funcionam.

---

## Phase 7: User Story 5 — Descrever vagas só com dados (Priority: P2)

**Goal**: o modder descreve vagas, repasses e supercopa só com dados; incoerências são recusadas com arquivo e campo.

**Independent Test**: mod de 3 países com vagas, repasses e supercopa carrega sem mudar o jogo; um mod
por tipo de erro é recusado com mensagem clara (`quickstart.md` §1 e §5).

### Tests for User Story 5 ⚠️

- [X] T044 [P] [US5] `packages/engine/test/validation/qualification.test.ts`: um caso por código `qualification.*` (competição, divisão ou fase inexistente; faixa inválida; contagem de vagas ≠ participantes por fase; fechamento ausente ou pequeno; ciclo em `require`/`forbid`; saída de pirâmide que não fecha; id de vaga repetido), cada um com arquivo e campo na mensagem; banco válido de 3 países passa
- [X] T045 [P] [US5] `packages/modkit/test/qualification.test.ts`: o mod de exemplo (`mods/exemplo-mundo`) carrega, valida e roda 2 temporadas; CSV de competições não perde `berths`

### Implementation for User Story 5

- [X] T046 [US5] Criar `packages/engine/src/validation/semantic/qualification.ts` (contagem por fase, fechamento, pool grande o bastante, ciclos por `order.ts`, saída da pirâmide) e registrar em `validation/validate.ts`; mensagens em `errors.json`
- [X] T047 [US5] Garantir import/export de `berths` em `packages/modkit/src/*` (JSON e CSV) e na validação do `tools/src/validate-bank.ts`
- [X] T048 [P] [US5] Documentar vagas, repasse, supercopa e acesso externo em `docs/mod-format.md` (campos, exemplos do `contracts/mod-format-and-ui.md`, códigos de erro) e termos em `docs/glossario.md`; atualizar `docs/design.md` §3 e §11 com uma linha sobre vagas entre competições

**Checkpoint**: modders descrevem e validam vagas só com dados.

---

## Phase 8: User Story 6 — Metas, manchetes e histórico (Priority: P3)

**Goal**: diretoria pode cobrar uma vaga; manchetes e histórico registram classificações.

**Independent Test**: meta "classificar para B", terminar dentro e fora da zona e por repasse; meta,
manchete e histórico corretos.

### Tests for User Story 6 ⚠️

- [X] T049 [P] [US6] `packages/engine/test/board/qualify-goal.test.ts`: `goalTiersFor` oferece o nível `qualify:<id>` quando a divisão tem zona de vaga direta; a meta é cumprida se o clube está entre os participantes do destino por qualquer caminho (direta ou repasse) e falhada caso contrário; durante a temporada o progresso usa a posição
- [X] T050 [P] [US6] `packages/engine/test/news/qualification.test.ts`: manchete de classificação para campeões e para o clube do jogador, uma por vaga relevante; sem manchete para vagas comuns de outros clubes; textos por variantes
- [X] T051 [P] [US6] `packages/engine/test/career/qualification-history.test.ts`: o histórico guarda um `QualificationRecord` por temporada (tamanho limitado); `clubQualification` e o histórico do clube mostram o caminho (posição, título, repasse)

### Implementation for User Story 6

- [X] T052 [US6] `board/{goals,types,evaluation}.ts`: nível `qualify` por competição de destino (posição = última da zona direta), avaliação final pelo `QualificationRecord` (audit T002 a), rótulo e mensagens em `ui.json`; migração de metas de saves existentes não é necessária (nível novo só em temporadas novas)
- [X] T053 [US6] `news/{rules,turnover}.ts`: fato `qualification` e manchetes; `apps/web/src/app/jogo/{noticias,historico,carreira}/*` exibem classificações e o caminho; textos em `ui.json`/`news` do i18n
- [X] T054 [P] [US6] `apps/web/test/flows/qualification.test.tsx` (parte 3): meta "classificar para X" no catálogo de metas, resultado no resumo, manchete e histórico

**Checkpoint**: integração completa com diretoria, notícias e histórico.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T055 [P] e2e `apps/web/e2e/qualification.spec.ts` com um mundo gerado no próprio teste: nova carreira, jogar uma temporada, ver zonas na tabela, ver a competição seguinte com a origem do clube, jogar a supercopa
- [X] T056 [P] Teste de arquitetura: `packages/engine/src/qualification/*` não usa APIs proibidas (`Math.random`, `Date`, DOM) e `qualification/` não importa nada da UI (`packages/engine/test/architecture.test.ts`)
- [X] T057 Revisar i18n: nenhum texto novo fora de `ui.json`/`errors.json`/`release-notes.json`; plurais e gêneros em ICU (`table.berth.*`, `competition.origin.*`, `board.goal.qualify`, manchetes)
- [X] T058 Subir a versão em `package.json` (1.5.0 → 1.6.0) e escrever as notas em `packages/i18n/locales/pt-BR/release-notes.json`, no mesmo PR da feature (commit `chore(release): 1.6.0`)
- [X] T059 Rodar `quickstart.md` do início ao fim e registrar os resultados em `specs/021-classificacao-entre-competicoes/audit.md`
- [X] T060 Portões finais: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e`; `pnpm sim:world --scale --countries 10 --seasons 30 --qualification` dentro de `SCALE_LIMITS` da 020 e sem violações de participantes; o mesmo passo no job de simulação do `release.yml`

---

## Dependencies & Execution Order

- **Fase 1** (T001–T002): sem dependências; T002 alimenta T006, T015 e T052.
- **Fase 2** (T003–T020): depende da Fase 1. Ordem interna: T003→T004; T005→T006; T007 antes de T008–T013; T008→T009; T010→T011; T012→T013 depois de T009 e T011; T014→T015; T016→T017 depois de T013 e T015; T018→T019 depois de T017; T020 em paralelo.
- **US1** (T021–T025): depende da Fase 2; T021→T023→T024→T025.
- **US2** (T026–T034): depende da Fase 2. T026→T030; T027–T029 depois do T030; T031→T032/T033; T034 depois de T030.
- **US3** (T035–T038): depende da US2 (T030).
- **US4** (T039–T043): depende da US2 (T030); T041 antes de T042.
- **US5** (T044–T048): depende da Fase 2; pode correr em paralelo com US1–US4 (T046 antes de T044 passar).
- **US6** (T049–T054): depende da US2 (T031).
- **Polish** (T055–T060): depende das histórias escolhidas; T058 só depois de T057.

### Paralelismo

- Fase 2: os testes T003, T005, T007, T008, T010, T012, T014, T016, T018 e T020 em paralelo (arquivos distintos).
- US2: T026–T029 em paralelo; US3 e US4 em paralelo depois de T030; US5 e US6 em paralelo com elas.
- Polish: T055 e T056 em paralelo.

## Implementation Strategy

1. **MVP**: Fases 1, 2, US1 e US2. As competições se alimentam, a tabela mostra as zonas e o número
   de participantes fecha em 30 temporadas (SC-001), verificável por T028.
2. **Incremento 2**: US3 (supercopa) e US4 (acesso externo e saída da pirâmide), em paralelo com a
   US5 (validação completa, mod de exemplo e documentação).
3. **Incremento 3**: US6 (metas, manchetes e histórico).
4. **Fechamento**: Polish, versão e notas de versão no mesmo PR da feature (release automático ao
   fazer o merge na main).
