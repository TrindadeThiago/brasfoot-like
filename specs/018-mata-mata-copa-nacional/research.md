# Research: Mata-mata e copa nacional

Decisões técnicas da 018. Os números são os padrões iniciais (`DEFAULT_KNOCKOUT`, `SHOOTOUT_TUNING`),
ajustáveis por dados ou calibrados nos testes de simulação (R14).

## R1 — A copa reaproveita `Season` (competição = `LeagueSeason` com uma "divisão" eliminatória)

- **Decision**: uma competição `knockout` vira uma `LeagueSeason` com **uma** `Season` cujo
  `calendar` tem uma rodada por **perna** de cada fase (1 ou 2 por fase; todos os confrontos da fase
  jogam a mesma perna na mesma data), criadas de saída com `fixtures: []`. A `Season` ganha o campo opcional `bracket` (R4) com as fases e os
  confrontos. Os sorteios preenchem as `fixtures` de cada fase **quando a fase começa**. Tudo o
  que já funciona para uma competição secundária da 017 continua valendo sem mudança: `status`
  (cartões e lesões), `records`, `startRound`/`completeRound`, escalação e ausências, `DayMatch`,
  sincronização de lesões, condição física, bilheteria, torcida/diretoria/manchetes pelos jogos do
  dia e o calendário.
- **Rationale**: a 017 já isolou "o que é uma rodada de uma competição". O que muda na copa é só
  quem joga em cada rodada (depende de resultados anteriores) e como o confronto é decidido.
  Modelar a copa à parte duplicaria o dia de jogos, a disponibilidade, o save e as telas.
- **Alternatives considered**: um `CupSeason` próprio ao lado de `competitions` (reescreve o dia
  de jogos, `clubFixtures`, `syncInjuries` e o turnover); expandir a copa inteira no início (os
  confrontos dependem de resultados).

## R2 — Formato `knockout` em dados

- **Decision**: `format.type` ganha `"knockout"` (sai de `RESERVED_FORMAT_TYPES`; `groups` continua
  reservado). O formato da copa é:

  ```text
  format: {
    type: "knockout",
    phases: [{ name, legs: 1|2, tiebreakers[], neutral?, home, seeded?, prize }]  // 2 a 8 fases
    entries?: [{ phase: 1..n-1, clubIds[] }]    // clubes que só entram numa fase posterior
  }
  divisions: [ { level: 1, name, clubIds (todos os participantes), promotionSlots: 0, relegationSlots: 0 } ]
  ```

  - `tiebreakers`: lista ordenada de `"away-goals"` (opcional), `"extra-time"` (opcional) e
    `"penalties"`; o saldo no agregado é sempre o primeiro critério. A lista termina em
    `"penalties"`, ou em `"extra-time"` seguido de `"penalties"`; sem `penalties` a fase é
    recusada (FR-003).
  - `home`: `"draw"` | `"ranking"` | `"division"` (R7); em ida e volta vale para a ida.
  - `neutral`: o jogo único é em campo neutro (só com `legs: 1`).
  - `seeded`: o sorteio da fase usa cabeças de chave (R6).
  - `prize`: valor pago ao vencedor de cada confronto da fase; o campeão recebe o da final.
  - `entries`: quem não está listado entra na fase 0; a fase `p ≥ 1` tem `vencedores da fase p − 1
    + entries[p]` participantes, sempre um número par.
  - `rounds`, `points` e `tiebreakers` da liga **não existem** na copa. O schema de `format`
    vira uma união discriminada por `type` (`league` ou `knockout`); os campos da liga continuam
    iguais.
- **Agenda**: `competition.schedule` (017) vale para a copa; cada perna de cada fase, em ordem, ocupa
  uma data (`startWeek + k × everyWeeks`). A final pode ter um `gapWeeks` extra opcional na fase
  (`phases[i].gapWeeks`, 0 a 8, padrão 0) para respiro antes dela.
