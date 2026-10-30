# Implementation Plan: Carreira, diretoria e notícias

**Branch**: `029-carreira-diretoria-noticias` | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/029-carreira-diretoria-noticias/spec.md`

## Summary

Refaz a Carreira e as Notícias sobre a fundação da 025 e os padrões das 026 a 028. Carreira: as cinco
abas em `Tabs` (Diretoria, Torcida, Propostas, Histórico, Técnicos), a aba Propostas com a contagem
no nome; Diretoria com metas em situação escrita (cumprindo, em risco, em andamento), confiança com
nível e tendência em texto e símbolo, motivos com efeito e mudanças por rodada; Torcida com faixa,
tendência e motivos; Propostas em cartões com o aviso de mudança de país antes das ações; Histórico e
Técnicos em tabelas. Notícias: cada manchete num cartão (competição, rodada, título e texto),
seções "Do seu clube" e uma por competição com contagem, e um painel com o resumo da rodada, o filtro
Todas e Do meu clube e a lista de competições, com setas de rodada anterior e próxima.

Abordagem técnica: nada muda no motor, nos saves nem nas regras. O motor guarda cada manchete como
tipo, variação e variáveis, e a frase sai do template; por isso (research R5) o título do cartão é a
frase da manchete e o texto são os fatos complementares que o jogo já guarda (`extras`), sem
separar a mensagem na origem. A competição de cada manchete vem de `vars.competition` ou, nos
fatos da liga principal, da própria liga; manchetes de pessoas e transferências caem em "Geral". A
derivação (situação das metas, nível e tendência, agrupamento e contagens das notícias) fica em
funções puras em `apps/web/src/game/`. Sem dependência nova.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Next.js 16 (export estático), Node 22

**Primary Dependencies**: CSS Modules; componentes-base da 025 (`Tabs`, `Card`, `Notice`, `Meter`, `Badge`, `EmptyState`, `DataTable`); sem biblioteca nova

**Storage**: nenhuma mudança; a aba aberta fica em estado local e `?aba=` na URL, como hoje; o filtro e a rodada escolhida das Notícias ficam em estado local

**Testing**: Vitest + happy-dom + Testing Library; Playwright (e2e de diretoria, propostas, notícias, torcida, teclado, a11y, layout)

**Target Platform**: navegadores desktop, PWA offline

**Project Type**: web (monorepo pnpm)

**Performance Goals**: abrir a Carreira e as Notícias não pode ser mais lento que hoje (medição antes e depois, como na 028); trocar de rodada ou de filtro nas Notícias é imediato

**Constraints**: paridade funcional; rotas e `?aba=` preservados (`board`, `fans`, `offers`, `history`, `coaches`); i18n; contraste 016; tendência e situação nunca só em cor; sem rolagem horizontal da página em 1 440/1 280/1 024 px; Diretoria sem rolagem vertical da página em 1 440 × 900

**Scale/Scope**: 2 telas; ≈ 840 linhas de componentes de tela hoje (`ui/board`, `ui/fans`, `ui/news`); 1 módulo puro de derivação, 1 painel de filtros e 1 cartão de manchete novos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Motor separado:** nenhuma regra nova; a derivação (situação das metas, tendência, agrupamento de manchetes) é de exibição, pura, em `apps/web/src/game/`, sem React/DOM, e só lê o estado já calculado
- [x] **II. Determinismo:** sem aleatoriedade nova; nada lê o relógio
- [x] **III. Dados, não código:** competições e divisões vêm do banco do save; nenhuma lista fixa de competições no código
- [x] **IV. Sem conteúdo protegido:** nenhum nome ou escudo novo
- [x] **V. Balanceamento verificável:** não se aplica (sem mudança de regra de diretoria, torcida ou notícias)
- [x] **VI. Saves versionados:** sem mudança de formato nem de preferências
- [x] **VII. i18n:** todo texto novo em `ui.json`, com plural; as manchetes seguem o princípio (o motor guarda tipo e variáveis; o texto sai do template)
- [x] **VIII. Offline e gratuito:** sem dependência nova e sem rede
- [x] **IX. Testes primeiro:** testes unitários das funções de derivação antes das telas; testes de componente e e2e atualizados

Pós-design: todos os gates passam; sem violações a justificar.

## Project Structure

### Documentation (this feature)

```text
specs/029-carreira-diretoria-noticias/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── career-screen.md
│   └── news-screen.md
├── checklists/requirements.md
└── tasks.md            # gerado por /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/src/
├── app/jogo/
│   ├── carreira/page.tsx          # Tabs com as cinco abas; ?aba= via `initial`
│   └── noticias/page.tsx          # seletor de rodada com setas, painel de filtros, grupos
├── game/
│   ├── board-view.ts              # NOVO: situação das metas, nível e tendência (confiança e torcida)
│   └── news-view.ts               # NOVO: competição de cada manchete, grupos, contagens, rodadas vizinhas
├── ui/
│   ├── board/                     # GoalsList, ConfidenceMeter, JobOffers, ManagerHistory, CoachesTable, BoardNotice refeitos; GoalsList, ConfidenceMeter e FansCard também aparecem na Início (R13)
│   ├── fans/FansCard.tsx          # faixa, tendência em texto e símbolo, motivos
│   └── news/                      # HeadlineCard (NOVO), NewsFilters (NOVO), NewsGroup (NOVO), RoundFeed, NewsCard
└── i18n/                          # só chaves novas em packages/i18n/locales/pt-BR/ui.json
apps/web/test/
├── game/board-view.test.ts        # NOVO
├── game/news-view.test.ts         # NOVO
├── ui/career-board.test.tsx       # NOVO (Diretoria)
├── ui/career-fans.test.tsx        # NOVO
├── ui/career-offers.test.tsx      # NOVO
├── ui/career-history.test.tsx     # NOVO (Histórico e Técnicos)
├── ui/career-notices.test.tsx     # NOVO (avisos)
├── ui/news-screen.test.tsx        # NOVO
└── flows/                         # board, fans, news atualizados
apps/web/e2e/                      # career-board, career, fans, news, keyboard, a11y, layout atualizados
```

**Structure Decision**: tudo na camada de apresentação (`apps/web`). O motor e o pacote `save` não
mudam; `packages/i18n` ganha só chaves.

## Complexity Tracking

Sem violações da constituição a justificar.
