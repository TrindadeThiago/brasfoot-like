import { describe, expect, it } from "vitest";
import {
  advanceCareerDays,
  advanceCareerToNextMatch,
  completeCareerDay,
  startCareerDay,
} from "../../src/career/day";
import type { CareerSeasonState } from "../../src/career/season-state";
import {
  calendarNext,
  currentDay,
  isCalendarOver,
  nextClubFixture,
} from "../../src/career/season-state";
import { fitnessFactorBp, fitnessOn } from "../../src/fitness/fitness";
import { DEFAULT_FITNESS } from "../../src/fitness/rules";
import { finishRound } from "../../src/season/live-round";
import { TOURNAMENT_ID, twoCompetitionsBank } from "../fixtures/two-competitions";
import { testWorld } from "../season/helpers/world";
import { MANAGER, newState } from "./day-helpers";

const SEED = "dia";

function ok<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result as Extract<T, { ok: true }>;
}

describe("startCareerDay (017 R4)", () => {
  const world = twoCompetitionsBank();

  it("devolve a rodada da competição do clube, com competição e data", () => {
    const state = newState(world, SEED);
    const { live } = ok(startCareerDay(state, MANAGER));
    expect(live).toBeDefined();
    expect(live?.competitionId).toBe(world.competitions[0]?.id);
    expect(live?.date).toBe("2027-01-03");
    expect(live?.round).toBe(1);
    expect(live?.matches.length).toBeGreaterThan(0);
  });

  it("não devolve rodada quando o clube não joga no dia", () => {
    const state = newState(world, SEED);
    // clube-040 não está no torneio: no 3º dia (quarta) ele não joga.
    const second = ok(advanceCareerDays(state, { days: 2 }, SEED, "clube-040")).state;
    expect(ok(startCareerDay(second, "clube-040")).live).toBeUndefined();
  });
});

describe("completeCareerDay (017 R4)", () => {
  const world = twoCompetitionsBank();

  it("avança o calendário um dia e a rodada da competição do dia", () => {
    const state = newState(world, SEED);
    const next = ok(completeCareerDay(state, SEED, MANAGER)).state;
    expect(calendarNext(next)).toBe(1);
    expect(next.league.divisions[0]?.nextRound).toBe(2);
    expect(next.competitions[0]?.divisions[0]?.nextRound).toBe(1);
    // A entrada não é alterada.
    expect(calendarNext(state)).toBe(0);
  });

  it("no dia do torneio, só o torneio avança", () => {
    const state = newState(world, SEED);
    const wednesday = ok(advanceCareerDays(state, { days: 2 }, SEED, MANAGER)).state;
    expect(currentDay(wednesday)?.slots).toEqual([{ competitionId: TOURNAMENT_ID, round: 1 }]);
    const next = ok(completeCareerDay(wednesday, SEED, MANAGER)).state;
    expect(next.competitions[0]?.divisions[0]?.nextRound).toBe(2);
    expect(next.competitions[0]?.divisions[0]?.records.length).toBeGreaterThan(0);
    expect(next.league.divisions[0]?.nextRound).toBe(wednesday.league.divisions[0]?.nextRound);
  });

  it("fecha todas as competições de um dia com mais de um slot", () => {
    const state = newState(world, SEED);
    const merged: CareerSeasonState = {
      ...state,
      calendar: {
        ...state.calendar,
        days: [
          {
            date: "2027-01-03",
            slots: [
              { competitionId: world.competitions[0]?.id as string, round: 1 },
              { competitionId: TOURNAMENT_ID, round: 1 },
            ],
          },
        ],
      },
    };
    const next = ok(completeCareerDay(merged, SEED, MANAGER)).state;
    expect(next.league.divisions[0]?.nextRound).toBe(2);
    expect(next.competitions[0]?.divisions[0]?.nextRound).toBe(2);
    expect(isCalendarOver(next)).toBe(true);
  });

  it("ao vivo e direto dão o mesmo resultado", () => {
    const state = newState(world, SEED);
    const direct = ok(completeCareerDay(state, SEED, MANAGER)).state;
    const { live } = ok(startCareerDay(state, MANAGER));
    if (!live) throw new Error("sem rodada");
    const viaLive = ok(completeCareerDay(state, SEED, MANAGER, finishRound(live))).state;
    expect(viaLive).toEqual(direct);
  });

  it("recusa a rodada de outro dia ou de outra competição", () => {
    const state = newState(world, SEED);
    const { live } = ok(startCareerDay(state, MANAGER));
    if (!live) throw new Error("sem rodada");
    const later = ok(advanceCareerDays(state, { days: 1 }, SEED, MANAGER)).state;
    expect(() => completeCareerDay(later, SEED, MANAGER, finishRound(live))).toThrow();
    const wednesday = ok(advanceCareerDays(state, { days: 2 }, SEED, MANAGER)).state;
    expect(() => completeCareerDay(wednesday, SEED, MANAGER, finishRound(live))).toThrow();
  });

  it("recusa avançar com a temporada encerrada", () => {
    const over = ok(advanceCareerDays(newState(world, SEED), { toEnd: true }, SEED, MANAGER)).state;
    expect(() => completeCareerDay(over, SEED, MANAGER)).toThrow();
  });
});