- **Rationale**: o formato `league` e a copa compartilham `divisions` (participantes), `schedule`,
  `discipline`, `economy`; só `format` e as regras de sorteio mudam. Entradas explícitas (lista de
  clubes) são o dado mais simples e editável por mods.
- **Alternatives considered**: seletores ("os N mais fortes"; difícil de validar e de documentar);
  uma seção própria `cups.json` (mais um arquivo para o modder, sem ganho).

## R3 — Validação do banco

- **Decision**: novas regras semânticas, com códigos novos (R12):
  - `knockout.phase_count`: número de clubes de uma fase ímpar ou fora de 2..participantes
    (diz a fase, quantos e se sobra ou falta clube);
  - `knockout.entry_phase`: `entries[].phase` fora de 1..n − 1;
  - `knockout.entry_duplicate`: clube em duas entradas;
  - `knockout.entry_not_participant`: clube de `entries` ausente da divisão;
  - `knockout.no_decider`: fase sem critério final que sempre decida;
  - `knockout.neutral_two_legs`: `neutral` em fase de ida e volta;
  - `knockout.single_division`: copa com mais de uma divisão.
  A regra da 017 `competition.club_outside_main` vale para a copa; e a `calendar.*` conta o número
  de jogos da copa (Σ legs) e os clubes participantes.
- **Rationale**: o princípio III pede erro por arquivo/campo, em português, com mensagem traduzível.
  O número de clubes por fase é uma conta simples feita só com os dados.

## R4 — Chaveamento (`Season.bracket`)

- **Decision**: `bracket = { phases: BracketPhase[] }`, `BracketPhase = { index, drawn: boolean,
  ties: Tie[], rounds: number[] }`, `Tie = { id, home, away, seeds? }`. Os resultados NÃO são
  duplicados no `Tie`: o vencedor, o agregado e a forma da decisão são derivados dos `records` da
  `Season` (R5). `rounds` lista os números de rodada (jogos) da fase no `calendar`.
- **Sorteio sob demanda**: `ensurePhaseDrawn(season, world, phaseIndex)` é chamado por
  `startCareerDay` (e por `completeCareerDay` quando o jogo é direto) antes de qualquer jogo da
  fase. Ele junta os classificados da fase anterior (derivados) com `entries[phaseIndex]`,
  sorteia (R6), grava `ties` e as `fixtures` das rodadas da fase (mando por R7; volta com o mando
  invertido) e devolve uma nova `Season`.
- **Rationale**: derivar o vencedor dos registros evita estado duplicado que diverge; o único
  estado novo é o sorteio, que é uma decisão e não um resultado.
- **Alternatives considered**: guardar o vencedor no `Tie` (duas fontes da verdade); sortear tudo
  de saída (impossível).

## R5 — Decisão do confronto

- **Decision**: nova função pura `tieState(bracket, season, tieId)`: devolve o agregado dos jogos
  já feitos, se o confronto está decidido, o vencedor e `decidedBy` (`aggregate` | `away-goals` |
  `extra-time` | `penalties`). Para a **última** partida do confronto, o motor de partida recebe um
  `decider` (R8) com o agregado anterior e os critérios, e devolve o jogo já decidido. Assim a
  ida e volta, o jogo único e os desempates têm uma só implementação.
- **Rationale**: o confronto é decidido dentro da partida (o que o ao vivo mostra), e a camada da
  copa só lê o resultado.

## R6 — Sorteio determinístico e cabeças de chave

- **Decision**: `drawPhase(participants, options)`: PRNG com fork `${seed}:cup:${competitionId}:draw:${phase}`.
  Sem cabeças de chave: embaralha os participantes (ordenados por id antes) e emparelha de dois em
  dois. Com `seeded`: os `N/2` de maior reputação (desempate por id) são cabeças e cada um enfrenta
  um não-cabeça sorteado. Quando os participantes têm entradas tardias ou o número de cabeças
  excede o de vagas, o sorteio relaxa a regra na ordem dos dados em vez de falhar (borda da spec).
