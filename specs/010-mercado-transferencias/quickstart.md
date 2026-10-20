# Quickstart: validar contratos e mercado

Pré-requisitos: Node ≥ 22.13, `pnpm install`. Contratos em [contracts/](contracts/), regras em
[research.md](research.md), limites de longo prazo em R11.

## 1. Motor

```bash
pnpm test packages/engine/test/market
```

Esperado:

- `contracts.test.ts`: duração por idade dentro dos limites; salário = `deriveWage`;
  `ensureContracts` só preenche os que faltam; determinístico.
- `value.test.ts`: último ano < dois anos < três+; livre = 0.
- `windows.test.ts`: janelas padrão nas rodadas 0–3 e em volta da central; config do mod respeitada.
- `search.test.ts`: filtros combinados, escopo livres, ordenação, nenhum atributo oculto.
- `negotiation.test.ts` (**SC-001, SC-002**): fora da janela compra/empréstimo recusados e livre
  permitido; enumeração de todos os caminhos com no máximo uma contraproposta por lado; recusa do
  atleta desfaz o acordo sem custo; uma negociação por atleta.
- `effects.test.ts` (**SC-004, SC-005**): soma de caixa invariante; limites de elenco; empréstimo
  muda `clubId` e mantém contrato de origem.
- `incoming.test.ts`: propostas só na janela, ≤ 3 abertas, expiram; contraproposta do usuário
  aceita ou recusada uma vez.
- `turnover.test.ts` (**SC-003**): emprestados voltam; expirados viram livres; renovado continua;
  contrato que termina no empréstimo vira livre; livres antigos saem; IA renova pela regra.
- Longo prazo (**SC-006**): `pnpm test packages/engine/test/finance/long-run.test.ts
  packages/engine/test/renewal/long-run.test.ts` — limites da 008/009 e livres ≤ 150.

## 2. Save

```bash
pnpm test packages/save
```

Esperado: carreira nova com contratos e mercado; v5 → v6 (fixtures, **SC-008**); compra grava
mundo, finanças, mercado e ajusta escalação; virada grava livres.

## 3. Simulação

```bash
pnpm sim:world --seasons 30
pnpm sim:economy --seasons 30
```

Esperado: relatório com livres por temporada e folha contratual, ✓ em todos os limites, código 0.

## 4. App

```bash
pnpm test apps/web
pnpm dev:web
```

Roteiro: nova carreira → Mercado (janela aberta) → filtrar atacantes 65+ até 28 anos → comparar
três → oferecer abaixo do valor → aceitar contraproposta → propor contrato → aceitar pedido →
Elenco mostra o reforço e Finanças a compra → simular até a rodada 5 → Mercado diz "Fechada" e a
oferta é bloqueada → contratar um livre (permitido) → Contratos: renovar um atleta no último ano →
simular até o fim → Próxima temporada → expirados fora do elenco e entre os livres.

## Gates

`pnpm typecheck && pnpm lint && pnpm test` verdes; `pnpm build:web && pnpm test:e2e` verde.
