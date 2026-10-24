import { describe, expect, it } from "vitest";
import type { Competition, Division, KnockoutStage, StageFormat } from "../../src/model/types";
import {
  isStaged,
  knockoutCounts,
  stageParticipantCounts,
  stageQualifierCount,
  stageRoundRanges,
  stageRounds,
  stagesOf,
} from "../../src/stages/rules";

const POINTS = { win: 3, draw: 1, loss: 0 };
const TIEBREAKERS: ("goal-difference" | "draw-lots")[] = ["goal-difference", "draw-lots"];

const league = (rounds: number, extra: object = {}) =>
  ({ type: "league", rounds, points: POINTS, tiebreakers: TIEBREAKERS, ...extra }) as StageFormat;
const groups = (groupSize: number, rounds: 1 | 2, extra: object = {}) =>
  ({
    type: "groups",
    groupSize,
    rounds,
    points: POINTS,
    tiebreakers: TIEBREAKERS,
    ...extra,
  }) as StageFormat;
const phase = (name: string, legs: 1 | 2 = 1) => ({
  name,
  legs,
  tiebreakers: ["penalties" as const],
  home: "draw" as const,
  prize: 0,
});
const knockout = (legs: (1 | 2)[], extra: object = {}) =>
  ({
    type: "knockout",
    phases: legs.map((value, index) => phase(`Fase ${index + 1}`, value)),
    ...extra,
  }) as KnockoutStage;

const division = (extra: object = {}): Division => ({
  level: 1,
  name: "D",
  clubIds: [],
  promotionSlots: 0,
  relegationSlots: 0,
  ...extra,
});
const competition = (format: unknown): Competition =>
  ({ id: "c", countryId: "p", name: "C", format, divisions: [division()] }) as Competition;

describe("stagesOf (019 R1)", () => {
  it("normaliza cada formato para a lista de fases", () => {
    const l = league(2);
    const g = groups(4, 1, { qualified: 2 });
    const k = knockout([1, 1]);
    expect(stagesOf(competition(l), division())).toEqual([l]);
    expect(stagesOf(competition(k), division())).toEqual([k]);
    expect(stagesOf(competition(g), division())).toEqual([g]);
    expect(stagesOf(competition({ type: "stages", stages: [g, k] }), division())).toEqual([g, k]);
  });

  it("division.stages vence o formato da competição", () => {
    const own = [groups(4, 1, { qualified: 2 }), knockout([1])];
    expect(stagesOf(competition(league(2)), division({ stages: own }))).toEqual(own);
    expect(
      stagesOf(competition({ type: "stages", stages: [league(1)] }), division({ stages: own })),
    ).toEqual(own);
  });

  it("isStaged só é verdadeiro para divisões em fases", () => {
    expect(isStaged(competition(league(2)), division())).toBe(false);
    expect(isStaged(competition(knockout([1])), division())).toBe(false);
    expect(isStaged(competition(groups(4, 1)), division())).toBe(true);
    expect(isStaged(competition({ type: "stages", stages: [league(1)] }), division())).toBe(true);
    expect(isStaged(competition(league(2)), division({ stages: [league(1)] }))).toBe(true);
  });
});

describe("stageRounds", () => {
  it("liga: turnos × (n − 1) ou n se ímpar", () => {
    expect(stageRounds(league(2), 20)).toBe(38);
    expect(stageRounds(league(1), 7)).toBe(7);
  });

  it("grupos: só o tamanho do grupo conta", () => {
    expect(stageRounds(groups(4, 1), 32)).toBe(3);
    expect(stageRounds(groups(4, 2), 32)).toBe(6);
    expect(stageRounds(groups(5, 1), 20)).toBe(5);
  });

  it("mata-mata: a soma das pernas", () => {
    expect(stageRounds(knockout([1, 1, 2, 1]), 16)).toBe(5);
  });
});

describe("knockoutCounts (fase eliminatória dentro de uma sequência)", () => {
  it("na última fase da sequência a final tem 2 clubes", () => {
    expect(knockoutCounts(knockout([1, 1, 1, 1]), 16)).toEqual({
      phases: [16, 8, 4, 2],
      winners: 1,
    });
  });

  it("numa fase intermediária a última fase classifica a metade dos clubes dela", () => {
    expect(knockoutCounts(knockout([1, 1]), 16)).toEqual({ phases: [16, 8], winners: 4 });
  });

  it("entradas por fase somam clubes à fase (participantes já contam quem entra depois)", () => {
    const stage = knockout([1, 1, 1], { entries: [{ phase: 1, clubIds: ["a", "b", "c", "d"] }] });
    expect(knockoutCounts(stage, 12)).toEqual({ phases: [8, 8, 4], winners: 2 });
  });
});

describe("stageQualifierCount", () => {
  it("liga: qualified; grupos: qualified × grupos + extra; mata-mata: vencedores da última fase", () => {
    expect(stageQualifierCount(league(1, { qualified: 4 }), 20)).toBe(4);
    expect(stageQualifierCount(groups(4, 1, { qualified: 2 }), 32)).toBe(16);
    expect(stageQualifierCount(groups(4, 1, { qualified: 2, extra: 4 }), 24)).toBe(16);
    expect(stageQualifierCount(knockout([1, 1]), 16)).toBe(4);
  });

  it("uma fase sem qualified não classifica ninguém", () => {
    expect(stageQualifierCount(league(2), 20)).toBe(0);
    expect(stageQualifierCount(groups(4, 1), 32)).toBe(0);
  });
});

describe("stageParticipantCounts", () => {
  it("a primeira fase tira os clubes que só entram depois; as seguintes somam os classificados e o enter", () => {
    const stages = [
      knockout([1, 1]), // preliminar: 16 clubes, classificam os 4 vencedores da última fase
      groups(4, 1, { qualified: 2, enter: ["x1", "x2", "x3", "x4"] }), // 4 + 4 = 8 clubes, 2 grupos
      knockout([1, 1]), // 4 classificados: semifinal e final
    ];
    expect(stageParticipantCounts(stages, 20)).toEqual([16, 8, 4]);
  });

  it("grupos → mata-mata: os classificados dos grupos entram no mata-mata", () => {
    const stages = [groups(4, 1, { qualified: 2 }), knockout([1, 1, 1, 1])];
    expect(stageParticipantCounts(stages, 32)).toEqual([32, 16]);
  });
});

describe("stageRoundRanges", () => {
  it("devolve intervalos absolutos contíguos que cobrem o calendário", () => {
    const stages = [groups(4, 1, { qualified: 2 }), knockout([1, 1, 1, 1])];
    expect(stageRoundRanges(stages, 32)).toEqual([
      [1, 2, 3],
      [4, 5, 6, 7],
    ]);
  });
});
