import { describe, expect, it } from "vitest";
import { freeAgentFor } from "../../../src/market/ai/free-agents";
import { clubNeeds } from "../../../src/market/ai/needs";
import { aiMarketRound } from "../../../src/market/ai/round";
import { addFreeAgents, toFreeAgent } from "../../../src/market/free-agents";
import type { MarketContext } from "../../../src/market/types";
import { contextAfter, MANAGER, YEAR } from "../helpers";

const closed = contextAfter(6);
const CLUB = closed.world.clubs.find((club) => club.id !== MANAGER)?.id ?? "";

/** Clube sem um goleiro (descoberto) e um goleiro bom livre no mercado. */
function scenario(): { context: MarketContext; agentId: string } {
  const keepers = closed.world.players.filter((p) => p.clubId === CLUB && p.position === "GK");
  const removed = keepers[keepers.length - 1];
  const other = closed.world.players.find(
    (p) => p.clubId !== CLUB && p.clubId !== MANAGER && p.position === "GK",
  );
  if (!removed || !other) throw new Error("sem goleiros");
  const free = { ...other, id: "livre-gk", strength: 70 };
  const players = closed.world.players.filter((p) => p.id !== removed.id);
  const extra =
    keepers.length - 1 >= 3
      ? players.filter(
          (p) => !(p.clubId === CLUB && p.position === "GK" && p.id === keepers[0]?.id),
        )
      : players;
  return {
    context: {
      ...closed,
      world: { ...closed.world, players: extra },
      market: addFreeAgents(closed.market, [toFreeAgent(free, other.clubId, YEAR - 1)]),
    },
    agentId: "livre-gk",
  };
}

describe("livres contratados pela IA (011 R7)", () => {
  const { context, agentId } = scenario();

  it("clube com posição descoberta ou fraca contrata o livre que resolve", () => {
    const needs = clubNeeds(context, CLUB);
    expect(needs.priorities).toContain("GK");
    const plan = freeAgentFor(context, needs);
    expect(plan?.agent.player.id).toBe(agentId);
  });

  it("acontece fora da janela e o livre sai do mercado", () => {
    const update = aiMarketRound(context);
    expect(update.market.freeAgents.some((entry) => entry.player.id === agentId)).toBe(false);
    const signed = update.world.players.find((player) => player.id === agentId);
    expect(signed?.clubId).not.toBe(MANAGER);
    expect(signed?.contract?.wage).toBeGreaterThan(0);
  });

  it("clube sem carência não contrata", () => {
    const needs = clubNeeds(context, CLUB);
    expect(freeAgentFor(context, { ...needs, priorities: [] })).toBeUndefined();
  });

  it("o clube do humano nunca contrata pela IA", () => {
    expect(
      freeAgentFor(context, {
        ...clubNeeds(context, MANAGER),
        clubId: MANAGER,
        priorities: ["GK"],
      }),
    ).toBeUndefined();
  });
});
