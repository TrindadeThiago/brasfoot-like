# Implementation Plan: Vários países e simulação em escala

**Branch**: `020-varios-paises-escala` | **Date**: 2026-10-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/020-varios-paises-escala/spec.md`

## Summary

O banco passa a ter **vários países**, cada um com a sua pirâmide de competições, e o mundo passa a
sustentar ~400 clubes. O desenho evita criar formatos paralelos:

- **Regras do país = regras da competição principal do país** (a primeira competição do
  `countryId`). Economia, mercado, diretoria, torcida e manchetes já são lidas por `competitionId`;
  passam a ser lidas pelo país do clube. O país ganha só `rules.foreignLimit` opcional. Como o
  salário já é `valor × wageFactorPct do clube` e o valor de mercado depende só do jogador e da
  reputação do clube, "valor universal e salário na escala de destino" sai sem câmbio.
- **Estado**: `league` continua sendo a liga principal do país do técnico; `otherLeagues` guarda as
  principais dos demais países; `competitions` guarda as secundárias de qualquer país. O dia de
  jogos e a virada percorrem as três listas; as consequências da rodada (finanças, mercado da IA,
  evolução, torcida, diretoria, notícias) rodam por liga principal, com as regras do país dela. A
  troca de país (`switchManagerCountry`) só troca papéis de listas, porque o calendário já é por
  data.
- **Simulação resumida** (`match/summary.ts`): jogos de competições em que o clube em foco não
  joga saem de um modelo de Poisson por força/setor, com autores, cartões e lesões no mesmo formato
  de `MatchResult`; a completa segue para as competições do jogador. A decisão é função pura do
  estado; a equivalência é um teste de distribuições com faixas declaradas.
- **Escala**: registro compacto dos jogos resumidos (`summary`, `starters`, `playerLines`),
  histórico resumido das ligas alheias (classificação final e 10 artilheiros) e metas declaradas e
  testadas de tamanho de save, tempo e memória, medidas no banco de teste de 10 países (400 clubes).
- **Mercado e diretoria**: transferências internacionais (taxa em valor de mercado, janela dos dois
  países aberta, limite de estrangeiros), IA de transferências de todos os países com teto de
  contratações internacionais por clube, e propostas de emprego de todos os clubes com troca de país
  a qualquer momento.
- **Dados e UI**: `generateWorldBank` (banco de teste e `mods/exemplo-mundo`), nome por país na
  geração de jovens (já existe), filtro de país e divisão na escolha de clube, consulta a ligas
  alheias, país no mercado e nas propostas. Save v15 (migração só acrescenta listas vazias).

Detalhes em [research.md](research.md); modelo em [data-model.md](data-model.md); contratos em
[contracts/](contracts/).

## Technical Context

**Language/Version**: TypeScript 6.0.x (`strict`), Node 22

**Primary Dependencies**: motor, save, i18n, default-mod, modkit do workspace; Next.js 16.4 (static
export), React 19.3; Zod; fflate (save). Nenhuma dependência nova.

**Storage**: save v15 no IndexedDB (`otherLeagues`, `worldHistory`; campos opcionais em
`MatchRecord` e `SeasonHistoryEntry`); formato de mod continua `formatVersion: 1` com
`country.rules` aditivo

**Testing**: Vitest (motor, validação, save, app); equivalência estatística das duas simulações;
30 temporadas de 400 clubes por país; testes de tamanho, tempo e memória; Playwright com o mod de
3 países

**Target Platform**: navegadores modernos, desktop ≥ 1280px

**Project Type**: biblioteca (motor) + pacote de save + mod padrão + aplicação web estática + ferramentas

**Performance Goals** (R12, a confirmar na linha de base T003): dia de jogos do mundo de 400 clubes
≤ 600 ms (mediana); virada ≤ 6 s; 30 temporadas ≤ 10 min; pico de heap ≤ 1 GB; o mundo de um país
não pode ficar mais lento

**Constraints**:

- Determinismo: forks por país e etapa (`${seed}:country:${id}:${etapa}`); países na ordem do
  banco, clubes por id; resumida e completa com PRNG do `fixture.seed`; ao vivo = direto; salvar e
  carregar no meio não muda nada; acrescentar um país não altera os outros.
- Banco de um país e saves antigos idênticos aos de hoje (FR-020/021): os caminhos novos só ativam
  com mais de um país; o registro compacto só vale para jogos resumidos.
- Nenhuma regra de jogo na UI; a escolha da simulação, as regras do país e a troca de país são do
  motor.
- i18n em todos os textos; nomes de países e competições vêm do banco.

**Scale/Scope**: 10 países × 2 divisões × 20 clubes = 400 clubes, ~11 000 jogadores, 30 temporadas;
mods de 1 a 10+ países; limite de 25 estrangeiros por clube no dado

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação pré-pesquisa e pós-design (ambas ✅):

- [x] **I. Motor separado:** regras do país, simulação resumida, mercado internacional, propostas e
  troca de país no motor; a UI filtra, mostra e dispara comandos. O teste de arquitetura existente
  cobre os módulos novos.
- [x] **II. Determinismo:** `summarizeMatch` só usa PRNG do `fixture.seed`; forks por país/etapa;
  teste de repetição do mundo de vários países, com salvar e carregar no meio; teste de isolamento
  (acrescentar um país não muda os outros).
- [x] **III. Dados, não código:** país, principal, regras econômicas, limite de estrangeiros,
  bancos de nomes, teto de contratações internacionais são dados validados por Zod com erros por
  arquivo/campo; adicionar um país não exige mudar o motor (SC-008).
- [x] **IV. Sem conteúdo protegido:** bancos de nomes por país gerados por sílabas fictícias; países
  do banco de teste com nomes fictícios; nenhum nome real no repositório (teste de blocklist existente).
- [x] **V. Balanceamento verificável:** `world-long-run.test.ts` (30 temporadas, 10 países, faixas de
  008/009 por país, teto de migração), equivalência das duas simulações com faixas declaradas, e
  `SCALE_LIMITS` com tamanho, tempo e memória. O teste de 400 clubes roda no job de simulação do
  release (gate de publicação); o CI de cada PR roda a versão reduzida.
- [x] **VI. Saves versionados:** v15 com migração e fixtures v14 (início, meio, fim); campos
  opcionais; o mundo de um país abre idêntico.
- [x] **VII. i18n:** o motor devolve dados (códigos de erro, `countryId`); textos em `ui.json`,
  `errors.json`, `market-errors.json`, `release-notes.json`; plurais em ICU.
- [x] **VIII. Offline e gratuito:** tudo local; a escala é obtida com a simulação resumida, não com
  servidor.
- [x] **IX. Testes primeiro no motor:** resumida, regras por país, dia e virada multi-país,
  mercado internacional, limite de estrangeiros, troca de país, migração e metas de escala
  começam pelo teste que falha.
- [x] **Stack (v1.1.0):** sem servidor; Biome; Vitest; motor sem APIs proibidas.

Nenhuma violação. Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/020-varios-paises-escala/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/
│   ├── world-api.md              # API do motor: países, resumida, dia/virada, mercado, diretoria
│   └── mod-format-and-ui.md      # save v15, formato de mod e telas
├── checklists/requirements.md
└── tasks.md                      # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/
├── world/                                  # novo
│   ├── countries.ts                        # mainCompetitionOf, rulesCompetitionOf, countryOf
│   ├── foreign.ts                          # foreignCount, canSignForeign
│   └── leagues.ts                          # worldLeagues, isCountryMain, switchManagerCountry
├── match/{summary,summary-tuning}.ts       # summarizeMatch, SUMMARY_TUNING
├── season/{summary-round,record,types}.ts  # summarizeRound, completeSummaryRound, playerLines, MatchRecord
├── career/{types,league,season-state,day,turnover,league-round,injuries}.ts
│                                           # otherLeagues, worldHistory, dia/virada por país
├── finance/{rules,create,round,ai,turnover}.ts   # ...ForClub, por liga principal
├── market/{rules,value,squad,search,negotiation,windows,turnover}.ts  market/ai/*  # internacional, estrangeiros
├── board/{rules,coaches,offers,round,turnover}.ts  # vagas de todas as ligas, troca de país
├── fans|news|fitness/rules.ts  renewal/{regulator,measure,turnover}.ts   # por país
├── model/{schemas,types}.ts  validation/{issues,semantic/countries,semantic/references,semantic/calendar}.ts
├── worldgen/{world-example.ts,name-banks/world/*.json}
└── index.ts
packages/engine/test/{world,match,career,market,board,renewal,validation,worldgen}/…

packages/save/src/{format,migrate,summary,career,create}.ts  packages/save/test/{scale.test.ts,scale-limits.ts,fixtures v14}
mods/exemplo-mundo/  tools/src/{gen-world-example-mod,simulate-world,simulate-matches}.ts   # --scale, --summary
apps/web/src/{app/nova-carreira,app/jogo/{competicao,mercado,carreira,historico}}  apps/web/src/ui/{world,market,board,history}
apps/web/test/flows/world.test.tsx  apps/web/e2e/world.spec.ts
packages/i18n/locales/pt-BR/{ui,errors,market-errors,release-notes}.json
docs/mod-format.md  docs/design.md (§3, §13)  package.json (versão)
```

