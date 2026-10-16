import { describe, expect, it } from "vitest";
import { FORMATIONS } from "../../src/match/formations.js";
import { teamStrength } from "../../src/match/strength.js";
import type { CompletedPlayer, Position } from "../../src/model/types.js";

function player(id: string, position: Position, strength = 70): CompletedPlayer {
  return {
    id,
    name: id,
    displayName: id,
    birthDate: "2000-01-01",
    nationalityId: "pais",
    clubId: "clube",
    position,
    strength,
    traits: [],
    hidden: { potential: strength, temperament: 50, injuryProneness: 50 },
  };
}

function naturalTeam(strength = 70) {
  const onField: Record<string, CompletedPlayer | null> = {};
  for (const slot of FORMATIONS["4-4-2"].slots) {
    onField[slot.id] = player(slot.id, slot.position, strength);
  }
  return { formation: "4-4-2" as const, onField };
}

describe("teamStrength (FR-006, FR-007, FR-010)", () => {
  it("time na posição de origem tem setores iguais à força dos jogadores", () => {
    const strength = teamStrength(naturalTeam(70));
    expect(strength.goalkeeper).toBeCloseTo(70);
    expect(strength.defense).toBeCloseTo(70);
    expect(strength.midfield).toBeCloseTo(70);
    expect(strength.attack).toBeCloseTo(70);
    expect(strength.overall).toBeCloseTo(70);
  });

  it("jogador fora de posição reduz os setores", () => {
    const team = naturalTeam(70);
    team.onField.ls = player("lateral-no-ataque", "FB", 70);
    const base = teamStrength(naturalTeam(70));
    const changed = teamStrength(team);
    expect(changed.attack).toBeLessThan(base.attack);
  });

  it("vaga vazia reduz proporcionalmente os setores que ela alimenta", () => {
    const team = naturalTeam(70);
    team.onField.lcb = null;
    const changed = teamStrength(team);
    expect(changed.defense).toBeLessThan(70);
    expect(changed.defense).toBeGreaterThan(70 * 0.6);
    expect(changed.attack).toBeCloseTo(70);
  });

  it("meio-campista mais forte aumenta o meio", () => {
    const team = naturalTeam(70);
    team.onField.lcm = player("craque", "DM", 90);
    expect(teamStrength(team).midfield).toBeGreaterThan(70);
  });

  it("é determinística", () => {
    expect(teamStrength(naturalTeam(63))).toEqual(teamStrength(naturalTeam(63)));
  });
});
