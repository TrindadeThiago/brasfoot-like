import { completeCareerDay } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import {
  advanceCareerSeason,
  createSave,
  exportSave,
  importSave,
  isCareerSeasonOver,
  managedClubId,
  migrateSave,
  type SaveFile,
  seasonStateOf,
  withDayResult,
} from "../src";
import { bankWithCup, playDay, type SaveV11Step, SERIE_A, saveV12 } from "./fixtures";

const STEPS: [string, SaveV11Step][] = [
  ["início da temporada", { rounds: 0 }],
  ["depois de 17 rodadas", { rounds: 17 }],
  ["fim da temporada", { toEnd: true }],
  ["depois de 3 temporadas", { seasons: 3 }],
];

describe("migração v12 → v13 (018 R15, FR-029)", () => {
  it.each(STEPS)(
    "%s: ganha cupHistory vazio e o resto fica igual",
    (_label, step) => {
      const v12 = saveV12(step);
      const result = migrateSave(v12);
      if (result.status !== "ok") throw new Error(JSON.stringify(result));
      expect(result.migratedFrom).toBe(12);
      expect(result.save.formatVersion).toBe(16);
      expect(result.save.cupHistory).toEqual([]);
      const { formatVersion: _v, cupHistory: _c, ...rest } = result.save;
      const { formatVersion: _v12, ...restV12 } = v12;
      expect(rest).toEqual(restV12);
    },
    120_000,
  );

  it("o save migrado a meio da temporada joga até a virada", () => {
    const result = migrateSave(saveV12({ rounds: 17 }));
    if (result.status !== "ok") throw new Error(JSON.stringify(result));
    let save = result.save;
    while (!isCareerSeasonOver(save)) save = playDay(save);
    const turned = advanceCareerSeason(save, "2026-10-21T00:00:00.000Z");
    expect(turned.ok).toBe(true);
  }, 300_000);

  it("v13 sem cupHistory é corrupt", () => {
    const result = migrateSave(saveV12());
    if (result.status !== "ok") throw new Error("falhou");
    const broken = JSON.parse(JSON.stringify(result.save)) as Record<string, unknown>;
    Reflect.deleteProperty(broken, "cupHistory");
    expect(migrateSave(broken).status).toBe("corrupt");
  }, 120_000);

  it("um arquivo exportado na v12 passa pela mesma migração ao importar", () => {
    const bytes = exportSave(
      saveV12({ rounds: 5 }) as unknown as SaveFile,
      "2026-10-21T00:00:00.000Z",
    );
    const result = importSave(bytes);
    if (result.status !== "ok") throw new Error(JSON.stringify(result));
    expect(result.migratedFrom).toBe(12);
    expect(result.save.formatVersion).toBe(16);
  }, 120_000);
});

describe("save com a copa em andamento (018)", () => {
  function cupSave(days: number): SaveFile {
    const created = createSave({
      id: "copa",
      now: "2026-10-21T00:00:00.000Z",
      managerName: "Ana",
      clubId: SERIE_A[0] as string,
      seed: "copa-save",
      defaultBank: bankWithCup(),
      noFiring: true,
    });
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    let save = created.save;
    for (let day = 0; day < days; day++) {
      const managed = managedClubId(save);
      const result = completeCareerDay(seasonStateOf(save), save.seed, managed);
      if (!result.ok) throw new Error(JSON.stringify(result.error));
      save = withDayResult(save, result.state);
    }
    return save;
  }

  it("o save com fases ainda sem sorteio passa na checagem de integridade", () => {
    const save = cupSave(4);
    const cup = save.competitions.find((league) => league.competitionId === "copa-teste");
    expect(cup?.divisions[0]?.bracket?.phases.some((phase) => !phase.drawn)).toBe(true);
    const roundTrip = migrateSave(JSON.parse(JSON.stringify(save)));
    expect(roundTrip.status).toBe("ok");
  }, 120_000);

  it("fase sorteada com fixtures incompletas é corrupt", () => {
    const save = JSON.parse(JSON.stringify(cupSave(1))) as SaveFile;
    const cup = save.competitions.find((league) => league.competitionId === "copa-teste");
    const season = cup?.divisions[0];
    if (!season) throw new Error("sem copa");
    (season.calendar[0] as { fixtures: unknown[] }).fixtures.pop();
    expect(migrateSave(save).status).toBe("corrupt");
  }, 120_000);

  it("a copa termina na virada com a edição no histórico de copas", () => {
    let save = cupSave(0);
    while (!isCareerSeasonOver(save)) {
      const managed = managedClubId(save);
      const result = completeCareerDay(seasonStateOf(save), save.seed, managed);
      if (!result.ok) throw new Error(JSON.stringify(result.error));
      save = withDayResult(save, result.state);
    }
    const turned = advanceCareerSeason(save, "2026-10-21T00:00:00.000Z");
    if (!turned.ok) throw new Error(JSON.stringify(turned.error));
    expect(turned.save.cupHistory).toHaveLength(1);
    expect(turned.save.cupHistory[0]?.competitionId).toBe("copa-teste");
    expect(migrateSave(JSON.parse(JSON.stringify(turned.save))).status).toBe("ok");
  }, 300_000);
});
