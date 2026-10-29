# Implementation Plan: Competição, calendário e histórico

**Branch**: `027-competicao-calendario-historico` | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/027-competicao-calendario-historico/spec.md`

## Summary

Refaz as três telas de acompanhamento sobre a fundação da 025 e os padrões da 026. Competição:
duas abas (Minhas competições e Demais competições) com cartões selecionáveis no lugar da faixa de
abas por nome, e as seções de cada competição (classificação, resultados, artilharia, chaveamento,
fases, campanha) mantidas e reestilizadas. Calendário: grade mensal (um mês por página) com a faixa
de meses, painel do jogo (sem lista do mês, por decisão do jogador). Histórico: as abas atuais com estado vazio
explicativo, tabelas com primeira coluna fixa e ligação para a trajetória do técnico.

Abordagem técnica: a rota e os parâmetros da URL (`comp`, `d`, `fase`, `t`) não mudam, então links,
atalhos e e2e seguem valendo. A lógica nova é só de apresentação e fica em funções puras testáveis:
`clubCompetitions` (quais competições entram em "Minhas" e a situação em cada uma) e
`calendarMonths` (agrupa os jogos do clube em meses e semanas). Reaproveita `DataTable`, `Tabs`,
`Card`, `Badge`, `EmptyState`, `Notice` e os componentes de fases, chaveamento e campanha já
existentes. Sem mudança de regras, dados ou saves.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Next.js 16 (export estático), Node 22

**Primary Dependencies**: CSS Modules; sem dependência nova (o calendário é feito à mão, sem biblioteca)

**Storage**: nenhuma mudança; o mês aberto e o filtro vão na URL (`?mes=AAAA-MM`, `comp`), sem preferência nova

**Testing**: Vitest + happy-dom + Testing Library; Playwright (e2e de calendário, competição, copa, continental, estadual, fases, histórico, a11y, teclado, layout)

**Target Platform**: navegadores desktop, PWA offline

**Project Type**: web (monorepo pnpm)

**Performance Goals**: calendário de temporada completa, classificação de 20 clubes com forma e chaveamento de 32 clubes respondem em até 1 s (SC-003)

**Constraints**: paridade funcional; rotas e parâmetros de URL preservados; i18n; contraste 016; cor nunca é o único sinal; sem rolagem horizontal da página em 1 440/1 280/1 024 px

**Scale/Scope**: 3 telas + 2 subrotas (resultados, artilharia); ≈ 1 000 linhas atuais de tela; mundo padrão (440 clubes, 41 competições) e mundo completo como teste de carga

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Motor separado:** nenhuma regra de jogo nova; as funções novas são derivações de exibição puras (`apps/web/src/game/`), sem React/DOM, e leem só o estado já calculado
- [x] **II. Determinismo:** sem aleatoriedade nova; sem `Math.random`; datas vêm do estado (a data "de hoje" do jogo, nunca o relógio)
- [x] **III. Dados, não código:** o critério de "Minhas competições" é derivado de dados do save (jogos do clube e vagas resolvidas), sem lista fixa no código
- [x] **IV. Sem conteúdo protegido:** nenhum nome ou escudo novo
- [x] **V. Balanceamento verificável:** não se aplica (sem mudança de regra)
- [x] **VI. Saves versionados:** sem mudança de formato; nada novo em preferências
- [x] **VII. i18n:** todo texto novo em `ui.json`, com plural; nomes de mês e dia da semana pelo formatador de data do i18n
- [x] **VIII. Offline e gratuito:** sem rede e sem dependência nova
- [x] **IX. Testes primeiro:** testes unitários de `clubCompetitions` e `calendarMonths` antes da UI; testes de componente e e2e atualizados

Pós-design: todos os gates passam; sem violações a justificar.

## Project Structure

### Documentation (this feature)

```text
specs/027-competicao-calendario-historico/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── competition-screen.md
│   ├── calendar-month.md
│   └── history-screen.md
└── tasks.md             # gerado por /speckit-tasks
```

### Source Code (repository root)

```text
packages/i18n/locales/pt-BR/
├── ui.json                                   # chaves novas (cartões, situações, calendário, vazios)
└── release-notes.json                        # + itens da 027 na nota 1.0.0
apps/web/src/
├── game/competitions.ts                      # clubCompetitions(save): Minhas/Demais e situação (puro)
├── game/calendar-month.ts                    # calendarMonths(fixtures, today): meses, semanas, contagens (puro)
├── app/jogo/competicao/page.tsx (+ .module.css)      # abas, cartões, seções
├── app/jogo/competicao/{resultados,artilharia}/page.tsx
├── app/jogo/calendario/page.tsx (+ .module.css)      # grade mensal, faixa de meses, painel, lista
├── app/jogo/historico/page.tsx (+ .module.css)       # Tabs, estados vazios, ligação à trajetória
├── ui/CompetitionCard.tsx, CompetitionList.tsx       # cartões e abas Minhas/Demais
├── ui/CompetitionSelect.tsx, CompetitionTabs.tsx     # substituídos/reaproveitados (seções por rota)
├── ui/calendar/ (MonthGrid, MonthStrip, DayPanel, MonthList)
├── ui/DataTable.tsx                                  # opção de primeira coluna fixa
├── ui/StandingsTable.tsx, cup/Bracket.tsx            # destaque do clube e do caminho até a final
apps/web/test/
├── game/competitions.test.ts, game/calendar-month.test.ts
├── ui/competition-*.test.tsx, ui/calendar-*.test.tsx, ui/history.test.tsx
apps/web/e2e/
├── calendar.spec.ts, cup.spec.ts, continental.spec.ts, regional.spec.ts, stages.spec.ts, qualification.spec.ts
├── layout.spec.ts, a11y.spec.ts, keyboard.spec.ts
```

**Structure Decision**: monorepo existente; trabalho em `apps/web` (telas, componentes e dois módulos puros em `game/`) e `packages/i18n`. Nenhum código novo no motor.

## Complexity Tracking

Sem violações da constituição a justificar.
