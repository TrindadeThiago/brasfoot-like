import { advanceLeague, leagueRound, nextComposition, seasonDate } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import {
  advanceCareerSeason,
  createSave,
  currentDate,
  migrateSave,
  type SaveFile,
  seasonYearOf,
  summarize,
  userDivisionLevel,
  userSeason,
} from "../src";
import { defaultBank, SERIE_A, SERIE_B, validSave } from "./fixtures";

describe("carreira na liga (R10, FR-023)", () => {
  it("cria a carreira com um clube da Série B", () => {
    const clubId = SERIE_B[5] as string;
    const result = createSave({
      id: "carreira-b",
      now: "2026-10-19T12:00:00.000Z",
      managerName: "Bia",
      clubId,
      seed: "serie-b",
      defaultBank: defaultBank(),
    });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    const { save } = result;
    expect(userDivisionLevel(save)).toBe(2);
    expect(userSeason(save).clubIds).toContain(clubId);
    const squad = new Set(
      save.bank.players.filter((player) => player.clubId === clubId).map((player) => player.id),
    );
    expect(Object.values(save.lineup.starters).every((id) => squad.has(id))).toBe(true);
    expect(save.league.divisions).toHaveLength(2);
    expect(save.history).toEqual([]);
  });

  it("recusa clube que não disputa a competição", () => {
    const result = createSave({
      id: "x",
      now: "2026-10-19T12:00:00.000Z",
      managerName: "Bia",
      clubId: "clube-999",
      seed: "x",
      defaultBank: defaultBank(),
    });
    expect(result).toEqual({
      ok: false,
      error: { code: "save.club_not_in_league", params: { clubId: "clube-999" } },
    });
  });

  it("encontra a divisão do jogador", () => {
    const save = validSave();
    expect(userDivisionLevel(save)).toBe(1);
    expect(userSeason(save)).toBe(save.league.divisions[0]);
    expect(userSeason(validSave(SERIE_B[0])).divisionLevel).toBe(2);
  });

  it("ano e data vêm da temporada da liga", () => {
    const save = validSave();
    save.league.year = 2031;
    expect(seasonYearOf(save)).toBe(2031);
    expect(currentDate(save)).toBe(seasonDate(save.bank.manifest.referenceDate, 2031));
  });

  it("o resumo usa a liga e informa a divisão", () => {
    const save = validSave(SERIE_B[0]);
    expect(summarize(save)).toMatchObject({
      clubId: SERIE_B[0],
      divisionLevel: 2,
      seasonYear: save.league.year,
      round: leagueRound(save.league),
      totalRounds: 38,
      seasonOver: false,
    });
    expect(SERIE_A).toHaveLength(20);
  });
});

describe("virada da carreira (US2, contracts/save-format-v3.md)", () => {
  function finished(clubId?: string): SaveFile {
    const save = validSave(clubId);
    const played = advanceLeague(save.league, save.bank, { toEnd: true });
    if (!played.ok) throw new Error(JSON.stringify(played.error));
    return { ...save, league: played.league };
  }

  it("mantém o clube, leva à divisão certa, grava o histórico e avança o ano", () => {
    const save = finished(SERIE_A[0]);
    const moves = nextComposition(save.league, save.bank);
    const result = advanceCareerSeason(save, "2026-10-20T00:00:00.000Z");
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    const next = result.save;
    expect(next.clubId).toBe(save.clubId);
    expect(next.savedAt).toBe("2026-10-20T00:00:00.000Z");
    expect(next.league.year).toBe(save.league.year + 1);
    expect(next.league.number).toBe(2);
    expect(next.history).toHaveLength(1);
    const expectedLevel = moves.composition[1]?.includes(save.clubId) ? 1 : 2;
    expect(userDivisionLevel(next)).toBe(expectedLevel);
    expect(userSeason(next).formations[save.clubId]).toBe(save.lineup.formation);
    expect(leagueRound(next.league)).toBe(1);
  }, 60000);

  it("ajusta a escalação às lesões herdadas", () => {
    const save = finished(SERIE_A[0]);
    const keeper = save.lineup.starters.gk as string;
    const own = userSeason(save);
    own.status[keeper] = { yellows: 0, suspension: 0, injury: 4 };
    const result = advanceCareerSeason(save, "2026-10-20T00:00:00.000Z");
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(Object.values(result.save.lineup.starters)).not.toContain(keeper);
    expect(result.save.lineupNotice?.length ?? 0).toBeGreaterThan(0);
    expect(userSeason(result.save).status[keeper]).toEqual({
      yellows: 0,
      suspension: 0,
      injury: 4,
    });
  }, 60000);

  it("recusa carreira com a temporada em andamento", () => {
    const result = advanceCareerSeason(validSave(), "2026-10-20T00:00:00.000Z");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("turnover.season_not_over");
  });

  it("é determinística e o resultado é um save v3 válido", () => {
    const save = finished(SERIE_B[0]);
    const first = advanceCareerSeason(save, "2026-10-20T00:00:00.000Z");
    const again = advanceCareerSeason(save, "2026-10-20T00:00:00.000Z");
    expect(again).toEqual(first);
    if (!first.ok) throw new Error("falhou");
    const opened = migrateSave(JSON.parse(JSON.stringify(first.save)));
    expect(opened.status).toBe("ok");
  }, 60000);
});
