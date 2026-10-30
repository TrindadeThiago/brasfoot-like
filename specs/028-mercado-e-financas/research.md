# Research: Mercado e finanças

## R1 — Verificação dos dados dos gráficos (feita no código)
Fonte: `packages/engine/src/finance/types.ts`.
- **Extrato** (`FinanceState.ledger`): cada `LedgerEntry` tem `season`, `round` (rodada da liga; 0 = início ou virada), `category`, `amount` (receita positiva, despesa negativa) e, nas bilheterias do calendário por datas, `date` e `competitionId`. `FinanceState.gates` traz, por jogo em casa, `attendance`, `capacity`, `price`, `revenue`, `date`.
- **Por mês:** só as bilheterias têm `date`; os demais lançamentos têm `round`. O mês de um lançamento é `entry.date`, se houver, senão a data da rodada da liga no calendário do save (`save.calendar.days`, o dia cujo `slot` é a liga principal e a `round` do lançamento); `round 0` cai no mês do início da temporada. Isso é confiável: salários, juros e parcelas são lançados por rodada da liga.
- **Saldo ao longo da temporada:** `seasonStartCash` + soma acumulada dos lançamentos até cada ponto. **Conciliação:** a soma de todos os lançamentos da temporada atual tem de levar `seasonStartCash` até `cash`; o teste da série compara os dois. Se não bater (save antigo ou lançamento fora do extrato), o gráfico não aparece e a aba mostra os totais em tabela.
- **Dívida ao longo da temporada:** `debt` só muda por `loan_in` (+) e `loan_out` (−); juros são despesa de caixa (`interest`) e não entram na dívida. A dívida em cada ponto é `debt_atual − Σ (loan_in + loan_out)` dos lançamentos posteriores; conciliação: a dívida do início é a `debtEnd` da temporada anterior (`seasons`). Sem bater, o gráfico some.
- **Origem e destino:** receitas = `gate`, `sponsorship`, `prize`, `loan_in`, `transfer_sale`; despesas = `wages`, `interest`, `loan_out`, `stadium`, `transfer_purchase`. É exatamente a divisão das tabelas atuais (`FinanceSummary`), então as roscas por origem e por destino batem com as categorias do jogo.
- **Histórico por temporada:** `FinanceSeasonSummary` (`startCash`, `endCash`, `totals` por categoria, `debtEnd`, `capacityEnd`) e `crises` (`CrisisRecord`) bastam para o gráfico e a tabela.
- **Público por jogo:** `gates` (público, capacidade, data, adversário).
- **Conclusão:** todos os gráficos do escopo têm dado; nenhum é cortado, e cada um tem a conciliação como guarda.

## R2 — Gráficos sem biblioteca
- **Decisão**: SVG à mão em `ui/charts/`: `LineChart`, `BarChart` (barras agrupadas receita × despesa por mês) e `DonutChart`, dentro de `ChartFigure` (`<figure>` com `role="img"`, `aria-label` com o resumo em texto, `<figcaption>` e legenda em tabela com nome, valor e percentual). As cores vêm de tokens e cada série tem rótulo de texto na legenda e, nas barras, padrão de preenchimento diferente.
- **Razão**: gate VIII (sem dependência), controle de contraste nos dois temas, bundle pequeno.
- **Alternativas**: biblioteca de gráficos (centenas de KB, estilo próprio, a11y a verificar); canvas (inacessível).

## R3 — Séries como funções puras
- **Decisão**: `game/finance-series.ts`: `balanceSeries(save)`, `monthlyFlows(save)`, `breakdown(save, "origin" | "destination")`, `debtSeries(save)`, `attendanceSeries(save)`, `seasonHistory(save)`. Cada uma devolve `undefined` quando a conciliação falha; as telas decidem tabela ou gráfico. Testes com saves de teste e com saves adulterados.

## R4 — Finanças em abas
- **Decisão**: `FinanceHeader` fixo (saldo, resultado da temporada = `cash − seasonStartCash`, dívida, estádio, aviso de crise e de rodada ao vivo) e `Tabs`; cada aba é um componente que reaproveita os painéis atuais (`TicketPrice`, `StadiumPanel`, `CreditPanel`, `HomeGames`, `PrizeStatement`, `FinanceHistory`) e acrescenta os gráficos. As ações e o resultado na hora continuam sendo as do `useGame` (`setTicketPrice`, `takeLoan`, `repayLoan`, `startStadiumWorks`).

## R5 — Mercado: tabela, modal e comparação
- **Decisão**: `MarketTable` perde a coluna de seleção e a de ações e ganha `onRowClick` e o nome como botão (padrão da 026). O `MarketPlayerModal` mostra barras de força e condição, dados e estatísticas (visíveis apenas), e os botões Fazer oferta e Pedir empréstimo (ou Contratar), Adicionar à comparação e Fechar. A comparação é estado da página (`Set` com até 4), com `CompareTray` acima da tabela e `ComparePanel` num `Dialog`.
- **Razão**: reaproveita o padrão e o `NegotiationDialog` (já há `NegotiationTarget`).
- **Alternativas**: manter a seleção por checkbox (contra o pedido).

## R6 — Diálogos de negociação
- **Decisão**: o `NegotiationDialog` troca os campos soltos pelo `Field` da 025 (rótulo, ajuda, erro com `aria-describedby`/`role="alert"`), mostra o valor de mercado como referência e os motivos de recusa já existentes (`market.reason.*`) em texto; o foco entra no diálogo e volta a quem abriu (a pilha de diálogos da 026 resolve o aninhamento).
- **Venda e rescisão**: já feitas no modal do jogador (026); só confirmar que as mensagens seguem.

## R7 — Desempenho
- **Decisão**: manter `marketRows` memoizada por save (uma montagem) e `filterRows` sobre ela; `useDeferredValue` no filtro de nome; a tabela renderiza `PAGE_SIZE = 100` por vez com Mostrar mais. O mundo padrão atual tem 10 565 jogadores (o "cerca de mil" do pedido era o de antes) e o completo, ≈ 39 000; o teste de tempo cobre os dois.
- **Alternativas**: virtualização da tabela (desnecessária com 100 linhas por vez); índice por nome (otimização antes da hora).

## R8 — Dinheiro e escala
- **Decisão**: o jogo tem uma moeda fictícia única (`formatMoney`, símbolo `$`) e a escala por país é aplicada pelas regras de economia, não por formatação. Toda tela usa `formatMoney`/`formatMoneyWords`; os eixos dos gráficos usam `formatMoneyWords`. A spec foi ajustada: "formato de dinheiro do jogo" no lugar de "moeda do país", que o jogo não tem.

## R9 — Mensagens de trava
- **Decisão**: manter as regras do `useGame`/motor; as mensagens (rodada ao vivo, janela fechada, elenco cheio, teto de estrangeiros, caixa insuficiente) aparecem no modal e nos diálogos via `Notice`/texto e desativam o botão com o motivo.

## R10 — Testes
- Unidade: séries (conciliação ok e adulterada), gráficos (resumo, legenda, texto), tabela clicável, modal, bandeja (limite de 4), diálogos (erro ligado ao campo, foco), abas de Finanças.
- E2E: `market.spec` atualizado; novo teste só com teclado (contratar livre, oferta recusada, contraproposta, renovar); `finances.spec` (aplicar preço, tomar, amortizar, obra); `layout`, `a11y`, `keyboard`.

## R11 — Nota de versão e entrega
- Itens da 028 acrescentados à nota única do 1.0.0 no mesmo PR; versão inalterada; PR com base `release/v1.0.0`.
