import { describe, expect, it } from "vitest";
import { advanceCareerDays, completeCareerDay } from "../../src/career/day";
import { availabilitySeason } from "../../src/career/injuries";
import { type CareerSeasonState, competitionSeason } from "../../src/career/season-state";
import type { LeagueSeason } from "../../src/career/types";
import { clubUnavailability } from "../../src/lineup/unavailability";
import { disciplineRules } from "../../src/season/discipline";
import { TOURNAMENT_ID, twoCompetitionsBank } from "../fixtures/two-competitions";
import { MANAGER, newState } from "./day-helpers";

const SEED = "disciplina";

function ok(result: { ok: boolean }): CareerSeasonState {
  const typed = result as { ok: true; state: CareerSeasonState } | { ok: false };
  if (!typed.ok) throw new Error(JSON.stringify(result));
  return typed.state;
}

/** Copia a liga com a situação do jogador alterada na divisão do clube dele. */
function withStatus(
  league: LeagueSeason,
  clubId: string,
  playerId: string,
  status: { yellows?: number; suspension?: number; injury?: number },
): LeagueSeason {
  return {
    ...league,
    divisions: league.divisions.map((season) =>
      season.clubIds.includes(clubId)
        ? {
            ...season,
            status: {
              ...season.status,
              [playerId]: { yellows: 0, suspension: 0, injury: 0, ...status },
            },
          }
        : season,
    ),
  };
}

const world = twoCompetitionsBank();
const player = world.players.find((entry) => entry.clubId === MANAGER && entry.position !== "GK");
if (!player) throw new Error("sem jogador");

describe("suspensões por competição (017 US7, FR-023 a FR-026)", () => {
  it("expulso na liga: livre no torneio e suspenso no próximo jogo da liga", () => {
    const state = newState(world, SEED);
    const suspended: CareerSeasonState = {
      ...state,
      league: withStatus(state.league, MANAGER, player.id, { suspension: 1 }),
    };
    const principal = availabilitySeason(
      suspended.league,
      suspended.league,
      suspended.world,
      MANAGER,
    );
    const cup = availabilitySeason(
      suspended.league,
      competitionSeason(suspended, TOURNAMENT_ID),
      suspended.world,
      MANAGER,
    );
    if (!principal || !cup) throw new Error("sem temporada");
    expect(
      clubUnavailability(principal, suspended.world, MANAGER).map((u) => u.playerId),
    ).toContain(player.id);
    expect(clubUnavailability(cup, suspended.world, MANAGER).map((u) => u.playerId)).not.toContain(
      player.id,
    );
  });

  it("cartões de uma competição não mexem na situação da outra", () => {
    const state = newState(world, SEED);
    const wednesday = ok(advanceCareerDays(state, { days: 2 }, SEED, MANAGER));
    const after = ok(completeCareerDay(wednesday, SEED, MANAGER));
    const cards = (league: LeagueSeason) =>
      league.divisions.map((season) =>
        Object.entries(season.status)
          .filter(([, entry]) => entry.yellows > 0 || entry.suspension > 0)
          .map(([id, entry]) => [id, entry.yellows, entry.suspension]),
      );
    // O dia é só do torneio: a situação de cartões da liga não muda.
    expect(cards(after.league)).toEqual(cards(wednesday.league));
    const cup = after.competitions[0];
    expect(cup?.divisions[0]?.records.length).toBe(5);
  });

  it("as regras de cartões da competição valem só para ela", () => {
    const custom = twoCompetitionsBank((tournament) => {
      tournament.discipline = { yellowsForSuspension: 1, matchesPerRed: 3 };
    });
    expect(disciplineRules(custom, TOURNAMENT_ID)).toEqual({
      yellowsForSuspension: 1,
      matchesPerRed: 3,
    });
    const main = custom.competitions[0]?.id as string;
    expect(disciplineRules(custom, main)).toEqual({ yellowsForSuspension: 3, matchesPerRed: 1 });
    const state = newState(custom, SEED);
    expect(state.competitions[0]?.divisions[0]?.rules).toEqual({
      yellowsForSuspension: 1,
      matchesPerRed: 3,
    });
    expect(state.league.divisions[0]?.rules).toEqual({ yellowsForSuspension: 3, matchesPerRed: 1 });
  });
});

describe("lesões valem para todas as competições (017 R6, FR-025)", () => {
  it("lesionado na liga fica de fora do torneio e o tempo cai uma vez por jogo", () => {
    const state = newState(world, SEED);
    const wednesday = ok(advanceCareerDays(state, { days: 2 }, SEED, MANAGER));
    const hurt: CareerSeasonState = {
      ...wednesday,
      league: withStatus(wednesday.league, MANAGER, player.id, { injury: 3 }),
    };
    const after = ok(completeCareerDay(hurt, SEED, MANAGER));
    const record = after.competitions[0]?.divisions[0]?.records.find(
      (entry) => entry.home === MANAGER || entry.away === MANAGER,
    );
    const side = record?.home === MANAGER ? "home" : "away";
    expect(record?.unavailable[side].some((absence) => absence.playerId === player.id)).toBe(true);
    // Perdeu o jogo do torneio: faltam 2 partidas, na liga e no torneio.
    const principal = after.league.divisions.find((season) => season.clubIds.includes(MANAGER));
    expect(principal?.status[player.id]?.injury).toBe(2);
    const cup = after.competitions[0]?.divisions[0]?.status[player.id];
    expect(cup?.injury).toBe(2);
  });

  it("depois de um dia do torneio, a lesão dos jogadores dos clubes que jogaram é igual nas duas", () => {
    const state = newState(world, SEED);
    const start = ok(advanceCareerDays(state, { days: 2 }, SEED, MANAGER));
    // Quarta do torneio: 5 jogos, 10 clubes.
    const after = ok(completeCareerDay(start, SEED, MANAGER));
    const cup = after.competitions[0]?.divisions[0];
    if (!cup) throw new Error("sem torneio");
    const clubs = new Set(
      cup.records.filter((record) => record.round === 1).flatMap((r) => [r.home, r.away]),
    );
    expect(clubs.size).toBe(10);
    for (const athlete of after.world.players) {
      if (!clubs.has(athlete.clubId)) continue;
      const main = after.league.divisions.find((season) => season.clubIds.includes(athlete.clubId));
      expect(main?.status[athlete.id]?.injury ?? 0).toBe(cup.status[athlete.id]?.injury ?? 0);
    }
  });
});
