# Implementation Plan: Calendário multi-competição

**Branch**: `017-calendario-multi-competicao` | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/017-calendario-multi-competicao/spec.md`

## Summary

A temporada passa a ter como eixo um **calendário de datas** (`SeasonCalendar`), montado a partir
de uma agenda opcional de cada competição no banco (`schedule`: dia da semana, semana inicial,
intervalo). O padrão é uma rodada por domingo. Todas as competições do banco são disputadas: a
primeira é a **principal** (dona da economia, mercado, diretoria, torcida, manchetes e histórico,
como hoje), e as demais são **secundárias**, com clubes obrigatoriamente da principal.

Cada competição continua sendo uma `LeagueSeason` intacta. O avanço passa de "rodada" para **dia**:
`completeCareerDay` fecha as rodadas de todas as competições do dia (a do jogador vem do ao vivo,
as outras são simuladas direto) e aplica as consequências do dia. `advanceCareerToNextMatch` pula
os dias sem jogo do clube do jogador.

A validação do banco recusa clube com dois jogos na mesma data e competição que não cabe nas 52
semanas. Um módulo novo, `fitness/`, dá condição física de 0 a 100 a cada jogador: ela cai com os
minutos jogados, sobe 5 por dia e reduz a força na entrada da partida. Os elencos ajustados mantêm
o motor de partida intacto, e a IA poupa cansados pelo próprio `autoLineup`.

Cartões ficam por competição de graça (o `status` já é por `Season`), e as lesões são sincronizadas
com a principal. A bilheteria vale para todo jogo em casa. Folha, juros, obras, mercado e evolução
continuam nos dias da principal, e por isso o banco padrão fica idêntico. Torcida, diretoria e
manchetes recebem os jogos do dia.

O save v12 ganha `calendar`, `competitions`, `fitness` e `competitionHistory`, com migração
v11 → v12. A UI ganha o próximo compromisso com data, o calendário por data com filtro, as abas de
competição, a condição na escalação e as datas no mercado. Detalhes em [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.x (`strict`), Node 22

**Primary Dependencies**: motor, save, i18n e default-mod do workspace; Next.js 16.4 (static
export), React 19.3; Zod. Nenhuma dependência nova.

**Storage**: save v12 no IndexedDB (`calendar`, `competitions`, `fitness`, `competitionHistory`);
migração v11 → v12; campos opcionais novos em `competitions.json`

**Testing**: Vitest (motor, validação, save, app); teste de equivalência com o banco padrão;
testes de 30 temporadas existentes no caminho por dia; teste longo novo com duas competições;
Playwright com o mod de teste de duas competições

**Target Platform**: navegadores modernos, desktop ≥ 1280px

**Project Type**: biblioteca (motor) + pacote de save + mod padrão + aplicação web estática + ferramentas

**Performance Goals**: montar o calendário < 5 ms; avançar até o próximo jogo < 300 ms com o banco
de teste; cada simulação de 30 temporadas continua < 120 s

**Constraints**:

- Determinismo: datas por aritmética inteira, sem `Date`; competições na ordem do banco; seed das
  secundárias derivada; condição sem sorteio.
- Banco padrão idêntico: mesmos confrontos, placares e totais anuais.
- Mods antigos continuam válidos.
- i18n para datas, dias da semana e erros.

**Scale/Scope**: 40 clubes; banco padrão com 38 dias de jogo por temporada; banco de teste com
38 + 18 dias

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação pré-pesquisa e pós-design (ambas ✅):

- [x] **I. Motor separado:** calendário, validação, dia de jogos, condição física e disciplina
  ficam no motor. O save orquestra, e a UI só exibe e formata datas.
- [x] **II. Determinismo:**
  - datas via `daysFromCivil` (sem `Date` no motor);
  - slots na ordem de `competitions.json`;
  - seed `${seed}:${competitionId}` para as secundárias;
  - condição calculada sem sorteio;
  - ao vivo e direto pelo mesmo `completeCareerDay`;
  - teste de repetição com salvar e carregar.
- [x] **III. Dados, não código:**
  - `schedule`, `discipline` e `fitness` são campos opcionais da competição, com schema Zod e
    padrões;
  - conflitos de data e transbordo são erros de validação do banco, com arquivo, campo e mensagem
    traduzível;
  - nenhuma competição é tratada por nome ou id no código.
- [x] **IV. Sem conteúdo protegido:** o banco de teste é derivado do fictício, e o nome da
  competição de teste fica no dado.
- [x] **V. Balanceamento verificável:**
  - os testes de 30 temporadas existentes continuam com os mesmos limites;
  - há um teste de equivalência com o banco padrão;
  - `calendar/long-run.test.ts` cobre duas competições com limites explícitos (placares, economia e
    condição média).
- [x] **VI. Saves versionados:** v12 com migração v11 → v12 e fixtures v11 no início, no meio e no
  fim da temporada, mais uma com várias temporadas.
- [x] **VII. i18n:** o motor produz datas ISO e códigos. Dias da semana, rótulos e erros ficam em
  `ui.json`/`errors.json`, e nomes de competição vêm do banco.
- [x] **VIII. Offline e gratuito:** tudo local.
- [x] **IX. Testes primeiro no motor:** cada arquivo de `calendar/`, `fitness/` e `career/day.ts`,
  as regras de validação e a migração começam pelo teste que falha.
- [x] **Stack (v1.1.0):** sem servidor; Biome; Vitest.

Nenhuma violação. Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/017-calendario-multi-competicao/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/
│   ├── calendar-api.md   # API do motor: calendário, dia de jogos, condição, integrações
│   └── save-and-ui.md    # save v12, formato de mod, telas
├── checklists/requirements.md
└── tasks.md              # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/
├── calendar/
│   ├── date.ts                   # + weekdayOf, addDays, diffDays
│   ├── schedule.ts               # novo: DEFAULT_SCHEDULE, scheduleOf, roundDates
│   └── season-calendar.ts        # novo: SeasonCalendar, buildSeasonCalendar, dateOfRound, currentDay
├── fitness/                      # novo
│   ├── types.ts  rules.ts        # FitnessState, FitnessRules, DEFAULT_FITNESS
│   └── fitness.ts                # fitnessOn, fitnessFactorBp, squadWithFitness, fitnessAfterMatches
├── career/
│   ├── season-state.ts           # novo: CareerSeasonState, createCareerSeason, nextClubFixture, clubFixtures
│   ├── day.ts                    # novo: startCareerDay, completeCareerDay, advanceCareerToNextMatch, advanceCareerDays
│   ├── injuries.ts               # novo: syncInjuries (R6)
│   ├── league-round.ts           # LiveRound com competitionId/date; elenco com condição
│   └── turnover.ts  types.ts     # competições secundárias, calendário, condição, competitionHistory
├── season/live-round.ts          # prepareFixture aceita elenco ajustado (sem conhecer condição)
├── finance/round.ts              # applyDayFinances; completeCareerRound/advanceCareer viram wrappers ou saem
├── finance/{ledger,types}.ts     # date e competitionId nas entradas
├── fans/mood.ts  board/round.ts  news/{round,facts}.ts   # DayMatch[]
├── renewal/evolution.ts          # minutos de todas as competições
├── market/windows.ts             # datas das janelas via calendário (exibição)
├── model/{schemas,types}.ts      # schedule, discipline, fitness na competição
└── validation/semantic/{competitions,calendar}.ts   # club_in_multiple por competição; calendar.*; club_outside_main
packages/engine/test/{calendar,fitness,career}/*.test.ts
packages/engine/test/fixtures/two-competitions.ts
packages/engine/test/calendar/long-run.test.ts
packages/save/test/{equivalence.test.ts,__fixtures__/equivalence-baseline.json}   # linha de base pré-017 (banco padrão)

packages/save/src/{format,create,migrate,career,index}.ts   # v12, withDayResult, nextFixture
packages/save/test/{migrate-v12.test.ts, fixtures/v11-*.json}
packages/i18n/locales/pt-BR/{ui,errors}.json
docs/mod-format.md  mods/exemplo/competitions.json

apps/web/src/
├── game/{GameProvider.tsx,selectors.ts,useCompetition.ts,useLiveRound.ts}
├── ui/{NextMatchCard,FitnessMeter,CompetitionSelect}.tsx  ui/CompetitionTabs.tsx  ui/format-date.ts
├── app/jogo/page.tsx  app/jogo/calendario/page.tsx  app/jogo/competicao/**  app/jogo/rodada/
├── app/jogo/escalacao/  app/jogo/elenco/  app/jogo/mercado/  app/jogo/historico/  app/jogo/fim-de-temporada/
apps/web/test/flows/calendar.test.tsx  apps/web/e2e/{calendar.spec.ts,fixtures/two-competitions mod}
tools/src/{simulate-world,simulate-economy,simulate-season}.ts   # caminho por dia
```

**Structure Decision**:

- `calendar/` passa a conter a agenda e o calendário da temporada, ao lado do `date.ts` que já
  existe.
- `fitness/` é um módulo próprio, com estado e regras próprias, que só afeta a entrada das
  partidas.
- `career/day.ts` concentra a orquestração do dia, que hoje está em `finance/round.ts`
  (`completeCareerRound`). A parte de finanças fica em `finance/` como `applyDayFinances`.
- O módulo `season/` (M1) não muda de comportamento: cada competição segue sendo uma
  `LeagueSeason`.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Regressão silenciosa no banco padrão (placares, caixa) | Teste de equivalência com fixtures gravadas antes da mudança (R15), criado como primeira tarefa |
| Muitos consumidores de `completeCareerRound`/`advanceCareer` (ferramentas, testes longos, save, web) | Manter `advanceCareer` como wrapper sobre `advanceCareerDays` até migrar todos os chamadores; remover no fim |
| Lesões divergentes entre competições | `syncInjuries` com teste de lesão na secundária que tira o jogador da principal e vice-versa |
| Condição desequilibra o mundo com duas competições | Limite de condição média no teste longo; parâmetros como dados (`competition.fitness`) |

## Complexity Tracking

Sem violações da constituição.
