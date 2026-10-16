# Implementation Plan: Escalação e táticas

**Branch**: `005-escalacao-taticas` | **Date**: 2026-10-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-escalacao-taticas/spec.md`

## Summary

O jogador passa a escalar o próprio clube. As regras (validação com severidades, ajuste automático
entre rodadas, reacomodação ao trocar de esquema e a escalação automática idêntica à do computador)
entram no motor, num módulo puro novo `packages/engine/src/lineup/`, construído sobre `autoLineup`,
`lineupForMatch`, `adequacy` e `slotValue` que já existem. O save sobe para a versão 2 com a
escalação do jogador (migração a partir da 1). No app, uma tela nova `/jogo/escalacao` (campo com
as vagas, banco, fora da relação, esquema, postura, "Escalar automaticamente", problemas), a tela
de elenco ganha filtros, a situação na escalação e o painel de detalhes do jogador, e "Simular
próxima rodada" usa a escalação do jogador e recusa escalação inválida. Detalhes em
[research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.x (`strict`), Node 22

**Primary Dependencies**: motor (`@brasfoot-like/engine`), `@brasfoot-like/save`,
`@brasfoot-like/i18n`; app Next.js 16.4 (static export), React 19.3; Zod no save. Nenhuma
dependência nova.

**Storage**: IndexedDB (save v2 com a escalação); `localStorage` para filtros/ordenação

**Testing**: Vitest (motor e save em Node; app com happy-dom + fake-indexeddb); Playwright para o
fluxo escalar → simular → recarregar

**Target Platform**: navegadores modernos, desktop ≥ 1280px

**Project Type**: biblioteca (motor, save) + aplicação web estática

**Performance Goals**: `validateLineup` < 1 ms por chamada (roda a cada mudança); trocar de
esquema/escalação automática < 50 ms; SC-004 (< 30 s só por teclado)

**Constraints**: determinismo (sem `Math.random`/`Date` no motor); nenhuma regra de jogo na UI;
static export; nenhuma string fora do i18n; atributos ocultos nunca exibidos

**Scale/Scope**: elencos de ~25–30 jogadores; 6 esquemas; 1 tela nova + 2 alteradas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação pré-pesquisa e pós-design (ambas ✅):

- [x] **I. Motor separado:** validação, ajuste, troca de esquema e escalação automática ficam no
  motor (`lineup/`); a UI só chama a API pública.
- [x] **II. Determinismo:** todas as funções novas são puras, com desempates por id; nenhuma
  aleatoriedade nova.
- [x] **III. Dados, não código:** esquemas, posturas e adequação continuam vindo do catálogo do
  motor; nada fixo na UI.
- [x] **IV. Sem conteúdo protegido:** só o banco fictício.
- [x] **V. Balanceamento verificável:** a escalação automática do jogador é a mesma do computador
  (teste de igualdade); uma temporada inteira simulada com a escalação do jogador mantida pelo
  ajuste automático roda nos testes (SC-005).
- [x] **VI. Saves versionados:** formato v2 com migração 1 → 2 e teste com save v1 real da 004.
- [x] **VII. i18n:** textos novos em `ui.json`; teste de literais continua valendo.
- [x] **VIII. Offline e gratuito:** nada de rede; tela nova entra no precache do build.
- [x] **IX. Testes primeiro no motor:** `lineup/` começa por testes (validação, ajuste, troca de
  esquema, igualdade com o computador).
- [x] **Stack (v1.1.0):** sem APIs de servidor; Biome; Vitest.

Nenhuma violação; Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/005-escalacao-taticas/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/
│   ├── lineup-api.md      # API nova do motor
│   └── ui.md              # telas, interação e atalhos
├── checklists/requirements.md
└── tasks.md               # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/lineup/            # novo, puro
├── index.ts
├── validate.ts                        # validateLineup → { valid, issues }
├── adjust.ts                          # adjustLineup → { lineup, changes }
├── formation.ts                       # changeFormation, placePlayer (troca dois lugares)
└── auto.ts                            # managerAutoLineup (= lineupForMatch + postura)
packages/engine/test/lineup/*.test.ts

packages/save/src/
├── format.ts                          # SAVE_FORMAT_VERSION = 2; lineup, lineupNotice
├── create.ts                          # escalação inicial
└── migrate.ts                         # MIGRATIONS = [1 → 2]; validação da escalação
packages/save/test/migrate-v2.test.ts (+ fixture v1)

packages/i18n/locales/pt-BR/ui.json    # textos da escalação, filtros, detalhes, problemas

apps/web/src/
├── app/jogo/escalacao/page.tsx        # tela nova
├── app/jogo/elenco/page.tsx           # filtros, situação, detalhes
├── game/GameProvider.tsx              # setLineup, autoLineup, dismissNotice, simular com escalação
├── game/lineup-selection.ts           # estado da seleção em dois passos (só UI)
├── ui/Pitch.tsx  ui/LineupList.tsx  ui/PlayerDetails.tsx  ui/LineupIssues.tsx
└── ui/AppHeader.tsx                   # 5 telas, atalhos 1–5
apps/web/test/{flows,ui}/*.test.tsx   apps/web/e2e/lineup.spec.ts
```

**Structure Decision**: as regras novas ficam num módulo do motor ao lado de `match/` e `season/`,
porque dependem dos dois e serão usadas também pela rodada ao vivo (006). O save só guarda e migra;
o app só apresenta e despacha ações.

## Complexity Tracking

Sem violações da constituição.