- **Rationale**: simples, verificável (mesma seed ⇒ mesmos pares) e coerente com a spec.
- **Alternatives considered**: potes por divisão (mais configuração sem pedido).

## R7 — Mando

- **Decision**: `ranking` = o de maior reputação joga em casa (desempate por id); `division` = o de
  divisão de nível mais alto (número maior) joga em casa, empate decidido por sorteio com o fork
  da fase; `draw` = sorteado. Em ida e volta, a regra define o mandante da **ida**, e a volta
  inverte. O nível de divisão vem da competição principal do banco (`division.club_in_multiple`
  não vale entre competições, 017), com nível 1 se o clube não estiver nela.
- **Campo neutro**: o `neutral` da fase faz a partida usar `MatchInput.neutral = true` (já
  suportado pelo motor) e a renda é dividida (R9).

## R8 — Motor de partida: prorrogação e pênaltis como extensões

- **Decision**: `MatchInput` ganha `decider?: Decider`, com
  `{ before: { home: { goals, awayGoals }, away: { goals, awayGoals } }, awayGoals: boolean,
  extraTime: boolean, penalties: true }` (os gols dos jogos anteriores do confronto, do ponto de
  vista dos lados desta partida). **Sem `decider`, o motor roda exatamente como hoje** (os 90
  minutos e o `finished`; testes de realismo e determinismo inalterados).
  Com `decider`, ao terminar os 90 minutos o motor avalia o agregado (`before + score`), os gols
  fora (se `awayGoals`) e decide:
  1. decidido ⇒ `finished`;
  2. empate e `extraTime` ⇒ prorrogação: o relógio segue em duas "metades" `half: 3` (91–105) e
     `half: 4` (106–120), sem acréscimo, com uma troca de lado entre elas (evento `extra_half_time`),
     mais **uma substituição** permitida; reavalia o agregado no fim;
  3. ainda empatado ⇒ pênaltis (`status: "penalties"`);
  4. `finished` com `decidedBy` e vencedor.
- **Relógio**: `MatchClock.half` vira `1 | 2 | 3 | 4`; `MatchStatus` ganha `"extra_first_half"`,
  `"extra_half_time"`, `"extra_second_half"` e `"penalties"`. O PRNG por minuto já usa `half` na
  chave (`minuteRng`), então os 90 minutos mantêm os mesmos sorteios.
- **Eventos novos**: `extra_time_start`, `extra_half_time`, `extra_time_end`, `shootout_start`,
  `shootout_kick { side, playerId, outcome: "goal" | "saved" | "post" | "off", order }`,
  `shootout_end { winner }`. O motor estruturado produz dados; o texto vem do i18n.
- **Rationale**: ao vivo e direto usam o mesmo `advanceMatch` (Princípio II), e a prorrogação e os
  pênaltis aparecem como mais passos do relógio, que a rodada ao vivo já sabe exibir.
- **Alternatives considered**: simular prorrogação/pênaltis fora do motor depois do resultado dos
  90 minutos (o ao vivo não mostraria os lances nem permitiria substituir); uma segunda partida
  encadeada (perde o estado da partida: cartões, cansaço, substituições).

## R9 — Pênaltis

- **Decision**: `match/shootout.ts` (puro). Os cobradores de cada lado são os jogadores em campo
  ao fim (sem expulsos), ordenados por aptidão de finalização (força efetiva no ataque, depois
  id), com o goleiro por último; a série repete a ordem quando acaba. Cada cobrança: probabilidade
  de gol `clamp(0,75 + (cobrador − goleiro) / 400, 0,55, 0,90)`; se não é gol, `saved` (50%),
  `post` (20%) ou `off` (30%). PRNG com fork `${seed}:shootout:${ordem}`. As séries são de 5 cobranças
  alternadas; a decisão antecipada acontece quando um lado não alcança mais o outro; depois, uma
  cobrança por lado até haver diferença. Teto de segurança de 40 cobranças por lado, depois do qual
  um sorteio determinístico decide (nunca atingido nos testes, só garante o término).
