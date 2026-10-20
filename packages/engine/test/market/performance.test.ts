import { describe, expect, it } from "vitest";
import { askingPrice } from "../../src/market/club-response";
import { marketAfterRound } from "../../src/market/incoming";
import { startNegotiation } from "../../src/market/negotiation";
import { searchPlayers } from "../../src/market/search";
import { marketContext, playerOf } from "./helpers";

// Limites de desempenho da 010 (plan.md, Performance Goals).
const SEARCH_LIMIT_MS = 30;
const RESPONSE_LIMIT_MS = 5;
const AFTER_ROUND_LIMIT_MS = 50;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function time(run: () => void): number {
  return median(
    Array.from({ length: 11 }, () => {
      const start = performance.now();
      run();
      return performance.now() - start;
    }),
  );
}

describe("desempenho do mercado", () => {
  const context = marketContext();
  const target = playerOf(context, (player) => player.position === "MF");

  it(`busca com filtros no mundo inteiro em menos de ${SEARCH_LIMIT_MS} ms`, () => {
    const elapsed = time(() => {
      searchPlayers(
        context,
        { positions: ["FW", "MF"], strength: [50, 90], age: [18, 34], maxValue: 50_000_000 },
        { key: "value", dir: "desc" },
      );
    });
    expect(elapsed).toBeLessThan(SEARCH_LIMIT_MS);
  });

  it(`resposta de uma negociação em menos de ${RESPONSE_LIMIT_MS} ms`, () => {
    const fee = askingPrice(context, target);
    const elapsed = time(() => {
      startNegotiation(context, { kind: "buy", playerId: target.id, fee });
    });
    expect(elapsed).toBeLessThan(RESPONSE_LIMIT_MS);
  });

  it(`o processamento depois da rodada em menos de ${AFTER_ROUND_LIMIT_MS} ms`, () => {
    expect(time(() => marketAfterRound(context))).toBeLessThan(AFTER_ROUND_LIMIT_MS);
  });
});
