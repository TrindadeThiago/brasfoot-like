import { describe, expect, it } from "vitest";
import { advanceMatch, simulateMatch, startMatch } from "../../src/match/engine";
import {
  penaltyChance,
  SHOOTOUT_KICKS_PER_SIDE,
  shootoutOrder,
  shootoutProgress,
} from "../../src/match/shootout";
import type { Decider, ShootoutKick, Side } from "../../src/match/types";
import { clubIds, makeInput } from "./helpers/teams";

const NO_EXTRA: Decider = {
  before: { home: { goals: 0, awayGoals: 0 }, away: { goals: 0, awayGoals: 0 } },
  awayGoals: false,
  extraTime: false,
};

function kick(order: number, side: Side, outcome: "goal" | "saved"): ShootoutKick {
  return { order, side, playerId: `p${order}`, outcome };
}

/** Sequência alternada a partir de `first`, com o resultado de cada cobrança. */
function sequence(first: Side, outcomes: ("goal" | "saved")[]): ShootoutKick[] {
  return outcomes.map((outcome, order) => {
    const side: Side = (order % 2 === 0) === (first === "home") ? "home" : "away";
    return kick(order, side, outcome);
  });
}

describe("penaltyChance (018 R9)", () => {
  it("fica entre 0,55 e 0,90 e sobe com a vantagem do cobrador sobre o goleiro", () => {
    expect(penaltyChance(50, 50)).toBeCloseTo(0.75, 5);
    expect(penaltyChance(90, 40)).toBeGreaterThan(penaltyChance(60, 60));
    expect(penaltyChance(40, 90)).toBeLessThan(penaltyChance(60, 60));
    expect(penaltyChance(100, 1)).toBe(0.9);
    expect(penaltyChance(1, 100)).toBe(0.55);
  });
});

describe("shootoutOrder", () => {
  const ids = clubIds();
  const input = makeInput(ids[0] as string, ids[1] as string, { seed: "ordem" });

  it("lista os onze em campo, os de linha por aptidão e o goleiro por último", () => {
    const started = startMatch(input);
    if (!started.ok) throw new Error("falhou");
    const order = shootoutOrder(started.state, "home");
    expect(order).toHaveLength(11);
    expect(new Set(order)).toEqual(new Set(Object.values(input.home.lineup.starters)));
    const keeper = input.home.squad.find(
      (player) => player.position === "GK" && order.includes(player.id),
    );
    expect(order.at(-1)).toBe(keeper?.id);
    const strength = (id: string) => input.home.squad.find((p) => p.id === id)?.strength ?? 0;
    const forwards = order
      .slice(0, 3)
      .map((id) => input.home.squad.find((p) => p.id === id)?.position);
    expect(forwards).not.toContain("GK");
    expect(strength(order[0] as string)).toBeGreaterThanOrEqual(strength(order[9] as string) - 15);
  });

  it("deixa de fora quem foi expulso", () => {
    const started = startMatch(input);
    if (!started.ok) throw new Error("falhou");
    const state = structuredClone(started.state);
    const [slot, playerId] = Object.entries(state.teams.home.onField)[3] as [string, string];
    delete state.teams.home.onField[slot];
    const order = shootoutOrder(state, "home");
    expect(order).toHaveLength(10);
    expect(order).not.toContain(playerId);
  });
});

