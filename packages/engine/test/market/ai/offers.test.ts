import { describe, expect, it } from "vitest";
import { clubNeeds } from "../../../src/market/ai/needs";
import { incomingOfferFor } from "../../../src/market/ai/offers";
import { strengthRank } from "../../../src/market/squad";
import { marketValue } from "../../../src/market/value";
import { createRng } from "../../../src/rng/xoshiro";
import { MANAGER, marketContext } from "../helpers";

const ctx = marketContext();

describe("propostas pelos jogadores do humano (011 R9, FR-012)", () => {
  const offers = Array.from({ length: 12 }, (_, index) =>
    incomingOfferFor(ctx, createRng(`ofertas-${index}`)),
  ).filter((offer) => offer !== undefined);

  it("há propostas e vêm de clubes com carência na posição", () => {
    expect(offers.length).toBeGreaterThan(0);
    for (const offer of offers) {
      const player = ctx.world.players.find((entry) => entry.id === offer.playerId);
      if (!player) throw new Error("sem jogador");
      expect(player.clubId).toBe(MANAGER);
      const needs = clubNeeds(ctx, offer.fromClubId);
      expect(needs.priorities).toContain(player.position);
      expect(offer.fee).toBeLessThanOrEqual(needs.budget);
    }
  });

  it("valores na faixa do valor de mercado; empréstimo só por reservas", () => {
    for (const offer of offers) {
      const player = ctx.world.players.find((entry) => entry.id === offer.playerId);
      if (!player) throw new Error("sem jogador");
      const value = marketValue(player, ctx.world, ctx.league.year);
      if (offer.kind === "buy") {
        expect(offer.fee).toBeGreaterThanOrEqual(Math.round(value * 0.85) - 1000);
        expect(offer.fee).toBeLessThanOrEqual(Math.round(value * 1.1) + 1000);
      } else {
        expect(strengthRank(ctx.world, MANAGER, player.id)).toBeGreaterThan(11);
      }
    }
  });

  it("não repete jogadores bloqueados e é determinística", () => {
    const first = incomingOfferFor(ctx, createRng("x"));
    expect(incomingOfferFor(ctx, createRng("x"))).toEqual(first);
    if (first) {
      expect(incomingOfferFor(ctx, createRng("x"), new Set([first.playerId]))?.playerId).not.toBe(
        first.playerId,
      );
    }
  });
});
