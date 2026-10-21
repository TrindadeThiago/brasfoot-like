# Quickstart: validar o calendário multi-competição

Pré-requisitos: `pnpm install` na raiz.

## 1. Motor

```bash
pnpm vitest run packages/engine/test/calendar      # agenda, montagem, conflitos, transbordo
pnpm vitest run packages/engine/test/fitness       # desgaste, recuperação, efeito, IA poupa cansados
pnpm vitest run packages/engine/test/career/day    # dia de jogos, avanço até o próximo jogo, ao vivo = direto
pnpm vitest run packages/engine/test/validation    # erros calendar.* e competition.club_outside_main
```

Esperado:

- Com o banco de duas competições ([research.md R14](research.md#r14--banco-de-teste-de-duas-competições)),
  a temporada inteira é jogada sem clube em dois jogos no mesmo dia, e `advanceCareerToNextMatch`
  alterna domingo e quarta para um clube nas duas competições.
- Expulso na competição A, o jogador fica livre na B e suspenso no próximo jogo da A.
- Com 7 dias entre jogos, a condição volta a 100. Com 3 dias, fica em 85 depois de 90 minutos.

## 2. Equivalência com o banco padrão (SC-004)

```bash
pnpm vitest run packages/save/test/equivalence.test.ts
```

Esperado: mesma seed, mesmos confrontos, mesmos placares e mesmo total anual de receitas e
despesas por clube que as fixtures gravadas antes da 017.

## 3. Simulação longa (SC-003, FR-045)

```bash
pnpm vitest run packages/engine/test/renewal packages/engine/test/board packages/engine/test/fans
pnpm vitest run packages/engine/test/calendar/long-run.test.ts
pnpm sim:world && pnpm sim:economy
```

Esperado: limites da 008 e da 009 sem mudança. O banco de duas competições fica 10 temporadas sem
conflito e dentro dos limites.

## 4. Saves (SC-002)

```bash
pnpm vitest run packages/save/test/migrate-v12.test.ts
```

Esperado: cada fixture v11 abre na mesma rodada, com o mesmo histórico, e é jogada até a virada.

## 5. Interface

```bash
pnpm vitest run apps/web/test/flows/calendar.test.tsx
pnpm test:e2e -- calendar.spec.ts
pnpm dev:web
```

Roteiro manual:

1. Abra uma carreira do banco padrão. A Início mostra o próximo jogo com data. Não há abas de
   competição nem filtro no calendário.
2. Importe o mod de teste de duas competições (`apps/web/e2e/fixtures/`) e crie uma carreira com
   um clube das duas. Avance: o jogo para no domingo e depois na quarta, e a Início mostra a
   competição de cada um.
3. Escale os mesmos onze em dois jogos seguidos de domingo e quarta. Na escalação da quarta, os
   titulares aparecem abaixo de 100%, com aviso.
4. O calendário lista os jogos das duas competições por data, e o filtro mostra só uma.
5. Tabela e resultados têm abas das duas competições.

## 6. Gates

```bash
pnpm typecheck && pnpm lint && pnpm test
```
