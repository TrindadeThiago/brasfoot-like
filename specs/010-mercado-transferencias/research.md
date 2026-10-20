# Research: Contratos e mercado de transferências

Decisões técnicas da 010. Valores numéricos são padrões iniciais em `DEFAULT_MARKET`, ajustáveis
por `competition.market` e calibrados nos testes de longo prazo (R11).

## R1 — Onde vive o contrato

- **Decision**: campo opcional `contract` no jogador do banco: `{ wage, untilYear, loan? }`, com
  `loan = { fromClubId, untilYear }`. Durante o empréstimo `clubId` é o clube que recebe (partidas,
  escalação e folha já leem `clubId`).
- **Rationale**: evolução, aposentadoria, jovens, dispensas e telas já percorrem `bank.players`;
  um mapa paralelo `playerId → contrato` teria de ser mantido em cada etapa da 009. Opcional no
  schema do mod → mods antigos continuam válidos e mods podem declarar contratos (dados).
- **Alternatives considered**: `MarketState.contracts` no save (sincronização frágil com o mundo);
  tornar obrigatório no schema (quebra mods e o gerador do banco padrão).

## R2 — Livres fora do banco

- **Decision**: jogadores sem clube ficam em `MarketState.freeAgents: FreeAgent[]` — o jogador sem
  `clubId`/`contract`, mais `sinceYear` e `lastClubId`. Ao contratar, voltam a `bank.players` com
  clube e contrato.
- **Rationale**: `playerSchema.clubId` é obrigatório e a validação de elencos da 009 percorre o
  banco; livres não jogam, não evoluem e não entram na folha.
- **Alternatives considered**: `clubId` opcional no banco (afeta schema do mod, validações e todas as
  consultas por clube).

## R3 — Contratos iniciais e folha

- **Decision**: `initialContract(player, club, date, rng)`: `wage = deriveWage(...)` (inalterado da
  008) e duração por idade — ≤ 21: 3–5 temporadas; 22–29: 2–4; 30–32: 1–2; ≥ 33: 1 — sorteada por
  PRNG do jogador, com `untilYear = ano da temporada + duração − 1`. `ensureContracts(world, …)`
  gera os que faltam (carreira nova, migração, jovens). `annualWageBill` soma
  `player.contract?.wage ?? deriveWage(...)`; jogadores emprestados contam para o clube que os tem.
- **Rationale**: no dia 0 a folha é idêntica à da 008, então a calibração da economia parte do mesmo
  ponto; a diferença ao longo do tempo é só o atraso entre evolução e renovação.
- **Alternatives considered**: salário recalculado todo ano (contrato sem efeito).

## R4 — Valor de mercado

- **Decision**: `marketValue = deriveMarketValue × fator de contrato`: 1 ano restante (último ano)
  60%, 2 anos 85%, 3+ 100%; emprestado usa o contrato do clube de origem; livres valem 0 de taxa.
- **Rationale**: atende "último ano vale menos" (US6) sem mudar a fórmula existente.

## R5 — Janelas

- **Decision**: `competition.market.windows: [{ fromRound, toRound }]`, em rodadas jogadas da liga
  (`leagueRound`): a janela está aberta quando `fromRound ≤ jogadas ≤ toRound`. Padrão: início
  `{0, 3}` e meio `{m − 1, m + 2}`, `m = midSeasonRound(league)` (rodada central da 009); sem
  `windows` no mod, o padrão é calculado da temporada. `nextWindow` informa a próxima abertura.
- **Rationale**: o jogo avança por rodadas (não por dias); "início da temporada e meio do ano" do
  design viram duas faixas de rodadas; a liga tem um único contador de rodada.

## R6 — Resposta do clube