**Structure Decision**: o motor ganha o módulo `world/` com o que é só de países (o resto fica nos
módulos de cada sistema, que passam a receber o país do clube). A simulação resumida fica ao lado
da completa em `match/`, e a rodada resumida ao lado da rodada completa em `season/`. O save só
orquestra e migra. Versão e notas de versão entram no mesmo PR da feature.

## Phase 0 e Phase 1

- **Pesquisa**: [research.md](research.md) (R1–R13) resolve o desenho; não restou
  `NEEDS CLARIFICATION`. Os números de R12 são provisórios até a linha de base (T003).
- **Design**: [data-model.md](data-model.md), [contracts/](contracts/) e [quickstart.md](quickstart.md).
  Nada do que foi projetado violou os gates; a reavaliação pós-design deu o mesmo resultado.
- **Contexto do agente**: o repositório não tem script de atualização do contexto do agente
  (`CLAUDE.md`/`AGENTS.md` inexistentes); nada a atualizar.

## Riscos e pontos de atenção

1. **Auditoria das leituras de "competição principal"**: os usos de `world.competitions[0]` e de
   `league.competitionId` como fonte de regras são a maior superfície de mudança. A tarefa T001
   lista cada uso e a classifica (regra do clube, do país do jogador ou do mundo), e um teste
   com banco de dois países de escalas bem diferentes confere que cada sistema usa o país certo.
