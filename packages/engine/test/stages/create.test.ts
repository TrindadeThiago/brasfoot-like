import { describe, expect, it } from "vitest";
import { createLeagueSeason } from "../../src/career/league";
import type { CompletedBank, StageFormat } from "../../src/model/types";
import { createSeason } from "../../src/season/season";
import { isStagedSeason, stageOfRound } from "../../src/stages/create";
import {
  CONTINENTAL_ID,
  continentalBank,
  groupsStage,
  knockoutAfterGroups,
  LOWER_LEVEL,
  regionalBank,
  STAGES_ID,
} from "../fixtures/stages-bank";
import { stagedSeason } from "./helpers";

// 019 (T022): criação da temporada de uma divisão em fases (research.md R2, R4).
const world = regionalBank();

function withStages(base: CompletedBank, stages: StageFormat[]): CompletedBank {
  const copy = JSON.parse(JSON.stringify(base)) as CompletedBank;
  const lower = copy.competitions
    .find((competition) => competition.id === STAGES_ID)
    ?.divisions.find((division) => division.level === LOWER_LEVEL);
  if (lower) lower.stages = stages;
  return copy;
}

describe("grupos → mata-mata", () => {
  const season = stagedSeason(world, "criacao-1");

  it("cria todas as rodadas de todas as fases desde o início", () => {
    expect(isStagedSeason(season)).toBe(true);
    expect(season.calendar).toHaveLength(8);
    expect(season.calendar.map((round) => round.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(season.stages?.map((stage) => [stage.kind, stage.rounds])).toEqual([
      ["groups", [1, 2, 3, 4, 5]],
      ["knockout", [6, 7, 8]],
    ]);
  });

  it("a fase 0 já começou, com os grupos sorteados e todos os clubes", () => {
    const stage = season.stages?.[0];
    expect(stage?.started).toBe(true);
    expect(stage?.clubIds).toHaveLength(20);
    expect(stage?.groups?.map((group) => group.id)).toEqual(["A", "B", "C", "D"]);
    expect(stage?.groups?.every((group) => group.clubIds.length === 5)).toBe(true);
    const inGroups = stage?.groups?.flatMap((group) => group.clubIds).sort();
    expect(inGroups).toEqual([...season.clubIds].sort());
  });

  it("os jogos dos grupos têm a marca da fase e do grupo, e os clubes de folga ficam em byes", () => {
    for (const round of season.calendar.slice(0, 5)) {
      expect(round.fixtures).toHaveLength(8);
      expect(round.byes).toHaveLength(4);
      for (const fixture of round.fixtures) {
        expect(fixture.stage?.kind).toBe("groups");
        expect(fixture.stage?.index).toBe(0);
        const group = season.stages?.[0]?.groups?.find(
          (entry) => entry.id === fixture.stage?.group,
        );
        expect(group?.clubIds).toContain(fixture.home);
        expect(group?.clubIds).toContain(fixture.away);
      }
    }
  });

  it("a fase eliminatória só tem rodadas vazias e chaveamento por sortear", () => {
    const stage = season.stages?.[1];
    expect(stage?.started).toBe(false);
    expect(stage?.clubIds).toEqual([]);
    expect(stage?.bracket?.phases.map((phase) => [phase.drawn, phase.rounds])).toEqual([
      [false, [6]],
      [false, [7]],
      [false, [8]],
    ]);
    expect(season.calendar.slice(5).every((round) => round.fixtures.length === 0)).toBe(true);
  });

  it("stageOfRound encontra a fase de uma rodada", () => {
    expect(stageOfRound(season, 3)?.kind).toBe("groups");
    expect(stageOfRound(season, 7)?.kind).toBe("knockout");
    expect(stageOfRound(season, 99)).toBeUndefined();
  });

  it("a divisão de cima da mesma competição segue como uma Season comum", () => {
    const top = createSeason(world, {
      competitionId: STAGES_ID,
      divisionLevel: 1,
      seed: "criacao-1",
    });
    expect(top.ok && top.season.stages).toBeUndefined();
    expect(top.ok && top.season.calendar.length).toBe(14);
  });

  it("é determinística pela seed", () => {
    expect(stagedSeason(world, "criacao-1")).toEqual(season);
    expect(stagedSeason(world, "criacao-2").stages?.[0]?.groups).not.toEqual(
      season.stages?.[0]?.groups,
    );
  });
});

describe("composição e liga → mata-mata", () => {
  it("respeita a composição informada (clubes que subiram e desceram)", () => {
    const lower = world.competitions
      .find((competition) => competition.id === STAGES_ID)
      ?.divisions.find((division) => division.level === LOWER_LEVEL)?.clubIds as string[];
    const top = world.competitions.find((c) => c.id === STAGES_ID)?.divisions[0]
      ?.clubIds as string[];
    const composition = [...lower.slice(2), top[0] as string, top[1] as string];
    const season = stagedSeason(world, "criacao-3", { clubIds: composition });
    expect(season.clubIds).toEqual(composition);
    const inGroups = season.stages?.[0]?.groups?.flatMap((group) => group.clubIds).sort();
    expect(inGroups).toEqual([...composition].sort());
  });

  it("pontos corridos → mata-mata: o calendário da liga já vem completo", () => {
    const own = withStages(world, [
      {
        type: "league",
        rounds: 1,
        points: { win: 3, draw: 1, loss: 0 },
        tiebreakers: ["goal-difference", "draw-lots"],
        qualified: 4,
      },
      knockoutAfterGroups(4),
    ]);
    const season = stagedSeason(own, "criacao-4");
    expect(season.calendar).toHaveLength(19 + 2);
    expect(season.stages?.[0]?.kind).toBe("league");
    expect(season.stages?.[0]?.rounds).toHaveLength(19);
    expect(season.calendar.slice(0, 19).every((round) => round.fixtures.length === 10)).toBe(true);
    expect(season.calendar[0]?.fixtures[0]?.stage).toEqual({ index: 0, kind: "league" });
    expect(season.stages?.[1]?.started).toBe(false);
  });

  it("uma competição com format.type groups é uma divisão de fase única", () => {
    const own = JSON.parse(JSON.stringify(world)) as CompletedBank;
    const competition = own.competitions.find((entry) => entry.id === STAGES_ID);
    if (!competition) throw new Error("sem competição");
    competition.format = groupsStage(5, 2);
    for (const division of competition.divisions) delete division.stages;
    const season = createSeason(own, {
      competitionId: STAGES_ID,
      divisionLevel: LOWER_LEVEL,
      seed: "criacao-5",
    });
    expect(season.ok && season.season.stages?.map((stage) => stage.kind)).toEqual(["groups"]);
  });
});

describe("createLeagueSeason (carreira)", () => {
  it("cria a Season em fases só para a divisão que as declara", () => {
    const result = createLeagueSeason(world, {
      competitionId: STAGES_ID,
      careerSeed: "carreira-1",
    });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    const [top, lower] = result.league.divisions;
    expect(top?.stages).toBeUndefined();
    expect(lower?.stages).toHaveLength(2);
  });
});

describe("competição continental (preliminar → grupos com potes → mata-mata)", () => {
  const continental = continentalBank();
  const season = stagedSeason(continental, "continental-1", {
    competitionId: CONTINENTAL_ID,
    divisionLevel: 1,
  });

  it("calcula as rodadas e começa pela preliminar de 16 clubes", () => {
    expect(season.stages?.map((stage) => stage.kind)).toEqual(["knockout", "groups", "knockout"]);
    expect(season.stages?.map((stage) => stage.rounds.length)).toEqual([2, 3, 3]);
    expect(season.calendar).toHaveLength(8);
    expect(season.stages?.[0]?.started).toBe(true);
    expect(season.stages?.[0]?.clubIds).toHaveLength(16);
    expect(season.stages?.[0]?.bracket?.phases[0]?.drawn).toBe(true);
    expect(season.stages?.[0]?.bracket?.phases[0]?.ties).toHaveLength(8);
    expect(season.calendar[0]?.fixtures).toHaveLength(8);
    expect(season.calendar[0]?.fixtures[0]?.stage).toEqual({ index: 0, kind: "knockout" });
    expect(season.stages?.[1]?.started).toBe(false);
  });

  it("os 12 clubes que entram direto nos grupos não jogam a preliminar", () => {
    const format = continental.competitions.find((c) => c.id === CONTINENTAL_ID)?.format;
    const groups = format?.type === "stages" ? format.stages[1] : undefined;
    const direct = new Set(groups?.enter ?? []);
    expect(direct.size).toBe(12);
    expect(season.stages?.[0]?.clubIds.some((id) => direct.has(id))).toBe(false);
  });
});
