# Implementation Plan: Competições continentais

**Branch**: `022-competicoes-continentais` | **Date**: 2026-10-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/022-competicoes-continentais/spec.md`

## Summary

A competição continental é, para o motor, **uma competição secundária comum com clubes de vários
países**. Quase tudo o que ela precisa já existe: fases em sequência (019), grupos com separação por
país (019), mata-mata com ida e volta, desempate e prêmio (018), datas por competição (017) e vagas
vindas das ligas e copas (021). O desenho acrescenta só o que falta, sem formato paralelo:

- **Competição entre países** (R1): `competition.countryId` passa a ser opcional; ausente significa
  que a competição não pertence a um país. Ela nunca é a principal de um país, suas regras
  econômicas vêm do país de cada clube (020 R1) e a validação exige clubes de ao menos dois países.
- **Estrutura por composição** (R2): preliminar → grupos → mata-mata é uma competição `stages` de
  uma divisão. As **vagas por país** são `berths` da 021 (posição da liga, título da copa,
  campeão anterior) com `entry.stage` na fase de entrada. Nenhum formato novo de vaga.
- **Ligação entre as duas competições** (R3), a única mecânica realmente nova: a divisão de destino
  declara `dropIns` (clubes eliminados de uma fase da maior entram numa fase da menor
  **durante a temporada**). Ao fechar a fase de origem, o motor sela a lista; a fase de destino só
  começa depois. A contagem é conferida na validação, e o destino nunca ganha jogos no passado.
- **Prêmios e bilheteria** (R4): bloco opcional `competition.awards` (por vitória, por empate, por
  fase alcançada, título) que cobre as fases de pontos; as fases eliminatórias seguem com o `prize`
  da 018. A bilheteria usa a regra do país do mandante.
- **Reputação** (R5), **metas da diretoria** (R6) e **torcida** (R7): reputação do clube sobe ao fim
  da temporada conforme a fase alcançada (com teto declarado); a meta `continental` do técnico
  avalia a fase; a expectativa e o humor da torcida passam a considerar a competição.
- **Manchetes e histórico** (R8): modelos novos de manchete; `continentalHistory` (campeão, vice, fase
  de cada clube) e a campanha no histórico do técnico.
- **Equilíbrio e escala** (R9): banco de teste de 10 países com as duas competições, 30 temporadas,
  faixas declaradas para força dos campeões, títulos por país/clube, caixa e reputação.
- **Telas** (R10): aba continental junto das nacionais; grupos, chaveamento (já existem, 019) e a
  nova visão de **campanha do clube**. Save v17 (campos opcionais).

Detalhes em [research.md](research.md); modelo em [data-model.md](data-model.md); contratos em
[contracts/](contracts/).

## Technical Context

**Language/Version**: TypeScript 6.0.x (`strict`), Node 22

**Primary Dependencies**: motor, save, i18n, default-mod, modkit do workspace; Next.js 16.4 (static
export), React 19.3; Zod. Nenhuma dependência nova.

**Storage**: save v17 no IndexedDB (`continentalHistory` na carreira; `incoming` opcional na fase;
`continental` opcional nas metas); formato de mod continua `formatVersion: 1` com
`competition.countryId` opcional, `competition.awards` e `division.dropIns` aditivos

**Testing**: Vitest (motor, validação, save, app); `continental-long-run.test.ts` (30 temporadas, 10
países); Playwright com o mod de exemplo

**Target Platform**: navegadores modernos, desktop ≥ 1280px

**Project Type**: biblioteca (motor) + pacote de save + mod padrão + aplicação web estática + ferramentas

**Performance Goals**: a competição acrescenta ~64 clubes e ~330 jogos por temporada ao banco de
teste de 10 países; a virada e o dia de jogos ficam dentro dos `SCALE_LIMITS` da 020 (tempo e
tamanho de save), medidos na tarefa de linha de base. Sem custo em bancos sem competição entre
países.

**Constraints**:

- Determinismo: ligação (`dropIns`) e premiações são funções puras do estado; o sorteio de grupos
  mantém a seed `${season.seed}:stage:${i}:draw`; acrescentar a competição não altera a seed de
  nenhuma outra (fork por competição).
- Banco padrão, mods de um país e saves antigos idênticos aos de hoje: sem `countryId` ausente,
  `awards` nem `dropIns`, nenhum caminho novo roda.
- Nenhuma regra de jogo na UI: a UI recebe grupos, chaveamento, campanha e origens prontos.
- i18n em todos os textos; nomes de competições e fases vêm do banco.

**Scale/Scope**: 10 países × 2 divisões × 20 clubes; competição maior com 40 clubes (16
preliminares, 32 em grupos, 16 no mata-mata) e menor com 24; 30 temporadas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação pré-pesquisa e pós-design (ambas ✅):

- [x] **I. Motor separado:** `continental/` no motor (ligação, prêmios, reputação, campanha,
  histórico); a UI só exibe. O teste de arquitetura cobre o módulo novo.
- [x] **II. Determinismo:** sem PRNG novo; sorteio de grupos e pareamentos usam as seeds por fase
  existentes; ordem total por (fase, posição, id); teste de repetição e de salvar/carregar no meio
  de uma fase de grupos.
- [x] **III. Dados, não código:** vagas, fases, datas, ligação, prêmios e reputação são dados
  validados por Zod e por regras semânticas com erro por arquivo/campo; nenhum caso por competição.
- [x] **IV. Sem conteúdo protegido:** nomes fictícios no banco de teste e no mod de exemplo (teste
  de blocklist existente); nomes de competições só no mod.
- [x] **V. Balanceamento verificável:** `continental-long-run.test.ts` com faixas explícitas (força
  dos campeões, títulos por país e por clube, campeões distintos, caixa, prêmios por temporada,
  reputação); versão reduzida no CI do PR e completa no job de simulação.
- [x] **VI. Saves versionados:** v17 com migração e fixtures v16 (início, meio, fim de temporada).
- [x] **VII. i18n:** o motor devolve códigos e ids; textos em `ui.json`, `errors.json`,
  `release-notes.json` e nas manchetes; plurais em ICU.
- [x] **VIII. Offline e gratuito:** tudo local.
- [x] **IX. Testes primeiro no motor:** ligação, selagem, prêmios, reputação, metas, histórico e
  migração começam pelo teste que falha.
- [x] **Stack (v1.1.0):** sem servidor; Biome; Vitest; motor sem APIs proibidas.

Nenhuma violação. Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/022-competicoes-continentais/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/
│   ├── continental-api.md        # API do motor: ligação, prêmios, reputação, campanha, histórico
│   └── mod-format-and-ui.md      # formato de mod, validação, save v17 e telas
├── checklists/requirements.md
└── tasks.md                      # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/
├── continental/                           # novo
│   ├── types.ts                           # DropIn, Awards, Campaign, ContinentalEdition
│   ├── scope.ts                           # isInternational, participants, clubes por país
│   ├── dropins.ts                         # fontes → clubes que descem; selagem ao fim da fase
│   ├── awards.ts                          # prêmios por vitória/empate/fase, posting do dia
│   ├── reputation.ts                      # variação de reputação do clube por fase alcançada
│   ├── campaign.ts                        # campanha do clube (jogos, fase, prêmios, falta jogar)
│   └── history.ts                         # ContinentalEdition, histórico do técnico
├── stages/{advance,rules,types,create}.ts # fase de destino espera a selagem; incoming
├── career/{day,turnover,season-state,types}.ts   # ponte de ligação no dia; etapa de reputação/histórico
├── finance/{gate,round}.ts world/countries.ts    # regras do país do mandante em competição sem país
├── board/{goals,evaluation,types,history}.ts     # meta continental e campanha no histórico do técnico
├── fans/{rules,mood}.ts  news/{rules,turnover}.ts
├── model/{schemas,types}.ts  validation/semantic/{continental,calendar,countries}.ts
├── worldgen/world-example.ts                     # maior + menor no banco de teste
└── index.ts
packages/engine/test/{continental,stages,career,validation,board,fans,news,worldgen}/…

packages/save/src/{format,migrate}.ts  packages/save/test/fixtures v16
mods/exemplo-mundo/  tools/src/{gen-world-example-mod,simulate-world}.ts
packages/i18n/locales/pt-BR/{ui,errors,release-notes}.json
apps/web/src/{app/jogo/competicao,app/jogo/continental}  apps/web/src/ui/{competition,campaign,board,history}
apps/web/test/flows/continental.test.tsx  apps/web/e2e/continental.spec.ts
docs/{design.md,mod-format.md,glossario.md}
```

**Structure Decision**: a regra nova fica num módulo próprio do motor (`continental/`), separada de
`stages/` (que continua sendo só a máquina de fases) e de `qualification/` (vagas entre
temporadas). A ponte entre as duas competições é um passo fino do dia de jogos: chama
`sealDropIns` e deixa `advanceStages` ler o resultado.

## Complexity Tracking

Não se aplica: o Constitution Check não tem violações.
