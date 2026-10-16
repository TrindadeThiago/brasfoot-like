# Implementation Plan: Rodada ao vivo e telas da competição

**Branch**: `006-rodada-ao-vivo` | **Date**: 2026-10-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-rodada-ao-vivo/spec.md`

## Summary

O motor ganha a rodada ao vivo (`season/live-round.ts`): preparar as 10 partidas, avançar todas
passo a passo, aplicar decisões do jogador (substituição, esquema, postura) e fechar a rodada na
temporada. `advanceSeason` passa a usar o mesmo caminho, o que torna ao vivo e "simular direto"
idênticos por construção. A interface ganha a tela da rodada (`/jogo/rodada`) com relógio,
velocidades, pausa, painel de decisões, feed com textos traduzíveis e variados, resumo da partida;
"Competição" ganha abas de resultados e artilharia; e uma tela de fim de temporada. Detalhes em
[research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.x (`strict`), Node 22

**Primary Dependencies**: motor, save, i18n do workspace; Next.js 16.4 (static export), React
19.3. Nenhuma dependência nova.

**Storage**: save v2 sem mudança (a rodada em andamento só existe na memória); preferências da
rodada no `localStorage`

**Testing**: Vitest (motor em Node; app com happy-dom + fake-indexeddb e timers falsos para o
relógio); Playwright para rodada ao vivo e temporada inteira

**Target Platform**: navegadores modernos, desktop ≥ 1280px

**Project Type**: biblioteca (motor) + aplicação web estática

**Performance Goals**: um tick das 10 partidas < 5 ms no motor e cada atualização da tela < 50 ms
(SC-004); temporada inteira em modo direto < 2 min de interação (SC-005)

**Constraints**: determinismo (decisões por tick, nunca por tempo real); nenhuma regra de jogo na
UI; static export; nenhuma string fora do i18n

**Scale/Scope**: 10 partidas por rodada, ~98 ticks cada; 1 tela nova de rodada, 3 telas novas de
competição/fim de temporada

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação pré-pesquisa e pós-design (ambas ✅):

- [x] **I. Motor separado:** rodada ao vivo, decisões e fechamento da rodada ficam no motor; a UI
  só pede ticks e decisões e desenha o estado.
- [x] **II. Determinismo:** decisões registradas por tick; velocidade e pausas não entram no motor;
  variação de texto por hash determinístico na camada de idioma.
- [x] **III. Dados, não código:** textos dos eventos em catálogo de idioma; regras de substituição
  e limites são os do motor.
- [x] **IV. Sem conteúdo protegido:** só o banco fictício.
- [x] **V. Balanceamento verificável:** `advanceSeason` passa a usar o caminho da rodada ao vivo;
  as simulações longas e os testes de credibilidade existentes continuam valendo como regressão.
- [x] **VI. Saves versionados:** formato não muda (v2); nada novo é persistido além de
  preferências.
- [x] **VII. i18n:** `events.json` com variações; teste de literais e de variações mínimas.
- [x] **VIII. Offline e gratuito:** tudo local; telas novas entram no precache.
- [x] **IX. Testes primeiro no motor:** `live-round` começa por testes (equivalência com
  `advanceSeason`, decisões, limite de substituições, determinismo).
- [x] **Stack (v1.1.0):** sem APIs de servidor; Biome; Vitest.

Nenhuma violação; Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/006-rodada-ao-vivo/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/
│   ├── live-round-api.md   # API do motor para a rodada ao vivo
│   └── ui.md               # telas, controles, atalhos, textos de eventos
├── checklists/requirements.md
└── tasks.md                # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/season/
├── live-round.ts          # novo: startRound, advanceRound, applyRoundChange, finishRound, completeRound
└── season.ts              # advanceSeason usa live-round; preparação de partidas extraída
packages/engine/test/season/live-round.test.ts  (+ equivalência e decisões)

packages/i18n/
├── locales/pt-BR/events.json     # novo: textos dos eventos com variações
├── locales/pt-BR/ui.json         # telas novas
└── src/format.ts                 # formatEvent, eventVariant (hash determinístico)

apps/web/src/
├── app/jogo/rodada/page.tsx                  # rodada ao vivo + resumo final
├── app/jogo/competicao/resultados/page.tsx   # resultados por rodada
├── app/jogo/competicao/artilharia/page.tsx   # artilharia
├── app/jogo/fim-de-temporada/page.tsx        # campeão e classificação final
├── game/useLiveRound.ts                      # laço do relógio, velocidade, pausa, decisões
├── game/GameProvider.tsx                     # commitRound (completeRound + ajuste + salvar)
├── ui/LiveGrid.tsx  ui/EventFeed.tsx  ui/MatchSummary.tsx  ui/SubstitutionPanel.tsx
├── ui/CompetitionTabs.tsx  ui/event-text.ts
└── app/jogo/page.tsx                         # "Jogar rodada" e "Simular direto"
apps/web/test/{flows,ui}/*.test.tsx   apps/web/e2e/{live-round,full-season}.spec.ts
```

**Structure Decision**: a rodada ao vivo fica em `season/` porque fecha numa `Season` e reaproveita
a preparação das partidas da temporada; a UI ganha um hook próprio para o relógio, separado do
`GameProvider`, porque a rodada em andamento não é estado da carreira (não é salva).

## Complexity Tracking

Sem violações da constituição.
