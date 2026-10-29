# Linha de base (início da 028, `release/v1.0.0` com a 025, 026 e 027)

Medida em 2026-10-29, antes de qualquer mudança de código da 028.

- `apps/web/out`: 4,2 MB (JS 1 726 368 bytes; CSS 59 847 bytes; precache de 180 arquivos)
- Tempo de abertura do menu inicial (método da 025 a 027): medianas 148, 155 e 151 ms
- Filtros do Mercado (Vitest, `filterRows` sobre `marketRows` do mundo padrão, 10 611 linhas, mediana de 5): 0,9 ms (posição e força), 1,8 ms (idade e salário), 0,9 ms (nome), 0,5 ms (livres) e 2,4 ms (contrato e força). O limite do SC-001 é 200 ms.
- Testes que tocam as duas telas (referência de paridade): `test/flows/market.test.tsx`, `market-ai.test.tsx`, `finances.test.tsx`; e2e `market`, `finances`, `a11y`, `layout`, `keyboard`. O resultado é o do CI da 027 (PR #53), que vale para a base `release/v1.0.0`; a suíte não foi repetida aqui.

## Depois da implementação (028)

- `apps/web/out`: 4,2 MB (JS 1 754 604 bytes; CSS 64 260 bytes; precache de 181 arquivos)
- Tempo de abertura do menu inicial (mesmo método): medianas 169 (primeira execução, com o servidor frio), 154 e 155 ms contra 148, 155 e 151 ms da linha de base (sem piora relevante). O JS cresceu 28 KB (gráficos, abas e modal) e o CSS, 4 KB.
- Filtros do Mercado (`test/ui/market-perf.test.tsx`): continuam entre 0,5 e 2,4 ms sobre 10 611 linhas, bem abaixo dos 200 ms; a lista é montada uma vez por save.
- Testes: unidade 4 269 passando depois dos ajustes de tempo e de aba (três falhas sob carga: dois limites de 5 s e a aba Histórico dos prêmios) e e2e completo com 42 passando.
