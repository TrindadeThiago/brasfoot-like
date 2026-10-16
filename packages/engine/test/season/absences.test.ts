import { describe, expect, it } from "vitest";
import { advanceSeason } from "../../src/season/season";
import type { MatchRecord, Season } from "../../src/season/types";
import { newSeason, playedSeason, testWorld } from "./helpers/world";

const SEEDS = [11, 12, 13, 14, 15];

/** Partidas do clube, em ordem de rodada. */
function clubRecords(season: Season, clubId: string): MatchRecord[] {
  return season.records.filter((record) => record.home === clubId || record.away === clubId);
}

describe("suspensões e lesões respeitadas (FR-019, SC-003)", () => {
  it.each(SEEDS)("seed %i: nenhum indisponível entra em campo", (seed) => {
    for (const record of playedSeason(seed).records) {
      for (const side of ["home", "away"] as const) {
        for (const absence of record.unavailable[side]) {
          if (!absence.fielded) expect(record.players[absence.playerId]).toBeUndefined();
        }
      }
    }
  });

  it.each(SEEDS)("seed %i: expulso fica fora da partida seguinte do clube", (seed) => {
    const season = playedSeason(seed);
    for (const clubId of season.clubIds) {
      const games = clubRecords(season, clubId);
      games.forEach((record, index) => {
        const next = games[index + 1];
        if (!next) return;
        for (const [playerId, playerLine] of Object.entries(record.players)) {
          const isClub = (playerLine.side === "home" ? record.home : record.away) === clubId;
          if (isClub && playerLine.red) {
            const side = next.home === clubId ? "home" : "away";
            expect(next.unavailable[side].map((absence) => absence.playerId)).toContain(playerId);
          }
        }
      });
    }
  });

  it.each(SEEDS)("seed %i: há suspensões e lesões ao longo da temporada", (seed) => {
    const absences = playedSeason(seed).records.flatMap((record) => [
      ...record.unavailable.home,
      ...record.unavailable.away,
    ]);
    expect(absences.some((absence) => absence.reason === "suspension")).toBe(true);
    expect(absences.some((absence) => absence.reason === "injury")).toBe(true);
  });

  it("lesionado volta depois do afastamento", () => {
    const season = playedSeason(11);
    const injured = season.records.flatMap((record) =>
      Object.entries(record.players)
        .filter(([, playerLine]) => playerLine.injury === "minor")
        .map(([playerId]) => ({ playerId, round: record.round })),
    );
    const sample = injured.find(({ round }) => round < 30);
    expect(sample).toBeDefined();
    if (!sample) return;
    const later = season.records.filter((record) => record.round > sample.round + 3);
    expect(later.some((record) => record.players[sample.playerId] !== undefined)).toBe(true);
  });

  it("elenco curto: completa com indisponíveis e registra aviso (FR-020)", () => {
    const season: Season = JSON.parse(JSON.stringify(newSeason(21)));
    const fixture = season.calendar[0]?.fixtures[0];
    if (!fixture) throw new Error("sem jogo");
    const squad = testWorld().players.filter((player) => player.clubId === fixture.home);
    for (const player of squad.slice(0, squad.length - 8)) {
      season.status[player.id] = { yellows: 0, suspension: 0, injury: 2 };
    }
    const result = advanceSeason(season, testWorld(), { rounds: 1 });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    const record = result.season.records.find((entry) => entry.home === fixture.home);
    expect(record?.unavailable.home.some((absence) => absence.fielded)).toBe(true);
    expect(result.season.warnings).toContainEqual(
      expect.objectContaining({ round: 1, clubId: fixture.home, code: "short_squad" }),
    );
    expect(
      Object.keys(record?.players ?? {}).filter((id) => squad.some((player) => player.id === id))
        .length,
    ).toBeGreaterThanOrEqual(11);
  });
});
