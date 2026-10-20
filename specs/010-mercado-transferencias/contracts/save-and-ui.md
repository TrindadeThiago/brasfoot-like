# Contrato: save v6, provider e telas

## Save v6

```ts
interface SaveGame {             // campos novos/alterados
  formatVersion: 6;
  bank: CompletedBank;           // todo jogador com contract
  market: MarketState;
}
```

- `createCareer`: `ensureContracts` sobre o mundo inicial; `market` vazio.
- Migração v5 → v6: contratos gerados com a seed do save (determinístico), `market` vazio,
  `finances.seasons[].totals` ganham `transfer_purchase`/`transfer_sale` = 0.
- Rodada (`commitRound`/`playRound`): após `completeCareerRound`, `marketAfterRound`.
- Virada (`advanceCareerSeason`): passa e grava `market`.

### `packages/save/src/market.ts`

Wrappers sobre o save (cada um devolve `{ ok, save }` ou erro traduzível), aplicando
`withAdjustedLineup` para os `departed`:

`startManagerNegotiation`, `answerManagerClubCounter`, `proposeManagerContract`,
`answerManagerPlayerDemand`, `cancelManagerNegotiation`, `answerManagerIncomingOffer`,
`marketContextOf(save)`.

## GameProvider (apps/web)

Ações novas: `startNegotiation`, `answerClubCounter`, `proposeContract`, `answerPlayerDemand`,
`cancelNegotiation`, `answerIncomingOffer`. Erros viram mensagens de `errors.json` (`market.*`).

## Telas

| Onde | O quê |
|---|---|
| Header | item **Mercado** (`/jogo/mercado`), atalho `m`; selo com nº de propostas abertas |
| Mercado › Buscar | filtros (posição, força mín/máx, idade mín/máx, valor máx, salário máx, contrato até, escopo todos/clubes/livres, texto), tabela ordenável, estado da janela ("Janela aberta até a rodada N" / "Fechada — abre na rodada N"), seleção de 2–4 → Comparar |
| Mercado › Comparar | colunas lado a lado: posição, força, idade, características, clube, valor, salário, contrato |
| Mercado › Negociações | cada negociação com etapa, valores e só as ações válidas (oferecer, aceitar/recusar contraproposta, propor contrato com salário e anos, aceitar/recusar pedido, cancelar); motivo de recusa |
| Mercado › Propostas | propostas da IA: jogador, clube, valor, prazo; aceitar, recusar, contrapropor (uma vez) |
| Mercado › Contratos | elenco com salário, fim, valor; destaque do último ano; Renovar |
| Elenco | coluna "Contrato até"; marca no último ano; "Emprestado" quando for o caso |
| Detalhe do jogador | botões Fazer oferta / Pedir empréstimo / Contratar / Renovar conforme o caso |
| Início | cartão de mercado: propostas abertas e contratos terminando |
| Finanças | linhas "Compras de jogadores" e "Vendas de jogadores" |

Todas as ações por teclado (foco, Enter, Esc fecha painel) e mouse; valores com `formatMoney`.

## i18n

`ui.json`: `market.*` (abas, filtros, colunas, etapas, respostas, janela, cartões),
`finance.category.transfer_purchase|transfer_sale`, `squad.contract*`.
`errors.json`: `market.window_closed`, `market.insufficient_cash`, `market.squad_full`,
`market.squad_minimum`, `market.player_on_loan`, `market.already_negotiating`,
`market.invalid_duration`, `market.invalid_amount`, `market.not_found`, `market.invalid_stage`;
motivos `market.reason.no_interest|low_wage|low_offer|key_player|squad_minimum`.
