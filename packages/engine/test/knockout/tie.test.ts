import { describe, expect, it } from "vitest";
import { createCupSeason, ensurePhaseDrawn } from "../../src/knockout/bracket";
import {
  cupChampion,
  cupReached,
  deciderFor,
  phaseWinners,
  tieState,
} from "../../src/knockout/tie";
import { CUP_ID, cupBank } from "../fixtures/cup-bank";
import { playCup, playNextRound } from "./helpers";

function start() {
  const world = cupBank();
  const created = createCupSeason(world, { competitionId: CUP_ID, seed: "copa-tie" });
  if (!created.ok) throw new Error(JSON.stringify(created.error));
  return { world, season: created.season };
}

describe("tieState e fases de jogo único (018 R5)", () => {
  it("antes de jogar, o confronto não está decidido", () => {
    const { world, season } = start();
    const drawn = ensurePhaseDrawn(season, world, 0);
    const tie = drawn.bracket?.phases[0]?.ties[0];
    const state = tieState(drawn, 0, tie?.id ?? "");
    expect(state.played).toBe(0);
    expect(state.decided).toBe(false);
    expect(state.winner).toBeUndefined();
  });

  it("depois da fase, todo confronto tem um vencedor que é um dos dois clubes", () => {
    const { world, season } = start();
    const after = playNextRound(world, season);
    const phase = after.bracket?.phases[0];
    expect(phase?.ties).toHaveLength(8);
    for (const tie of phase?.ties ?? []) {
      const state = tieState(after, 0, tie.id);
      expect(state.decided).toBe(true);
      expect([tie.home, tie.away]).toContain(state.winner);
      expect(state.loser).toBe(state.winner === tie.home ? tie.away : tie.home);
      expect(state.decidedBy).toBeDefined();
    }
    const winners = phaseWinners(after, 0);
    expect(winners).toHaveLength(8);
    expect(new Set(winners).size).toBe(8);
  });
});

describe("campeão e fase alcançada", () => {
  it("a copa inteira termina com um campeão e um vice, que jogaram a final", () => {
    const { world, season } = start();
    const done = playCup(world, season);
    const result = cupChampion(done);
    expect(result).toBeDefined();
    expect(result?.championId).not.toBe(result?.runnerUpId);
    const final = done.bracket?.phases[3]?.ties[0];
    expect([final?.home, final?.away].sort()).toEqual(
      [result?.championId, result?.runnerUpId].sort(),
    );
    const reached = cupReached(done);
    expect(reached[result?.championId ?? ""]).toBe(4);
    expect(reached[result?.runnerUpId ?? ""]).toBe(3);
    expect(Object.keys(reached)).toHaveLength(16);
    expect(Math.min(...Object.values(reached))).toBe(0);
  });

  it("sem terminar, ainda não há campeão", () => {
    const { world, season } = start();
    expect(cupChampion(playNextRound(world, season))).toBeUndefined();
  });
});

describe("deciderFor", () => {
  it("jogo único: decider com agregado zerado; ida: nenhum; volta: agregado da ida", () => {
    const { world, season: initial } = start();
    let season = initial;
    const single = ensurePhaseDrawn(season, world, 0);
    const first = single.calendar[0]?.fixtures[0];
    if (!first) throw new Error("sem jogo");
    const decider = deciderFor(world, single, first);
    expect(decider?.before.home).toEqual({ goals: 0, awayGoals: 0 });
    expect(decider?.extraTime).toBe(true);
    expect(decider?.awayGoals).toBe(false);

    while (season.nextRound < 3) season = playNextRound(world, season);
    const drawn = ensurePhaseDrawn(season, world, 2);
    const leg1 = drawn.calendar[2]?.fixtures[0];
    const leg2 = drawn.calendar[3]?.fixtures.find((fixture) => fixture.tie?.id === leg1?.tie?.id);
    if (!leg1 || !leg2) throw new Error("sem pernas");
    expect(deciderFor(world, drawn, leg1)).toBeUndefined();
    // Jogada a ida, a volta enxerga o placar dela.
    const afterLeg1 = playNextRound(world, drawn);
    const record = afterLeg1.records.find((entry) => entry.round === 3 && entry.home === leg1.home);
    const volta = deciderFor(world, afterLeg1, leg2);
    expect(volta?.before.away.goals).toBe(record?.score.home);
    expect(volta?.before.home.goals).toBe(record?.score.away);
    expect(volta?.before.away.awayGoals).toBe(0);
    expect(volta?.before.home.awayGoals).toBe(record?.score.away);
  });
});

describe("critérios de decisão (018 US2)", () => {
  function cupWith(seed: string) {
    const world = cupBank();
    const created = createCupSeason(world, { competitionId: CUP_ID, seed });
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    return { world, season: created.season };
  }

  it("300 confrontos (jogo único e ida e volta) terminam com exatamente um classificado", () => {
    const decidedBy = new Set<string>();
    let ties = 0;
    for (let n = 0; ties < 300; n++) {
      const { world, season } = cupWith(`copa-criterios-${n}`);
      const done = playCup(world, season);
      for (const phase of done.bracket?.phases ?? []) {
        for (const tie of phase.ties) {
          const state = tieState(done, phase.index, tie.id);
          expect(state.decided).toBe(true);
          expect([tie.home, tie.away]).toContain(state.winner);
          expect(state.loser).not.toBe(state.winner);
          if (state.decidedBy) decidedBy.add(state.decidedBy);
          ties += 1;
        }
      }
    }
    expect(decidedBy.has("aggregate")).toBe(true);
    expect(decidedBy.has("penalties")).toBe(true);
  });

  it("a ida nunca tem prorrogação nem pênaltis; só a última perna decide", () => {
    for (let n = 0; n < 15; n++) {
      const { world, season } = cupWith(`copa-ida-${n}`);
      const done = playCup(world, season);
      for (const phase of done.bracket?.phases ?? []) {
        for (const tie of phase.ties) {
          const legs = done.calendar
            .flatMap((round) => round.fixtures)
            .filter((fixture) => fixture.tie?.id === tie.id);
          if (legs.length < 2) continue;
          const first = legs[0];
          const record = done.records.find(
            (entry) => entry.round === first?.round && entry.home === first?.home,
          );
          expect(record?.decision).toBeUndefined();
        }
      }
    }
  });

  it("prorrogação e pênaltis registram a decisão no confronto", () => {
    const found = new Set<string>();
    for (let n = 0; n < 40 && found.size < 2; n++) {
      const { world, season } = cupWith(`copa-forma-${n}`);
      const done = playCup(world, season);
      for (const record of done.records) {
        if (record.decision?.by === "extra-time") {
          expect(record.decision.extraTimeScore).toBeDefined();
          found.add("extra-time");
        }
        if (record.decision?.by === "penalties") {
          expect(record.decision.shootout?.kicks.length).toBeGreaterThanOrEqual(6);
          found.add("penalties");
        }
      }
    }
    expect(found.has("penalties")).toBe(true);
  });
});
