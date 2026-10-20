import { describe, expect, it } from "vitest";
import type { TurnoverContext } from "../../../src/career/types";
import { aiRenewalDecision } from "../../../src/market/ai/renewals";
import type { CompletedPlayer } from "../../../src/model/types";
import { createRng } from "../../../src/rng/xoshiro";
import { contractWorld, MANAGER, newLeague, SEED, YEAR } from "../helpers";

const world = contractWorld();
const league = newLeague(SEED, {}, world);
const CLUB = world.clubs.find((club) => club.id !== MANAGER)?.id ?? "";
const date = `${YEAR + 1}-01-15`;
const context = {
  world,
  careerSeed: SEED,
  finished: league,
  finalStandings: {},
  history: [],
  next: { number: 1, year: YEAR, seed: league.seed, composition: {}, carryOver: {} },
  rng: (id: string) => createRng(id),
} as unknown as TurnoverContext;

const squad = world.players
  .filter((player) => player.clubId === CLUB)
  .sort((a, b) => b.strength - a.strength);

function aged(player: CompletedPlayer, age: number, wage?: number): CompletedPlayer {
  return {
    ...player,
    birthDate: `${YEAR + 1 - age}-01-01`,
    ...(wage !== undefined && player.contract ? { contract: { ...player.contract, wage } } : {}),
  };
}

describe("renovar ou liberar por necessidade (011 R8)", () => {
  it("renova titulares até a idade-limite", () => {
    const star = aged(squad[0] as CompletedPlayer, 27);
    const current = squad.map((player) => (player.id === star.id ? star : player));
    expect(aiRenewalDecision(context, current, [star], date).has(star.id)).toBe(true);
  });

  it("renova promessas jovens mesmo fora dos titulares", () => {
    const weakest = squad[squad.length - 1] as CompletedPlayer;
    const prospect = { ...aged(weakest, 19), hidden: { ...weakest.hidden, potential: 85 } };
    const current = squad.map((player) => (player.id === prospect.id ? prospect : player));
    expect(aiRenewalDecision(context, current, [prospect], date).has(prospect.id)).toBe(true);
  });

  it("libera veterano reserva que ganha acima da mediana", () => {
    const reserve = squad.find(
      (player, index) => index >= 14 && player.position === "MF",
    ) as CompletedPlayer;
    const veteran = aged(reserve, 32, 10_000_000);
    const current = squad.map((player) => (player.id === veteran.id ? veteran : player));
    expect(aiRenewalDecision(context, current, [veteran], date).has(veteran.id)).toBe(false);
  });

  it("renova quem é necessário para o mínimo da posição", () => {
    const keepers = squad.filter((player) => player.position === "GK");
    const expiring = keepers.map((keeper) => aged(keeper, 35, 10_000_000));
    const current = squad.map(
      (player) => expiring.find((entry) => entry.id === player.id) ?? player,
    );
    const keep = aiRenewalDecision(context, current, expiring, date);
    expect(keep.size).toBeGreaterThanOrEqual(Math.min(3, keepers.length));
  });
});
