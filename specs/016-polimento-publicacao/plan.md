# Implementation Plan: Polimento e publicação

**Branch**: `016-polimento-publicacao` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/016-polimento-publicacao/spec.md`

## Summary

Última feature do Marco 6: o jogo passa a se chamar **Treinador FC** e vai ao ar, versão 1.0.0,
na Vercel. Para "um estranho jogar sem explicação": boas-vindas e dicas contextuais nas telas
reais (escalação, rodada, tabela, mercado, diretoria); tela de Configurações (velocidade e pausa
da rodada ao vivo, tema claro/escuro/sistema, idioma, reativar dicas); atalhos vindos de uma
fonte única que também gera a ajuda, disponível com `?` em todas as telas; revisão de
acessibilidade (contraste medido nos dois temas, foco visível, fluxo só com teclado, varredura
axe no e2e, movimento reduzido); versão visível, notas de versão offline e aviso de atualização
do service worker sem trocar a versão no meio da rodada. Revisão de desempenho com limites
medidos em carreiras de 30 temporadas e de textos (chaves sem uso, nome, glossário). Publicação
por GitHub Actions: CI em PRs, e release por tag que roda todos os gates e só então faz
`vercel deploy` do build testado. Nenhuma mudança no motor nem no formato do save.

## Technical Context

**Language/Version**: TypeScript 6 (`strict`), Node ≥ 22.13

**Primary Dependencies**: Next.js 16.4 (static export), React 19.3, Zod 4 (adicionado à web e
ao i18n para preferências e notas de versão), Playwright + `@axe-core/playwright` (novo, dev),
Vercel CLI (só no workflow de release, versão fixa)

**Storage**: localStorage (preferências, existente; novos campos), IndexedDB (saves, sem
mudança), Cache Storage (service worker)

**Testing**: Vitest (unidade/fluxos com happy-dom), Playwright (e2e, a11y, teclado, offline,
rede), simulações `sim:world`/`sim:economy`

**Target Platform**: navegadores modernos (desktop), site estático na Vercel

**Project Type**: monorepo pnpm — `apps/web` (UI), `packages/engine`, `packages/save`,
`packages/i18n`, `packages/modkit`, `tools`

**Performance Goals** (research.md R1, carreira de 30 temporadas): virada < 400 ms e rodada
< 250 ms no motor; pela interface, rodada direta < 1 s e virada < 2 s; indicação de progresso
acima de 1 s

**Constraints**: offline após a primeira visita; sem rede de terceiros; sem telemetria; textos
só por i18n; nada visível com "brasfoot"; publicação só depois de todos os gates

**Scale/Scope**: ~20 telas; 8 dicas; ~35 atalhos; 3 rotas novas; 2 workflows

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Motor separado:** nada muda no motor; dicas, tema, atalhos e configurações vivem em
  `apps/web`
- [x] **II. Determinismo:** sem impacto no motor; capturas usam seed fixa
- [x] **III. Dados, não código:** catálogo de dicas, registro de atalhos e notas de versão como
  dados; notas validadas por Zod
- [x] **IV. Sem conteúdo protegido:** nome próprio (Treinador FC), sem "brasfoot" visível
  (verificado no build), capturas do banco fictício, aviso de conteúdo na página Sobre
- [x] **V. Balanceamento verificável:** `sim:world`/`sim:economy` de 30 temporadas viram gate da
  release; limites de desempenho com teste
- [x] **VI. Saves versionados:** formato do save inalterado; preferências fora do save, lidas com
  padrão seguro
- [x] **VII. i18n:** todos os textos novos em `ui.json`; notas por idioma; seletor de idioma
  alimentado pelas locales; teste falha com literal e com chave sem uso
- [x] **VIII. Offline e gratuito:** SW mantém offline (atualização sob confirmação); Vercel
  gratuita, sem servidor; teste de "nenhuma origem de terceiros"
- [x] **IX. Testes primeiro no motor:** sem código novo de motor; testes de desempenho do motor
  adicionados

Pós-design: sem violações; nada em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/016-polimento-publicacao/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── ui.md
│   └── release.md
├── checklists/requirements.md
├── usability.md          # resultado do teste com estranho (na implementação)
└── tasks.md              # /speckit-tasks
```

### Source Code (repository root)

