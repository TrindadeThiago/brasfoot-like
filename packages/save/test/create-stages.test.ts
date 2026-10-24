import { generateStagesBank } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import {
  advanceCareerSeason,
  createSave,
  exportSave,
  importSave,
  isCareerSeasonOver,
  type SaveFile,
  userSeason,
} from "../src";
import { playDay } from "./fixtures";

// 019 (T072): carreira no banco de exemplo das fases, de ponta a ponta no pacote de save.
const NOW = "2026-10-23T00:00:00.000Z";

function newCareer(): SaveFile {
  const created = createSave({
    id: "fases",
    now: NOW,
    managerName: "Ana",
    clubId: "clube-021",
    seed: "carreira-fases",
    defaultBank: generateStagesBank({ topClubs: 8 }),
    noFiring: true,
  });
  if (!created.ok) throw new Error(JSON.stringify(created.error));
  return created.save;
}

function playSeason(start: SaveFile): SaveFile {
  let save = start;
  while (!isCareerSeasonOver(save)) save = playDay(save);
  return save;
}

describe("carreira numa divisão em fases", () => {
  it("o clube do jogador está na divisão em grupos e a carreira vira duas temporadas", () => {
    let save = newCareer();
    expect(userSeason(save).stages?.map((stage) => stage.kind)).toEqual(["groups", "knockout"]);
    for (let season = 0; season < 2; season++) {
      save = playSeason(save);
      const turned = advanceCareerSeason(save, NOW);
      if (!turned.ok) throw new Error(JSON.stringify(turned.error));
      save = turned.save;
      expect(save.league.divisions).toHaveLength(2);
      expect(save.history).toHaveLength(season + 1);
    }
    const lower = save.league.divisions.find((division) => division.stages);
    expect(lower?.clubIds).toHaveLength(20);
    expect(lower?.stages?.[0]?.started).toBe(true);
  }, 600_000);

  it("exportar e importar no meio dos grupos e no meio do mata-mata não muda o resto da carreira", () => {
    const straight = (() => {
      let save = newCareer();
      save = playSeason(save);
      const turned = advanceCareerSeason(save, NOW);
      if (!turned.ok) throw new Error(JSON.stringify(turned.error));
      return turned.save;
    })();
    for (const stopAfter of [3, 6]) {
      let save = newCareer();
      for (let day = 0; day < stopAfter; day++) save = playDay(save);
      const imported = importSave(exportSave(save, NOW));
      if (imported.status !== "ok") throw new Error(JSON.stringify(imported));
      save = playSeason(imported.save);
      const turned = advanceCareerSeason(save, NOW);
      if (!turned.ok) throw new Error(JSON.stringify(turned.error));
      expect(JSON.stringify(turned.save.league)).toBe(JSON.stringify(straight.league));
      expect(turned.save.history).toEqual(straight.history);
    }
  }, 600_000);
});
