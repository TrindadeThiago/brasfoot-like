import { describe, expect, it } from "vitest";
import { applyChange } from "../../src/match/changes";
import { advanceMatch, startMatch } from "../../src/match/engine";
import { MATCH_ERROR_CODES, type MatchError, type MatchErrorCode } from "../../src/match/errors";
import { FORMATIONS } from "../../src/match/formations";
import type { MatchChange, MatchState, Side } from "../../src/match/types";
import { clubIds, makeInput } from "./helpers/teams";

const [HOME, AWAY] = clubIds() as [string, string];

function start(seed = 3): MatchState {
  const result = startMatch(makeInput(HOME, AWAY, { seed }));
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.state;
}

/** Avança até o relógio marcar o minuto pedido (passos também contam minutos de acréscimo). */
function at(minute: number, seed = 3): MatchState {
  const half = minute > 45 ? 2 : 1;
  let state = start(seed);
  while (
    !(state.clock.half === half && state.clock.minute === minute && state.clock.stoppage === 0)
  ) {
    state = advanceMatch(state, { minutes: 1 });
  }
  return state;
}

function outfield(state: MatchState, side: Side): string {
  const team = state.teams[side];
  return Object.entries(team.onField).find(
    ([slot, id]) => slot !== "gk" && id !== null,
  )?.[1] as string;
}

function apply(state: MatchState, side: Side, change: MatchChange): MatchState {
  const result = applyChange(state, side, change);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.state;
}

interface ChangeCase {
  code: MatchErrorCode;
  build(): { state: MatchState; side: Side; change: MatchChange };
  params: Record<string, string | number>;
}

const CHANGE_CASES: ChangeCase[] = [
  {
    code: "change.not_started",
    build: () => ({
      state: start(),
      side: "home",
      change: { type: "posture", posture: "attacking" },
    }),
    params: {},
  },
  {
    code: "change.match_finished",
    build: () => ({
      state: advanceMatch(start(), { toEnd: true }),
      side: "home",
      change: { type: "posture", posture: "attacking" },
    }),
    params: {},
  },
  {
    code: "change.limit_reached",
    build: () => {
      const state: MatchState = JSON.parse(JSON.stringify(at(50)));
      state.teams.home.substitutionsUsed = state.input.substitutionLimit;
      return {
        state,
        side: "home",
        change: {
          type: "substitution",
          out: outfield(state, "home"),
          in: state.teams.home.bench[0] as string,
        },
      };
    },
    params: { limit: 5 },
  },
  {
    code: "change.player_not_on_field",
    build: () => {
      const state = at(50);
      return {
        state,
        side: "home",
        change: { type: "substitution", out: "ninguem", in: state.teams.home.bench[0] as string },
      };
    },
    params: { playerId: "ninguem" },
  },
  {
    code: "change.player_not_on_bench",
    build: () => {
      const state = at(50);
      return {
        state,
        side: "home",
        change: { type: "substitution", out: outfield(state, "home"), in: "ninguem" },
      };
    },
    params: { playerId: "ninguem" },
  },
  {
    code: "change.player_unavailable",
    build: () => {
      const state: MatchState = JSON.parse(JSON.stringify(at(50)));
      const reserve = state.teams.home.bench[0] as string;
      state.input.home.unavailable = [reserve];
      return {
        state,
        side: "home",
        change: { type: "substitution", out: outfield(state, "home"), in: reserve },
      };
    },
    params: { playerId: "" },
  },
  {
    code: "change.unknown_slot",
    build: () => {
      const state = at(50);
      return {
        state,
        side: "home",
        change: {
          type: "substitution",
          out: outfield(state, "home"),
          in: state.teams.home.bench[0] as string,
          slotId: "ponta-de-lanca",
        },
      };
    },
    params: { slotId: "ponta-de-lanca" },
  },
  {
    code: "change.invalid_assignment",
    build: () => {
      const state = at(50);
      const assignment: Record<string, string | null> = {};
      for (const slot of FORMATIONS["4-3-3"].slots) assignment[slot.id] = null;
      return { state, side: "home", change: { type: "formation", formation: "4-3-3", assignment } };
    },
    params: { formation: "4-3-3" },
  },
];

