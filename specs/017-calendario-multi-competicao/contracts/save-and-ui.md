# Contrato: save v12, formato de mod e telas

## Save v12 (`packages/save`)

- `SAVE_FORMAT_VERSION = 12`. Campos novos: `calendar`, `competitions`, `fitness` e
  `competitionHistory` ([data-model.md](../data-model.md#save-v12)).
- `migrate.ts`: o passo `v11 → v12` (R12) entra na cadeia atual, que já é usada ao abrir do
  IndexedDB e ao importar um arquivo.
- Orquestração (`career.ts`):
  - `withRoundResult` (caminho antigo, mantido) e `withDayResult(save, state)`;
  - `seasonStateOf(save)`, `isCareerSeasonOver(save)` e `currentDayOf(save)`;
  - `nextFixture(save)` → próximo compromisso do clube em foco;
  - `userSeasonFor(save, competitionId)` → a `Season` do clube na competição;
  - `withAdjustedLineup` usa a competição do próximo jogo (suspensões) e a principal (lesões).
- Autosave ao fim de cada dia em que o clube do jogador joga (FR-014). Os dias intermediários
  simulados vão no mesmo commit.
- Fixtures: `saveV11(step)` em `test/fixtures.ts`, no padrão de `saveV10` (save atual jogado até o
  ponto e sem os campos novos): início, meio e fim da temporada, e várias temporadas.
  `migrate-v12.test.ts` abre cada uma e confere a rodada, o histórico, o caixa e o humor, e que a
  temporada pode ser jogada até a virada.

## Formato de mod (`docs/mod-format.md`)

- Seção 5 (`competitions.json`): os campos opcionais `schedule`, `discipline` e `fitness`, com
  tabelas, padrões e exemplo de liga no domingo e copa na quarta. O texto "Hoje o jogo usa a
  primeira" passa a explicar a competição principal e as secundárias.
- Regra "cada clube em uma só divisão" passa a valer só dentro da mesma competição. Clube de
  competição secundária precisa estar na principal.
- Tabela de erros: `calendar.club_double_booked`, `calendar.competition_overflow` e
  `competition.club_outside_main`.
- O mod de exemplo (`mods/exemplo/`) ganha `schedule` explícito na liga, para servir de
  documentação viva.

## Telas (`apps/web`)

| Tela | Contrato |
|---|---|
| Início (`/jogo`) | Cartão "Próximo jogo": dia da semana + data, competição, adversário (escudo, selo de clássico), mando. Os botões de jogar ao vivo e simular direto avançam sozinhos até a data do jogo; sem jogo restante, um botão "Avançar até o fim da temporada" |
| Rodada (`/jogo/rodada`) | Título com competição e data; mostra só os jogos da competição do jogador naquele dia |
| Calendário (`/jogo/calendario`) | Lista por data dos jogos do clube: data, competição, adversário, mando, placar; próximo destacado; filtro por competição só com mais de uma |
| Competição (`/jogo/competicao/*`) | Abas de competição (parâmetro `comp`; `c` é a carreira) só com mais de uma no banco; padrão = a do próximo jogo; abas de divisão (`d`) continuam |
| Escalação (`/jogo/escalacao`) | Condição física (`FitnessMeter`, %) de cada titular no campo e na lista, aviso para titular abaixo de 75%; "escalar automático" usa a condição; indisponíveis pela competição do próximo jogo |
| Elenco (`/jogo/elenco`) | Coluna "Condição" e suspensões com o nome da competição em que são cumpridas |
| Mercado (`/jogo/mercado`) | "Janela aberta até {data}" / "Janela fechada — abre em {data}" |
| Fim de temporada / Histórico | Seção de outras competições a partir de `competitionHistory` (campeão e tabela), só quando houver |

- Datas: `formatDate` e `formatWeekday` (`Intl.DateTimeFormat`, UTC, sem fuso) na camada de
  apresentação.
- i18n (`ui.json`): `home.matchWhen` / `home.competition` / `home.noMoreMatches` /
  `home.advanceToEnd`, `calendar.filter` / `calendar.all`, `col.date` / `col.competition` /
  `col.fitness`, `fitness.*`, `competition.select`, `squad.suspendedIn`, `round.dated`,
  `news.inCompetition`, `history.otherCompetitions` / `history.otherChampion` e as janelas com data
  (`market.window.open` / `market.window.closed`). Os nomes de competição vêm de
  `bank.competitions[].name`.
- Testes de fluxo (`apps/web/test/flows/calendar.test.tsx`) e e2e (`apps/web/e2e/calendar.spec.ts`)
  com o mod de teste de duas competições: avançar alterna competições, calendário filtra, abas
  aparecem, condição aparece na escalação. Com o banco padrão, as abas não aparecem.