```text
.github/workflows/
├── ci.yml                         # novo: gates em PR/push
└── release.yml                    # novo: gates + check-release + vercel deploy (tag v*)

package.json                       # version 1.0.0; scripts check-release, screenshots

apps/web/
├── next.config.ts                 # env NEXT_PUBLIC_APP_VERSION
├── public/
│   ├── sw.js                      # atualização sob confirmação (SKIP_WAITING)
│   ├── manifest.webmanifest       # novo: Treinador FC
│   ├── icons/                     # novo
│   ├── screenshots/               # novo: gerado por pnpm screenshots
│   └── vercel.json                # novo: headers
├── src/
│   ├── app-info.ts                # novo: APP_NAME (i18n), APP_VERSION
│   ├── app/
│   │   ├── layout.tsx             # script de tema no <head>, manifest, providers globais
│   │   ├── page.tsx               # rodapé, boas-vindas, aviso de novidades
│   │   ├── register-sw.tsx        # detecta worker em espera
│   │   ├── configuracoes/page.tsx # novo
│   │   ├── notas-de-versao/page.tsx # novo
│   │   └── sobre/page.tsx         # novo
│   ├── storage/preferences.ts     # schema Zod, theme/locale/tips/lastSeenVersion
│   ├── styles/
│   │   ├── tokens.css             # tokens do tema claro
│   │   └── global.css             # focus-visible, reduced-motion
│   ├── ui/
│   │   ├── shortcuts.ts           # novo: registro SHORTCUTS
│   │   ├── useShortcuts.ts        # por id, escopo
│   │   ├── ShortcutsHelp.tsx      # gerada do registro, global
│   │   ├── ThemeProvider.tsx      # novo
│   │   ├── UpdateNotice.tsx       # novo
│   │   └── tips/                  # novo: catalog.ts, TipsProvider.tsx, TipHost.tsx
│   └── game/                      # GameLayout: botões Configurações/Atalhos, escopos
├── test/
│   ├── i18n/no-literals.test.ts   # + chaves sem uso, + "brasfoot" em textos
│   ├── ui/contrast.test.ts        # novo
│   ├── ui/shortcuts-registry.test.ts # novo
│   ├── ui/tips.test.tsx           # novo
│   ├── ui/settings.test.tsx       # novo
│   ├── storage/preferences.test.ts # novo
│   └── flows/performance.test.tsx # + save de 30 temporadas
└── e2e/
    ├── a11y.spec.ts               # novo (axe, 2 temas)
    ├── keyboard.spec.ts           # novo
    ├── first-run.spec.ts          # novo
    ├── settings.spec.ts           # novo
    ├── update.spec.ts             # novo (SW em espera → recarregar)
    └── no-third-party.spec.ts     # novo

packages/i18n/
├── locales/pt-BR/ui.json          # app.name "Treinador FC", settings.*, tips.*, about.*, notes.*
├── locales/pt-BR/release-notes.json # novo
└── src/                           # LOCALES, releaseNotes(locale) com Zod

packages/save/test/performance-30.test.ts # novo

tools/src/
├── check-release.ts               # novo
└── screenshots.ts                 # novo

docs/
├── design.md                      # §15: nome decidido; §13 M6 publicado
└── glossario.md                   # novo
```

**Structure Decision**: tudo no `apps/web` (UI), `packages/i18n` (textos, notas, locales) e
`tools` (release/capturas), mais `.github/workflows`. Motor e formato do save intocados.

## Fases de implementação (ordem sugerida para as tarefas)

1. **Fundação**: versão 1.0.0 + `app-info`; preferências com schema; registro de atalhos e
   `useShortcuts` por id (sem mudar teclas); nome "Treinador FC" e verificação de "brasfoot".
2. **US2 Configurações + tema** (P1): tokens claros, script de tema, `ThemeProvider`, tela.
3. **US1 Dicas** (P1): catálogo, provider, host, boas-vindas, âncoras nas telas.
4. **US6 Publicação** (P1): `/sobre/`, manifesto, capturas, `vercel.json`, workflows,
   `check-release`.
5. **US3 Atalhos/ajuda global** (P2), **US4 Acessibilidade** (P2: contraste, foco, reduced
   motion, axe, teclado, revisão de consistência), **US7 Desempenho e textos** (P2).
6. **US5 Versão e notas** (P3): rota, aviso de novidades, atualização do SW.
7. **Fechamento**: revisão de textos + glossário, design.md, teste de usabilidade, gates.

## Complexity Tracking

Sem violações da constituição.
