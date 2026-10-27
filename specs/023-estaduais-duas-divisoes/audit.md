# Auditoria: clubes só regionais e início da temporada (T001)

Leitura do código em 2026-10-27, antes de implementar. Cada achado diz o que fazer; os itens
"corrigir" viram trabalho nas tarefas indicadas, e os demais ficam registrados como seguros.

## 1. "Competição principal do país" (R1)

| Onde | Achado | Ação |
|------|--------|------|
| `world/countries.ts` `mainCompetitionOf`, `mainCompetitions` | A principal é a primeira competição com o `countryId`; um estadual listado antes da liga a roubaria | Corrigir (T007): ignorar competição com `regional` |
| `world/countries.ts` `matchRulesCompetition`, `rulesCompetitionOf` | Já usam a principal do país; valem para o estadual depois de T007 | Seguro |
| `career/day.ts:87,124,449,485` | `countryId !== undefined` separa nacional de internacional; o estadual (com `countryId`) cai no caminho nacional, que é o certo | Seguro |
| `career/day.ts:326`, `career/turnover.ts:266`, `world/create.ts:19` | `isCountryMain` filtra as principais; com T007 o estadual deixa de contar como principal | Seguro depois de T007 |
| `renewal/regulator.ts:18,32` | Usa `world.competitions[0]?.countryId` como país "da liga" | Conferir em T057 com um banco de um só país |
| `market/value.ts:23`, `modkit/summary.ts:18` | Usam `competitions[0]` | Exige que a liga venha antes do estadual no arquivo ou que o código use a principal; corrigir em T057 |

## 2. `clubDivision(league, clubId)` com clube só regional (R4)

| Onde | Achado | Ação |
|------|--------|------|
| `finance/gate.ts:68,106` | Recebe a `league` da própria competição do jogo; o clube do estadual está nela | Seguro |
| `finance/actions.ts:58` | Padrão nível 1 quando o clube não está na liga recebida | Seguro |
| `finance/rules.ts` `economyRules` | Lê a economia da própria competição com os padrões do motor; o estadual pode declarar `economy` | Seguro; documentar no mod |
| `market/ai/report.ts:32`, `market/player-response.ts:15` | Nível `undefined` ou 1 para clube fora da liga principal | Conferir em T057 (relatório da IA) |
| `board/{evaluation,goals,history,offers}.ts` | Só o clube do jogador, que nunca é regional | Seguro |
| `fans/mood.ts:46`, `news/round.ts:42`, `news/facts.ts:98` | Operam sobre `context.league` (a principal); resultados do estadual não entram | Corrigir em T033/T034/T040 |
| `career/season-state.ts:371` | Lista suspensões em outras competições; vale para o estadual | Seguro |

## 3. "A temporada começa na rodada 1 da liga" (R6)

| Onde | Achado | Ação |
|------|--------|------|
| `calendar/season-calendar.ts` | O calendário é por datas; o primeiro dia é o da primeira rodada de qualquer competição | Seguro; teste em T015 |
| `career/day.ts` (fadiga, lesões) | Calculados por dia de jogo, não por rodada da liga | Conferir em T021 |
| Janela de transferências | Depende de `market/ai/window.ts`; verificar se usa a rodada da liga principal | Conferir em T021 |

## 4. Composição de competições secundárias

`career/turnover.ts:230` e `qualification/finish.ts:22` já chamam `nextComposition` para toda
competição secundária que não é copa. Acesso e rebaixamento do estadual usam esse caminho; a
mudança de T027 fica restrita à ordem final de divisões em fases.
