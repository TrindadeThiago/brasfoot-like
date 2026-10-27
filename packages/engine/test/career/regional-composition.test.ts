import { describe, expect, it } from "vitest";
import { nextComposition } from "../../src/career/composition";
import { overallStandings } from "../../src/stages/classification";
import { finalOrder } from "../../src/stages/ranking";
import { playToEnd, regionalSeasons, regionalState } from "./regional-helpers";

describe("acesso e rebaixamento do estadual (023 US2, R3)", () => {
  const { state, manager, seed } = regionalState();
  const end = playToEnd(state, seed, manager);

  it("sobem os finalistas da 2ª e caem os piores da classificação geral dos grupos da 1ª", () => {
    for (const league of regionalSeasons(end)) {
      const change = nextComposition(league, end.world);
      const [first, second] = league.divisions;
      if (!first || !second) throw new Error("estadual sem as duas divisões");
      const secondOrder = finalOrder(second, end.world);
      expect(change.promoted[2]).toEqual(secondOrder.slice(0, 2));
      // Os rebaixados são os eliminados nos grupos com a pior classificação geral: últimos da ordem final.
      const firstOrder = finalOrder(first, end.world);
      expect(change.relegated[1]).toEqual(firstOrder.slice(-2));
      // Os finalistas são o campeão e o vice.
      expect(secondOrder.slice(0, 2)).toHaveLength(2);
    }
  });

  it("os rebaixados da 1ª estão entre os eliminados na fase de grupos", () => {
    for (const league of regionalSeasons(end)) {
      const first = league.divisions[0];
      if (!first) throw new Error("sem 1ª divisão");
      const knockoutClubs = new Set(first.stages?.[1]?.clubIds ?? []);
      const relegated = nextComposition(league, end.world).relegated[1] ?? [];
      expect(relegated).toHaveLength(2);
      for (const clubId of relegated) expect(knockoutClubs.has(clubId)).toBe(false);
    }
  });

  it("os rebaixados são os dois piores da classificação geral da fase de grupos", () => {
    for (const league of regionalSeasons(end)) {
      const first = league.divisions[0];
      if (!first) throw new Error("sem 1ª divisão");
      const overall = overallStandings(first, end.world, 0).map((row) => row.clubId);
      const relegated = nextComposition(league, end.world).relegated[1] ?? [];
      expect([...relegated].sort()).toEqual(overall.slice(-2).sort());
    }
  });

  it("o tamanho das duas divisões se mantém e nenhum clube some ou aparece", () => {
    for (const league of regionalSeasons(end)) {
      const change = nextComposition(league, end.world);
      const before = league.divisions.map((division) => division.clubIds.length);
      expect(change.composition[1]).toHaveLength(before[0] as number);
      expect(change.composition[2]).toHaveLength(before[1] as number);
      const all = (season: number) => league.divisions[season]?.clubIds ?? [];
      expect([...(change.composition[1] ?? []), ...(change.composition[2] ?? [])].sort()).toEqual(
        [...all(0), ...all(1)].sort(),
      );
    }
  });
});
