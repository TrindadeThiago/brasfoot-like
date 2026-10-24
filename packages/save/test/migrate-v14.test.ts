import { generateStagesBank } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import {
  advanceCareerSeason,
  createSave,
  exportSave,
  importSave,
  isCareerSeasonOver,
  migrateSave,
  type SaveFile,
} from "../src";
import { playDay, type SaveV11Step, saveV13 } from "./fixtures";

// 019 (T071): a migração v13 → v14 só sobe a versão; os campos de fases são opcionais.
const STEPS: [string, SaveV11Step][] = [
  ["início da temporada", { rounds: 0 }],
  ["depois de 17 rodadas", { rounds: 17 }],
  ["fim da temporada", { toEnd: true }],
  ["depois de 3 temporadas", { seasons: 3 }],
];

describe("migração v13 → v14 (019 R13, FR-033)", () => {
  it.each(STEPS)(
    "%s: abre na mesma rodada, com o mesmo histórico e sem fases",
    (_label, step) => {
      const v13 = saveV13(step);
      const result = migrateSave(v13);
      if (result.status !== "ok") throw new Error(JSON.stringify(result));
      expect(result.migratedFrom).toBe(13);
      expect(result.save.formatVersion).toBe(15);
      const { formatVersion: _a, ...rest } = result.save;
      const { formatVersion: _b, ...restV13 } = v13;
      expect(rest).toEqual(restV13);
      for (const league of [result.save.league, ...result.save.competitions]) {
        expect(league.divisions.every((season) => season.stages === undefined)).toBe(true);
      }
    },
    120_000,
  );

  it("o save migrado a meio da temporada joga até a virada", () => {
    const result = migrateSave(saveV13({ rounds: 17 }));
    if (result.status !== "ok") throw new Error(JSON.stringify(result));
    let save: SaveFile = result.save;
    while (!isCareerSeasonOver(save)) save = playDay(save);
    expect(advanceCareerSeason(save, "2026-10-23T00:00:00.000Z").ok).toBe(true);
  }, 300_000);

  it("um arquivo exportado na v13 passa pela mesma migração ao importar", () => {
    const bytes = exportSave(
      saveV13({ rounds: 5 }) as unknown as SaveFile,
      "2026-10-23T00:00:00.000Z",
    );
    const result = importSave(bytes);
    if (result.status !== "ok") throw new Error(JSON.stringify(result));
    expect(result.migratedFrom).toBe(13);
    expect(result.save.formatVersion).toBe(15);
  }, 120_000);
});

describe("integridade de uma carreira em fases", () => {
  function stagedSave(): SaveFile {
    const created = createSave({
      id: "fases",
      now: "2026-10-23T00:00:00.000Z",
      managerName: "Ana",
      clubId: "clube-021",
      seed: "integridade-fases",
      defaultBank: generateStagesBank({ topClubs: 8 }),
      noFiring: true,
    });
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    return created.save;
  }

  it("um save em fases no começo e depois dos grupos abre sem mudar nada", () => {
    let save = stagedSave();
    for (let day = 0; day <= 5; day++) {
      const reopened = migrateSave(JSON.parse(JSON.stringify(save)));
      if (reopened.status !== "ok") throw new Error(JSON.stringify(reopened));
      expect(reopened.save).toEqual(save);
      save = playDay(save);
    }
  }, 300_000);

  it("rodadas das fases que não cobrem o calendário são corrupt", () => {
    const save = JSON.parse(JSON.stringify(stagedSave())) as SaveFile;
    const lower = save.league.divisions.find((season) => season.stages);
    const first = lower?.stages?.[0];
    if (!first) throw new Error("sem fases");
    first.rounds = first.rounds.slice(1);
    expect(migrateSave(save).status).toBe("corrupt");
  }, 120_000);

  it("fase que não começou mas já tem jogos é corrupt", () => {
    const save = JSON.parse(JSON.stringify(stagedSave())) as SaveFile;
    const lower = save.league.divisions.find((season) => season.stages);
    const second = lower?.stages?.[1];
    if (!lower || !second) throw new Error("sem fases");
    const round = lower.calendar[(second.rounds[0] ?? 1) - 1];
    round?.fixtures.push({ round: round.number, home: "clube-021", away: "clube-022", seed: "x" });
    expect(migrateSave(save).status).toBe("corrupt");
  }, 120_000);

  it("grupos que não reúnem os clubes da fase são corrupt", () => {
    const save = JSON.parse(JSON.stringify(stagedSave())) as SaveFile;
    const lower = save.league.divisions.find((season) => season.stages);
    const groups = lower?.stages?.[0]?.groups;
    if (!groups?.[0]) throw new Error("sem grupos");
    groups[0].clubIds = groups[0].clubIds.slice(1);
    expect(migrateSave(save).status).toBe("corrupt");
  }, 120_000);
});