describe("erros de mudança (FR-024, SC-004)", () => {
  it("todo código change.* tem um caso", () => {
    const covered = new Set(CHANGE_CASES.map((changeCase) => changeCase.code));
    expect(
      MATCH_ERROR_CODES.filter((code) => code.startsWith("change.") && !covered.has(code)),
    ).toEqual([]);
  });

  it.each(CHANGE_CASES.map((changeCase) => [changeCase.code, changeCase] as const))(
    "%s",
    (code, changeCase) => {
      const { state, side, change } = changeCase.build();
      const before = JSON.stringify(state);
      const result = applyChange(state, side, change);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(code);
        if (code !== "change.player_unavailable") {
          expect(result.error).toEqual({
            code,
            side,
            params: changeCase.params,
          } satisfies MatchError);
        }
      }
      expect(JSON.stringify(state)).toBe(before);
    },
  );
});

describe("mudanças válidas (FR-023)", () => {
  it("substituição no minuto 60: evento, quem saiu não volta, quem entrou joga", () => {
    const state = at(60);
    const out = outfield(state, "home");
    const reserve = state.teams.home.bench[0] as string;
    const changed = apply(state, "home", { type: "substitution", out, in: reserve });
    expect(changed.events.at(-1)).toMatchObject({
      type: "substitution",
      side: "home",
      outId: out,
      inId: reserve,
      minute: 60,
      automatic: false,
    });
    expect(changed.teams.home.substitutionsUsed).toBe(1);
    const finished = advanceMatch(changed, { toEnd: true });
    const later = finished.events.slice(changed.events.length);
    expect(later.some((event) => "playerId" in event && event.playerId === out)).toBe(false);
    expect(finished.teams.home.players[reserve]?.minutesPlayed).toBeGreaterThan(0);
    expect(Object.values(finished.teams.home.onField)).not.toContain(out);
  });

  it("troca de esquema com distribuição válida", () => {
    const state = at(40);
    const players = FORMATIONS["4-4-2"].slots.map(
      (slot) => state.teams.home.onField[slot.id] ?? null,
    );
    const assignment: Record<string, string | null> = {};
    FORMATIONS["4-3-3"].slots.forEach((slot, index) => {
      assignment[slot.id] = players[index] ?? null;
    });
    const changed = apply(state, "home", { type: "formation", formation: "4-3-3", assignment });
    expect(changed.teams.home.formation).toBe("4-3-3");
    expect(changed.events.at(-1)).toMatchObject({ type: "formation_change", formation: "4-3-3" });
  });

  it("mesma formação com outra distribuição troca jogadores de posição, sem gastar substituição", () => {
    const state = at(40);
    const team = state.teams.home;
    const [first, second] = FORMATIONS[team.formation].slots
      .map((slot) => slot.id)
      .filter((slotId) => team.onField[slotId]);
    if (!first || !second) throw new Error("time sem jogadores");
    const playerA = team.onField[first] as string;
    const playerB = team.onField[second] as string;
    const assignment = { ...team.onField, [first]: playerB, [second]: playerA };
    const changed = apply(state, "home", {
      type: "formation",
      formation: team.formation,
      assignment,
    });
    expect(changed.teams.home.formation).toBe(team.formation);
    expect(changed.teams.home.onField[first]).toBe(playerB);
    expect(changed.teams.home.onField[second]).toBe(playerA);
    expect(changed.teams.home.substitutionsUsed).toBe(team.substitutionsUsed);
    expect(changed.events.at(-1)).toEqual(
      expect.objectContaining({
        type: "positions_change",
        side: "home",
        moves: [
          { playerId: playerA, fromSlotId: first, toSlotId: second },
          { playerId: playerB, fromSlotId: second, toSlotId: first },
        ],
      }),
    );
    expect(changed.events.some((event) => event.type === "formation_change")).toBe(false);
  });

  it("mesma formação e mesma distribuição não muda nada nem gera evento", () => {
    const state = at(40);
    const team = state.teams.home;
    const changed = apply(state, "home", {
      type: "formation",
      formation: team.formation,
      assignment: { ...team.onField },
    });
    expect(changed.events).toHaveLength(state.events.length);
    expect(changed.teams.home.onField).toEqual(team.onField);
  });

  it("troca de postura gera evento", () => {
    const changed = apply(at(20), "away", { type: "posture", posture: "defensive" });
    expect(changed.teams.away.posture).toBe("defensive");
    expect(changed.events.at(-1)).toMatchObject({ type: "posture_change", side: "away" });
  });

  it("mudanças no intervalo valem para o 2º tempo", () => {
    let state = start(8);
    while (state.status !== "half_time") state = advanceMatch(state, { minutes: 1 });
    const changed = apply(state, "home", { type: "posture", posture: "attacking" });
    const after = advanceMatch(changed, { minutes: 1 });
    expect(after.status).toBe("second_half");
    expect(after.teams.home.posture).toBe("attacking");
  });
});