- **Rationale**: dependente da força (como o resto do jogo), simples e determinístico.

## R10 — Rodada ao vivo

- **Decision**: cada cobrança é um passo do relógio (`matchTicks` considera os passos extras da
  prorrogação e dos pênaltis), então `advanceRound`/`isRoundFinished` não mudam de estrutura. A
  tela ao vivo ganha: o relógio até 120', o aviso "prorrogação", e um painel de pênaltis com as
  cobranças (cobrador, resultado, placar da série), mantendo o placar dos 90/120 minutos separado
  do dos pênaltis. Substituições valem na prorrogação (e a pausa automática na expulsão/lesão
  continua).
- **Rationale**: reaproveita o laço e o feed existentes (`useLiveRound`, `EventFeed`).

## R11 — Calendário e dia de jogos

- **Decision**: `calendarCompetitions` entende a copa: `rounds = Σ legs`, `clubIds =` participantes,
  `schedule` com `gapWeeks`. O dia de jogos trata a rodada da copa como as demais secundárias
  (017), com três acréscimos: `ensurePhaseDrawn` antes de iniciar o jogo; o `decider` no
  `MatchInput` da última partida do confronto (via `prepareFixture`); os prêmios do dia depois do
  fechamento da rodada (R12 de finanças). `clubFixtures`/`nextClubFixture` mostram só os jogos já
  sorteados do clube, sem inventar confrontos futuros.
- **Rationale**: a 017 já resolveu conflito de datas, descanso e disponibilidade.

## R12 — Finanças, bilheteria e prêmios

- **Decision**: a bilheteria dos jogos da copa segue `applyExtraGates` (017): mandante recebe a
  renda; em campo neutro, a renda é calculada com a capacidade de `fixture.neutralCapacity`
  (campo `neutral.capacity` na fase, padrão 40.000 por jogo) e dividida igualmente. O prêmio de
  cada confronto (`phases[i].prize`) é lançado ao vencedor, na categoria `prize` já existente do
  livro-caixa, com `competitionId` e `date`, no dia em que o confronto é decidido. Os valores do
  banco padrão são calibrados para que os prêmios somem uma fração pequena da folha (R14).

## R13 — Torcida, diretoria, notícias e histórico

- **Decision**:
  - **Torcida**: fatores novos `cupOut` e `cupTitle` em `MoodFactor` (peso por fase, em
    `fans.cup`), somados ao fator de resultado que a 017 já aplica; a eliminação pesa mais em fases
    avançadas.
  - **Diretoria**: meta de copa opcional por clube (`board.cupGoals`, padrão ligado): fase mínima
    por faixa de reputação; avaliada ao fim da copa, com fator novo `cupGoal` na confiança; sem
    demissão só por causa da copa (pesos baixos).
  - **Notícias**: tipos novos `cupUpset` (zebra: eliminado de divisão mais alta por um de divisão
    mais baixa), `cupElimination` (clube do jogador), `cupFinal` (classificação à final) e
    `cupChampion`; cada um com variações em `ui.json`.
  - **Histórico**: `CupHistoryEntry { number, year, competitionId, championId, runnerUpId,
    final: { home, away, score, decidedBy } , path: { clubId, phase }[] }` em `save.cupHistory`
    (um por edição) e a campanha do clube do jogador (fase alcançada) no histórico do técnico.
- **Rationale**: todos os sistemas já recebem os `DayMatch` das secundárias; os fatos da copa vêm
  do `bracket` e dos registros.

## R14 — Copa do banco padrão e calibração

