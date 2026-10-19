# Research: Finanças do clube

Decisões de design da feature 008. Ponto de partida (código da 007): a carreira é `league`
(`LeagueSeason`, uma `Season` por divisão) + `history` no save v3; a rodada da liga fecha em
`completeLeagueRound`; a virada é `seasonTurnover` com etapas nomeadas e pontos de extensão; cada
clube do banco tem `reputation`, `stadiumCapacity` e `initialCash`; `deriveWage` dá o salário mensal
de um jogador (cúbico na força, fator de reputação). Nada mais de dinheiro existe.

## R1. Números do banco padrão (medidos)

Medição sobre o banco padrão (`generateDefaultBank` + `deriveWage`):

| | Série A (média) | Série B (média) | Faixa |
|---|---|---|---|
| Reputação | 62 | 39 | 25–92 |
| Capacidade do estádio | 27.975 | 16.875 | 6.000–76.500 |
| Caixa inicial | 4,66 mi | 1,59 mi | 0,62–10,08 mi |
| Folha anual (12 × mensal) | 7,73 mi | 5,54 mi | 4,41–12,33 mi |

**Consequência**: a folha é quase plana em relação à reputação (o maior clube paga ~2,8× o menor),
enquanto o público possível (estádio) varia ~12×. Uma economia só de bilheteria enriquece os
grandes e quebra os pequenos; por isso a receita tem uma parte fixa por divisão (patrocínio base e
premiação) e uma parte que cresce com o clube (bilheteria e patrocínio por reputação).

## R2. Onde vivem as finanças: estado próprio, junto da carreira

**Decisão**: novo módulo do motor `finance/` com `FinanceState` = `{ clubs: Record<clubId,
ClubFinance>, ledger: LedgerEntry[], gates: GateRecord[], seasons: FinanceSeasonSummary[],
crises: CrisisRecord[] }`. O save v4 guarda `finances` ao lado de `league` e `history`. O motor ganha
funções de carreira que combinam liga e finanças: `completeCareerRound(league, finances, world,
round)` = `completeLeagueRound` + `applyRoundFinances`, e `advanceCareer` (equivalente de
`advanceLeague`). A UI e o pacote save passam a usar essas funções.

**Razão**: finanças atravessam temporadas (caixa, dívida, obra), então não cabem em `Season`; e
precisam ser atualizadas no mesmo passo da rodada para manter ao vivo = direto e o salvamento
atômico. Funções separadas (`applyRoundFinances`, `financeTurnover`) mantêm `career/` e `season/`
sem dependência de dinheiro e fáceis de testar.

**Alternativas**: finanças dentro de `LeagueSeason` (seriam zeradas na virada e misturariam
temporada com carreira); calcular bilheteria na `MatchRecord` (acopla o motor de partida ao
dinheiro).

## R3. Dinheiro como lançamentos inteiros (conservação)

**Decisão**: valores inteiros na moeda do jogo. Toda movimentação é um `LedgerEntry { clubId,
season, round, category, amount }` (positivo = receita); `ClubFinance.cash` é atualizado na mesma
operação. Categorias: `gate`, `sponsorship`, `prize`, `loan_in`, `wages`, `interest`, `loan_out`
(amortização), `stadium`. Teste de conservação (SC-005): para cada rodada, `Σ Δcaixa = Σ lançamentos`.

**Razão**: auditável na tela (categorias), sem erros de arredondamento, base do histórico.

## R4. Folha por rodada, exata no ano

**Decisão**: folha anual = 12 × Σ `deriveWage` do elenco. Na rodada `k` de uma divisão com `R`
rodadas, o clube paga `⌊anual·k/R⌋ − ⌊anual·(k−1)/R⌋` — a soma das R parcelas é exatamente a anual.
O período é a rodada da divisão do clube; um clube que folga paga normalmente. `deriveWage` pode
ser multiplicado por um fator de calibração do mod (`economy.wageFactor`, padrão 1) se a simulação
pedir (R10).

## R5. Modelo de público

**Decisão**: para um jogo em casa,

```text
demanda = torcida(rep, divisão) × fase × adversário × ruído
torcida = (fansBase + fansPerRep × rep) × fatorDivisão   (fatorDivisão: A 1,0 · B 0,7)
fase = 0,85 + 0,30 × pontos dos últimos 5 jogos / máximo possível   (sem jogos: 1,0)
adversário = 0,85 + 0,30 × repAdversário / 100
ruído = 1 + U(−0,05, +0,05)        (PRNG com seed da partida: fixtureSeed + ":gate")
fatorPreço = (preçoReferência / preço) ^ elasticidade     (elasticidade padrão 1,5; limitado a [0,05; 3])
público = min(capacidade, ⌊demanda × fatorPreço⌋)
renda = público × preço
```

