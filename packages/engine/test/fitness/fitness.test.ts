import { describe, expect, it } from "vitest";
import {
  fitnessAfterMatches,
  fitnessFactorBp,
  fitnessOn,
  squadWithFitness,
} from "../../src/fitness/fitness";
import { DEFAULT_FITNESS, fitnessRules } from "../../src/fitness/rules";
import type { FitnessState } from "../../src/fitness/types";
import type { MatchRecord } from "../../src/season/types";
import { editedWorld, testWorld } from "../career/helpers";

const RULES = DEFAULT_FITNESS;
const EMPTY: FitnessState = { players: {} };

/** Registro mínimo de uma partida: só os minutos importam para a condição. */
function record(minutes: Record<string, number>): MatchRecord {
  return {
    players: Object.fromEntries(
      Object.entries(minutes).map(([id, value]) => [id, { side: "home", minutes: value }]),
    ),
  } as unknown as MatchRecord;
}

describe("fitnessOn (017 R5)", () => {
  it("jogador sem registro está com 100", () => {
    expect(fitnessOn(EMPTY, "a", "2027-01-10", RULES)).toBe(100);
  });

  it("recupera `recoveryPerDay` por dia, até 100", () => {
    const state: FitnessState = { players: { a: { value: 70, date: "2027-01-03" } } };
    expect(fitnessOn(state, "a", "2027-01-03", RULES)).toBe(70);
    expect(fitnessOn(state, "a", "2027-01-04", RULES)).toBe(75);
    expect(fitnessOn(state, "a", "2027-01-09", RULES)).toBe(100);
    expect(fitnessOn(state, "a", "2027-03-01", RULES)).toBe(100);
  });
});

describe("fitnessAfterMatches", () => {
  it("noventa minutos tiram drainPer90; quem entrou no segundo tempo perde metade", () => {
    const next = fitnessAfterMatches(EMPTY, [record({ a: 90, b: 45, c: 0 })], "2027-01-03", RULES);
    expect(next.players.a).toEqual({ value: 70, date: "2027-01-03" });
    expect(next.players.b).toEqual({ value: 85, date: "2027-01-03" });
    expect(next.players.c).toBeUndefined();
  });

  it("quem não jogou fica como estava e a entrada não é alterada", () => {
    const state: FitnessState = { players: { a: { value: 70, date: "2027-01-03" } } };
    const next = fitnessAfterMatches(state, [record({ b: 90 })], "2027-01-06", RULES);
    expect(next.players.a).toEqual({ value: 70, date: "2027-01-03" });
    expect(next.players.b).toEqual({ value: 70, date: "2027-01-06" });
    expect(state.players.b).toBeUndefined();
  });

  it("desgasta a partir da condição do dia e nunca passa de 0", () => {
    const state: FitnessState = { players: { a: { value: 20, date: "2027-01-03" } } };
    const next = fitnessAfterMatches(state, [record({ a: 90 })], "2027-01-04", RULES);
    // 20 + 5 de recuperação − 30 de jogo.
    expect(next.players.a?.value).toBe(0);
  });

  it("remove do estado quem já voltou a 100", () => {
    const state: FitnessState = { players: { a: { value: 70, date: "2027-01-03" } } };
    const next = fitnessAfterMatches(state, [], "2027-01-10", RULES);
    expect(next.players.a).toBeUndefined();
  });

  it("sete dias recuperam 90 minutos; três dias não (FR-017)", () => {
    const played = fitnessAfterMatches(EMPTY, [record({ a: 90 })], "2027-01-03", RULES);
    expect(fitnessOn(played, "a", "2027-01-10", RULES)).toBe(100);
    expect(fitnessOn(played, "a", "2027-01-06", RULES)).toBe(85);
  });

  it("soma os jogos de uma lista e usa as regras dadas", () => {
    const rules = { ...RULES, drainPer90: 60 };
    const next = fitnessAfterMatches(
      EMPTY,
      [record({ a: 90 }), record({ b: 45 })],
      "2027-01-03",
      rules,
    );
    expect(next.players.a?.value).toBe(40);
    expect(next.players.b?.value).toBe(70);
  });
});

describe("fitnessFactorBp", () => {
  it("100 não muda nada e 0 tira 40%", () => {
    expect(fitnessFactorBp(100, RULES)).toBe(10000);
    expect(fitnessFactorBp(85, RULES)).toBe(9400);
    expect(fitnessFactorBp(70, RULES)).toBe(8800);
    expect(fitnessFactorBp(0, RULES)).toBe(6000);
  });
});

describe("squadWithFitness", () => {
  const squad = testWorld().players.filter((player) => player.clubId === "clube-001");

  it("com todos em 100 devolve o mesmo elenco", () => {
    expect(squadWithFitness(squad, EMPTY, "2027-01-03", RULES)).toBe(squad);
  });

  it("devolve cópias com a força reduzida e não altera a entrada", () => {
    const tired = squad[0];
    if (!tired) throw new Error("sem jogador");
    const state: FitnessState = { players: { [tired.id]: { value: 70, date: "2027-01-03" } } };
    const adjusted = squadWithFitness(squad, state, "2027-01-03", RULES);
    expect(adjusted).not.toBe(squad);
    expect(adjusted[0]?.strength).toBe(Math.round((tired.strength * 8800) / 10000));
    expect(adjusted[0]?.strength).toBeLessThan(tired.strength);
    expect(adjusted.slice(1)).toEqual(squad.slice(1));
    expect(squad[0]?.strength).toBe(tired.strength);
    // Dias depois, a recuperação devolve a força.
    expect(squadWithFitness(squad, state, "2027-01-10", RULES)).toBe(squad);
  });
});

describe("fitnessRules", () => {
  it("usa o padrão e completa campos ausentes da competição", () => {
    const world = testWorld();
    const id = world.competitions[0]?.id as string;
    expect(fitnessRules(world, id)).toEqual(DEFAULT_FITNESS);
    const edited = editedWorld((copy) => {
      (copy.competitions[0] as { fitness?: unknown }).fitness = { recoveryPerDay: 10 };
    });
    expect(fitnessRules(edited, id)).toEqual({ ...DEFAULT_FITNESS, recoveryPerDay: 10 });
  });
});
