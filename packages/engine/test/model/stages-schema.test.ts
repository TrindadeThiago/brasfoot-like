import { describe, expect, it } from "vitest";
import { clubSchema, competitionSchema, divisionSchema } from "../../src/model/schemas";
import { at, makeValidBank } from "../helpers/build-bank";

// 019 (T003): o formato de dados das fases (data-model.md §1).
const POINTS = { win: 3, draw: 1, loss: 0 };
const TIEBREAKERS = ["goal-difference", "goals-for", "draw-lots"];

const league = { type: "league", rounds: 2, points: POINTS, tiebreakers: TIEBREAKERS };
const groups = {
  type: "groups",
  groupSize: 4,
  rounds: 1,
  points: POINTS,
  tiebreakers: TIEBREAKERS,
  qualified: 2,
};
const knockout = {
  type: "knockout",
  phases: [
    { name: "Semifinal", legs: 1, tiebreakers: ["penalties"], home: "overall", prize: 0 },
    { name: "Final", legs: 1, tiebreakers: ["penalties"], home: "draw", prize: 0 },
  ],
};

function competitionWith(format: unknown, divisionExtra: object = {}) {
  const base = at(makeValidBank().competitions, 0);
  return {
    ...base,
    format,
    divisions: base.divisions.map((division, index) =>
      index === 0 ? { ...division, ...divisionExtra } : division,
    ),
  };
}

const accepts = (value: unknown) => competitionSchema.safeParse(value).success;

describe("formato das fases (019)", () => {
  it("aceita os formatos groups e stages da competição", () => {
    expect(accepts(competitionWith(groups))).toBe(true);
    expect(accepts(competitionWith({ type: "stages", stages: [groups, knockout] }))).toBe(true);
    expect(accepts(competitionWith({ type: "stages", stages: [league, knockout] }))).toBe(true);
  });

  it("aceita division.stages, enter, pairs, pairing e home overall", () => {
    const stages = [
      { ...groups, enter: ["clube-x"], gapWeeks: 1 },
      { ...knockout, pairing: "position", pairs: [["A1", "B2"]], enter: [] },
    ];
    expect(accepts(competitionWith(league, { stages }))).toBe(true);
    const division = at(makeValidBank().competitions, 0).divisions[0];
    const parsed = divisionSchema.parse({ ...division, stages });
    expect(parsed.stages).toHaveLength(2);
  });

  it("aceita o sorteio com potes e as regras de separação e concentração", () => {
    const draw = {
      pots: 4,
      previousStagePot: true,
      rules: [
        { kind: "separate", attribute: "country", exemptPots: [4] },
        { kind: "separate", attribute: "region" },
        { kind: "concentrate", attribute: "region" },
      ],
    };
    expect(accepts(competitionWith({ ...groups, draw }))).toBe(true);
  });

  it("aceita a região opcional do clube", () => {
    const club = at(makeValidBank().clubs, 0);
    expect(clubSchema.parse({ ...club, region: "Norte" }).region).toBe("Norte");
    expect(clubSchema.safeParse(club).success).toBe(true);
    expect(clubSchema.safeParse({ ...club, region: "" }).success).toBe(false);
  });

  it("recusa tamanho de grupo, turnos, classificados e potes fora da faixa", () => {
    expect(accepts(competitionWith({ ...groups, groupSize: 2 }))).toBe(false);
    expect(accepts(competitionWith({ ...groups, groupSize: 9 }))).toBe(false);
    expect(accepts(competitionWith({ ...groups, rounds: 3 }))).toBe(false);
    expect(accepts(competitionWith({ ...groups, qualified: 0 }))).toBe(false);
    expect(accepts(competitionWith({ ...groups, draw: { pots: 1 } }))).toBe(false);
  });

  it("recusa regra de sorteio desconhecida e concentração por país", () => {
    const rule = (value: object) => competitionWith({ ...groups, draw: { rules: [value] } });
    expect(accepts(rule({ kind: "mix", attribute: "country" }))).toBe(false);
    expect(accepts(rule({ kind: "separate", attribute: "city" }))).toBe(false);
    expect(accepts(rule({ kind: "concentrate", attribute: "country" }))).toBe(false);
  });

  it("recusa lista de fases vazia e mais de 8 fases", () => {
    expect(accepts(competitionWith({ type: "stages", stages: [] }))).toBe(false);
    const nine = Array.from({ length: 9 }, () => groups);
    expect(accepts(competitionWith({ type: "stages", stages: nine }))).toBe(false);
  });

  it("recusa origem inválida em pairs e fase desconhecida", () => {
    const bad = { ...knockout, pairs: [["Z", "A1"]] };
    expect(accepts(competitionWith({ type: "stages", stages: [groups, bad] }))).toBe(false);
    expect(accepts(competitionWith({ type: "stages", stages: [{ type: "round-robin" }] }))).toBe(
      false,
    );
  });

  it("a liga e a copa da 018 continuam válidas", () => {
    expect(accepts(competitionWith(league))).toBe(true);
    expect(
      accepts(
        competitionWith({
          ...knockout,
          phases: knockout.phases.map((p) => ({ ...p, home: "ranking" })),
        }),
      ),
    ).toBe(true);
  });
});
