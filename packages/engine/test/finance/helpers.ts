import { divisionSeason } from "../../src/career/league";
import type { LeagueSeason } from "../../src/career/types";
import { createFinances } from "../../src/finance/create";
import type { FinanceState } from "../../src/finance/types";
import type { CompletedBank } from "../../src/model/types";
import type { Fixture } from "../../src/season/types";
import { editedWorld, newLeague, testWorld } from "../career/helpers";

export { editedWorld, newLeague, testWorld };

/** Liga nova e suas finanças iniciais. */
export function career(seed: string, world: CompletedBank = testWorld()) {
  const league = newLeague(seed, {}, world);
  return { league, finances: createFinances(world, league) };
}

/** Primeiro jogo da rodada `round` na divisão `level`. */
export function fixtureOf(league: LeagueSeason, level: number, round: number, index = 0): Fixture {
  const fixture = divisionSeason(league, level)?.calendar[round - 1]?.fixtures[index];
  if (!fixture) throw new Error("sem jogo");
  return fixture;
}

/** Cópia das finanças com o estádio de um clube grande o bastante para não lotar. */
export function withCapacity(
  finances: FinanceState,
  clubId: string,
  capacity: number,
): FinanceState {
  const copy = JSON.parse(JSON.stringify(finances)) as FinanceState;
  const club = copy.clubs[clubId];
  if (club) club.capacity = capacity;
  return copy;
}

/** Mundo de teste com a reputação de um clube trocada. */
export function withReputation(clubId: string, reputation: number): CompletedBank {
  return editedWorld((world) => {
    const club = world.clubs.find((entry) => entry.id === clubId);
    if (club) club.reputation = reputation;
  });
}
