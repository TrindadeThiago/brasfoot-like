# Implementation Plan: Fase de grupos e competições em fases

**Branch**: `019-fase-grupos-competicoes-fases` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/019-fase-grupos-competicoes-fases/spec.md`

## Summary

Uma divisão (ou uma competição inteira) passa a poder ser descrita como uma **sequência de fases**
em dados: pontos corridos, grupos e mata-mata. O formato `groups` sai da lista de reservados do
formato de mod. A fase de grupos tem tamanho de grupo, turnos, pontuação e desempate da liga,
classificados por grupo, vagas extras na posição seguinte e um sorteio com potes e regras por
atributo do clube: **separação** (obrigatória, com potes isentos) e **concentração** (preferência).
O clube ganha o atributo opcional `region`.

No motor, a `Season` de uma divisão em fases ganha `stages`: uma entrada por fase, com os clubes
que a disputam, as rodadas (absolutas, no mesmo calendário da divisão) e o que for próprio do tipo
(os grupos sorteados; o chaveamento de uma fase eliminatória). As rodadas de todas as fases já
existem desde a criação da temporada, com `fixtures` vazias até a fase começar, exatamente como a
copa da 018. Ao fechar cada rodada, `advanceStages` (idempotente) monta a fase seguinte quando a
anterior termina. O módulo `knockout/` da 018 é reaproveitado por uma "visão" da fase eliminatória,
sem mudar o comportamento das copas. `standings()` passa a devolver, para uma divisão em fases, a
**posição final** de FR-024 (fase mais alcançada, depois classificação geral); como torcida,
diretoria, composição da virada e histórico já leem `standings()`, acesso, rebaixamento, campeão e
metas funcionam sem regras novas. O sorteio de grupos nunca trava uma carreira: sem solução, afrouxa
a separação com o mínimo de violações e registra um aviso (modo `career`); na validação do mod e nos
testes (modo `strict`) a separação impossível é recusada.

O mundo padrão não muda (nenhuma competição nova; resultados idênticos). A prova é um banco de
teste de quarta divisão regional (grupos → mata-mata) que joga 30 temporadas. Telas novas: tabelas
por grupo com zona de classificação, classificação geral, navegação por fase, chaveamento com a
origem de cada vaga e aviso de sorteio. Save v14 (migração sem mudança de dados). Detalhes em
[research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.x (`strict`), Node 22

**Primary Dependencies**: motor, save, i18n, default-mod, modkit do workspace; Next.js 16.4 (static
export), React 19.3; Zod. Nenhuma dependência nova.

**Storage**: save v14 no IndexedDB (a `Season` ganha `stages`, a `Fixture` ganha `stage` e a
`Round` ganha `byes`, todos opcionais; migração v13 → v14 só sobe a versão); formato de mod ganha
`format.type: "groups" | "stages"`, `division.stages` e `club.region`

**Testing**: Vitest (motor, validação, save, app); simulação de 30 temporadas do banco de quarta
divisão regional; centenas de sorteios com e sem solução; teste de equivalência do mundo padrão;
Playwright com a quarta divisão em fases

**Target Platform**: navegadores modernos, desktop ≥ 1280px

**Project Type**: biblioteca (motor) + pacote de save + mod padrão + aplicação web estática + ferramentas

**Performance Goals**: sorteio de uma fase de grupos < 50 ms (busca com teto de nós, R6); o dia de
jogos com a divisão em fases continua < 300 ms; 30 temporadas do banco de teste < 120 s; o mundo
padrão não pode ficar mais lento (nenhum caminho novo nele)

**Constraints**:

- Determinismo: sorteio por PRNG com fork próprio (`${seed}:stage:${n}:draw`), clubes em ordem de
  id antes de qualquer sorteio, desempate entre grupos pelo último critério (sorteio pela seed);
  ao vivo = direto; salvar e carregar no meio da fase não muda nada.
- O mundo padrão e qualquer banco sem `stages`/`groups` ficam idênticos aos de hoje (FR-034): os
  caminhos novos só ativam com `Season.stages`.
- O sorteio na carreira nunca falha nem trava; só a validação e o modo `strict` recusam.
- i18n em todos os textos; nomes de fases e grupos vêm do banco ou de chaves.
- Mods antigos (sem fases) continuam válidos; o mod de exemplo não muda.

**Scale/Scope**: banco de teste com 2 divisões (a de baixo com 16 a 32 clubes em grupos de 4 e um
mata-mata de 8 a 16 clubes); fases com até 8 grupos de 3 a 8 clubes; até 8 fases por sequência

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação pré-pesquisa e pós-design (ambas ✅):

- [x] **I. Motor separado:** sorteio, classificações, chaveamento, avanço de fases e posição final
  no motor; o save só orquestra; a UI apenas exibe. Nenhuma regra de fase na UI.
- [x] **II. Determinismo:** forks `${seed}:stage:${n}:draw` (grupos) e `${seed}:stage:${n}:pair`
  (chaveamento); clubes em ordem de id; busca do sorteio com ordem fixa de candidatos e teto de
  nós por contagem (não por tempo); desempate final pelo sorteio da seed; teste de repetição com
  salvar e carregar no meio da fase.
- [x] **III. Dados, não código:** fases, grupos, potes, regras de separação e concentração,
  classificados, vagas extras e tabela de chaveamento são dados com schema Zod e erros por
  arquivo/campo (`stages.*`); nenhuma competição tratada por nome.
- [x] **IV. Sem conteúdo protegido:** o banco de teste usa nomes fictícios; o mundo padrão não ganha
  competição alguma.
- [x] **V. Balanceamento verificável:** `stages/long-run.test.ts` (30 temporadas, faixas declaradas:
  classificados exatos, posições únicas, nenhum clube duplicado, promovidos vindos do mata-mata),
  300+ sorteios com limites, e o teste de equivalência do mundo padrão.
- [x] **VI. Saves versionados:** v14 com migração e fixtures (v13 no início, meio e fim); os
  campos novos são opcionais, então saves antigos abrem idênticos.
- [x] **VII. i18n:** o motor devolve dados (grupo, posição, aviso `{ rule, clubIds }`); textos em
  `ui.json` e `errors.json`; planos e plurais em ICU.
- [x] **VIII. Offline e gratuito:** tudo local.
- [x] **IX. Testes primeiro no motor:** sorteio (viável, inviável, potes, isenção, concentração),
  classificação geral, qualificados, chaveamento, posição final, avanço de fases, validação e
  migração começam pelo teste que falha.
- [x] **Stack (v1.1.0):** sem servidor; Biome; Vitest; motor sem APIs proibidas (teste de
  arquitetura existente).

Nenhuma violação. Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/019-fase-grupos-competicoes-fases/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/
│   ├── stages-api.md           # API do motor: fases, sorteio, classificação, posição final, erros
│   └── mod-format-and-ui.md    # formato de mod, save v14, telas e textos
├── checklists/requirements.md
└── tasks.md                    # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/
├── stages/                                 # novo
│   ├── types.ts                            # StageState, GroupsState, DrawWarning, FinalOrder
│   ├── rules.ts                            # stagesOf(competição, divisão), contagens e rodadas por fase
│   ├── create.ts                           # createStagedSeason: rodadas e a 1ª fase
│   ├── start.ts                            # startStage: participantes e fixtures de uma fase
│   ├── advance.ts                          # advanceStages (idempotente, a cada rodada fechada)
│   ├── groups-draw.ts                      # potes, separação, concentração, aviso, modos career/strict
│   ├── classification.ts                   # tabela de grupo, classificação geral, classificados
│   ├── pairing.ts                          # chaveamento por posição e tabela própria
│   ├── ranking.ts                          # posição final (FR-024) e standings da divisão em fases
│   └── cup-view.ts                         # visão da fase eliminatória sobre o módulo knockout/
├── model/{schemas,types,catalogs}.ts       # groups/stages, division.stages, club.region, home "overall"
├── validation/{issues,structural}.ts  validation/semantic/{stages,competitions,calendar}.ts  # stages.*
├── season/{types,season,calendar,standings,live-round}.ts  season/rank.ts
│                                           # Season.stages, Fixture.stage, Round.byes, offset do calendário; rankRows
├── worldgen/stages-example.ts              # generateStagesBank: banco/mod de exemplo das fases
├── calendar/rounds.ts                      # theoreticalRounds (compartilhado, sem ciclo de importação)
├── knockout/{bracket,tie,draw,prizes,events,rules}.ts  # aceita a visão; pareamento por posição
├── calendar/season-calendar.ts             # rodadas e respiros de uma divisão em fases
├── career/{league,day,season-state}.ts  news/clinched.ts   # criação em fases; sem "título garantido"
└── index.ts                                # exporta a API pública
packages/engine/test/stages/*.test.ts       # sorteio, classificação, pareamento, ranking, avanço, long-run
packages/engine/test/fixtures/stages-bank.ts  # quarta divisão regional + variante continental

packages/save/src/{format,migrate}.ts  (+ teste e fixtures v13)  packages/save/test/equivalence.test.ts
mods/exemplo-fases/  tools/src/gen-stages-example-mod.ts  (pnpm gen:stages-mod)
packages/i18n/locales/pt-BR/{ui,errors,release-notes}.json
docs/mod-format.md  docs/design.md
apps/web/src/
├── ui/stages/{GroupTables,OverallTable,StageNav,DrawNotice,StageBracket}.tsx
├── ui/StandingsTable.tsx  ui/cup/Bracket.tsx                 # zona de classificação; origem da vaga
├── game/{useDivision,selectors}.ts*
├── app/jogo/{page,competicao,calendario,fim-de-temporada}/    # fase no próximo jogo e no calendário
apps/web/test/flows/stages.test.tsx  apps/web/e2e/stages.spec.ts
```

**Structure Decision**:

- As fases são um módulo do motor (`stages/`) que lê e escreve só `Season.stages` e as `fixtures`
  das rodadas da própria divisão; as divisões de pontos corridos e as copas não passam por ele.
- A fase eliminatória reaproveita `knockout/` por uma **visão** da `Season` (clubes, rodadas e
  chaveamento da fase); o resultado volta para `Season.stages`. As copas da 018 seguem usando
  `Season.bracket`, sem tocar nelas.
- `standings()` é o ponto único de leitura da tabela: numa divisão em fases devolve a posição
  final; assim nada fora do módulo precisa saber de fases.
- A UI continua apenas lendo o que o motor devolve (grupos, classificações, chaveamento, avisos).

## Complexity Tracking

Sem violações da constituição a justificar.
