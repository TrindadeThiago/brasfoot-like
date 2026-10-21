# Implementation Plan: Mata-mata e copa nacional

**Branch**: `018-mata-mata-copa-nacional` | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/018-mata-mata-copa-nacional/spec.md`

## Summary

O formato `knockout` sai da lista de reservados do formato de mod e passa a descrever uma copa só
com dados: fases (jogo único ou ida e volta, critérios de desempate, mando, campo neutro, prêmio),
entradas escalonadas por fase e agenda. A copa é uma competição secundária da 017: vira uma
`LeagueSeason` com uma `Season` eliminatória (rodada = perna da fase, `fixtures` vazias até o
sorteio) e um `bracket` com as fases e os confrontos sorteados. Quase tudo o que a 017 construiu
(dia de jogos, cartões, lesões, condição física, bilheteria, torcida, diretoria, manchetes) vale
para a copa sem reescrita; o que é novo é o sorteio sob demanda, a decisão do confronto e os
prêmios.

O motor de partida não muda nos 90 minutos. A decisão é uma extensão ativada por um `decider` na
entrada da partida: se o agregado segue empatado, o relógio continua em dois tempos de 15 minutos
(prorrogação) e depois numa disputa de pênaltis, passo a passo, que a rodada ao vivo exibe
cobrança a cobrança e que o modo direto calcula igual. O banco padrão ganha a copa nacional
(40 clubes, 6 fases, Série A entra na fase de 32) por uma opção do gerador, e o save v13 só
acrescenta o histórico de copas. Telas novas: chaveamento, resultados por fase, painel de pênaltis
e aba de copas no histórico. Detalhes em [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.x (`strict`), Node 22

**Primary Dependencies**: motor, save, i18n, default-mod, modkit do workspace; Next.js 16.4 (static
export), React 19.3; Zod. Nenhuma dependência nova.

**Storage**: save v13 no IndexedDB (`cupHistory`; a copa vive em `competitions`); migração v12 → v13;
formato de mod ganha `format.type: "knockout"`

**Testing**: Vitest (motor, validação, save, app); simulação de 1.000 copas; 10 temporadas com liga
e copa; teste de equivalência da liga sem copa; Playwright com a copa e a disputa de pênaltis ao vivo

**Target Platform**: navegadores modernos, desktop ≥ 1280px

**Project Type**: biblioteca (motor) + pacote de save + mod padrão + aplicação web estática + ferramentas

**Performance Goals**: 1.000 copas simuladas em menos de 5 min; sorteio de uma fase < 1 ms; o
dia de jogos com a copa continua < 300 ms; cada simulação de 30 temporadas continua < 120 s

**Constraints**:

- Determinismo: sorteio e pênaltis só por PRNG com fork próprio; clubes em ordem de id; ao vivo = direto.
- Os 90 minutos da partida não mudam (sem `decider`, resultado idêntico ao de hoje).
- Liga sem copa idêntica à versão anterior (SC-007).
- i18n em todos os textos; nomes de fases e da copa vêm do banco.
- Mods antigos (sem copa) continuam válidos.

**Scale/Scope**: copa padrão com 40 clubes, 41 jogos por edição (7 datas)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação pré-pesquisa e pós-design (ambas ✅):

- [x] **I. Motor separado:** sorteio, chaveamento, prorrogação, pênaltis e prêmios no motor; save
  orquestra; a UI só exibe.
- [x] **II. Determinismo:** forks `${seed}:cup:…:draw:${fase}` e `${seed}:shootout:${ordem}`;
  clubes sempre em ordem de id; ao vivo e direto no mesmo `advanceMatch`; teste de repetição com
  salvar e carregar no meio da copa.
- [x] **III. Dados, não código:** fases, entradas, mando, critérios, prêmios, agenda e campo neutro
  são dados com schema Zod e erros por arquivo/campo (`knockout.*`); nenhuma copa tratada por nome.
- [x] **IV. Sem conteúdo protegido:** a copa padrão é fictícia (nome do banco de nomes do país).
- [x] **V. Balanceamento verificável:** `knockout/long-run.test.ts` (1.000 copas) com faixas
  declaradas, 10 temporadas com liga e copa, e os testes de 30 temporadas existentes com a copa no
  banco padrão; prêmios calibrados contra a folha.
- [x] **VI. Saves versionados:** v13 com migração e fixtures (v12 no início, meio e fim e com copa
  em andamento).
- [x] **VII. i18n:** o motor produz eventos e dados (`shootout_kick`, `decision`, fatos de copa);
  os textos ficam em `ui.json` e `errors.json`.
- [x] **VIII. Offline e gratuito:** tudo local.
- [x] **IX. Testes primeiro no motor:** prorrogação, pênaltis, sorteio, `tieState`, validação e
  migração começam pelo teste que falha.
- [x] **Stack (v1.1.0):** sem servidor; Biome; Vitest.

Nenhuma violação. Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/018-mata-mata-copa-nacional/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/
│   ├── knockout-api.md    # API do motor: partida, copa, integrações, erros
│   └── save-and-ui.md     # save v13, formato de mod, telas
├── checklists/requirements.md
└── tasks.md               # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/
├── match/
│   ├── types.ts  engine.ts  minute.ts   # half 3|4, statuses, shootout/decision, Decider, +1 substituição
│   ├── shootout.ts                       # novo: cobradores, cobranças, decisão antecipada
│   ├── tuning.ts  result.ts  rng.ts      # SHOOTOUT_TUNING; decision no resultado
├── knockout/                             # novo
│   ├── types.ts  rules.ts                # Bracket, Tie, KnockoutPhase; DEFAULT_KNOCKOUT
│   ├── draw.ts                           # drawPhase, seeded, relaxamento
│   ├── bracket.ts                        # createCupSeason, ensurePhaseDrawn, phaseParticipants
│   ├── tie.ts                            # tieState, deciderFor, phaseWinners, cupChampion
│   ├── prizes.ts                         # cupPrizes
│   └── history.ts                        # CupHistoryEntry, cupReached
├── season/{types,fixture,live-round,record}.ts   # bracket, Fixture.tie, decider, decision no registro
├── model/{schemas,types,catalogs}.ts     # format união, knockout fora de RESERVED_FORMAT_TYPES
├── validation/{issues,structural}.ts  validation/semantic/knockout.ts  # knockout.*
├── calendar/season-calendar.ts           # rounds = Σ legs, gapWeeks
├── career/{season-state,day,turnover,history}.ts  # copa no dia, prêmios, virada, histórico
├── finance/round.ts                      # bilheteria neutra dividida, prêmios
├── fans/{mood,types,rules}.ts  board/{confidence,goals,rules,types}.ts  news/{facts,round,types,rules}.ts
├── worldgen/generate.ts  name-banks/*.json        # opção cup, nome da copa
└── serialize/bank-files.ts                        # inalterado (copa é competição)
packages/engine/test/{match,knockout,validation,career,calendar}/*.test.ts
packages/engine/test/fixtures/cup-bank.ts          # banco pequeno de copa para os testes

mods/default/competitions.json  (regenerado com a copa)  mods/exemplo/competitions.json
packages/save/src/{format,create,migrate,career,index}.ts  (+ testes, fixtures v12)
packages/save/test/equivalence.test.ts             # banco sem a copa
packages/i18n/locales/pt-BR/{ui,errors}.json
docs/mod-format.md  docs/design.md
apps/web/src/
├── game/{GameProvider,useDivision,selectors}.ts*  useLiveRound.ts
├── ui/cup/{Bracket,PhaseResults,ShootoutPanel,CupHistory}.tsx  ui/{LiveGrid,CompetitionSelect}.tsx
├── app/jogo/{page,competicao/**,calendario,rodada,historico,fim-de-temporada}/
apps/web/test/flows/cup.test.tsx  apps/web/e2e/cup.spec.ts
tools/src/{gen-default-bank,simulate-world,simulate-economy}.ts
```

