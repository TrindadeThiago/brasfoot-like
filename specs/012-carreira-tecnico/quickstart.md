# Quickstart: validar a carreira do técnico

Pré-requisitos: Node ≥ 22.13, `pnpm install`. Contratos em [contracts/](contracts/), parâmetros
e limites em [research.md](research.md) R13 e R17.

## 1. Motor

```bash
pnpm test packages/engine/test/board
```

Esperado:

- `goals.test.ts` (**critério de aceite 1**): clube mais forte da divisão recebe meta mais
  exigente que o mais fraco; níveis impossíveis nunca aparecem; meta de meio de temporada segue a
  posição atual; tipos financeiros por situação do caixa.
- `confidence.test.ts`: vitórias sobem, derrotas descem, abaixo da meta e crise descem; paciência
  maior com reputação maior; fatores registrados.
- `firing.test.ts`: demissão no meio com confiança mínima fora da carência; carência protege;
  avaliação mantém/demite; "sem demissão" vira `wouldFire` (**critério de aceite 2**).
- `reputation.test.ts`: título/acesso sobem, rebaixamento/demissão descem, limites 1–100.
- `offers.test.ts`: compatibilidade por reputação, prazo e expiração, aceitar/recusar, nada do
  clube atual ou de quem demitiu, garantia na virada.
- `coaches.test.ts`: vagas preenchidas pela IA, pool limitado, nomes do banco do país.
- `round.test.ts`: `completeCareerRound` com `board`; demissão libera o clube (mercado limpo) e a
  rodada seguinte roda com `managerClubId ""`; determinismo com salvar/carregar no meio.
- `long-run.test.ts`: 30 temporadas, 2 seeds, limites R13 (trocas de técnico, vagas, pool,
  cenários de técnico simulado).

Também: `pnpm test packages/engine/test/market packages/engine/test/finance` (regressão).

## 2. Save

`pnpm test packages/save` — v7 → v8 (fixture); criação com `noFiring`; rodada com demissão;
aceitar proposta troca `clubId` e a escalação (**critério de aceite 3**); `boardProblem`.

## 3. Simulação

```bash
pnpm sim:world --seasons 30
```

Esperado: trocas de técnico por temporada (%), parcela em clubes abaixo da expectativa e ✓ nos
limites.

## 4. App

`pnpm test apps/web` e `pnpm dev:web`. Roteiros:

1. Nova carreira num clube grande → Início mostra metas exigentes; repetir num pequeno → metas
   modestas.
2. Simular rodadas → confiança muda com motivos; Carreira › Diretoria mostra o histórico.
3. Carreira com "Sem demissão" num clube fraco → simular a temporada inteira perdendo → Fim de
   temporada mostra "a diretoria o demitiria" e o técnico continua.
4. Carreira normal até a demissão → Início "Sem clube" com propostas → avançar rodadas → aceitar
   → jogar com o novo clube no mesmo save; Carreira › Histórico mostra as duas passagens.

## Gates

`pnpm typecheck && pnpm lint && pnpm test`; `pnpm build:web && pnpm test:e2e`.
