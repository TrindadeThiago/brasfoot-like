# Contrato: API de escalação do motor (`packages/engine/src/lineup`)

Funções puras, exportadas por `@brasfoot-like/engine`. Tipos em [../data-model.md](../data-model.md).

```ts
interface Unavailability { playerId: string; reason: "injury" | "suspension"; remaining: number }

/** Indisponíveis do clube agora, com motivo e partidas restantes, por partidas restantes e id. */
function clubUnavailability(season: Season, world: CompletedBank, clubId: string): Unavailability[];
/** Mesma regra para um elenco qualquer, na ordem do elenco (usada também pela temporada). */
function unavailabilityOf(squad: readonly CompletedPlayer[], status: Record<string, PlayerStatus>): Unavailability[];

/** Mesma escalação que a temporada daria ao clube no esquema (FR-007); só a postura muda. */
function managerAutoLineup(
  squad: readonly CompletedPlayer[],
  formation: FormationId,
  posture: Posture,
  unavailable: readonly Unavailability[],
): { lineup: Lineup; fielded: string[] };   // fielded = indisponíveis usados por elenco curto

function validateLineup(
  lineup: Lineup,
  squad: readonly CompletedPlayer[],
  unavailable: readonly Unavailability[],
): LineupValidation;

/** Ajuste mínimo antes da próxima partida (R4). Sem indisponíveis na escalação ⇒ changes = []. */
function adjustLineup(
  lineup: Lineup,
  squad: readonly CompletedPlayer[],
  unavailable: readonly Unavailability[],
): { lineup: Lineup; changes: LineupChange[] };

/** Mesmos titulares nas vagas do novo esquema, por atribuição ótima (R5). */
function changeFormation(
  lineup: Lineup,
  formation: FormationId,
  squad: readonly CompletedPlayer[],
): Lineup;

type Place = { kind: "slot"; slotId: string } | { kind: "bench"; index: number } | { kind: "out"; playerId: string };

/**
 * Move o jogador de `from` para `to`; se `to` estiver ocupado, os dois trocam. Um índice de banco
 * ≥ tamanho acrescenta ao fim; banco cheio (12) ao acrescentar quem não é reserva ⇒ `bench_full`;
 * origem vazia ⇒ `empty_source`.
 */
function placePlayer(lineup: Lineup, from: Place, to: Place): { ok: true; lineup: Lineup } | { ok: false; code: "bench_full" | "empty_source" };
```

Também passam a ser exportados: `lineupForMatch`, `SEASON_BENCH_LIMIT` e `slotPosition`.

## Garantias testadas

- `managerAutoLineup(squad, f, "balanced", u)` ≡ `lineupForMatch(squad, f, u)` para os 6 esquemas,
  com 0, 3 e "elenco curto" indisponíveis (SC-002).
- `validateLineup` de `managerAutoLineup` sem elenco curto ⇒ `valid` e sem `no_goalkeeper` quando
  há goleiro disponível.
- `adjustLineup` não altera titulares disponíveis; resultado é sempre `valid` (fora do elenco
  curto); aplicar duas vezes = aplicar uma (idempotente).
- `changeFormation` preserva o conjunto de titulares, banco e postura; ida e volta entre esquemas
  com os mesmos jogadores devolve a mesma força efetiva total.
- `placePlayer` nunca produz jogador repetido; trocar A↔B duas vezes volta ao original.
- Temporada inteira simulada com a escalação do jogador mantida só por `adjustLineup`: nenhuma
  rodada recusada (SC-005).
