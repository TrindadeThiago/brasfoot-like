# Implementation Plan: Temporada de pontos corridos

**Branch**: `003-temporada-pontos-corridos` | **Date**: 2026-10-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-temporada-pontos-corridos/spec.md`

## Summary

Simulação de uma temporada completa de pontos corridos no motor (`packages/engine/src/season/`).
O calendário usa o método de Berger com ordem de clubes sorteada pela seed (cada par uma vez por
turno, mandos equilibrados, returno espelhado). A temporada avança rodada a rodada chamando o
motor de partida com seeds derivadas, escalação automática com o esquema preferido de cada clube
e exclusão de suspensos e lesionados. Cada jogo vira um registro compacto, do qual a tabela (com
desempate em grupos e confronto direto em minitabela), as estatísticas e as suspensões são
derivadas. O estado é serializável e não embute o mundo. Credibilidade verificada em 100
temporadas contra `SEASON_CREDIBILITY_LIMITS`; CLI `pnpm sim:season`. Detalhes em
[research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.x (`strict`), Node 22

**Primary Dependencies**: nenhuma nova; usa o motor de partida (002) e o modelo de dados (001)

**Storage**: N/A (estado da temporada em memória, serializável; ~40 KB por rodada)

**Testing**: Vitest — calendário (propriedades para N = 4..40), tabela e desempates, disciplina,
estatísticas, determinismo, erros, desempenho e credibilidade (100 temporadas)

**Target Platform**: motor agnóstico; CLI em Node 22

**Project Type**: biblioteca (motor) + mensagens (i18n) + CLI de desenvolvimento

**Performance Goals**: temporada (380 partidas) < 2 s; 100 temporadas < 2 min (SC-005); meta
interna < 0,4 s por temporada

**Constraints**: determinismo total; estado sem o mundo; nada de texto fora do i18n no motor

**Scale/Scope**: 20 clubes, 38 rodadas, 380 partidas, ~1.000 jogadores; 8 códigos de erro

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação pré-pesquisa e pós-design (ambas ✅):

- [x] **I. Motor separado:** temporada em `packages/engine/src/season/`; CLI em `tools/`.
- [x] **II. Determinismo:** calendário, seeds de partida, sorteio de desempate e duração de lesões
  derivados da seed da temporada (R2, R6, R7, R9); rodada a rodada = tudo de uma vez; estado
  serializável.
- [x] **III. Dados, não código:** número de turnos, pontuação e critérios de desempate vêm do
  formato da competição no banco; regras disciplinares configuráveis; nenhuma regra presa a uma
  liga específica.
- [x] **IV. Sem conteúdo protegido:** usa o banco padrão fictício.
- [x] **V. Balanceamento verificável:** 100 temporadas contra `SEASON_CREDIBILITY_LIMITS`
  (FR-030 a FR-037), com relatório na CLI.
- [x] **VI. Saves versionados:** ainda não há save; `Season` é serializável e não duplica o
  banco, pronta para o save do Marco 2 (que terá número de versão).
- [x] **VII. i18n:** erros como código + parâmetros com mensagens ICU pt-BR e teste de cobertura;
  tabela e estatísticas são dados estruturados.
- [x] **VIII. Offline e gratuito:** nenhuma dependência de rede.
- [x] **IX. Testes primeiro no motor:** cada regra começa por teste.

Nenhuma violação; Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/003-temporada-pontos-corridos/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/
│   ├── season-api.md
│   └── season-errors.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/season/
├── types.ts             # Season, Round, Fixture, MatchRecord, PlayerStatus, StandingRow, ...
├── errors.ts            # SEASON_ERROR_CODES, SEASON_ERROR_PARAMS, SeasonError
├── calendar.ts          # generateCalendar (Berger + ordem sorteada)
├── season.ts            # createSeason, advanceSeason, isSeasonOver, unavailablePlayers
├── lineups.ts           # esquema preferido, escalação com indisponíveis e completamento (FR-020)
├── discipline.ts        # atualização de PlayerStatus após cada jogo (R7)
├── record.ts            # MatchResult → MatchRecord
├── standings.ts         # tabela e desempates em grupo
├── stats.ts             # seasonStats, topScorers, topAssists
├── credibility.ts       # clubStrength, seasonReport, aggregateCredibility, spearman
└── limits.ts            # SEASON_CREDIBILITY_LIMITS

packages/engine/test/season/
├── helpers/world.ts     # mundo completado + temporada da Série A
├── calendar.test.ts  standings.test.ts  discipline.test.ts  stats.test.ts
├── determinism.test.ts  errors.test.ts  lineups.test.ts
├── performance.test.ts
└── credibility.test.ts  # 100 temporadas (ou 20 + test:long, ver R10)

packages/i18n/
├── locales/pt-BR/season-errors.json
├── src/format.ts                       # + formatSeasonError
└── test/season-errors-coverage.test.ts

tools/src/simulate-season.ts            # pnpm sim:season
```

**Structure Decision**: submódulo `season/` do motor, sob as mesmas regras de fronteira e
determinismo; mensagens no i18n; CLI no `tools/`.

## Complexity Tracking

Sem violações da constituição.
