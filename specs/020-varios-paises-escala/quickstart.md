# Quickstart: validar vários países e a simulação em escala

Pré-requisito: `pnpm install` na raiz.

## 1. Formato e validação

```bash
pnpm vitest run packages/engine/test/validation/countries.test.ts packages/engine/test/model
```

Esperado: um banco com 3 países de estruturas diferentes é aceito; cada código novo
(`country.no_main_competition`, `club.country_mismatch`, `country.foreign_limit_exceeded`…) é
recusado por um banco de teste próprio, apontando arquivo e campo.

## 2. Simulação resumida × completa (critério de aceite 1)

```bash
pnpm vitest run packages/engine/test/match/summary.test.ts packages/engine/test/match/summary-equivalence.test.ts
pnpm sim:matches --summary --games 6000
```

Esperado: consistência de cada jogo resumido; determinismo; médias, proporções e distribuições de
placar, gols, cartões e lesões dentro das faixas declaradas no teste.

## 3. Vários países na mesma temporada

```bash
pnpm vitest run packages/engine/test/career/world-day.test.ts packages/engine/test/career/world-turnover.test.ts
```

Esperado: todos os países jogam o mesmo dia e viram a temporada juntos; cada país tem campeão,
acessos e rebaixamentos próprios; ao vivo = direto; salvar e carregar no meio não muda nada;
acrescentar um país não altera os outros; o banco de um país é idêntico ao anterior.

## 4. Mercado, propostas e troca de país

```bash
pnpm vitest run packages/engine/test/market/international.test.ts packages/engine/test/board/country-offers.test.ts
```

Esperado: taxa em valor de mercado sem conversão; folha na escala do país de destino; limite de
estrangeiros respeitado pelo jogador e pela IA; janelas dos dois países; proposta de outro país
aceita a qualquer momento, sem jogo duplicado ou perdido, com metas de meio de temporada.

## 5. Escala e longo prazo (critério de aceite 2)

```bash
pnpm vitest run packages/save/test/scale.test.ts          # tamanho do save, tempo e memória
pnpm sim:world --scale --countries 10 --seasons 30        # 400 clubes, 30 temporadas
```

Esperado: 30 de 30 temporadas sem erro; cada país dentro das faixas da 008 e da 009; metas de
`SCALE_LIMITS` atendidas; relatório com tamanho do save por parte, tempo por dia e por virada e pico
de heap.

## 6. Compatibilidade

```bash
pnpm vitest run packages/save/test/migrate.test.ts packages/save/test/equivalence.test.ts
```

Esperado: fixtures v14 abrem como mundo de um país e continuam jogáveis; o mundo padrão produz os
mesmos resultados de antes.

## 7. Interface

```bash
pnpm test:e2e -- world.spec.ts
```

Esperado: filtro por país e divisão na nova carreira, consulta de ligas alheias, mercado com país e
limite de estrangeiros, troca de país por proposta.

## 8. Portões finais

```bash
pnpm typecheck && pnpm lint && pnpm test
```
