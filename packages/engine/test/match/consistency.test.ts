import { describe, expect, it } from "vitest";
import { simulateMatch } from "../../src/match/engine.js";
import type { MatchEvent, MatchResult } from "../../src/match/types.js";
import { replayViolations } from "./helpers/replay.js";
import { clubIds, makeInput } from "./helpers/teams.js";

const CLUBS = clubIds();
const MATCHES = Array.from({ length: 300 }, (_, index) => {
  const home = CLUBS[index % CLUBS.length] as string;
  const away = CLUBS[(index * 7 + 3) % CLUBS.length] as string;
  return {
    seed: index + 1,
    home,
    away: away === home ? (CLUBS[(index + 1) % CLUBS.length] as string) : away,
  };
});

function order(event: MatchEvent): number {
  return event.half * 100000 + event.minute * 100 + event.stoppage;
}

describe("consistência do resultado (SC-007)", () => {
  const runs = MATCHES.map(({ seed, home, away }) => {
    const input = makeInput(home, away, { seed });
    const outcome = simulateMatch(input);
    if (!outcome.ok) throw new Error(JSON.stringify(outcome.errors));
    return { input, result: outcome.result as MatchResult };
  });

  it("placar = gols nos eventos", () => {
    for (const { result } of runs) {
      if (result.status !== "finished") continue;
      for (const side of ["home", "away"] as const) {
        const goals = result.events.filter(
          (event) => event.type === "shot" && event.side === side && event.outcome === "goal",
        ).length;
        expect(result.score[side]).toBe(goals);
      }
    }
  });

  it("ninguém age sem estar em campo; ninguém volta depois de sair", () => {
    for (const { input, result } of runs) {
      expect(replayViolations(input, result.events)).toEqual([]);
    }
  });

  it("eventos em ordem de seq e de relógio; marcos uma vez e em ordem", () => {
    for (const { result } of runs) {
      result.events.forEach((event, index) => {
        expect(event.seq).toBe(index);
        if (index > 0)
          expect(order(event)).toBeGreaterThanOrEqual(
            order(result.events[index - 1] as MatchEvent),
          );
      });
      if (result.status === "finished") {
        const markers = result.events
          .filter((event) =>
            ["kickoff", "half_time", "second_half", "full_time"].includes(event.type),
          )
          .map((event) => event.type);
        expect(markers).toEqual(["kickoff", "half_time", "second_half", "full_time"]);
      }
    }
  });

  it("segundo amarelo vem acompanhado de vermelho no mesmo minuto", () => {
    for (const { result } of runs) {
      const yellows = new Map<string, number>();
      result.events.forEach((event, index) => {
        if (event.type !== "yellow_card") return;
        const count = (yellows.get(event.playerId) ?? 0) + 1;
        yellows.set(event.playerId, count);
        if (count === 2) {
          const next = result.events[index + 1];
          expect(next).toMatchObject({
            type: "red_card",
            playerId: event.playerId,
            reason: "second_yellow",
          });
        }
      });
    }
  });

  it("acréscimos dentro das faixas e estatísticas coerentes", () => {
    for (const { result } of runs) {
      const first = result.events
        .filter((event) => event.half === 1)
        .map((event) => event.stoppage);
      const second = result.events
        .filter((event) => event.half === 2)
        .map((event) => event.stoppage);
      expect(Math.max(0, ...first)).toBeLessThanOrEqual(5);
      expect(Math.max(0, ...second)).toBeLessThanOrEqual(8);
      expect(result.stats.home.possession + result.stats.away.possession).toBe(100);
      for (const side of ["home", "away"] as const) {
        expect(result.stats[side].shotsOnTarget).toBeLessThanOrEqual(result.stats[side].shots);
      }
      for (const player of Object.values(result.players)) {
        expect(player.minutesPlayed).toBeLessThanOrEqual(90 + 5 + 8);
      }
    }
  });
});