describe("shootoutProgress: quando a disputa termina", () => {
  it("decide antes das cinco quando o adversário não alcança mais", () => {
    // home converte 3, away perde 3: depois de 6 cobranças faltam 2 por lado, 3 > 0 + 2.
    const kicks = sequence("home", ["goal", "saved", "goal", "saved", "goal", "saved"]);
    const progress = shootoutProgress(kicks, "home");
    expect(progress.over).toBe(true);
    expect(progress.winner).toBe("home");
    expect(progress.score).toEqual({ home: 3, away: 0 });
  });

  it("não termina enquanto há como empatar", () => {
    const kicks = sequence("home", ["goal", "saved", "goal", "saved"]);
    expect(shootoutProgress(kicks, "home").over).toBe(false);
  });

  it("empatado depois das cinco, segue uma cobrança por lado até haver diferença", () => {
    const tied = sequence(
      "home",
      Array.from({ length: 10 }, () => "goal"),
    );
    const open = shootoutProgress(tied, "home");
    expect(open.over).toBe(false);
    expect(open.next).toBe("home");
    // home converte e away perde: só decide quando os dois cobraram.
    const half = shootoutProgress([...tied, kick(10, "home", "goal")], "home");
    expect(half.over).toBe(false);
    const done = shootoutProgress(
      [...tied, kick(10, "home", "goal"), kick(11, "away", "saved")],
      "home",
    );
    expect(done.over).toBe(true);
    expect(done.winner).toBe("home");
  });

  it("quem cobra primeiro pode ser o visitante", () => {
    const kicks = sequence("away", ["goal", "saved", "goal", "saved", "goal", "saved"]);
    expect(shootoutProgress(kicks, "away").winner).toBe("away");
    expect(shootoutProgress([], "away").next).toBe("away");
  });

  it(`o teto de ${SHOOTOUT_KICKS_PER_SIDE} cobranças por lado nunca é alcançado nas disputas reais`, () => {
    expect(SHOOTOUT_KICKS_PER_SIDE).toBeGreaterThanOrEqual(20);
  });
});

describe("disputa de pênaltis no motor (018 R8, R9)", () => {
  const ids = clubIds();

  /** Partida que termina empatada nos 90 minutos, achada por busca de seeds. */
  function drawnInput(skip = 0) {
    let found = 0;
    for (let index = 0; index < 400; index++) {
      const input = makeInput(ids[index % 40] as string, ids[(index * 3 + 1) % 40] as string, {
        seed: `emp-${index}`,
      });
      if (input.home.clubId === input.away.clubId) continue;
      const plain = simulateMatch(input);
      if (!plain.ok) continue;
      if (plain.result.score.home === plain.result.score.away) {
        if (found === skip) return input;
        found++;
      }
    }
    throw new Error("sem empate");
  }

  it("empatado nos 90 e sem prorrogação, vai direto aos pênaltis e sempre há vencedor", () => {
    for (let skip = 0; skip < 6; skip++) {
      const input = { ...drawnInput(skip), decider: NO_EXTRA };
      const result = simulateMatch(input);
      if (!result.ok) throw new Error("falhou");
      const { decision } = result.result;
      expect(decision?.by).toBe("penalties");
      expect(decision?.shootout?.kicks.length).toBeGreaterThanOrEqual(2);
      const { score } = decision?.shootout ?? { score: { home: 0, away: 0 } };
      expect(score.home).not.toBe(score.away);
      expect(decision?.winner).toBe(score.home > score.away ? "home" : "away");
      const kicks = result.result.events.filter((event) => event.type === "shootout_kick");
      expect(kicks).toHaveLength(decision?.shootout?.kicks.length ?? -1);
      expect(result.result.events.at(-1)?.type).toBe("shootout_end");
    }
  });

  it("o placar dos 90 minutos não muda e a disputa fica separada", () => {
    const input = drawnInput();
    const plain = simulateMatch(input);
    const decided = simulateMatch({ ...input, decider: NO_EXTRA });
    if (!plain.ok || !decided.ok) throw new Error("falhou");
    expect(decided.result.score).toEqual(plain.result.score);
  });

  it("passo a passo é igual a de uma vez, com uma cobrança por passo", () => {
    const input = { ...drawnInput(), decider: NO_EXTRA };
    const whole = simulateMatch(input);
    const started = startMatch(input);
    if (!whole.ok || !started.ok) throw new Error("falhou");
    let state = started.state;
    let steps = 0;
    while (state.status !== "finished") {
      state = advanceMatch(state, { minutes: 1 });
      steps++;
      expect(steps).toBeLessThan(400);
    }
    expect(state.shootout?.kicks).toEqual(whole.result.decision?.shootout?.kicks);
  });

  it("é determinístico: a mesma seed dá as mesmas cobranças", () => {
    const input = { ...drawnInput(), decider: NO_EXTRA };
    const a = simulateMatch(input);
    const b = simulateMatch(input);
    expect(a).toEqual(b);
  });
});