describe("advanceCareerToNextMatch (017 FR-011, FR-013)", () => {
  const world = twoCompetitionsBank();

  it("para no próximo jogo do clube: domingo, domingo, quarta, domingo…", () => {
    let state = newState(world, SEED);
    const dates: string[] = [];
    for (let step = 0; step < 6; step++) {
      state = ok(advanceCareerToNextMatch(state, SEED, MANAGER)).state;
      const next = nextClubFixture(state, MANAGER);
      dates.push(next?.date ?? "");
      expect(currentDay(state)?.date).toBe(next?.date);
      state = ok(completeCareerDay(state, SEED, MANAGER)).state;
    }
    expect(dates).toEqual([
      "2027-01-03",
      "2027-01-10",
      "2027-01-13",
      "2027-01-17",
      "2027-01-24",
      "2027-01-27",
    ]);
  });

  it("os dias sem jogo do clube são simulados e entram nas tabelas", () => {
    const state = newState(world, SEED);
    const afterOne = ok(completeCareerDay(state, SEED, "clube-040")).state;
    const afterTwo = ok(completeCareerDay(afterOne, SEED, "clube-040")).state;
    // clube-040 não joga a quarta: avançar pula o torneio e para no próximo domingo.
    const next = ok(advanceCareerToNextMatch(afterTwo, SEED, "clube-040")).state;
    expect(calendarNext(next)).toBe(3);
    expect(next.competitions[0]?.divisions[0]?.nextRound).toBe(2);
    expect(next.competitions[0]?.divisions[0]?.records.length).toBe(5);
  });

  it("sem jogos restantes, simula até o fim da temporada de todas as competições", () => {
    const longTournament = twoCompetitionsBank((tournament) => {
      tournament.format.rounds = 1;
      tournament.schedule = { weekday: 3, startWeek: 36, everyWeeks: 1 };
    });
    const state = newState(longTournament, SEED);
    const mainId = longTournament.competitions[0]?.id as string;
    const lastLeagueDay = state.calendar.days.findIndex((day) =>
      day.slots.some((slot) => slot.competitionId === mainId && slot.round === 38),
    );
    const finishedLeague = ok(
      advanceCareerDays(state, { days: lastLeagueDay + 1 }, SEED, "clube-040"),
    ).state;
    expect(nextClubFixture(finishedLeague, "clube-040")).toBeUndefined();
    expect(isCalendarOver(finishedLeague)).toBe(false);
    const over = ok(advanceCareerToNextMatch(finishedLeague, SEED, "clube-040")).state;
    expect(isCalendarOver(over)).toBe(true);
    expect(over.competitions[0]?.divisions[0]?.nextRound).toBe(10);
    expect(over.league.divisions.every((division) => division.nextRound === 39)).toBe(true);
  });

  it("com a temporada encerrada não faz nada", () => {
    const over = ok(advanceCareerDays(newState(world, SEED), { toEnd: true }, SEED, MANAGER)).state;
    expect(ok(advanceCareerToNextMatch(over, SEED, MANAGER)).state).toEqual(over);
  });
});

describe("advanceCareerDays", () => {
  const world = twoCompetitionsBank();

  it("a temporada inteira: todas as rodadas das duas competições, sem clube repetido no dia", () => {
    const end = ok(advanceCareerDays(newState(world, SEED), { toEnd: true }, SEED, MANAGER)).state;
    expect(isCalendarOver(end)).toBe(true);
    for (const division of end.league.divisions) expect(division.nextRound).toBe(39);
    expect(end.competitions[0]?.divisions[0]?.nextRound).toBe(19);
    const matches = [...end.league.divisions, ...(end.competitions[0]?.divisions ?? [])].flatMap(
      (division) => division.records,
    );
    expect(matches).toHaveLength(2 * 380 + 90);
  }, 120_000);

  it("é determinística, também depois de salvar e carregar no meio da temporada", () => {
    const start = newState(world, SEED);
    const direct = ok(advanceCareerDays(start, { days: 20 }, SEED, MANAGER)).state;
    const again = ok(advanceCareerDays(start, { days: 20 }, SEED, MANAGER)).state;
    expect(again).toEqual(direct);
    const half = ok(advanceCareerDays(start, { days: 9 }, SEED, MANAGER)).state;
    const reloaded = JSON.parse(JSON.stringify(half)) as CareerSeasonState;
    const resumed = ok(advanceCareerDays(reloaded, { days: 11 }, SEED, MANAGER)).state;
    expect(resumed).toEqual(direct);
  }, 120_000);

  it("com todos os sistemas (finanças, mercado, diretoria, torcida, notícias) nas duas competições", () => {
    const state = newState(world, SEED, { systems: true });
    const next = ok(advanceCareerDays(state, { days: 6 }, SEED, MANAGER)).state;
    expect(calendarNext(next)).toBe(6);
    expect(next.board).toBeDefined();
    expect(next.fans).toBeDefined();
    expect(next.news).toBeDefined();
    expect(next.market).toBeDefined();
  }, 120_000);
});

