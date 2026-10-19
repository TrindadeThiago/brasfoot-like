# Implementation Plan: Evolução, aposentadoria e renovação do mundo

**Branch**: `009-evolucao-renovacao` | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/009-evolucao-renovacao/spec.md`

## Summary

O banco do save passa a ser o mundo vivo da carreira. Um módulo novo do motor, `renewal/`, faz os
jogadores evoluírem duas vezes por temporada (na rodada central, dentro do fechamento da rodada, e
na virada) por uma curva de idade rumo ao potencial, acelerada pela minutagem; aposenta veteranos;
gera jovens por clube com nomes do país; mantém os elencos dentro de tamanho e cobertura mínimos
(reposição e dispensa); e um regulador ajusta a geração para manter a distribuição de forças. As
etapas entram na virada da 007 antes dos calendários e do patrocínio da 008. Save v5 com estado de
renovação; UI com a coluna de evolução e o resumo de mudanças do elenco. Um teste de 30 temporadas
fixa as faixas e também roda a economia da 008. Detalhes em [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.x (`strict`), Node 22

**Primary Dependencies**: motor, save, i18n do workspace; Next.js 16.4 (static export), React
19.3; Zod. Nenhuma dependência nova.

**Storage**: save v5 no IndexedDB (`renewal`; `bank` como mundo vivo); migração v4 → v5

**Testing**: Vitest (motor, save, app com happy-dom + fake-indexeddb); teste de 30 temporadas
(renovação + economia); Playwright no fluxo da virada

**Target Platform**: navegadores modernos, desktop ≥ 1280px

**Project Type**: biblioteca (motor) + pacote de save + aplicação web estática + ferramentas

**Performance Goals**: evolução de ~1.000 jogadores < 50 ms; virada completa < 2 s na app; 30
temporadas no teste < 120 s

**Constraints**: determinismo (PRNG por jogador e momento; nada depende de ordem de iteração);
sem `**`/funções transcendentais no motor; banco sempre válido pelo schema; nenhuma regra na UI;
i18n

**Scale/Scope**: ~1.000 jogadores, ~120 jovens por temporada, 30 temporadas no teste

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação pré-pesquisa e pós-design (ambas ✅):

- [x] **I. Motor separado:** evolução, aposentadoria, jovens, elencos e regulador no motor; save
  orquestra; UI só exibe.
- [x] **II. Determinismo:** PRNG derivado de seed + temporada + momento + id do jogador; regulador
  sem aleatoriedade; jogadores processados por id.
- [x] **III. Dados, não código:** bancos de nomes por país no mod (opcional, Zod); regras de
  evolução/renovação como constantes versionadas e testadas (o prompt não pede que sejam
  moddáveis; ficam centralizadas para virar dados se preciso).
- [x] **IV. Sem conteúdo protegido:** nomes vêm do banco fictício.
- [x] **V. Balanceamento verificável:** `renewal/long-run.test.ts` com limites R9 declarados e a
  economia da 008 no mesmo teste; `sim:world`.
- [x] **VI. Saves versionados:** v5 com migração v4 → v5 e fixtures; cadeia v1 → v5.
- [x] **VII. i18n:** textos novos em `ui.json`/`errors.json`.
- [x] **VIII. Offline e gratuito:** tudo local.
- [x] **IX. Testes primeiro no motor:** cada arquivo de `renewal/` começa pelo teste.
- [x] **Stack (v1.1.0):** sem servidor; Biome; Vitest.

Nenhuma violação; Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/009-evolucao-renovacao/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/
│   ├── renewal-api.md     # API do motor
│   └── save-and-ui.md     # save v5, nomes no mod, telas
├── checklists/requirements.md
└── tasks.md               # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/
├── renewal/                  # novo
│   ├── types.ts  rules.ts    # RenewalState, RegulatorState, WorldMeasure, EvolutionRecord, …; regras
│   ├── measure.ts            # measureWorld, percentis
│   ├── evolution.ts          # minutesInRounds, evolutionDelta, evolvePlayers, midSeasonRound
│   ├── retirement.ts         # retirePlayers
│   ├── youth.ts              # generateYouth (reusa personName/pickTraits/birthDateFor do worldgen)
│   ├── squads.ts             # balanceSquads (reposição/dispensa)
│   ├── regulator.ts          # regulate
│   ├── names.ts              # nameBankFor, DEFAULT_NAME_BANK
│   └── turnover.ts           # etapas evolve-players … balance-squads
├── worldgen/players.ts       # exporta helpers de nome, data e características
├── finance/round.ts          # completeCareerRound/advanceCareer com mundo e evolução do meio
├── career/{types,turnover}.ts# world e renewal no contexto; etapas novas na ordem padrão
├── model/schemas.ts          # countries[].names
└── index.ts
packages/engine/test/renewal/*.test.ts   mods/default/countries.json (gen:default-bank)

packages/save/src/{format,create,migrate,career}.ts  (+ testes, fixtures v4)
packages/i18n/locales/pt-BR/{ui,errors}.json
apps/web/src/
├── game/GameProvider.tsx     # rodada e virada com mundo/renovação; dismissSquadNotice
├── app/jogo/elenco/page.tsx  # coluna Evolução
├── ui/SquadChangeNotice.tsx  # cartão da Início
└── ui/PlayerDetails.tsx
apps/web/test/flows/renewal.test.tsx   apps/web/e2e (atualizações)
tools/src/simulate-world.ts   # pnpm sim:world
```

**Structure Decision**: `renewal/` é um módulo próprio, ligado à carreira pela evolução do meio
(no fechamento da rodada) e pelas etapas da virada — o mesmo padrão de `finance/`. O mundo vivo é
o `CompletedBank` do save, para que partidas, escalações, salários e telas continuem lendo os
jogadores do mesmo lugar.

## Complexity Tracking

Sem violações da constituição.
