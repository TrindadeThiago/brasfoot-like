# Quickstart: validar a IA de transferências

Pré-requisitos: Node ≥ 22.13, `pnpm install`. Contratos em [contracts/](contracts/), limites em
[research.md](research.md) R11.

## 1. Motor

```bash
pnpm test packages/engine/test/market/ai
```

Esperado:

- `needs.test.ts`: posição descoberta, fraca e em excesso; orçamento 0 em crise; elenco envelhecido.
- `targets.test.ts`/`seller.test.ts`: alvo melhora o titular, cabe no orçamento, atleta aceita;
  titular não é vendido a clube menor; excedente vende com desconto.
- `loans.test.ts`, `free-agents.test.ts`, `renewals.test.ts`, `offers.test.ts`.
- `round.test.ts`: na janela há negócios entre clubes da IA, fora dela só livres; jogadores do
  humano intocados; teto por posição; soma de caixa conservada; determinismo.
- `report.test.ts`: resumo ao fechar a janela, ordenado por relevância, filtro por divisão.
- `long-run.test.ts` (**critérios de aceite**): 30 temporadas, 2 seeds, limites R11.

Também: `pnpm test packages/engine/test/finance/long-run.test.ts packages/engine/test/renewal/long-run.test.ts`.

## 2. Save

`pnpm test packages/save` — v6 → v7; rodada grava o mercado; dispensar o resumo.

## 3. Simulação

```bash
pnpm sim:world --seasons 30
```

Esperado: transferências entre clubes da IA por temporada, fluxo para clubes maiores (%) e ✓ em
todos os limites.

## 4. App

`pnpm test apps/web` e `pnpm dev:web`. Roteiro: nova carreira → simular até a rodada 5 (fecha a
janela) → Início mostra "Resumo da janela" → Mercado › Resumo da janela lista as transferências e
filtra pela divisão → dispensar o aviso.

## Gates

`pnpm typecheck && pnpm lint && pnpm test`; `pnpm build:web && pnpm test:e2e`.
