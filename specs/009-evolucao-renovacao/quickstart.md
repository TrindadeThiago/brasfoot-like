# Quickstart: validar evolução e renovação

Pré-requisitos: Node ≥ 22.13, `pnpm install`. Contratos em [contracts/](contracts/), limites em
[research.md](research.md) R9.

## 1. Motor

```bash
pnpm test packages/engine/test/renewal
```

Esperado:

- `evolution.test.ts`: jovens com potencial alto sobem, 27–30 estáveis, 31+ caem; força em
  `[20, potencial]`; minutagem aumenta o crescimento (dois jovens iguais, um com 100% e outro com 0%
  de participação); determinístico.
- `retirement.test.ts`: ninguém abaixo de 33; chance cresce com a idade; 38+ sempre; aposentados
  somem do mundo.
- `youth.test.ts`: 2–4 jovens por clube, 16–18 anos, nomes do banco do país, potencial > força,
  ids novos e únicos; reputação maior ⇒ jovens melhores em média.
- `squads.test.ts`: reposição até os mínimos; dispensa até o máximo sem quebrar mínimos.
- `regulator.test.ts`: média acima do alvo ⇒ offset desce; sem craques ⇒ bônus sobe; limites.
- `turnover.test.ts`: ordem das etapas; o mundo devolvido segue o schema do banco.
- `long-run.test.ts` (**critérios de aceite**): 30 temporadas sem interação, 2 seeds, limites R9 +
  economia da 008.

## 2. Save

```bash
pnpm test packages/save
```

Esperado: carreira nova com `renewal`; v4 → v5; virada grava mundo, renovação e aviso; escalação
ajustada quando um titular se aposenta.

## 3. Simulação

```bash
pnpm sim:world --seasons 30
pnpm sim:economy --seasons 30
```

Esperado: por temporada, média/p10/p50/p90/máx., craques, idade média e elencos válidos, com ✓/✗
por limite e código de saída 0; a economia continua dentro dos limites da 008.

## 4. App

```bash
pnpm test apps/web
pnpm dev:web
```

Roteiro: nova carreira → simular até a rodada 19 → Elenco mostra a coluna Evolução → simular até
o fim → Próxima temporada → Início mostra "Mudanças no elenco" (aposentados, chegadas…) → Elenco com
os jovens novos.

## Gates

`pnpm typecheck && pnpm lint && pnpm test` verdes; `pnpm build:web && pnpm test:e2e` verde.
