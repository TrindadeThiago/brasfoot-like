import { describe, expect, it } from "vitest";
import { advanceCareerDays, completeCareerDay } from "../../src/career/day";
import {
  type CareerSeasonState,
  clubFixtures,
  competitionSeason,
  currentDay,
  isCalendarOver,
  nextClubFixture,
} from "../../src/career/season-state";
import { cupChampion, cupReached, phaseWinners } from "../../src/knockout/tie";
import { CUP_ID, cupBank } from "../fixtures/cup-bank";
import { MANAGER, newState } from "./day-helpers";

const SEED = "copa-dia";

function ok(result: { ok: boolean }): CareerSeasonState {
  const typed = result as { ok: true; state: CareerSeasonState } | { ok: false };
  if (!typed.ok) throw new Error(JSON.stringify(result));
  return typed.state;
}

describe("a copa no dia de jogos (018 US1)", () => {
  const world = cupBank();

  it("a temporada tem a liga e a copa e termina com um campeão", () => {
    const end = ok(advanceCareerDays(newState(world, SEED), { toEnd: true }, SEED, MANAGER));
    expect(isCalendarOver(end)).toBe(true);
    const cup = competitionSeason(end, CUP_ID);
    const result = cupChampion(cup.divisions[0] as never);
    expect(result?.championId).toBeDefined();
    // 8 + 4 + 2 × 2 + 1 jogos.
    expect(cup.divisions[0]?.records).toHaveLength(8 + 4 + 4 + 1);
  }, 120_000);

  it("nenhum clube joga duas vezes no dia e o eliminado não volta nas fases seguintes", () => {
    let state = newState(world, SEED);
    while (currentDay(state)) {
      const day = currentDay(state);
      state = ok(completeCareerDay(state, SEED, MANAGER));
      const clubs: string[] = [];
      for (const slot of day?.slots ?? []) {
        const season = competitionSeason(state, slot.competitionId);
        for (const division of season.divisions) {
          for (const fixture of division.calendar[slot.round - 1]?.fixtures ?? []) {
            clubs.push(fixture.home, fixture.away);
          }
        }
      }
      expect(new Set(clubs).size).toBe(clubs.length);
    }
    const cup = competitionSeason(state, CUP_ID).divisions[0];
    const phases = cup?.bracket?.phases ?? [];
    const lost = new Set<string>();
    for (const phase of phases) {
      const playing = phase.ties.flatMap((tie) => [tie.home, tie.away]);
      for (const clubId of playing) expect(lost.has(clubId)).toBe(false);
      for (const tie of phase.ties) {
        const losers = [tie.home, tie.away].filter(
          (clubId) => !phaseWinners(cup as never, phase.index).includes(clubId),
        );
        for (const clubId of losers) lost.add(clubId);
      }
    }
    expect(lost.size).toBe(15);
  }, 120_000);

  it("clubFixtures lista só jogos já sorteados; as fases seguintes aparecem depois da anterior", () => {
    const state = newState(world, SEED);
    const all = clubFixtures(state, MANAGER);
    const cupFixtures = all.filter((fixture) => fixture.competitionId === CUP_ID);
    // Só a 1ª fase está sorteada; as seguintes aparecem quando a anterior termina.
    expect(cupFixtures).toHaveLength(1);
    expect(cupFixtures[0]?.round).toBe(1);
    expect(nextClubFixture(state, MANAGER)?.competitionId).not.toBe(CUP_ID);
    // Na quarta da 1ª fase o sorteio acontece e os jogos aparecem.
    const wednesday = ok(advanceCareerDays(state, { days: 2 }, SEED, MANAGER));
    const day = currentDay(wednesday);
    expect(day?.slots.map((slot) => slot.competitionId)).toContain(CUP_ID);
    const after = ok(completeCareerDay(wednesday, SEED, MANAGER));
    const played = clubFixtures(after, MANAGER).filter(
      (fixture) => fixture.competitionId === CUP_ID,
    );
    // Os 16 clubes da copa jogam a 1ª fase; o clube do jogador está entre os 8 primeiros de cada divisão.
    expect(played.length).toBeGreaterThanOrEqual(1);
    expect(played[0]?.record).toBeDefined();
  }, 120_000);

  it("mesma seed ⇒ mesmo estado, inclusive salvando e carregando no meio da copa", () => {
    const start = newState(world, SEED);
    const direct = ok(advanceCareerDays(start, { days: 14 }, SEED, MANAGER));
    expect(ok(advanceCareerDays(start, { days: 14 }, SEED, MANAGER))).toEqual(direct);
    const half = ok(advanceCareerDays(start, { days: 6 }, SEED, MANAGER));
    const reloaded = JSON.parse(JSON.stringify(half)) as CareerSeasonState;
    expect(ok(advanceCareerDays(reloaded, { days: 8 }, SEED, MANAGER))).toEqual(direct);
  }, 120_000);

  it("a fase alcançada de cada clube bate com os confrontos jogados", () => {
    const end = ok(advanceCareerDays(newState(world, SEED), { toEnd: true }, SEED, MANAGER));
    const cup = competitionSeason(end, CUP_ID).divisions[0];
    const reached = cupReached(cup as never);
    expect(Object.keys(reached)).toHaveLength(16);
    expect(Math.max(...Object.values(reached))).toBe(4);
  }, 120_000);
});
