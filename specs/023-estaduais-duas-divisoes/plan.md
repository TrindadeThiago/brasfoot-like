# Implementation Plan: Estaduais com duas divisões

**Branch**: `023-estaduais-duas-divisoes` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/023-estaduais-duas-divisoes/spec.md`

## Summary

O estadual é, para o motor, **uma competição secundária de um país, com duas divisões em fases e
ligada a uma região**. O formato que a spec pede (grupos → mata-mata em jogo único → final em ida e
volta) já existe: fases em sequência e grupos (019), mata-mata com `legs`, `home` e desempate por
fase (018), datas por competição (017), vagas entre competições (021) e acesso/rebaixamento entre
níveis (`nextComposition`). O desenho acrescenta só o que falta:

- **Competição regional** (R1): bloco opcional `competition.regional` (região, peso). A competição
  continua tendo `countryId`, mas nunca é a principal do país; `mainCompetitionOf` passa a ignorá-la,
  e as regras econômicas, de mercado, torcida e diretoria seguem vindo da principal do país.
- **Região do clube** (R2): reaproveita `club.region` (já existe, 019). Um estadual só aceita
  clubes da sua região; um país que declara estaduais exige região em todos os clubes (US4, FR-001).
- **Acesso e rebaixamento por fases** (R3): `nextComposition` já ordena divisões em fases pela
  `finalOrder` (019). Finalistas da 2ª sobem; os piores da fase de grupos da 1ª caem. Falta validar
  que os números fecham e testar o desempate; sem formato novo de vaga.
- **Clubes regionais** (R4): clubes que não estão em nenhuma competição não regional. Não são
  jogáveis (spec), mas passam por finanças, mercado da IA, evolução e renovação. Auditoria dos
  pontos que supõem "todo clube tem divisão na liga principal".
- **Vagas nacionais** (R5): berths da 021 com fonte `position` do estadual (nível 1); repasse da 021
  trata clubes que já estão no destino.
- **Calendário** (R6): validação nova de que o último jogo do estadual (final de cada divisão)
  precede a primeira rodada nacional do mesmo país, e a temporada começa pelo estadual.
- **Peso na carreira** (R7): peso por competição com multiplicador por faixa de reputação,
  aplicado nas metas da diretoria e na expectativa/humor da torcida. Meta nova `regional`.
- **Manchetes e histórico** (R8): modelos de manchete e `regionalHistory` (campeão, vice, acesso,
  rebaixamento por divisão e temporada).
- **Equilíbrio e escala** (R9): banco de teste com 27 estaduais de duas divisões, 30 temporadas,
  faixas declaradas e metas de escala da 020 (tempo de virada e tamanho do save).
- **Telas** (R10): aba "Estadual" junto das competições nacionais; grupos, chaveamento (019) e
  campanha do clube (022, generalizada para fases). Save v18 (campos opcionais).

Detalhes em [research.md](research.md); modelo em [data-model.md](data-model.md); contratos em
[contracts/](contracts/).

## Technical Context

**Language/Version**: TypeScript 6.0.x (`strict`), Node 22

**Primary Dependencies**: motor, save, i18n, default-mod, modkit do workspace; Next.js 16.4 (static
export), React 19.3; Zod. Nenhuma dependência nova.

**Storage**: save v18 no IndexedDB (`regionalHistory` na carreira; meta `regional` opcional nas
metas); formato de mod continua `formatVersion: 1` com `competition.regional` aditivo

**Testing**: Vitest (motor, validação, save, app); `regional-long-run.test.ts` (30 temporadas, banco
de 27 estaduais); Playwright com o mod de exemplo

**Target Platform**: navegadores modernos, desktop ≥ 1280px

**Project Type**: biblioteca (motor) + pacote de save + mod padrão + aplicação web estática + ferramentas

**Performance Goals**: o banco de 27 estaduais acrescenta ~450 clubes e ~4 000 jogos por
temporada; o dia de jogos e a virada ficam dentro dos `SCALE_LIMITS` da 020 (tempo e tamanho de
save). A linha de base (R9) mede o custo e, se preciso, propõe limites próprios para o banco de
estaduais, justificados no mesmo PR (Princípio V). Sem custo em bancos sem estadual.

**Constraints**:

- Determinismo: sorteio de grupos e pareamentos mantêm as seeds por fase (`${season.seed}:stage:${i}:draw`);
  acrescentar um estadual não altera a seed de nenhuma outra competição (fork por competição).
- Banco padrão, mods de um país sem estaduais e saves antigos idênticos aos de hoje: sem
  `competition.regional`, nenhum caminho novo roda.
- Nenhuma regra de jogo na UI: a UI recebe grupos, chaveamento, campanha e zonas prontos.
- i18n em todos os textos; nomes de estados, competições e clubes vêm do banco (fictícios).
- Sem `gapWeeks` nas fases de uma competição de mais de uma divisão (019 R11): o respiro antes da
  final vem do calendário, não de uma fase.

**Scale/Scope**: 1 país com 27 estaduais × 2 divisões; 1ª com 12 e 2ª com 8 clubes (~540 clubes,
~40 deles também nas divisões nacionais); elencos regionais de 16 jogadores; 30 temporadas.
Números calibrados na linha de base.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação pré-pesquisa e pós-design (ambas ✅):

- [x] **I. Motor separado:** módulo `regional/` no motor (escopo, peso, campanha, histórico,
  manchetes); a UI só exibe. O teste de arquitetura cobre o módulo novo.
- [x] **II. Determinismo:** sem PRNG novo; sorteios usam as seeds por fase existentes; ordem total
  por (fase, posição, id); teste de repetição e de salvar/carregar no meio de um estadual.
- [x] **III. Dados, não código:** regiões, divisões, clubes, grupos, classificados, mando,
  desempates, vagas, datas e pesos são dados validados por Zod e regras semânticas com erro por
  arquivo/campo; nenhum caso por estado no código.
- [x] **IV. Sem conteúdo protegido:** estados, competições e clubes fictícios no banco de teste e
  no mod de exemplo (teste de blocklist existente).
- [x] **V. Balanceamento verificável:** `regional-long-run.test.ts` com faixas explícitas
  (tamanho das divisões, elencos válidos, acesso/rebaixamento por temporada, caixa dos clubes
  regionais, títulos distintos); versão reduzida no CI do PR e completa no job de simulação.
- [x] **VI. Saves versionados:** v18 com migração e fixtures v17 (início, meio, fim de temporada).
- [x] **VII. i18n:** o motor devolve códigos e ids; textos em `ui.json`, `errors.json`,
  `release-notes.json` e nas manchetes; plurais em ICU.
- [x] **VIII. Offline e gratuito:** tudo local.
- [x] **IX. Testes primeiro no motor:** escopo regional, composição, desempate, peso, histórico,
  validação e migração começam pelo teste que falha.
- [x] **Stack (v1.1.0):** sem servidor; Biome; Vitest; motor sem APIs proibidas.

Nenhuma violação. Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/023-estaduais-duas-divisoes/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/
│   ├── regional-api.md           # API do motor: escopo, peso, campanha, histórico, manchetes
│   └── mod-format-and-ui.md      # formato de mod, validação, save v18 e telas
├── checklists/requirements.md
└── tasks.md                      # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/
├── regional/                              # novo
│   ├── types.ts                           # RegionalEdition, RegionalDivisionResult
│   ├── scope.ts                           # isRegional, regionalCompetitionOf, regionalDivisionOf, clubes regionais
│   ├── weight.ts                          # peso por faixa de reputação (diretoria e torcida)
│   └── history.ts                         # RegionalEdition: campeões, acesso, rebaixamento
├── world/countries.ts                     # mainCompetitionOf ignora competição regional
├── career/{composition,season-state,turnover,next-season}.ts   # composição por fases; etapa de histórico
├── qualification/…                        # fonte `position` lê a ordem final de divisão em fases
├── board/{regional,goals,evaluation,types,rules}.ts   # meta regional com peso
├── fans/mood.ts  news/{types,rules,turnover}.ts   # peso na torcida; etapa news-regional
├── calendar/season-calendar.ts            # estadual antes das nacionais
├── model/{schemas,types}.ts  validation/semantic/{regional,calendar,competitions}.ts
├── worldgen/regional.ts  worldgen/world-example.ts   # 27 estaduais, clubes regionais, elencos menores
└── index.ts
packages/engine/test/{regional,career,validation,board,fans,news,worldgen}/…

packages/save/src/{format,migrate,scale-limits}.ts  packages/save/test/fixtures v17
mods/exemplo-mundo/  tools/src/{gen-world-example-mod,simulate-world}.ts
packages/i18n/locales/pt-BR/{ui,errors,release-notes}.json
apps/web/src/{app/jogo/competicao,app/jogo/historico}  apps/web/src/ui/{CompetitionSelect,board/GoalsList,regional/RegionalHistory}
apps/web/test/flows/regional.test.tsx  apps/web/e2e/regional.spec.ts
docs/{design.md,mod-format.md,glossario.md}
```

**Structure Decision**: a regra nova fica num módulo próprio do motor (`regional/`), separado de
`stages/` (máquina de fases), `qualification/` (vagas entre temporadas) e `continental/` (022). O
estadual não tem passo próprio no dia de jogos: é uma competição secundária comum, igual à copa.

## Complexity Tracking

Não se aplica: o Constitution Check não tem violações.
