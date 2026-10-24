# Contrato: save v15, formato de mod e telas

## Save v15 (`packages/save`)

- `SAVE_FORMAT_VERSION = 15`. Migração v14 → v15: `otherLeagues: []`, `worldHistory: []` e versão.
  `MatchRecord.summary/starters` e `SeasonHistoryEntry.topScorers` são opcionais.
- `calendarProblem` (integridade): cada liga em `league` e `otherLeagues` é a principal do seu país;
  nenhum clube em duas ligas principais; slots do calendário apontam para competições existentes
  em qualquer das três listas.
- Fixtures `saveV14(step)` (início, meio e fim de temporada, com copa e fases) para o teste de
  migração e de jogabilidade; um save de banco com vários países no meio da temporada.
- `equivalence.test.ts`: o banco de um país mantém os resultados anteriores (SC-006).
- Compactação: `playerLines` e `starters` (data-model); `worldHistory` limitado (R7).

## Formato de mod (`docs/mod-format.md`)

- §4 `countries.json`: `rules.foreignLimit`; `names` exigido para país com competições; o país
  inicial e a ordem dos países.
- §5: definição de **competição principal do país** (a primeira do `countryId`); como as regras
  econômicas, de mercado, diretoria, torcida e manchetes de um país vêm da principal dele; clubes de
  uma competição só do próprio país; exemplo de dois países com escalas diferentes
  (`wageFactorPct`, `fanFactorPct`, `fansBase`).
- Seção nova "Vários países": como montar o banco, transferências internacionais (taxa em valor de
  mercado, salário na escala de destino), limite de estrangeiros, reputação do clube e propostas, o
  banco de nomes por país.
- Tabela de erros com os códigos novos; mod de exemplo `mods/exemplo` continua válido sem
  mudanças; novo `mods/exemplo-mundo` com 3 países de estruturas diferentes (uma divisão, duas
  divisões, duas divisões e copa) gerado por `pnpm gen:world-mod`.

## Telas (`apps/web`)

| Tela | Contrato |
|---|---|
| Nova carreira (`/nova-carreira`) | Filtros **País** e **Divisão** (selects) na escolha de clube, aplicados em conjunto; lista paginada/virtualizada para 400 clubes; contagem de resultados; com um país só, o filtro de país não aparece; busca por nome |
| Competição (`/jogo/competicao`) | Seletor de país (quando há mais de um) para consultar a tabela, os resultados e a artilharia de ligas alheias; jogos de ligas alheias mostram placar, gols e cartões, sem detalhe de jogo |
| Mercado (`/jogo/mercado`) | Filtro de país na busca de jogadores; país e bandeira/código na ficha; aviso do limite de estrangeiros ("elenco com N de L estrangeiros") e da janela fechada no outro país |
| Carreira/propostas (`/jogo/carreira`) | Propostas com país e divisão do clube; confirmação de troca de país explica o que muda (calendário, regras econômicas, metas) |
| Histórico (`/jogo/historico`) | Seletor de país; campeões, tabela final e artilheiros por temporada |
| Fim da temporada | Resumo do país do jogador como hoje; link para o resumo dos demais países |
| Início | Quando mais de um país: manchetes de campeões de outros países ao fim da temporada |

- i18n (`ui.json`): `country.*` (rótulos de filtro, "todos os países", código, estrangeiros),
  `market.foreignLimit`, `offers.country`, `history.country`, `competition.country`,
  `newCareer.filter.*`; erros em `errors.json`/`market-errors.json`. Nomes de países e competições
  vêm do banco.
- Testes de fluxo: `apps/web/test/flows/world.test.tsx` (filtro por país e divisão, escolha de
  clube de outro país, troca de país por proposta, consulta de liga alheia); e2e
  `apps/web/e2e/world.spec.ts` (mod de exemplo com 3 países: nova carreira em país não inicial,
  jogar uma rodada, ver outra liga, aceitar proposta de outro país).
- **Testes existentes que mudam**: nenhum deve mudar; o banco padrão tem um país, então filtros de
  país não aparecem.
