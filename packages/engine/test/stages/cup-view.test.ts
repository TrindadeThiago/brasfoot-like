import { describe, expect, it } from "vitest";
import { ensurePhaseDrawn } from "../../src/knockout/bracket";
import { phaseRounds } from "../../src/knockout/rules";
import { tieState } from "../../src/knockout/tie";
import { applyCupView, cupView } from "../../src/stages/cup-view";
import { regionalBank } from "../fixtures/stages-bank";
import { afterGroupsSeason, record } from "./helpers";

// 019 (T020): a fase eliminatória de uma divisão em fases reaproveita o módulo knockout/ (R3).
const world = regionalBank();

describe("cupView", () => {
  it("expõe o chaveamento, os participantes e o formato da fase eliminatória", () => {
    const season = afterGroupsSeason(world);
    const view = cupView(season, world, 1);
    expect(view.bracket).toBe(season.stages?.[1]?.bracket);
    expect(view.clubIds).toEqual(["a1", "a2", "b1", "b2", "c1", "c2", "d1", "d2"]);
    expect(view.cupView?.format.phases.map((phase) => phase.name)).toEqual([
      "Quartas de final",
      "Semifinal",
      "Final",
    ]);
    expect(view.cupView?.stage).toBe(1);
    // a divisão em fases não é uma copa da 018: a Season original segue sem `bracket`
    expect(season.bracket).toBeUndefined();
  });

  it("guarda a classificação geral da fase de grupos para o mando overall", () => {
    const season = afterGroupsSeason(world);
    const ranks = cupView(season, world, 1).cupView?.ranks ?? {};
    expect(Object.keys(ranks)).toHaveLength(20);
    expect(Math.min(...Object.values(ranks))).toBe(1);
    expect(Math.max(...Object.values(ranks))).toBe(20);
  });

  it("recusa a visão de uma fase que não é eliminatória", () => {
    expect(() => cupView(afterGroupsSeason(world), world, 0)).toThrow();
  });
});

describe("sorteio de fase pela visão", () => {
  const pairs = [
    { home: "a1", away: "d2" },
    { home: "b1", away: "c2" },
    { home: "c1", away: "b2" },
    { home: "d1", away: "a2" },
  ];

  it("preenche as rodadas absolutas da fase e devolve tudo para Season.stages", () => {
    const season = afterGroupsSeason(world);
    const view = ensurePhaseDrawn(cupView(season, world, 1), world, 0, pairs);
    const next = applyCupView(season, view, 1);
    expect(next.calendar[5]?.fixtures).toHaveLength(4);
    expect(next.calendar[5]?.fixtures.every((fixture) => fixture.tie?.phase === 0)).toBe(true);
    expect(next.calendar[5]?.fixtures.map((f) => [f.home, f.away])).toEqual(
      pairs.map((pair) => [pair.home, pair.away]),
    );
    expect(next.stages?.[1]?.bracket?.phases[0]?.drawn).toBe(true);
    expect(next.stages?.[1]?.bracket?.phases[1]?.drawn).toBe(false);
    // nada mais mudou
    expect(next.stages?.[0]).toBe(season.stages?.[0]);
    expect(next.records).toBe(season.records);
    expect(next.bracket).toBeUndefined();
  });

  it("sorteia a fase seguinte com os vencedores e a regra de mando da fase", () => {
    const season = afterGroupsSeason(world);
    const drawn = applyCupView(
      season,
      ensurePhaseDrawn(cupView(season, world, 1), world, 0, pairs),
      1,
    );
    // a1, b1, c1 e d1 vencem os jogos de ida da fase 0 (jogo único)
    const played = {
      ...drawn,
      records: [
        ...drawn.records,
        record(6, "a1", "d2", 2, 0),
        record(6, "b1", "c2", 2, 0),
        record(6, "c1", "b2", 1, 0),
        record(6, "d1", "a2", 3, 1),
      ],
      nextRound: 7,
    };
    const view = cupView(played, world, 1);
    const tie = view.bracket?.phases[0]?.ties[0];
    expect(tie && tieState(view, 0, tie.id).winner).toBe("a1");
    const next = applyCupView(played, ensurePhaseDrawn(view, world, 1), 1);
    const fixtures = next.calendar[6]?.fixtures ?? [];
    expect(fixtures).toHaveLength(2);
    const playing = fixtures.flatMap((f) => [f.home, f.away]).sort();
    expect(playing).toEqual(["a1", "b1", "c1", "d1"]);
  });
});

describe("phaseRounds com deslocamento", () => {
  it("numera as pernas a partir da primeira rodada da fase", () => {
    const format = cupView(afterGroupsSeason(world), world, 1).cupView?.format;
    if (!format) throw new Error("sem formato");
    expect(phaseRounds(format, 6)).toEqual([[6], [7], [8]]);
    expect(phaseRounds(format)).toEqual([[1], [2], [3]]);
  });
});
