import { describe, expect, it } from "vitest";
import type { Lineup } from "../../src/match/types.js";
import type { CompletedBank } from "../../src/model/types.js";
import {
  SEASON_ERROR_CODES,
  type SeasonError,
  type SeasonErrorCode,
} from "../../src/season/errors.js";
import { advanceSeason, createSeason } from "../../src/season/season.js";
import { newSeason, serieAOptions, testWorld } from "./helpers/world.js";

function editedWorld(edit: (world: CompletedBank) => void): CompletedBank {
  const copy = JSON.parse(JSON.stringify(testWorld())) as CompletedBank;
  edit(copy);
  return copy;
}

/** Escalação válida de um clube na próxima rodada (titulares = 11 primeiros do elenco por posição). */
function someLineup(clubId: string): Lineup {
  const season = newSeason(1);
  const formation = season.formations[clubId] ?? "4-4-2";
  const squad = testWorld().players.filter((player) => player.clubId === clubId);
  const starters: Record<string, string> = {};
  const used = new Set<string>();
  const slots = ["gk", "lb", "lcb", "rcb", "rb", "lm", "lcm", "rcm", "rm", "ls", "rs"];
  for (const slot of slots) {
    const player = squad.find(
      (candidate) => !used.has(candidate.id) && (slot === "gk") === (candidate.position === "GK"),
    );
    if (player) {
      used.add(player.id);
      starters[slot] = player.id;
    }
  }
  return {
    formation: formation === "4-4-2" ? "4-4-2" : "4-4-2",
    posture: "balanced",
    starters,
    bench: [],
  };
}

interface ErrorCase {
  code: SeasonErrorCode;
  run(): SeasonError | undefined;
  params: Record<string, string | number>;
}

const competitionId = serieAOptions(1).competitionId;

const CASES: ErrorCase[] = [
  {
    code: "season.unknown_competition",
    run: () => {
      const result = createSeason(testWorld(), { ...serieAOptions(1), competitionId: "copa" });
      return result.ok ? undefined : result.error;
    },
    params: { competitionId: "copa" },
  },
  {
    code: "season.unknown_division",
    run: () => {
      const result = createSeason(testWorld(), { ...serieAOptions(1), divisionLevel: 9 });
      return result.ok ? undefined : result.error;
    },
    params: { competitionId, level: 9 },
  },
  {
    code: "season.unsupported_format",
    run: () => {
      const world = editedWorld((w) => {
        (w.competitions[0]?.format as { type: string }).type = "knockout";
      });
      const result = createSeason(world, serieAOptions(1));
      return result.ok ? undefined : result.error;
    },
    params: { format: "knockout" },
  },
  {
    code: "season.too_few_clubs",
    run: () => {
      const world = editedWorld((w) => {
        const division = w.competitions[0]?.divisions[0];
        if (division) division.clubIds = division.clubIds.slice(0, 1);
      });
      const result = createSeason(world, serieAOptions(1));
      return result.ok ? undefined : result.error;
    },
    params: { count: 1 },
  },
  {
    code: "season.invalid_rules",
    run: () => {
      const result = createSeason(testWorld(), {
        ...serieAOptions(1),
        rules: { yellowsForSuspension: 0 },
      });
      return result.ok ? undefined : result.error;
    },
    params: { rule: "yellowsForSuspension", value: 0, min: 1, max: 10 },
  },
  {
    code: "season.lineup_unavailable",
    run: () => {
      const season = newSeason(1);
      const fixture = season.calendar[0]?.fixtures[0];
      if (!fixture) return undefined;
      const lineup = someLineup(fixture.home);
      const suspended = lineup.starters.ls as string;
      const edited: typeof season = JSON.parse(JSON.stringify(season));
      edited.status[suspended] = { yellows: 0, suspension: 1, injury: 0 };
      const result = advanceSeason(edited, testWorld(), { rounds: 1 }, { [fixture.home]: lineup });
      return result.ok ? undefined : result.error;
    },
    params: {},
  },
  {
    code: "season.invalid_lineup",
    run: () => {
      const season = newSeason(1);
      const fixture = season.calendar[0]?.fixtures[0];
      if (!fixture) return undefined;
      const lineup = someLineup(fixture.home);
      lineup.starters.gk = "fantasma";
      const result = advanceSeason(season, testWorld(), { rounds: 1 }, { [fixture.home]: lineup });
      return result.ok ? undefined : result.error;
    },
    params: {},
  },
  {
    code: "season.lineup_not_playing",
    run: () => {
      const result = advanceSeason(
        newSeason(1),
        testWorld(),
        { rounds: 1 },
        { "clube-999": someLineup("clube-001") },
      );
      return result.ok ? undefined : result.error;
    },
    params: { clubId: "clube-999", round: 1 },
  },
];

describe("erros da temporada (FR-023, SC-006)", () => {
  it("todo código tem um caso", () => {
    const covered = new Set(CASES.map((errorCase) => errorCase.code));
    expect(SEASON_ERROR_CODES.filter((code) => !covered.has(code))).toEqual([]);
  });

  it.each(CASES.map((errorCase) => [errorCase.code, errorCase] as const))(
    "%s",
    (code, errorCase) => {
      const error = errorCase.run();
      expect(error?.code).toBe(code);
      if (Object.keys(errorCase.params).length > 0) expect(error?.params).toEqual(errorCase.params);
    },
  );
});
