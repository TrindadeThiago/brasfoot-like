import { seasonDate } from "../calendar/date";
import type { TurnoverContext, TurnoverStep } from "../career/types";
import { ensureContracts } from "../market/contracts";
import { addFreeAgents, toFreeAgent } from "../market/free-agents";
import { evolvePlayers, midSeasonRound } from "./evolution";
import { measureWorld } from "./measure";
import { regulate } from "./regulator";
import { playerRef, retirePlayers } from "./retirement";
import { balanceSquads } from "./squads";
import type { PlayerDelta, PlayerRef, SquadChangeNotice } from "./types";
import { generateYouth } from "./youth";

/**
 * Etapas de renovação da virada (research.md R11). Sem `renewal` no contexto (usos só da liga ou
 * das finanças), não fazem nada.
 */

/** Evolução do fim da temporada: minutagem das rodadas depois da do meio até a última. */
export const evolvePlayersStep: TurnoverStep = {
  id: "evolve-players",
  run: (context) => {
    if (!context.renewal) return context;
    const finished = context.finished;
    const last = Math.max(...finished.divisions.map((season) => season.calendar.length));
    const { world, record } = evolvePlayers(
      context.world,
      finished,
      context.careerSeed,
      "end",
      midSeasonRound(finished) + 1,
      last,
    );
    return { ...context, world, renewal: { ...context.renewal, lastEvolution: record } };
  },
};

/** Data da temporada que começa (idades de aposentadoria e de jovens). */
export function nextSeasonDate(context: TurnoverContext): string {
  return seasonDate(context.world.manifest.referenceDate, context.finished.year + 1);
}

/** Aviso de mudanças do clube do jogador da virada em andamento (criado vazio na primeira etapa). */
function notice(context: TurnoverContext): SquadChangeNotice | undefined {
  if (!context.renewal || !context.managerClubId) return undefined;
  const current = context.renewal.squadNotice;
  if (current && current.season === context.finished.number + 1) return current;
  return {
    season: context.finished.number + 1,
    clubId: context.managerClubId,
    retired: [],
    arrived: [],
    released: [],
    promoted: [],
    risers: [],
    fallers: [],
  };
}

/** Acrescenta ao aviso do clube do jogador os jogadores dele de uma lista. */
export function withNotice(
  context: TurnoverContext,
  field: "retired" | "arrived" | "released" | "promoted",
  refs: readonly PlayerRef[],
  clubOf: (ref: PlayerRef) => string,
): TurnoverContext {
  const current = notice(context);
  if (!current || !context.renewal) return context;
  const own = refs.filter((ref) => clubOf(ref) === current.clubId);
  return {
    ...context,
    renewal: {
      ...context.renewal,
      squadNotice: { ...current, [field]: [...current[field], ...own] },
    },
  };
}

export const retirePlayersStep: TurnoverStep = {
  id: "retire-players",
  run: (context) => {
    if (!context.renewal) return context;
    const clubs = new Map(context.world.players.map((player) => [player.id, player.clubId]));
    const { world, retired } = retirePlayers(
      context.world,
      context.finished,
      context.careerSeed,
      context.finished.number,
      nextSeasonDate(context),
    );
    return withNotice(
      { ...context, world },
      "retired",
      retired,
      (ref) => clubs.get(ref.playerId) ?? "",
    );
  },
};

export const generateYouthStep: TurnoverStep = {
  id: "generate-youth",
  run: (context) => {
    if (!context.renewal) return context;
    const { world, renewal, arrived } = generateYouth(
      context.world,
      context.finished,
      context.renewal,
      context.careerSeed,
      context.finished.number,
      nextSeasonDate(context),
    );
    const clubs = new Map(world.players.map((player) => [player.id, player.clubId]));
    return withNotice(
      { ...context, world: contracted(context, world), renewal },
      "arrived",
      arrived,
      (ref) => clubs.get(ref.playerId) ?? "",
    );
  },
};

/** Com mercado, jovens e repostos nascem com contrato para a temporada que começa (R3). */
function contracted(context: TurnoverContext, world: TurnoverContext["world"]) {
  return context.market
    ? ensureContracts(world, context.finished.year + 1, context.careerSeed)
    : world;
}

/** Quantas maiores altas e quedas o aviso mostra. */
const NOTICE_MOVERS = 5;

export const balanceSquadsStep: TurnoverStep = {
  id: "balance-squads",
  run: (context) => {
    if (!context.renewal) return context;
    const date = nextSeasonDate(context);
    const before = new Map(context.world.players.map((player) => [player.id, player.clubId]));
    const { world, renewal, promoted, released, releasedPlayers } = balanceSquads(
      context.world,
      context.finished,
      context.renewal,
      context.careerSeed,
      context.finished.number,
      date,
    );
    const after = new Map(world.players.map((player) => [player.id, player.clubId]));
    let next = withNotice(
      {
        ...context,
        world: contracted(context, world),
        renewal,
        ...(context.market
          ? {
              market: addFreeAgents(
                context.market,
                releasedPlayers.map((player) =>
                  toFreeAgent(player, before.get(player.id) ?? "", context.finished.year),
                ),
              ),
            }
          : {}),
      },
      "promoted",
      promoted,
      (ref) => after.get(ref.playerId) ?? "",
    );
    next = withNotice(next, "released", released, (ref) => before.get(ref.playerId) ?? "");
    const current = next.renewal?.squadNotice;
    const deltas = next.renewal?.lastEvolution?.deltas ?? {};
    if (!current || !next.renewal) return next;
    const movers: PlayerDelta[] = world.players
      .filter((player) => player.clubId === current.clubId && (deltas[player.id] ?? 0) !== 0)
      .map((player) => ({ ...playerRef(player, date), delta: deltas[player.id] ?? 0 }));
    const order = (a: PlayerDelta, b: PlayerDelta) =>
      b.delta - a.delta || (a.playerId < b.playerId ? -1 : 1);
    const risers = movers
      .filter((mover) => mover.delta > 0)
      .sort(order)
      .slice(0, NOTICE_MOVERS);
    const fallers = movers
      .filter((mover) => mover.delta < 0)
      .sort((a, b) => order(b, a))
      .slice(0, NOTICE_MOVERS);
    return { ...next, renewal: { ...next.renewal, squadNotice: { ...current, risers, fallers } } };
  },
};

/** Mede o mundo depois das aposentadorias e ajusta a geração de jovens desta virada (R8). */
export const regulateWorldStep: TurnoverStep = {
  id: "regulate-world",
  run: (context) => {
    if (!context.renewal) return context;
    const measure = measureWorld(context.world, context.finished, nextSeasonDate(context));
    return {
      ...context,
      renewal: { ...context.renewal, regulator: regulate(context.renewal.regulator, measure) },
    };
  },
};
