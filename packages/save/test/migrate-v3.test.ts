import {
  advanceSeason,
  createSeason,
  isLeagueSeasonOver,
  leagueRound,
} from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import { migrateSave, type SaveFile } from "../src";
import { saveV1, saveV2MidSeason, saveV2SeasonOver, validSave, withoutMarket } from "./fixtures";

function migrated(raw: unknown): SaveFile & { migratedFrom?: number } {
  const result = migrateSave(raw);
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
  return { ...result.save, ...(result.migratedFrom ? { migratedFrom: result.migratedFrom } : {}) };
}

describe("migração v2 → v3 (R9, FR-024, SC-007)", () => {
  it("transforma a temporada no meio em liga, com a Série B na mesma rodada", () => {
    const v2 = saveV2MidSeason();
    const result = migrateSave(v2);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.migratedFrom).toBe(2);
    const { save } = result;
    expect(save.formatVersion).toBe(16);
    expect("season" in save).toBe(false);
    expect(save.history).toEqual([]);
    expect(save.league).toMatchObject({
      competitionId: v2.season.competitionId,
      number: 1,
      year: Number(v2.bank.manifest.referenceDate.slice(0, 4)),
      seed: v2.seed,
    });
    expect(save.league.divisions.map((season) => season.divisionLevel)).toEqual([1, 2]);
    expect(save.league.divisions[0]).toEqual(v2.season);
    const serieB = createSeason(save.bank, {
      competitionId: v2.season.competitionId,
      divisionLevel: 2,
      seed: v2.seed,
    });
    if (!serieB.ok) throw new Error("sem Série B");
    const expected = advanceSeason(serieB.season, save.bank, { rounds: 10 });
    if (!expected.ok) throw new Error("não avançou");
    expect(save.league.divisions[1]).toEqual(expected.season);
    expect(leagueRound(save.league)).toBe(11);
    const {
      league: _league,
      history: _history,
      finances: _finances,
      renewal: _renewal,
      formatVersion: _v,
      ...rest
    } = withoutMarket(save);
    const { season: _season, formatVersion: _v2, ...restV2 } = v2;
    expect(rest).toEqual(restV2);
  }, 30000);

  it("temporada encerrada vira liga encerrada", () => {
    const save = migrated(saveV2SeasonOver());
    expect(isLeagueSeasonOver(save.league)).toBe(true);
    expect(save.league.divisions.every((season) => season.records.length === 380)).toBe(true);
  }, 30000);

  it("é determinística", () => {
    expect(migrated(saveV2MidSeason())).toEqual(migrated(saveV2MidSeason()));
  }, 30000);

  it("v1 → v5 em cadeia", () => {
    const save = migrated(saveV1());
    expect(save.migratedFrom).toBe(1);
    expect(save.formatVersion).toBe(16);
    expect(save.lineup.starters.gk).toBeDefined();
    expect(save.league.divisions).toHaveLength(2);
  });
});

describe("validação do save v3", () => {
  it.each([
    [
      "divisão com outra seed",
      (save: SaveFile) => Object.assign(save.league.divisions[1] as object, { seed: "outra" }),
    ],
    [
      "clube do jogador fora das divisões",
      (save: SaveFile) => Object.assign(save, { clubId: "clube-999" }),
    ],
    [
      "divisões em rodadas diferentes",
      (save: SaveFile) => Object.assign(save.league.divisions[1] as object, { nextRound: 2 }),
    ],
    [
      "seed da liga incoerente com a carreira",
      (save: SaveFile) => Object.assign(save.league, { number: 2 }),
    ],
    ["sem liga", (save: SaveFile) => Reflect.deleteProperty(save, "league")],
    ["sem histórico", (save: SaveFile) => Reflect.deleteProperty(save, "history")],
  ])("%s ⇒ corrupt", (_label, mutate) => {
    const save = validSave();
    mutate(save);
    expect(migrateSave(save).status).toBe("corrupt");
  });
});
