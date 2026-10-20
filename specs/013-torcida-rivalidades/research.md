# Research: Torcida e rivalidades

Decisões técnicas da 013. Números são padrões iniciais de `DEFAULT_FANS`, ajustáveis por
`competition.fans` e calibrados no teste de 30 temporadas (R12).

## R1 — Rivalidades no formato de mod

- **Decision**: nova seção **opcional** do banco, `rivalries` (arquivo `rivalries.json`): lista de
  `{ clubIds: [a, b], intensity: 1..3 }`. Arquivo ausente ⇒ lista vazia (mods antigos seguem
  válidos; `formatVersion` do mod não muda). `ModPackage.rivalries?: Rivalry[]`; `SECTIONS`,
  `BANK_FILES`, `splitBankFiles`/`joinBankFiles`, o leitor de pasta das ferramentas e o carregador
  do banco padrão da web passam a conhecer o arquivo.
- **Validação**: schema Zod da rivalidade (dois ids, intensidade inteira 1–3) e regra semântica
  `checkRivalries` com os códigos `ref.club_not_found` (reusado, seção `rivalries`),
  `rivalry.same_club` e `rivalry.duplicate_pair` (par repetido em qualquer ordem). Mensagens em
  `errors.json` com arquivo, índice e campo, como as demais.
- **Rationale**: rivalidade é entre clubes, independente de competição (servirá a copas futuras);
  uma seção própria mantém `clubs.json` e `competitions.json` intactos e é fácil de editar por mods.
- **Alternatives considered**: campo `rivals` em cada clube (duplicação A→B e B→A, intensidade
  divergente); dentro da competição (amarra rivalidade a uma liga).

## R2 — Rivalidades do banco padrão

- **Decision**: função pura `generateRivalries(clubs, seed)` no `worldgen/`: agrupa os clubes em
  **regiões** de 5 por um embaralhamento determinístico (`rng.fork("rivalries")`), e dentro de cada
  região liga: o par de maior reputação (intensidade 3, "maior clássico"), pares vizinhos por
  reputação (intensidade 2) e o restante sem rival recebe um vizinho (intensidade 1), com no máximo
  `MAX_RIVALS = 3` por clube e ao menos 1. O gerador do banco padrão grava `rivalries.json`
  (`pnpm gen:default-bank`), sem mudar os outros arquivos (fork próprio).
- **Rationale**: o banco não tem regiões nem cidades repetidas; o agrupamento cria "regiões"
  estáveis e reproduzíveis. Com 40 clubes em 8 regiões, cada divisão tem clássicos suficientes
  (SC-004 é verificado em teste).
- **Alternatives considered**: rivalidades fixas à mão no JSON (não reproduzíveis pelo gerador);
  só entre clubes grandes (pequenos sem clássico).

## R3 — Estado da torcida

- **Decision**: módulo novo `fans/` com `FansState { clubs: Record<clubId, ClubFans> }`,
  `ClubFans { mood: 0..100, recent: MoodChange[] }` (`recent` só no clube do jogador, até
  `keepRecent`). Save v9 guarda `fans`. Faixas por limites inclusivos: revoltada < 20 ≤ insatisfeita
  < 40 ≤ neutra ≤ 60 < animada ≤ 80 < eufórica.
- **Rationale**: mesmo padrão da diretoria (012): estado pequeno, serializável, um por clube.

## R4 — Humor por rodada

- **Decision**: depois das finanças da rodada (bilheteria usa o humor de antes do jogo), para cada
  clube que jogou, em ordem de id:
  - resultado: vitória `+win` (4), empate `+draw` (0), derrota `−loss` (4);
  - clássico: a parcela de resultado é multiplicada por `100 + intensidade × derbyPct` (padrão 40 ⇒
    1,4×/1,8×/2,2×) e o fator vira `derbyWin`/`derbyLoss`/`derbyDraw`;
  - expectativa (a partir de `checkFromRound` 5): posição atual − expectativa da 012
    (`expectationOf`) = `g`; alvo = `neutral − g × gapWeight` (abaixo) ou `neutral + min(aheadCap,
    −g × aheadWeight)` (acima); parcela `(alvo − humor) / driftDivisor`, fatores `belowExpectation`
    /`aheadOfExpectation`;
  - retorno ao neutro quando não há parcela de expectativa: `(neutral − humor) / calmDivisor`;
  - ídolos (R6): `−idolLoss` por ídolo que saiu, `+starSigning` por destaque contratado.
  Limite [0, 100], inteiros (`Math.trunc`/`Math.round`).
