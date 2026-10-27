import {
  completeCareerDay,
  generateRegionalBank,
  isRegionalOnly,
  type ModPackage,
} from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import {
  advanceCareerSeason,
  createSave,
  isCareerSeasonOver,
  type SaveFile,
  SCALE_LIMITS,
  seasonStateOf,
  withDayResult,
} from "../src";

// 023 (T056): com 27 estaduais de duas divisões o save e o tempo ficam dentro das metas da 020. A
// ferramenta `pnpm sim:world --regional` mede as 30 temporadas; aqui basta não regredir.
const NOW = "2026-10-27T12:00:00.000Z";
const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;

describe("tamanho e tempo com 27 estaduais (023 SC-004)", () => {
  const bank = structuredClone(
    generateRegionalBank({ seed: "escala-estaduais", states: 27 }),
  ) as ModPackage;
  const national = bank.clubs.find((club) => !isRegionalOnly(bank, club.id));
  const created = createSave({
    id: "escala",
    now: NOW,
    managerName: "Ana",
    clubId: national?.id ?? "",
    seed: "escala-estaduais",
    defaultBank: bank,
    noFiring: true,
  });
  if (!created.ok) throw new Error(JSON.stringify(created.error));

  it("duas temporadas: dia, virada e tamanho do save dentro das metas", () => {
    let save: SaveFile = created.save;
    const startSizes: number[] = [];
    const lastRound: number[] = [];
    const days: number[] = [];
    const turnovers: number[] = [];
    for (let season = 0; season < 2; season++) {
      startSizes.push(JSON.stringify(save).length);
      let last = 0;
      while (!isCareerSeasonOver(save)) {
        const t0 = performance.now();
        const result = completeCareerDay(seasonStateOf(save), save.seed, save.clubId, undefined, {
          [save.clubId]: save.lineup,
        });
        if (!result.ok) throw new Error(JSON.stringify(result.error));
        save = withDayResult(save, result.state);
        days.push(performance.now() - t0);
        last = JSON.stringify(save).length;
      }
      lastRound.push(last);
      const t1 = performance.now();
      const turned = advanceCareerSeason(save, NOW);
      if (!turned.ok) throw new Error(JSON.stringify(turned.error));
      turnovers.push(performance.now() - t1);
      save = turned.save;
    }
    expect(Math.max(...startSizes)).toBeLessThanOrEqual(SCALE_LIMITS.saveStart31Bytes);
    expect(Math.max(...lastRound)).toBeLessThanOrEqual(SCALE_LIMITS.saveLastRoundBytes);
    expect(median(days)).toBeLessThanOrEqual(SCALE_LIMITS.dayMs);
    expect(median(turnovers)).toBeLessThanOrEqual(SCALE_LIMITS.turnoverMs);
    expect(save.regionalHistory).toHaveLength(54);
  }, 900_000);
});
