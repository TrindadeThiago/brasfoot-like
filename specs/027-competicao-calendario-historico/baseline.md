# Linha de base (início da 027, `release/v1.0.0` com a 025 e a 026)

Medida em 2026-10-29, antes de qualquer mudança de código da 027.

- `apps/web/out`: 4,1 MB (JS 1 693 339 bytes; CSS 52 561 bytes; precache de 177 arquivos)
- Tempo de abertura do menu inicial (método da 025/026): medianas 150, 148 e 150 ms
- Testes que tocam as três telas (referência de paridade): `test/ui/calendar-detail.test.tsx`, `competition-calendar.test.tsx`, `quick-wins.test.tsx`; e2e `calendar`, `cup`, `continental`, `regional`, `stages`, `qualification`, `news`, `a11y`, `layout`, `keyboard`. O resultado é o do CI da 026 (PR #52), que vale para a base `release/v1.0.0`; a suíte não foi repetida aqui.
- Não existe e2e do Histórico: `e2e/history.spec.ts` nasce nesta feature.

## Depois da implementação (027)

- `apps/web/out`: 4,1 MB (JS 1 728 523 bytes; CSS 58 956 bytes; precache de 179 arquivos)
- Tempo de abertura do menu inicial (mesmo método): medianas 146, 147 e 147 ms contra 150, 148 e 150 ms da linha de base (sem piora).
- Desempenho das telas novas (testes `competition-perf.test.tsx` e `bracket.test.tsx`): meses do calendário de uma temporada completa, classificação de 20 clubes com forma, lista de competições de um mundo de vários países e chaveamento de 32 clubes, todos abaixo de 1 s.
- Testes: unidade 4 184 passando (434 arquivos); e2e completo passando depois dos ajustes (`fans.spec` agora procura o clássico mês a mês e `competition-clicks.spec` espera a lista aparecer).