- **Decision**: `askingPrice = marketValue × importância × ruído`, com importância 125% se o
  atleta está entre os 11 mais fortes do clube, 100% caso contrário, e ruído 95–110% (PRNG por
  seed + temporada + jogador + "ask", estável dentro da janela). Oferta ≥ pedida → aceita; ≥ 70% da
  pedida → contraproposta = pedida (arredondada a 1.000); abaixo → recusa. Recusa direta também se a
  venda deixar o vendedor abaixo do mínimo da 009 (por posição ou total). A contraproposta do
  usuário (US4) é aceita se ≤ `maxBid` da IA (valor × 100–120%, PRNG), senão recusada.
  Empréstimo: pedida = 10% da pedida de compra (taxa); oferta 0 é válida e aceita se o atleta está
  fora dos 16 mais fortes do clube.
- **Rationale**: regra única para todos os clubes (spec), determinística, com no máximo uma
  contraproposta de cada lado por construção da máquina de estados (R8).

## R7 — Interesse e pedida do atleta

- **Decision**: atração do clube `A = reputação + bônus de divisão` (nível 1: +10, nível 2: −10,
  demais −20); exigência do atleta `E = 2 × (força − 50)` (limitada a [0, 90]). Se `A < E − 25` →
  recusa por falta de interesse (motivo `no_interest`). Pedida salarial = `deriveWage(atleta, clube
  novo) × (100 + max(0, E − A))%`, ruído 95–105%; renovação: pedida ≥ salário atual. Proposta ≥
  pedida → aceita; ≥ 80% → pede a pedida uma vez; abaixo → recusa (`low_wage`). Duração fora de
  `[1, 5]` (≥ 33 anos: `[1, 2]`) é inválida antes de qualquer resposta.
- **Rationale**: reputação e divisão pesam (spec FR-013), craques não aceitam clubes pequenos, e
  pagar acima compensa diferença moderada.

## R8 — Máquina de estados

- **Decision**: `Negotiation.stage`: `club_offer` → (`club_countered` | aceito → `contract` |
  recusado → encerrada); `club_countered` → aceito → `contract` | recusado → encerrada; `contract`
  → (`player_demanded` | aceito → concluída | recusado → encerrada); `player_demanded` → aceito →
  concluída | recusado → encerrada. Livres e renovações começam em `contract`. Uma negociação aberta
  por atleta; nada de dinheiro se move antes de concluir; a recusa do atleta desfaz o acordo com o
  clube sem custo. Encerradas saem da lista e vão para `log` com o desfecho.
- **Rationale**: cada lado tem exatamente um estado de contraproposta, então SC-002 vale por
  construção e é testável por enumeração.

## R9 — Efeitos e conservação

- **Decision**: concluir uma compra: valida janela, caixa (`cash ≥ taxa`), limites de elenco; muda
  `clubId` e `contract`; lança `transfer_purchase` (−taxa) no comprador e `transfer_sale` (+taxa)
  no vendedor, na rodada atual. Empréstimo usa as mesmas categorias com a taxa. Livre e renovação só
  mudam contrato. A escalação do usuário é ajustada pelo `withAdjustedLineup` existente (motivo
  `left`). A soma de `cash` de todos os clubes é invariante (SC-004).
- **Rationale**: reusa ledger/gate da 008 e o ajuste de escalação da 009.

## R10 — Propostas da IA (US4) e renovações da IA (FR-023)

- **Decision**: ao fechar cada rodada com janela aberta, `generateIncomingOffers`: com chance 20%
  (PRNG por seed + temporada + rodada), um clube da IA escolhe um jogador do usuário que seria
  titular nele (força acima da mediana dos 11 melhores da posição no comprador) e cuja compra cabe no
  caixa do comprador com folga de 6 meses de folha; oferta = valor × 85–110%. No máximo 3
  propostas abertas; expiram ao fechar a janela ou em 3 rodadas. Renovações da IA na virada
  (etapa `expire-contracts`): renova quem tem ≤ 31 anos e está entre os 18 mais fortes do clube, ou
  é necessário para manter os mínimos de posição; novo contrato por `initialContract` com o clube
  atual. Os demais viram livres. Contratos do usuário nunca são renovados automaticamente.
- **Rationale**: a spec pede IA mínima; essa regra mantém elencos com tamanho e força estáveis sem
  transferências entre clubes da IA (011).

## R11 — Livres: entrada, saída e limites de longo prazo

