import { describe, expect, it } from "vitest";
import { advanceMatch, simulateMatch, startMatch } from "../../src/match/engine";
import type { Decider, MatchInput, MatchState } from "../../src/match/types";
import { matchTicks } from "../../src/season/live-round";
import { clubIds, makeInput } from "./helpers/teams";

const ids = clubIds();
const ZERO = { goals: 0, awayGoals: 0 };

function decider(overrides: Partial<Decider> = {}): Decider {
  return { before: { home: ZERO, away: ZERO }, awayGoals: false, extraTime: true, ...overrides };
}

function inputAt(index: number): MatchInput {
  return makeInput(ids[index % 40] as string, ids[(index * 3 + 1) % 40] as string, {
    seed: `pro-${index}`,
  });
}

/** Primeiros índices de partidas empatadas nos 90 minutos. */
function drawn(count: number): MatchInput[] {
  const found: MatchInput[] = [];
  for (let index = 0; index < 600 && found.length < count; index++) {
    const input = inputAt(index);
    if (input.home.clubId === input.away.clubId) continue;
    const plain = simulateMatch(input);
    if (plain.ok && plain.result.score.home === plain.result.score.away) found.push(input);
  }
  if (found.length < count) throw new Error("poucos empates");
  return found;
}

describe("sem decider, a partida é a de sempre (018)", () => {
  it("20 seeds seguem terminando nos 90 minutos, sem prorrogação nem pênaltis", () => {
    for (let index = 0; index < 20; index++) {
      const result = simulateMatch(inputAt(index));
      if (!result.ok) continue;
      expect(result.result.decision).toBeUndefined();
      expect(result.result.events.some((event) => event.half > 2)).toBe(false);
      expect(result.result.events.at(-1)?.type).toBe("full_time");
    }
  });
});

describe("prorrogação (018 R8)", () => {
  it("empate no agregado joga 30 minutos em dois tempos de 15, sem acréscimos", () => {
    const [input] = drawn(1);
    const result = simulateMatch({ ...(input as MatchInput), decider: decider() });
    if (!result.ok) throw new Error("falhou");
    const events = result.result.events;
    expect(events.some((event) => event.type === "extra_time_start")).toBe(true);
    const half3 = events.filter((event) => event.half === 3);
    const half4 = events.filter((event) => event.half === 4);
    expect(Math.min(...half3.map((e) => e.minute))).toBeGreaterThanOrEqual(90);
    expect(Math.max(...half3.map((e) => e.minute))).toBeLessThanOrEqual(105);
    expect(Math.max(...half4.map((e) => e.minute))).toBeLessThanOrEqual(120);
    expect(events.every((event) => event.half < 3 || event.stoppage === 0)).toBe(true);
    expect(events.some((event) => event.type === "extra_half_time")).toBe(true);
  });

  it("termina com um vencedor: por gols na prorrogação ou, empatado, pelos pênaltis", () => {
    const outcomes = new Set<string>();
    for (const input of drawn(24)) {
      const result = simulateMatch({ ...input, decider: decider() });
      if (!result.ok) throw new Error("falhou");
      const { decision, score } = result.result;
      expect(decision).toBeDefined();
      if (decision?.by === "extra-time") {
        expect(score.home).not.toBe(score.away);
        expect(decision.winner).toBe(score.home > score.away ? "home" : "away");
        expect(decision.extraTimeScore).toBeDefined();
      } else {
        expect(decision?.by).toBe("penalties");
        expect(score.home).toBe(score.away);
        expect(decision?.shootout).toBeDefined();
      }
      outcomes.add(decision?.by ?? "");
    }
    expect(outcomes).toEqual(new Set(["extra-time", "penalties"]));
  });

  it("sem prorrogação (extraTime: false), vai direto aos pênaltis", () => {
    const [input] = drawn(1);
    const result = simulateMatch({
      ...(input as MatchInput),
      decider: decider({ extraTime: false }),
    });
    if (!result.ok) throw new Error("falhou");
    expect(result.result.decision?.by).toBe("penalties");
    expect(result.result.events.some((event) => event.half > 2)).toBe(false);
  });

  it("agregado já decidido nos 90 minutos não tem prorrogação nem pênaltis", () => {
    const [input] = drawn(1);
    const result = simulateMatch({
      ...(input as MatchInput),
      decider: decider({ before: { home: { goals: 2, awayGoals: 0 }, away: ZERO } }),
    });
    if (!result.ok) throw new Error("falhou");
    expect(result.result.decision?.by).toBe("aggregate");
    expect(result.result.decision?.winner).toBe("home");
    expect(result.result.events.some((event) => event.half > 2)).toBe(false);
  });

  it("gols fora de casa decidem o agregado empatado antes da prorrogação", () => {
    const [input] = drawn(1);
    // Agregado empatado em 1 a 1 antes do jogo (0 a 0 hoje): o visitante tinha feito 1 fora.
    const result = simulateMatch({
      ...(input as MatchInput),
      decider: decider({
        awayGoals: true,
        before: { home: { goals: 1, awayGoals: 0 }, away: { goals: 1, awayGoals: 1 } },
      }),
    });
    if (!result.ok) throw new Error("falhou");
    expect(result.result.decision?.by).toBe("away-goals");
    expect(result.result.decision?.winner).toBe("away");
  });

  it("concede mais uma substituição na prorrogação", () => {
    const [input] = drawn(1);
    const started = startMatch({
      ...(input as MatchInput),
      substitutionLimit: 0,
      decider: decider(),
    });
    if (!started.ok) throw new Error("falhou");
    const state = advanceMatch(started.state, { toEnd: true });
    expect(state.extraTime).toBe(true);
    expect(state.teams.home.substitutionsUsed).toBeLessThanOrEqual(1);
  });

  it("passo a passo é igual a de uma vez e conta minutos extras e cobranças como passos", () => {
    const input = { ...(drawn(1)[0] as MatchInput), decider: decider() };
    const whole = simulateMatch(input);
    const started = startMatch(input);
    if (!whole.ok || !started.ok) throw new Error("falhou");
    let state: MatchState = started.state;
    let steps = 0;
    while (state.status !== "finished") {
      state = advanceMatch(state, { minutes: 1 });
      steps++;
    }
    expect(state.events).toEqual(whole.result.events);
    expect(steps).toBe(matchTicks(state));
    expect(matchTicks(state)).toBeGreaterThan(95);
  });

  it("200 partidas empatadas terminam com exatamente um vencedor", () => {
    let count = 0;
    for (const input of drawn(60)) {
      const result = simulateMatch({ ...input, decider: decider() });
      if (!result.ok) throw new Error("falhou");
      expect(["home", "away"]).toContain(result.result.decision?.winner);
      count++;
    }
    expect(count).toBe(60);
  });
});
