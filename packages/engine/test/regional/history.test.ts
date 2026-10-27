import { describe, expect, it } from "vitest";
import { nextComposition } from "../../src/career/composition";
import { regionalEdition, regionalEditions } from "../../src/regional/history";
import { finalOrder } from "../../src/stages/ranking";
import { playToEnd, regionalSeasons, regionalState } from "../career/regional-helpers";

describe("histórico do estadual (023 R8)", () => {
  const { state, manager, seed } = regionalState();
  const end = playToEnd(state, seed, manager);
  const [league] = regionalSeasons(end);

  it("registra campeão, vice, promovidos e rebaixados de cada divisão", () => {
    if (!league) throw new Error("sem estadual");
    const edition = regionalEdition(end.world, league);
    expect(edition?.competitionId).toBe(league.competitionId);
    expect(edition?.number).toBe(league.number);
    expect(edition?.divisions.map((division) => division.level)).toEqual([1, 2]);
    const change = nextComposition(league, end.world);
    for (const result of edition?.divisions ?? []) {
      const season = league.divisions.find((entry) => entry.divisionLevel === result.level);
      const order = season ? finalOrder(season, end.world) : [];
      expect(result.championId).toBe(order[0]);
      expect(result.runnerUpId).toBe(order[1]);
      expect(result.promotedIds).toEqual(change.promoted[result.level]);
      expect(result.relegatedIds).toEqual(change.relegated[result.level]);
    }
  });

  it("regionalEditions devolve uma edição por estadual e ignora as outras competições", () => {
    const editions = regionalEditions(end.world, [end.league, ...end.competitions]);
    expect(editions).toHaveLength(regionalSeasons(end).length);
    expect(editions.map((edition) => edition.competitionId)).toEqual(
      regionalSeasons(end).map((entry) => entry.competitionId),
    );
  });

  it("a temporada ainda no começo não tem edição", () => {
    const [started] = regionalSeasons(state);
    expect(started && regionalEdition(state.world, started)).toBeUndefined();
  });
});
