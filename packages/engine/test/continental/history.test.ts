import { describe, expect, it } from "vitest";
import { continentalEdition } from "../../src/continental/history";
import { CONTINENTAL_IDS } from "../../src/worldgen/continental";
import {
  compactState,
  compactWorld,
  continentalChampion,
  continentalLeague,
  playDays,
} from "../career/continental-helpers";
import { playSeasons } from "../career/qualification-helpers";

describe("histórico das edições continentais (022 US2, FR-021)", () => {
  const { state, manager, seed } = compactState({ seed: "continental-historico" });

  it("a edição só existe depois da final", () => {
    const middle = playDays(state, 8, seed, manager);
    expect(continentalEdition(middle.world, continentalLeague(middle))).toBeUndefined();
  });

  it("a edição encerrada traz campeão, vice, final, melhor fase de cada clube e as tabelas dos grupos", () => {
    const end = playDays(state, "end", seed, manager);
    const edition = continentalEdition(end.world, continentalLeague(end));
    expect(edition).toBeDefined();
    if (!edition) return;
    expect(edition.competitionId).toBe(CONTINENTAL_IDS.major);
    expect(edition.number).toBe(1);
    expect(edition.championId).toBe(continentalChampion(end));
    expect(edition.runnerUpId).not.toBe(edition.championId);
    expect([edition.final.home, edition.final.away].sort()).toEqual(
      [edition.championId, edition.runnerUpId].sort(),
    );
    expect(Object.keys(edition.reached)).toHaveLength(16);
    expect(edition.reached[edition.championId]).toEqual({ stage: 2, phase: 4 });
    expect(edition.reached[edition.runnerUpId]).toEqual({ stage: 2, phase: 3 });
    expect(edition.groups).toHaveLength(4);
    for (const group of edition.groups ?? []) {
      expect(group.table.map((row) => row.position)).toEqual([1, 2, 3, 4]);
    }
  });

  it("a virada guarda uma edição por temporada, em ordem", () => {
    const { seasons, history } = playSeasons(
      compactWorld("continental-historico"),
      "continental-historico",
      3,
    );
    const editions = (history.continentalHistory ?? []).filter(
      (edition) => edition.competitionId === CONTINENTAL_IDS.major,
    );
    expect(editions.map((edition) => edition.number)).toEqual([1, 2, 3]);
    expect(new Set(editions.map((edition) => edition.year)).size).toBe(3);
    editions.forEach((edition, index) => {
      expect(edition.championId).toBe(continentalChampion(seasons[index]?.end as never));
    });
  }, 300_000);

  it("a carreira do técnico registra a campanha continental da temporada", () => {
    const end = playDays(state, "end", seed, manager);
    const record = end.board?.history.seasons.at(-1);
    expect(record?.continental?.competitionId).toBe(CONTINENTAL_IDS.major);
    expect(record?.continental?.result === "met" || record?.continental?.result === "missed").toBe(
      true,
    );
    expect(record?.continental?.reached).toBeDefined();
  });
});
