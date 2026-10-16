# Quickstart: validar a feature 002

API em [contracts/match-api.md](contracts/match-api.md); tipos em [data-model.md](data-model.md).

## Pré-requisitos

Node 22 e pnpm 11; na raiz: `pnpm install`. O banco padrão `mods/default/` (feature 001) é a
fonte dos elencos.

## 1. Gates

```bash
pnpm typecheck && pnpm lint && pnpm test
```

**Esperado**: tudo verde, incluindo as suítes de realismo (simulação longa). A suíte completa
leva ~15–20 s; as simulações longas ficam no `pnpm test` normal (não há `test:long`).

## 2. Simular partidas pela linha de comando

```bash
pnpm sim:matches                 # 10.000 partidas entre clubes do banco padrão
pnpm sim:matches --n 2000 --seed teste
```

**Esperado**: uma tabela com cada métrica de FR-040 a FR-049 (gols por jogo, empates, vitórias
do mandante/visitante, cartões, lesões, pênaltis, finalizações, posse), o valor medido e o
limite, marcando ✓ ou ✗; código de saída 0 quando todas passam. Rodar duas vezes com a mesma seed
imprime os mesmos números.

## 3. Suítes que cobrem os critérios

| Critério | Suíte |
|---|---|
| SC-001 determinismo, passos = direto | `packages/engine/test/match/determinism.test.ts` |
| SC-002 faixas FR-040–FR-049 | `packages/engine/test/match/realism/*.test.ts` |
| SC-003 características | `packages/engine/test/match/realism/traits.test.ts` |
| SC-004 erros de entrada e mudança | `packages/engine/test/match/errors.test.ts`, `packages/i18n/test/match-errors-coverage.test.ts` |
| SC-005 escalação automática | `packages/engine/test/match/auto-lineup.test.ts` |
| SC-006 desempenho | `packages/engine/test/match/performance.test.ts` |
| SC-007 consistência do resultado | `packages/engine/test/match/consistency.test.ts` |
| Mudanças e pendências | `packages/engine/test/match/changes.test.ts` |

```bash
pnpm vitest run packages/engine/test/match --exclude "**/realism/**"   # rápido
pnpm vitest run packages/engine/test/match/realism                      # simulação longa
```