- **Rationale**: aritmética inteira explicável, igual à confiança da 012; cinco derrotas ⇒ 20
  pontos de queda pelo resultado, além da expectativa (SC-001 pede ≥ 15); derrota em clássico de
  intensidade 3 ⇒ 2,2× (SC-002 pede ≥ 1,5×). A posição e a expectativa de todos os clubes são
  calculadas uma vez por rodada (`tableSnapshot`), não clube a clube.

## R5 — Efeito no público

- **Decision**: `gateFor` ganha o humor do mandante (parâmetro opcional `mood`, padrão neutro):
  `moodFactor = 1 + (mood − 50) × gateSwingPct / 5000` (padrão `gateSwingPct` 30 ⇒ 0,70 a 1,30),
  multiplicando o público antes do limite da capacidade. `applyRoundFinances` e
  `nextHomeGateEstimate` recebem `fans?` e passam o humor. Sem `fans` (usos antigos), fator 1.
- **Rationale**: reaproveita o modelo da 008 sem mudar os outros termos; a estimativa da tela de
  finanças fica coerente com o jogo real (US2 cenário 3).

## R6 — Ídolos

- **Decision**: ídolos = os `idolCount` (3) jogadores mais fortes do elenco atual do clube
  (desempate por id). Na rodada, a torcida lê os registros novos do log do mercado da rodada:
  `sale` e `released` de um jogador que estaria entre os ídolos do clube vendedor (força ≥ a do
  `idolCount`-ésimo do elenco que ficou) ⇒ `−idolLoss` (8); `buy`, `free` ou `loan` em que o jogador
  passa a estar entre os ídolos do clube que recebe ⇒ `+starSigning` (4). Aposentadoria e fim de
  empréstimo não estão no log como venda ⇒ não contam. Vale para todos os clubes.
- **Rationale**: sem estado extra; usa o mesmo log que a 011 já grava para todos os clubes.
- **Limite conhecido**: liberações de contrato acontecem na virada (011) e não passam pela rodada;
  um ídolo liberado na virada não mexe no humor.

## R7 — Clássicos

- **Decision**: `rivalryOf(world, a, b): Rivalry | undefined` (mapa por par ordenado, construído do
  banco); `isDerby(world, fixture)`. Na diretoria (012), `confidenceChange` passa a usar o mesmo
  multiplicador de clássico na parcela de resultado (fatores `derbyWin`/`derbyLoss`/`derbyDraw`),
  com `derbyPct` próprio em `competition.board` (padrão 40).
- **Rationale**: um só helper para torcida, diretoria e interface (FR-011, FR-012).

## R8 — Torcida na diretoria

- **Decision**: `confidenceChange` ganha o fator `fans`: humor < `fanPressureBelow` (35) ⇒
  `−⌈(35 − humor) / fanDivisor⌉` (divisor 10, máx. −4 com humor 0); humor > `fanSupportAbove` (70) ⇒
  `+⌊(humor − 70) / fanDivisor⌋`; entre os dois, nada. A parcela negativa passa pela paciência como
  as demais. `BoardContext` ganha `fans?: FansState`.
- **Rationale**: ciclo resultado → torcida → diretoria (design §10) sem dominar a confiança.

## R9 — Virada de temporada

- **Decision**: etapa `fans-new-season`, depois de `record-history`: humor novo =
  `neutral + (humor − neutral) × carryPct / 100` (padrão 50) `+ titleBoost` (10) / `promotionBoost`
  (10) / `− relegationDrop` (10), limitado a [0, 100]; `recent` zerado.
- **Rationale**: a torcida tem memória, mas a nova temporada renova a esperança (Edge Cases).

## R10 — Onde a torcida age

- **Decision**: `completeCareerRound(…, renewal?, market?, board?, fans?)` com `CareerFans { state }`:
  finanças da rodada com o humor atual → mercado → **torcida** (resultado, expectativa, ídolos pelo
  log da rodada) → diretoria (já com o humor novo). Resultado ganha `fans?`. `advanceCareer`
  repassa. `TurnoverOptions/Context/Result` ganham `fans?`.
