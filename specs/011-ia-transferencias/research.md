# Research: IA de transferências

Decisões técnicas da 011. Números são padrões iniciais de `DEFAULT_AI_MARKET`, ajustáveis por
`competition.market.aiMarket` e calibrados no teste de 30 temporadas (R11).

## R1 — Onde a IA age

- **Decision**: `completeCareerRound(…, renewal?, market?)` ganha um parâmetro opcional
  `CareerMarket { state, careerSeed }`; depois das finanças da rodada roda `aiMarketRound` e, em
  seguida, o processamento de propostas/expirações da 010 (`marketAfterRound`). O resultado traz
  `market`. `advanceCareer` repassa. O save deixa de chamar `marketAfterRoundOf` à parte.
- **Rationale**: app (ao vivo e direto), testes e simulações passam pelo mesmo caminho; sem
  `market` (usos antigos) nada muda.
- **Alternatives considered**: etapa só na virada (não usa as janelas de meio de temporada);
  chamada só no save (simulações ficariam sem mercado).

## R2 — Necessidades do clube

- **Decision**: `clubNeeds(world, league, clubId, finances)` devolve por posição: quantidade,
  mínimo (009), máximo (R3), força do melhor e do titular provável, e se está **descoberta**
  (abaixo do mínimo), **fraca** (titular provável da posição abaixo de `alvo − weakGap`) ou em
  **excesso** (acima de `ideal = mínimo + 2`, ou do máximo). `alvo` = média dos 11 mais fortes do
  clube ajustada pela ambição: `ambição = reputação + bônus da divisão` (o mesmo de `attraction`),
  convertida em força-alvo `targetBase + targetPerAmbition × ambição`. Também: idade média do
  elenco (envelhecido se > `oldSquadAge`) e **orçamento** = caixa − reserva de
  `reserveMonths` meses de folha (0 em crise).
- **Rationale**: prioridade simples e explicável (FR-002): descoberta > fraca > envelhecido >
  excesso.

## R3 — Teto por posição

- **Decision**: `positionMax = { GK: 4, FB: 6, CB: 6, DM: 5, MF: 7, FW: 6 }`. Nenhuma compra,
  empréstimo recebido ou livre passa do teto; `balanceSquads` (009) passa a liberar quem está acima
  do teto (menor utilidade) e nunca gera jovem numa posição no teto.
- **Rationale**: critério de aceite "nenhum clube com mais de 4 goleiros" e equivalentes.

## R4 — Compras entre clubes da IA

- **Decision**: para a necessidade mais urgente do clube, candidatos = jogadores de outros clubes
  da IA na posição, sem empréstimo, fora de negociação do humano, que melhorem o titular provável em
  pelo menos `minGain`, cujo atleta aceite o clube (`attraction ≥ exigency − interestMargin`, 010) e
  cuja taxa (`askingPrice` da 010) + salário anual pedido caibam no orçamento. Score =
  `ganho de força × 100 / custo em milhares` com bônus de juventude (`youthBonus` por ano abaixo de
  26, maior se o elenco está envelhecido); escolhe o maior score, desempate por id. O vendedor só
  aceita se `seller.ts` permitir (R5). Concluído por `completeTransfer` com contrato pela pedida do
  atleta e duração por idade. Limite: `maxBuysPerWindow` por clube e `maxDealsPerRound` no mundo.
- **Rationale**: mesmas regras da 010 (FR-006); orçamento maior ⇒ alvos melhores, o que leva os
  grandes aos melhores (FR-011).

## R5 — Disposição em vender (fluxo de talentos)

- **Decision**: o clube da IA vende pela pedida se a venda não quebra mínimos/teto e (a) o jogador
  está em excesso ou fora dos 11 mais fortes, ou (b) o comprador tem reputação maior que a do
  vendedor em pelo menos `upwardMargin` (o destaque "sobe"). Um titular não é vendido para clube de
  reputação igual ou menor. Excedentes ganham desconto (`surplusDiscountPct` sobre a pedida).
- **Rationale**: grandes compram, pequenos revelam e vendem (US3, SC-004).

## R6 — Empréstimo de jovens

- **Decision**: jovem (≤ `loanMaxAge`) do clube com potencial ≥ `loanMinPotential`, fora dos
  `loanBenchRank` mais fortes do clube e sem posição descoberta no clube de origem, é emprestado
  sem taxa a um clube da IA de reputação menor em que seria titular na posição e que tem a posição
  fraca ou vaga sob o teto. No máximo um empréstimo cedido por clube por janela. `completeLoan` da
  010; volta na virada (`return-loans`).
- **Rationale**: aproveita a evolução por minutagem da 009 (FR-005).

## R7 — Livres

- **Decision**: em qualquer rodada, um clube com posição descoberta ou fraca e orçamento contrata
  o melhor livre da posição que melhore o titular provável (ou cubra o mínimo), com salário pela
  pedida e duração por idade (`completeSigning`). No máximo `maxFreeSigningsPerRound` no mundo.
