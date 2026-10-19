import { describe, expect, it } from "vitest";
import { ageOn } from "../../src/calendar/date";
import { advanceLeague } from "../../src/career/league-round";
import type { CompletedPlayer } from "../../src/model/types";
import {
  evolutionDelta,
  evolvePlayers,
  midSeasonRound,
  minutesInRounds,
} from "../../src/renewal/evolution";
import { createRng } from "../../src/rng/xoshiro";
import { newLeague, testWorld } from "../career/helpers";

function player(strength: number, potential: number): CompletedPlayer {
  const base = testWorld().players[0];
  if (!base) throw new Error("sem jogador");
  return { ...base, strength, hidden: { ...base.hidden, potential } };
}

function meanDelta(subject: CompletedPlayer, age: number, participation: number): number {
  let sum = 0;
  for (let seed = 0; seed < 300; seed++) {
    sum += evolutionDelta(subject, age, participation, createRng(`media:${seed}`));
  }
  return sum / 300;
}

describe("evolução dos jogadores (US1, R4)", () => {
  it("jovens crescem, auge é estável, veteranos caem", () => {
    expect(meanDelta(player(55, 75), 19, 0.5)).toBeGreaterThan(2);
    expect(Math.abs(meanDelta(player(65, 70), 28, 0.5))).toBeLessThan(0.5);
    expect(meanDelta(player(70, 72), 34, 0.5)).toBeLessThan(-1);
  });

  it("minutagem acelera o crescimento de jovens", () => {
    const young = player(55, 75);
    expect(meanDelta(young, 19, 1) - meanDelta(young, 19, 0)).toBeGreaterThanOrEqual(1);
  });

  it("o delta é inteiro e determinístico", () => {
    const subject = player(55, 75);
    const first = evolutionDelta(subject, 19, 0.5, createRng("fixo"));
    expect(Number.isInteger(first)).toBe(true);
    expect(evolutionDelta(subject, 19, 0.5, createRng("fixo"))).toBe(first);
  });

  it("minutos por jogador numa janela de rodadas", () => {
    const played = advanceLeague(newLeague("minutos"), testWorld(), { rounds: 4 });
    if (!played.ok) throw new Error("falhou");
    const all = minutesInRounds(played.league, 1, 4);
    const firstTwo = minutesInRounds(played.league, 1, 2);
    const records = played.league.divisions.flatMap((season) => season.records);
    const somePlayer = Object.keys(records[0]?.players ?? {})[0] as string;
    const expected = records
      .filter((record) => record.round <= 2)
      .reduce((sum, record) => sum + (record.players[somePlayer]?.minutes ?? 0), 0);
    expect(firstTwo.get(somePlayer) ?? 0).toBe(expected);
    expect(all.get(somePlayer) ?? 0).toBeGreaterThanOrEqual(firstTwo.get(somePlayer) ?? 0);
  });

  it("evolvePlayers respeita os limites, mantém o potencial e não depende da ordem", () => {
    const league = newLeague("evolucao");
    const { world, record } = evolvePlayers(testWorld(), league, "seed", "mid", 1, 1);
    const reference = testWorld().manifest.referenceDate;
    for (const evolved of world.players) {
      const before = testWorld().players.find((entry) => entry.id === evolved.id);
      expect(evolved.hidden.potential).toBe(before?.hidden.potential);
      expect(evolved.strength).toBeGreaterThanOrEqual(20);
      expect(evolved.strength).toBeLessThanOrEqual(
        Math.max(evolved.hidden.potential, before?.strength ?? 0),
      );
      expect(record.deltas[evolved.id]).toBe(evolved.strength - (before?.strength ?? 0));
      expect(ageOn(evolved.birthDate, reference)).toBe(ageOn(before?.birthDate ?? "", reference));
    }
    expect(record).toMatchObject({ season: 1, moment: "mid" });
    const reversed = { ...testWorld(), players: [...testWorld().players].reverse() };
    const again = evolvePlayers(reversed, league, "seed", "mid", 1, 1);
    expect(again.record.deltas).toEqual(record.deltas);
  });

  it("a evolução do meio acontece na rodada central", () => {
    expect(midSeasonRound(newLeague("meio"))).toBe(19);
  });
});
