# Quickstart: validar a 021

Pré-requisitos: `pnpm install`; branch `021-classificacao-entre-competicoes`.

## 1. Motor e validação

```sh
pnpm vitest run packages/engine/test/qualification packages/engine/test/validation \
  packages/engine/test/board/qualify-goal.test.ts packages/engine/test/news/qualification.test.ts
```

Esperado: fontes de vaga, repasse, unicidade, condições, fechamento, supercopa, saída da pirâmide,
ciclos e erros de dados verdes. Cada código de `contracts/qualification-api.md` tem teste com
arquivo e campo na mensagem.

## 2. Simulação longa (SC-001, SC-002, SC-006)

```sh
pnpm vitest run packages/engine/test/qualification/long-run.test.ts   # 10 temporadas, 3 países (CI)
pnpm sim:world --scale --countries 10 --seasons 30 --qualification    # 30 temporadas, 10 países
```

Esperado: em todas as temporadas e países, cada competição começa com o número certo de
participantes por fase, nenhum clube repetido na mesma competição, e as temporadas em que o
campeão da liga também vence a copa preenchem a supercopa pelo repasse. Repetição com a mesma seed,
inclusive com salvar e carregar no meio, dá saída idêntica. O comando `sim:world --scale` sai com
código diferente de zero se algum limite de `SCALE_LIMITS` ou de participantes falhar.

## 3. Compatibilidade (SC-005)

```sh
pnpm vitest run packages/save packages/engine/test/career/composition-baseline.test.ts \
  packages/engine/test/career/qualification-compat.test.ts
```

Esperado: fixtures v15 abrem e jogam; o banco padrão (sem `berths`) produz as mesmas composições de
antes (snapshots de `composition-baseline.test.ts`).

## 4. Interface (SC-003, SC-007)

```sh
pnpm vitest run apps/web/test/flows/qualification.test.tsx
pnpm build:web && pnpm test:e2e -- qualification
```

Esperado: tabela com zonas e legenda; página da competição com a origem de cada participante;
meta "classificar para X" na lista de metas; manchetes, fim de temporada e histórico com a
classificação.

## 5. Banco de exemplo

```sh
pnpm gen:world-mod && pnpm vitest run packages/modkit
```

Esperado: `mods/exemplo-mundo` carrega com liga, copa, supercopa e taça alimentada, e uma carreira
joga a temporada e a virada com elas.
