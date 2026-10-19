# Quickstart: validar as finanças

Pré-requisitos: Node ≥ 22.13, `pnpm install`. Contratos em [contracts/](contracts/), tipos em
[data-model.md](data-model.md), limites em [research.md](research.md) R10.

## 1. Motor

```bash
pnpm test packages/engine/test/finance
```

Esperado:

- `gate.test.ts`: público ≤ capacidade; monotonicidade em preço, adversário, fase e divisão; +10% no
  preço reduz ≥ 5% o público sem lotação; −10% aumenta o público e reduz a renda por torcedor
  (SC-004); estimativa = cálculo sem ruído; ruído reproduzível.
- `round.test.ts`: mandante recebe a renda, todos pagam a folha, juros sobre a dívida; folha da
  temporada = 12 salários exatos; conservação por rodada (SC-005); ao vivo = direto (SC-006).
- `actions.test.ts`: preço na faixa; empréstimo até o limite; amortizar até o caixa; uma obra por
  vez, capacidade só ao terminar, atravessa a virada; erros com os códigos do contrato.
- `turnover.test.ts`: premiação por posição e título; patrocínio pela nova divisão (promovido já
  recebe o da Série A); resumo da temporada no histórico; lançamentos zerados.
- `ai.test.ts` e `crisis.test.ts`: regras da IA determinísticas; crise abre e fecha.
- `long-run.test.ts` (**critérios de aceite**): 30 temporadas sem interação, limites de R10.

## 2. Save

```bash
pnpm test packages/save
```

Esperado: carreira nova com finanças e patrocínio; v3 → v4 (meio de temporada e encerrada);
v1 → v4 em cadeia; ações do jogador validadas e salvas; virada leva as finanças.

## 3. Calibração

```bash
pnpm sim:economy --seasons 30
```

Esperado: por temporada, caixa mínimo/mediano/máximo, clubes em crise e a correlação reputação ×
caixa; ✓/✗ para cada limite de R10 e código de saída 0.

## 4. App

```bash
pnpm test apps/web
pnpm dev:web
```

Roteiro: nova carreira → `6` Finanças (saldo com o patrocínio já recebido) → mudar o preço e ver a
estimativa → simular uma rodada em casa (público e renda na lista, saldo atualizado) → tomar e
amortizar empréstimo → contratar uma obra e ver as rodadas restantes → simular até o fim e conferir
a premiação no resumo e o histórico financeiro na temporada seguinte.

## 5. Ponta a ponta

```bash
pnpm build:web && pnpm test:e2e finances.spec.ts
```

## Gates

`pnpm typecheck && pnpm lint && pnpm test` verdes; teste de literais do i18n verde.