- **Decision**: entram em `freeAgents` os contratos expirados e os dispensados de `balanceSquads`
  (que passa a devolvê-los em vez de descartá-los). Saem quando contratados ou na etapa
  `age-out-free-agents`, se estão livres há ≥ 1 temporada completa ou têm ≥ 33 anos (aposentam). A
  pedida do livre é `deriveWage` com o clube interessado (sem taxa). Limites declarados nos testes de
  longo prazo, 30 temporadas, 2 seeds: livres ao fim de cada virada ≤ 150; elencos válidos em 100%
  das viradas; limites da 008 (caixa, crises) e da 009 (distribuição de forças) inalterados.
- **Rationale**: grupo de livres pequeno e renovado; sem IA contratando livres (011), a reposição de
  elencos continua pelos jovens da 009.

## R12 — Ordem da virada

- **Decision**: `record-history`, `pay-prizes`, `close-finance-season`, **`return-loans`**,
  `evolve-players`, `retire-players`, **`expire-contracts`**, `regulate-world`, `generate-youth`
  (jovens com contrato), `balance-squads` (dispensados → livres), **`age-out-free-agents`**,
  `promotion-relegation`, `advance-year`, `reset-season-stats`, `generate-calendars`,
  `pay-sponsorship`, `ai-finance-review`, **`reset-market`** (negociações e propostas expiram; o
  registro da virada fica). `TurnoverContext.market?` opcional: sem ele (usos só da liga, das
  finanças ou da renovação), `expire-contracts`, `age-out-free-agents` e `reset-market` não fazem
  nada.
- **Rationale**: devolver emprestados antes de expirar contratos resolve o caso "contrato termina
  durante empréstimo" (vira livre ou é renovado pela IA); expirar depois de evoluir e aposentar faz a
  IA renovar pelo salário e pela força atuais e não gastar renovação com quem vai se aposentar;
  expirar antes de `balance-squads` deixa a reposição por jovens corrigir os elencos; a folha do
  patrocínio já usa os novos contratos.
- **Calibração (30 temporadas)**: com salários contratuais fixos, os melhores clubes acumulavam
  caixa (folga máx.–mediana chegou a 47 mi contra ~10 mi sem contratos) porque jovens que evoluem
  ficam com salário defasado. Duas regras corrigiram: a IA renova até os 34 anos quem está entre os
  24 mais fortes (ou é necessário para a posição), e faz a **revisão anual de salários** — quem
  ficou abaixo de 90% do salário justo ganha aumento; ninguém tem corte (`ai.wageReviewPct`).
  O contrato do usuário nunca é alterado sem ele.

## Desvios do desenho inicial

- **Empréstimo** não tem etapa de contrato com o atleta: o salário continua o do clube de origem e
  quem recebe o paga (FR-018); o acordo com o clube conclui o empréstimo.
- **Propostas por empréstimo**: além de compras, clubes da IA podem pedir emprestado um jogador do
  usuário (`IncomingOffer.kind = "loan"`), para a cessão do US5.
- **Renovação** vale a partir da próxima temporada: `untilYear = max(atual, ano + anos)`.
- **Busca**: a tabela mostra 100 linhas por vez ("Mostrar mais") ordenadas por força.

## R13 — Save v6 e migração

- **Decision**: `formatVersion: 6`, campo `market: MarketState`. v5 → v6: `ensureContracts` com
  PRNG derivado da seed do save; `market` vazio; resumos financeiros antigos ganham as categorias
  novas com 0. Fixtures v5 adicionados.

## R14 — Interface

- **Decision**: tela **Mercado** (`/jogo/mercado`, atalho `m`) com abas Buscar (filtros, tabela
  ordenável, seleção para comparar 2–4), Negociações (painel com etapa atual e ações válidas),
  Propostas recebidas, Contratos (do elenco, com fim e renovar). Ações também no detalhe do jogador.
  Elenco ganha coluna "Contrato até" com destaque no último ano; Início mostra cartão com propostas
  e contratos terminando; aviso de janela fechada com a próxima abertura.
