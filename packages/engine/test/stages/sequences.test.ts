import { describe, expect, it } from "vitest";
import { tieState } from "../../src/knockout/tie";
import type { CompletedBank, KnockoutStage, StageFormat } from "../../src/model/types";
import { isSeasonOver } from "../../src/season/season";
import { overallStandings, stageOrigin, stageQualifiers } from "../../src/stages/classification";
import { cupView } from "../../src/stages/cup-view";
import { finalOrder } from "../../src/stages/ranking";
import { stageParticipantCounts } from "../../src/stages/rules";
import {
  CONTINENTAL_ID,
  continentalBank,
  extrasBank,
  groupsStage,
  knockoutAfterGroups,
  LOWER_LEVEL,
  regionalBank,
  STAGES_ID,
} from "../fixtures/stages-bank";
import { playRounds, playToEnd, stagedSeason } from "./helpers";

// 019 (T057): sequências de fases do spec (US4), de ponta a ponta no motor.
function withLowerStages(base: CompletedBank, stages: StageFormat[]): CompletedBank {
  const copy = JSON.parse(JSON.stringify(base)) as CompletedBank;
  const lower = copy.competitions
    .find((competition) => competition.id === STAGES_ID)
    ?.divisions.find((division) => division.level === LOWER_LEVEL);
  if (lower) lower.stages = stages;
  return copy;
}

function knockoutOf(stage: StageFormat | undefined): KnockoutStage {
  if (stage?.type !== "knockout") throw new Error("não é mata-mata");
  return stage;
}

describe("grupos → grupos → mata-mata", () => {
  const world = withLowerStages(regionalBank(), [
    groupsStage(5, 2),
    groupsStage(4, 2),
    knockoutAfterGroups(4),
  ]);

  it("a segunda fase de grupos sai dos classificados da primeira, e tudo termina com um campeão", () => {
    const start = stagedSeason(world, "seq-1");
    expect(start.calendar).toHaveLength(5 + 3 + 2);
    const afterFirst = playRounds(world, start, 5);
    const second = afterFirst.stages?.[1];
    expect(second?.started).toBe(true);
    expect(second?.clubIds).toEqual(
      stageQualifiers(afterFirst, world, 0)
        .map((q) => q.clubId)
        .sort(),
    );
    expect(second?.groups).toHaveLength(2);
    expect(second?.groups?.every((group) => group.clubIds.length === 4)).toBe(true);

    const end = playToEnd(world, start);
    expect(isSeasonOver(end)).toBe(true);
    expect(end.stages?.map((stage) => stage.clubIds.length)).toEqual([20, 8, 4]);
    const order = finalOrder(end, world);
    expect(order).toHaveLength(20);
    const view = cupView(end, world, 2);
    const final = view.bracket?.phases[1]?.ties[0];
    expect(final && tieState(view, 1, final.id).winner).toBe(order[0]);
  });
});

describe("cada fase eliminatória com o seu formato", () => {
  const knockout = knockoutOf(knockoutAfterGroups(8));
  const finalPhase = knockout.phases[2];
  if (!finalPhase) throw new Error("sem final");
  const mixed: KnockoutStage = {
    ...knockout,
    phases: [
      ...knockout.phases.slice(0, 2),
      {
        ...finalPhase,
        legs: 2,
        neutral: false,
        tiebreakers: ["away-goals", "penalties"],
      },
    ],
  };
  const world = withLowerStages(regionalBank(), [groupsStage(5, 2), mixed]);

  it("jogo único até a semifinal e a final em ida e volta", () => {
    const start = stagedSeason(world, "seq-2");
    expect(start.calendar).toHaveLength(5 + 4);
    expect(start.stages?.[1]?.bracket?.phases.map((phase) => phase.rounds.length)).toEqual([
      1, 1, 2,
    ]);
    const end = playToEnd(world, start);
    const view = cupView(end, world, 1);
    const final = view.bracket?.phases[2]?.ties[0];
    const state = final && tieState(view, 2, final.id);
    expect(state?.legs).toBe(2);
    expect(state?.played).toBe(2);
    expect(state?.decided).toBe(true);
    const fixtures = end.calendar.slice(7).flatMap((round) => round.fixtures);
    expect(fixtures.map((fixture) => fixture.tie?.leg)).toEqual([1, 2]);
    expect(fixtures[0]?.home).toBe(fixtures[1]?.away);
  });
});

describe("mando pela classificação geral", () => {
  it("o melhor colocado da fase de grupos joga em casa nas quartas e nas semifinais", () => {
    const world = regionalBank();
    const end = playToEnd(world, stagedSeason(world, "seq-3"));
    const rank = new Map(overallStandings(end, world, 0).map((row) => [row.clubId, row.position]));
    const view = cupView(end, world, 1);
    for (const phase of view.bracket?.phases.slice(0, 2) ?? []) {
      for (const tie of phase.ties) {
        expect(rank.get(tie.home) ?? 99).toBeLessThan(rank.get(tie.away) ?? 0);
      }
    }
  });
});

describe("vagas extras no chaveamento", () => {
  it("as vagas extras enfrentam os vencedores de grupo", () => {
    const world = extrasBank();
    const after = playRounds(world, stagedSeason(world, "seq-4"), 3);
    const qualifiers = stageQualifiers(after, world, 0);
    const byClub = new Map(qualifiers.map((q) => [q.clubId, q]));
    const ties = after.stages?.[1]?.bracket?.phases[0]?.ties ?? [];
    expect(ties).toHaveLength(8);
    for (const tie of ties) {
      const [a, b] = [byClub.get(tie.home), byClub.get(tie.away)];
      for (const [mine, other] of [
        [a, b],
        [b, a],
      ] as const) {
        if (mine?.extra) expect(other?.groupPosition).toBe(1);
      }
    }
  });
});

