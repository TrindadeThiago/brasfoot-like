# Contrato: tela de finanças (008)

Complementa [specs/007-divisoes-virada-temporada/contracts/ui.md](../../007-divisoes-virada-temporada/contracts/ui.md).

## Rotas e navegação

| Rota | Tela |
|---|---|
| `/jogo/financas?c=<id>` | **nova** — finanças do clube do jogador |

Menu: Início, Elenco, Escalação, Competição, Calendário, **Finanças**, Histórico. Atalhos: `1`–`6`
(Finanças = `6`), `H` histórico (inalterado).

## Tela de finanças

1. **Topo**: saldo atual (positivo/negativo com cor e texto), dívida, capacidade do estádio; aviso
   de crise ("Crise financeira há N rodadas") quando houver.
2. **Temporada**: receitas (bilheteria, patrocínio, premiação, empréstimos) e despesas (salários,
   juros, amortização, obras) por categoria, com totais e saldo inicial → atual.
3. **Ingresso**: campo numérico (faixa do mod), estimativa do próximo jogo em casa (público,
   ocupação, renda) recalculada ao digitar, botão "Aplicar". Erro de faixa em `role="alert"`.
4. **Crédito**: limite, disponível, taxa por rodada e custo por rodada da dívida atual; campo de
   valor com "Tomar" e "Amortizar" (e "Quitar").
5. **Estádio**: obra em andamento (lugares, rodadas restantes) ou as opções (lugares, custo,
   duração) com "Contratar"; opções indisponíveis desabilitadas com o motivo.
6. **Jogos em casa** (temporada atual): rodada, adversário, público, ocupação %, preço, renda.
7. **Histórico**: por temporada, saldo inicial, receitas, despesas, saldo final.

Todos os valores com `formatMoney` (pt-BR, moeda fictícia `$`). Ações desabilitadas durante a rodada
ao vivo. Cada ação salva (como as da escalação).

## Outras telas

- Início: aviso de crise do clube do jogador e saldo atual no cartão de posição.
- Resumo de fim de temporada: premiação recebida pelo clube do jogador.

## Textos

`packages/i18n/locales/pt-BR/ui.json` (`finance.*`, `nav.finance`, `help.finance`) e
`finance-errors.json` (erros das ações).
