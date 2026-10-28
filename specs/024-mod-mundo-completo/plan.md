# Implementation Plan: Mod mundo completo do futebol

**Branch**: `024-mod-mundo-completo` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/024-mod-mundo-completo/spec.md`

## Summary

O mod é **um mundo gerado por dados**: um perfil descreve as seis confederações do futebol, os países
de cada uma (com força, idioma e tamanho da pirâmide) e a ferramenta monta o pacote com o que o motor
já sabe fazer (vários países 020, vagas 021, continentais 022, estaduais 023). Nada de regra nova de
jogo; o trabalho é **geração, dados reais de lugares, escala e entrega**:

- **Perfil do mundo** (R1): `WorldProfile` com confederações, países e níveis (`tier`) que definem
  pirâmide, número de clubes, força e economia. O perfil padrão tem ~43 países; o perfil `compacto`
  (~14 países) existe para testes rápidos. O Brasil é o país de maior detalhe: 4 divisões (a D em
  grupos regionais), 27 estaduais, copa e supercopa; os demais países sul-americanos seguem o prompt.
- **Geografia real** (R2): países, estados e cidades reais vêm de um conjunto de dados versionado no
  repositório (`geo/`), com validação de tamanho; clubes, competições e jogadores continuam fictícios.
- **Nomes por idioma** (R3): bancos de nomes de pessoas e de clubes por idioma (português, espanhol,
  inglês, francês, alemão, italiano, neerlandês, turco, árabe, russo, japonês, coreano, chinês e outros
  conforme o perfil), todos fictícios; troca por CSV (015) continua valendo.
- **Gerador de países** (R4, R5, R6): um gerador novo monta cada país a partir do perfil (sem clonar o
  banco padrão), reaproveitando elencos, rivalidades, economia em escala (020) e os estaduais (023).
- **Continentais por confederação** (R7): `continentalCompetitions` (022) é generalizada para receber
  ids, nomes e tamanhos por confederação; confederações são independentes e as vagas seguem a força.
- **Calendário** (R8): estaduais nas primeiras semanas, ligas depois, continentais no meio da semana.
- **Escala e pacote** (R9, R10): metas próprias do mundo completo, medidas e justificadas; limites de
  pacote revistos só se a medição pedir, com justificativa.
- **Determinismo e entrega** (R11, R12, R15): mesma seed, mesmos bytes; `pnpm gen:football-world` gera,
  valida e, opcionalmente, aplica CSV local. **Três tamanhos** (reduzido, médio e completo) são gerados
  **dentro do jogo**, na tela de nova carreira (R16), e também baixáveis como .zip na página de Mods,
  gerados no build e não versionados.
- **Princípio IV** (R13): a constituição registra que nomes de lugares não são conteúdo protegido, e o
  teste de bloqueio passa a distinguir lugares de clubes e competições.

Detalhes em [research.md](research.md); modelo em [data-model.md](data-model.md); contratos em
[contracts/](contracts/).

## Technical Context

**Language/Version**: TypeScript 6.0.x (`strict`), Node 22

**Primary Dependencies**: motor, modkit, save, i18n, tools do workspace; Next.js 16.4 (static export),
React 19.3; Zod; fflate (já usado pelo modkit). Nenhuma dependência nova.

**Storage**: formato de mod inalterado (`formatVersion: 1`) e **sem campo novo no save**; se a compactação do R9 for necessária, ela só deixa de gravar campos que já são opcionais (registros e linhas de jogadores de temporadas encerradas de países que o técnico não acompanha), com teste de abrir save antigo e de virar a temporada (Princípio VI), sem subir a versão do save; dados do gerador (geografia e bancos de nomes) são arquivos JSON do pacote do motor, fora do
mod e do save

**Testing**: Vitest (gerador, dados, validação, determinismo, blocklist, modkit, tools); simulação de
30 temporadas por perfil; Playwright com o mod `compacto` na página de Mods

**Target Platform**: navegadores modernos, desktop ≥ 1280px; ferramenta em Node 22

**Project Type**: biblioteca (motor) + ferramentas (CLI) + pacote modkit + aplicação web estática

**Performance Goals**: metas **próprias** do mundo completo (R9), calibradas na linha de base: dia de
jogos, virada, heap e tamanho de save, mais o tempo de geração do pacote (alvo: abaixo de 60 s).
As metas da 020 (400 clubes) seguem valendo sem piora para os mundos menores.

**Constraints**:

- Determinismo: toda aleatoriedade vem de forks da seed por país e por etapa; ordem de países,
  confederações, ids e arquivos fixa; nenhum `Date`/`Math.random` no motor; zip com data fixa.
- Banco padrão, mods existentes e saves antigos idênticos aos de hoje (nenhum caminho novo roda sem o
  perfil).
- Nenhum nome real de clube, competição ou jogador; só países, estados e cidades reais.
- i18n: textos novos de interface (página de Mods) em `ui.json`; nomes de competições, países e clubes
  vêm do pacote.

**Scale/Scope**: perfil padrão ~43 países em 6 confederações; ordem de grandeza de 1 700 clubes (Brasil
~620, com os regionais) e 35 000 jogadores; 30 temporadas. Números finais saem da linha de base.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Motor separado:** o gerador fica em `worldgen/` do motor (TS puro); a ferramenta e a UI só o
  chamam.
- [x] **II. Determinismo:** forks da seed por país/etapa; teste de dois geradores iguais byte a byte e de
  seeds diferentes; o teste de arquitetura cobre o diretório novo.
- [x] **III. Dados, não código:** perfil, países, geografia e nomes são dados validados; nenhuma regra
  por país no motor.
- [x] **IV. Sem conteúdo protegido:** ✅ **com emenda** — nomes de lugares (países, estados, cidades) são
  reais por decisão do projeto; clubes, competições e jogadores continuam fictícios e checados pelo teste
  de bloqueio reestruturado (R13). A emenda é registrada na constituição (v1.2.0) no mesmo PR; ver
  Complexity Tracking.
- [x] **V. Balanceamento verificável:** simulação de 30 temporadas com faixas declaradas (força por país,
  caixa, vagas, tamanho das divisões) e metas de escala próprias, medidas e justificadas.
- [x] **VI. Saves versionados:** nenhuma mudança de formato de save nem de mod.
- [x] **VII. i18n:** textos novos da interface em `ui.json`; nada fixo no código.
- [x] **VIII. Offline e gratuito:** tudo local; dados incluídos no pacote do jogo, sem rede.
- [x] **IX. Testes primeiro no motor:** gerador, dados e determinismo começam pelo teste que falha.
- [x] **Stack (v1.1.0):** sem servidor; Biome; Vitest.

## Project Structure

### Documentation (this feature)

```text
specs/024-mod-mundo-completo/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/
│   ├── football-world-tool.md       # CLI de geração, CSV local e saída
│   └── profile-and-package.md       # perfil do mundo, dados de geografia/nomes, pacote e limites
├── checklists/requirements.md
└── tasks.md                         # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/worldgen/football-world/          # novo
├── profile.ts                  # WorldProfile, Tier, validação do perfil
├── profiles/{default,compact}.ts
├── geo/                        # dados reais de lugares (JSON): países, estados, cidades
├── names/                      # bancos de nomes por idioma (JSON), fictícios
├── country.ts                  # monta um país: clubes, elencos, pirâmide, copa, supercopa
├── brazil.ts                   # divisão D em grupos regionais + estaduais dos 27 estados
├── confederation.ts            # competições continentais por confederação
├── economy.ts                  # força, escala econômica e vagas por país
├── generate.ts                 # generateFootballWorld(profile, seed): ValidatedBank
└── index.ts
packages/engine/src/worldgen/{continental,regional,world-example}.ts   # generalizados (ids/nomes/tamanhos)
packages/engine/test/worldgen/football-world/…         # perfil, dados, países, determinismo, blocklist
packages/engine/test/fixtures/blocklist.json           # estrutura nova (R13)
packages/save/src/scale-limits.ts                      # SCALE_LIMITS.fullWorld
packages/modkit/src/limits.ts                          # limites revistos (se a medição pedir)
tools/src/{gen-football-world,simulate-scale}.ts       # CLI, CSV local, simulação do perfil
apps/web/src/app/mods/page.tsx  apps/web/public/mods/  # download gerado no build
packages/i18n/locales/pt-BR/{ui,release-notes}.json
docs/{mod-format.md,design.md,glossario.md,mundo-completo.md}  .specify/memory/constitution.md
```

**Structure Decision**: o gerador do mundo é um módulo próprio (`football-world/`) que **compõe** os
geradores existentes (elencos, rivalidades, estaduais, continentais) em vez de estender o banco de
vários países da 020, que clona o banco padrão e usa nomes sintéticos. Os dados reais ficam ao lado do
gerador e são conferidos por testes.

## Complexity Tracking

| Violação | Por que é necessária | Alternativa mais simples rejeitada porque |
|----------|----------------------|-------------------------------------------|
| Princípio IV: nomes reais de países, estados e cidades | Decisão do projeto (2026-10-27): o mundo precisa ser reconhecível; lugares não são conteúdo protegido | Nomes de lugares fictícios: o modder trocaria 100+ países por CSV, e os 27 estados deixariam de ser os do Brasil. A emenda é restrita a lugares; clubes, jogadores e competições seguem fictícios |
