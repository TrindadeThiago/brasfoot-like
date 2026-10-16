import { describe, expect, it } from "vitest";
import { applyChange } from "../../src/match/changes.js";
import { advanceMatch, startMatch } from "../../src/match/engine.js";
import type { MatchState, Side } from "../../src/match/types.js";
import { clubIds, makeInput, squadOf } from "./helpers/teams.js";

const [HOME, AWAY] = clubIds() as [string, string];

function start(seed: number): MatchState {
  const result = startMatch(makeInput(HOME, AWAY, { seed }));
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.state;
}

/** Primeira partida (por seed) com uma lesão: devolve o estado logo após o minuto da lesão. */
function stateRightAfterInjury(): { state: MatchState; side: Side; playerId: string } {
  for (let seed = 1; seed <= 400; seed++) {
    let state = start(seed);
    while (state.status !== "finished" && state.status !== "abandoned") {
      const before = state.events.length;
      state = advanceMatch(state, { minutes: 1 });
      const injury = state.events.slice(before).find((event) => event.type === "injury");
      if (injury && "playerId" in injury && state.status !== "finished") {
        return { state, side: injury.side as Side, playerId: injury.playerId };
      }
    }
  }
  throw new Error("nenhuma lesão encontrada");
}

function clone(state: MatchState): MatchState {
  return JSON.parse(JSON.stringify(state));
}

describe("pendências e política automática (FR-025)", () => {
  it("lesão cria pendência; sem decisão, o próximo passo faz a troca automática", () => {
    const { state, side, playerId } = stateRightAfterInjury();
    expect(state.teams[side].pending).toEqual([
      expect.objectContaining({ reason: "injury", playerId }),
    ]);
    const next = advanceMatch(state, { minutes: 1 });
    const substitution = next.events
      .slice(state.events.length)
      .find((event) => event.type === "substitution");
    expect(substitution).toMatchObject({ side, outId: playerId, automatic: true });
    expect(next.teams[side].pending).toEqual([]);
  });

  it("decisão manual antes do passo impede a troca automática", () => {
    const { state, side, playerId } = stateRightAfterInjury();
    const reserve = state.teams[side].bench.at(-1) as string;
    const manual = applyChange(state, side, { type: "substitution", out: playerId, in: reserve });
    if (!manual.ok) throw new Error(manual.error.code);
    const next = advanceMatch(manual.state, { minutes: 1 });
    const automatic = next.events.filter(
      (event) => event.type === "substitution" && event.automatic,
    );
    expect(automatic).toEqual([]);
    expect(Object.values(next.teams[side].onField)).toContain(reserve);
  });

  it("sem substituições disponíveis, o time segue com um a menos", () => {
    const found = stateRightAfterInjury();
    const state = clone(found.state);
    state.teams[found.side].substitutionsUsed = state.input.substitutionLimit;
    const next = advanceMatch(state, { minutes: 1 });
    expect(
      next.events.slice(state.events.length).some((event) => event.type === "substitution"),
    ).toBe(false);
    expect(
      Object.values(next.teams[found.side].onField).filter((id) => id === null).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("goleiro expulso com goleiro no banco ⇒ troca automática goleiro por goleiro", () => {
    const state = clone(advanceMatch(start(4), { minutes: 30 }));
    const team = state.teams.home;
    const keeper = team.onField.gk as string;
    team.onField.gk = null;
    (team.players[keeper] as { sentOff: boolean }).sentOff = true;
    team.pending = [{ reason: "goalkeeper_sent_off", slotId: "gk", playerId: keeper }];
    const reserveKeeper = team.bench.find(
      (id) => squadOf(HOME).find((player) => player.id === id)?.position === "GK",
    );
    expect(reserveKeeper).toBeDefined();
    const next = advanceMatch(state, { minutes: 1 });
    expect(next.teams.home.onField.gk).toBe(reserveKeeper);
    const substitution = next.events
      .slice(state.events.length)
      .find((event) => event.type === "substitution");
    expect(substitution).toMatchObject({ inId: reserveKeeper, slotId: "gk", automatic: true });
  });

  it("goleiro expulso sem goleiro no banco ⇒ jogador de linha vai ao gol", () => {
    const state = clone(advanceMatch(start(4), { minutes: 30 }));
    const team = state.teams.home;
    const keeper = team.onField.gk as string;
    team.onField.gk = null;
    team.pending = [{ reason: "goalkeeper_sent_off", slotId: "gk", playerId: keeper }];
    team.bench = team.bench.filter(
      (id) => squadOf(HOME).find((player) => player.id === id)?.position !== "GK",
    );
    team.substitutionsUsed = state.input.substitutionLimit;
    const next = advanceMatch(state, { minutes: 1 });
    const reorganization = next.events
      .slice(state.events.length)
      .find((event) => event.type === "reorganization");
    expect(reorganization).toMatchObject({ side: "home", toSlotId: "gk" });
    expect(next.teams.home.onField.gk).not.toBeNull();
  });
});
