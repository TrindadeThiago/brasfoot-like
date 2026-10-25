import { describe, expect, it } from "vitest";
import { createLeagueSeason } from "../../src/career/league";
import { advanceLeague } from "../../src/career/league-round";
import { seasonTurnover } from "../../src/career/turnover";
import type { LeagueSeason } from "../../src/career/types";
import type { Lineup } from "../../src/match/types";
import type { CompletedBank } from "../../src/model/types";
import { resolveQualification } from "../../src/qualification/resolve";
import {
  SEASON_ERROR_CODES,
  type SeasonError,
  type SeasonErrorCode,
} from "../../src/season/errors";
import { advanceSeason, createSeason } from "../../src/season/season";
import { allSeasons } from "../career/qualification-helpers";
import { playedOnce, superCupWorld } from "../qualification/helpers";
import { newSeason, serieAOptions, testWorld } from "./helpers/world";

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

function league(): LeagueSeason {
  const result = createLeagueSeason(testWorld(), { competitionId, careerSeed: "erros" });
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.league;
}

let finished: LeagueSeason | undefined;
/** Liga de teste jogada até o fim (calculada uma vez). */
function finishedLeague(): LeagueSeason {
  if (!finished) {
    const result = advanceLeague(league(), testWorld(), { toEnd: true });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    finished = result.league;
  }
  return finished;
}

/** Vagas editadas da supercopa de teste, resolvidas sobre uma temporada jogada (021). */
function qualify(
  edit: (
    berth: NonNullable<
      CompletedBank["competitions"][number]["divisions"][number]["berths"]
    >[number],
  ) => void,
) {
  const { world } = superCupWorld();
  const played = playedOnce(world, "erros-021");
  const competitions = JSON.parse(
    JSON.stringify(played.end.world.competitions),
  ) as CompletedBank["competitions"];
  const berth = competitions.find((entry) => entry.id === "supercopa-teste")?.divisions[0]
    ?.berths?.[0];
  if (!berth) throw new Error("sem vaga");
  edit(berth);
  const result = resolveQualification({
    world: { ...played.end.world, competitions },
    finished: allSeasons(played.end),
    compositions: played.compositions,
    number: 1,
    year: 1,
  });
  return result.ok ? undefined : result.error;
}

const CASES: ErrorCase[] = [
  {
    code: "qualification.exhausted",
    run: () =>
      qualify((berth) => {
        berth.fallback = [];
        berth.require = [{ competitionId: "nunca", level: 1 }];
      }),
    params: { competitionId: "supercopa-teste", berthId: "campeao-liga" },
  },
  {
    code: "qualification.source_missing",
    run: () =>
      qualify((berth) => {
        berth.source = { kind: "champion", competitionId: "nao-existe" };
      }),
    params: { competitionId: "nao-existe" },
  },
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
  {
    code: "season.invalid_composition",
    run: () => {
      const result = createSeason(testWorld(), {
        ...serieAOptions(1),
        clubIds: ["clube-001", "clube-001"],
      });
      return result.ok ? undefined : result.error;
    },
    params: { level: 1, reason: "clube repetido" },
  },
  {
    code: "turnover.season_not_over",
    run: () => {
      const result = seasonTurnover(league(), testWorld(), [], { careerSeed: "erros" });
      return result.ok ? undefined : result.error;
    },
    params: { round: 1 },
  },
  {
    code: "turnover.invalid_steps",
    run: () => {
      const result = seasonTurnover(finishedLeague(), testWorld(), [], {
        careerSeed: "erros",
        extraSteps: [{ step: { id: "financas", run: (context) => context }, after: "mercado" }],
      });
      return result.ok ? undefined : result.error;
    },
    params: { stepId: "financas", reason: "âncora inexistente: mercado" },
  },
  {
    code: "turnover.invalid_result",
    run: () => {
      const result = seasonTurnover(finishedLeague(), testWorld(), [], {
        careerSeed: "erros",
        extraSteps: [
          {
            step: { id: "sem-calendario", run: ({ league: _league, ...context }) => context },
            after: "generate-calendars",
          },
        ],
      });
      return result.ok ? undefined : result.error;
    },
    params: { reason: "a etapa generate-calendars não criou a temporada" },
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
    120_000,
  );
});
