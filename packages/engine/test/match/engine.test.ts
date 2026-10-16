import { describe, expect, it } from "vitest";
import { advanceMatch, simulateMatch, startMatch } from "../../src/match/engine";
import { matchResult } from "../../src/match/result";
import type { MatchState } from "../../src/match/types";
import { clubIds, makeInput } from "./helpers/teams";

const [HOME, AWAY] = clubIds() as [string, string];

function started(seed = 5): MatchState {
  const result = startMatch(makeInput(HOME, AWAY, { seed }));
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.state;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

describe("fluxo da partida", () => {
  it("começa não iniciada", () => {
    expect(started().status).toBe("not_started");
  });

  it("45 minutos levam ao fim do tempo regulamentar do 1º tempo; os acréscimos vêm em seguida", () => {
    let state = advanceMatch(started(), { minutes: 45 });
    expect(state.clock).toMatchObject({ half: 1, minute: 45 });
    const stoppage = state.stoppage.first ?? -1;
    expect(stoppage).toBeGreaterThanOrEqual(0);
    let extraSteps = 0;
    while (state.status !== "half_time") {
      state = advanceMatch(state, { minutes: 1 });
      extraSteps += 1;
    }
    expect(extraSteps).toBe(stoppage);
    expect(state.events.at(-1)?.type).toBe("half_time");
  });

  it("avançar uma partida encerrada devolve o mesmo estado", () => {
    const finished = advanceMatch(started(), { toEnd: true });
    expect(finished.status).toBe("finished");
    expect(advanceMatch(finished, { minutes: 10 })).toEqual(finished);
  });

  it("nunca altera a entrada", () => {
    const input = deepFreeze(makeInput(HOME, AWAY, { seed: 9 }));
    expect(() => simulateMatch(input)).not.toThrow();
  });

  it("time com menos de 7 jogadores encerra a partida com 3 a 0 para o adversário", () => {
    const state: MatchState = JSON.parse(JSON.stringify(advanceMatch(started(), { minutes: 10 })));
    state.score = { home: 0, away: 0 };
    const slots = Object.keys(state.teams.home.onField).filter((slot) => slot !== "gk");
    for (const slot of slots.slice(0, 5)) state.teams.home.onField[slot] = null;
    const after = advanceMatch(state, { minutes: 1 });
    expect(after.status).toBe("abandoned");
    expect(after.events.at(-1)).toMatchObject({ type: "abandoned", side: "home" });
    const result = matchResult(after);
    expect(result.status).toBe("abandoned");
    expect(result.score.home).toBe(0);
    expect(result.score.away).toBeGreaterThanOrEqual(3);
  });
});
