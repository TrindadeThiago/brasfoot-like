import { completeCareerDay, generateWorldBank, type ModPackage } from "@brasfoot-like/engine";
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

// 022 (T062): com as duas competições entre países o save e o tempo ficam dentro das metas da 020.
// O mundo é menor que o de 400 clubes (a ferramenta `pnpm sim:world --continental` mede o grande);
// aqui basta não regredir: as metas valem inteiras para este mundo, que é mais leve.
const NOW = "2026-10-25T12:00:00.000Z";
const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;

describe("tamanho e tempo com as taças continentais (022 US6)", () => {
  const bank = structuredClone(
    generateWorldBank({
      seed: "escala-continental",
      countries: 6,
      divisionsPerCountry: 1,
      clubsPerDivision: 12,
      cup: true,
      continental: "full",
    }),
  ) as ModPackage;
  const major = bank.competitions.find((entry) => entry.countryId === undefined);
  const created = createSave({
    id: "escala",
    now: NOW,
    managerName: "Ana",
    clubId: major?.divisions[0]?.clubIds[0] ?? "",
    seed: "escala-continental",
    defaultBank: bank,
    noFiring: true,
  });
  if (!created.ok) throw new Error(JSON.stringify(created.error));

  it("três temporadas: dia, virada e tamanho do save dentro das metas", () => {
    let save: SaveFile = created.save;
    const startSizes: number[] = [];
    const lastRound: number[] = [];
    const days: number[] = [];
    const turnovers: number[] = [];
    for (let season = 0; season < 3; season++) {
      startSizes.push(JSON.stringify(save).length);
      let last = 0;
      while (!isCareerSeasonOver(save)) {
        const t0 = performance.now();
        const managed = save.clubId;
        const result = completeCareerDay(seasonStateOf(save), save.seed, managed, undefined, {
          [managed]: save.lineup,
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
    expect(save.continentalHistory).toHaveLength(6);
  }, 900_000);
});
