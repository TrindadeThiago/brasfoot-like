# Implementation Plan: Telas estreitas, acessibilidade e fechamento do marco

**Branch**: `032-telas-estreitas-e-fechamento` | **Date**: 2026-10-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/032-telas-estreitas-e-fechamento/spec.md`

## Summary

Fecha o Marco 10: adapta toda a interface a 768 px e abaixo, repete a revisão de acessibilidade da
016 nos dois temas, mede desempenho e tamanho contra as metas da 020 e as linhas de base das
features 025 a 031, audita a consistência com `docs/interface-nova.md`, revisa as dicas, a ajuda de
atalhos e o aviso de atualização, regenera a vitrine (capturas, ícones, README, `docs/design.md`),
revisa a nota única do 1.0.0 e prepara o lançamento: gates do release sobre a branch e o PR de
`release/v1.0.0` para a `main`.

Abordagem técnica: nada muda no motor, nas regras, nos saves nem nos dados. A pesquisa (R1 a R12)
mostrou que (a) a estrutura responsiva já existe (a barra lateral empilha a partir de 768 px e há
e2e em 1 440, 1 280, 1 024 e 768 px), mas só uma tela é conferida abaixo disso (Elenco a 600 px);
(b) a revisão de acessibilidade da 016 já tem as ferramentas (axe nos dois temas, teste de pares de
contraste dos tokens, e2e de teclado, regra global de movimento reduzido), que precisam apenas
cobrir as telas e os diálogos novos e checar ordem de tabulação, títulos e anúncios; (c) as metas de
desempenho estão em `SCALE_LIMITS` (020) e as linhas de base em cada `baseline.md`; (d) os gates do
release já existem em `.github/workflows/release.yml` e rodam por scripts (`pnpm sim:world`,
`pnpm sim:economy`, `pnpm check-release`, `pnpm test:e2e`); (e) o lançamento é a única parte
externa e só acontece sob pedido. O trabalho novo é de verificação automatizada (matriz de telas por
largura e tema, auditoria de estilo, revisão de dicas) mais correções de CSS e texto. Sem dependência
nova.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Next.js 16 (export estático), Node 22

**Primary Dependencies**: CSS Modules; componentes-base da 025 a 031; `@axe-core/playwright` (já presente); sem biblioteca nova

**Storage**: nenhuma mudança (saves, mods e preferências como hoje)

**Testing**: Vitest + happy-dom; Playwright (Chromium; Firefox só para o teste entre navegadores); `pnpm sim:world`, `pnpm sim:economy`, `pnpm check-release`

**Target Platform**: navegadores desktop e tablet (a partir de 768 px), PWA offline

**Project Type**: web (monorepo pnpm)

**Performance Goals**: `SCALE_LIMITS` da 020 (dia 600 ms, virada 6 000 ms, heap 1 GiB, save de 12,5 MB no início da 31ª temporada e 42 MB na última rodada, export de 6 MB); abertura de cada tela até 10% acima da linha de base da sua feature; pacote dentro do limite do R6

**Constraints**: sem mudança de motor, regra, save ou dado; offline depois do primeiro carregamento; todo texto pelo i18n; contraste 4,5:1 e 3:1; sem rolagem horizontal da página de 768 px em diante; a `main` congelada até o PR final

**Scale/Scope**: ≈ 60 telas, abas e diálogos revistos; ≈ 140 arquivos de estilo; 11 dicas; 4 fluxos por teclado; 5 capturas e 2 ícones; 2 documentos e 1 nota de versão; 6 gates de release

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Motor separado:** nenhuma regra nova; as correções são de estilo e de texto na camada de interface
- [x] **II. Determinismo:** o motor não é tocado; as simulações de 30 temporadas do gate provam que os resultados não mudam
- [x] **III. Dados, não código:** nenhum dado novo; a auditoria de estilo não cria lista fixa de clubes ou países
- [x] **IV. Sem conteúdo protegido:** capturas geradas com o banco fictício; nenhum nome ou escudo novo
- [x] **V. Balanceamento verificável:** nenhuma faixa numérica muda; `SCALE_LIMITS` não é alterado (mudar um limite exigiria justificar, e não há motivo)
- [x] **VI. Saves versionados:** sem mudança de formato; o tamanho do save é conferido como "igual ao de antes"
- [x] **VII. i18n:** todo texto novo ou alterado em `ui.json` e `release-notes.json`
- [x] **VIII. Offline e gratuito:** sem dependência nova e sem rede; o e2e offline continua verde
- [x] **IX. Testes primeiro:** os testes de matriz (telas × larguras × temas), de auditoria de estilo e de dicas vêm antes das correções que eles apontam

Pós-design: todos os gates passam; sem violações a justificar.

## Project Structure

### Documentation (this feature)

```text
specs/032-telas-estreitas-e-fechamento/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── baseline.md         # gerado na implementação (T001)
├── contracts/
│   ├── responsive-layout.md
│   ├── accessibility-review.md
│   └── release-process.md
├── checklists/requirements.md
└── tasks.md            # gerado por /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── styles/                          # tokens, global: ajustes de contraste, movimento e quebras
│   ├── app/, ui/                        # correções de CSS e texto apontadas pelas revisões
│   └── ui/tips/catalog.ts, TipHost.tsx  # dicas reancoradas e posicionadas em tela estreita
├── public/screenshots/, public/icons/   # capturas regeneradas; ícones revistos
├── test/
│   ├── ui/style-audit.test.ts           # NOVO: cores, espaçamentos e tamanhos soltos; CSS sem uso
│   ├── ui/tips-anchors.test.tsx         # NOVO: cada dica aponta para um elemento que existe
│   ├── ui/contrast.test.ts              # ampliado: pares novos (selos, avisos, estados)
│   └── ui/headings.test.tsx             # NOVO: um h1 por tela e níveis sem salto
└── e2e/
    ├── responsive.spec.ts               # NOVO: todas as telas e diálogos em 1 440, 1 024, 768, 600 e zoom 200%
    ├── a11y.spec.ts, keyboard.spec.ts   # ampliados: telas e diálogos que faltam, ordem de tabulação
    ├── reduced-motion.spec.ts           # NOVO: movimento reduzido nas telas com animação
    └── layout.spec.ts                   # reaproveitado
docs/design.md, README.md                # estado do marco, numeração, capturas
packages/i18n/locales/pt-BR/release-notes.json   # nota do 1.0.0 revisada
tools/src/screenshots.ts                 # capturas da vitrine (tema escuro) e ícones
```

**Structure Decision**: tudo na camada de apresentação (`apps/web`) e em documentos. Motor, `save`,
`modkit` e `i18n` (só chaves e a nota) não mudam de comportamento. O lançamento usa o workflow de
release que já existe, sem alteração.

## Complexity Tracking

Sem violações da constituição a justificar.
