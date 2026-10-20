import { describe, expect, it } from "vitest";
import { DEFAULT_AI_MARKET } from "../../../src/market/ai/rules";
import { aiAskingPrice, sellerAccepts } from "../../../src/market/ai/seller";
import { askingPrice } from "../../../src/market/club-response";
import { strengthRank } from "../../../src/market/squad";
import type { MarketContext } from "../../../src/market/types";
import { MANAGER, marketContext } from "../helpers";

const ctx = marketContext();
const clubs = [...ctx.world.clubs]
  .filter((club) => club.id !== MANAGER)
  .sort((a, b) => a.reputation - b.reputation);
const small = clubs[0];
const big = clubs[clubs.length - 1];
if (!small || !big) throw new Error("sem clubes");
const smallStar = ctx.world.players
  .filter((player) => player.clubId === small.id)
  .sort((a, b) => b.strength - a.strength)[0];
const bench = ctx.world.players
  .filter((player) => player.clubId === big.id)
  .sort((a, b) => a.strength - b.strength)
  .find((player) => player.position === "MF");
if (!smallStar || !bench) throw new Error("sem jogadores");

describe("disposição em vender (011 R5)", () => {
  it("titular do pequeno sobe para o grande", () => {
    expect(strengthRank(ctx.world, small.id, smallStar.id)).toBe(1);
    expect(sellerAccepts(ctx, smallStar, big.id)).toBe(true);
  });

  it("titular não desce para clube de reputação menor ou igual", () => {
    const bigStar = ctx.world.players
      .filter((player) => player.clubId === big.id)
      .sort((a, b) => b.strength - a.strength)[0];
    if (!bigStar) throw new Error("sem jogador");
    expect(sellerAccepts(ctx, bigStar, small.id)).toBe(false);
  });

  it("reserva sai para qualquer clube", () => {
    expect(strengthRank(ctx.world, big.id, bench.id)).toBeGreaterThan(11);
    expect(sellerAccepts(ctx, bench, small.id)).toBe(true);
  });

  it("excedente sai com desconto", () => {
    const keeper = ctx.world.players.find((p) => p.clubId === big.id && p.position === "GK");
    if (!keeper) throw new Error("sem goleiro");
    const extras = Array.from({ length: 3 }, (_, index) => ({
      ...keeper,
      id: `gk-x-${index}`,
      strength: 15 + index,
    }));
    const over: MarketContext = {
      ...ctx,
      world: { ...ctx.world, players: [...ctx.world.players, ...extras] },
    };
    const surplus = over.world.players.find((p) => p.id === "gk-x-0");
    if (!surplus) throw new Error("sem excedente");
    const discounted = aiAskingPrice(over, surplus);
    expect(discounted).toBeLessThanOrEqual(
      Math.round((askingPrice(over, surplus) * DEFAULT_AI_MARKET.surplusDiscountPct) / 100) + 1000,
    );
  });

  it("nunca vende jogador do humano nem quebra mínimos", () => {
    const own = ctx.world.players.find((player) => player.clubId === MANAGER);
    if (!own) throw new Error("sem jogador");
    expect(sellerAccepts(ctx, own, big.id)).toBe(false);
    const keepers = ctx.world.players.filter((p) => p.clubId === small.id && p.position === "GK");
    const trimmed: MarketContext = {
      ...ctx,
      world: {
        ...ctx.world,
        players: ctx.world.players.filter(
          (p) => !(p.clubId === small.id && p.position === "GK") || keepers.indexOf(p) < 3,
        ),
      },
    };
    const keeper = trimmed.world.players.find((p) => p.clubId === small.id && p.position === "GK");
    if (!keeper) throw new Error("sem goleiro");
    expect(sellerAccepts(trimmed, keeper, big.id)).toBe(false);
  });
});
