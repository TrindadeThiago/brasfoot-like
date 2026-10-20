# Research: Carreira do técnico e diretoria

Decisões técnicas da 012. Números são padrões iniciais de `DEFAULT_BOARD`, ajustáveis por
`competition.board` e calibrados no teste de 30 temporadas (R13).

## R1 — Módulo e estado

- **Decision**: módulo novo do motor `board/` (diretoria) com um estado serializável
  `BoardState`: perfil do técnico do jogador (`manager`), uma diretoria por clube (`clubs`:
  metas, confiança, técnico, contratação), técnicos da IA (`coaches`), vagas (`vacancies`),
  propostas ao jogador (`offers`), avaliação e aviso pendentes, histórico do técnico e `nextSeq`.
  O save v8 guarda `board`.
- **Rationale**: um estado só para tudo o que a diretoria decide; todos os clubes usam o mesmo
  modelo de metas e confiança (o do jogador e os da IA), o que dá "mesmas regras" e calibração
  única para demissões do jogador e da IA.
- **Alternatives considered**: estado só do jogador + regra separada para a IA (duas lógicas de
  demissão para calibrar); guardar no `MarketState` (mistura domínios).

## R2 — Onde a diretoria age

- **Decision**: `completeCareerRound(…, renewal?, market?, board?)` ganha `CareerBoard
  { state, careerSeed }`. Depois das finanças e do mercado da rodada roda `boardAfterRound`:
  confiança de todos os clubes, demissões no meio da temporada (jogador e IA), preenchimento de
  vagas, propostas ao jogador e expirações. Quando a liga termina naquela rodada
  (`isLeagueSeasonOver`), roda a **avaliação de fim de temporada** (todos os clubes) e grava o
  registro da temporada no histórico do técnico. Na virada, a etapa `board-new-season` (depois de
  `reset-market`) contrata técnicos para as vagas restantes, gera as metas da nova temporada com o
  mundo e a composição novos, reinicia a confiança e garante proposta ao desempregado (R10). O
  resultado da rodada e da virada traz `board`. `advanceCareer` repassa.
- **Rationale**: o mesmo caminho para ao vivo, direto, testes e simulações (como 009/011). Avaliar
  na última rodada permite à tela "Fim de temporada" mostrar a avaliação antes da virada (FR-017).
- **Alternatives considered**: avaliação como etapa da virada (a tela de fim de temporada não teria
  a decisão antes de virar); chamada só no save (simulações ficariam sem diretoria).

## R3 — Técnico desempregado no motor

- **Decision**: o clube do técnico passa a vir de `board.manager.clubId` (`null` = desempregado).
  Para o motor, desempregado = `managerClubId: ""`, exatamente como `sim:world` já faz: todos os
  clubes são da IA (escalação, mercado, finanças). `save.clubId` continua obrigatório e passa a
  significar "clube em foco": o atual, ou o último quando desempregado (exibição, divisão
  padrão). O helper `managedClubId(save)` do pacote de save devolve `board.manager.clubId ?? ""`
  e substitui `save.clubId` em toda chamada ao motor que hoje recebe `managerClubId`.
- **Rationale**: nenhuma assinatura do motor muda; o caminho "sem humano" já é testado pelas
  simulações longas. Evita tornar `clubId` anulável e mexer nas ~70 leituras da UI.
- **Alternatives considered**: `managerClubId?: string` em todo o motor (refatoração ampla sem
  ganho de comportamento); `save.clubId: string | null` (quebra todas as telas de uma vez).

## R4 — Metas esportivas

