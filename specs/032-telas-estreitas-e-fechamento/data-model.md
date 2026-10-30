# Modelo de dados: Telas estreitas, acessibilidade e fechamento do marco

Nenhum dado do jogo, save ou mod muda. Abaixo estão os registros de verificação desta feature
(arquivos de documentação e relatórios de teste), não dados persistidos.

## Registros

| Registro | Campos | Onde fica |
|---|---|---|
| `Medida de desempenho` | tela ou operação, mediana (ms), mínimo e máximo, linha de base (ms), tolerância (10%), resultado (dentro ou fora) | `baseline.md` (T001 e T0xx final) |
| `Medida de pacote` | tamanho de `out`, JS, CSS, número de arquivos do precache, limite (4,5 MB e 2,0 MB de JS) | `baseline.md` |
| `Meta da 020` | dia, virada, heap, save no início da 31ª, save na última rodada, export, valor medido, limite | saída de `pnpm sim:world --scale` registrada em `baseline.md` |
| `Item de auditoria de estilo` | arquivo, linha, tipo (cor solta, tamanho solto, `!important`, classe sem uso), correção | resultado de `style-audit.test.ts` (vazio ao fim) |
| `Linha da matriz responsiva` | tela, aba ou diálogo, largura, tema, resultado (sem rolagem horizontal, sem texto cortado, ação principal à vista) | `e2e/responsive.spec.ts` |
| `Gate do release` | nome (typecheck, lint, unit, três simulações, build, check-release, e2e), comando, resultado, data | `baseline.md` (seção "Gates") |

## Regras

- A lista de telas, abas e diálogos da matriz responsiva é a mesma da varredura de acessibilidade
  (uma única fonte de verdade em `e2e/screens-list.ts`), para as duas verificações não divergirem.
- O tamanho do save e o tempo da virada vêm das simulações do gate; a interface nova não os altera,
  então a comparação é com os valores de `SCALE_LIMITS` e com a execução da 025.
- Nenhuma faixa numérica de balanceamento muda; `SCALE_LIMITS` não é editado.
