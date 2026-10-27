---

description: "Lista de tarefas da feature 023 — Estaduais com duas divisões"
---

# Tasks: Estaduais com duas divisões

**Input**: Design documents from `specs/023-estaduais-duas-divisoes/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: o motor segue o Princípio IX (testes antes, devem falhar primeiro): escopo regional,
composição, vagas, peso, histórico, validação e migração. O equilíbrio tem simulação longa com
limites declarados (Princípio V); o save v18 tem migração e fixtures (Princípio VI). Fluxos de
interface com happy-dom + fake-indexeddb; e2e com Playwright.

**Organization**: tarefas por user story, em ordem de prioridade. A base comum (formato de dados,
escopo, banco de teste de 27 estaduais, save v18) fica na Fase 2:

- P1: US1 (disputar o estadual no começo da temporada), US2 (acesso, rebaixamento e vagas nacionais)
- P2: US3 (peso na carreira e telas), US4 (modder e validação)
- P3: US5 (clubes regionais por 30 temporadas)

US1 depende só da Fase 2; US2 depende da US1; US3 depende da US1 e da US2 (histórico); US4 depende
da Fase 2 (as validações de acesso/rebaixamento precisam da US2 para os testes de composição); US5
depende da US1 e da US2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 … US5 (spec.md)
- Caminhos relativos à raiz do repositório

## Referências rápidas

- **API do motor:** `specs/023-estaduais-duas-divisoes/contracts/regional-api.md`
- **Mod, save e telas:** `specs/023-estaduais-duas-divisoes/contracts/mod-format-and-ui.md`
- **Decisões R1–R11:** `research.md`; **tipos e validações:** `data-model.md`; **roteiro:** `quickstart.md`
- **Já existentes:**
  - fases e copas: `createStagedSeason` (`packages/engine/src/stages/create.ts`), `advanceStages`
    (`stages/advance.ts`), `finalOrder`/`stagedStandings` (`stages/ranking.ts`),
    `overallStandings` (`stages/classification.ts`), sorteio de grupos (`stages/groups-draw.ts`)
  - composição: `nextComposition` (`packages/engine/src/career/composition.ts`)
  - vagas: `resolveQualification`/`applyQualification` (`qualification/*.ts`)
  - competição principal: `mainCompetitionOf`/`mainCompetitions`/`rulesCompetitionOf`
    (`world/countries.ts`)
  - 022: `clubCampaign` (`continental/campaign.ts`), `continentalEdition` (`continental/history.ts`),
    `continentalFacts` (`continental/facts.ts`), metas (`board/continental.ts`)
  - limites de escala: `SCALE_LIMITS` (`packages/save/src/scale-limits.ts`)

## Phase 1: Setup (linha de base e auditoria)

**Purpose**: medir e mapear antes de mexer (R4, R6, R9)

- [X] T001 Auditar os pontos que supõem "todo clube tem divisão na liga principal" (`clubDivision` em `packages/engine/src/finance/{gate,actions}.ts`, `market/ai/report.ts`, `news/round.ts`, `board/{evaluation,history,offers}.ts`, `career/{injuries,season-state}.ts`) e os que supõem "a temporada começa na rodada 1 da liga" (fadiga, lesões, janela, humor); registrar o que quebra com clube só regional em `specs/023-estaduais-duas-divisoes/audit.md`
- [X] T002 [P] Medir a linha de base de escala do banco atual de 10 países (tempo de virada, dia de jogos, tamanho de save, heap) com `pnpm sim:world --scale` e registrar em `specs/023-estaduais-duas-divisoes/baseline.md`
- [X] T003 [P] Criar o esqueleto do módulo `packages/engine/src/regional/{types,scope,weight,history,facts}.ts` e exportar de `packages/engine/src/index.ts`; estender `packages/engine/test/architecture.test.ts` para cobrir `regional/`

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**: formato de dados, escopo, banco de teste e save v18

- [X] T004 [P] Escrever testes do schema `competition.regional` (região, `weight`, `byReputation` crescente) em `packages/engine/test/model/regional-schema.test.ts`
- [X] T005 Acrescentar `regionalSchema` e o campo opcional `regional` em `competitionSchema` em `packages/engine/src/model/schemas.ts` e os tipos em `packages/engine/src/model/types.ts`
- [X] T006 [P] Escrever testes de `mainCompetitionOf`/`mainCompetitions`/`isCountryMain` ignorando competição regional, com o estadual listado antes da liga, em `packages/engine/test/world/regional-main.test.ts`
- [X] T007 Fazer `mainCompetitionOf`, `mainCompetitions` e `isCountryMain` ignorarem competições com `regional` em `packages/engine/src/world/countries.ts`
- [X] T008 [P] Escrever testes de `isRegional`, `regionalCompetitions`, `regionalCompetitionOf`, `isRegionalOnly` e `regionalDivisionOf` em `packages/engine/test/regional/scope.test.ts`
- [X] T009 Implementar o escopo em `packages/engine/src/regional/scope.ts` (contrato `regional-api.md`)
- [X] T010 [P] Escrever testes do gerador de banco com 27 estaduais (1ª com 12 e 2ª com 8 clubes, ~40 clubes também nacionais, região em todos os clubes) em `packages/engine/test/worldgen/regional-world.test.ts`
- [X] T011 Implementar `packages/engine/src/worldgen/regional.ts` (estados fictícios, clubes regionais com elenco de 16, reputação e caixa menores, `schedule` do estadual antes das nacionais) e usá-lo em `packages/engine/src/worldgen/world-example.ts`
- [X] T012 [P] Escrever testes de migração v17 → v18 com fixtures (início, meio e fim de temporada) em `packages/save/test/migrate-v18.test.ts` e gerar as fixtures v17 em `packages/save/test/fixtures/`
- [X] T013 Subir `SAVE_FORMAT_VERSION` para 18 e implementar a migração em `packages/save/src/{format,migrate}.ts` (campos opcionais `regionalHistory` e meta `regional`)

**Checkpoint**: formato, escopo, banco de teste e save prontos

---

## Phase 3: User Story 1 - Disputar o estadual no começo da temporada (Priority: P1) 🎯 MVP

**Goal**: o clube joga o estadual da sua região, grupos → mata-mata → final em ida e volta, antes da liga.

**Independent Test**: num banco com um país e um estadual, iniciar a temporada com um clube da 1ª divisão e jogar até a final; a liga só começa depois.

### Tests for User Story 1

- [X] T014 [P] [US1] Escrever teste de criação da temporada: o estadual vira competição secundária com as duas divisões em fases, sorteio determinístico por seed, em `packages/engine/test/career/regional-season.test.ts`
- [X] T015 [P] [US1] Escrever teste de calendário: as rodadas do estadual vêm antes da primeira rodada nacional e a final é em ida e volta, em `packages/engine/test/calendar/regional-calendar.test.ts`
- [X] T016 [P] [US1] Escrever teste de formato: jogo único com mando do melhor campanha e desempate nos pênaltis, final de 2 jogos, em `packages/engine/test/stages/regional-format.test.ts`
- [X] T017 [P] [US1] Escrever teste de que o clube do jogador sempre disputa o estadual da sua região e a divisão em que estiver, e que rivalidades (013) valem nos jogos, em `packages/engine/test/career/regional-player.test.ts`
- [X] T018 [P] [US1] Escrever teste de salvar/carregar no meio da fase de grupos do estadual com o resto da temporada igual, em `packages/engine/test/career/regional-save-load.test.ts`

### Implementation for User Story 1

- [X] T019 [US1] Incluir as competições regionais em `CareerSeasonState.competitions` ao criar a temporada em `packages/engine/src/career/season-state.ts`
- [X] T020 [US1] Atribuir datas do estadual antes das rodadas nacionais em `packages/engine/src/calendar/season-calendar.ts` (grade única por competição, sem `gapWeeks`)
- [X] T021 [US1] Corrigir os pontos de T001 que supõem "a temporada começa na liga" em `packages/engine/src/career/{day,season-state}.ts` e `packages/engine/src/fitness/`
- [X] T022 [US1] Garantir que a escolha de clube e a criação de carreira ponham o clube do jogador no estadual da região dele em `packages/engine/src/career/season-state.ts` e `packages/save/src/create.ts`
- [X] T023 [US1] Reconhecer rivalidades regionais (013) nos jogos do estadual em `packages/engine/src/news/rules.ts`

**Checkpoint**: o estadual é jogável do início à final, antes da liga

---

## Phase 4: User Story 2 - Acesso, rebaixamento e vagas nacionais (Priority: P1)

**Goal**: finalistas da 2ª sobem, piores dos grupos da 1ª caem, tamanho das divisões estável, vagas na copa e na divisão nacional mais baixa.

**Independent Test**: simular uma temporada com o clube do jogador finalista da 2ª e outra com boa campanha na 1ª; conferir a divisão e as vagas na temporada seguinte.

### Tests for User Story 2

- [X] T024 [P] [US2] Escrever teste de `nextComposition` com divisões em fases: finalistas sobem, piores da classificação geral dos grupos caem, tamanhos mantidos, seed fixa com empates, em `packages/engine/test/career/regional-composition.test.ts`
- [X] T025 [P] [US2] Escrever teste de vagas a partir do estadual (fonte `position`, nível 1) para a copa nacional e a divisão nacional mais baixa, com repasse quando o clube já está no destino, em `packages/engine/test/qualification/regional-berths.test.ts`
- [X] T026 [P] [US2] Escrever teste de `regionalEdition` (campeão, vice, promovidos, rebaixados por divisão) em `packages/engine/test/regional/history.test.ts`

### Implementation for User Story 2

- [X] T027 [US2] Conferir que `nextComposition` já lê a ordem final de divisões em fases (`finalOrder`); nenhuma mudança de código foi necessária, os testes de T024 fixam o comportamento
- [X] T028 [US2] Conferir que a fonte `position` da 021 lê a ordem final de uma divisão regional; nenhuma mudança de código foi necessária, os testes de T025 fixam o comportamento
- [X] T029 [US2] Implementar `regionalEdition` e `regionalHistory` em `packages/engine/src/regional/history.ts`
- [X] T030 [US2] Registrar a edição na virada de temporada, antes da troca de composição, em `packages/engine/src/career/{turnover,next-season}.ts` e guardar `regionalHistory` em `packages/save/src/career.ts`

**Checkpoint**: acesso, rebaixamento e vagas funcionam e o tamanho das divisões se mantém

---

## Phase 5: User Story 3 - Peso na carreira e telas (Priority: P2)

**Goal**: peso por competição e por faixa de reputação, meta regional, manchetes e telas do estadual.

**Independent Test**: jogar o estadual com um clube grande e um pequeno e comparar metas, diretoria, torcida, manchetes e histórico.

### Tests for User Story 3

- [X] T031 [P] [US3] Escrever teste de `regionalWeightFor` (padrão 100, faixas, peso 0 sem efeito) em `packages/engine/test/regional/weight.test.ts`
- [X] T032 [P] [US3] Escrever teste da meta `regional` (fase, título, acesso) e do efeito na confiança da diretoria, pesados por R7, em `packages/engine/test/board/regional-goal.test.ts`
- [X] T033 [P] [US3] Escrever teste da expectativa e do humor da torcida com o peso do estadual em `packages/engine/test/fans/regional-fans.test.ts`
- [X] T034 [P] [US3] Escrever teste de `regionalFacts` e das manchetes `regional.*` em `packages/engine/test/news/regional-news.test.ts`
- [X] T035 [P] [US3] Escrever teste de regressão: `competitionCampaign` dá o mesmo resultado que `clubCampaign` em competições continentais, e funciona no estadual, em `packages/engine/test/regional/campaign.test.ts`
- [X] T036 [P] [US3] Escrever teste de fluxo das telas do estadual (grupos, chaveamento, campanha, histórico) em `apps/web/test/flows/regional.test.tsx`

### Implementation for User Story 3

- [X] T037 [P] [US3] Implementar `regionalWeightFor` em `packages/engine/src/regional/weight.ts`
- [X] T038 [US3] Implementar a meta `regional` e sua avaliação em `packages/engine/src/board/{goals,evaluation,types,regional}.ts`
- [X] T039 [US3] Aplicar o peso na expectativa e no humor da torcida em `packages/engine/src/fans/{rules,mood}.ts`
- [X] T040 [P] [US3] Implementar a etapa de virada `news-regional` e os tipos de manchete `regionalChampion`, `regionalPromoted` e `regionalRelegated` em `packages/engine/src/news/{types,rules,turnover}.ts` (a etapa lê `regionalHistory`; sem `regional/facts.ts`)
- [X] T041 [US3] Generalizar `clubCampaign` para `competitionCampaign` mantendo o alias da 022 em `packages/engine/src/continental/campaign.ts`
- [X] T042 [P] [US3] Acrescentar os textos (telas, metas, manchetes, histórico) em `packages/i18n/locales/pt-BR/ui.json`
- [X] T043 [US3] Reaproveitar a tela de competições (`apps/web/src/app/jogo/competicao/page.tsx`) para o estadual: abas das divisões, grupos, chaveamento e campanha já valem para competições em fases; sem tela nova
- [X] T044 [US3] Listar o estadual da região do clube junto das competições nacionais em `apps/web/src/ui/CompetitionSelect.tsx`
- [X] T045 [US3] Mostrar campeões das duas divisões e a meta regional em `apps/web/src/ui/{history,board}` e `apps/web/src/app/jogo/historico/`
- [X] T046 [P] [US3] Escrever o e2e do estadual em `apps/web/e2e/regional.spec.ts`

**Checkpoint**: o estadual pesa na carreira e tem telas

---

## Phase 6: User Story 4 - Modder define estados, divisões e clubes (Priority: P2)

**Goal**: banco inconsistente é rejeitado com erro que aponta o estadual e a divisão.

**Independent Test**: carregar o banco de 27 estaduais (passa) e um com estadual mal formado (rejeitado).

### Tests for User Story 4

- [X] T047 [P] [US4] Escrever testes de `regional.needs_country`, `regional.divisions_count`, `regional.stages_missing`, `regional.club_region` e `regional.club_without_region` em `packages/engine/test/validation/regional.test.ts`
- [X] T048 [P] [US4] Escrever testes de `regional.groups_size`, `regional.bracket_size`, `regional.slots_mismatch`, `regional.relegation_exceeds_groups`, `regional.promotion_exceeds_finalists` e `regional.weight_order` em `packages/engine/test/validation/regional-slots.test.ts`
- [X] T049 [P] [US4] Escrever teste de `calendar.regional_after_national` e de `calendar.club_double_booked` entre estadual e outra competição em `packages/engine/test/validation/regional-calendar.test.ts`

### Implementation for User Story 4

- [X] T050 [US4] Implementar as regras semânticas `regional.*` em `packages/engine/src/validation/semantic/regional.ts` e registrá-las em `packages/engine/src/validation/validate.ts`
- [X] T051 [US4] Implementar `calendar.regional_after_national` em `packages/engine/src/validation/semantic/calendar.ts`
- [X] T052 [P] [US4] Acrescentar as mensagens de erro em `packages/i18n/locales/pt-BR/errors.json`
- [X] T053 [P] [US4] Atualizar o mod de exemplo com estaduais em `mods/exemplo-mundo/` via `tools/src/gen-world-example-mod.ts` e garantir que `pnpm validate-bank mods/exemplo-mundo` passa
- [X] T054 [P] [US4] Documentar `competition.regional`, `club.region` e as regras em `docs/mod-format.md`

**Checkpoint**: o modder define estaduais só por dados e recebe erros claros

---

## Phase 7: User Story 5 - Clubes regionais por 30 temporadas (Priority: P3)

**Goal**: clubes regionais evoluem com o mundo e o mercado; divisões estáveis; escala dentro das metas.

**Independent Test**: simular 30 temporadas e conferir elencos, tamanhos de divisão e acesso/rebaixamento toda temporada.

### Tests for User Story 5

- [X] T055 [P] [US5] Escrever o teste longo `packages/engine/test/worldgen/regional-long-run.test.ts` (30 temporadas, seeds declaradas): tamanho das divisões constante, elencos válidos (11 a 25, posições mínimas), acesso e rebaixamento toda temporada, ≥ 3 campeões distintos por estadual, caixa dentro das faixas da 008
- [X] T056 [P] [US5] Escrever teste de escala do banco de 27 estaduais (virada, dia de jogos, tamanho do save) em `packages/save/test/regional-scale.test.ts`

### Implementation for User Story 5

- [X] T057 [US5] Corrigir os pontos de T001 em `packages/engine/src/{finance,market/ai,news,board}/` para clubes só regionais (divisão ausente na liga principal)
- [X] T058 [US5] Garantir renovação do elenco e mercado da IA para clubes regionais em `packages/engine/src/renewal/` e `packages/engine/src/market/ai/`
- [X] T059 [US5] Estender `tools/src/simulate-world.ts` com `--regional` e as medições da quickstart
- [X] T060 [US5] Nenhum ajuste de limite: com 27 estaduais e 30 temporadas o mundo fica dentro de `SCALE_LIMITS` (166 KB de crescimento por temporada depois de os estaduais deixarem de entrar em `competitionHistory`, que duplicava `regionalHistory`)

**Checkpoint**: 30 temporadas estáveis e dentro das metas de escala

---

## Phase 8: Polish & Cross-Cutting

- [X] T061 [P] Atualizar `docs/design.md` (§3 e §14), `docs/glossario.md` e o roadmap com a 023
- [X] T062 [P] Acrescentar a nota de versão em `packages/i18n/locales/pt-BR/release-notes.json` e subir a versão do jogo no mesmo PR (sem PR de release separado)
- [X] T063 Rodar o Biome (`pnpm lint`) e a suíte inteira (`pnpm test`) e corrigir o que sobrar
- [X] T064 Executar o roteiro de `specs/023-estaduais-duas-divisoes/quickstart.md` de ponta a ponta e anotar os resultados
- [X] T065 [P] Conferir o teste de blocklist de nomes reais com os estados, competições e clubes novos

---

## Dependencies & Execution Order

- **Fase 1** → **Fase 2** → histórias. A Fase 2 bloqueia todas.
- **US1** (MVP) depende só da Fase 2. **US2** depende da US1. **US3** depende de US1 e US2. **US4** depende da Fase 2 (e da US2 para testes de composição). **US5** depende de US1 e US2.
- Dentro de cada história: testes primeiro (devem falhar), depois implementação.
- T021 e T057 dependem do relatório de T001. T060 depende de T002.

## Parallel Opportunities

- Fase 1: T002 e T003.
- Fase 2: T004, T006, T008, T010 e T012 (arquivos de teste diferentes).
- US1: T014 a T018; US2: T024 a T026; US3: T031 a T036 e T037/T040/T042; US4: T047 a T049 e T052 a T054; US5: T055 e T056.
- US4 pode andar em paralelo com US2 e US3 depois da Fase 2.

## Implementation Strategy

- **MVP**: Fases 1, 2 e US1 (estadual jogável antes da liga). Validar com o quickstart, passos 1 e 3.
- **Incremento 2**: US2 (acesso, rebaixamento e vagas): a temporada brasileira fica completa.
- **Incremento 3**: US3 e US4 (peso, telas, validação para modders).
- **Incremento 4**: US5 (30 temporadas e escala) e Polish.
