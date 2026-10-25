import { describe, expect, it } from "vitest";
import { completeCareerDay } from "../../src/career/day";
import { clubDivision } from "../../src/career/league";
import type { CareerSeasonState } from "../../src/career/season-state";
import { competitionSeason, currentDay } from "../../src/career/season-state";
import { mainLeagueOfClub } from "../../src/world/leagues";
import { CONTINENTAL_IDS } from "../../src/worldgen/continental";
import { compactState, continentalLeague } from "./continental-helpers";
import { ok } from "./qualification-helpers";

/** Avança até o primeiro dia em que a taça joga (sem fechá-lo). */
function toContinentalDay(state: CareerSeasonState, seed: string, manager: string) {
  let current = state;
  for (;;) {
    const day = currentDay(current);
    if (!day) throw new Error("a taça nunca jogou");
    if (day.slots.some((slot) => slot.competitionId === CONTINENTAL_IDS.major)) return current;
    current = ok(completeCareerDay(current, seed, manager)).state;
  }
}

describe("lesões na taça continental (022 US1, 017 R6)", () => {
  it("a lesão de um jogador estrangeiro, registrada na liga dele, vale na taça", () => {
    const { state, manager, seed } = compactState({ seed: "continental-lesoes" });
    const start = toContinentalDay(state, seed, manager);
    const managerCountry = start.world.clubs.find((club) => club.id === manager)?.countryId;
    const members = continentalLeague(start).divisions[0]?.clubIds ?? [];
    const foreign = members.find(
      (id) => start.world.clubs.find((club) => club.id === id)?.countryId !== managerCountry,
    );
    if (!foreign) throw new Error("sem clube estrangeiro");
    const player = start.world.players.find((entry) => entry.clubId === foreign);
    if (!player) throw new Error("clube sem jogadores");

    // Registra a lesão na liga principal do país do clube estrangeiro.
    const home = mainLeagueOfClub(start, foreign);
    if (!home) throw new Error("sem liga do país");
    const injured: CareerSeasonState = {
      ...start,
      competitions: start.competitions.map((league) =>
        league.competitionId !== home.competitionId
          ? league
          : {
              ...league,
              divisions: league.divisions.map((season) =>
                season.clubIds.includes(foreign)
                  ? {
                      ...season,
                      status: {
                        ...season.status,
                        [player.id]: { yellows: 0, suspension: 0, injury: 30 },
                      },
                    }
                  : season,
              ),
            },
      ),
    };
    const after = ok(completeCareerDay(injured, seed, manager)).state;
    const record = competitionSeason(after, CONTINENTAL_IDS.major)
      .divisions.flatMap((season) => season.records)
      .find((entry) => entry.home === foreign || entry.away === foreign);
    const side = record?.home === foreign ? "home" : "away";
    expect(record?.unavailable[side].map((absence) => absence.playerId)).toContain(player.id);

    // E a lesão continua registrada na liga do país dele depois do jogo da taça.
    const after2 = after.competitions.find((league) => league.competitionId === home.competitionId);
    const season = after2 ? clubDivision(after2, foreign) : undefined;
    expect(season?.status[player.id]?.injury ?? 0).toBeGreaterThan(0);
  }, 300_000);
});