- **Rationale**: mesmo caminho de 009/011/012 para ao vivo, direto, testes e simulações.

## R11 — Save v9

- **Decision**: `formatVersion: 9`; `fans: FansState`. Criação: `createFans(bank)` (todos neutros).
  Migração v8 → v9: `fans` neutros e, se `bank.manifest.id === "default"` e o banco não tem
  rivalidades, `bank.rivalries = generateRivalries(bank.clubs, DEFAULT_SEED)` — a mesma função e
  seed do gerador, que reproduz o `rivalries.json` versionado (teste garante a igualdade). Outros
  bancos ficam sem rivalidades.
- **Rationale**: Princípio VI; carreiras antigas no banco padrão ganham clássicos.

## R12 — Balanceamento

- **Decision**: `fans/long-run.test.ts`, 30 temporadas, 2 seeds, mercado + diretoria + torcida, sem
  humano: humor médio das torcidas em [35, 65] em toda temporada; nenhum clube preso em 0 ou 100 por
  mais de uma temporada inteira; os limites da 008 (`finance/long-run.test.ts`) continuam valendo com
  a torcida ativa. Cenários: 5 derrotas seguidas ⇒ queda ≥ 15 e público médio −5% (SC-001);
  clássico de intensidade 3 perdido ⇒ ≥ 1,5× a derrota comum em humor e confiança (SC-002).
  `sim:world` e `sim:economy` passam a rodar com a torcida e mostram o humor médio.

## R13 — Interface

- **Decision**:
  - Início: cartão **Torcida** (faixa, valor com medidor, tendência, 3 motivos); "Clássico" no
    próximo jogo.
  - Calendário, resultados da rodada e rodada ao vivo: selo "Clássico" (com a intensidade em texto
    acessível).
  - Carreira: aba **Torcida** com o humor e a lista de rivais do clube (nome, divisão, intensidade).
  - Finanças: a estimativa já inclui o humor (sem mudança visual).
- **Rationale**: FR-012, FR-016, SC-006.

## R14 — Parâmetros (`competition.fans`, padrões `DEFAULT_FANS`)

| Grupo | Campos (padrão) |
|---|---|
| humor | `neutral` 50, `win` 4, `draw` 0, `loss` 4, `checkFromRound` 5, `gapWeight` 4, `aheadWeight` 4, `aheadCap` 30, `driftDivisor` 6, `calmDivisor` 8, `keepRecent` 10 |
| clássicos | `derbyPct` 40 |
| ídolos | `idolCount` 3, `idolLoss` 8, `starSigning` 4 |
| público | `gateSwingPct` 30 |
| diretoria | `fanPressureBelow` 35, `fanSupportAbove` 70, `fanDivisor` 10 (em `competition.fans`); `derbyPct` 40 em `competition.board` |
| virada | `carryPct` 50, `titleBoost` 10, `promotionBoost` 10, `relegationDrop` 10 |
| faixas | `bands` [20, 40, 60, 80] |

Todos inteiros; schema Zod opcional e `.partial()`.

## Calibração (resultado da implementação)

- Com `loss` 5 e `gapWeight` 6 (valores iniciais), o humor médio ficou em ~44 e 12,5% das torcidas
  terminavam temporadas em 0 ou 100. Com `loss` 4 (simétrico à vitória) e `gapWeight` 4: humor
  médio entre 48 e 50 em todas as 30 temporadas das duas seeds e nenhuma temporada acima de 10% de
  torcidas nos extremos (`fans/long-run.test.ts`).
- `finance/long-run.test.ts` com a torcida ativa: limites da 008 inalterados.
- `sim:world --seasons 30`: humor médio 50; trocas de técnico subiram de 14,4% para 17,8% por
  temporada (pressão da torcida e clássicos na confiança), dentro de 5–35%.
- `sim:economy --seasons 30`: limites da 008 inalterados (100% fora de crise, Spearman 0,85).
- Banco padrão: 40 rivalidades (8 de intensidade 3, 8 de 2, 24 de 1), 2 rivais por clube.
- `fansAfterRound` no mundo inteiro: abaixo de 5 ms (mediana).
- A pressão da torcida torna demissões do técnico mais frequentes em clubes fracos; o e2e da virada
  (`seasons.spec.ts`) passou a criar a carreira com "Sem demissão", porque testa a virada, não a
  diretoria.
