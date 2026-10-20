import { advanceLeague } from "../../src/career/league-round";
import type { LeagueSeason } from "../../src/career/types";
import { createFinances } from "../../src/finance/create";
import { ensureContracts } from "../../src/market/contracts";
import { emptyMarket, type MarketContext, type MarketUpdate } from "../../src/market/types";
import type { CompletedBank, CompletedPlayer } from "../../src/model/types";
import { editedWorld, newLeague, testWorld } from "../career/helpers";

export { editedWorld, newLeague, testWorld };

export const SEED = "mercado";
export const MANAGER = "clube-001";
/** Ano da primeira temporada (ano da data de referência do banco de teste). */
export const YEAR = Number(testWorld().manifest.referenceDate.slice(0, 4));

/** Mundo de teste com contratos gerados para todos os jogadores. */
export function contractWorld(edit?: (world: CompletedBank) => void): CompletedBank {
  const base = editedWorld((world) => edit?.(world));
  return ensureContracts(base, YEAR, SEED);
}

/** Contexto de mercado numa liga nova (rodada 0, janela de início aberta). */
export function marketContext(
  options: { world?: CompletedBank; league?: LeagueSeason; managerClubId?: string } = {},
): MarketContext {
  const world = options.world ?? contractWorld();
  const league = options.league ?? newLeague(SEED, {}, world);
  return {
    world,
    league,
    finances: createFinances(world, league),
    market: emptyMarket(),
    managerClubId: options.managerClubId ?? MANAGER,
    careerSeed: SEED,
  };
}

/** Soma do caixa de todos os clubes (invariante das transferências). */
export function totalCash(context: Pick<MarketContext, "finances">): number {
  return Object.values(context.finances.clubs).reduce((sum, club) => sum + club.cash, 0);
}

/** Contexto após `rounds` rodadas jogadas (a janela de início fecha depois da quarta). */
export function contextAfter(rounds: number, options: Parameters<typeof marketContext>[0] = {}) {
  const base = marketContext(options);
  if (rounds === 0) return base;
  const result = advanceLeague(base.league, base.world, { rounds });
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return { ...base, league: result.league };
}

/** Jogador de outro clube que satisfaz o critério (o mais forte primeiro). */
export function playerOf(
  context: MarketContext,
  predicate: (player: CompletedPlayer) => boolean = () => true,
  ranking: "strongest" | "weakest" = "weakest",
): CompletedPlayer {
  const sorted = context.world.players
    .filter((player) => player.clubId !== context.managerClubId && predicate(player))
    .sort((a, b) => (ranking === "weakest" ? a.strength - b.strength : b.strength - a.strength));
  const found = sorted[0];
  if (!found) throw new Error("sem jogador");
  return found;
}

/** Aplica o resultado de uma ação ao contexto. */
export function applied(context: MarketContext, update: MarketUpdate): MarketContext {
  return { ...context, world: update.world, finances: update.finances, market: update.market };
}
