import { describe, expect, it } from "vitest";
import { clubNeeds } from "../../../src/market/ai/needs";
import { DEFAULT_AI_MARKET } from "../../../src/market/ai/rules";
import { purchaseTarget } from "../../../src/market/ai/targets";
import { attraction, exigency } from "../../../src/market/player-response";
import type { MarketContext } from "../../../src/market/types";
import { MANAGER, marketContext } from "../helpers";

const base = marketContext();
const rich =
  [...base.world.clubs]
    .filter((club) => club.id !== MANAGER)
    .sort((a, b) => b.reputation - a.reputation)[0]?.id ?? "";

function withCash(context: MarketContext, clubId: string, cash: number): MarketContext {
  const club = context.finances.clubs[clubId];
  if (!club) throw new Error("sem clube");
  return {
    ...context,
    finances: {
      ...context.finances,
      clubs: { ...context.finances.clubs, [clubId]: { ...club, cash } },
    },
  };
}

describe("alvos de compra (011 R4)", () => {
  const ctx = withCash(base, rich, 500_000_000);
  const needs = clubNeeds(ctx, rich);
  const position =
    [...needs.priorities, ...needs.upgrades].find((entry) => purchaseTarget(ctx, needs, entry)) ??
    "MF";
  const plan = purchaseTarget(ctx, needs, position);

  it("joga na posição, melhora o titular e cabe no orçamento", () => {
    if (!plan) throw new Error("sem alvo");
    expect(plan.player.position).toBe(position);
    expect(plan.player.strength - needs.positions[position].starter).toBeGreaterThanOrEqual(
      DEFAULT_AI_MARKET.minGain,
    );
    expect(plan.fee + 12 * plan.wage).toBeLessThanOrEqual(needs.budget);
    expect(attraction(ctx, rich)).toBeGreaterThanOrEqual(exigency(plan.player) - 25);
  });

  it("nunca mira jogadores do humano, emprestados ou em negociação do humano", () => {
    if (!plan) throw new Error("sem alvo");
    expect(plan.player.clubId).not.toBe(MANAGER);
    const negotiating: MarketContext = {
      ...ctx,
      market: {
        ...ctx.market,
        negotiations: [
          {
            id: "neg-1",
            playerId: plan.player.id,
            kind: "buy",
            clubId: MANAGER,
            stage: "club_offer",
            openedRound: 0,
          },
        ],
      },
    };
    expect(purchaseTarget(negotiating, needs, position)?.player.id).not.toBe(plan.player.id);
    expect(purchaseTarget(ctx, needs, position, new Set([plan.player.id]))?.player.id).not.toBe(
      plan.player.id,
    );
  });

  it("sem orçamento não há alvo", () => {
    const poor = withCash(base, rich, 0);
    expect(purchaseTarget(poor, clubNeeds(poor, rich), position)).toBeUndefined();
  });

  it("clube rico mira jogadores melhores que clube pobre", () => {
    const sorted = [...base.world.clubs]
      .filter((c) => c.id !== MANAGER)
      .sort((a, b) => a.reputation - b.reputation);
    const small = sorted[0]?.id ?? "";
    const smallPlan = purchaseTarget(base, clubNeeds(base, small), position);
    const richPlan = purchaseTarget(ctx, needs, position);
    if (smallPlan && richPlan)
      expect(richPlan.player.strength).toBeGreaterThanOrEqual(smallPlan.player.strength);
  });

  it("é determinístico", () => {
    expect(purchaseTarget(ctx, needs, position)).toEqual(plan);
  });
});
