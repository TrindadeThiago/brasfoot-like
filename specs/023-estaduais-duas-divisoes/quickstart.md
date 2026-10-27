# Quickstart: validar os estaduais

Guia de validação ponta a ponta. Os comandos usam os scripts já existentes do monorepo.

## Pré-requisitos

- Node 22 e `pnpm install` feitos.
- Branch `023-estaduais-duas-divisoes` com a implementação concluída.

## 1. Testes do motor

```bash
pnpm --filter @brasfoot-like/engine exec vitest run regional career validation stages qualification
```

Esperado: verdes para escopo regional (`mainCompetitionOf` ignora o estadual), composição por
fases (finalistas sobem, piores dos grupos caem), vagas com repasse (021), peso por reputação,
histórico e migração v17 → v18.

## 2. Validação de bancos

```bash
pnpm validate-bank mods/exemplo-estadual
```

Esperado: o mod de exemplo (`mods/exemplo-estadual`, gerado por `pnpm gen:regional-mod`) passa. Em cópia temporária, troque um `relegationSlots`, um `region` ou
a `startWeek` da liga e confira que a mensagem aponta arquivo e campo (`division.slots_mismatch`,
`regional.club_region`, `calendar.regional_after_national`).

## 3. Mundo de 27 estaduais (escala)

```bash
pnpm sim:world --regional --states 27 --seasons 3
pnpm --filter @brasfoot-like/save exec vitest run regional-scale
```

Esperado: o mundo tem 27 estados e ~540 clubes; a cada temporada as duas divisões de cada estadual
mantêm 12 e 8 clubes, sem clube repetido; dia de jogos, virada, heap e tamanho do save dentro de
`SCALE_LIMITS`. A medição completa é `pnpm sim:world --regional --states 27 --seasons 30`.

## 4. Simulação longa (equilíbrio)

```bash
pnpm --filter @brasfoot-like/engine exec vitest run regional-long-run
REGIONAL_STATES=27 pnpm --filter @brasfoot-like/engine exec vitest run regional-long-run
```

Esperado (faixas no teste): as duas divisões de cada estadual mantêm o número de clubes em 100% das
temporadas; elencos regionais de 16 a 40 jogadores e 2 goleiros ou mais; 4 trocas por estadual e
temporada (2 sobem, 2 caem); caixa médio dos regionais entre 0,5 e 30 milhões e menos de 20% em
crise; ao menos 3 campeões distintos por estadual em 30 anos. `REGIONAL_VERBOSE=1` imprime um resumo.

## 5. Fluxo na interface

```bash
pnpm --filter web test -- regional
pnpm --filter web exec playwright test regional
```

Esperado: iniciar carreira num clube de 1ª divisão do estadual, jogar até a final, ver grupos,
chaveamento e campanha, terminar o estadual antes da liga e ver manchete e histórico. Repetir com
um clube que cai para a 2ª divisão e outro que sobe, e conferir as vagas nacionais.
