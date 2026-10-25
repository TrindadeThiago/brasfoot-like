# Quickstart: validar as competições continentais

Guia de validação ponta a ponta. Os comandos usam os scripts já existentes do monorepo.

## Pré-requisitos

- Node 22 e `pnpm install` feitos.
- Branch `022-competicoes-continentais` com a implementação concluída.

## 1. Testes do motor

```bash
pnpm --filter @brasfoot-like/engine exec vitest run continental stages career validation
```

Esperado: verdes para escopo (`countryId` ausente), ligação (`sealDropIns` e espera de
`advanceStages`), prêmios, reputação, metas, histórico e migração v16 → v17.

## 2. Validação de bancos

```bash
pnpm validate-bank mods/exemplo-mundo
```

Esperado: o mod de exemplo passa. Troque, em cópia temporária, uma contagem de `dropIns` ou uma
data de fase e confira que a mensagem aponta arquivo e campo (`continental.dropin_count`,
`continental.dropin_before_source`).

## 3. Simulação longa (equilíbrio)

```bash
pnpm sim:world --seasons 30 --continental
pnpm --filter @brasfoot-like/engine exec vitest run continental-long-run
```

Esperado (faixas no teste): força média dos campeões acima da dos participantes; países com mais
vagas vencem mais; ≥ 5 campeões distintos e nenhum clube com mais de 40% dos títulos; caixa dos
assíduos dentro das faixas da 008; reputação dentro do teto; tamanho de save e tempo de virada
dentro de `SCALE_LIMITS`.

## 4. Carreira de teste ponta a ponta

```bash
pnpm --filter @brasfoot-like/web exec vitest run flows/continental
pnpm test:e2e -- continental
```

Roteiro do teste: carreira no mod de exemplo com um clube que tem vaga; jogar a temporada inteira
(liga, copa nacional, continental): preliminar, grupos, mata-mata; conferir:

1. a aba Continental aparece com grupos, chaveamento e a campanha do clube;
2. nenhum dia tem duas partidas do clube;
3. o extrato mostra prêmios por fase e bilheteria dos jogos em casa;
4. um eliminado do terceiro lugar dos grupos aparece na competição menor na fase prevista;
5. a diretoria avalia a meta continental e a reputação do clube muda conforme a fase;
6. as manchetes e o histórico registram a campanha e o campeão.

## 5. Compatibilidade

```bash
pnpm --filter @brasfoot-like/save exec vitest run migrate
```

Esperado: fixtures v16 abrem; mod padrão de um país e mods sem competição entre países produzem
exatamente os resultados de antes (testes de regressão das 017–021 verdes).

## Gates antes de abrir o PR

`pnpm typecheck && pnpm lint && pnpm test` verdes, mais a simulação longa pelo mecanismo definido na T071; nenhuma string visível fora do
i18n; versão e notas de lançamento no mesmo PR.
