# Implementation Plan: Rodada ao vivo e fim de temporada

**Branch**: `030-rodada-ao-vivo-fim-temporada` | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/030-rodada-ao-vivo-fim-temporada/spec.md`

## Summary

Refaz a rodada ao vivo e o fim de temporada sobre a fundação da 025 e os padrões das 026 a 029.
Rodada ao vivo: uma barra de controle (sair, velocidade, pausar e retomar, terminar agora, pausa
automática) com a barra de andamento e o intervalo marcado; o meu jogo em destaque como placar de
transmissão (escudos, nomes, mando, fase ou grupo, placar grande, estado em texto, clássico e
expulsos); a linha do tempo só do meu jogo, as estatísticas comparativas e a lista dos outros jogos
em uma linha por jogo; o painel Meu time (já completo no código) ao lado quando a rodada pausa;
pênaltis; saída com confirmação num diálogo. Fim de temporada: título "Temporada X encerrada" com o
botão Próxima temporada na mesma linha, resultado do clube em destaque, "Como foi a sua temporada",
"Campeões das ligas nacionais", "Acesso e rebaixamento" e a classificação final recolhida.

Abordagem técnica: nada muda no motor, nos saves nem nas regras. A pesquisa (R1 a R12) mostrou que
(a) o feed da rodada acumula todos os lances sem limite e o anúncio para leitor de tela só pega o
lance mais novo, (b) a confirmação de saída usa `window.confirm` e é síncrona em quatro lugares,
(c) a premiação da liga só é lançada na virada da temporada (então a tela mostra o valor que o jogo
já calcula, e as copas vêm do extrato), e (d) todos os dados do resumo existem. O estado da rodada
(`useLiveRound`) ganha um limite de lances e um anúncio por lote; a saída vira um diálogo pelo
`leave-guard`; a derivação do resumo (campanha por competição, total de premiação) fica em funções
puras em `apps/web/src/game/`. Sem dependência nova.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Next.js 16 (export estático), Node 22

**Primary Dependencies**: CSS Modules; componentes-base da 025 (`Card`, `Notice`, `Meter`, `Badge`, `EmptyState`, `DataTable`, `Dialog`); sem biblioteca nova

**Storage**: nenhuma mudança; a velocidade e a pausa automática continuam nas preferências de hoje (`roundSpeed`, `autoPause`)

**Testing**: Vitest + happy-dom + Testing Library; Playwright (rodada ao vivo, fim de temporada, teclado, a11y, layout)

**Target Platform**: navegadores desktop, PWA offline

**Project Type**: web (monorepo pnpm)

**Performance Goals**: uma rodada de 10 jogos em velocidade rápida termina sem erro e sem tarefa longa de interface (medição antes e depois); a lista de lances da tela tem teto fixo

**Constraints**: paridade funcional; a mesma seed e as mesmas decisões dão a mesma partida (o motor não é tocado); i18n; contraste 016; estado e gol nunca só em cor; sem rolagem horizontal da página em 1 440/1 280/1 024 px; placar, minuto e estado do meu jogo visíveis sem rolagem em 1 440 × 900

**Scale/Scope**: 2 telas; ≈ 1 400 linhas de componentes de tela hoje (`rodada`, `LiveGrid`, `EventFeed`, `LiveStats`, `SubstitutionPanel`, `ShootoutPanel`, `RoundResults`, `MatchSummary`, `SeasonSummary`, `Evaluation`); 1 diálogo de saída, 1 cartão de placar, 1 barra de andamento, 1 lista de jogos, 3 seções do resumo e 2 módulos puros novos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Motor separado:** nenhuma regra nova; o limite de lances, o anúncio e a campanha por competição são de exibição, em `apps/web/src/game/`, sem React/DOM nas funções puras
- [x] **II. Determinismo:** o motor não é tocado; o relógio da rodada (`TICK_MS`) já é da interface e não entra no resultado; um teste confirma que a mesma seed e as mesmas decisões dão a mesma partida com o feed limitado
- [x] **III. Dados, não código:** competições, fases e divisões vêm do banco do save; nenhuma lista fixa no código
- [x] **IV. Sem conteúdo protegido:** nenhum nome ou escudo novo
- [x] **V. Balanceamento verificável:** não se aplica (sem mudança de regra de partida, de economia ou de substituição)
- [x] **VI. Saves versionados:** sem mudança de formato nem de preferências
- [x] **VII. i18n:** todo texto novo em `ui.json`, com plural; os lances seguem narrados por `formatEvent`
- [x] **VIII. Offline e gratuito:** sem dependência nova e sem rede
- [x] **IX. Testes primeiro:** testes unitários dos módulos puros (anúncios, limite de lances, campanha por competição) antes das telas; testes de componente e e2e atualizados

Pós-design: todos os gates passam; sem violações a justificar.

## Project Structure

### Documentation (this feature)

```text
specs/030-rodada-ao-vivo-fim-temporada/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── live-round-screen.md
│   └── season-end-screen.md
├── checklists/requirements.md
└── tasks.md            # gerado por /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/src/
├── app/jogo/
│   ├── rodada/page.tsx                 # barra de controle, cartão do jogo, colunas, diálogo de saída
│   └── fim-de-temporada/page.tsx       # título com o botão, seções do resumo
├── game/
│   ├── useLiveRound.ts                 # feed com teto; anúncios por lote
│   ├── live-view.ts                    # NOVO: progresso, estado em texto, expulsos, anúncios, linhas dos outros jogos
│   └── season-view.ts                  # NOVO: campanha por competição, total de premiação, situação do clube
├── ui/
│   ├── leave-guard.ts                  # guarda assíncrona com diálogo (substitui o confirm)
│   ├── live/                           # NOVO: ControlBar, ProgressBar, MatchScoreboard, OtherMatches, LeaveDialog
│   ├── EventFeed.tsx, LiveStats.tsx, SubstitutionPanel.tsx, cup/ShootoutPanel.tsx   # refeitos na linguagem nova
│   ├── RoundResults.tsx, MatchSummary.tsx                                          # fim da rodada
│   ├── season/                         # NOVO: SeasonHeader, ClubResult, Campaign, Champions, Moves, FinalTable
│   └── SeasonSummary.tsx, board/Evaluation.tsx                                     # reaproveitados nas seções
└── i18n/                               # só chaves novas em packages/i18n/locales/pt-BR/ui.json
apps/web/test/
├── game/live-view.test.ts              # NOVO
├── game/season-view.test.ts            # NOVO
├── game/live-feed.test.ts              # NOVO (teto de lances, determinismo)
├── ui/live-screen.test.tsx             # NOVO (US1)
├── ui/live-team.test.tsx               # NOVO (US2)
├── ui/live-controls.test.tsx           # NOVO (US3), e leave-guard.test.tsx
├── ui/live-shootout.test.tsx           # NOVO (US4)
├── ui/live-round-end.test.tsx          # NOVO (US5)
├── ui/live-perf.test.tsx               # NOVO (US7), e live-announce.test.tsx
├── ui/season-end.test.tsx              # NOVO (US6)
└── flows/ (live-round, full-season, substitutions) atualizados
apps/web/e2e/                           # live-round, full-season, keyboard, a11y, layout atualizados
```

**Structure Decision**: tudo na camada de apresentação (`apps/web`). O motor e o pacote `save` não
mudam; `packages/i18n` ganha só chaves.

## Complexity Tracking

Sem violações da constituição a justificar.
