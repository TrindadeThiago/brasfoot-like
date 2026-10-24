# Quickstart: validar a fase de grupos e as competições em fases

Pré-requisito: `pnpm install` na raiz.

## 1. Formato e validação em dados

```bash
pnpm vitest run packages/engine/test/validation/stages.test.ts packages/engine/test/model
```

Esperado: um banco com grupos → mata-mata e outro com pontos corridos → playoff são aceitos; cada
código `stages.*` é recusado por um banco de teste próprio, apontando arquivo e campo; `groups` não
é mais rejeitado como reservado.

## 2. Sorteio dos grupos

```bash
pnpm vitest run packages/engine/test/stages/groups-draw.test.ts
```

Esperado: mesma seed ⇒ mesmos grupos em qualquer ordem de entrada; potes respeitados; separação por
país e por região respeitada (com pote isento no caso continental); concentração por região em
grupos vizinhos (SC-003); 300+ sorteios sem violação; separação impossível: `strict` falha com erro
claro e `career` conclui com aviso e todo clube num grupo.

## 3. Classificação, chaveamento e posição final

```bash
pnpm vitest run packages/engine/test/stages
```

Esperado: tabela de grupo, classificação geral sem confronto direto, vagas extras só da posição
seguinte, pareamento por posição sem repetir o grupo, `finalOrder` com posições únicas de 1 a N a
cada rodada, `advanceStages` idempotente, ao vivo = direto e salvar/carregar no meio da fase.

## 4. Simulação longa (critério de aceite 1 e 2)

```bash
pnpm vitest run packages/engine/test/stages/long-run.test.ts   # 30 temporadas do banco regional
pnpm vitest run packages/save/test/equivalence.test.ts          # o mundo padrão segue idêntico
pnpm sim:world --seasons 30 && pnpm sim:economy --seasons 30
```

Esperado: 30 de 30 temporadas sem erro, classificados exatos, nenhum clube duplicado, os promovidos
vindos dos finalistas do mata-mata e nenhuma restrição violada em todos os sorteios; economia e
forças do mundo padrão dentro dos limites da 008 e da 009.

## 5. Carreira e saves

```bash
pnpm vitest run packages/save/test/migrate-v14.test.ts packages/engine/test/career
```

Esperado: save v13 abre e joga como antes; carreira no banco regional joga a divisão em fases do
sorteio ao mata-mata e vira a temporada com acesso e rebaixamento.

## 6. Interface (critério de aceite 3)

```bash
pnpm vitest run apps/web/test/flows/stages.test.tsx
pnpm test:e2e -- stages.spec.ts
pnpm dev:web
```

Roteiro manual (com o mod do banco regional importado):

1. Nova carreira com o clube de um grupo da quarta divisão: a Início mostra o próximo jogo com
   "Grupo X, rodada N".
2. Competição ▸ quarta divisão: tabelas por grupo com a zona de classificação; a classificação
   geral; o aviso do sorteio, se houve regra afrouxada.
3. Jogue a fase de grupos: ao terminar, o chaveamento mostra a origem de cada vaga ("1º do Grupo B").
4. Jogue o mata-mata e termine a temporada: o resumo mostra a posição final, o campeão e os
   promovidos; a divisão de cima recebe os dois finalistas.

## 7. Gates

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm build:web && pnpm test:e2e
```
