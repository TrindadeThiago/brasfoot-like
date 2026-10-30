import {
  completeCareerDay,
  DEFAULT_PROFILE,
  generateFootballWorld,
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

// 024 (T043): no mundo compacto o save e o tempo ficam dentro das metas da 020 (`SCALE_LIMITS`). O perfil
// padrão é medido por `pnpm sim:world --football-world`; aqui basta não regredir.
const NOW = "2026-10-27T12:00:00.000Z";
const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;

describe("tamanho e tempo no mundo compacto (024 US4)", () => {
  const bank = structuredClone(
    generateFootballWorld(DEFAULT_PROFILE, "escala-mundo"),
  ) as ModPackage;
  const brazilian = bank.clubs.find((club) => club.countryId === "brasil");
  const created = createSave({
    id: "escala",
    now: NOW,
    managerName: "Ana",
    clubId: brazilian?.id ?? "",
    seed: "escala-mundo",
    defaultBank: bank,
    noFiring: true,
  });
  if (!created.ok) throw new Error(JSON.stringify(created.error));

  it("duas temporadas: dia, virada e tamanho do save dentro das metas da 020", () => {
    const limits = SCALE_LIMITS;
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
    expect(Math.max(...startSizes)).toBeLessThanOrEqual(limits.saveStart31Bytes);
    expect(Math.max(...lastRound)).toBeLessThanOrEqual(limits.saveLastRoundBytes);
    // Tempos com folga de 6×: a suíte roda em ~480 workers em paralelo e a virada medida chegou a 4,5×
    // o limite (27 s contra 6 s). A medição estrita é a da ferramenta de simulação (`pnpm sim:gates`);
    // aqui o teste só pega regressão grosseira.
    expect(median(days)).toBeLessThanOrEqual(limits.dayMs * 6);
    expect(median(turnovers)).toBeLessThanOrEqual(limits.turnoverMs * 6);
  }, 900_000);
});