describe("tabela própria de confrontos (pairs)", () => {
  it("regional: A1×B2, B1×A2, C1×D2, D1×C2", () => {
    const stage = knockoutOf(knockoutAfterGroups(8));
    const world = withLowerStages(regionalBank(), [
      groupsStage(5, 2),
      {
        ...stage,
        pairs: [
          ["A1", "B2"],
          ["B1", "A2"],
          ["C1", "D2"],
          ["D1", "C2"],
        ],
      },
    ]);
    const after = playRounds(world, stagedSeason(world, "seq-5"), 5);
    const origin = (id: string) => {
      const found = stageOrigin(after, world, 0, id);
      return found && "group" in found ? `${found.group}${found.position}` : "?";
    };
    const ties = (after.stages?.[1]?.bracket?.phases[0]?.ties ?? []).map(
      (tie) => new Set([origin(tie.home), origin(tie.away)]),
    );
    expect(ties).toEqual([
      new Set(["A1", "B2"]),
      new Set(["B1", "A2"]),
      new Set(["C1", "D2"]),
      new Set(["D1", "C2"]),
    ]);
  });

  it("pontos corridos: T1×T4 e T2×T3, e vagas extras X1…X4", () => {
    const league = withLowerStages(regionalBank(), [
      {
        type: "league",
        rounds: 1,
        points: { win: 3, draw: 1, loss: 0 },
        tiebreakers: ["goal-difference", "draw-lots"],
        qualified: 4,
      },
      {
        ...knockoutOf(knockoutAfterGroups(4)),
        pairs: [
          ["T1", "T3"],
          ["T2", "T4"],
        ],
      },
    ]);
    const afterLeague = playRounds(league, stagedSeason(league, "seq-6"), 19);
    const table = stageQualifiers(afterLeague, league, 0).map((q) => q.clubId);
    const ties = (afterLeague.stages?.[1]?.bracket?.phases[0]?.ties ?? []).map(
      (tie) => new Set([tie.home, tie.away]),
    );
    expect(ties).toEqual([new Set([table[0], table[2]]), new Set([table[1], table[3]])]);

    const extras = extrasBank();
    const stage = knockoutOf(knockoutAfterGroups(16));
    const world = withLowerStages(extras, [
      groupsStage(4, 2, { extra: 4 }),
      {
        ...stage,
        pairs: [
          ["A1", "X1"],
          ["B1", "X2"],
          ["C1", "X3"],
          ["D1", "X4"],
          ["E1", "F2"],
          ["F1", "E2"],
          ["A2", "B2"],
          ["C2", "D2"],
        ],
      },
    ]);
    const after = playRounds(world, stagedSeason(world, "seq-7"), 3);
    const label = (id: string) => {
      const found = stageOrigin(after, world, 0, id);
      if (!found) return "?";
      return "group" in found
        ? `${found.group}${found.position}`
        : `X${(found as { extra: number }).extra}`;
    };
    const first = after.stages?.[1]?.bracket?.phases[0]?.ties[0];
    expect(new Set([label(first?.home ?? ""), label(first?.away ?? "")])).toEqual(
      new Set(["A1", "X1"]),
    );
  });
});

describe("preliminar → grupos com pote de origem → mata-mata", () => {
  const world = continentalBank();
  const start = stagedSeason(world, "seq-8", { competitionId: CONTINENTAL_ID, divisionLevel: 1 });

  it("a contagem de clubes de cada fase fecha", () => {
    const format = world.competitions.find((c) => c.id === CONTINENTAL_ID)?.format;
    if (format?.type !== "stages") throw new Error("sem fases");
    expect(stageParticipantCounts(format.stages, 28)).toEqual([16, 16, 8]);
  });

  it("os 4 vencedores da preliminar formam o último pote, um em cada grupo, e a separação vale para os demais", () => {
    const afterPreliminary = playRounds(world, start, 2);
    const groups = afterPreliminary.stages?.[1];
    expect(groups?.started).toBe(true);
    const winners = new Set(
      afterPreliminary.stages?.[0]?.bracket?.phases[1]?.ties.map(
        (tie) => tieState(cupView(afterPreliminary, world, 0), 1, tie.id).winner,
      ),
    );
    expect(winners.size).toBe(4);
    const country = new Map(world.clubs.map((club) => [club.id, club.countryId]));
    for (const group of groups?.groups ?? []) {
      expect(group.clubIds.filter((id) => winners.has(id))).toHaveLength(1);
      const direct = group.clubIds.filter((id) => !winners.has(id)).map((id) => country.get(id));
      expect(new Set(direct).size).toBe(direct.length);
    }
    expect(groups?.warnings).toBeUndefined();
  });

  it("a competição termina com um campeão", () => {
    const end = playToEnd(world, start);
    expect(isSeasonOver(end)).toBe(true);
    expect(end.stages?.map((stage) => stage.clubIds.length)).toEqual([16, 16, 8]);
    const order = finalOrder(end, world);
    expect(order).toHaveLength(28);
    const view = cupView(end, world, 2);
    const final = view.bracket?.phases[2]?.ties[0];
    expect(final && tieState(view, 2, final.id).winner).toBe(order[0]);
  });
});
