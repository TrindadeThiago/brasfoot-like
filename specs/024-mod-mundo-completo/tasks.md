---

> **Revisão (1.10.0)**: os mundos médio e completo foram descartados — a rodada da liga ficava pesada demais
> (travamentos) com dezenas de milhares de jogadores. O **mundo padrão** passou a ser o reduzido (24 países
> nas seis confederações, Brasil em quatro divisões com estaduais), gerado dentro do jogo e também
> disponível para baixar (`mundo-padrao.zip`); o antigo país fictício único saiu da lista de nova carreira.
> Onde este documento fala em três tamanhos, vale só o reduzido.

description: "Lista de tarefas da feature 024 — Mod mundo completo do futebol"
---

# Tasks: Mod mundo completo do futebol

**Input**: Design documents from `specs/024-mod-mundo-completo/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: o motor segue o Princípio IX (testes antes, devem falhar primeiro): perfil, dados, países,
confederações, determinismo e bloqueio. O equilíbrio tem simulação de 30 temporadas com faixas
declaradas (Princípio V). Não há mudança de formato de mod nem de save (Princípio VI não se aplica).
Fluxos de interface com happy-dom; e2e com Playwright. Os testes de CI usam o perfil `compacto`; o perfil
`padrao` roda na ferramenta de simulação e no job de simulação.

**Organization**: tarefas por user story, em ordem de prioridade. A base comum (perfil, geografia, nomes,
emenda do Princípio IV, generalização das continentais e dos estaduais, economia) fica na Fase 2:

- P1: US6 (mundo com as seis confederações), US2 (gerar o mod de forma determinística), US1 (carreira
  completa no mod)
- P2: US4 (30 temporadas balanceadas), US3 (trocar nomes por planilha)
- P3: US5 (download na página de Mods)

US6 depende só da Fase 2; US2 depende da US6; US1 depende da US6; US4 depende da US6 (e usa a US2 para o
pacote); US3 depende da US2; US5 depende da US2 e da US4 (limites).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 … US6 (spec.md)
- Caminhos relativos à raiz do repositório

## Referências rápidas

- **Ferramenta:** `specs/024-mod-mundo-completo/contracts/football-world-tool.md`
- **Perfil, dados e pacote:** `specs/024-mod-mundo-completo/contracts/profile-and-package.md`
- **Decisões R1–R15:** `research.md`; **dados:** `data-model.md`; **roteiro:** `quickstart.md`
- **Já existentes:**
  - mundo de vários países: `generateWorldBank`, `scaleEconomy` (`packages/engine/src/worldgen/world-example.ts`)
  - continentais: `continentalCompetitions`, `apportion`, `CONTINENTAL_IDS`
    (`packages/engine/src/worldgen/continental.ts`)
  - estaduais: `generateRegionalBank` (`packages/engine/src/worldgen/regional.ts`)
  - elencos e clubes: `generateSquad` (`worldgen/players.ts`), `generateRivalries` (`worldgen/rivalries.ts`),
    `generateCup` (`worldgen/cup.ts`), `nameBankSchema` (`worldgen/name-banks/schema.ts`)
  - pacote e CSV: `writeModPackage`, `readModPackage`, `MOD_LIMITS`, `applyCsv`
    (`packages/modkit/src/`)
  - escala: `SCALE_LIMITS` (`packages/save/src/scale-limits.ts`), `runSimulateScale`
    (`tools/src/simulate-scale.ts`)

## Phase 1: Setup

- [X] T001 Criar o esqueleto `packages/engine/src/worldgen/football-world/{profile,country,brazil,confederation,economy,generate,index}.ts` e a pasta de testes `packages/engine/test/worldgen/football-world/`; estender `packages/engine/test/architecture.test.ts` para cobrir o diretório novo (sem PRNG fora da seed, sem APIs de plataforma)
- [X] T002 Executar `/speckit-constitution` com a emenda do Princípio IV (nomes de lugares — países, estados e cidades — não são conteúdo protegido; clubes, jogadores, competições e entidades seguem fictícios), versão 1.2.0 (MINOR), Sync Impact Report e conferência de `.specify/templates/plan-template.md`; é a primeira tarefa da implementação e bloqueia T007, T008, T010 e T063
- [X] T003 [P] Medir a linha de base do mundo de 400 clubes (`pnpm sim:world --scale`) e registrar em `specs/024-mod-mundo-completo/baseline.md`, para provar que as metas da 020 não pioram

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**: perfil, dados reais, nomes, bloqueio, e a generalização do que o gerador compõe

- [X] T004 [P] Escrever testes do esquema e da validação do perfil (`profile.unknown_country`, `profile.duplicate_country`, `profile.few_countries`, `profile.tier_range`, `profile.strength_range`) em `packages/engine/test/worldgen/football-world/profile.test.ts`
- [X] T005 Implementar `WorldProfile`, `Confederation`, `CountrySpec` e `validateProfile` em `packages/engine/src/worldgen/football-world/profile.ts`
- [X] T006 [P] Escrever testes dos dados de geografia (id e código únicos, cidades mínimas por tier, nomes de até 20 caracteres, 27 estados com ≥ 18 cidades, sem duplicatas) em `packages/engine/test/worldgen/football-world/geo.test.ts`
- [X] T007 Criar `packages/engine/src/worldgen/football-world/geo/countries.json` com os países do perfil padrão e do compacto (nome em português, código, idioma, cidades reais) e o carregador tipado em `geo/index.ts`
- [X] T008 Criar `packages/engine/src/worldgen/football-world/geo/brazil-states.json` com os 27 estados (nome, sigla e ≥ 18 cidades reais cada)
- [X] T009 [P] Escrever testes dos bancos de nomes (≥ 200 nomes e 200 sobrenomes, prefixos e sufixos, passam no `nameBankSchema`, sem nomes da lista de bloqueio) em `packages/engine/test/worldgen/football-world/names.test.ts`
- [X] T010 [P] Criar os bancos de nomes por idioma em `packages/engine/src/worldgen/football-world/names/{pt,es,en,fr,de,it,nl,tr,ar,ru,ja,ko,zh}.json` e o carregador em `names/index.ts`
- [X] T011 [P] Escrever testes do bloqueio reestruturado (`clubsExact`, `clubsContains`, `competitions`; cidade que também é clube só vale como nome inteiro) em `packages/engine/test/worldgen/football-world/blocklist.test.ts`
- [X] T012 Reestruturar `packages/engine/test/fixtures/blocklist.json` (R13) e ajustar `packages/engine/test/worldgen/blocklist.test.ts` e os testes que a leem para a estrutura nova, sem enfraquecer a proteção de clubes e competições
- [X] T013 [P] Escrever testes da generalização das continentais (ids e nomes por confederação, layout calculado pelo total de clubes, regressão: o resultado atual de `generateWorldBank` com `continental` não muda) em `packages/engine/test/worldgen/continental-confederation.test.ts`
- [X] T014 Generalizar `continentalCompetitions` para receber id, prefixo, nomes, tamanho e países por confederação, mantendo `CONTINENTAL_IDS` e o comportamento atual, em `packages/engine/src/worldgen/continental.ts`
- [X] T015 [P] Escrever testes da generalização dos estaduais (estados e clubes nacionais vindos de parâmetros, região por estado, a saída atual de `generateRegionalBank` não muda) em `packages/engine/test/worldgen/regional-parts.test.ts`
- [X] T016 Extrair de `generateRegionalBank` a montagem dos estaduais a partir de uma lista de estados, de clubes nacionais e de um país, em `packages/engine/src/worldgen/regional.ts`, mantendo `generateRegionalBank` idêntico
- [X] T017 [P] Escrever testes da economia por país (escala `0,6 + 0,8 × força`, reputação deslocada pela força com teto 95, vagas por `apportion(total, força², tetos)` com mínimo 1) e um teste de regressão: `generateWorldBank({ seed: "paises-1", countries: 3, divisionsPerCountry: 2 })` devolve o mesmo banco antes e depois da extração de `scaleEconomy` (comparar com um snapshot gravado antes da T018), em `packages/engine/test/worldgen/football-world/economy.test.ts`
- [X] T018 Implementar `economy.ts` (força, escala econômica, vagas continentais), extraindo `scaleEconomy` de `world-example.ts` para uso comum, em `packages/engine/src/worldgen/football-world/economy.ts`

**Checkpoint**: perfil, dados, bloqueio e peças generalizadas prontos

---

## Phase 3: User Story 6 - Mundo com as seis confederações (Priority: P1) 🎯 MVP

**Goal**: o gerador monta o mundo com as seis confederações, países com pirâmides por nível e as continentais de cada uma.

**Independent Test**: gerar o perfil `compacto`, validar o banco e conferir confederações, pirâmides, vagas e independência das continentais.

### Tests for User Story 6

- [X] T019 [P] [US6] Escrever teste de um país por nível (T1 a T4: divisões, clubes, copa, elencos válidos, cidades reais do país, ids `clube-<codigo>-<n>`) em `packages/engine/test/worldgen/football-world/country.test.ts`
- [X] T020 [P] [US6] Escrever teste do Brasil (A, B e C de 20 em pontos corridos, D em 4 grupos de 5 com clubes da mesma região concentrados e mata-mata de 8, 27 estaduais de 12 e 8, copa, supercopa, vagas estadual → copa e D) em `packages/engine/test/worldgen/football-world/brazil.test.ts`
- [X] T021 [P] [US6] Escrever teste das confederações (cada uma com competição principal e, quando há clubes, a secundária; só clubes dos próprios países; vagas proporcionais à força; fechamento das vagas) em `packages/engine/test/worldgen/football-world/confederation.test.ts`
- [X] T022 [P] [US6] Escrever teste do mundo `compacto` (valida sem erros nem avisos, seis confederações, nenhuma competição de uma confederação com clube de outra, nomes de competições fictícios, calendário sem conflito) em `packages/engine/test/worldgen/football-world/world.test.ts`

### Implementation for User Story 6

- [X] T023 [US6] Implementar `country.ts`: clubes (prefixo + cidade ou cidade + sufixo, escudo gerado), elencos, rivalidades por região, economia em escala, pirâmide por nível, copa e supercopa, em `packages/engine/src/worldgen/football-world/country.ts`
- [X] T024 [US6] Implementar `brazil.ts`: divisões A a D, distribuição dos 80 clubes nacionais pelos estados com `stateWeights`, estaduais dos 27 estados (T016), copa e supercopa, com `concentrate region` (019) no sorteio da D, em `packages/engine/src/worldgen/football-world/brazil.ts`
- [X] T025 [US6] Implementar `confederation.ts`: competição principal e secundária por confederação com vagas por país (T014, T018), em `packages/engine/src/worldgen/football-world/confederation.ts`
- [X] T026 [P] [US6] Escrever o perfil `compacto` (≈ 14 países nas seis confederações, 4 estados) em `packages/engine/src/worldgen/football-world/profiles/compact.ts`
- [X] T027 [P] [US6] Escrever o perfil `padrao` (≈ 43 países: UEFA 12, CONMEBOL 10, CONCACAF 6, CAF 6, AFC 6, OFC 3, mais o Brasil detalhado) em `packages/engine/src/worldgen/football-world/profiles/default.ts`
- [X] T028 [US6] Implementar `generateFootballWorld(profile, seed)` em `packages/engine/src/worldgen/football-world/generate.ts` (ordem fixa de confederações, países e competições; forks da seed por país; validação do banco) e exportar de `packages/engine/src/index.ts`
- [X] T029 [US6] Calendário do mundo: `startWeek` dos estaduais, ligas, copas e continentais por confederação sem conflito de datas, em `packages/engine/src/worldgen/football-world/generate.ts` e `confederation.ts`

**Checkpoint**: o mundo `compacto` é gerado e validado

---

## Phase 4: User Story 2 - Gerar o mod de forma determinística (Priority: P1)

**Goal**: a ferramenta gera, valida e grava o pacote; mesma seed, mesmo pacote byte a byte; outra seed muda o mundo.

**Independent Test**: gerar duas vezes com a mesma seed e comparar byte a byte; gerar com outra seed e validar.

### Tests for User Story 2

- [X] T030 [P] [US2] Escrever teste de determinismo do pacote (`Buffer.equals` entre duas gerações, seed diferente muda, perfil diferente muda) em `packages/engine/test/worldgen/football-world/determinism.test.ts`
- [X] T031 [P] [US2] Escrever teste da ferramenta (código 0 e resumo no caso válido; código 2 para perfil inválido; código 1 para pacote que não passa; saída só em `--out`) em `tools/test/gen-football-world.test.ts`
- [X] T032 [P] [US2] Escrever teste do ajuste de estrutura (perfil com outro número de clubes por divisão ou outro país gera o pacote ajustado ou o erro de validação que diz o que não fecha) em `packages/engine/test/worldgen/football-world/profile-adjust.test.ts`

### Implementation for User Story 2

- [X] T033 [US2] Implementar a ferramenta `tools/src/gen-football-world.ts` conforme o contrato (`--profile`, `--seed`, `--out`, `--folder`, `--name`; validação lendo o pacote de volta; resumo com hash) e os scripts `gen:football-world` em `tools/package.json` e `package.json`
- [X] T034 [US2] Carregar perfil de arquivo JSON com a validação de T005 e mensagens de erro por campo em `tools/src/gen-football-world.ts`
- [X] T035 [US2] Garantir a ordem estável das chaves e dos arquivos do pacote (revisar `splitBankFiles` e o gerador) para o byte a byte em `packages/engine/src/worldgen/football-world/generate.ts`

**Checkpoint**: o pacote é gerado, validado e reproduzível

---

## Phase 5: User Story 1 - Carreira com estadual, nacional, copa e continental (Priority: P1)

**Goal**: uma carreira no mod passa, na mesma temporada, por estadual, divisão nacional, copa nacional e competição continental.

**Independent Test**: criar a carreira num clube brasileiro classificado ao continente e jogar a temporada inteira e a virada.

### Tests for User Story 1

- [X] T036 [P] [US1] Escrever teste da carreira de teste (clube brasileiro de A a C: estadual da região, liga, copa e, se classificado, continental na mesma temporada, sem clube com dois jogos no mesmo dia; clube só regional não é escolhível) em `packages/engine/test/worldgen/football-world/career.test.ts`
- [X] T037 [P] [US1] Escrever teste de carreira em outro continente (clube europeu e clube africano: liga, copa e continental da confederação deles) em `packages/save/test/football-world-career.test.ts`
- [X] T038 [P] [US1] Escrever teste da virada (acesso, rebaixamento e vagas nacionais e continentais valem na temporada seguinte, nos países de tamanhos diferentes) em `packages/save/test/football-world-turnover.test.ts`

### Implementation for User Story 1

- [X] T039 [US1] Corrigir o que a carreira de teste expuser (ex.: escolha de país com dezenas de países, vagas continentais por país, ids) nos módulos tocados, sem mudar o formato de mod nem de save
- [X] T040 [US1] Na tela de nova carreira com o mod `compacto`, agrupar os países por confederação (derivada das competições continentais do banco), mantendo a ordem do banco dentro de cada grupo, em `apps/web/src/app/nova-carreira/` e `apps/web/src/ui/`, com os rótulos em `packages/i18n/locales/pt-BR/ui.json`; critério: o jogador chega a qualquer país em até 3 cliques
- [X] T041 [P] [US1] Escrever o fluxo de interface da carreira no mod `compacto` em `apps/web/test/flows/football-world.test.tsx`

**Checkpoint**: a carreira completa funciona no mundo gerado

---

## Phase 6: User Story 4 - 30 temporadas balanceadas e dentro das metas (Priority: P2)

**Goal**: o mundo se mantém crível por 30 temporadas e respeita as metas próprias de escala.

**Independent Test**: simular 30 temporadas e conferir faixas de balanceamento e metas de tamanho e de tempo.

### Tests for User Story 4

- [X] T042a [US4] Declarar `SCALE_LIMITS.fullWorld` com valores provisórios (dia 2500 ms, virada 40 s, heap 3 GB, save no início da 31ª 80 MB, exportado 25 MB, crescimento 400 KB por temporada) em `packages/save/src/scale-limits.ts`, para os testes de escala já terem o que ler

- [X] T042 [P] [US4] Escrever o teste longo `packages/engine/test/worldgen/football-world/long-run.test.ts` (mundo reduzido, 6 temporadas no CI e 30 com `FOOTBALL_WORLD_SEASONS=30`): divisões estáveis, elencos válidos, acesso e rebaixamento toda temporada, economia dentro das faixas, todo país com clube continental em > 90% das temporadas, sem erro
- [X] T043 [P] [US4] Escrever o teste de escala do perfil `compacto` (virada, dia de jogos e tamanho do save dentro de `SCALE_LIMITS.fullWorld`) em `packages/save/test/football-world-scale.test.ts`

### Implementation for User Story 4

- [X] T044 [US4] Estender `tools/src/simulate-scale.ts` e `tools/src/simulate-world.ts` com `--football-world [--profile p]` (medidas por temporada, faixas por país e por confederação, tempo de geração)
- [X] T045 [US4] Medir **uma temporada** do mundo médio e do completo (`pnpm sim:world --football-world --profile medio|completo --seasons 1`; sem simular 30) e calibrar `SCALE_LIMITS.mediumWorld` e `fullWorld`, justificando cada número em `packages/save/src/scale-limits.ts`; as metas da 020 não mudam e o resultado de T003 continua verde
- [X] T046 [US4] Aplicar a mitigação mais barata se a medição pedir (R9), nesta ordem: (1) reduzir elencos regionais no perfil; (2) compactar só campos já opcionais do save de países que o técnico não acompanha, com teste de abrir um save existente e de virar a temporada (Princípio VI), em `packages/save/src/career.ts` e no módulo de histórico; (3) reduzir o perfil padrão; registrar no `plan.md` qual foi usada
- [X] T047 [US4] Rever `MOD_LIMITS` somente se o pacote do perfil `padrao` passar de 10 MB por arquivo ou 20 MB no total (R10), com justificativa em `packages/modkit/src/limits.ts` e em `docs/mod-format.md`; testes do modkit atualizados
- [X] T048 [US4] Ajustar as faixas de balanceamento (força por país, economia, vagas) em `packages/engine/src/worldgen/football-world/economy.ts` e nos perfis, com os números declarados nos testes

**Checkpoint**: 30 temporadas estáveis e dentro das metas

---

## Phase 7: User Story 3 - Trocar os nomes por planilha (Priority: P2)

**Goal**: o modder troca nomes por CSV, na ferramenta ou na tela de Mods, e o pacote continua válido.

**Independent Test**: exportar clubes e jogadores em CSV, trocar nomes, importar e criar uma carreira.

### Tests for User Story 3

- [X] T049 [P] [US3] Escrever teste dos CSV na ferramenta (`--clubs-csv`, `--players-csv`: nomes trocados no pacote, pacote válido, determinismo, código 3 com linha e coluna para CSV inválido) em `tools/test/gen-football-world-csv.test.ts`
- [X] T050 [P] [US3] Escrever teste do ciclo exportar → editar → importar → carreira no mod `compacto` em `packages/modkit/test/football-world-csv.test.ts`

### Implementation for User Story 3

- [X] T051 [US3] Implementar `--clubs-csv` e `--players-csv` em `tools/src/gen-football-world.ts` usando `applyCsv` do modkit
- [X] T052 [US3] Conferir limites de tamanho de nome e de linha do CSV com o mod grande e ajustar mensagens em `packages/modkit/src/csv.ts` e `packages/i18n/locales/pt-BR/errors.json`, se preciso

**Checkpoint**: nomes reais entram só por planilha local

---

## Phase 8: User Story 5 - Download na página de Mods (Priority: P3)

**Goal**: o jogador baixa o mod mundo completo na página de Mods.

**Independent Test**: abrir a página de Mods, baixar o pacote, carregá-lo e criar uma carreira.

### Tests for User Story 5

- [X] T053 [P] [US5] Escrever teste de fluxo da página de Mods (link de download com descrição e tamanho, texto em i18n) em `apps/web/test/flows/mods.test.tsx`
- [X] T054 [P] [US5] Escrever o e2e do download: baixar o pacote, carregar e criar uma carreira (perfil `compacto` no e2e) em `apps/web/e2e/football-world.spec.ts`

### Implementation for User Story 5

- [X] T055 [US5] Gerar o `.zip` no `prebuild` do web (`apps/web/package.json`) em `apps/web/public/mods/mundo-completo.zip`, ignorado pelo git, e documentar em `.gitignore`
- [X] T056 [US5] Acrescentar o link, a descrição e o tamanho do mod na página de Mods em `apps/web/src/app/mods/page.tsx` com os textos em `packages/i18n/locales/pt-BR/ui.json`
- [X] T057 [US5] Fazer o `check-release` conferir que o zip existe, valida e cabe nos limites em `tools/src/check-release.ts` e `tools/test/check-release.test.ts`

**Checkpoint**: o mod está disponível para download

---

## Phase 8b: User Story 7 - Escolher o tamanho do mundo ao iniciar a carreira (Priority: P1)

**Goal**: três tamanhos de mundo (reduzido, médio, completo) gerados no jogo, na nova carreira.

**Independent Test**: escolher cada tamanho, ver o aviso de peso e começar a carreira.

- [X] T064 [P] [US7] Escrever o teste do fluxo (três tamanhos ao lado do mundo padrão, aviso de peso, países por confederação, carreira criada, download dos três) em `apps/web/test/flows/football-world.test.tsx`
- [X] T065 [US7] Definir `MEDIUM_PROFILE`, `profileOfSize` e `WORLD_SIZES`; renomear os perfis para reduzido/médio/completo (apelidos `padrao` e `compacto` na ferramenta) em `packages/engine/src/worldgen/football-world/`
- [X] T066 [US7] Gerar o mundo na tela de nova carreira (seletor de mundo, seed do mundo, descrição e aviso de peso) em `apps/web/src/app/nova-carreira/page.tsx` e os textos em `packages/i18n/locales/pt-BR/ui.json`
- [X] T067 [US7] Gerar os três .zip no build, listar na página de Mods e conferir no `check-release` em `tools/src/gen-football-world-public.ts`, `apps/web/src/app/mods/page.tsx` e `tools/src/check-release.ts`
- [X] T068 [US7] Estaduais de regiões que não são a do técnico usam a simulação resumida (bilheteria e prêmios apenas) em `packages/engine/src/world/leagues.ts` e `packages/engine/src/career/day.ts`
- [X] T069 [US7] Calibrar `SCALE_LIMITS.mediumWorld` e `fullWorld` com a medição de uma temporada (T045) em `packages/save/src/scale-limits.ts`
- [X] T070 [P] [US7] Medir no navegador o tempo de gerar o mundo e de criar a carreira de cada tamanho (e2e) e registrar em `specs/024-mod-mundo-completo/baseline.md`

---

## Phase 9: Polish & Cross-Cutting

- [X] T058 [P] Escrever `docs/mundo-completo.md` (como gerar, ajustar o perfil e a estrutura, trocar os nomes localmente, perfis `padrao` e `compacto`, metas de escala) e linkar de `docs/mod-format.md`
- [X] T059 [P] Atualizar `docs/design.md` (§3, §11, §13 com a 024), `docs/glossario.md` (confederação, perfil do mundo) e `docs/speckit-prompts/README.md`
- [X] T060 [P] Acrescentar a nota de versão em `packages/i18n/locales/pt-BR/release-notes.json` e subir a versão do jogo no mesmo PR (sem PR de release separado)
- [X] T061 Rodar o Biome (`pnpm lint`), o typecheck e a suíte inteira (`pnpm test`) e corrigir o que sobrar
- [X] T062 Executar o roteiro de `specs/024-mod-mundo-completo/quickstart.md` de ponta a ponta, cronometrar a troca de nomes por CSV seguindo só `docs/mundo-completo.md` (meta: 15 minutos) e anotar os resultados
- [X] T063 [P] Conferir o teste de bloqueio e a lista de lugares com o perfil `padrao` em várias seeds (nenhum nome de clube, competição ou jogador real)

---

## Dependencies & Execution Order

- **Fase 1** → **Fase 2** → histórias. A Fase 2 bloqueia todas.
- **US6** (MVP) depende só da Fase 2. **US2** e **US1** dependem da US6. **US4** depende da US6 e usa o pacote da US2. **US3** depende da US2. **US5** depende da US2 e da US4 (limites).
- Dentro de cada história: testes primeiro (devem falhar), depois implementação.
- T002 antes de qualquer tarefa que grave nome real de lugar (T007, T008, T010).
- T014 depende de T013; T016 depende de T015; T018 depende de T017; T045 a T048 dependem de T042 e T044; T055 depende de T033.

## Parallel Opportunities

- Fase 1: T003 (a T002, a emenda da constituição, vai antes das tarefas de dados).
- Fase 2: os testes T004, T006, T009, T011, T013, T015, T017 e os dados T010; T012 depende de T011.
- US6: testes T019 a T022; perfis T026 e T027.
- US2: T030 a T032. US1: T036 a T038 e T041. US4: T042 e T043. US3: T049 e T050. US5: T053 e T054.
- Polish: T058 a T060 e T063.

## Implementation Strategy

- **MVP**: Fases 1 e 2 e a US6 (mundo `compacto` gerado e válido). Validar com o quickstart, passos 1 e 2.
- **Incremento 2**: US2 (ferramenta determinística) e US1 (carreira completa): o mod é jogável e reproduzível.
- **Incremento 3**: US4 (30 temporadas e metas próprias) e US3 (CSV).
- **Incremento 4**: US5 (download), perfil `padrao` completo e Polish.