- **Rationale**: dá destino aos livres da 010 e reduz a dependência dos jovens da base.

## R8 — Renovação e liberação por necessidade

- **Decision**: `ai/renewals.ts` substitui `aiKeeps`: renova quem (a) está entre os
  `renewTopN` mais fortes e tem até `renewMaxAge` anos, (b) é necessário para o mínimo da posição,
  ou (c) é jovem promessa (≤ 23, potencial ≥ `loanMinPotential`); libera os demais e também quem
  tem ≥ 31 anos, está fora dos 11 mais fortes e ganha acima da mediana do elenco. A revisão anual
  de salários da 010 continua (calibração da economia).
- **Rationale**: FR-004/US5 sem perder a calibração da 010.

## R9 — Propostas ao humano

- **Decision**: `ai/offers.ts` substitui o sorteio de pares da 010: só clubes com a posição do
  jogador descoberta ou fraca, que ganhariam força com ele e cujo orçamento cobre a oferta. Valor
  na faixa `minPct–maxPct` do valor de mercado; chance por rodada e máximo de propostas abertas da
  010 mantidos; empréstimo só por jovens fora dos titulares do humano.
- **Rationale**: FR-012 com as mesmas necessidades da IA.

## R10 — Resumo da janela

- **Decision**: `MarketState.reports: WindowReport[]` (últimas `keepReports` janelas) e
  `reportSeen?: string`. Ao detectar que a janela fechou (rodada em que `isWindowOpen` passa a
  falso) ou na virada, `closeWindowReport` junta as transferências da janela do `log` (compras,
  vendas, empréstimos, livres), ordena por relevância (`fee` e força) e grava todas, marcando o
  nível de divisão de origem e destino para o filtro. A UI mostra os 15 mais relevantes e, à parte,
  os da divisão do jogador; a Início avisa enquanto `reportSeen` ≠ id do último resumo.
- **Rationale**: FR-013/FR-014 sem guardar o mundo inteiro por janela.

## R11 — Limites do teste de 30 temporadas (com mercado ativo)

- **Decision**: `market/long-run.test.ts` (2 seeds) e os testes de longo prazo da 008/009 com o
  mercado ativo: elencos válidos em 100% das viradas (SC-001); nenhum clube acima de
  `positionMax` (SC-002); limites da 008 e da 009 inalterados (SC-003); ≥ 60% das transferências
  entre clubes da IA de jogadores do top 10% vão para clube de reputação maior (SC-004); Spearman
  reputação × força média do elenco ≥ 0,5 na última temporada (SC-005); toda janela com ≥ 1
  transferência entre clubes da IA e soma de caixa conservada (SC-006); determinismo (SC-007);
  livres ≤ 150.

## R12 — Regras padrão (`DEFAULT_AI_MARKET`)

`weakGap 4`, `targetBase 56`, `targetPerAmbition 0.18`, `oldSquadAge 28`, `reserveMonths 6`,
`minGain 2`, `youthBonus 3`, `maxBuysPerWindow 2`, `maxSalesPerWindow 2`, `maxDealsPerRound 12`,
`upwardMargin 5`, `surplusDiscountPct 80`, `loanMaxAge 21`, `loanMinPotential 75`,
`loanBenchRank 16`, `maxFreeSigningsPerRound 6`, `positionMax` (R3), `keepReports 4`.

## R13 — Save v7

- **Decision**: `formatVersion: 7`; `market.reports = []`; migração v6 → v7 só acrescenta o campo.
  Fixtures v6.

## Resultados da implementação

- **Calibração**: com o mercado da IA ativo, os testes de 30 temporadas da 008, da 009 e da 011
  passaram sem mudar os limites. Só a força-alvo precisou subir (`targetBase 56`,
  `targetPerAmbitionPct 18`), porque com 52/15 quase nenhuma posição ficava "fraca" e a IA não
  comprava. Também entraram os **reforços oportunistas** (`ClubNeeds.upgrades`): depois das
  posições descobertas e fracas, o clube tenta melhorar a posição de titular mais fraco.
- **Volume** (`pnpm sim:world --seasons 30`): ~55–65 compras entre clubes da IA por temporada;
  ~60% sobem de reputação no total, ≥ 60% entre os jogadores do top 10% (SC-004). A economia ficou
  mais saudável (0 clubes em crise no fim; Spearman reputação × caixa 0,86).
- **Desempenho**: uma rodada da IA leva ~50 ms no mundo inteiro (necessidades em cache por rodada);
  meta revisada para < 150 ms.
- **Desvios**: um jogador comprado numa janela não é revendido na mesma janela; o resumo é gerado
  quando a janela fecha dentro da temporada (as janelas padrão sempre fecham antes da última
  rodada), sem etapa extra na virada; a pedida de excedentes usa `surplusDiscountPct`.
