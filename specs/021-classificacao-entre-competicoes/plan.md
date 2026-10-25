# Implementation Plan: Classificação entre competições

**Branch**: `021-classificacao-entre-competicoes` | **Date**: 2026-10-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/021-classificacao-entre-competicoes/spec.md`

## Summary

As competições passam a se alimentar umas das outras sem formato paralelo. O desenho reaproveita o
que já existe (composição por divisão, `enter` das fases, entradas da copa, histórico de copas e
ligas) e acrescenta uma única ideia nova: a **vaga** (*berth*), declarada no destino.

- **Vaga declarada no destino** (R1): a divisão ganha `berths?: Berth[]`. Cada vaga diz de onde vem
  o clube (`source`: faixa de posições, campeão, vice, fase alcançada), em que fase entra (`entry`),
  a **ordem de repasse** (`fallback`: lista ordenada de fontes) e as condições para usá-la
  (`require`/`forbid`: o clube precisa estar, ou não pode estar, numa divisão da temporada seguinte).
  Declarar no destino torna a validação de contagem direta: as vagas somam o tamanho de cada fase.
- **Resolução pura e ordenada** (R2): nova etapa de virada `resolve-qualification`, depois de
  `promotion-relegation` e antes de `generate-calendars`. Lê só as temporadas **encerradas** e a
  composição já calculada das pirâmides; resolve as competições alimentadas em ordem topológica das
  condições `require`/`forbid`. Produz `compositions` + `entrants` (fase de entrada) + `origins`
  (de onde veio cada participante) e o registro `QualificationRecord` da temporada.
- **Repasse e unicidade** (R3): o clube aparece no máximo uma vez por competição (a primeira vaga na
  ordem do banco o fica); a vaga excedente ou inutilizável percorre o `fallback` até achar clube
  elegível. O último passo do `fallback` é o **fechamento**: tabela inteira de uma divisão de
  referência. Sem fechamento suficiente o banco é recusado; em execução, esgotar é erro explícito
  (`qualification.exhausted`), nunca um participante a menos em silêncio.
- **Supercopa sem tipo novo** (R4): é uma competição de mata-mata com vagas de campeão/vice. O
  mata-mata passa a aceitar **uma fase** (final única), e a data vem de `schedule` (017).
- **Acesso entre competições** (R5): o `relegationSlots` da última divisão de uma pirâmide deixa de
  ser proibido quando a divisão declara vagas externas no mesmo número ("saída da pirâmide" ↔
  "entrada por vaga"). Copas e competições alimentadas usam as vagas para todos os participantes.
- **Primeira temporada** (R6): `clubIds` do banco são os participantes da temporada 1 (FR-014) e a
  validação exige que fechem com as vagas (mesma contagem por fase).
- **Telas e integrações** (R7–R8): zonas de vaga na tabela (`divisionZones` ganha `berths`),
  origem na página da competição, meta da diretoria `qualify`, manchetes e histórico de
  classificação. Save v16 (campos opcionais, migração só carimba a versão).

Detalhes em [research.md](research.md); modelo em [data-model.md](data-model.md); contratos em
[contracts/](contracts/).

## Technical Context

**Language/Version**: TypeScript 6.0.x (`strict`), Node 22

**Primary Dependencies**: motor, save, i18n, default-mod, modkit do workspace; Next.js 16.4 (static
export), React 19.3; Zod. Nenhuma dependência nova.

**Storage**: save v16 no IndexedDB (`origins` opcional em `LeagueSeason`; `qualificationHistory`
no histórico da carreira); formato de mod continua `formatVersion: 1` com `division.berths`
aditivo e `knockout.phases` aceitando 1 fase

**Testing**: Vitest (motor, validação, save, app); `qualification-long-run.test.ts` (30
temporadas, vários países); Playwright com o mod de exemplo

**Target Platform**: navegadores modernos, desktop ≥ 1280px

**Project Type**: biblioteca (motor) + pacote de save + mod padrão + aplicação web estática + ferramentas

**Performance Goals**: a resolução é O(clubes + vagas) por virada e entra no orçamento da virada da
020 (`SCALE_LIMITS`) sem alterá-lo; sem custo em bancos sem `berths`

**Constraints**:

- Determinismo: a resolução não sorteia (R3): ordem por posição, depois por id; mesma entrada dá a
  mesma saída, com salvar e carregar no meio. Quando um sorteio de fase já existente usa PRNG, a
  seed e a etapa não mudam.
- Banco padrão e saves antigos idênticos aos de hoje (FR-022): sem `berths` o caminho novo não roda
  e `composition` continua saindo de `nextComposition`.
- Nenhuma regra de jogo na UI: a UI recebe zonas e origens prontas do motor.
- i18n em todos os textos; nomes de competições vêm do banco.

**Scale/Scope**: 10 países × 2 divisões × 20 clubes (banco de teste da 020), com liga, copa e
supercopa por país e uma competição regional; mods de 1 a 10+ países; 30 temporadas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação pré-pesquisa e pós-design (ambas ✅):

- [x] **I. Motor separado:** `qualification/` no motor (resolução, zonas, origens); a UI só exibe e
  dispara os comandos que já existem. O teste de arquitetura cobre o módulo novo.
- [x] **II. Determinismo:** resolução sem PRNG; ordem total por (posição, id); teste de repetição
  e de salvar/carregar no meio; o sorteio das fases não muda de seed.
- [x] **III. Dados, não código:** vagas, repasses, condições, supercopa e fechamento são dados
  validados por Zod e por regras semânticas com erro por arquivo/campo; nenhum caso por competição.
- [x] **IV. Sem conteúdo protegido:** o banco de teste e o mod de exemplo usam nomes fictícios (teste
  de blocklist existente).
- [x] **V. Balanceamento verificável:** `qualification-long-run.test.ts` fixa os limites (número de
  participantes por fase, unicidade, vagas repassadas dentro de faixa); roda a versão reduzida no
  CI de cada PR e a completa no job de simulação.
- [x] **VI. Saves versionados:** v16 com migração e fixtures v15 (início, meio, fim).
- [x] **VII. i18n:** o motor devolve códigos e ids; textos em `ui.json`, `errors.json`,
  `release-notes.json` e nas manchetes; plurais em ICU.
- [x] **VIII. Offline e gratuito:** tudo local.
- [x] **IX. Testes primeiro no motor:** fontes de vaga, repasse, unicidade, condições, fechamento,
  supercopa, saída da pirâmide, metas e migração começam pelo teste que falha.
- [x] **Stack (v1.1.0):** sem servidor; Biome; Vitest; motor sem APIs proibidas.

Nenhuma violação. Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/021-classificacao-entre-competicoes/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/
│   ├── qualification-api.md      # API do motor: resolução, zonas, origens, metas
│   └── mod-format-and-ui.md      # formato de mod, validação, save v16 e telas
├── checklists/requirements.md
└── tasks.md                      # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/
├── qualification/                         # novo
│   ├── types.ts                           # Berth, BerthSource, Origin, QualificationRecord
│   ├── pools.ts                           # fontes → lista ordenada de clubes (posição, campeão, fase)
│   ├── resolve.ts                         # resolveQualification: vagas, repasse, unicidade, fechamento
│   ├── order.ts                           # ordem topológica das condições require/forbid
│   ├── zones.ts                           # berthZones: faixas de vaga da tabela e legenda
│   └── history.ts                         # QualificationRecord → histórico/manchetes
├── career/{turnover,league,season-state,next-season,types}.ts   # etapa resolve-qualification, entrants, origins
├── stages/{create,rules}.ts  knockout/rules.ts                  # entrada por fase vinda de entrants; 1 fase
├── board/{goals,types,evaluation}.ts  news/{rules,turnover}.ts  # meta qualify, manchetes
├── model/{schemas,types}.ts  validation/{issues,semantic/qualification}.ts
├── worldgen/world-example.ts                                    # supercopa, vagas, regional no banco de teste
└── index.ts
packages/engine/test/{qualification,career,validation,board,news,worldgen}/…

packages/save/src/{format,migrate}.ts  packages/save/test/fixtures v15
mods/exemplo-mundo/  tools/src/{gen-world-example-mod,simulate-world}.ts
packages/i18n/locales/pt-BR/{ui,errors,release-notes}.json
apps/web/src/{app/jogo/competicao,app/jogo/classificacao}  apps/web/src/ui/{table,competition,board,history}
apps/web/test/flows/qualification.test.tsx  apps/web/e2e/qualification.spec.ts
docs/{design.md,mod-format.md,glossario.md}
```

**Structure Decision**: a regra fica num módulo próprio do motor (`qualification/`), separada de
`career/composition.ts` (que continua sendo só a pirâmide). A etapa de virada é fina: chama
`resolveQualification` e grava o resultado no rascunho da próxima temporada.

## Complexity Tracking

Não se aplica: o Constitution Check não tem violações.
