---

description: "Lista de tarefas da feature 022 — Competições continentais"
---

# Tasks: Competições continentais

**Input**: Design documents from `specs/022-competicoes-continentais/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: o motor segue o Princípio IX (testes antes, devem falhar primeiro): escopo, ligação,
selagem, prêmios, reputação, metas, histórico, validação e migração. O equilíbrio tem simulação
longa com limites declarados (Princípio V); o save v17 tem migração e fixtures (Princípio VI).
Fluxos de interface com happy-dom + fake-indexeddb; e2e com Playwright.

**Organization**: tarefas por user story, em ordem de prioridade. A base comum (formato de dados,
validação estrutural, escopo, banco de teste, save v17) fica na Fase 2:

- P1: US1 (classificar e disputar), US2 (peso na carreira)
- P2: US3 (ligação principal → secundária), US4 (grupos, chaveamento e campanha), US5 (só com dados)
- P3: US6 (equilíbrio em 30 temporadas)

US1 depende só da Fase 2; US2 depende da US1; US3 depende da US1; US4 depende da US1 (e usa a US3
para a origem por ligação); US5 depende da Fase 2 e das validações da US2/US3; US6 depende da US1,
US2 e US3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 … US6 (spec.md)
- Caminhos relativos à raiz do repositório

## Referências rápidas

- **API do motor:** `specs/022-competicoes-continentais/contracts/continental-api.md`
- **Mod, save e telas:** `specs/022-competicoes-continentais/contracts/mod-format-and-ui.md`
- **Decisões R1–R12:** `research.md`; **tipos:** `data-model.md`; **roteiro:** `quickstart.md`
- **Já existentes:**
  - fases e copas: `createStagedSeason` (`packages/engine/src/stages/create.ts`), `advanceStages`
    (`stages/advance.ts`), `startStage` (`stages/start.ts`), `stageParticipantCounts`/`stagesOf`
    (`stages/rules.ts`), sorteio de grupos (`stages/groups-draw.ts`), `cupPrizes`
    (`knockout/prizes.ts`), `cupEntry`/`cupSeasonOf` (`knockout/history.ts`)
  - vagas: `resolveQualification`/`resolutionOrder`/`poolOf`/`applyQualification`
    (`qualification/*.ts`), `Origin` (`qualification/types.ts`)
  - dia e virada: `completeCareerDay` (`career/day.ts`), `seasonTurnover`/`TURNOVER_STEP_IDS`
    (`career/turnover.ts`), `createCareerSeason` (`career/season-state.ts`), `LeagueSeason` (`career/types.ts`)
  - países e regras: `isCountryMain`/`mainCompetitionOf` (`world/countries.ts`), `mainCompetitions`
    (`validation/semantic/countries.ts`), `gateFor` (`finance/gate.ts`), `postPrizes`
    (`finance/round.ts`)
  - diretoria, torcida, notícias: `goalTiersFor` (`board/goals.ts`), `reputationDelta`
    (`board/reputation.ts`), `fansRules` (`fans/rules.ts`), `news/{rules,turnover}.ts`
  - dados: `competitionSchema`/`divisionSchema` (`model/schemas.ts`), `validateBank`
    (`validation/validate.ts`), `makeIssue`/códigos (`validation/issues.ts`), `generateWorldBank`
    (`worldgen/world-example.ts`), `tools/src/{gen-world-example-mod,simulate-world}.ts`
  - save: `SAVE_FORMAT_VERSION = 16` (`packages/save/src/format.ts`), `migrate.ts`
  - telas: `apps/web/src/app/jogo/{competicao,historico,carreira,noticias,financas}`,
    `apps/web/src/ui/{CompetitionTabs,CompetitionSelect,DataTable,DivisionTabs}.tsx`

---

## Phase 1: Setup (linha de base e auditoria)

**Purpose**: congelar o comportamento atual para provar a compatibilidade (FR-026) e mapear os
pontos que dependem de `countryId`. Nada aqui muda comportamento.

- [X] T001 Criar `packages/engine/test/career/continental-baseline.test.ts`: para o banco padrão, o banco de estágios (`generateStagesBank`), o banco de 3 países e o de 10 países (`generateWorldBank`), grava como snapshot a composição e as classificações finais de 3 temporadas simuladas; é a referência de "sem competição entre países nada muda" (T057)
- [X] T002 [P] Registrar em `specs/022-competicoes-continentais/audit.md` os pontos em aberto do plano: (a) todo uso de `competition.countryId`, `world.competitions[0]`, `mainCompetitionOf` e `isCountryMain` em `packages/*/src`, `apps/web/src` e `tools/src` que quebra com `countryId` ausente; (b) onde a reputação do clube muda hoje (renovação 009/virada) e em que etapa o bônus continental entra; (c) como `gateFor`/`rulesCompetitionOf` escolhem as regras e como obter as do país do mandante; (d) onde `advanceStages`, `cupPrizes` e `postPrizes` são chamados em `career/day.ts`; (e) se o jogo resumido (020) e o `autoLineup` aplicam a condição física (017) a clubes da IA; (f) como `resolutionOrder`/`feedableCompetitions` tratam fonte na própria competição e primeira edição; (g) onde a UI lê `Origin`

---

## Phase 2: Foundational (pré-requisitos de todas as histórias)

**Purpose**: formato de dados, validação estrutural, escopo, regras do país do mandante, banco de
teste e save v17.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Dados e validação estrutural (Princípio III)

- [X] T003 [P] Escrever `packages/engine/test/validation/continental-schema.test.ts`: `competition.countryId` ausente é aceito; `awards` aceito (`win`, `draw`, `stage[]`, `title`, `reputation[]`, `reputationCeiling`); `division.dropIns` aceito com cada tipo de fonte (`position`, `eliminated`) e `entry`; recusados por faixa (`from > to`, fase 0, ceiling fora de 50–100), campo desconhecido e id repetido; `fans.continental` e `board.continental` aceitos; banco sem nada disso segue válido
- [X] T004 Em `packages/engine/src/model/schemas.ts`: `countryId` opcional em `competitionSchema`, `awardsSchema`, `dropInSchema`/`dropInSourceSchema` em `divisionSchema`, `continental` em `fansSchema` e `boardSchema`; tipos `Awards`, `DropIn`, `DropInSource` em `model/types.ts`; também os campos opcionais `StageState.incoming` (`stages/types.ts`), `SeasonGoals.continental` (`board/types.ts`) e `continentalHistory` (`career/types.ts`), só tipos, sem lógica
- [X] T005 [P] Escrever `packages/engine/test/validation/continental-shape.test.ts`: competição sem país com mais de uma divisão ou formato `league` → `continental.shape`; clubes de um país só → `continental.single_country`; clube fora de qualquer liga principal → `continental.club_without_league`; `competition.club_outside_main` e `unique.duplicate_club_in_country` não se aplicam a ela; `mainCompetitions` a ignora; regras econômicas declaradas nela → aviso `continental.rules_ignored`
- [X] T006 Criar `packages/engine/src/validation/semantic/continental.ts` (forma, países, liga principal, aviso de regras) e ajustar `validation/semantic/{countries,calendar,competitions,uniqueness,references}.ts` e `validation/{validate,issues}.ts` para competição sem país; mensagens em `packages/i18n/locales/pt-BR/errors.json` (`continental.*`)

### Escopo e regras do país do mandante (Princípios I e II)

- [X] T007 [P] Escrever `packages/engine/test/continental/scope.test.ts`: `isInternational`, `internationalCompetitions` (ordem do banco), `participantCountries` (ordem do banco, sem repetição); competição com `countryId` não é internacional
- [X] T008 Criar `packages/engine/src/continental/{types,scope}.ts` com os tipos de `data-model.md` (`ClubCampaign`, `ContinentalEdition`, `CompetitionPrize`, `ContinentalWarning`) e exportar em `packages/engine/src/index.ts`
- [X] T009 [P] Escrever `packages/engine/test/continental/country-rules.test.ts`: `isCountryMain` é falso para competição sem país; `rulesCompetitionOf(world, clubId)` devolve a principal do país do clube; `gateFor` num jogo continental usa o preço e as regras do país do **mandante**; em campo neutro usa a capacidade da fase
- [X] T010 Ajustar `packages/engine/src/world/countries.ts`, `finance/{gate,round}.ts` e cada leitor listado em `audit.md` (T002 a, c) para tratar `countryId` ausente, sem mudar o resultado de bancos de um ou mais países sem competição internacional (T057)

### Banco de teste e save v17 (Princípios III e VI)

- [X] T011 [P] Escrever `packages/engine/test/worldgen/continental-bank.test.ts`: `generateWorldBank({ continental: true })` valida; principal com 40 clubes (16 preliminares → 8, 8 + 24 em 8 grupos de 4, 16 no mata-mata), cotas por país somando 40 e mais vagas para os países mais fortes, `berths` fechando as contagens, datas na quarta-feira, nenhum clube com dois jogos no mesmo dia, nomes fictícios (blocklist)
- [X] T012 Estender `packages/engine/src/worldgen/world-example.ts` com a opção `continental` (competição continental maior, sem país; a secundária e as ligações vêm na T049) e `tools/src/simulate-world.ts` com `--continental`
- [X] T013 [P] Escrever `packages/save/test/migrate-v17.test.ts` e criar fixtures `packages/save/test/fixtures/save-v16-*.ts` (início, meio e fim de temporada, com copa, fases e vagas): v16 abre como mundo sem competição internacional, salva, reabre e joga um dia
- [X] T014 Subir `SAVE_FORMAT_VERSION` para 17 em `packages/save/src/format.ts`; os campos opcionais já tipados na T004 (`incoming`, `continental`, `continentalHistory`) em `SaveFile`; migração v16 → v17 (só carimba a versão) em `migrate.ts`; ajustes em `career.ts`/`create.ts`/`summary.ts`
- [X] T015 [P] Registrar em `packages/engine/src/validation/issues.ts`, `packages/engine/src/season/errors.ts` e `packages/i18n/locales/pt-BR/errors.json` os códigos de `contracts/mod-format-and-ui.md` (`continental.*`) com os testes `errors-coverage`/`season-errors-coverage` verdes (nesta fase os quatro códigos de forma; `dropin_*` e `awards_*` entram com a regra e o caso de teste na T047 e na T058, porque o teste SC-003 exige um caso por código)

**Checkpoint**: formato, escopo, regras do mandante, banco de teste e save v17 prontos; bancos sem
competição internacional não mudaram (T057).

---

## Phase 3: User Story 1 — Classificar o meu clube e disputar a competição continental (Priority: P1) 🎯 MVP

**Goal**: o clube se classifica pelas vagas por país e disputa preliminar, grupos e mata-mata ao
lado da liga e da copa nacional, sem conflito de datas e com a IA nas mesmas regras.

**Independent Test**: banco de teste de vários países; temporada em que o clube do jogador
termina em posição que dá vaga; na seguinte ele está na competição e joga a temporada inteira até
a final (`quickstart.md` §4).

### Tests for User Story 1 ⚠️

- [X] T016 [P] [US1] `packages/engine/test/career/continental-season.test.ts`: a competição internacional é criada em `competitions`; calendário sem dois jogos do mesmo clube no dia; a temporada só encerra depois da final; há um campeão; duas execuções da mesma seed são iguais; salvar e carregar no meio da fase de grupos não muda o resultado
- [X] T017 [P] [US1] `packages/engine/test/stages/continental-groups.test.ts`: com `draw.rules = separate country` nenhum grupo tem dois clubes do mesmo país quando há arranjo; sem arranjo o sorteio afrouxa o mínimo e registra o aviso; mesmo sorteio para a mesma seed
- [X] T018 [P] [US1] `packages/engine/test/qualification/continental-berths.test.ts`: vagas por país por liga, copa nacional e campeão anterior; primeira edição sem campeão anterior repassa pelo `fallback`; clube com duas vagas entra uma vez e a segunda é repassada; clube rebaixado segue as regras da 021; a competição sempre começa com 40 clubes
- [X] T019 [P] [US1] `packages/engine/test/career/continental-ai.test.ts`: clubes da IA jogam quarta e domingo e escalam reservas quando a condição cai abaixo do limiar, como o `autoLineup` do jogador (audit T002 e); a competição do clube em foco usa a simulação completa e as demais a resumida; ao vivo e direto dão o mesmo resultado
- [X] T019a [US1] Se o audit T002 (e) mostrar que o jogo resumido (020) ou o `autoLineup` não aplicam a condição física (017) aos clubes da IA, corrigir em `packages/engine/src/match/summary.ts` e `packages/engine/src/lineup/auto.ts` para que a IA use as mesmas regras de rodízio e desgaste do jogador, até o teste da T019 passar; se o audit não achar lacuna, registrar "sem lacuna" em `audit.md` e fechar a tarefa
- [X] T020 [P] [US1] `apps/web/test/flows/continental.test.tsx` (parte 1): carreira de teste com o clube classificado joga liga, copa nacional e continental até o fim da temporada; a competição aparece nas abas e o calendário mostra os jogos de meio de semana

### Implementation for User Story 1

- [X] T021 [US1] Em `packages/engine/src/career/{season-state,turnover,types}.ts`: criar e virar a competição internacional em `competitions` (composição vinda de `qualification`, calendário por data, histórico em `competitionHistory`) sem tratá-la como principal de país
- [X] T022 [US1] Em `packages/engine/src/career/day.ts`: fechar as rodadas da competição internacional (completa se o clube em foco participa, resumida senão), sincronizar lesões pelo país de cada clube, aplicar cartões, condição e bilheteria do mandante, sem rodar `applyRoundSystems` de liga principal para ela
- [X] T023 [US1] Em `packages/engine/src/qualification/{resolve,order,pools}.ts`: aceitar fonte `champion` na própria competição, primeira edição sem temporada encerrada (vaga repassada) e várias fontes de países diferentes na mesma divisão
- [X] T024 [US1] Garantir que o encerramento da temporada (`career/day.ts`, `career/season-state.ts`) espera todas as competições, inclusive a final continental, e que `startNextSeason` resolve vagas, prêmios e histórico só então
- [X] T025 [US1] Em `apps/web/src/ui/{CompetitionTabs,CompetitionSelect}.tsx` e `apps/web/src/app/jogo/competicao/*`: listar a competição entre países como aba "Continental" ao lado das nacionais (sem filtro por país que a esconda), nomes vindos do banco; textos em `packages/i18n/locales/pt-BR/ui.json`

**Checkpoint**: US1 jogável de ponta a ponta com o banco de teste do T012.

---

## Phase 4: User Story 2 — A campanha continental tem peso na carreira (Priority: P1)

**Goal**: prêmios, bilheteria, reputação, metas da diretoria, torcida, manchetes e histórico
reagem à campanha.

**Independent Test**: duas campanhas do mesmo clube (eliminado nos grupos × campeão) e comparação
de caixa, reputação, avaliação da diretoria, humor da torcida, manchetes e histórico.

### Tests for User Story 2 ⚠️

- [X] T026 [P] [US2] `packages/engine/test/continental/awards.test.ts`: vitória, empate, fase alcançada (uma vez por clube) e título; sem pagamento duplo com `cupPrizes`; extrato com a competição de origem; competição sem `awards` não paga nada
- [X] T027 [P] [US2] `packages/engine/test/continental/reputation.test.ts`: bônus por fase mais alta alcançada, teto `reputationCeiling`, `clampReputation`, nada sem `awards.reputation`; a etapa `continental-reputation` fica antes da renovação e substitui o mundo vivo; determinismo
- [X] T028 [P] [US2] `packages/engine/test/board/continental-goals.test.ts`: `continentalGoal` por tercil de reputação entre os participantes; `evaluateContinental`; o fator `continentalMet`/`continentalMissed` entra na confiança; o título continental entra nos `achievements` do técnico
- [X] T029 [P] [US2] `packages/engine/test/fans/continental.test.ts`: peso do jogo continental no humor e `expectationBoost`; padrão neutro mantém o resultado de bancos sem a competição idêntico
- [X] T030 [P] [US2] `packages/engine/test/news/continental.test.ts`: manchetes `continental.qualified|advanced|eliminated|champion|thrashing` com id e variáveis (sem texto no motor); nenhuma manchete fora de campanha do clube em foco ou de fato relevante
- [X] T031 [P] [US2] `packages/engine/test/continental/history.test.ts`: `continentalEdition` só existe com a competição encerrada; guarda campeão, vice, final, melhor fase por clube e tabelas dos grupos; `continentalHistory` acumula uma edição por temporada; a carreira do técnico registra a melhor fase e os títulos
- [X] T032 [P] [US2] `apps/web/test/flows/continental.test.tsx` (parte 2): extrato mostra prêmios por fase e bilheteria dos jogos em casa; a diretoria mostra a meta continental; a torcida e as notícias reagem; o histórico lista os campeões continentais e a campanha do técnico

### Implementation for User Story 2

- [X] T033 [US2] Criar `packages/engine/src/continental/awards.ts` (`competitionAwards`) e postar os prêmios do dia em `career/day.ts` com `postPrizes`; detectar as fases iniciadas no dia; constantes em `continental/rules.ts` (`CONTINENTAL_TUNING`)
- [X] T034 [US2] Criar `packages/engine/src/continental/reputation.ts` e registrar a etapa `continental-reputation` em `career/turnover.ts` (`TURNOVER_STEP_IDS`) na ordem definida no audit T002 b
- [X] T035 [US2] Em `packages/engine/src/board/{goals,evaluation,types,history,coaches}.ts`: `continentalGoal`, `evaluateContinental`, fatores de confiança, `achievements` e campanha na carreira do técnico
- [X] T036 [US2] Em `packages/engine/src/fans/{rules,mood}.ts`: `fans.continental` com padrão neutro, peso do jogo e expectativa do ano
- [X] T037 [US2] Em `packages/engine/src/news/{rules,turnover}.ts` e `packages/i18n/locales/pt-BR/ui.json`: modelos de manchete continentais e eventos nas viradas de fase
- [X] T038 [US2] Criar `packages/engine/src/continental/history.ts` (`continentalEdition`) e ligar `continentalHistory` à virada (`career/turnover.ts`, `career/history.ts`) e ao save (`packages/save/src/career.ts`)
- [X] T039 [US2] Telas em `apps/web/src/app/jogo/{financas,carreira,noticias,historico}` e `apps/web/src/ui/`: origem dos prêmios no extrato, meta continental na diretoria, torcida, manchetes, aba "Campeões continentais" e campanha do técnico; textos em `ui.json`

**Checkpoint**: US2 verificável; sem `awards`, `fans.continental` e `board.continental` os
resultados são idênticos aos de antes (T057).

---

## Phase 5: User Story 3 — Duas competições ligadas (Priority: P2)

**Goal**: eliminados de uma fase da principal entram na secundária durante a temporada, só com dados.

**Independent Test**: temporada com a regra "terceiros dos grupos entram no playoff da
secundária"; esses clubes aparecem lá na fase prevista, sem jogos no passado.

### Tests for User Story 3 ⚠️

- [X] T040 [P] [US3] `packages/engine/test/continental/dropins.test.ts`: `sealDropIns` com fonte `position` e `eliminated`; ordem por posição e id; idempotente; clube já na divisão de destino cede lugar ao próximo; `dropin_exhausted` e `dropin_late` como avisos; sem `dropIns` devolve as mesmas referências
- [X] T041 [P] [US3] `packages/engine/test/stages/incoming.test.ts`: a fase de destino só começa com a anterior terminada **e** todos os `dropIns` selados; participantes = classificados + `enter` + `incoming`; sem `dropIns` o comportamento é o de antes
- [X] T042 [P] [US3] `packages/engine/test/validation/continental-dropins.test.ts`: `dropin_self`, `dropin_unknown`, `dropin_count`, `dropin_before_source` e `dropin_qualified` com arquivo e campo
- [X] T043 [P] [US3] `packages/engine/test/career/continental-dropin-day.test.ts`: o clube do jogador eliminado entra na secundária, o calendário passa a incluir os jogos novos, nada é criado no passado; salvar e carregar entre a selagem e o início da fase não muda o resultado

### Implementation for User Story 3

- [X] T044 [US3] Em `packages/engine/src/stages/{types,rules,advance,start}.ts`: estado derivado "à espera de ligação" e participantes da fase de destino
- [X] T045 [US3] Criar `packages/engine/src/continental/dropins.ts` (`sealDropIns`) conforme `contracts/continental-api.md`
- [X] T046 [US3] Em `packages/engine/src/career/day.ts`: chamar `sealDropIns` depois de fechar as rodadas e de `advanceStages`, atualizando as temporadas de destino
- [X] T047 [US3] Em `packages/engine/src/validation/semantic/{continental,calendar}.ts`: regras de ligação (contagem, ordem de datas, qualificado) e mensagens em `errors.json`
- [X] T048 [US3] Em `packages/engine/src/qualification/types.ts`: `Origin` ganha `{ kind: "dropIn"; … }`; `ContinentalView` e a tela de origem leem o novo valor
- [X] T049 [US3] Em `packages/engine/src/worldgen/world-example.ts`: competição continental menor (24 clubes) com `dropIns` dos terceiros da fase de grupos da principal; `tools/src/simulate-world.ts` a inclui

**Checkpoint**: US3 verificável com o banco de teste ampliado (T049).

---

## Phase 6: User Story 4 — Acompanhar grupos, chaveamento e campanha (Priority: P2)

**Goal**: telas de grupos, chaveamento e campanha do clube ao lado das competições nacionais.

**Independent Test**: no meio da temporada, abrir a competição e navegar por grupos, chaveamento e
campanha; os dados batem com os resultados jogados (`quickstart.md` §4).

### Tests for User Story 4 ⚠️

- [X] T050 [P] [US4] `packages/engine/test/continental/campaign.test.ts`: `clubCampaign` com jogos, fase, próxima partida, prêmios e fases restantes; estados `playing|eliminated|champion|moved`; clube que não participa devolve `undefined`
- [X] T051 [P] [US4] `packages/engine/test/continental/view.test.ts`: `continentalView` por fase (grupos com zonas, chaveamento, rodadas e datas) e origem de cada participante; fase ainda não iniciada aparece como pendente
- [X] T052 [P] [US4] `apps/web/test/flows/continental.test.tsx` (parte 3): grupos com legenda de zonas, chaveamento com ida e volta, campanha do clube em até 3 toques; quem não participa vê a competição sem campanha

### Implementation for User Story 4

- [X] T053 [US4] Criar `packages/engine/src/continental/campaign.ts` e `view.ts` (reaproveitando `cupView` e as visões da 019) e exportar em `index.ts`
- [X] T054 [US4] Em `apps/web/src/app/jogo/competicao/*` e `apps/web/src/ui/`: painel de campanha, grupos com zonas, chaveamento e origem de cada participante; filtro por competição no calendário (017); textos em `ui.json`

---

## Phase 7: User Story 5 — Definir vagas e fases só com dados (Priority: P2)

**Goal**: um modder descreve vagas, fases, prêmios e ligação sem tocar no código.

**Independent Test**: dois mods de teste (4 e 6 países, formatos diferentes) disputam uma
temporada sem mudança no motor; formatos inválidos são recusados com arquivo e campo.

### Tests for User Story 5 ⚠️

- [X] T055 [P] [US5] `packages/engine/test/worldgen/continental-mods.test.ts`: dois bancos com continentes diferentes (4 e 6 países; preliminar+grupos+final × só grupos+final; com e sem secundária) rodam uma temporada e respeitam vagas e fases declaradas
- [X] T056 [P] [US5] `packages/engine/test/validation/continental-matrix.test.ts`: cada código `continental.*` e as mensagens (`awards_unknown_stage`, `awards_not_increasing`, `dropin_*`) indicam arquivo e campo; banco válido sem nada novo segue válido
- [X] T057 [P] [US5] `packages/engine/test/career/continental-compat.test.ts`: banco padrão, mods de um país e saves v16 produzem exatamente o resultado do baseline (T001)

### Implementation for User Story 5

- [X] T058 [US5] Completar `packages/engine/src/validation/semantic/continental.ts` com `awards_*` e os avisos restantes; conferir contagens de vagas por fase com `qualification/` e `stages/rules.ts`
- [X] T059 [US5] Gerar o mod `mods/exemplo-continental` (4 países, a taça maior e a menor, por `pnpm gen:continental-mod`; o `exemplo-mundo` de 3 países não comporta a taça compacta) com as competições continentais maior e menor fictícias (`tools/src/gen-world-example-mod.ts`, script `pnpm gen:world-mod`) e validar com `pnpm validate-bank mods/exemplo-mundo`
- [X] T060 [P] [US5] Documentar em `docs/mod-format.md` e `apps/web/public/docs/mod-format.md` a seção "Competições entre países" (`countryId` ausente, `awards`, `dropIns`, exemplo completo); atualizar `docs/glossario.md` (termos "competição entre países" no formato de mod, "continental maior/menor" no jogo e a diferença para "competição principal do país") e `docs/design.md` (§13/§14)

---

## Phase 8: User Story 6 — Mundo continental saudável em 30 temporadas (Priority: P3)

**Goal**: a competição premia os clubes fortes sem desequilibrar a economia nem monopolizar títulos.

**Independent Test**: 30 temporadas sem interação no banco de 10 países; faixas declaradas de
força dos campeões, títulos, caixa, prêmios e reputação (`quickstart.md` §3).

### Tests for User Story 6 ⚠️

- [X] T061 [P] [US6] `packages/engine/test/career/continental-long-run.test.ts` (versão reduzida no CI do PR e completa no job de simulação): força média dos campeões acima da dos participantes em ≥ 90% das seeds de teste (conjunto de seeds declarado no teste); correlação entre cotas e títulos; ≥ 5 campeões distintos e nenhum clube com mais de 40% dos títulos; caixa dos assíduos dentro das faixas da 008; prêmios totais por temporada dentro de `[awardsMin, awardsMax]`; reputação sob o teto e deslocamento médio ≤ `reputationDriftMax`; limites declarados no próprio teste
- [X] T062 [P] [US6] `packages/save/test/continental-scale.test.ts`: tamanho do save e tempo/memória da virada com as duas competições dentro de `SCALE_LIMITS` (020)
- [X] T063 [P] [US6] `packages/engine/test/career/continental-symmetry.test.ts`: clubes da IA e do jogador seguem as mesmas regras de rodízio, desgaste e prêmios (mesma entrada, mesma saída)

### Implementation for User Story 6

- [X] T064 [US6] Medir a linha de base com `pnpm sim:world --seasons 30 --continental` e registrar os números em `specs/022-competicoes-continentais/audit.md`
- [X] T065 [US6] Calibrar `CONTINENTAL_TUNING`, os `awards` do gerador e as cotas por país em `worldgen/world-example.ts` até os limites do T061 valerem; qualquer faixa da 008 revista é justificada no próprio teste, na mesma alteração

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T066 [P] `apps/web/e2e/continental.spec.ts` (Playwright, mod de exemplo): temporada completa com liga, copa nacional e continental; abas, grupos, chaveamento, campanha, extrato, diretoria, manchetes e histórico
- [X] T067 [P] Teste de arquitetura: `packages/engine/test/architecture.test.ts` cobre `continental/` (sem DOM, `Math.random`, `Date.now`); Biome sem avisos
- [X] T068 [P] Revisar `packages/i18n/locales/pt-BR/{ui,errors,release-notes}.json`: nenhuma string visível fora do i18n, plurais em ICU
- [X] T069 Versão e notas de lançamento no mesmo PR da feature (`package.json`, `packages/i18n/locales/pt-BR/release-notes.json`)
- [X] T070 Executar `specs/022-competicoes-continentais/quickstart.md` do início ao fim e `pnpm typecheck && pnpm lint && pnpm test` e a simulação longa (T071); remover código morto e conferir o baseline (T001, T057)

- [X] T071 Definir como a simulação longa é separada do CI: confirmar no repositório como as simulações longas anteriores (020/021) são marcadas (flag, variável ou arquivo à parte) e usar o mesmo mecanismo em `packages/engine/test/worldgen/continental-long-run.test.ts`; documentar o comando no `quickstart.md`

---

## Dependencies & Execution Order

- **Fase 1** → **Fase 2** → histórias.
- **US1** (MVP) depende só da Fase 2. **US2** e **US3** dependem da US1 e podem andar em paralelo
  (arquivos diferentes, exceto `career/day.ts`, que as duas tocam: T033 antes de T046).
- **US4** depende da US1 (campanha e visão); a origem por ligação usa a US3.
- **US5** depende da Fase 2 e das validações da US2/US3 (T047, T058).
- **US6** depende da US1, US2 e US3.
- Fase 9 depois das histórias desejadas.

### Paralelismo

- Fase 2: T003, T005, T007, T009, T011, T013 e T015 em paralelo (testes), depois as
  implementações T004 → T006, T008 → T010, T012, T014.
- T019a depende de T002 e vem antes de T022.
- US1: T016–T020 em paralelo; T021 → T022 → T024 em sequência (mesmo domínio), T023 e T025 em
  paralelo com elas.
- US2: T026–T032 em paralelo; T033–T038 em paralelo (módulos diferentes), T039 por último.
- US3: T040–T043 em paralelo; T044 e T045 em paralelo, T046 depois deles.

## Implementation Strategy

1. **MVP**: Fase 1 + Fase 2 + US1. Já dá uma competição continental jogável (banco de teste),
   com vagas por país, grupos separados por país e a IA nas mesmas regras.
2. **Incremento 1**: US2 (peso na carreira) — torna a competição um objetivo de carreira.
3. **Incremento 2**: US3 (ligação) e US4 (telas de campanha), em paralelo.
4. **Incremento 3**: US5 (modding e documentação) e US6 (equilíbrio e calibração).
5. **Fechamento**: Fase 9, com versão e notas no mesmo PR.

Cada fase termina com os gates de merge da constituição (tipagem, testes, simulação longa
relevante e nenhuma string fora do i18n).
