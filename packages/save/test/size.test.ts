import {
  completeCareerRound,
  finishRound,
  isLeagueSeasonOver,
  startLeagueRound,
} from "@brasfoot-like/engine";
import { beforeAll, describe, expect, it } from "vitest";
import {
  advanceCareerSeason,
  createSave,
  managedClubId,
  migrateSave,
  type SaveFile,
  withRoundResult,
} from "../src";
import { defaultBank, SERIE_A } from "./fixtures";

// Critério de aceite 3 da 014 (research.md R11). Limites declarados aqui.
const SEASONS = 30;
const MAX_START_OF_SEASON_31 = 1.6 * 1024 * 1024;
const MAX_GROWTH_PER_SEASON = 30 * 1024;
const MAX_LAST_ROUND = 4.5 * 1024 * 1024;

const sizeOf = (save: SaveFile) => JSON.stringify(save).length;

function playRound(save: SaveFile): SaveFile {
  const managed = managedClubId(save);
  const started = startLeagueRound(
    save.league,
    save.bank,
    managed ? { [managed]: save.lineup } : undefined,
  );
  if (!started.ok) throw new Error(JSON.stringify(started.error));
  const result = completeCareerRound(
    save.league,
    save.finances,
    save.bank,
    finishRound(started.round),
    managed,
    { state: save.renewal, careerSeed: save.seed },
    { state: save.market, careerSeed: save.seed },
    { state: save.board, careerSeed: save.seed },
    { state: save.fans },
    { state: save.news, careerSeed: save.seed },
  );
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return withRoundResult(save, result);
}

describe("tamanho do save em 30 temporadas (014 critério de aceite 3, SC-003)", () => {
  const startOfSeason: number[] = [];
  const lastRound: number[] = [];
  let final: SaveFile;
  beforeAll(() => {
    const created = createSave({
      id: "tamanho",
      now: "2026-10-20T00:00:00.000Z",
      managerName: "Ana",
      clubId: SERIE_A[0] as string,
      seed: "tamanho",
      defaultBank: defaultBank(),
      noFiring: true,
    });
    if (!created.ok) throw new Error("criação");
    let save = created.save;
    for (let season = 1; season <= SEASONS; season++) {
      startOfSeason.push(sizeOf(save));
      while (!isLeagueSeasonOver(save.league)) save = playRound(save);
      lastRound.push(sizeOf(save));
      const turned = advanceCareerSeason(save, "2026-10-20T00:00:00.000Z");
      if (!turned.ok) throw new Error(JSON.stringify(turned.error));
      save = turned.save;
    }
    startOfSeason.push(sizeOf(save));
    final = save;
  }, 1_200_000);

  it("início da temporada 31 abaixo do limite", () => {
    const kb = (bytes: number) => Math.round(bytes / 1024);
    console.log(
      "início de temporada (KB):",
      startOfSeason.map(kb).join(" "),
      "| última rodada (KB):",
      lastRound.map(kb).join(" "),
    );
    expect(startOfSeason.at(-1)).toBeLessThanOrEqual(MAX_START_OF_SEASON_31);
  });

  it("crescimento médio por temporada entre a 10ª e a 30ª abaixo do limite", () => {
    const growth = ((startOfSeason[30] ?? 0) - (startOfSeason[10] ?? 0)) / 20;
    expect(growth).toBeLessThanOrEqual(MAX_GROWTH_PER_SEASON);
  });

  it("nenhuma última rodada passa do limite", () => {
    expect(Math.max(...lastRound)).toBeLessThanOrEqual(MAX_LAST_ROUND);
  });

  it("o save final abre sem erro", () => {
    expect(migrateSave(JSON.parse(JSON.stringify(final))).status).toBe("ok");
  });
});
