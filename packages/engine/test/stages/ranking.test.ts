import { describe, expect, it } from "vitest";
import { tieState } from "../../src/knockout/tie";
import type { CompletedBank } from "../../src/model/types";
import { standings } from "../../src/season/standings";
import { overallStandings } from "../../src/stages/classification";
import { cupView } from "../../src/stages/cup-view";
import { finalOrder } from "../../src/stages/ranking";
import {
  CONTINENTAL_ID,
  continentalBank,
  groupsStage,
  LOWER_LEVEL,
  regionalBank,
  STAGES_ID,
} from "../fixtures/stages-bank";
import { newSeason, testWorld } from "../season/helpers/world";
import { playRounds, stagedSeason } from "./helpers";

// 019 (T026): posição final de uma divisão em fases (FR-024, research.md R8).
const world = regionalBank();

describe("finalOrder durante a temporada", () => {
  it("devolve todos os clubes uma vez, em qualquer rodada", () => {
    let season = stagedSeason(world, "ranking-1");
    for (let round = 0; round <= 8; round++) {
      const order = finalOrder(season, world);
      expect(order).toHaveLength(20);
      expect(new Set(order).size).toBe(20);
      expect([...order].sort()).toEqual([...season.clubIds].sort());
      if (round < 8) season = playRounds(world, season, 1);
    }
  });

  it("standings segue a ordem de finalOrder, com posições 1…N e estatísticas da fase de pontos", () => {
    const season = playRounds(world, stagedSeason(world, "ranking-2"), 8);
    const rows = standings(season, world);
    expect(rows.map((row) => row.clubId)).toEqual(finalOrder(season, world));
    expect(rows.map((row) => row.position)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    // o campeão tem os 4 jogos da fase de grupos nas estatísticas (os do mata-mata não entram)
    expect(rows[0]?.played).toBe(4);
  });
});

describe("finalOrder depois da última rodada", () => {
  const season = playRounds(world, stagedSeason(world, "ranking-3"), 8);
  const order = finalOrder(season, world);
  const view = cupView(season, world, 1);
  const phases = view.bracket?.phases ?? [];
  const winnerOf = (phase: number, index = 0) => {
    const tie = phases[phase]?.ties[index];
    return tie ? tieState(view, phase, tie.id) : undefined;
  };

  it("o campeão e o vice saem da final", () => {
    const final = winnerOf(2);
    expect(final?.decided).toBe(true);
    expect(order[0]).toBe(final?.winner);
    expect(order[1]).toBe(final?.loser);
  });

  it("quem caiu numa fase fica atrás de quem foi mais longe", () => {
    const semifinalLosers = (phases[1]?.ties ?? []).map((tie) => tieState(view, 1, tie.id).loser);
    const quarterLosers = (phases[0]?.ties ?? []).map((tie) => tieState(view, 0, tie.id).loser);
    expect(order.slice(2, 4).sort()).toEqual(semifinalLosers.sort());
    expect(order.slice(4, 8).sort()).toEqual(quarterLosers.sort());
  });

  it("os eliminados na mesma fase seguem a classificação geral da fase de grupos", () => {
    const rank = new Map(
      overallStandings(season, world, 0).map((row) => [row.clubId, row.position]),
    );
    for (const [from, to] of [
      [2, 4],
      [4, 8],
      [8, 20],
    ] as const) {
      const ranks = order.slice(from, to).map((id) => rank.get(id) ?? 0);
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    }
  });
});

describe("outras sequências", () => {
  it("uma fase de grupos na última posição ordena pela classificação geral", () => {
    const own = JSON.parse(JSON.stringify(world)) as CompletedBank;
    const lower = own.competitions
      .find((competition) => competition.id === STAGES_ID)
      ?.divisions.find((division) => division.level === LOWER_LEVEL);
    const only = groupsStage(5, 2);
    delete only.qualified;
    if (lower) lower.stages = [only];
    const season = playRounds(own, stagedSeason(own, "ranking-4"), 5);
    const order = finalOrder(season, own);
    expect(order).toEqual(overallStandings(season, own, 0).map((row) => row.clubId));
  });

  it("os eliminados na preliminar ficam atrás de todos os que chegaram aos grupos", () => {
    const continental = continentalBank();
    const season = playRounds(
      continental,
      stagedSeason(continental, "ranking-5", { competitionId: CONTINENTAL_ID, divisionLevel: 1 }),
      2,
    );
    expect(season.stages?.[1]?.started).toBe(true);
    const order = finalOrder(season, continental);
    expect(order).toHaveLength(28);
    const inGroups = new Set(season.stages?.[1]?.clubIds);
    expect(order.slice(0, 16).every((id) => inGroups.has(id))).toBe(true);
    expect(order.slice(16).every((id) => !inGroups.has(id))).toBe(true);
  });
});

describe("liga simples", () => {
  it("standings de uma Season sem fases continua a tabela de pontos", () => {
    const season = newSeason("ranking-liga");
    const rows = standings(season, testWorld());
    expect(rows).toHaveLength(20);
    expect(rows.map((row) => row.position)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });
});
