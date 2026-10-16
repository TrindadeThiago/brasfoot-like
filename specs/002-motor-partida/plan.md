# Implementation Plan: Motor de partida

**Branch**: `002-motor-partida` | **Date**: 2026-10-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-motor-partida/spec.md`

## Summary

Simulador de partidas minuto a minuto, determinístico, dentro do motor (`packages/engine/src/match/`).
A força efetiva de cada time é calculada por setor (goleiro, defesa, meio, ataque) a partir da
força dos jogadores, da adequação à vaga do esquema e das características. A cada minuto, o
domínio do meio define a posse e as chances de cada time são sorteadas com
`razão(a, d) = 2a²/(a²+d²)`, modulada por mando, postura, placar e jogadores em campo; cartões e
lesões dependem de temperamento e propensão. A API é funcional (`startMatch`, `advanceMatch`,
`applyChange`, `matchResult`, `simulateMatch`), com estado serializável e aleatoriedade derivada
da seed por minuto, o que garante que passos e simulação direta são idênticos. A escalação
automática usa atribuição ótima (algoritmo húngaro). A calibragem é verificada por simulações
longas contra `MATCH_REALISM_LIMITS`. Detalhes em [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.x (`strict`), Node 22 para testes e scripts

**Primary Dependencies**: nenhuma nova. Motor: Zod 4 (já presente, só para tipos de entrada se
necessário); i18n: intl-messageformat 12; dev: Vitest 5, Biome 2.5, tsx

**Storage**: N/A (estado da partida em memória, serializável)

**Testing**: Vitest — unitários (força, adequação, eventos, mudanças, erros), determinismo,
consistência, escalação automática e simulações longas de realismo (≥ 10.000 partidas)

**Target Platform**: motor agnóstico (navegador e Node); CLI de calibragem em Node 22

**Project Type**: biblioteca (motor) + mensagens (i18n) + CLI de desenvolvimento

**Performance Goals**: rodada de 10 partidas em < 100 ms; 10.000 partidas em < 60 s (SC-006);
meta interna < 1 ms por partida

**Constraints**: determinismo entre engines (sem `Math.random`, `Date`, funções transcendentais);
estado imutável e serializável; eventos estruturados sem texto

**Scale/Scope**: 22 jogadores + até 24 reservas por partida; ~95–100 minutos simulados; ~25
tipos de erro; 6 esquemas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação pré-pesquisa e pós-design (ambas ✅):

- [x] **I. Motor separado:** todo o motor de partida em `packages/engine/src/match/`; nenhuma
  dependência de UI; o CLI de calibragem fica em `tools/`.
- [x] **II. Determinismo:** aleatoriedade só via PRNG da 001, derivada da seed por minuto e por
  time (R4); só aritmética exata (`2a²/(a²+d²)`, sem `Math.pow`); estado serializável; testes de
  passos = direto e de repetição com mudanças.
- [x] **III. Dados, não código:** esquemas, adequação e pesos de setor são catálogos fixos do
  jogo (o motor implementa seus efeitos), como posições e características na 001; nenhuma
  regra depende de liga ou país.
- [x] **IV. Sem conteúdo protegido:** nenhum conteúdo novo de nomes; usa o banco padrão.
- [x] **V. Balanceamento verificável:** `MATCH_REALISM_LIMITS` com FR-040 a FR-049, verificado
  por simulações longas automatizadas; efeitos de postura, expulsão e características medidos
  com cenários pareados (R9).
- [x] **VI. Saves versionados:** não há save nesta feature; `MatchState` é serializável para a
  futura rodada ao vivo/autosave — quando entrar em save (Marco 2), segue a política de versão.
- [x] **VII. i18n:** eventos estruturados sem texto (FR-019); erros como código + parâmetros com
  mensagens ICU pt-BR e teste de cobertura (R10).
- [x] **VIII. Offline e gratuito:** nenhuma dependência de rede.
- [x] **IX. Testes primeiro no motor:** cada regra (força, eventos, mudanças, erros, escalação)
  começa por teste; bugs de simulação reproduzidos com entrada + seed.

Nenhuma violação; Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/002-motor-partida/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── match-api.md
│   └── match-errors.md
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/match/
├── formations.ts        # FORMATIONS, FORMATION_IDS, POSTURES, Slot
├── adequacy.ts          # tabela de adequação posição × vaga
├── strength.ts          # SECTOR_WEIGHTS, teamStrength
├── types.ts             # MatchInput, Lineup, MatchState, TeamState, MatchEvent, MatchChange, MatchResult
├── errors.ts            # MATCH_ERROR_CODES, MATCH_ERROR_PARAMS, MatchError
├── tuning.ts            # MATCH_TUNING
├── limits.ts            # MATCH_REALISM_LIMITS
├── validate-input.ts    # validação da entrada (FR-005)
├── rng.ts               # gerador por minuto/time derivado da seed (R4)
├── picker.ts            # escolha de finalizador, assistente, faltoso, lesionado
├── minute.ts            # simulação de um minuto: posse, chances, desfechos, cartões, lesões
├── stoppage.ts          # acréscimos
├── changes.ts           # applyChange, pendências e política automática
├── engine.ts            # startMatch, advanceMatch, simulateMatch
├── result.ts            # matchResult, estatísticas
├── hungarian.ts         # atribuição ótima
└── auto-lineup.ts       # autoLineup

packages/engine/test/match/
├── helpers/teams.ts     # times do banco padrão (completados) e variações de força
├── formations.test.ts  adequacy.test.ts  strength.test.ts
├── errors.test.ts       # tabela: 1 caso por código
├── determinism.test.ts  consistency.test.ts  changes.test.ts
├── auto-lineup.test.ts  hungarian.test.ts  performance.test.ts
└── realism/
    ├── harness.ts       # roda N partidas e agrega métricas
    ├── scoring.test.ts  # FR-040, FR-041, FR-049
    ├── home.test.ts     # FR-042
    ├── strength.test.ts # FR-043
    ├── tactics.test.ts  # FR-044, FR-045
    ├── discipline.test.ts # FR-046, FR-047, FR-048
    └── traits.test.ts   # SC-003

packages/i18n/
├── locales/pt-BR/match-errors.json
├── locales/pt-BR/catalog.json        # + posturas e esquemas
├── src/format.ts                     # + formatMatchError
└── test/match-errors-coverage.test.ts

tools/src/simulate-matches.ts          # pnpm sim:matches
```

**Structure Decision**: o motor de partida é um submódulo do motor existente
(`packages/engine/src/match/`), sob as mesmas regras de fronteira e determinismo (teste de
arquitetura e Biome já cobrem `src/**`). Mensagens no pacote i18n; o CLI de calibragem no `tools/`.

## Complexity Tracking

Sem violações da constituição.
