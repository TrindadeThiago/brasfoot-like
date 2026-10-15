# Quickstart: validar a feature 001

Guia para provar, de ponta a ponta, que o modelo de dados, a validação e o gerador funcionam.
Detalhes do formato em [contracts/mod-format.md](contracts/mod-format.md); API em
[contracts/engine-api.md](contracts/engine-api.md).

## Pré-requisitos

- Node 22 (≥ 22.13) e pnpm 11.
- Na raiz do repositório: `pnpm install`.

## 1. Gates de qualidade

```bash
pnpm typecheck     # tsc --noEmit em todos os pacotes
pnpm lint          # biome check (lint + formatação), com regras de fronteira do motor
pnpm test          # Vitest em todos os pacotes, incluindo o teste de arquitetura
```

**Esperado**: tudo verde. Para provar que os gates funcionam, adicionar temporariamente em
`packages/engine/src`: `import "react"` ou `Date.now()` deve fazer o `pnpm lint` falhar;
`Math.random()` deve fazer o teste de arquitetura falhar; `document` deve fazer o
`pnpm typecheck` falhar.

## 2. Gerar o banco padrão (US1)

```bash
pnpm gen:default-bank            # grava mods/default/ com a seed fixa
pnpm gen:default-bank --seed 42 --out /tmp/banco-42
```

**Esperado**:
- `mods/default/` contém `mod.json`, `countries.json`, `competitions.json`, `clubs.json`,
  `players.json`.
- O script imprime um resumo: 1 país, 1 competição, 2 divisões, 40 clubes, ~1.000 jogadores,
  força média, % de craques, idade média.
- Rodar duas vezes com a mesma seed não gera diff (`git status` limpo em `mods/default/`).

## 3. Validar um banco (US2)

```bash
pnpm validate-bank mods/default          # → "Banco válido."
pnpm validate-bank packages/engine/test/fixtures/invalid/multiple-defects
```

**Esperado**: o banco padrão é válido; o fixture com vários defeitos lista todos os erros em
pt-BR, um por linha, com arquivo e caminho, por exemplo:

```text
clubs.json [4] — O clube clube-5 tem apenas 1 goleiro; o mínimo é 2.
players.json [10].strength — O campo strength vale 150, mas deve estar entre 1 e 100.
players.json [128].clubId — O jogador avulso referencia o clube clube-999, que não existe.
(aviso) clubs.json [0].mascote — O campo mascote não é reconhecido e foi ignorado.
3 erros e 1 aviso.
```

e termina com código de saída 1 (avisos sozinhos não mudam o código de saída).

## 4. Suítes que cobrem os critérios de sucesso

| Critério | Suíte |
|---|---|
| SC-001 (determinismo + válido, 20 seeds) | `packages/engine/test/worldgen/determinism.test.ts` |
| SC-002 (faixas FR-030–FR-036, 20 seeds) | `packages/engine/test/worldgen/distribution.test.ts` |
| SC-003 (cada regra rejeitada) | `packages/engine/test/validation/rules.test.ts` (tabela em `cases.ts`) |
| SC-004 (N defeitos ⇒ N erros) | `packages/engine/test/validation/multiple-defects.test.ts` |
| SC-005 (< 2 s) | `packages/engine/test/worldgen/performance.test.ts` |
| SC-006 (todo código tem mensagem) | `packages/i18n/test/errors-coverage.test.ts` |
| SC-007 (banco padrão sem erros e sem avisos) | `packages/engine/test/worldgen/determinism.test.ts` |
| FR-017b (completação de ocultos) | `packages/engine/test/worldgen/hidden.test.ts` |
| Banco versionado = gerado | `packages/engine/test/worldgen/golden.test.ts` |
| CLI de validação | `tools/test/validate-bank.test.ts` |
| Fronteira do motor | `packages/engine/test/architecture.test.ts` |
| Nenhum nome real | `packages/engine/test/worldgen/blocklist.test.ts` |

```bash
pnpm vitest run packages/engine/test/worldgen
pnpm vitest run packages/engine/test/validation
pnpm vitest run packages/i18n
```
