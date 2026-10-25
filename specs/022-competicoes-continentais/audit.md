# Auditoria da 022 (T002)

Leitura do código em 2026-10-25, antes de implementar. Cada achado aponta a tarefa que o resolve.

## (a) Usos de `competition.countryId` / competição principal

Com `countryId` opcional, o TypeScript acusa os usos abaixo. Todos precisam tratar "sem país":

| Local | Uso | Tratamento |
|-------|-----|-----------|
| `world/countries.ts` `mainCompetitionOf`, `mainCompetitions`, `isCountryMain` | `find(c => c.countryId === countryId)` | **Armadilha:** com `countryId` indefinido o `find` casaria com a competição sem país. Ignorar competições sem país em todas as três (T010) |
| `validation/semantic/countries.ts` `mainCompetitions`, `calendar.ts:16` | mapa país → principal | pular competição sem país; `club_outside_main` não vale para ela (T006) |
| `career/day.ts:89` `countryMain` | liga principal do país da competição do slot | sem país cai em `state.league` (comportamento atual do fallback), mas as lesões precisam vir da liga de **cada clube** (T022) |
| `world/leagues.ts` `simulationKindFor` | compara o país da competição com o da `league` | **Bug latente para a 022:** competição sem país seria sempre "summary", inclusive a do clube do técnico. Passa a ser "full" quando o clube em foco participa (T022) |
| `career/season-state.ts:148` `focusIndex`, `world/leagues.ts` `mainLeagueOfClub` | principal do **país do clube** | sem mudança (usam `club.countryId`) |
| `career/turnover.ts:253`, `fans/turnover.ts:21`, `world/create.ts:18`, `save/migrate.ts:504`, `tools/simulate-scale.ts` | `isCountryMain(world, id)` | corretos com a guarda da T010 |
| `renewal/regulator.ts`, `market/value.ts`, `tools/*` | `world.competitions[0]` | seguem corretos desde que a competição entre países **não seja a primeira** do banco (validação `continental.shape` exige; T006) |
| `apps/web/src/ui/CompetitionSelect.tsx:27,31` | agrupa/filtra por país | competição sem país precisa de grupo próprio (T025) |
| `worldgen/world-example.ts` | `countryId: league.countryId` | n/a |

## (b) Onde a reputação do clube muda

**Em lugar nenhum.** `club.reputation` só é lido (bilheteria, patrocínio, jovens, sorteios). Não há
regra de evolução da reputação do clube hoje. Logo o bônus continental (T034) é a primeira escrita:
a etapa de virada devolve um `world` com `clubs[].reputation` alterada, no mesmo padrão em que a
renovação (009) devolve um `world` novo. Efeito colateral a medir na T061: reputação sobe sem
nenhum mecanismo de queda; por isso o teto (`reputationCeiling`) e o limite de deslocamento médio
do mundo (`reputationDriftMax`) são obrigatórios, e a T065 avalia um decaimento se o teto não bastar.

## (c) Regras do mandante

`rulesCompetitionOf(world, clubId)` já devolve a principal do país do **clube**. `gateFor(finances,
league, world, fixture, price, …)` recebe a `league` do jogo; as regras econômicas vêm de
`economyRules(world, competitionId)`. Para o jogo continental a chamada deve usar a competição
principal do país do **mandante** (T009/T010), e a `divisionEconomy` do nível do mandante na
liga dele (a divisão em fases do continental não tem `economy.divisions`).

## (d) Pontos de chamada em `career/day.ts`

- `advanceStages`: dentro de `completeLeagueRound`/`drawn` ao fechar cada rodada; a ponte de
  ligação (`sealDropIns`, T046) entra depois de `withLeague(next, drawn(...))` (linha ~226),
  antes do bloco de lesões.
- `cupPrizes`: linhas ~335 e ~578 (rodada ao vivo e direto), com `postPrizes`. `competitionAwards`
  (T033) entra nos dois pontos, para não separar ao vivo de direto.
- `simulationKindFor`: linha ~210 (ver (a)). A rodada ao vivo só vale no ramo "full".

## (e) Condição física e a IA

- `tiredWorld(state, date)` aplica `worldWithFitness` ao mundo **inteiro** (todos os jogadores de
  todos os clubes, não só o do técnico), antes da rodada ao vivo e da direta. A resumida
  (`match/summary.ts:58`, `season/summary-round.ts:27`) também desconta a condição.
- `fitnessRules(world, season.competitionId)` lê o bloco `fitness` da competição; sem ele usa o
  padrão. Para a competição sem país vale o padrão (a condição física é do jogador, não da
  competição). `tiredWorld` usa `state.league.competitionId` para as regras: igual para todos.