`preçoReferência` é por divisão (A 12, B 8, moeda do jogo). A potência é calculada só com raiz
quadrada e multiplicação (`powQuarters`), por isso a elasticidade é múltipla de 0,25: funções
transcendentais e `**` são proibidas no motor (Princípio II, teste de arquitetura). A estimativa mostrada ao jogador
(FR-017) é a mesma conta sem ruído e com a fase atual e o adversário do próximo jogo em casa.

**Razão**: cada fator do FR-006 aparece de forma monotônica e testável; elasticidade > 1 faz o
ingresso caro perder renda quando o estádio não lota, e o barato só compensa se lotar — o dilema
pedido. O ruído por seed da partida é reproduzível e independe da ordem de cálculo.

**Alternativas**: curva logística de demanda (mais parâmetros sem ganho de jogabilidade); ruído de
um PRNG compartilhado (dependeria da ordem dos jogos).

## R6. Patrocínio, premiação e títulos

**Decisão** (valores iniciais, calibrados em R10):

- Patrocínio anual no início da temporada: `base[divisão] + porReputação[divisão] × rep +
  wageSharePct[divisão] % da folha anual` (a parte ligada à folha entrou na calibração, R10).
- Premiação por posição na virada: linear de `prêmio1º` a `prêmioÚltimo` da divisão (inteiros),
  mais `prêmioTítulo` ao campeão de cada divisão.
- Pago por etapas novas da virada (R8).

## R7. Empréstimo, alavancas e regras da IA

**Decisão**:

- **Crédito**: limite = `crédito.base[divisão] + crédito.porReputação × rep`; juros por rodada =
  `⌈dívida × taxaBP / 10.000⌉` (taxa padrão 30 bp ≈ 11% ao ano em 38 rodadas). Tomar até o limite
  disponível; amortizar até o caixa disponível (sem deixar o caixa negativo).
- **Preço do ingresso**: faixa `[mín, máx]` do mod (padrão 5–200); padrão de clube novo =
  `preçoReferência[divisão] × (0,8 + 0,4 × rep/100)` arredondado.
- **Obras**: opções do mod (padrão +2.000 lugares / 1,5 mi / 6 rodadas; +5.000 / 4 mi / 12; +10.000
  / 9 mi / 20), pagas à vista na contratação; uma por vez; capacidade máxima 100.000; a obra conta
  rodadas da liga (atravessa a virada).
- **IA** (todo clube que não é do jogador), avaliada ao fechar cada rodada e na virada, em ordem de
  id de clube:
  - preço: a cada 4 rodadas, com a ocupação média dos últimos 3 jogos em casa > 95% → +10%; < 60%
    → −10% (dentro da faixa);
  - obra: sem obra em andamento, ocupação média > 90% (ou caixa acima de 24 meses de folha, R10) e
    caixa ≥ custo + 6 meses de folha → maior opção que respeita a margem;
  - crédito: caixa < 0 → toma o necessário para voltar a 1 mês de folha (até o limite); caixa > 6
    meses de folha com dívida → amortiza o excedente.

**Razão**: regras simples, determinísticas e iguais em espírito ao que o jogador faz (FR-020,
FR-021); os números ficam no mod (Princípio III).

## R8. Integração com a virada (pontos de extensão da 007)

**Decisão**: `TurnoverContext` ganha `finances: FinanceState` (entrada e saída de `seasonTurnover`).
Etapas novas, registradas como etapas padrão do motor (não extras, porque finanças são parte do
jogo base):

| Etapa | Posição | Efeito |
|---|---|---|
| `pay-prizes` | depois de `record-history` | premiação por posição e títulos |
| `close-finance-season` | depois de `pay-prizes` | resumo financeiro da temporada por clube → `seasons`; descarta lançamentos e bilheterias da temporada |
| `pay-sponsorship` | depois de `generate-calendars` | patrocínio pela nova divisão e reputação |
| `ai-finance-review` | depois de `pay-sponsorship` | preço/obra/crédito da IA no início da temporada |

A carreira nova recebe o patrocínio da temporada 1 ao ser criada (`createFinances`).

**Razão**: usa exatamente o mecanismo da 007; ordem documentada e testada.

**Alternativa**: uma `financeTurnover` separada chamada pelo pacote save — duplicaria a ordem da
virada fora do motor.

## R9. Crise financeira

**Decisão**: `ClubFinance.negativeRounds` conta rodadas seguidas fechadas com caixa < 0; ao chegar a
`economy.crisisRounds` (padrão 10) abre um `CrisisRecord { clubId, startSeason, startRound }`; a
primeira rodada fechada com caixa ≥ 0 zera o contador e fecha a crise (`endSeason`, `endRound`).
Só registro (punição na 012).

## R10. Calibração por simulação longa (Princípio V)

**Decisão**: os valores iniciais do mod (R5–R7) são o ponto de partida; a implementação ajusta-os
com `pnpm sim:economy --seasons 30` até os limites abaixo passarem, e o teste
`finance/long-run.test.ts` (30 temporadas, 2 seeds) os fixa. Metas de calibração para um clube de
meio de tabela com preço padrão: receita anual ≈ folha × 1,00–1,05; clubes grandes até ≈ 1,15;
pequenos ≥ 0,95.

