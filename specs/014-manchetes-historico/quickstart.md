# Quickstart: validar manchetes e histórico

Pré-requisitos: Node ≥ 22.13, `pnpm install`. Contratos em [contracts/](contracts/), parâmetros e
limites em [research.md](research.md) R11 e R12.

## 1. Motor

```bash
pnpm test packages/engine/test/news
```

Esperado:

- `facts.test.ts`: hat-trick, goleada, virada (pelo histórico de gols), zebra, clássico, resultado
  com sequência e fim de jejum.
- `records.test.ts` (**critério de aceite 2**): recorde superado gera manchete com o anterior; empate
  não gera; primeira marca só registra.
- `clinched.test.ts`: título, acesso e rebaixamento matemáticos na rodada certa, uma vez só.
- `feed.test.ts` (**critério de aceite 1**): toda rodada com o técnico empregado tem manchete do
  clube; limite do feed; um fato por jogo com extras; ordem por relevância; determinismo.
- `variants.test.ts`: variação determinística; toda chave `news.<tipo>.<n>` existe; nenhuma
  variação com mais da metade numa temporada (SC-005).
- `turnover.test.ts`: artilheiros, acumulados com poda, recordes de pontos, resumo, poda do feed.
- `history.test.ts`: títulos por clube, artilheiros históricos (aposentados incluídos), lendas.

## 2. Save

`pnpm test packages/save` — v9 → v10; rodada e virada gravam `news`; `size.test.ts`
(**critério de aceite 3**, limites de R11).

## 3. Simulação

```bash
pnpm sim:world --seasons 30
```

Esperado: tipos de manchete por temporada (≥ 10) e ✓ nos limites.

## 4. App

`pnpm test apps/web` e `pnpm dev:web`. Roteiro: nova carreira → simular rodadas → cartão Manchetes na
Início → "Ver todas" abre Notícias com o seletor de rodada → terminar a temporada → Histórico mostra
campeão, artilheiro, títulos, artilheiros, recordes e clubes; link para a trajetória do técnico.

## Gates

`pnpm typecheck && pnpm lint && pnpm test`; `pnpm build:web && pnpm test:e2e`.