- Conclusão: **sem lacuna conhecida para a IA** na condição física; o que falta é a T019 provar
  que o clube da IA escala reservas em quarta + domingo (`autoLineup`). A T019a só age se o teste
  falhar.

## (f) Resolução de vagas com fonte na própria competição

- `qualification/order.ts` `dependencies`: só considera `require`/`forbid` e ignora a própria
  competição; `source`/`fallback` não geram dependência. Fonte `champion` da própria competição é,
  portanto, aceita sem ciclo.
- **Correção ao research R2:** não existe "primeira edição sem campeão anterior" na resolução. A
  resolução roda ao **fim** de cada temporada e a competição existe desde a temporada 1 (com os
  `clubIds` do banco), então o campeão anterior sempre existe quando as vagas da seguinte são
  calculadas. O que a T018/T023 precisam cobrir é só "fonte na própria competição".
- `feedableCompetitions` seleciona a competição por ter `berths` em alguma divisão: a continental
  entra automaticamente.

## (g) Onde a UI lê `Origin`

`apps/web` lê `LeagueSeason.origins` na página da competição (021 R7). `Origin` ganha o valor
`dropIn` (T048); o `switch` da UI deve ganhar o caso, com teste de exaustividade.

## Linha de base (T064)

Pendente: números de `pnpm sim:world --seasons 30 --continental` após a US3.

## Resultado da implementação da US1

- **T019a:** sem lacuna. O teste de rodízio (`continental-ai.test.ts`) mostra que os clubes da IA
  mudam mais o onze quando jogam em menos de 7 dias (taça + liga) do que com a semana de descanso.
- **O que já funcionava sem mudança:** criação da competição entre países em `competitions`,
  calendário sem conflito, virada com vagas (`resolve-qualification`) com fonte na própria
  competição, sorteio de grupos separado por país e encerramento só depois da final.
- **O que mudou:** `simulationKindFor` passa a olhar o clube em foco para competições sem país;
  as lesões são sincronizadas pela liga de cada clube (`injurySources`); a bilheteria dos jogos
  vai para a liga do país do mandante (`matchMain`); a aba da taça aparece em `CompetitionSelect`.
- **Validação de vagas:** em competição sem país o fechamento só precisa cobrir as vagas que o
  usam (a regra antiga exigia a divisão inteira, impossível com 40 clubes e ligas de 20).
- **Pendência para a US2:** reações de torcida, diretoria e notícias a jogos fora de casa em
  campo estrangeiro (hoje só os jogos cujo mandante é do país do técnico passam por
  `afterExtraMatches`).

## Linha de base e calibração (T064, T065)

**30 temporadas, 10 países, 400 clubes, `pnpm sim:world --continental --seasons 30`** (primeira rodada,
25,7 min): campeão mais forte que a média dos participantes em 90% das edições, 16 campeões
distintos, maior parcela de títulos 13%, Spearman vagas × títulos 0,58; assíduos (6) com caixa 0,94
folha acima da mediana e 100% fora de crise (demais 95%); prêmios até 13,9% da receita; nenhuma
reputação acima do teto e deslocamento médio −1,12. Dia de jogos 314 ms, virada 4,7 s, save no início
da temporada 31 com 12,08 MB.

**Custo da 022, 10 temporadas, com e sem as taças (mesmo mundo, mesma máquina):**

| | sem a taça | com a taça |
|---|---|---|
| dia de jogos (mediana) | 253 ms | 238–257 ms |
| virada (mediana) | 3 838 ms | 3 791–4 147 ms |
| save no início da temporada 10 | 7,05 MB | 7,31 MB (+3,7%) |
| maior save (última rodada) | 33,96 MB | 34,51 MB (+1,6%) |
| pico de heap | 494 MB | 517 MB (+5%) |

A primeira rodada de 30 temporadas mostrou heap de 1,6 GB por culpa da ferramenta (guardava o estado
de cada temporada para medir). Agora ela guarda um resumo só de números por temporada
(`snapshotContinental`) e o pico volta ao nível da base. Com a taça o tempo não muda, o save cresce
uns 3% (mais jogos e registros) e `saveStart31Bytes` passou de 12 para 12,5 MB por isso. O total de
30 temporadas (25,7 min contra a meta de 20) depende da máquina e não mudou por causa da 022: a meta da
020 foi medida em ~15 min em outra máquina e o tempo por dia e por virada é o mesmo de antes.

**Calibração feita:** os valores em dinheiro do mundo compacto caíram a 40% (ligas de 14 rodadas) e os do
completo a 85% (prêmios chegavam a 15,4% da receita); a tabela de reputação passou a ser quase de soma
zero (quem cai nos grupos perde 1, o campeão ganha 3 ou 4), porque sem isso toda a reputação dos
participantes só subia; reputação aceita pontos negativos (`-5` a `5`).
