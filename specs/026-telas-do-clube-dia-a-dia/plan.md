# Implementation Plan: Telas do clube: Início, Elenco e Escalação

**Branch**: `026-telas-do-clube-dia-a-dia` | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/026-telas-do-clube-dia-a-dia/spec.md`

## Summary

Refaz as três telas do dia a dia do clube sobre a fundação da 025. Início: cartão do próximo jogo
em destaque, avisos acionáveis agrupados, posição/resultados, torcida, diretoria, metas e manchetes.
Elenco: tabela sem coluna de ações, linha clicável (nome como botão) que abre o modal do jogador
com barras, contrato, salário, valor de mercado, estatísticas e as ações Renovar, Vender e
Rescindir. Escalação: campo e reservas com condição, "Fora da relação" com motivo e mensagens de
problemas.

Abordagem técnica: reaproveitar os componentes e a lógica existentes (`DataTable.onRowClick`,
`PlayerDetails`, `DisposalDialog`, `NegotiationDialog` em modo renovação, `Pitch`, `LineupList`,
`LineupIssues`) e só reorganizar a composição e o CSS com os componentes-base da 025 (`Card`,
`Notice`, `Meter`, `Badge`, `Tabs`, `EmptyState`). Uma única adição fora da UI: um leitor puro
`marketRowOf` no motor para obter salário e valor de mercado de um jogador sem montar a lista
inteira do mercado. Sem mudança de regras, dados ou saves.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Next.js 16 (export estático), Node 22

**Primary Dependencies**: CSS Modules, Zod; sem dependência nova

**Storage**: nenhuma mudança; preferências existentes (`squadFilter`, `squadSort`) mantidas

**Testing**: Vitest + happy-dom + Testing Library (inclui `test/flows/disposal.test.tsx` e `test/ui/*`), Playwright (e2e de escalação, a11y, teclado, layout)

**Target Platform**: navegadores desktop, PWA offline

**Project Type**: web (monorepo pnpm)

**Performance Goals**: Elenco de 40 jogadores e Escalação sem rolagem horizontal em 1 440/1 280/1 024 px; abrir o modal sem montar a lista do mercado inteira (mundo completo ≈ 39 000 jogadores)

**Constraints**: paridade funcional total; i18n de todo texto; atalhos 016, dicas e trava de saída preservados; contraste 016 nos dois temas

**Scale/Scope**: 3 telas; ~1 630 linhas de código de tela hoje; 1 modal novo; 1 helper de motor

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Motor separado:** o único código fora da UI é `marketRowOf`, função pura em `packages/engine`, sem React/DOM
- [x] **II. Determinismo:** nenhuma aleatoriedade nova; sem `Math.random`/`Date.now`
- [x] **III. Dados, não código:** sem mudança de dados
- [x] **IV. Sem conteúdo protegido:** sem nomes, escudos ou marcas novos
- [x] **V. Balanceamento verificável:** não se aplica (sem mudança de regra)
- [x] **VI. Saves versionados:** sem mudança de formato; preferências existentes
- [x] **VII. i18n:** todo texto novo em `ui.json`, frases completas com plural
- [x] **VIII. Offline e gratuito:** sem rede, sem dependência nova
- [x] **IX. Testes primeiro:** teste do `marketRowOf` no motor; testes de UI do modal, da linha clicável, do Início e da Escalação antes/junto

Pós-design: todos os gates continuam passando; sem violações a justificar.

## Project Structure

### Documentation (this feature)

```text
specs/026-telas-do-clube-dia-a-dia/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── squad-player-modal.md
│   ├── home-blocks.md
│   └── lineup-screen.md
└── tasks.md             # gerado por /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/
├── src/market/search.ts                  # + marketRowOf(context, playerId)
├── src/index.ts (ou market/index.ts)     # exporta marketRowOf
└── test/market-row-of.test.ts
packages/i18n/locales/pt-BR/
├── ui.json                               # chaves novas (modal do jogador, avisos, Início)
└── release-notes.json                    # + itens da 026 na nota 1.0.0
apps/web/src/
├── app/jogo/page.tsx (+ page.module.css)             # Início: blocos novos
├── app/jogo/elenco/page.tsx (+ page.module.css)      # sem coluna de ações, linha clicável
├── app/jogo/escalacao/page.tsx (+ page.module.css)   # toolbar, campo, "Fora da relação"
├── ui/PlayerModal.tsx (+ .module.css)                # modal do jogador com ações (novo)
├── ui/PlayerDetails.tsx                              # passa a servir só a Escalação ou é absorvido
├── ui/DataTable.tsx                                  # célula "nome" como botão sem duplicar o clique
├── ui/NextMatchCard.tsx (+ .module.css)              # cartão do próximo jogo (novo)
├── ui/{MarketNotice,SquadChangeNotice}.tsx, board/*, fans/*  # avisos e cartões migram para Notice/Meter/Badge
├── ui/Pitch.tsx, LineupList.tsx, LineupIssues.tsx    # visual novo, mesma lógica
├── ui/tips/catalog.ts                                # âncoras novas
apps/web/test/
├── ui/player-modal.test.tsx, squad.test.tsx, home.test.tsx, lineup-*.test.tsx
├── flows/disposal.test.tsx                           # seletores atualizados
apps/web/e2e/
├── lineup.spec.ts, layout.spec.ts (larguras 1 440/1 280/1 024), a11y.spec.ts
```

**Structure Decision**: monorepo existente; trabalho concentrado em `apps/web/src/app/jogo/{,elenco,escalacao}` e `apps/web/src/ui/`, com um helper de motor e chaves de i18n.

## Complexity Tracking

Sem violações da constituição a justificar.