Limites declarados no teste (ajustáveis só com justificativa na mesma alteração):

| Critério | Limite | Spec |
|---|---|---|
| Caixa máximo em relação aos demais, a cada fim de temporada | `máx − mediana ≤ 4 × mediana da folha anual` | SC-001 |
| Clubes fora de crise a cada fim de temporada | ≥ 80% | SC-002 |
| Clubes fora de crise na média das 30 temporadas | ≥ 90% | SC-002 |
| Spearman(reputação inicial, caixa médio nas 30 temporadas) | ≥ 0,40 | SC-003 |
| Mediana do caixa ao fim da 30ª temporada | entre 0 e 5 × mediana da folha anual | sanidade |
| Público com preço +10% (estádio não lotado) | queda ≥ 5% | SC-004 |
| Preço −10% | público ≥ e renda por torcedor < | SC-004 |

**Razão**: a spec deixa os limites para o plano; esses cobrem os três critérios de aceite e a
sanidade da mediana. Sem mercado e com reputação fixa, a deriva de caixa é quase linear, por isso
as metas de calibração pedem saldo anual pequeno (±5%) e a IA gasta excedentes em obras.

### Valores calibrados (implementação, `pnpm sim:economy --seasons 30`)

Com patrocínio só por reputação, nenhuma combinação de torcida, preço, premiação ou salário passou:
como elenco e folha são fixos e as receitas dependem de atributos fixos, cada clube tem uma deriva
linear própria (±1,5 mi/ano mesmo entre clubes de reputação parecida, pela variação do elenco), e
em 30 temporadas uns acumulavam +50 mi enquanto outros afundavam −50 mi (≈ 18–40% em crise). Por
decisão do usuário, o patrocínio ganhou uma parte proporcional à folha (FR-011 revisado), e a IA
passou a investir no estádio quando o caixa passa de 24 meses de folha (sumidouro limitado pela
capacidade máxima). Valores adotados (`DEFAULT_ECONOMY`, gravados no banco padrão):

| Parâmetro | Valor |
|---|---|
| `fansBase` / `fansPerReputation` | 16.000 / 50 |
| `priceElasticityPct` | 150 |
| Série A: patrocínio `{ base, perReputation, wageSharePct }` | `{ 1.500.000, 0, 18 }` |
| Série B: patrocínio | `{ 600.000, 0, 55 }` |
| Premiação, preços de referência, crédito, obras, crise | valores iniciais da tabela acima (sem mudança) |
| Salário (`deriveWage`) | regra original (sem mudança) |

Resultado (seeds `economia` e `outra`, banco padrão): todas as temporadas dentro do SC-001 (máximo −
mediana ≤ 22 mi contra o limite de 24,8 mi), 96% dos clubes fora de crise na média (mínimo por
temporada ≥ 92%), Spearman reputação × caixa médio ≈ 0,67–0,68, mediana do caixa no fim ≈ 9 mi. Na
temporada 1, a receita fica entre ~0,9 e ~1,1 vez a folha para a maioria dos clubes.

## R11. Regras econômicas como dados do mod

**Decisão**: `competition.economy` opcional no formato do mod (schema Zod), com
`DEFAULT_ECONOMY` no motor quando ausente; o banco padrão passa a gravar os valores explícitos
(`pnpm gen:default-bank`). Campos por divisão (nível): `referencePrice`, `fanFactorPct`,
`sponsorship {base, perReputation, wageSharePct}`, `prizes {first, last, title}`, `creditBase`;
globais: `fansBase`, `fansPerReputation`, `priceElasticityPct` (múltiplo de 25), `priceRange {min,
max}`, `credit {perReputation, interestBp}`, `stadium {maxCapacity, options[]}`, `crisisRounds`,
`wageFactorPct`. Versão do
formato do mod continua 1 (campo opcional, compatível).

## R12. Save v4 e migração v3 → v4

**Decisão**: `SaveFile.finances: FinanceState`. Migração: `createFinances(bank, league)` — caixa =
`initialCash`, preço padrão, sem dívida/obra/crise, patrocínio da temporada atual lançado (é receita
de início de temporada); rodadas já disputadas não geram bilheteria nem folha retroativas.
Fixtures v3 (meio de temporada e encerrada) com teste.

## R13. UI

**Decisão**: rota `/jogo/financas` (item "Finanças" no menu, atalho `6`; Histórico continua com `H`):
saldo e crise no topo; receitas e despesas da temporada por categoria; jogos em casa (adversário,
público, ocupação, preço, renda); controles: preço (campo + estimativa de público/renda), crédito
(limite disponível, taxa, custo por rodada, tomar/amortizar), obra (opções com custo/duração ou a
obra em andamento); histórico por temporada. Formato de moeda via `Intl.NumberFormat` do i18n.
Aviso de crise na Início. Ações só entre rodadas (desabilitadas durante a rodada ao vivo).
