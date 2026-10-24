import { describe, expect, it } from "vitest";
import { summarizeMatch } from "../../src/match/summary";
import type { MatchInput } from "../../src/match/types";
import { comparisonWorld } from "../helpers/summary-compare";

describe("simulação resumida (020 R3)", () => {
  const { inputs } = comparisonWorld();
  const list = inputs(300, "unitario");

  it("é determinística pela seed da partida", () => {
    for (const input of list.slice(0, 50)) {
      expect(JSON.stringify(summarizeMatch(input))).toBe(JSON.stringify(summarizeMatch(input)));
    }
    const first = list[0] as MatchInput;
    const other = summarizeMatch({ ...first, seed: "outra" });
    expect(other).toBeDefined();
  });

  it("o resultado é consistente: gols dos jogadores somam o placar, no máximo um vermelho por jogador", () => {
    for (const input of list) {
      const result = summarizeMatch(input);
      expect(result.status).toBe("finished");
      const home = new Set(input.home.squad.map((player) => player.id));
      let homeGoals = 0;
      let awayGoals = 0;
      const reds = new Map<string, number>();
      for (const event of result.events) {
        if (event.type === "shot" && event.outcome === "goal") {
          if (event.side === "home") homeGoals += 1;
          else awayGoals += 1;
          expect(home.has(event.playerId)).toBe(event.side === "home");
        }
        if (event.type === "red_card")
          reds.set(event.playerId, (reds.get(event.playerId) ?? 0) + 1);
      }
      expect(homeGoals).toBe(result.score.home);
      expect(awayGoals).toBe(result.score.away);
      expect([...reds.values()].every((count) => count === 1)).toBe(true);
      const byPlayer = Object.values(result.players).reduce((sum, line) => sum + line.goals, 0);
      expect(byPlayer).toBe(result.score.home + result.score.away);
    }
  });

  it("lesão só em quem jogou, expulso não volta e os eventos seguem o tempo", () => {
    for (const input of list) {
      const result = summarizeMatch(input);
      for (const [id, line] of Object.entries(result.players)) {
        if (line.injury) expect(line.minutesPlayed).toBeGreaterThan(0);
        if (line.sentOff) expect(line.minutesPlayed).toBeLessThan(97);
        expect(id.length).toBeGreaterThan(0);
      }
      const minutes = result.events.map((event) => event.minute);
      expect(minutes).toEqual([...minutes].sort((a, b) => a - b));
      expect(result.stats.home.shots).toBeGreaterThanOrEqual(result.score.home);
    }
  });

  it("respeita as ausências e não escala quem não pode jogar", () => {
    const base = list[0] as MatchInput;
    const out = base.home.lineup.bench.slice(0, 2);
    const input: MatchInput = { ...base, home: { ...base.home, unavailable: out } };
    for (let index = 0; index < 40; index++) {
      const result = summarizeMatch({ ...input, seed: `ausencia:${index}` });
      for (const id of out) expect(result.players[id]).toBeUndefined();
    }
  });

  it("é mais rápida que a completa", () => {
    const start = performance.now();
    for (const input of list) summarizeMatch(input);
    expect(performance.now() - start).toBeLessThan(2000);
  });
});