2. **Migração líquida de talento**: país rico pode drenar os pobres. Mitigação: teto de
   contratações internacionais por clube, limite opcional de estrangeiros, medidas por país no
   teste de longo prazo (R13).
3. **Tamanho do save**: o registro de partidas da temporada em curso domina; o registro compacto e
   a limpeza das temporadas encerradas são a mitigação. A linha de base (T003) mede o tamanho de
   cada parte do save e confirma se os números de R12 fecham antes das demais tarefas.
4. **Desempenho do mercado da IA com 400 clubes**: índice por posição e faixa de força por janela
   (R8); se não bastar, a IA de países alheios decide em lote por janela.
5. **Leitores de `record.players`**: a mudança para `playerLines` toca estatísticas, disciplina,
   evolução e UI; um teste de arquitetura impede o acesso direto depois da migração.

## Complexity Tracking

Não se aplica (nenhuma violação da constituição).

## Ajustes de implementação

Registrados durante a implementação; prevalecem sobre o texto acima onde divergirem.

- **Sem `otherLeagues`/`worldHistory` no estado e no save.** Os demais países ficam em
  `competitions` (já era a lista de "competições além da liga em foco"), e a história das ligas
  principais deles vai para `competitionHistory`, que já guarda uma entrada por temporada e
  competição. `league` passa a ser a liga principal do país do clube em foco (`focusClubId` /
  `leagueCompetitionId` em `createCareerSeason`); `switchManagerCountry` troca os papéis. O save v15
  só sobe a versão (a migração não acrescenta campos); a integridade passou a conferir todas as
  ligas principais.
- **Sem variantes `...ForClub` das regras.** Todo sistema já lê as regras por
  `context.league.competitionId`; basta rodar o pipeline de cada sistema uma vez por liga
  principal (`audit-principal.md`). Só `market/squad.ts` e `finance/create.ts` passaram a usar
  `rulesCompetitionOf`; `market/value.ts` mantém a primeira competição do banco de propósito
  (valor universal).
- **Virada por país com `perCountry(step)`** (`career/turnover.ts`): prêmios, evolução,
  aposentadoria, regulador, jovens, ajuste de elencos, patrocínio, revisão financeira da IA e
  diretoria rodam para cada liga principal; as demais etapas são do mundo e rodam uma vez. O
  regulador é por país (`RenewalState.regulators`; o primeiro país do banco usa `regulator`).
- **Rodada de outro país** (`applyRoundSystems(..., { foreign: true })`): só a IA decide; o mercado
  do técnico, o resumo de janela e a última evolução dele não são tocados; a diretoria
  (`BoardContext.foreign`) avalia só os clubes da liga e só o técnico recebe propostas das vagas
  dela.
- **Validação:** `club.country_mismatch` e `country.no_main_competition` foram descartados — o
  banco de fases da 019 usa o país do clube como atributo de sorteio com clubes de vários países na
  mesma liga. Ficam `country.main_not_league`, `country.names_missing` (só em bancos com mais de um
  país), `country.foreign_limit_exceeded` e `unique.duplicate_club_in_country`.
- **Teto de contratações internacionais da IA:** `maxInternationalPerClub` padrão **1** por clube e
  janela (era 2 no texto).
- **Economia do banco de teste:** a escala por país multiplica salário, público, estádio,
  patrocínio, prêmios e crédito; sem escalar a capacidade do estádio e a demanda por reputação, os
  países de escala alta entravam em crise. Divisões de 20 clubes são necessárias (a economia da 008
  é calibrada em 38 rodadas).
- **Faixa de `máx` no teste de longo prazo:** a de 94 da 009 foi calibrada na seed do banco
  padrão; bancos gerados com outras seeds passam de 94 em poucas temporadas mesmo com um país só
  (a onda inicial de jovens amadurece), por isso o teste do mundo usa o teto do jogo (99) e as
  demais faixas da 009 e da 008.
