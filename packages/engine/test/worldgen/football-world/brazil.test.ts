import { describe, expect, it } from "vitest";
import {
  BRAZIL_STATES,
  COMPACT_PROFILE,
  generateFootballWorld,
} from "../../../src/worldgen/football-world";
import { brazilStates } from "../../../src/worldgen/football-world/brazil";

describe("o Brasil do mundo completo (024 R5)", () => {
  const bank = generateFootballWorld(COMPACT_PROFILE, "brasil");
  const league = bank.competitions.find((c) => c.id === "liga-bra");

  it("quatro divisões: A, B e C em pontos corridos e D em grupos e mata-mata", () => {
    expect(league?.divisions.map((d) => d.name)).toEqual([
      "Série A",
      "Série B",
      "Série C",
      "Série D",
    ]);
    for (const division of league?.divisions ?? []) expect(division.clubIds).toHaveLength(12);
    const d = league?.divisions[3];
    expect(d?.stages?.map((s) => s.type)).toEqual(["groups", "knockout"]);
    const groups = d?.stages?.[0];
    if (groups?.type !== "groups") throw new Error("sem grupos");
    expect(groups.groupSize).toBe(3);
    expect(groups.draw?.rules).toEqual([{ kind: "concentrate", attribute: "region" }]);
    expect(league?.divisions[0]?.stages).toBeUndefined();
  });

  it("copa, supercopa e estaduais (12 e 8 clubes) de estados reais", () => {
    expect(bank.competitions.some((c) => c.id === "copa-bra")).toBe(true);
    expect(bank.competitions.some((c) => c.id === "supercopa-bra")).toBe(true);
    const estaduais = bank.competitions.filter((c) => c.regional);
    expect(estaduais).toHaveLength(4);
    const names = new Set(BRAZIL_STATES.map((s) => s.name));
    for (const estadual of estaduais) {
      expect(names.has(estadual.regional?.region ?? "")).toBe(true);
      expect(estadual.divisions.map((d) => d.clubIds.length)).toEqual([12, 8]);
    }
  });

  it("todo clube brasileiro tem região e cidade real do estado dele; nacionais jogam o estadual", () => {
    const brazil = bank.clubs.filter((c) => c.countryId === "brasil");
    for (const club of brazil) {
      const state = BRAZIL_STATES.find((s) => s.name === club.region);
      expect(state?.cities).toContain(club.city);
    }
    const nationals = new Set(league?.divisions.flatMap((d) => d.clubIds));
    const inEstadual = new Set(
      bank.competitions
        .filter((c) => c.regional)
        .flatMap((c) => c.divisions.flatMap((d) => d.clubIds)),
    );
    for (const id of nationals) expect(inEstadual.has(id)).toBe(true);
  });

  it("estados mais fortes primeiro (peso), em ordem estável", () => {
    expect(brazilStates(3).map((s) => s.abbreviation)).toEqual(["SP", "MG", "RJ"]);
    expect(brazilStates(27)).toHaveLength(27);
  });
});
