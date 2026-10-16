import { describe, expect, it } from "vitest";
import { minuteRng } from "../../src/match/rng.js";

const take = (rng: { next(): number }, n = 5) => Array.from({ length: n }, () => rng.next());

describe("minuteRng (research R4)", () => {
  it("é determinístico para os mesmos argumentos", () => {
    expect(take(minuteRng("s", { half: 1, minute: 10, stoppage: 0 }, "home:chance"))).toEqual(
      take(minuteRng("s", { half: 1, minute: 10, stoppage: 0 }, "home:chance")),
    );
  });

  it("muda com minuto, tempo, acréscimo e rótulo", () => {
    const base = take(minuteRng("s", { half: 1, minute: 10, stoppage: 0 }, "home:chance"));
    expect(take(minuteRng("s", { half: 1, minute: 11, stoppage: 0 }, "home:chance"))).not.toEqual(
      base,
    );
    expect(take(minuteRng("s", { half: 2, minute: 10, stoppage: 0 }, "home:chance"))).not.toEqual(
      base,
    );
    expect(take(minuteRng("s", { half: 1, minute: 10, stoppage: 1 }, "home:chance"))).not.toEqual(
      base,
    );
    expect(take(minuteRng("s", { half: 1, minute: 10, stoppage: 0 }, "away:chance"))).not.toEqual(
      base,
    );
    expect(take(minuteRng("t", { half: 1, minute: 10, stoppage: 0 }, "home:chance"))).not.toEqual(
      base,
    );
  });

  it("não depende da ordem em que os minutos são sorteados", () => {
    const late = take(minuteRng("s", { half: 2, minute: 50, stoppage: 0 }, "x"));
    take(minuteRng("s", { half: 1, minute: 10, stoppage: 0 }, "x"));
    expect(take(minuteRng("s", { half: 2, minute: 50, stoppage: 0 }, "x"))).toEqual(late);
  });
});
