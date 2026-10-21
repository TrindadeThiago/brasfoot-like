import { calendarNext, clubFixtures, isCalendarOver, weekdayOf } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import {
  advanceCareerSeason,
  exportSave,
  importSave,
  isCareerSeasonOver,
  migrateSave,
  type SaveFile,
  seasonStateOf,
  userSeason,
} from "../src";
import { playDay, type SaveV11Step, saveV11 } from "./fixtures";

const STEPS: [string, SaveV11Step][] = [
  ["início da temporada", { rounds: 0 }],
  ["depois de 17 rodadas", { rounds: 17 }],
  ["fim da temporada", { toEnd: true }],
  ["depois de 3 temporadas", { seasons: 3 }],
];

function migrated(step: SaveV11Step): { save: SaveFile; v11: ReturnType<typeof saveV11> } {
  const v11 = saveV11(step);
  const result = migrateSave(v11);
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
  expect(result.migratedFrom).toBe(11);
  return { save: result.save, v11 };
}

describe("migração v11 → v12 (017 R12, FR-040 a FR-042, critério de aceite 2)", () => {
  it.each(STEPS)(
    "%s: abre na mesma rodada, com o mesmo histórico",
    (_label, step) => {
      const { save, v11 } = migrated(step);
      expect(save.formatVersion).toBe(13);
      const {
        formatVersion: _v,
        competitions: _c,
        calendar: _cal,
        fitness: _f,
        competitionHistory: _h,
        cupHistory: _cups,
        ...rest
      } = save;
      const { formatVersion: _v11, ...restV11 } = v11;
      expect(rest).toEqual(restV11);
    },
    120_000,
  );

  it.each(STEPS)(
    "%s: o calendário está no dia da próxima rodada não jogada",
    (_label, step) => {
      const { save, v11 } = migrated(step);
      const { calendar } = save;
      expect(calendar.days).toHaveLength(38);
      expect(calendar.days.every((day) => weekdayOf(day.date) === 7)).toBe(true);
      expect(calendar.start).toBe(`${save.league.year}-01-01`);
      const state = seasonStateOf(save);
      const played = userSeason(v11 as unknown as SaveFile).nextRound - 1;
      expect(calendarNext(state)).toBe(Math.min(played, 38));
      expect(isCalendarOver(state)).toBe(isCareerSeasonOver(save));
    },
    120_000,
  );

  it("campos novos começam vazios: sem outras competições, condição cheia, sem histórico extra", () => {
    const { save } = migrated({ rounds: 17 });
    expect(save.competitions).toEqual([]);
    expect(save.fitness).toEqual({ players: {} });
    expect(save.competitionHistory).toEqual([]);
  }, 120_000);

  it("amarelos e suspensões continuam na liga (FR-041)", () => {
    const { save, v11 } = migrated({ rounds: 17 });
    expect(userSeason(save).status).toEqual(userSeason(v11 as unknown as SaveFile).status);
    const hasStatus = save.league.divisions.some((division) =>
      Object.values(division.status).some((entry) => entry.yellows > 0 || entry.suspension > 0),
    );
    expect(hasStatus).toBe(true);
  }, 120_000);

  it("o save migrado a meio da temporada joga até a virada sem erro", () => {
    let { save } = migrated({ rounds: 17 });
    const fixtures = clubFixtures(seasonStateOf(save), save.clubId);
    expect(fixtures.filter((fixture) => fixture.record !== undefined)).toHaveLength(17);
    let days = 0;
    while (!isCareerSeasonOver(save)) {
      save = playDay(save);
      days++;
    }
    expect(days).toBe(21);
    expect(save.league.divisions.every((division) => division.nextRound === 39)).toBe(true);
    const turned = advanceCareerSeason(save, "2026-10-21T00:00:00.000Z");
    expect(turned.ok).toBe(true);
    if (turned.ok) expect(turned.save.league.number).toBe(save.league.number + 1);
  }, 300_000);

  it("um arquivo exportado na v11 passa pela mesma migração ao importar", () => {
    const v11 = saveV11({ rounds: 5 });
    const bytes = exportSave(v11 as unknown as SaveFile, "2026-10-21T00:00:00.000Z");
    const result = importSave(bytes);
    if (result.status !== "ok") throw new Error(JSON.stringify(result));
    expect(result.migratedFrom).toBe(11);
    expect(result.save.formatVersion).toBe(13);
    expect(calendarNext(seasonStateOf(result.save))).toBe(5);
  }, 120_000);

  it("v12 sem calendário ⇒ corrupt", () => {
    const { save } = migrated({ rounds: 0 });
    const broken = JSON.parse(JSON.stringify(save)) as Record<string, unknown>;
    Reflect.deleteProperty(broken, "calendar");
    expect(migrateSave(broken).status).toBe("corrupt");
  }, 120_000);
});