- **Decision**: a copa padrão tem 6 fases: fase 1 (16 clubes da Série B de menor reputação, jogo
  único), fase de 32 (8 vencedores + os 4 outros da Série B + os 20 da Série A, jogo único),
  oitavas e quartas (jogo único), semifinal (ida e volta) e final (jogo único em campo neutro).
  Jogo único: prorrogação e pênaltis; semifinais: agregado, prorrogação e pênaltis; gols fora
  desligados; mando por divisão até as quartas e por sorteio nas semifinais; prêmios crescentes por
  fase. São 7 datas (1 + 1 + 1 + 1 + 2 + 1) e 8 + 16 + 8 + 4 + 4 + 1 = 41 jogos por edição. Agenda:
  quarta-feira, a cada 2 semanas a partir da semana 1, com a final um intervalo de 1 semana a mais
  (`gapWeeks: 1`); a última data cai na semana 15, bem dentro da temporada.
- **Geração**: `generateDefaultBank({ cup: true })` (padrão `false` para não mudar o resto dos
  testes do motor) gera a competição `copa-nacional`; `pnpm gen:default-bank` passa `cup: true`.
  O nome vem do banco de nomes por país (`names.cupName`, novo campo opcional do banco de nomes;
  o banco de exemplo Norvália ganha um também).
- **Simulação longa**: `knockout/long-run.test.ts` joga 1.000 copas só com o motor (sem o
  calendário) e confere: todo confronto com classificado; os 8 clubes de maior reputação campeões
  mais vezes que os 8 de menor, e os 8 de menor campeões em ≥ 1% das edições (faixas declaradas no
  teste e registradas aqui depois de medidas). Mais o teste de 10 temporadas com liga e copa.

## R15 — Save v13 e migração

- **Decision**: `SAVE_FORMAT_VERSION = 13`, campo novo `cupHistory: CupHistoryEntry[]` (vazio na
  migração). As copas vivem dentro de `competitions` (R1), então um save v12 não muda de forma:
  carreiras antigas (banco sem copa) seguem sem copa. O `calendarProblem` da integridade do save
  passa a validar as rodadas da copa pelo `calendar` da `Season` (rodadas sem `fixtures` são
  válidas enquanto a fase não foi sorteada).

## R16 — Interface

- **Decision**: a tela **Competição** ganha, para uma copa selecionada nas abas de competição
  (017), três seções no lugar de classificação/resultados/artilharia: **Chaveamento** (fases em
  colunas, confrontos com placar e classificado), **Resultados** (por fase, com prorrogação e
  pênaltis) e **Artilharia** (a existente). O calendário do clube mostra a fase (`calendar.phase`)
  e o jogo (ida/volta). A Início mostra a fase no próximo compromisso. O **Histórico** ganha a
  aba "Copas" (campeão e vice por edição; títulos por clube). Todas as strings via i18n; nomes de
  fases vêm do banco.


## Calibração dos prêmios (T051)

- Folha anual do banco padrão: mínima 4,4 mi, mediana 6,2 mi, máxima 12,3 mi.
- Prêmios por confronto vencido, da final para trás: 500 mil, 250 mil, 150 mil, 90 mil, 60 mil,
  40 mil. Um campeão que entra na Fase de 32 recebe ~1,05 mi (~17% da folha mediana); o clube médio
  vence um confronto e recebe menos de 2% da folha. Os valores iniciais (800 mil na final, ~1,7 mi
  para o campeão) pesavam demais e foram reduzidos.
- `pnpm sim:economy`/`sim:world` seguem no caminho só-liga (não jogam copa); o efeito da copa na
  economia é coberto pelos testes de 30 temporadas da liga + copa (T057/T058).

## Medições da fase final (T056, T057)

- 1.000 copas na copa de teste (16 clubes): os 8 de maior reputação ganharam 807 edições (80,7%) e
  os 8 de menor reputação, 193 (19,3%). Limite declarado: favoritos > demais e demais ≥ 1%.
- Liga + copa no banco padrão, 10 temporadas × 2 seeds: nenhum clube em dois jogos no mesmo dia,
  uma edição da copa por temporada no histórico, placares (2,2–3,0 gols por jogo), condição física
  (≥ 85) e economia dentro dos limites já declarados da 017/008, sem revisá-los.
- Desempenho: sorteio de 32 clubes < 1 ms; dia de copa no banco padrão < 300 ms.
