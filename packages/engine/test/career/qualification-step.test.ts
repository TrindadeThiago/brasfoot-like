import { describe, expect, it } from "vitest";
import { TURNOVER_STEP_IDS } from "../../src/career/turnover";
import { superCupWorld } from "../qualification/helpers";
import { allSeasons, playSeasons } from "./qualification-helpers";

const SEED = "step-021";

describe("etapa resolve-qualification (021 R2)", () => {
  it("fica entre promotion-relegation e advance-year", () => {
    const ids = [...TURNOVER_STEP_IDS];
    expect(ids.indexOf("resolve-qualification")).toBe(ids.indexOf("promotion-relegation") + 1);
    expect(ids.indexOf("news-qualification")).toBe(ids.indexOf("resolve-qualification") + 1);
    expect(ids.indexOf("advance-year")).toBe(ids.indexOf("news-qualification") + 1);
  });

  it("a supercopa da temporada seguinte tem os participantes resolvidos e as origens", () => {
    const { world } = superCupWorld();
    const { seasons, history } = playSeasons(world, SEED, 2);
    const second = seasons[1]?.start;
    const cup = allSeasons(second as NonNullable<typeof second>).find(
      (entry) => entry.competitionId === "supercopa-teste",
    );
    expect(cup?.divisions[0]?.clubIds).toHaveLength(2);
    expect(cup?.number).toBe(2);
    expect(Object.keys(cup?.origins ?? {}).sort()).toEqual(
      [...(cup?.divisions[0]?.clubIds ?? [])].sort(),
    );
    expect(
      Object.values(cup?.origins ?? {}).every(
        (origin) => origin.kind === "berth" || origin.kind === "pass",
      ),
    ).toBe(true);
    // temporada 1: participantes do banco
    const first = allSeasons(seasons[0]?.start as NonNullable<typeof second>).find(
      (entry) => entry.competitionId === "supercopa-teste",
    );
    expect(Object.values(first?.origins ?? {}).every((origin) => origin.kind === "bank")).toBe(
      true,
    );
    expect(history.qualificationHistory).toHaveLength(2);
    expect(history.qualificationHistory?.[0]?.number).toBe(1);
  }, 120_000);

  it("a supercopa é jogada e tem campeão a cada temporada", () => {
    const { world } = superCupWorld();
    const { seasons } = playSeasons(world, SEED, 3, { roundTrip: true });
    for (const { end } of seasons) {
      const cup = allSeasons(end).find((entry) => entry.competitionId === "supercopa-teste");
      expect(cup?.divisions[0]?.records.length).toBeGreaterThan(0);
    }
  }, 120_000);
});
