# Quickstart: validar divisões e virada de temporada

Pré-requisitos: Node ≥ 22.13, `pnpm install` na raiz. Contratos em [contracts/](contracts/) e
tipos em [data-model.md](data-model.md).

## 1. Motor (Vitest)

```bash
pnpm test packages/engine/test/career
```

Esperado:

- `league-round.test.ts`: uma rodada da liga disputa 10 + 10 partidas; `advanceLeague` ≡ rodada ao
  vivo com `finishRound`; a parte de cada divisão é igual a `completeRound` daquela `Season`.
- `composition.test.ts`: 4 últimos da Série A ↔ 4 primeiros da Série B; desempate na linha de corte
  usa os critérios da competição; mod com 3 divisões e vagas diferentes funciona; uma divisão só
  não troca ninguém.
- `turnover.test.ts`: ordem das etapas padrão; extras antes/depois de âncoras; extras na mesma
  posição ordenadas por id independentemente da ordem de registro; âncora inexistente → erro;
  lesões herdadas, amarelos/suspensões zerados; ano + 1; histórico com campeões e sobem/descem.
- `multi-season.test.ts` (**critérios de aceite**): 10 temporadas sem interação — sempre 20
  clubes por divisão, partição exata, rebaixado em N joga a Série B em N+1; duas execuções (uma
  com JSON ida-e-volta entre temporadas) geram históricos idênticos.

Regressão: `pnpm test packages/engine` inteiro verde (determinismo, credibilidade e desempenho da
Série A não mudam, R3).

## 2. Save (Vitest)

```bash
pnpm test packages/save
```

Esperado: carreira nova com clube da Série B; migração v2 → v3 dos fixtures (meio de temporada e
encerrado) com a Série A idêntica e a Série B na mesma rodada; v1 → v3 em cadeia;
`advanceCareerSeason` mantém o clube, ajusta a escalação e é determinístico.

## 3. Simulação manual

```bash
pnpm sim:season --career 10
```

Esperado: por temporada, campeões das duas divisões, quem subiu e desceu e a contagem 20/20.

## 4. App web

```bash
pnpm test apps/web         # fluxos com happy-dom
pnpm dev:web               # http://localhost:3000 (ou a próxima porta livre)
```

Roteiro manual:

1. **Nova carreira** → filtrar "Série B" → escolher um clube → Começar.
2. **Jogar rodada** ao vivo: só os 10 jogos da Série B aparecem; ao fim, "Resultados da outra
   divisão" mostra os 10 jogos da Série A daquela rodada.
3. **Competição**: alternar Série A/B com as abas ou `[`/`]`; zonas "Acesso" (top 4 da B) e
   "Rebaixamento" (últimos 4 da A) marcadas.
4. **Simular direto** até a 38ª rodada → resumo de fim de temporada: campeões, 4 sobem, 4 descem,
   posição do clube com destaque.
5. **Próxima temporada** (`N`): Início mostra ano + 1, rodada 1; classificação zerada; o clube
   está na divisão correta; idades no elenco + 1.
6. **Histórico** (`H`): uma linha da temporada encerrada; o detalhe bate com o resumo.
7. Abrir uma carreira criada antes desta feature (save v2): abre, mostra a Série B na mesma
   rodada e continua normalmente.

## 5. Ponta a ponta (Playwright)

```bash
pnpm build:web && pnpm test:e2e seasons.spec.ts
```

Esperado (SC-004): temporada inteira em modo direto → resumo → próxima temporada → primeira rodada
da nova temporada jogada; virada em < 2 s (SC-005).

## Gates

`pnpm typecheck && pnpm lint && pnpm test` verdes; teste de literais do i18n verde (SC-008).
