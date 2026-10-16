# Quickstart: validar a feature 003

API em [contracts/season-api.md](contracts/season-api.md).

## Pré-requisitos

Node 22, pnpm 11, `pnpm install`. Usa o banco padrão (`mods/default/`) e o motor de partida.

## 1. Gates

```bash
pnpm typecheck && pnpm lint && pnpm test
```

A suíte completa leva ~35 s; as 100 temporadas de credibilidade ficam no `pnpm test`.

## 2. Uma temporada pela linha de comando

```bash
pnpm sim:season --seed 42
```

**Esperado**: tabela final da Série A (20 clubes, 38 jogos cada), 10 artilheiros, resumo de
cartões, suspensões e lesões, e o relatório da temporada (campeão e sua força inicial, pontos do
campeão e do lanterna, invictos, correlação força × posição, gols por jogo, empates, gols do
artilheiro). Rodar de novo com a mesma seed dá a mesma saída.

## 3. Critério de pronto do Marco 1

```bash
pnpm sim:season --seasons 100
```

**Esperado**: cada critério de FR-030 a FR-037 com valor medido, faixa e ✓; código de saída 0.

## 4. Suítes

| Critério | Suíte |
|---|---|
| Calendário (FR-001–FR-004) | `packages/engine/test/season/calendar.test.ts` |
| SC-001 determinismo, rodada a rodada = tudo | `packages/engine/test/season/determinism.test.ts` |
| SC-002 tabela consistente, desempate | `packages/engine/test/season/standings.test.ts` |
| SC-003 suspensões e lesões | `packages/engine/test/season/discipline.test.ts` |
| Estatísticas | `packages/engine/test/season/stats.test.ts` |
| SC-004 credibilidade | `packages/engine/test/season/credibility.test.ts` |
| SC-005 desempenho | `packages/engine/test/season/performance.test.ts` |
| SC-006 erros | `packages/engine/test/season/errors.test.ts`, `packages/i18n/test/season-errors-coverage.test.ts` |
