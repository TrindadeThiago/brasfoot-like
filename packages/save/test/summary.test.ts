import { describe, expect, it } from "vitest";
import { SAVE_FORMAT_VERSION, summarize, touch } from "../src";
import { validSave } from "./fixtures";

describe("summarize e touch", () => {
  it("resume a carreira para a lista", () => {
    const save = validSave();
    const club = save.bank.clubs.find((entry) => entry.id === save.clubId);
    expect(summarize(save)).toEqual({
      id: save.id,
      formatVersion: SAVE_FORMAT_VERSION,
      managerName: "Ana Souza",
      clubId: save.clubId,
      clubName: club?.name,
      clubCrest: club?.crest,
      divisionLevel: 1,
      divisionName: "Série A",
      seasonYear: 2027,
      round: 1,
      totalRounds: 38,
      seasonOver: false,
      savedAt: save.savedAt,
    });
  });

  it("limita a rodada à última e marca temporada encerrada", () => {
    const save = validSave();
    for (const season of save.league.divisions) season.nextRound = 39;
    expect(summarize(save)).toMatchObject({ round: 38, seasonOver: true });
  });

  it("touch só muda savedAt", () => {
    const save = validSave();
    const touched = touch(save, "2027-01-01T00:00:00.000Z");
    expect(touched).toEqual({ ...save, savedAt: "2027-01-01T00:00:00.000Z" });
  });
});
