// 031 R8: quantidade, ordem e rótulos das carreiras salvas.
import { describe, expect, it } from "vitest";
import { savesView } from "../../src/game/saves-view";
import type { SummaryEntry } from "../../src/storage/indexeddb";

function entry(id: string, over: Partial<SummaryEntry> = {}): SummaryEntry {
  return {
    id,
    formatVersion: 1,
    managerName: `Técnico ${id}`,
    clubId: `club-${id}`,
    clubName: `Clube ${id}`,
    clubCrest: { shape: "classic", colors: ["#111111", "#eeeeee"], initials: "C" },
    divisionLevel: 1,
    divisionName: "Série A",
    seasonYear: 2026,
    round: 7,
    totalRounds: 38,
    seasonOver: false,
    savedAt: "2026-10-16T10:00:00.000Z",
    status: "ok",
    ...over,
  };
}

describe("savesView (031)", () => {
  it("a quantidade conta todas as carreiras, inclusive corrompidas e de versão futura", () => {
    const view = savesView([
      entry("a"),
      entry("b", { status: "future_version" }),
      entry("c", { status: "corrupt", savedAt: "" }),
    ]);
    expect(view.count).toBe(3);
    expect(view.rows).toHaveLength(3);
  });

  it("sem carreiras a quantidade é zero e a lista é vazia", () => {
    expect(savesView([])).toEqual({ count: 0, rows: [] });
  });

  it("ordena da mais recente para a mais antiga e deixa a corrompida (sem data) por último", () => {
    const view = savesView([
      entry("antiga", { savedAt: "2026-10-01T10:00:00.000Z" }),
      entry("quebrada", { status: "corrupt", savedAt: "" }),
      entry("nova", { savedAt: "2026-10-20T10:00:00.000Z" }),
    ]);
    expect(view.rows.map((row) => row.id)).toEqual(["nova", "antiga", "quebrada"]);
  });

  it("o progresso diz a rodada ou que a temporada terminou, com os mesmos parâmetros de hoje", () => {
    const [playing, over] = savesView([
      entry("a", { savedAt: "2026-10-20T10:00:00.000Z" }),
      entry("b", { seasonOver: true, seasonYear: 2027, savedAt: "2026-10-10T10:00:00.000Z" }),
    ]).rows;
    expect(playing?.progress).toEqual({
      key: "saves.progress",
      params: { year: 2026, round: 7, division: "Série A" },
    });
    expect(over?.progress).toEqual({
      key: "saves.seasonOver",
      params: { year: 2027, division: "Série A" },
    });
  });

  it("só a carreira em estado ok pode continuar e ser exportada; as outras só podem ser apagadas", () => {
    const rows = savesView([
      entry("ok", { savedAt: "2026-10-03T10:00:00.000Z" }),
      entry("futura", { status: "future_version", savedAt: "2026-10-02T10:00:00.000Z" }),
      entry("quebrada", { status: "corrupt", savedAt: "" }),
    ]).rows;
    expect(rows.map((row) => [row.id, row.canOpen])).toEqual([
      ["ok", true],
      ["futura", false],
      ["quebrada", false],
    ]);
  });
});
