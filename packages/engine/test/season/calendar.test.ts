import { describe, expect, it } from "vitest";
import { generateCalendar } from "../../src/season/calendar";
import type { Round } from "../../src/season/types";

const clubs = (n: number) => Array.from({ length: n }, (_, index) => `c${index + 1}`);
const pairKey = (a: string, b: string) => [a, b].sort().join("|");

function turnsOf(calendar: Round[], perTurn: number): Round[][] {
  const turns: Round[][] = [];
  for (let start = 0; start < calendar.length; start += perTurn) {
    turns.push(calendar.slice(start, start + perTurn));
  }
  return turns;
}

function checkTurn(turn: Round[], ids: string[]) {
  const odd = ids.length % 2 === 1;
  const pairs = new Map<string, number>();
  const home = new Map<string, number>();
  const byes = new Map<string, number>();
  const venues = new Map<string, ("H" | "A")[]>();
  for (const round of turn) {
    const seen = new Set<string>();
    for (const fixture of round.fixtures) {
      expect(seen.has(fixture.home) || seen.has(fixture.away)).toBe(false);
      seen.add(fixture.home);
      seen.add(fixture.away);
      const key = pairKey(fixture.home, fixture.away);
      pairs.set(key, (pairs.get(key) ?? 0) + 1);
      home.set(fixture.home, (home.get(fixture.home) ?? 0) + 1);
      venues.set(fixture.home, [...(venues.get(fixture.home) ?? []), "H"]);
      venues.set(fixture.away, [...(venues.get(fixture.away) ?? []), "A"]);
    }
    if (odd) {
      expect(round.bye).toBeDefined();
      byes.set(round.bye as string, (byes.get(round.bye as string) ?? 0) + 1);
      expect(seen.size).toBe(ids.length - 1);
    } else {
      expect(round.bye).toBeUndefined();
      expect(seen.size).toBe(ids.length);
    }
  }
  expect(pairs.size).toBe((ids.length * (ids.length - 1)) / 2);
  expect([...pairs.values()].every((count) => count === 1)).toBe(true);
  if (odd) for (const id of ids) expect(byes.get(id)).toBe(1);
  const low = Math.floor((ids.length - 1) / 2);
  const high = Math.ceil((ids.length - 1) / 2);
  for (const id of ids) {
    const count = home.get(id) ?? 0;
    expect(count).toBeGreaterThanOrEqual(low);
    expect(count).toBeLessThanOrEqual(high);
    const sequence = (venues.get(id) ?? []).join("");
    expect(sequence, `${id}: ${sequence}`).not.toMatch(/HHH|AAA/);
  }
}

describe("generateCalendar (FR-001 a FR-004)", () => {
  const sizes = Array.from({ length: 37 }, (_, index) => index + 4);

  it.each(sizes)("%i clubes: propriedades em 1, 2 e 3 turnos", (n) => {
    const ids = clubs(n);
    for (const turns of [1, 2, 3]) {
      for (const seed of ["a", "b", "c", 1, 2]) {
        const calendar = generateCalendar(ids, turns, seed);
        const perTurn = n % 2 === 0 ? n - 1 : n;
        expect(calendar).toHaveLength(turns * perTurn);
        expect(calendar.map((round) => round.number)).toEqual(
          calendar.map((_, index) => index + 1),
        );
        const split = turnsOf(calendar, perTurn);
        for (const turn of split) checkTurn(turn, ids);
        for (let t = 1; t < split.length; t++) {
          const previous = split[t - 1] as Round[];
          const current = split[t] as Round[];
          current.forEach((round, index) => {
            const before = (previous[index] as Round).fixtures
              .map((f) => `${f.away}>${f.home}`)
              .sort();
            const after = round.fixtures.map((f) => `${f.home}>${f.away}`).sort();
            expect(after).toEqual(before);
          });
        }
      }
    }
  });

  it("é determinístico pela seed e muda com ela", () => {
    const ids = clubs(20);
    expect(generateCalendar(ids, 2, 42)).toEqual(generateCalendar(ids, 2, 42));
    expect(generateCalendar(ids, 2, 42)).not.toEqual(generateCalendar(ids, 2, 43));
  });

  it("deriva a seed de cada partida da temporada, da rodada e do confronto", () => {
    const calendar = generateCalendar(clubs(6), 2, "temporada");
    for (const round of calendar) {
      for (const fixture of round.fixtures) {
        expect(fixture.seed).toBe(`temporada:r${round.number}:${fixture.home}-${fixture.away}`);
        expect(fixture.round).toBe(round.number);
      }
    }
  });
});
