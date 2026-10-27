import { describe, expect, it } from "vitest";
import { regionalGoal, withRegionalGoals } from "../../src/board/regional";
import type { CompletedBank } from "../../src/model/types";
import { regionalCompetitionOf } from "../../src/regional/scope";
import { playToEnd, regionalState } from "../career/regional-helpers";

function withWeight(world: CompletedBank, competitionId: string, pct: number): CompletedBank {
  return {
    ...world,
    competitions: world.competitions.map((entry) =>
      entry.id === competitionId && entry.regional
        ? { ...entry, regional: { ...entry.regional, weight: { pct } } }
        : entry,
    ),
  };
}

describe("meta do estadual da diretoria (023 R7, R8)", () => {
  const { state, manager, seed, world } = regionalState();
  const leagues = [state.league, ...state.competitions];
  const competition = regionalCompetitionOf(world, manager);
  const first = competition?.divisions[0]?.clubIds ?? [];

  it("o tercil de cima da divisão espera a final, o do meio o mata-mata e o de baixo não tem meta", () => {
    const byReputation = [...first].sort(
      (a, b) =>
        (world.clubs.find((c) => c.id === b)?.reputation ?? 0) -
          (world.clubs.find((c) => c.id === a)?.reputation ?? 0) || (a < b ? -1 : 1),
    );
    const top = regionalGoal(world, leagues, byReputation[0] as string);
    const mid = regionalGoal(world, leagues, byReputation[5] as string);
    const low = regionalGoal(world, leagues, byReputation.at(-1) as string);
    expect(top?.target.phase).toBeDefined();
    expect(mid?.target.phase).toBeUndefined();
    expect(mid?.target.stage).toBe(top?.target.stage);
    expect(low).toBeUndefined();
  });

  it("peso 0 tira a meta; o peso fica guardado na meta", () => {
    const best = first[0] as string;
    const zero = regionalGoal(withWeight(world, competition?.id ?? "", 0), leagues, best);
    expect(zero).toBeUndefined();
    const half = regionalGoal(withWeight(world, competition?.id ?? "", 50), leagues, best);
    if (half) expect(half.weight).toBe(50);
  });

  it("withRegionalGoals põe a meta no clube do técnico e não altera a entrada", () => {
    const board = state.board;
    if (!board) throw new Error("sem diretoria");
    const before = JSON.stringify(board);
    const next = withRegionalGoals(board, world, leagues);
    expect(JSON.stringify(board)).toBe(before);
    const goals = Object.values(next.clubs).filter((club) => club.goals?.regional);
    expect(goals.length).toBeGreaterThan(0);
  });

  it("ao fim da temporada as metas das campanhas encerradas têm resultado e o campeão é marcado", () => {
    const end = playToEnd(state, seed, manager);
    const board = end.board;
    if (!board) throw new Error("sem diretoria");
    const withGoal = Object.entries(board.clubs).filter(([, club]) => club.goals?.regional);
    expect(withGoal.length).toBeGreaterThan(0);
    for (const [, club] of withGoal) {
      expect(["met", "missed"]).toContain(club.goals?.regional?.result);
    }
    const champions = withGoal.filter(([, club]) => club.goals?.regional?.champion);
    for (const [, club] of champions) expect(club.goals?.regional?.result).toBe("met");
  }, 300_000);
});
