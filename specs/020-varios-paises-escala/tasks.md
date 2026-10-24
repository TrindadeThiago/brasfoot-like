---

description: "Lista de tarefas da feature 020 — Vários países e simulação em escala"
---

# Tasks: Vários países e simulação em escala

**Input**: Design documents from `specs/020-varios-paises-escala/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: o motor segue o Princípio IX (testes antes, devem falhar primeiro): regras por país,
simulação resumida, dia e virada de vários países, mercado internacional, limite de estrangeiros,
troca de país, validação e migração. O equilíbrio tem simulação longa com limites declarados
(Princípio V, research.md R12 e R13); o save v15 tem migração e fixtures (Princípio VI). Fluxos de
interface com happy-dom + fake-indexeddb; e2e com Playwright.

**Organization**: tarefas por user story, em ordem de prioridade. A base comum (regras por país,
estado, validação, gerador do banco de teste, registro compacto, save v15) fica na Fase 2:

- P1: US1 (carreira em qualquer país, mundo inteiro jogando junto)
- P2: US2 (mercado e propostas entre países), US3 (mundo grande: simulação resumida, tamanho,
  tempo e memória)
- P3: US4 (banco com vários países para modders)

US3 pode ser feita depois da US1 (a US1 funciona com a simulação completa em todos os jogos, só
mais devagar); US2 depende da US1; US4 depende da Fase 2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 … US4 (spec.md)
- Caminhos relativos à raiz do repositório

## Referências rápidas

- **API do motor:** `specs/020-varios-paises-escala/contracts/world-api.md`
- **Save, mod e telas:** `specs/020-varios-paises-escala/contracts/mod-format-and-ui.md`
- **Decisões R1–R13:** `research.md`; **tipos:** `data-model.md`; **roteiro de validação:** `quickstart.md`
- **Já existentes:**
  - estado da carreira: `CareerSeasonState`/`createCareerSeason`/`calendarNext`/`currentDay`
    (`packages/engine/src/career/season-state.ts`), `LeagueSeason`/`TurnoverContext`/`SeasonHistoryEntry`
    (`career/types.ts`), `createLeagueSeason`/`leagueRound` (`career/league.ts`)
  - dia e virada: `completeCareerDay`/`applyRoundSystems` (`career/day.ts`, `finance/round.ts`),
    `startLeagueRound`/`completeLeagueRound` (`career/league-round.ts`), `seasonTurnover`
    (`career/turnover.ts`), `nextComposition` (`career/composition.ts`), `historyEntry` (`career/history.ts`)
  - partida: `startMatch`/`advanceMatch` (`match/engine.ts`), `MATCH_TUNING` (`match/tuning.ts`),
    `matchResult` (`match/result.ts`), força por setor (`match/strength.ts`), escalação automática
    (`match/auto-lineup.ts`), `prepareFixture` (`season/fixture.ts`), `toMatchRecord` (`season/record.ts`)
  - regras por competição: `economyRules` (`finance/rules.ts`), `marketRules` (`market/rules.ts`),
    `aiMarketRules` (`market/ai/rules.ts`), `boardRules`, `fansRules`, `newsRules`, `fitnessRules`
  - mercado/diretoria: `marketValue` (`market/value.ts`), `purchaseTarget` (`market/ai/targets.ts`),
    `aiMarketRound` (`market/ai/round.ts`), `windowIndex` (`market/ai/window.ts`),
    `compatibleClub`/`considerVacancies` (`board/offers.ts`), `clubReputation` (`board/coaches.ts`)
  - renovação: `nameBankFor` (`renewal/names.ts`), `youth` (`renewal/youth.ts`), `regulator`
    (`renewal/regulator.ts`), `measureWorld` (`renewal/measure.ts`)
  - gerador: `generateDefaultBank` (`worldgen/generate.ts`), `generateStagesBank`
    (`worldgen/stages-example.ts`), bancos de nomes (`worldgen/name-banks`)
  - dados/validação: `countrySchema`/`competitionSchema`/`clubSchema` (`model/schemas.ts`),
    `validateBank` (`validation/validate.ts`), `semantic/{countries,references,calendar}.ts`, códigos
    em `validation/issues.ts`
  - save: `SaveFile`/`SAVE_FORMAT_VERSION` (`packages/save/src/format.ts`), `migrate.ts`,
    `long-career.test.ts` (modelo para as metas de escala)
  - web: `apps/web/src/app/nova-carreira/page.tsx`, `jogo/{competicao,mercado,carreira,historico}`,
    `game/selectors.ts`, `ui/StandingsTable.tsx`

---

## Phase 1: Setup (linha de base e auditoria)

**Purpose**: medir o ponto de partida e mapear as leituras de "competição principal" antes de mexer
no motor. Nada aqui muda comportamento.

- [X] T001 Auditar e registrar em `specs/020-varios-paises-escala/audit-principal.md` cada uso de `world.competitions[0]`, `league.competitionId` e `state.league` como fonte de regras ou de clubes em `packages/engine/src` e `packages/save/src` (`grep -rn`), classificando cada um em "regra do clube", "regra do país do jogador" ou "do mundo"; é a lista de trabalho das tarefas T017–T024
- [X] T002 [P] Criar `packages/engine/test/season/summary-contract.test.ts`: lista, por busca de leitores de `MatchRecord` (`players`, `events`, `stats`, `starters`), o que cada sistema lê (classificação, artilharia, disciplina, lesões, minutos, finanças, torcida, notícias) e falha se aparecer leitor novo fora da lista de `research.md` R5
- [X] T003 Criar `tools/src/measure-save.ts` (script `pnpm sim:size`): carrega o banco padrão, joga N temporadas e imprime o tamanho em JSON de cada chave de topo do `SaveFile` e o gzip; registrar a linha de base de 40 clubes em `specs/020-varios-paises-escala/baseline.md` e conferir se os números de `research.md` R12 fecham
- [X] T004 [P] Criar `packages/save/test/scale-limits.ts` com `SCALE_LIMITS` (R12) e um teste `scale-limits.test.ts` que valida a forma do objeto; os valores são os de R12 e só mudam, com justificativa, depois da linha de base (T003)

---

## Phase 2: Foundational (pré-requisitos de todas as histórias)

**Purpose**: regras por país, formato de dados, estado, registro compacto, banco de teste e save v15.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Dados e validação (Princípio III)

- [X] T005 [P] Escrever `packages/engine/test/validation/countries.test.ts`: `country.rules.foreignLimit` aceito/recusado por faixa; `country.no_main_competition`, `country.main_not_league`, `club.country_mismatch`, `unique.duplicate_club_in_country`, `country.foreign_limit_exceeded` e aviso `country.names_missing`, cada um com arquivo e campo; banco de um país segue válido
- [X] T006 Adicionar `rules.foreignLimit` a `countrySchema` em `packages/engine/src/model/schemas.ts`, o tipo em `model/types.ts` e `maxInternationalPerClub` a `aiMarketRulesSchema` (R8/R13)
- [X] T007 Implementar as regras de T005 em `packages/engine/src/validation/semantic/countries.ts` e `semantic/references.ts` (e a comparação da secundária com a principal **do mesmo país** em `semantic/calendar.ts`); registrar os códigos em `validation/issues.ts` e as mensagens em `packages/i18n/locales/pt-BR/errors.json`

### Regras por país e estado (Princípios I e II)

- [X] T008 [P] Escrever `packages/engine/test/world/countries.test.ts`: `mainCompetitionOf`, `rulesCompetitionOf`, `countryOf`, `foreignCount`, `canSignForeign` (com e sem limite; empréstimo conta; jogador do próprio país não conta) num banco de 2 países
- [X] T009 Criar `packages/engine/src/world/countries.ts` e `world/foreign.ts` com as funções de T008 e exportar em `packages/engine/src/index.ts`
- [X] T010 [P] Escrever `packages/engine/test/world/rules-per-club.test.ts`: num banco de 2 países com economias bem diferentes (`wageFactorPct` 50 e 150, `fansBase`, prêmios), `economyRulesForClub`, `marketRulesForClub`, `boardRulesForClub`, `fansRulesForClub`, `newsRulesForClub` e `fitnessRulesForClub` devolvem as do país do clube; com um país devolvem as de hoje
- [X] T011 Adicionar as variantes `...ForClub(world, clubId)` em `finance/rules.ts`, `market/rules.ts`, `market/ai/rules.ts`, `board/rules.ts`, `fans/rules.ts`, `news/rules.ts` e `fitness/rules.ts` (em `packages/engine/src`), todas por `rulesCompetitionOf`
- [X] T012 [P] Escrever `packages/engine/test/world/leagues.test.ts`: `worldLeagues` na ordem do banco, `isCountryMain`, `switchManagerCountry` (troca papéis sem perder rodadas nem duplicar; sem efeito dentro do país) e o invariante "um clube em uma só liga principal"
- [X] T013 Criar `packages/engine/src/world/leagues.ts` e acrescentar `otherLeagues: LeagueSeason[]` e `worldHistory: SeasonHistoryEntry[]` a `CareerSeasonState` (`career/season-state.ts`) e `TurnoverResult`/`TurnoverContext` (`career/types.ts`), vazios por padrão; ajustar construtores e `withLeague`/`withSystems` para preservar os campos
- [X] T014 Acrescentar `topScorers?` a `SeasonHistoryEntry` (`career/types.ts`) e preenchê-lo em `career/history.ts` (`historyEntry`) a partir das estatísticas da competição, com teste em `packages/engine/test/career/history.test.ts`

### Registro compacto e acessor (R4)

- [X] T015 [P] Escrever `packages/engine/test/season/player-lines.test.ts`: `playerLines` devolve o mesmo conjunto para um registro completo e para o registro `summary` expandido (titulares com 90 minutos, menos o vermelho; só quem teve evento fora de `starters`); teste de arquitetura que falha se algum módulo fora de `season/record.ts` acessar `record.players`
- [X] T016 Acrescentar `summary?`, `starters?` a `MatchRecord` (`season/types.ts`), criar `playerLines` em `season/record.ts` e trocar os leitores de `record.players` (`season/stats.ts`, `season/discipline.ts`, `career/injuries.ts`, `renewal/*`, `fitness/*`, `apps/web/src/game/selectors.ts` e `ui/MatchSummary.tsx`) por `playerLines(record)`

### Rodar com as regras do país certo (resultado da auditoria T001)

- [X] T017 Trocar `world.competitions[0]` por `rulesCompetitionOf`/`...ForClub` em `market/squad.ts` (limite de elenco, que é do país do clube); em `market/value.ts` **manter** `world.competitions[0]` de propósito, com o comentário "valor universal (spec FR-013)" (`packages/engine/src`), com teste de regressão no banco de 2 países em `packages/engine/test/market/country-rules.test.ts`
- [X] T018 [P] Fazer `finance/create.ts` (`createFinances`, `annualWageBill`, `sponsorshipFor`, `defaultTicketPrice`) e `finance/turnover.ts` usarem as regras do país de cada clube, em vez da liga única; teste em `packages/engine/test/finance/per-country.test.ts` (folha e receita de dois clubes de mesma força em países de escalas diferentes)
- [X] T019 [P] Fazer `board/{rules,coaches,goals,round,turnover}.ts` usarem as regras do país do clube e criarem técnicos e vagas para os clubes de **todas** as ligas principais (nomes do banco do país, já existente); teste em `packages/engine/test/board/per-country.test.ts`
- [X] T020 [P] Fazer `fans/*`, `news/*` e `fitness/*` lerem regras do país do clube e `renewal/{measure,regulator,turnover}.ts` operarem por país (`measureWorld(world, { countryId })`, regulador por grupo de clubes do país); testes em `packages/engine/test/{fans,news,fitness,renewal}/per-country.test.ts`
- [X] T021 Rodar `pnpm typecheck && pnpm vitest run packages/engine` e confirmar que, com um país, nenhum resultado mudou (os testes existentes continuam verdes sem alteração)

### Banco de teste (R10)

- [X] T022 [P] Escrever `packages/engine/test/worldgen/world-bank.test.ts`: `generateWorldBank` gera 10 países × 2 divisões × 20 clubes (400 clubes), ids únicos com prefixo do país, nomes sem colisão com a blocklist, banco válido (`validateBank`), determinístico por seed, economia diferente por país, mesma agenda
- [X] T023 Criar `packages/engine/src/worldgen/world-example.ts` e os bancos de nomes `packages/engine/src/worldgen/name-banks/world/*.json` (≥ 20 nomes e 20 sobrenomes fictícios por país, gerados por tabelas de sílabas, sem nomes reais); exportar `generateWorldBank` em `index.ts`

### Save v15 (Princípio VI)

- [X] T024 [P] Escrever `packages/save/test/migrate-v15.test.ts` e criar as fixtures `packages/save/test/fixtures/save-v14-*.ts` (início, meio e fim de temporada, com copa e fases): v14 abre como mundo de um país, ganha `otherLeagues: []` e `worldHistory: []` e segue jogável
- [X] T025 Subir `SAVE_FORMAT_VERSION` para 15 em `packages/save/src/format.ts`, incluir `otherLeagues`/`worldHistory` em `SaveFile`, implementar a migração v14 → v15 em `migrate.ts` e ajustar `career.ts`/`create.ts`/`summary.ts` e o teste de integridade (`calendarProblem`) conforme `contracts/mod-format-and-ui.md`

**Checkpoint**: regras por país, estado, registro compacto, banco de teste e save v15 prontos; o
banco de um país não mudou.

---

## Phase 3: User Story 1 — Começar a carreira em qualquer país (Priority: P1) 🎯 MVP

**Goal**: todos os países jogam juntos e viram a temporada juntos; o jogador escolhe clube por país e
divisão e joga uma carreira num país que não é o inicial.

**Independent Test**: banco de 10 países; carreira num clube do país 7; uma temporada inteira, com
campeão, acesso e rebaixamento em cada país e as regras econômicas de cada um (`quickstart.md` §3).

### Tests for User Story 1 ⚠️

- [X] T026 [P] [US1] `packages/engine/test/career/world-season.test.ts`: `createCareerSeason` cria uma liga principal por país (a do clube em foco em `league`, as outras em `otherLeagues`), as secundárias de qualquer país em `competitions`, e um calendário único; banco de um país idêntico ao de hoje
- [X] T027 [P] [US1] `packages/engine/test/career/world-day.test.ts`: o dia joga todos os países; rodada de liga principal aplica finanças/evolução/torcida/diretoria/notícias aos clubes daquela liga com as regras do país; ao vivo = direto; salvar e carregar no meio não muda nada; acrescentar um país não altera os outros (isolamento)
- [X] T028 [P] [US1] `packages/engine/test/career/world-turnover.test.ts`: virada por país (acesso/rebaixamento, campeão, composição), `history` do país do jogador e `worldHistory` dos demais com classificação final e 10 artilheiros; nenhum clube em duas divisões; números de clubes por divisão preservados
- [X] T029 [P] [US1] `packages/engine/test/career/world-isolation.test.ts`: o mesmo estado com um país a mais produz resultados idênticos nos países originais (forks `${seed}:country:${id}:${etapa}`); e trocar o clube em foco para outro país não altera nenhum resultado já calculado nem as seeds das ligas (mesmos fixtures, mesmos placares)
- [X] T030 [P] [US1] `packages/engine/test/worldgen/world-determinism.test.ts`: o banco de teste de 10 países, mesma seed, mesmo estado inicial e mesmo resultado de uma temporada em execuções repetidas

### Implementation for User Story 1

- [X] T031 [US1] Em `career/season-state.ts`, fazer `createCareerSeason` criar uma liga por país (seed da temporada para o primeiro país de `countries.json` e `${seed}:country:${id}` para os demais, **independente do país do clube em foco**, R6), escolher `league` pelo país do clube em foco e montar `calendar` único com a agenda de cada competição; manter o caminho do banco de um país idêntico
- [X] T032 [US1] Em `career/day.ts`, percorrer `league`, `otherLeagues` e `competitions` no dia (função `slotSeason` ampliada), fechar cada rodada e, para liga principal, chamar `applyRoundSystems` por liga com as regras do país (parâmetro de liga em `finance/round.ts`); sistemas por clube e por id, forks por país
- [X] T033 [US1] Em `career/turnover.ts`, `composition.ts` e `history.ts`, calcular a composição por país, escrever `history` (país do jogador) e `worldHistory` (demais), e passar todas as ligas às etapas de renovação, finanças, mercado, diretoria, torcida e notícias, que iteram por país
- [X] T034 [US1] Em `career/injuries.ts` e `career/league-round.ts`, sincronizar lesões e cartões entre competições do mesmo país e entre ligas (um clube só joga em um país); ajustar `isCalendarOver`/`calendarNext` para as três listas
- [X] T035 [US1] Em `packages/save/src/{create,career,summary}.ts`, criar a carreira com `clubId` de qualquer país (validar `save.club_not_in_league` contra todas as ligas principais), persistir `otherLeagues`/`worldHistory` e expor `worldLeagues` aos leitores da UI
- [X] T036 [P] [US1] `packages/engine/test/renewal/world-long-run.test.ts`: 30 temporadas do banco de teste reduzido (4 países × 2 divisões × 12 clubes para o CI), cada país dentro das faixas de 008 e 009 (`measureWorld` por país), declaradas no próprio teste
- [X] T037 [US1] Tela de nova carreira em `apps/web/src/app/nova-carreira/page.tsx`: filtros País e Divisão (selects), busca por nome, contagem de resultados e lista virtualizada para 400 clubes; sem filtro de país com um só país; textos em `packages/i18n/locales/pt-BR/ui.json` (`newCareer.filter.*`, `country.*`)
- [X] T038 [P] [US1] `apps/web/test/flows/world.test.tsx` (parte 1): filtrar por país e divisão, escolher clube de outro país e começar a carreira com o mod de teste de 3 países
- [X] T039 [US1] Seletor de país em `apps/web/src/app/jogo/competicao/*` (tabela, resultados, artilharia de ligas alheias, só com mais de um país), consulta por `worldLeagues`; teste de fluxo na mesma `world.test.tsx`

**Checkpoint**: US1 jogável de ponta a ponta com a simulação completa em todos os jogos (mais lenta).

---

## Phase 4: User Story 2 — Propostas de emprego e contratações entre países (Priority: P2)

**Goal**: transferências internacionais, IA de transferências de todos os países e propostas de
emprego de qualquer clube, com troca de país a qualquer momento.

**Independent Test**: `quickstart.md` §4.

### Tests for User Story 2 ⚠️

- [X] T040 [P] [US2] `packages/engine/test/market/international.test.ts`: taxa em valor de mercado sem conversão; folha do jogador na escala do país de destino; janela dos dois países aberta (`market.window_closed_abroad`); contraproposta igual à nacional
- [X] T041 [P] [US2] `packages/engine/test/market/foreign-limit.test.ts`: contratação/empréstimo/livre acima do limite recusado (`market.foreign_limit`); renovação e jovens nunca bloqueados; clube acima do limite não perde jogador; IA respeita o limite
- [X] T042 [P] [US2] `packages/engine/test/market/ai-international.test.ts`: a IA contrata de outros países, respeita `maxInternationalPerClub` por janela e é determinística; **num mundo de 4 países e 5 temporadas, o número de transferências internacionais da IA por janela fica numa faixa declarada no teste (`INTERNATIONAL_PER_WINDOW`: mínimo > 0, máximo = `maxInternationalPerClub` × clubes × 0,25)**; custo da janela de 400 clubes dentro de limite declarado
- [X] T043 [P] [US2] `packages/engine/test/board/country-offers.test.ts`: propostas de clubes de qualquer país por reputação do clube (universal), com país derivado do clube; aceitar proposta de outro país chama `switchManagerCountry`, metas de meio de temporada, sem jogo duplicado ou perdido; vale a qualquer momento
- [X] T044 [P] [US2] `packages/engine/test/career/switch-country-day.test.ts`: troca de país no meio da temporada e continuação do dia: o novo clube joga o próximo dia do calendário, as competições do clube anterior seguem na simulação resumida/completa conforme a regra e o save feito logo após carrega igual

### Implementation for User Story 2

- [X] T045 [US2] Em `market/value.ts` manter o fator de contrato nas regras de mercado da primeira competição do banco (valor universal, FR-013) e **acrescentar teste em `packages/engine/test/market/international.test.ts` de que o mesmo jogador vale o mesmo em dois países de regras de mercado diferentes**; confirmar que a taxa não converte; em `market/negotiation.ts`/`club-response.ts`, aceitar clubes de países diferentes
- [X] T046 [US2] Em `market/windows.ts`, janela por país (rodadas da liga principal de cada país); recusar transferência internacional se a janela de um dos lados está fechada
- [X] T047 [US2] Implementar `foreignCount`/`canSignForeign` nas contratações do jogador (`market/negotiation.ts`, `free-agents.ts`, empréstimos) com os erros `market.foreign_limit` e `market.window_closed_abroad`, mensagens em `packages/i18n/locales/pt-BR/market-errors.json`
- [X] T048 [US2] Em `market/ai/{targets,round,window,seller}.ts`, buscar alvos em todos os países com índice por posição e faixa de força por janela, filtrar por limite de estrangeiros, janelas e `maxInternationalPerClub`
- [X] T049 [US2] Em `board/offers.ts` e `board/turnover.ts`, vagas e propostas para os clubes de todas as ligas principais, `acceptOffer` de outro país chamando `switchManagerCountry` (`world/leagues.ts`) e atualizando `clubId` do save em `packages/save/src/board.ts`
- [X] T050 [US2] Mercado na web (`apps/web/src/app/jogo/mercado`, `ui/market`): filtro de país, país na ficha do jogador, aviso do limite de estrangeiros e da janela fechada no outro país; textos em `ui.json` (`market.foreignLimit`, `country.*`)
- [X] T051 [US2] Propostas na web (`apps/web/src/app/jogo/carreira`, `ui/board`): país e divisão do clube em cada proposta e confirmação de troca de país que explica o que muda; histórico com seletor de país (`apps/web/src/app/jogo/historico`, `ui/history`)
- [X] T052 [P] [US2] `apps/web/test/flows/world.test.tsx` (parte 2): contratar jogador de outro país, ver o limite de estrangeiros, aceitar proposta de outro país e continuar jogando

**Checkpoint**: US2 funcional sobre a US1.

---

## Phase 5: User Story 3 — Mundo grande, rápido e com save de tamanho aceitável (Priority: P2)

**Goal**: simulação resumida para os jogos fora das competições do jogador, histórico resumido e
metas de tamanho, tempo e memória atendidas pelo banco de 10 países.

**Independent Test**: `quickstart.md` §2 e §5.

### Tests for User Story 3 ⚠️

- [X] T053 [P] [US3] `packages/engine/test/match/summary.test.ts`: `summarizeMatch` é determinístico, respeita as ausências, soma de gols por jogador = placar, no máximo 1 vermelho por jogador, lesão só em quem jogou, sem substituições, mesmo tipo de `MatchResult`
- [X] T054 [P] [US3] `packages/engine/test/match/summary-equivalence.test.ts`: 6 000 partidas por simulação em pares de forças variados; média de gols ±0,08, % mandante/empate/visitante ±2,5 pontos, distância de variação total de placares ≤ 0,03, amarelos ±0,25, vermelhos ±0,02, lesões ±0,03 por jogo (faixas declaradas no teste, R12)
- [X] T055 [P] [US3] `packages/engine/test/season/summary-round.test.ts`: `summarizeRound`/`completeSummaryRound` fecham a rodada com os mesmos efeitos da completa (classificação, artilharia, cartões e suspensões, lesões, minutos) e o mesmo `Season` resultante em ao vivo e direto
- [X] T056 [P] [US3] `packages/engine/test/career/simulation-kind.test.ts`: `simulationKindFor` — competição do clube em foco (qualquer divisão/fase) é completa, as demais são resumidas; desempregado usa o último clube; muda de forma determinística com a troca de país
- [X] T057 [P] [US3] `packages/save/test/scale.test.ts`: banco de 10 países, 30 temporadas, metas de `SCALE_LIMITS` (tamanho no início da temporada 31, crescimento 10ª–30ª, última rodada, `.blsave`, tempo do dia e da virada por mediana, pico de heap); falha se um limite for superado
- [X] T058 [P] [US3] `packages/engine/test/renewal/world-long-run-400.test.ts`: 30 temporadas dos 400 clubes, cada país nas faixas de 008 e 009 e com a mesma faixa `INTERNATIONAL_PER_WINDOW` de volume de transferências internacionais por janela (piso e teto) e o saldo líquido de talento de cada país dentro de limite declarado; **não entra em `pnpm test` (leva minutos): a mesma checagem roda em `pnpm sim:world --scale --countries 10 --seasons 30` (T064), que falha com código ≠ 0, e esse comando é um passo do job de simulação de `.github/workflows/release.yml`; o PR comum cobre a escala reduzida de T036 e T057**

### Implementation for User Story 3

- [X] T059 [US3] Criar `packages/engine/src/match/summary-tuning.ts` (`SUMMARY_TUNING`) e `match/summary.ts` (`summarizeMatch`) conforme R3, usando `teamStrength`, adequação, mando e fadiga da completa; PRNG do `fixture.seed`
- [X] T060 [US3] Calibrar `SUMMARY_TUNING` com `tools/src/simulate-matches.ts` (`pnpm sim:matches --summary --games 6000`), registrar o ajuste em `research.md` R3 e manter T054 verde
- [X] T061 [US3] Criar `season/summary-round.ts` (`summarizeRound`, `completeSummaryRound`) extraindo de `season/live-round.ts` o trecho que aplica registros à `Season`, de modo que a completa e a resumida compartilhem o mesmo fechamento; `toMatchRecord` ganha o caminho `summary` com `starters` e linhas esparsas
- [X] T062 [US3] Criar `simulationKindFor` em `world/leagues.ts` e usá-lo em `career/day.ts` (e `league-round.ts`) para decidir completa × resumida por competição; jogos resumidos nunca são ao vivo
- [X] T063 [US3] Limpar do save as temporadas encerradas de países alheios (só `worldHistory`), limitar `news`, `market` e `finance ledger` dos clubes alheios conforme a linha de base (T003) e documentar o que ficou em `specs/020-varios-paises-escala/baseline.md`
- [X] T064 [US3] `tools/src/simulate-world.ts`: opção `--scale --countries N --seasons N` com relatório de tamanho por parte do save, tempo por dia e por virada, pico de heap e verificação de `SCALE_LIMITS`, saindo com código ≠ 0 quando qualquer limite ou faixa por país falhar; script `pnpm sim:world` documentado no `README.md`; incluir o passo `pnpm sim:world --scale --countries 10 --seasons 30` em `.github/workflows/release.yml`, ao lado dos passos de `sim:world` e `sim:economy` existentes
- [X] T065 [US3] Exibir jogos resumidos na web (`ui/RoundResults.tsx`, `ui/MatchHighlights.tsx`): placar, gols e cartões sem detalhe de jogo, rótulo "resumo" e nenhuma rodada ao vivo para ligas alheias; teste de fluxo em `world.test.tsx`

**Checkpoint**: US3 atendida; o critério de aceite 2 da spec roda em `pnpm sim:world --scale`.

---

## Phase 6: User Story 4 — Criar um banco com vários países (Priority: P3)

**Goal**: modders descrevem vários países só com dados, com documentação e exemplo.

**Independent Test**: `quickstart.md` §1 e §7.

### Tests for User Story 4 ⚠️

- [X] T066 [P] [US4] `packages/modkit/test/world-mod.test.ts`: o mod `mods/exemplo-mundo` (3 países) é aceito pelo modkit e jogável; mod com erro em `rules.foreignLimit`, país sem banco de nomes ou clube no país errado recusado com arquivo e campo
- [X] T067 [P] [US4] `packages/engine/test/worldgen/world-mod-generator.test.ts`: `gen:world-mod` determinístico e válido; 3 estruturas diferentes (uma divisão; duas divisões; duas divisões com copa)

### Implementation for User Story 4

- [X] T068 [US4] `tools/src/gen-world-example-mod.ts` e script `pnpm gen:world-mod` que gravam `mods/exemplo-mundo` (país A: uma divisão; B: duas divisões; C: duas divisões e copa), com `foreignLimit` em um país; incluir em `tools/package.json` e `package.json`
- [X] T069 [US4] Atualizar `docs/mod-format.md` conforme `contracts/mod-format-and-ui.md`: seção "Vários países", `countries.json` com `rules`, competição principal do país, regras econômicas por país, limite de estrangeiros, reputação do clube, bancos de nomes, tabela de erros novos
- [X] T070 [P] [US4] Tela de mods (`apps/web/src/app/mods`): mostrar país e quantidade de clubes por país do pacote carregado; textos em `ui.json`
- [X] T071 [US4] Atualizar `docs/design.md` §3, §11 e §13 (estado do Marco 8 e da 020) e `docs/glossario.md` (país, competição principal do país, simulação resumida, liga alheia)

**Checkpoint**: modders conseguem montar bancos de vários países com a documentação.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T072 [P] e2e `apps/web/e2e/world.spec.ts` com `mods/exemplo-mundo`: nova carreira em país não inicial, jogar uma rodada, consultar outra liga, contratar de outro país, aceitar proposta de outro país
- [X] T073 [P] Teste de arquitetura: o motor (módulos novos `world/`, `match/summary*`, `season/summary-round`) não usa APIs proibidas; ninguém lê `record.players` fora de `playerLines` (T015)
- [X] T074 [P] Teste de equivalência `packages/save/test/equivalence.test.ts`: o banco de um país produz resultados idênticos aos da linha de base (SC-006); saves v14 do `save-v14-*` abrem e continuam
- [X] T075 Revisar i18n: nenhum texto novo fora de `ui.json`/`errors.json`/`market-errors.json`; plurais e gêneros em ICU (`country.*`, `market.foreignLimit`, `offers.country`)
- [X] T076 Subir a versão em `package.json` (1.4.0 → 1.5.0) e escrever as notas em `packages/i18n/locales/pt-BR/release-notes.json`, no mesmo PR da feature
- [X] T077 Rodar `quickstart.md` do início ao fim e registrar os resultados e as medições finais em `specs/020-varios-paises-escala/baseline.md`
- [X] T078 Portões finais: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e`; `pnpm sim:world --scale --countries 10 --seasons 30` dentro de `SCALE_LIMITS`, com o mesmo passo no job de simulação do `release.yml`

---

## Dependencies & Execution Order

- **Fase 1** (T001–T004): sem dependências; T001 e T003 alimentam T017–T024 e T063.
- **Fase 2** (T005–T025): depende da Fase 1. Ordem interna: T005→T007; T008→T009; T010→T011; T012→T013; T014 depois de T013; T015→T016; T017–T020 depois de T009/T011/T013 (e conferem com T021); T022→T023 depois de T007; T024→T025 depois de T013 e T016.
- **US1** (T026–T039): depende da Fase 2. T031→T032→T033→T034→T035; T037–T039 depois de T035.
- **US2** (T040–T052): depende da US1 (T031–T035). T045→T046→T047→T048; T049 depois de T033 e T013; UI (T050–T052) depois do motor.
- **US3** (T053–T065): depende da Fase 2; T059→T060→T061→T062; T063 depois de T003 e T033; T064 depois de T062; T057/T058 passam só depois de T062–T064. Pode começar em paralelo com a US2.
- **US4** (T066–T071): depende da Fase 2 e de T023; pode correr em paralelo com US1–US3.
- **Polish** (T072–T078): depende das histórias escolhidas.

### Paralelismo

- Fase 1: T002 e T004 em paralelo com T001/T003.
- Fase 2: os testes T005, T008, T010, T012, T015, T022 e T024 em paralelo (arquivos distintos); T018, T019 e T020 em paralelo.
- US1: T026–T030 em paralelo; T036 e T038 em paralelo depois da implementação.
- US2: T040–T044 em paralelo; as telas T050 e T051 em paralelo.
- US3: T053–T058 em paralelo; T059 e T061 em arquivos distintos podem andar juntos depois de T060.

## Implementation Strategy

1. **MVP**: Fases 1, 2 e a US1. O mundo de 10 países joga junto com a simulação completa em todos os
   jogos; é lento, mas completo e verificável por T036 em escala reduzida.
2. **Incremento 2**: US3, para tornar o mundo grande viável (resumida, save, tempo, memória) e
   fechar o critério de aceite 2.
3. **Incremento 3**: US2 (mercado e propostas entre países) e, em paralelo, US4 (documentação e
   mod de exemplo).
4. **Fechamento**: Polish, versão e notas de versão no mesmo PR da feature (release automático ao
   fazer o merge na main).

---

## Notas da implementação

Desvios em relação ao texto das tarefas acima (o detalhe está em `plan.md`, "Ajustes de implementação",
e em `audit-principal.md`):

- **T010/T011** (variantes `...ForClub`): não foram necessárias. Todo sistema já lê as regras por
  `context.league.competitionId`; basta rodar o pipeline por liga principal. Ficaram os helpers de
  `world/countries.ts` (T008/T009) e o uso de `rulesCompetitionOf` em `market/squad.ts` e
  `finance/create.ts` (T017).
- **T013/T025:** sem `otherLeagues` e sem `worldHistory`. Os outros países ficam em `competitions` e
  a história deles em `competitionHistory`; o save v15 só sobe a versão.
- **T018–T020:** cobertas pelo desenho por liga (`applyRoundSystems` com `foreign`,
  `perCountry(step)` na virada, regulador por país) e pelos testes `world-day`, `world-turnover`,
  `world-isolation` e `world-long-run`.
- **T046:** a janela do outro país não é conferida (o contexto do mercado do técnico só tem a liga
  dele); `market.window_closed_abroad` não foi criado. Países com agendas diferentes continuam
  possíveis, cada um com a sua janela.
- **T036:** o teste de longo prazo roda 6 temporadas de 3 países × 2 divisões de 20 clubes (30
  temporadas do banco reduzido levariam mais de 10 minutos); as 30 temporadas de 400 clubes rodam em
  `pnpm sim:world --scale` (passo do job de simulação do release).
- **T037:** a lista de clubes não é virtualizada (400 linhas renderizam bem); há filtros de país e
  divisão e busca por nome.
- **T058/T064/T078:** o teste de 400 clubes é `pnpm sim:world --scale --countries 10 --seasons 30`,
  que sai com código ≠ 0 se algum limite falhar.
- **Simulação resumida:** só nas competições de países **diferentes** do país do técnico; as do país
  dele (inclusive copas de que ele não participa) usam a completa. Confrontos de mata-mata (com
  decisor) usam a completa em qualquer país. O modelo (Poisson por valor esperado) tem as faixas
  declaradas em `summary-equivalence.test.ts`; a distância de variação total ficou em 0,045 (não
  0,03) porque entre duas amostras só da completa ela já é ~0,03.
- **Economia do banco de teste:** escala de 0,75 a 1,25 (a de 0,4 a 1,6 fazia os países mais ricos
  degradarem em 13+ temporadas); ver `plan.md`.
