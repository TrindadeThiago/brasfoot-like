# Implementation Plan: Telas de entrada e configuração

**Branch**: `031-telas-de-entrada-e-configuracao` | **Date**: 2026-10-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/031-telas-de-entrada-e-configuracao/spec.md`

## Summary

Refaz as telas de fora da carreira (menu inicial, nova carreira, carreiras salvas, configurações,
mods, sobre, notas de versão, ajuda de atalhos e aviso de atualização) sobre a fundação da 025 e os
padrões das 026 a 030. Essas telas ainda usam `<main>` e CSS próprios, sem os componentes-base.

Abordagem técnica: nada muda no motor, nos saves, nos mods nem nas preferências. A pesquisa (R1 a
R12) mostrou que (a) a Nova carreira tem um único erro de texto no rodapé, sem ligação ao campo nem
foco, e a busca e a contagem só aparecem em mundos de vários países; (b) o rodapé com o clube e o
botão não é fixo; (c) o menu não mostra a quantidade de carreiras; (d) as Carreiras salvas e os Mods
têm estado vazio só em texto; (e) a ajuda de atalhos e o aviso de atualização já existem e só
precisam do visual novo. A validação do formulário vira uma função pura (`new-career-form.ts`) que
devolve os erros por campo, e a tela usa `Field` (028/029), foco no primeiro erro e rodapé fixo. A
quantidade de carreiras e a ordenação vêm de uma função pura (`saves-view.ts`). Sem dependência
nova.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Next.js 16 (export estático), Node 22

**Primary Dependencies**: CSS Modules; componentes-base da 025 a 030 (`Card`, `Notice`, `Badge`, `EmptyState`, `DataTable`, `Dialog`, `Field`, `Button`, `Tabs`); sem biblioteca nova

**Storage**: nenhuma mudança (saves, mods e preferências como hoje)

**Testing**: Vitest + happy-dom + Testing Library; Playwright (`first-run`, `career`, `save-file`, `mods`, `settings`, `update`, `offline`, `a11y`, `layout`)

**Target Platform**: navegadores desktop, PWA offline

**Project Type**: web (monorepo pnpm)

**Performance Goals**: criar carreira com 440 clubes em menos de 0,5 s; filtro da lista abaixo de 200 ms; abertura de cada tela até 10% acima da linha de base

**Constraints**: paridade funcional; ações de mockup que o jogo não tem não viram função; i18n; contraste 016; erro e estado nunca só em cor; sem rolagem horizontal da página em 1 440/1 280/1 024 px; a 768 px vale a estrutura da 025

**Scale/Scope**: 9 telas e diálogos; ≈ 1 100 linhas de página hoje (`page`, `nova-carreira`, `carreiras`, `configuracoes`, `mods`, `sobre`, `notas-de-versao`) mais `ShortcutsHelp`, `UpdateNotice`, `CsvPanel`, `ValidationReport`; 2 módulos puros novos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Motor separado:** nenhuma regra nova; validação do formulário e visão das carreiras são de exibição, em `apps/web/src/game/`, sem React/DOM nas funções puras
- [x] **II. Determinismo:** o motor não é tocado; a seed continua a mesma entrada de `createCareer`; um teste confirma que a mesma seed e o mesmo clube dão a mesma carreira
- [x] **III. Dados, não código:** países, divisões e clubes vêm do banco escolhido; nenhuma lista fixa no código
- [x] **IV. Sem conteúdo protegido:** capturas da página Sobre são do jogo com o banco fictício; nenhum nome ou escudo novo
- [x] **V. Balanceamento verificável:** não se aplica (sem mudança de regra)
- [x] **VI. Saves versionados:** sem mudança de formato; importar e exportar usam as mesmas funções de hoje
- [x] **VII. i18n:** todo texto novo em `ui.json` e `release-notes.json`, com plural
- [x] **VIII. Offline e gratuito:** sem dependência nova e sem rede
- [x] **IX. Testes primeiro:** testes unitários dos módulos puros antes das telas; testes de componente e e2e atualizados

Pós-design: todos os gates passam; sem violações a justificar.

## Project Structure

### Documentation (this feature)

```text
specs/031-telas-de-entrada-e-configuracao/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── baseline.md         # gerado na implementação (T001)
├── contracts/
│   ├── opening-and-saves.md
│   ├── new-career-screen.md
│   └── settings-mods-about.md
├── checklists/requirements.md
└── tasks.md            # gerado por /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/src/
├── app/
│   ├── page.tsx                        # menu: chamada, ações, quantidade, avisos
│   ├── nova-carreira/page.tsx          # formulário com Field, erros por campo, rodapé fixo
│   ├── carreiras/page.tsx              # cartões, estado vazio, diálogos
│   ├── configuracoes/page.tsx          # seções em Card
│   ├── mods/page.tsx                   # cartões, estado vazio
│   ├── sobre/page.tsx                  # estrutura nova
│   └── notas-de-versao/page.tsx        # versões recolhíveis, fase beta
├── game/
│   ├── new-career-form.ts              # NOVO: validação por campo, ordem do foco
│   └── saves-view.ts                   # NOVO: quantidade, rótulos de progresso, ordenação
├── ui/
│   ├── entry/                          # NOVO: EntryShell (cabeçalho das telas de fora), SaveCard, ClubPicker, ModCard
│   ├── ShortcutsHelp.tsx, UpdateNotice.tsx   # visual novo
│   └── mods/CsvPanel.tsx, ValidationReport.tsx  # visual novo
└── i18n/                               # só chaves novas em packages/i18n/locales/pt-BR/ui.json e release-notes.json
apps/web/test/
├── game/new-career-form.test.ts        # NOVO
├── game/saves-view.test.ts             # NOVO
├── ui/opening.test.tsx                 # NOVO (US1)
├── ui/new-career-form.test.tsx         # NOVO (US2)
├── ui/saves-screen.test.tsx            # NOVO (US3)
├── ui/settings-screen.test.tsx         # NOVO (US4)
├── ui/mods-screen.test.tsx             # NOVO (US5)
├── ui/about-notes.test.tsx             # NOVO (US6)
├── ui/shortcuts-update.test.tsx        # NOVO (US7)
└── flows/ (new-career, saves, mods, save-file, performance) atualizados
apps/web/e2e/                           # first-run, career, save-file, mods, settings, update, a11y, layout atualizados
```

**Structure Decision**: tudo na camada de apresentação (`apps/web`). O motor e os pacotes `save` e
`modkit` não mudam; `packages/i18n` ganha só chaves.

## Complexity Tracking

Sem violações da constituição a justificar.
