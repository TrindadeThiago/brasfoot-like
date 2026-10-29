# Contrato: tokens de design

Arquivo: `apps/web/src/styles/tokens.css`.

| Papel | Escuro | Claro |
|---|---|---|
| `--color-bg` | #0a0e13 | #eef1f5 |
| `--color-sidebar` | #0f151c | #f7f9fb |
| `--color-surface` | #121922 | #ffffff |
| `--color-surface-2` | #16222c | #e6ebf1 |
| `--color-border` | #2e3a47 | #d3dae3 |
| `--color-control-border` | #748395 | #6b7a8a |
| `--color-text` | #eef2f6 | #14202b |
| `--color-muted` | #98a6b6 | #4a5868 |
| `--color-accent` | #3ddc84 | #0f7a44 |
| `--color-on-accent` | #06140c | #ffffff |
| `--color-danger` | #ff8a8a | #b42323 |
| `--color-warning` | #ffb454 | #8a5300 |
| `--color-info` | #5ec8ff | #0b5fa5 |

Os nomes finais seguem os `--color-*` já existentes; os acima são os valores-alvo (contraste verificado).

Regras: nenhuma cor fixa fora de `tokens.css` (exceto campo/gramado em `Pitch`, via tokens próprios); fontes `--font-display` (Space Grotesk) e `--font-body` (Inter) com reserva de sistema; foco visível 3 px e movimento reduzido preservados.

Teste: Vitest lê os dois conjuntos e afirma as razões mínimas.