- **Decision**: níveis por dados, do mais ao menos exigente, cada um com uma posição exigida
  calculada na divisão: `title` (1º), `promotion` (último posto de acesso; só se a divisão tem
  acesso), `top4` (4º), `topHalf` (⌈n/2⌉, "meio de tabela"), `avoidRelegation` (n − rebaixados;
  só se há rebaixamento) e, na divisão sem rebaixamento, `avoidBottom` (n − `bottomSlots`, "fugir
  das últimas posições"). Os níveis são fixos; as posições dependem da divisão. Para o clube, calcula-se a **expectativa** = posto (1 = maior) do score
  `força do clube (média dos 16 mais fortes, clubStrength) + reputação × expectationRepPct%` entre
  os clubes da divisão; a **posição exigida bruta** = expectativa + folga, com
  `folga = max(0, slackBase − ⌊reputação do técnico × slackPerRepPct / 100⌋)` (técnico de maior
  reputação ⇒ menos folga). A meta é o nível **mais exigente cuja posição é ≥ a exigida bruta**;
  se nenhum, o menos exigente disponível. Níveis impossíveis na divisão são descartados (FR-009).
- **Rationale**: monotônico por construção — mais força/reputação na mesma divisão ⇒ expectativa
  menor ⇒ meta igual ou mais exigente (FR-007); com a folga máxima (4), o mais forte nunca cai além
  de `topHalf` e o mais fraco nunca sobe de `avoidRelegation` (SC-001). Explicável na tela.
- **Alternatives considered**: meta por faixa de reputação do clube (ignora força real do elenco
  após o mercado); sorteio ponderado (indeterminado para o jogador e difícil de testar).

## R5 — Metas no meio da temporada

- **Decision**: ao assumir com `j` rodadas jogadas de `T`, a posição exigida bruta passa a
  `round(exigidaInicial + (posiçãoAtual − exigidaInicial) × j / T)`, depois encaixada no nível
  como em R4. Saves migrados usam a mesma regra (R12).
- **Rationale**: quem pega o time na zona de rebaixamento na rodada 30 não recebe meta de título.

## R6 — Metas financeiras

- **Decision**: tipos por dados: `nonNegativeCash` (terminar com caixa ≥ 0), `keepCash`
  (terminar com caixa ≥ caixa inicial da temporada), `noCrisis` (não entrar em crise na
  temporada). Escolha: caixa < 0 ou em crise ⇒ `nonNegativeCash`; caixa < `tightMonths` meses de
  folha ⇒ `keepCash`; senão `noCrisis`. Andamento usa `ClubFinance.cash`, `seasonStartCash`,
  `inCrisis` e `crises` (008).
- **Rationale**: reaproveita os conceitos da 008 sem métricas novas; clube apertado é cobrado
  por equilíbrio (spec US1 cenário 3).

## R7 — Confiança por rodada

- **Decision**: escala 0–100, inteira. A cada rodada, para cada clube que jogou:
  - resultado: vitória `+win`, empate `+draw`, derrota `−loss` (padrões 3, 0, 3);
  - meta esportiva, a partir de `goalCheckFromRound`: a confiança anda
    `(alvo − confiança) / driftDivisor` em direção a um alvo que depende da posição — abaixo da meta
    por `g` posições, `alvo = neutral − g × gapWeight`; dentro ou acima por `g`,
    `alvo = neutral + min(aheadCap, g × aheadWeight)` (fatores `belowGoal`/`aheadOfGoal`).
    *Revisto na implementação*: uma penalidade fixa por rodada acumulava sem limite e demitia quase
    todo clube abaixo da meta; o alvo móvel deixa a confiança oscilar perto de um patamar e só leva
    ao limite de demissão em campanhas muito abaixo da meta;
  - finanças: em crise ⇒ `−crisisPenalty`; caixa < 0 com meta `nonNegativeCash`/`keepCash` em
    risco ⇒ `−financePenalty`;
  - paciência: as parcelas negativas são multiplicadas por
    `patiencePct = max(patienceMinPct, patienceBasePct − reputação × patiencePerRepPct / 100)` %.
  O resultado é limitado a [0, 100]. Para o clube do jogador guarda-se `recent` (últimas
  `keepRecent` mudanças com as parcelas por fator) para tendência e motivos (FR-015).
- **Rationale**: aritmética inteira (sem transcendentais no motor), explicável por fator; três
  vitórias somam ≥ 9 pontos (SC-007).
- **Alternatives considered**: confiança como média móvel de pontos (sem fatores explicáveis).

## R8 — Demissão e avaliação

- **Decision**:
  - **Meio da temporada**: demitido ao fim da rodada se `confiança ≤ fireThreshold` (padrão 10)
    e fora da carência (`graceRounds` = 6 rodadas desde a contratação; migração: até o fim da
    temporada). Clubes da IA usam a mesma condição e, além dela, um sorteio
    `aiFireChancePct` por rodada (padrão 35%) para espalhar as trocas.
  - **Fim da temporada**: `confiançaFinal = confiança + metEsportiva ? sportMetBonus :
    −min(missCap, posiçõesAbaixo × missPerPosition)` `+ (metFinanceira ? financeMetBonus :
    −financeMissPenalty)`, limitada a [0, 100]. Demitido se `confiançaFinal < endFireThreshold`
    (padrão 30). Mantido: confiança da nova temporada = `⌊(neutral + confiançaFinal) / 2⌋`.
  - **"Sem demissão"**: as mesmas contas; a decisão vira `wouldFire` e nada muda no emprego
    (FR-021).
  - Demissão do jogador: `manager.clubId = null`, passagem fechada com motivo `fired`, vaga aberta
    no clube; no mercado, negociações do jogador canceladas e propostas recebidas descartadas
    (`releaseManagerClub`, R11).
- **Rationale**: uma regra para jogador e IA; limiares e carência são dados (FR-020).

## R9 — Reputação do técnico

- **Decision**: escala 1–100, inicial `initialReputation` = 30 (técnico iniciante, abaixo dos
  pequenos da Série A e acima dos pequenos da Série B do banco padrão). Variação na avaliação:
  - meta esportiva cumprida: `+metBase + dificuldade + ⌊acimaDaExpectativa / 2⌋`, com
    `dificuldade = ⌊max(0, reputaçãoDoClube − reputaçãoDoTécnico) × upsidePct / 100⌋`;
    descumprida: `−missBase − ⌊posiçõesAbaixo / 2⌋`, onde `posiçõesAbaixo` conta a partir da pior
    entre a posição exigida e a expectativa; perdida mas dentro da expectativa do elenco, não cai
    (soma `⌊acimaDaExpectativa / 2⌋`). *Revisto na implementação*: sem isso, o técnico de um clube
    pequeno (cuja meta mais branda já fica acima da expectativa) perdia reputação ano a ano mesmo
    superando o elenco;
  - título `+titleBonus` (×2 na divisão mais alta), acesso `+promotionBonus`, rebaixamento
    `−relegationPenalty`; meta financeira cumprida `+1`, descumprida `−1`;
  - demissão (meio ou fim): `−firePenalty − ⌊max(0, reputaçãoDoTécnico − reputaçãoDoClube) ×
    downsidePct / 100⌋` (cair num clube pequeno pesa mais, FR-003).
  Limitada a [1, 100] (FR-004). Técnicos da IA usam a mesma função.
- **Rationale**: ganhos maiores quando o técnico supera o próprio patamar ⇒ ascensão gradual
  pequeno → grande (US5, SC-005).

## R10 — Vagas e propostas

- **Decision**:
  - Vaga abre quando um clube demite (IA ou jogador). Clubes da IA preenchem a vaga depois de
    `vacancyRounds` rodadas (padrão 2) com um técnico livre compatível do pool ou um novo.
  - Para cada vaga nova, gera-se proposta ao jogador se o clube é **compatível**:
    `reputaçãoDoTécnico − lowerMargin ≤ reputaçãoDoClube ≤ reputaçãoDoTécnico + upperMargin`
    (padrões 30 e 12) e, se empregado, reputação do clube > reputação do clube atual; sorteio
    `offerChancePct` (padrão 60%); no máximo `maxOpenOffers` (3) pendentes. Nunca do clube atual
    nem do clube que o demitiu na mesma temporada (FR-029).
  - Prazo: `offerRounds` rodadas (padrão 2); vencida ⇒ expira e a vaga é preenchida pela IA.
  - Aceitar: o jogador assume na próxima rodada (ou na nova temporada, se aceita depois da última
    rodada); demais propostas descartadas; clube deixado ganha vaga (preenchida pela IA na hora,
    com técnico do pool); metas com R5; confiança `neutral` (60); carência reinicia.
  - **Garantia** (FR-030): na etapa `board-new-season`, desempregado sem proposta pendente (as da
    temporada anterior expiram na virada) recebe uma do clube da IA compatível (ou, se nenhum, o de
    menor reputação da divisão mais baixa) cuja diretoria tem menor confiança; esse clube demite o
    técnico para abrir a vaga. O clube que o demitiu na temporada encerrada fica de fora.
  - Propostas também são sorteadas na última rodada (vagas da avaliação de fim de temporada), para
    o jogador responder na tela de Fim de temporada; as não respondidas expiram na virada.
- **Rationale**: as vagas vêm de demissões reais (US8) e o filtro de reputação dá a progressão
  (US5); a garantia evita carreira travada (SC-006).

## R11 — Troca de clube e mercado

- **Decision**: `releaseManagerClub(market, clubId)` (em `market/`) cancela as negociações abertas
  do clube (motivo `manager_left`) e remove as propostas recebidas pendentes. Roda na demissão e
  ao aceitar proposta. Ao assumir o novo clube, o save recria a escalação (`initialLineup`) e
  limpa `lineupNotice`.
- **Rationale**: o clube deixado vira IA sem estado do humano pendurado.

## R12 — Save v8 e criação

- **Decision**: `formatVersion: 8`; campo `board: BoardState`. Criação: `createBoard(world,
  league, careerSeed, { clubId, noFiring })`; `CreateSaveInput.noFiring?: boolean` (padrão
  `false`). Migração v7 → v8: `createBoard` com o clube atual, reputação inicial, `noFiring:
  false`, técnicos da IA gerados com seed derivada (`<seed>:board:migrate`), metas da temporada em
  andamento pela regra de meio de temporada (R5) e carência até o fim da temporada; se a liga já
  terminou, sem avaliação dessa temporada (metas começam na próxima virada). Validação do save
  (`boardProblem`) confere invariantes (R14 do data-model).
- **Rationale**: Princípio VI; ninguém é demitido por regras que não conhecia.

## R13 — Balanceamento (teste de 30 temporadas)

- **Decision**: `board/long-run.test.ts`, 30 temporadas, 2 seeds, mercado e diretoria ativos,
  sem humano (`managerClubId ""`): por temporada, 5%–35% dos clubes trocam de técnico; ≥ 70% das
  trocas em clubes que terminaram abaixo da expectativa (R4); nenhuma vaga aberta por mais de
  `vacancyRounds + offerRounds` rodadas; pool de técnicos livres ≤ `maxFreeCoaches`. Cenários de
  técnico simulado (bot que sempre escala automático): com "sem demissão" num clube fraco com meta
  forçada, nunca é demitido em 10 temporadas (SC-002); um bot num clube pequeno da Série B
  acumula reputação e recebe proposta de clube de reputação maior em ≤ 10 temporadas na maioria
  das seeds de um conjunto fixo (SC-005); desempregado recebe proposta até a virada seguinte em
  100% dos casos (SC-006). `sim:world` passa a mostrar trocas de técnico por temporada.
- **Rationale**: Princípio V; limites declarados no teste.

## R14 — Nomes e técnicos da IA

- **Decision**: técnico da IA = `{ id, name, reputation, clubId | null }`; nome do banco de nomes
  do país do clube (`nameBankFor`) com PRNG derivado. Reputação inicial ao gerar:
  `reputaçãoDoClube ± 8` (limitada). Demitidos vão para o pool de livres (máx. `maxFreeCoaches`
  = 20, sai o de menor reputação); contratação escolhe do pool o de reputação mais próxima da do
  clube dentro de `lowerMargin`/`upperMargin`, senão gera um novo. Sem efeito em partidas,
  escalação ou mercado (Assumptions da spec).
- **Rationale**: simples, determinístico e com tamanho de save limitado.

## R15 — Determinismo

- **Decision**: clubes processados em ordem de id; PRNG por `createRng("<careerSeed>:board:
  <temporada>:<rodada>:<clubId|tag>")`; ids sequenciais (`nextSeq`) para técnicos, vagas e
  propostas; desempates por id. Nenhuma iteração depende de ordem de inserção.
- **Rationale**: Princípio II; mesmo padrão de `market/incoming.ts`.

## R16 — Interface

- **Decision**:
  - Nova carreira: caixa "Sem demissão" (desmarcada) com explicação, no formulário principal.
  - Início: cartão **Diretoria** (confiança com medidor e tendência, 3 motivos recentes, metas com
    andamento); aviso de propostas pendentes; aviso de demissão até dispensar; desempregado vê o
    painel **Sem clube** com propostas e botão de avançar rodada.
  - Página nova `/jogo/carreira` (Carreira): abas **Diretoria** (metas, confiança, histórico de
    mudanças), **Propostas** (aceitar/recusar, prazo), **Histórico** (passagens, temporadas,
    conquistas, reputação) e **Técnicos** (clube, técnico, reputação, por divisão).
  - Fim de temporada: seção **Avaliação da diretoria** (metas, cumprimento, decisão, Δ reputação;
    "a diretoria o demitiria" com "sem demissão").
  - Desempregado: Elenco, Escalação, Finanças e Mercado somem da navegação e redirecionam para a
    Início; a rodada roda sem escalação do jogador; cabeçalho mostra "Sem clube".
- **Rationale**: FR-011, FR-015, FR-018, FR-023; reaproveita padrões de aviso (MarketNotice) e
  abas (CompetitionTabs).

## R17 — Parâmetros (`competition.board`, padrões `DEFAULT_BOARD`)

| Grupo | Campos (padrão) |
|---|---|
| metas | níveis fixos de R4, `expectationRepPct` 10, `slackBase` 4, `slackPerRepPct` 4, `bottomSlots` 4, `tightMonths` 3 |
| confiança | `neutral` 60, `win` 3, `draw` 0, `loss` 3, `goalCheckFromRound` 5, `gapWeight` 8, `aheadWeight` 3, `aheadCap` 20, `driftDivisor` 5, `crisisPenalty` 2, `financePenalty` 1, `patienceBasePct` 130, `patiencePerRepPct` 60, `patienceMinPct` 60, `keepRecent` 10 |
| demissão | `fireThreshold` 10, `graceRounds` 6, `endFireThreshold` 30, `sportMetBonus` 15, `missPerPosition` 4, `missCap` 30, `financeMetBonus` 5, `financeMissPenalty` 10, `aiFireChancePct` 35 |
| reputação | `initialReputation` 30, `metBase` 3, `upsidePct` 25, `missBase` 3, `titleBonus` 5, `promotionBonus` 5, `relegationPenalty` 6, `firePenalty` 5, `downsidePct` 20 |
| vagas/propostas | `vacancyRounds` 2, `lowerMargin` 30, `upperMargin` 12, `offerChancePct` 60, `maxOpenOffers` 3, `offerRounds` 2, `maxFreeCoaches` 20, `coachSpread` 8 |

Todos inteiros; schema Zod opcional e `.partial()`, como `aiMarket`.

## Calibração (resultado da implementação)

Com os padrões acima, sem ajuste adicional:

- `board/long-run.test.ts` (30 temporadas, seeds `diretoria-longa-1/2`): 14,3–14,4% dos clubes da
  IA trocam de técnico por temporada (limite 5–35%); 77–78% das trocas em clubes que terminaram
  abaixo da expectativa (limite ≥ 70%); nenhuma vaga velha; pool ≤ 20.
- Técnico simulado no menor clube da divisão de baixo (3 seeds, "sem demissão"): reputação
  30 → 54, 49 e 54 em 10 temporadas, com propostas de clubes de reputação maior.
- `sim:world --seasons 30`: 14,4% de trocas por temporada; limites da 009/011 inalterados.
- `sim:economy --seasons 30`: limites da 008 inalterados.
- `boardAfterRound` no mundo inteiro: mediana abaixo de 10 ms.
