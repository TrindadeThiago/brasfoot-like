import { describe, expect, it } from "vitest";
import { startMatch } from "../../src/match/engine.js";
import { MATCH_ERROR_CODES, type MatchError, type MatchErrorCode } from "../../src/match/errors.js";
import type { MatchInput } from "../../src/match/types.js";
import { clubIds, makeInput, squadOf, teamInput } from "./helpers/teams.js";

const [HOME, AWAY] = clubIds() as [string, string];

interface InputCase {
  code: MatchErrorCode;
  build(): MatchInput;
  expected: MatchError;
}

function base(): MatchInput {
  return makeInput(HOME, AWAY);
}

const INPUT_CASES: InputCase[] = [
  {
    code: "input.same_club",
    build: () => ({ ...base(), away: teamInput(HOME) }),
    expected: { code: "input.same_club", params: { clubId: HOME } },
  },
  {
    code: "input.invalid_option",
    build: () => ({ ...base(), substitutionLimit: 12 }),
    expected: {
      code: "input.invalid_option",
      params: { option: "substitutionLimit", value: 12, min: 0, max: 11 },
    },
  },
  {
    code: "lineup.unknown_formation",
    build: () => {
      const input = base();
      (input.home.lineup as { formation: string }).formation = "4-6-0";
      return input;
    },
    expected: { code: "lineup.unknown_formation", side: "home", params: { formation: "4-6-0" } },
  },
  {
    code: "lineup.slots_mismatch",
    build: () => {
      const input = base();
      delete input.home.lineup.starters.gk;
      return input;
    },
    expected: {
      code: "lineup.slots_mismatch",
      side: "home",
      params: { expected: 11, received: 10 },
    },
  },
  {
    code: "lineup.duplicate_player",
    build: () => {
      const input = base();
      const starter = input.away.lineup.starters.gk as string;
      input.away.lineup.bench.push(starter);
      return input;
    },
    expected: {
      code: "lineup.duplicate_player",
      side: "away",
      params: { playerId: base().away.lineup.starters.gk as string },
    },
  },
  {
    code: "lineup.player_not_in_squad",
    build: () => {
      const input = base();
      input.home.lineup.starters.gk = "fantasma";
      return input;
    },
    expected: {
      code: "lineup.player_not_in_squad",
      side: "home",
      params: { playerId: "fantasma" },
    },
  },
  {
    code: "lineup.player_in_both_teams",
    build: () => {
      const input = base();
      const borrowed = squadOf(HOME).find((player) => player.id === input.home.lineup.starters.gk);
      if (!borrowed) throw new Error("goleiro não encontrado");
      input.away.squad = [...input.away.squad, borrowed];
      input.away.lineup.bench = [...input.away.lineup.bench.slice(0, 6), borrowed.id];
      return input;
    },
    expected: {
      code: "lineup.player_in_both_teams",
      side: "away",
      params: { playerId: base().home.lineup.starters.gk as string },
    },
  },
  {
    code: "lineup.bench_too_large",
    build: () => ({ ...base(), benchLimit: 3 }),
    expected: { code: "lineup.bench_too_large", side: "home", params: { count: 7, max: 3 } },
  },
  {
    code: "lineup.player_unavailable",
    build: () => {
      const input = base();
      input.away.unavailable = [input.away.lineup.starters.ls as string];
      return input;
    },
    expected: {
      code: "lineup.player_unavailable",
      side: "away",
      params: { playerId: base().away.lineup.starters.ls as string },
    },
  },
];

describe("validação da entrada da partida (FR-005, SC-004)", () => {
  it("todo código input.* e lineup.* tem um caso", () => {
    const covered = new Set(INPUT_CASES.map((inputCase) => inputCase.code));
    const missing = MATCH_ERROR_CODES.filter(
      (code) => (code.startsWith("input.") || code.startsWith("lineup.")) && !covered.has(code),
    );
    expect(missing).toEqual([]);
  });

  it.each(INPUT_CASES.map((inputCase) => [inputCase.code, inputCase] as const))(
    "%s",
    (_, inputCase) => {
      const result = startMatch(inputCase.build());
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors).toContainEqual(inputCase.expected);
    },
  );

  it("entrada válida é aceita", () => {
    expect(startMatch(base()).ok).toBe(true);
  });
});
