# Implementation Plan: Múltiplas divisões e virada de temporada

**Branch**: `007-divisoes-virada-temporada` | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-divisoes-virada-temporada/spec.md`

## Summary

O motor ganha um módulo `career/` com a **temporada da liga** (`LeagueSeason`: uma `Season` por
divisão, todas com a mesma seed e avançando juntas) e a **virada de temporada** como um pipeline
de etapas nomeadas e ordenadas (registrar histórico → acesso/rebaixamento → avançar o ano → zerar
estatísticas → gerar calendários), com registro de etapas extras antes/depois de âncoras para os
sistemas futuros. A rodada da liga é **uma** `LiveRound` com as partidas de todas as divisões
(cada uma marcada com o nível), então ao vivo e "simular direto" continuam idênticos por
construção; a UI só filtra a divisão do jogador. A composição das divisões vem das classificações
finais e das vagas dos dados — nada fixo em "4" ou "duas divisões". O save vai para a v3 (`league`
+ `history` no lugar de `season`) com migração que cria a Série B na mesma rodada. A UI ganha
escolha de clube nas duas divisões, seletor de divisão na competição com zonas, resumo de fim de
temporada com "Próxima temporada" e a tela de histórico. Detalhes em [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.x (`strict`), Node 22

**Primary Dependencies**: motor, save, i18n do workspace; Next.js 16.4 (static export), React
19.3; Zod (envelope do save). Nenhuma dependência nova.

**Storage**: save v3 no IndexedDB (`league` + `history`); migração v2 → v3; nenhum dado novo no
`localStorage` (divisão selecionada fica na URL)

**Testing**: Vitest (motor e save em Node; app com happy-dom + fake-indexeddb); Playwright para o
fluxo de virada; simulação de 10 temporadas como teste do motor

**Target Platform**: navegadores modernos, desktop ≥ 1280px

**Project Type**: biblioteca (motor) + pacote de save + aplicação web estática

**Performance Goals**: rodada da liga em modo direto < 1 s na app (SC-006); virada < 2 s
(SC-005); 10 temporadas no teste do motor em tempo compatível com a suíte (alvo < 60 s)

**Constraints**: determinismo (seeds por temporada e por etapa, sem depender de ordem de
registro); nenhuma regra de jogo na UI (zonas, composição e virada no motor); virada atômica (um
único `persist`); static export; nenhuma string fora do i18n

**Scale/Scope**: 2 divisões × 20 clubes no banco padrão (motor genérico para N níveis); 20
partidas por rodada; histórico ≈ 3 KB por temporada; 1 rota nova (histórico), 5 telas alteradas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação pré-pesquisa e pós-design (ambas ✅):

- [x] **I. Motor separado:** `LeagueSeason`, rodada da liga, composição, zonas, histórico e virada
  ficam no motor; o pacote save só orquestra (escalação do jogador) e a UI lê e dispara comandos.
- [x] **II. Determinismo:** seed da temporada derivada do número (R3); PRNG por etapa da virada;
  composição ordenada por id; extras na mesma posição ordenadas por id; teste com JSON ida-e-volta.
- [x] **III. Dados, não código:** vagas, níveis e número de divisões vêm da competição do mod;
  nomes de divisão do mod; testes com mod de 3 divisões e vagas diferentes.
- [x] **IV. Sem conteúdo protegido:** só o banco fictício; nenhum nome novo.
- [x] **V. Balanceamento verificável:** a feature não muda forças nem economia; o teste de 10
  temporadas fixa limites explícitos (20/20 clubes, 4+4 trocas, partição exata) e os testes de
  credibilidade da Série A continuam como regressão.
- [x] **VI. Saves versionados:** v3 com migração v2 → v3 e fixtures v2 (meio de temporada e
  encerrado); cadeia v1 → v3 testada.
- [x] **VII. i18n:** textos novos em `ui.json`/`season-errors.json`; mensagens do resumo com
  variáveis completas; teste de literais.
- [x] **VIII. Offline e gratuito:** tudo local; rota nova entra no precache.
- [x] **IX. Testes primeiro no motor:** `career/*` começa por testes (composição, pipeline,
  rodada da liga, 10 temporadas).
- [x] **Stack (v1.1.0):** sem APIs de servidor; rota estática com query string; Biome; Vitest.

Nenhuma violação; Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/007-divisoes-virada-temporada/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/
│   ├── league-api.md       # API do motor: liga, rodada da liga, virada, seasonDate
│   ├── save-format-v3.md   # save v3, migração, funções do pacote
│   └── ui.md               # rotas, seletor de divisão, resumo, histórico, atalhos
├── checklists/requirements.md
└── tasks.md                # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/
├── career/                       # novo
│   ├── types.ts                  # LeagueSeason, SeasonHistoryEntry, Turnover*, DivisionZones
│   ├── league.ts                 # createLeagueSeason, leagueSeasonSeed, leagueRound, divisionZones…
│   ├── league-round.ts           # startLeagueRound, completeLeagueRound, advanceLeague
│   ├── composition.ts            # nextComposition (acesso/rebaixamento genérico)
│   ├── history.ts                # entrada de histórico a partir das classificações
│   └── turnover.ts               # etapas padrão, resolveTurnoverSteps, seasonTurnover
├── calendar/date.ts              # + seasonDate
├── season/types.ts               # SeasonOptions.clubIds/status; LiveMatch.divisionLevel
├── season/season.ts              # createSeason aceita composição e status iniciais
├── season/errors.ts              # códigos novos
└── index.ts                      # exports novos
packages/engine/test/career/{league-round,composition,turnover,multi-season}.test.ts

packages/save/src/
├── format.ts                     # v3: league + history
├── create.ts                     # qualquer divisão; createLeagueSeason
├── migrate.ts                    # v2 → v3; validação nova
├── career.ts                     # novo: userSeason, currentDate, advanceCareerSeason
└── summary.ts                    # ano/rodada da liga, divisionLevel
packages/save/test/{migrate-v3,career}.test.ts (fixtures v2 gerados em test/fixtures.ts)

packages/i18n/locales/pt-BR/{ui,season-errors}.json

apps/web/src/
├── app/nova-carreira/page.tsx               # clubes das duas divisões, filtro
├── app/jogo/page.tsx                        # rodada da liga; temporada encerrada → resumo
├── app/jogo/rodada/page.tsx                 # filtra a divisão do jogador
├── app/jogo/competicao/**/page.tsx          # seletor de divisão (d), zonas
├── app/jogo/fim-de-temporada/page.tsx       # resumo + "Próxima temporada"
├── app/jogo/historico/page.tsx              # novo
├── game/GameProvider.tsx                    # league; commitRound via completeLeagueRound; advanceToNextSeason
├── game/selectors.ts                        # competitionClubs, seasonEndSummary (lê motor)
├── ui/DivisionTabs.tsx  ui/StandingsTable.tsx (zonas)  ui/SeasonSummary.tsx
└── (elenco, PlayerDetails, AppHeader)       # currentDate / league.year
apps/web/test/flows/{seasons,new-career}.test.tsx   apps/web/e2e/seasons.spec.ts
tools/src/simulate-season.ts                 # --career N (temporadas seguidas)
```

**Structure Decision**: o módulo `career/` fica separado de `season/` porque trata da competição
inteira e de várias temporadas, enquanto `season/` continua sendo a regra de uma divisão numa
temporada; assim `season/` não muda de comportamento e os testes da 003/006 seguem valendo sem
alteração. A virada fica no motor (pura) e a orquestração com o jogador (esquema e escalação) no
pacote save, como já acontece com a escalação na 005.

## Complexity Tracking

Sem violações da constituição.
