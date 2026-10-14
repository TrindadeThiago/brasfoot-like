# 008 — Finanças do clube

Marco 3 — Carreira

`/speckit-specify`

```text
Finanças dos clubes no nível do Brasfoot (ver docs/design.md §8).

Objetivo: o dinheiro cria dilemas — segurar ou vender, gastar ou economizar — numa economia fechada em que clubes da IA seguem exatamente as mesmas regras.

Escopo:
- Caixa, folha salarial (paga por período), bilheteria por jogo em casa (capacidade do estádio, preço do ingresso, fase do time, adversário, divisão), premiação por colocação e títulos, patrocínio anual (depende de reputação e divisão), empréstimo bancário com juros e limite.
- Alavancas do jogador: preço do ingresso e expansão do estádio (custo e tempo de obra).
- Tela de finanças com saldo, receitas e despesas por categoria e histórico por temporada.
- Clubes da IA também decidem preço de ingresso e expansão por regras simples.
- Consequência de saldo negativo prolongado registrada como estado (a punição pela diretoria vem na 012).

Fora de escopo: direitos de TV detalhados, sócio-torcedor, merchandising, compra/venda de jogadores (vem na 010).

Critérios de aceite:
- Em 30 temporadas simuladas sem interação: nenhum clube acumula caixa absurdo em relação aos demais (limite definido no plano), a maioria dos clubes não quebra, e clubes grandes continuam financeiramente mais fortes.
- Ingresso caro reduz público de forma mensurável; ingresso barato aumenta público e reduz receita por torcedor.
```
