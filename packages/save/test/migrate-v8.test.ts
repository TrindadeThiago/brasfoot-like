import { DEFAULT_BOARD } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import { migrateSave, type SaveFile } from "../src";
import { saveV7, validSave } from "./fixtures";

describe("migração v7 → v8 (012 R12, FR-038, SC-009)", () => {
  it("meio da temporada: técnico empregado, carência até o fim, metas de meio de temporada", () => {
    const v7 = saveV7({ rounds: 10 });
    const result = migrateSave(v7);
    if (result.status !== "ok") throw new Error(JSON.stringify(result));
    expect(result.migratedFrom).toBe(7);
    const { board } = result.save;
    expect(result.save.formatVersion).toBe(13);
    expect(board.manager).toMatchObject({
      clubId: v7.clubId,
      noFiring: false,
      reputation: DEFAULT_BOARD.initialReputation,
    });
    expect(board.manager.graceUntil).toEqual({ season: 1, round: 38 });
    expect(board.clubs[v7.clubId]?.coachId).toBeNull();
    expect(board.clubs[v7.clubId]?.goals?.sport.midSeason).toBe(true);
    const others = Object.values(board.clubs).filter((club) => club.clubId !== v7.clubId);
    expect(others.every((club) => club.coachId !== null)).toBe(true);
    expect(board.history.stints).toEqual([{ clubId: v7.clubId, from: { season: 1, round: 10 } }]);
    const {
      formatVersion: _v,
      board: _board,
      fans: _fans,
      news: _news,
      assets: _assets,
      calendar: _calendar,
      competitions: _competitions,
      fitness: _fitness,
      competitionHistory: _competitionHistory,
      cupHistory: _cupHistory,
      bank: _bank,
      ...rest
    } = result.save;
    const { formatVersion: _v7, bank: _bank7, ...restV7 } = v7;
    expect(rest).toEqual(restV7);
  });

  it("temporada encerrada: sem metas até a virada", () => {
    const result = migrateSave(saveV7({ toEnd: true }));
    if (result.status !== "ok") throw new Error(JSON.stringify(result));
    expect(Object.values(result.save.board.clubs).every((club) => club.goals === undefined)).toBe(
      true,
    );
  });

  it("v8 sem diretoria ⇒ corrupt; invariantes conferidos", () => {
    const save = validSave();
    Reflect.deleteProperty(save, "board");
    expect(migrateSave(save as SaveFile).status).toBe("corrupt");
    const twice = validSave();
    const coachId = Object.values(twice.board.clubs).find((club) => club.coachId)?.coachId ?? null;
    const other = Object.values(twice.board.clubs).filter((club) => club.coachId)[1];
    if (other) other.coachId = coachId;
    expect(migrateSave(twice).status).toBe("corrupt");
  });
});
