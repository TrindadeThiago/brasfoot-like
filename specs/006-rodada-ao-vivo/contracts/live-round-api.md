# Contrato: rodada ao vivo no motor (`packages/engine/src/season/live-round.ts`)

Funções puras, exportadas por `@brasfoot-like/engine`. Nenhuma altera a entrada.

```ts
interface LiveMatch {
  fixture: Fixture;
  state: MatchState;
  sides: Record<Side, string>;
  prepared: Record<Side, SideLineup>;   // ausências e avisos, como na temporada
}
interface RoundDecision { tick: number; clubId: string; change: MatchChange }
interface LiveRound { round: number; tick: number; matches: LiveMatch[]; decisions: RoundDecision[] }

/** Prepara as partidas da próxima rodada (mesmas regras de escalação/ausências da temporada). */
function startRound(
  season: Season,
  world: CompletedBank,
  lineups?: Record<string, Lineup>,
): { ok: true; round: LiveRound } | { ok: false; error: SeasonError };

/** Avança cada partida não terminada `ticks` passos do relógio do motor. */
function advanceRound(round: LiveRound, ticks: number): LiveRound;

/** Aplica uma decisão na partida do clube (substituição, esquema, postura) no tick atual. */
function applyRoundChange(
  round: LiveRound,
  clubId: string,
  change: MatchChange,
): { ok: true; round: LiveRound } | { ok: false; error: MatchError };

function isRoundFinished(round: LiveRound): boolean;
function finishRound(round: LiveRound): LiveRound;

/** Registros, disciplina, lesões e avisos da rodada terminada aplicados à temporada. */
function completeRound(season: Season, world: CompletedBank, round: LiveRound): AdvanceSeasonResult;

/** Partida do clube na rodada e o lado dele. */
function matchOf(round: LiveRound, clubId: string): { match: LiveMatch; side: Side } | undefined;

/** Mudança de esquema no meio do jogo: jogadores em campo nas vagas novas (atribuição ótima). */
function formationChange(round: LiveRound, clubId: string, formation: FormationId, world: CompletedBank): MatchChange;

/** Passos já dados por uma partida (do relógio e dos acréscimos); `round.tick` é o maior deles. */
function matchTicks(state: MatchState): number;
```

`completeRound` lança erro (uso indevido) se a rodada não terminou ou não é a próxima da
temporada; `applyRoundChange` para um clube fora da rodada devolve erro.
A preparação das partidas ficou em `season/fixture.ts` (`prepareFixture`, `squadsByClub`),
compartilhada pela temporada e pela rodada ao vivo.

`advanceSeason(season, world, step, lineups)` passa a ser, para cada rodada,
`completeRound(season, world, finishRound(startRound(season, world, lineups)))`.

## Garantias testadas

- `completeRound(finishRound(startRound(...)))` ≡ comportamento anterior de `advanceSeason` (a
  temporada inteira continua idêntica para as seeds de teste — regressão dos testes de
  determinismo e credibilidade).
- Avançar em passos de 1, 7 ou até o fim dá o mesmo resultado.
- Decisões em ticks diferentes: reaplicar o mesmo log em outra sequência de passos dá registros
  idênticos (SC-002).
- Substituição além do limite → `change.limit_reached`; reserva já usado/jogador substituído →
  `change.player_not_on_bench` (SC-003).
- `completeRound` de rodada não terminada → erro; `applyRoundChange` em partida terminada →
  `change.match_finished`.
- Um tick das 10 partidas < 5 ms (mediana).
