# Quickstart: validar o mata-mata e a copa nacional

Pré-requisito: `pnpm install` na raiz.

## 1. Motor da partida (prorrogação e pênaltis)

```bash
pnpm vitest run packages/engine/test/match/extra-time.test.ts packages/engine/test/match/shootout.test.ts
pnpm vitest run packages/engine/test/match            # os 90 minutos seguem idênticos
```

Esperado: com `decider`, empate ⇒ 30 minutos extras ⇒ pênaltis; sempre um vencedor; sem `decider`,
o resultado de qualquer partida é o de antes; ao vivo = direto.

## 2. Copa em dados, sorteio e chaveamento

```bash
pnpm vitest run packages/engine/test/knockout packages/engine/test/validation/knockout.test.ts
```

Esperado: mesma seed ⇒ mesmo sorteio; cabeças de chave não se cruzam; entradas tardias só na fase
prevista; ida e volta decidida pelos critérios; bancos de copa inválidos recusados com fase e campo.

## 3. Simulação longa (critério de aceite 1)

```bash
pnpm vitest run packages/engine/test/knockout/long-run.test.ts   # 1.000 copas + 10 temporadas com liga e copa
pnpm sim:world --seasons 30 && pnpm sim:economy --seasons 30
```

Esperado: todo confronto com um classificado; favoritos campeões mais vezes e zebras dentro das
faixas declaradas; economia e forças dentro dos limites da 008 e da 009.

## 4. Carreira (critério de aceite 2) e saves

```bash
pnpm vitest run packages/save/test/migrate-v13.test.ts packages/save/test/equivalence.test.ts
pnpm vitest run packages/engine/test/career/cup-day.test.ts
```

Esperado: uma temporada inteira com liga e copa no mesmo calendário termina com o campeão no
histórico; save v12 abre e joga; a liga do banco sem copa é idêntica à da versão anterior.

## 5. Interface (critério de aceite 3)

```bash
pnpm vitest run apps/web/test/flows/cup.test.tsx
pnpm test:e2e -- cup.spec.ts
pnpm dev:web
```

Roteiro manual:

1. Nova carreira no banco padrão: a Início mostra o próximo jogo; a copa aparece nas abas de
   competição e no filtro do calendário.
2. Avance até uma quarta de copa e jogue ao vivo; num empate, veja a prorrogação e a disputa de
   pênaltis cobrança a cobrança, com o placar da série separado.
3. Abra Competição ▸ copa ▸ Chaveamento: fases, classificados e confrontos a definir.
4. Termine a temporada e confira o campeão no fim de temporada e no Histórico ▸ Copas.

## 6. Gates

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm build:web && pnpm test:e2e
```