describe("condição física nos dias de jogos (017 US3)", () => {
  const world = twoCompetitionsBank();
  const rules = DEFAULT_FITNESS;

  it("depois de um jogo, quem atuou os 90 minutos fica abaixo de 100", () => {
    const state = newState(world, SEED);
    const next = ok(completeCareerDay(state, SEED, MANAGER)).state;
    const levels = Object.values(next.fitness.players).map((entry) => entry.value);
    expect(levels.length).toBeGreaterThan(0);
    expect(Math.min(...levels)).toBeLessThanOrEqual(70);
    expect(Math.max(...levels)).toBeLessThan(100);
    // Todos são de clubes que jogaram: 20 por divisão, 2 divisões.
    const clubs = new Set(
      next.world.players
        .filter((player) => next.fitness.players[player.id] !== undefined)
        .map((player) => player.clubId),
    );
    expect(clubs.size).toBeLessThanOrEqual(40);
    expect(state.fitness.players).toEqual({});
  });

  it("sete dias depois, todos chegam ao jogo com a condição cheia", () => {
    let state = newState(testWorld(), SEED);
    for (let day = 0; day < 4; day++) {
      state = ok(completeCareerDay(state, SEED, MANAGER)).state;
      const date = currentDay(state)?.date;
      if (!date) break;
      for (const id of Object.keys(state.fitness.players)) {
        expect(fitnessOn(state.fitness, id, date, rules)).toBe(100);
      }
    }
  });

  it("com três dias entre os jogos, os titulares chegam cansados e a partida usa a condição", () => {
    let state = newState(world, SEED);
    state = ok(advanceCareerDays(state, { days: 2 }, SEED, MANAGER)).state;
    const date = currentDay(state)?.date as string;
    expect(date).toBe("2027-01-13");
    const tired = Object.keys(state.fitness.players).filter(
      (id) => fitnessOn(state.fitness, id, date, rules) < 100,
    );
    expect(tired.length).toBeGreaterThan(0);
    // 90 minutos jogados há 3 dias deixam o jogador perto de 85.
    const levels = tired.map((id) => fitnessOn(state.fitness, id, date, rules));
    expect(Math.min(...levels)).toBeLessThan(86);
    const { live } = ok(startCareerDay(state, MANAGER));
    const match = live?.matches.find(
      (entry) => entry.sides.home === MANAGER || entry.sides.away === MANAGER,
    );
    if (!match) throw new Error("sem partida");
    const side = match.sides.home === MANAGER ? "home" : "away";
    const squad = match.state.input[side].squad;
    const adjusted = squad.filter((player) => tired.includes(player.id));
    expect(adjusted.length).toBeGreaterThan(0);
    for (const player of adjusted) {
      const base = world.players.find((entry) => entry.id === player.id);
      const factor = fitnessFactorBp(fitnessOn(state.fitness, player.id, date, rules), rules);
      expect(player.strength).toBe(Math.round(((base?.strength ?? 0) * factor) / 10000));
    }
  });

  it("ao vivo e direto continuam iguais com a condição em jogo", () => {
    let state = newState(world, SEED);
    state = ok(advanceCareerDays(state, { days: 2 }, SEED, MANAGER)).state;
    const direct = ok(completeCareerDay(state, SEED, MANAGER)).state;
    const { live } = ok(startCareerDay(state, MANAGER));
    if (!live) throw new Error("sem rodada");
    const viaLive = ok(completeCareerDay(state, SEED, MANAGER, finishRound(live))).state;
    expect(viaLive).toEqual(direct);
  });

  it("um clube da IA com titulares cansados e reservas descansados poupa parte deles (FR-021)", () => {
    const state = newState(world, SEED);
    const ai = "clube-010";
    const rested = ok(startCareerDay(state, ai)).live;
    const base = rested?.matches.find(
      (entry) => entry.sides.home === ai || entry.sides.away === ai,
    );
    if (!base) throw new Error("sem partida");
    const side = base.sides.home === ai ? "home" : "away";
    const starters = Object.values(base.state.input[side].lineup.starters);
    const exhausted: CareerSeasonState = {
      ...state,
      fitness: {
        players: Object.fromEntries(starters.map((id) => [id, { value: 20, date: "2027-01-02" }])),
      },
    };
    const tired = ok(startCareerDay(exhausted, ai)).live;
    const match = tired?.matches.find(
      (entry) => entry.sides.home === ai || entry.sides.away === ai,
    );
    const after = Object.values(match?.state.input[side].lineup.starters ?? {});
    const kept = after.filter((id) => starters.includes(id));
    expect(kept.length).toBeLessThan(starters.length);
  });
});