**Structure Decision**:

- A copa é um módulo do motor (`knockout/`) que lê e escreve só o `bracket` e as `fixtures` da
  `Season`; a decisão do jogo mora no motor de partida (extensão por `decider`), para o ao vivo e o
  direto serem o mesmo código.
- `season/` ganha só campos opcionais (`bracket`, `Fixture.tie`, `decision`), sem mudar o
  comportamento da liga.
- O dia de jogos da 017 continua único; a copa entra como mais um slot, com sorteio sob demanda e
  prêmios depois da rodada.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Mudar o relógio da partida quebra os 90 minutos | Primeira tarefa: congelar resultados de partidas (seeds fixas) antes de mexer no motor e provar a identidade sem `decider` |
| O banco padrão com copa quebra dezenas de testes que assumem uma só competição | Opção `cup` do gerador desligada por padrão; só `mods/default` a ativa; lista de testes afetados no contrato e atualização no mesmo PR |
| Desgaste da copa desequilibra a liga (condição física, lesões) | Simulação de 10 temporadas com liga e copa e testes de 30 temporadas com limites existentes |
| Pênaltis ao vivo confusos na interface | Painel dedicado, testes de fluxo e e2e do critério de aceite 3 |
| Prêmios/bilheteria da copa desequilibram a economia | Calibração com `sim:economy`, prêmio total pequeno frente à folha |

## Complexity Tracking

Sem violações da constituição.
