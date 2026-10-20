import { describe, expect, it } from "vitest";
import {
  askingPrice,
  loanAskingPrice,
  maxBidFor,
  respondToOffer,
} from "../../src/market/club-response";
import { marketValue } from "../../src/market/value";
import { marketContext, playerOf } from "./helpers";

const context = marketContext();
const year = context.league.year;
const bench = playerOf(context, (player) => player.position === "MF");
const star = playerOf(context, (player) => player.position === "MF", "strongest");

describe("resposta do clube (R6, FR-011)", () => {
  it("pedida = valor × importância × ruído, estável e múltipla de 1.000", () => {
    const ask = askingPrice(context, star);
    expect(ask).toBe(askingPrice(context, star));
    expect(ask % 1000).toBe(0);
    const value = marketValue(star, context.world, year);
    expect(ask).toBeGreaterThanOrEqual(Math.round(value * 1.25 * 0.95) - 1000);
    expect(ask).toBeLessThanOrEqual(Math.round(value * 1.25 * 1.1) + 1000);
  });

  it("oferta igual ou acima da pedida é aceita", () => {
    const ask = askingPrice(context, bench);
    expect(respondToOffer(context, bench, ask, "buy")).toEqual({ kind: "accepted" });
    expect(respondToOffer(context, bench, ask * 2, "buy")).toEqual({ kind: "accepted" });
  });

  it("de 70% da pedida até ela há contraproposta na pedida", () => {
    const ask = askingPrice(context, bench);
    expect(respondToOffer(context, bench, Math.ceil(ask * 0.7), "buy")).toEqual({
      kind: "countered",
      fee: ask,
    });
  });

  it("abaixo de 70% recusa, com motivo", () => {
    const ask = askingPrice(context, star);
    const low = respondToOffer(context, star, Math.floor(ask * 0.5), "buy");
    expect(low).toMatchObject({ kind: "refused", reason: "key_player" });
    const askBench = askingPrice(context, bench);
    const lowBench = respondToOffer(context, bench, Math.floor(askBench * 0.5), "buy");
    expect(lowBench.kind).toBe("refused");
  });

  it("recusa a venda que deixaria o elenco abaixo do mínimo", () => {
    const keepers = context.world.players.filter(
      (player) => player.clubId === bench.clubId && player.position === "GK",
    );
    const keeper = keepers[0];
    if (!keeper) throw new Error("sem goleiro");
    const trimmed = {
      ...context,
      world: {
        ...context.world,
        players: context.world.players.filter(
          (player) =>
            !(player.clubId === keeper.clubId && player.position === "GK") ||
            keepers.indexOf(player) < 3,
        ),
      },
    };
    expect(respondToOffer(trimmed, keeper, 999_000_000, "buy")).toEqual({
      kind: "refused",
      reason: "squad_minimum",
    });
  });

  it("empréstimo: 10% da pedida, e sem taxa fora dos 16 mais fortes", () => {
    const loanStar = loanAskingPrice(context, star);
    expect(loanStar).toBeLessThanOrEqual(askingPrice(context, star) * 0.1 + 1000);
    expect(loanAskingPrice(context, bench)).toBe(0);
    expect(respondToOffer(context, bench, 0, "loan")).toEqual({ kind: "accepted" });
  });

  it("maxBid fica entre 100% e 120% do valor e é determinístico", () => {
    const value = marketValue(star, context.world, year);
    const bid = maxBidFor(context, star, "x");
    expect(bid).toBeGreaterThanOrEqual(value - 1000);
    expect(bid).toBeLessThanOrEqual(Math.round(value * 1.2) + 1000);
    expect(maxBidFor(context, star, "x")).toBe(bid);
  });
});
