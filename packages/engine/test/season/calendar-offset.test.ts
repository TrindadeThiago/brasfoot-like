import { describe, expect, it } from "vitest";
import { fixtureSeed, generateCalendar, mergeGroupCalendars } from "../../src/season/calendar";

// 019 (T010): rodadas numeradas a partir de uma posição absoluta e calendários de grupos juntos.
const clubs = (prefix: string, n: number) =>
  Array.from({ length: n }, (_, index) => `${prefix}${index + 1}`);

describe("generateCalendar com firstRound (019)", () => {
  it("numera as rodadas a partir de firstRound e usa o número absoluto na seed da partida", () => {
    const calendar = generateCalendar(clubs("c", 4), 1, "s", 7);
    expect(calendar.map((round) => round.number)).toEqual([7, 8, 9]);
    for (const round of calendar) {
      for (const fixture of round.fixtures) {
        expect(fixture.round).toBe(round.number);
        expect(fixture.seed).toBe(fixtureSeed("s", round.number, fixture.home, fixture.away));
      }
    }
  });

  it("sem o argumento é idêntico ao de antes", () => {
    expect(generateCalendar(clubs("c", 6), 2, "s")).toEqual(
      generateCalendar(clubs("c", 6), 2, "s", 1),
    );
    expect(generateCalendar(clubs("c", 6), 2, "s")[0]?.number).toBe(1);
  });

  it("os mesmos confrontos, só renumerados", () => {
    const base = generateCalendar(clubs("c", 5), 1, "s");
    const moved = generateCalendar(clubs("c", 5), 1, "s", 10);
    expect(moved.map((round) => round.fixtures.map((f) => [f.home, f.away]))).toEqual(
      base.map((round) => round.fixtures.map((f) => [f.home, f.away])),
    );
  });
});

describe("mergeGroupCalendars (019)", () => {
  it("junta os jogos de cada grupo rodada a rodada, sem clube repetido", () => {
    const a = generateCalendar(clubs("a", 4), 1, "s:A", 4);
    const b = generateCalendar(clubs("b", 4), 1, "s:B", 4);
    const merged = mergeGroupCalendars([a, b]);
    expect(merged.map((round) => round.number)).toEqual([4, 5, 6]);
    for (const round of merged) {
      expect(round.fixtures).toHaveLength(4);
      const seen = round.fixtures.flatMap((fixture) => [fixture.home, fixture.away]);
      expect(new Set(seen).size).toBe(seen.length);
      expect(round.byes).toBeUndefined();
    }
  });

  it("grupos de tamanho ímpar listam em byes todos os clubes que folgam", () => {
    const a = generateCalendar(clubs("a", 5), 1, "s:A");
    const b = generateCalendar(clubs("b", 5), 1, "s:B");
    const merged = mergeGroupCalendars([a, b]);
    expect(merged).toHaveLength(5);
    for (const round of merged) {
      expect(round.fixtures).toHaveLength(4);
      expect(round.byes).toHaveLength(2);
      const playing = new Set(round.fixtures.flatMap((fixture) => [fixture.home, fixture.away]));
      for (const resting of round.byes ?? []) expect(playing.has(resting)).toBe(false);
    }
  });

  it("recusa calendários com números de rodada diferentes", () => {
    const a = generateCalendar(clubs("a", 4), 1, "s:A", 1);
    const b = generateCalendar(clubs("b", 4), 1, "s:B", 2);
    expect(() => mergeGroupCalendars([a, b])).toThrow();
  });
});
