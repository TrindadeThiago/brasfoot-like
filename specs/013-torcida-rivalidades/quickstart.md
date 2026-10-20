# Quickstart: validar torcida e rivalidades

Pré-requisitos: Node ≥ 22.13, `pnpm install`. Contratos em [contracts/](contracts/), parâmetros e
limites em [research.md](research.md) R12 e R14.

## 1. Motor

```bash
pnpm test packages/engine/test/fans packages/engine/test/validation
```

Esperado:

- `rivalries.test.ts` (**critério de aceite 2**): mod com rivalidades válidas carrega; clube
  inexistente, mesmo clube, par repetido (A–B e B–A) e intensidade fora de 1–3 são rejeitados com o
  código e o caminho certos; arquivo ausente = sem rivalidades; `generateRivalries` dá 1–3 rivais por
  clube e reproduz `mods/default/rivalries.json`.
- `mood.test.ts` (**critério de aceite 1**): vitórias sobem, derrotas descem; 5 derrotas ⇒ ≥ 15
  pontos; clássico perdido (intensidade 3) ⇒ ≥ 1,5× a derrota comum; expectativa puxa; retorno ao
  neutro; ídolo vendido derruba, destaque contratado anima; limites 0–100.
- `gate.test.ts`: humor alto ⇒ público maior que humor baixo; capacidade respeitada; 5 derrotas ⇒
  público médio −5%.
- `board-fans.test.ts`: fator "fans" só fora da faixa neutra; clássico pesa na confiança.
- `turnover.test.ts`: virada aproxima do neutro, título/acesso sobem, rebaixamento desce.
- `long-run.test.ts`: 30 temporadas, limites de R12.

Também: `pnpm test packages/engine/test/finance packages/engine/test/board` (regressão).

## 2. Save

`pnpm test packages/save` — v8 → v9 (banco padrão ganha rivalidades; outro banco não); rodada e
virada gravam `fans`.

## 3. Banco padrão e simulações

```bash
pnpm gen:default-bank && git diff --stat mods/default   # só rivalries.json (e package.json)
pnpm validate-bank mods/default
pnpm sim:world --seasons 30 && pnpm sim:economy --seasons 30
```

## 4. App

`pnpm test apps/web` e `pnpm dev:web`. Roteiro: nova carreira → Início mostra o cartão Torcida →
calendário marca os clássicos → simular derrotas e ver o humor cair → Carreira › Torcida lista os
rivais → num clássico, o selo aparece na rodada ao vivo.

## Gates

`pnpm typecheck && pnpm lint && pnpm test`; `pnpm build:web && pnpm test:e2e`.
