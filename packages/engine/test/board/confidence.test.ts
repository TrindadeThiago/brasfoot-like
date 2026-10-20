import { describe, expect, it } from "vitest";
import { confidenceChange, patiencePct } from "../../src/board/confidence";
import { DEFAULT_BOARD } from "../../src/board/rules";
import type { BoardContext } from "../../src/board/types";
import type { MatchRecord } from "../../src/season/types";
import { MANAGER, newCareer, play } from "./helpers";

/** Reescreve o placar do jogo do clube na rodada. */
function withScore(
  context: BoardContext,
  clubId: string,
  round: number,
  own: number,
  other: number,
) {
  const league = structuredClone(context.league);
  for (const season of league.divisions) {
    for (const record of season.records as MatchRecord[]) {
      if (record.round !== round) continue;
      if (record.home === clubId) record.score = { home: own, away: other };
      if (record.away === clubId) record.score = { home: other, away: own };
    }
  }
  return { ...context, league };
}

function withConfidence(context: BoardContext, clubId: string, value: number): BoardContext {
  const board = structuredClone(context.board);
  (board.clubs[clubId] as { confidence: number }).confidence = value;
  return { ...context, board };
}

describe("confiança por rodada (research.md R7)", () => {
  const after1 = play(newCareer(), { rounds: 1 });

  it("vitória sobe, derrota desce, empate não muda pelo resultado", () => {
    const win = confidenceChange(withScore(after1, MANAGER, 1, 2, 0), MANAGER, 1, 30);
    const loss = confidenceChange(withScore(after1, MANAGER, 1, 0, 2), MANAGER, 1, 30);
    const draw = confidenceChange(withScore(after1, MANAGER, 1, 1, 1), MANAGER, 1, 30);
    expect(win.factors).toContainEqual({ kind: "win", amount: DEFAULT_BOARD.win });
    expect(loss.factors.find((factor) => factor.kind === "loss")?.amount).toBeLessThan(0);
    expect(draw.factors.some((factor) => factor.kind === "win" || factor.kind === "loss")).toBe(
      false,
    );
    expect(win.value).toBeGreaterThan(loss.value);
  });

  it("paciência: reputação maior perde menos numa derrota", () => {
    const context = withScore(after1, MANAGER, 1, 0, 3);
    const novice = confidenceChange(context, MANAGER, 1, 1);
    const star = confidenceChange(context, MANAGER, 1, 100);
    expect(star.delta).toBeGreaterThan(novice.delta);
    expect(patiencePct(after1, 100)).toBeLessThan(patiencePct(after1, 1));
  });

  it("limitada a [0, 100]", () => {
    const low = confidenceChange(
      withConfidence(withScore(after1, MANAGER, 1, 0, 5), MANAGER, 0),
      MANAGER,
      1,
      1,
    );
    const high = confidenceChange(
      withConfidence(withScore(after1, MANAGER, 1, 5, 0), MANAGER, 100),
      MANAGER,
      1,
      100,
    );
    expect(low.value).toBe(0);
    expect(high.value).toBe(100);
  });

  it("crise financeira desce", () => {
    const finances = structuredClone(after1.finances);
    const club = finances.clubs[MANAGER] as { inCrisis: boolean; cash: number };
    club.inCrisis = true;
    club.cash = -1;
    const context = withScore({ ...after1, finances }, MANAGER, 1, 1, 1);
    const change = confidenceChange(context, MANAGER, 1, 30);
    expect(change.factors.find((factor) => factor.kind === "crisis")?.amount).toBeLessThan(0);
    expect(change.delta).toBeLessThan(0);
  });

  it("abaixo da meta puxa para baixo a partir da rodada de checagem", () => {
    const later = play(newCareer(), { rounds: DEFAULT_BOARD.goalCheckFromRound });
    const round = DEFAULT_BOARD.goalCheckFromRound;
    const board = structuredClone(later.board);
    const goals = board.clubs[MANAGER]?.goals;
    if (!goals) throw new Error("sem metas");
    goals.sport.position = 1;
    goals.sport.tier = "title";
    const context = withScore({ ...later, board }, MANAGER, round, 1, 1);
    const change = confidenceChange(context, MANAGER, round, 30);
    const position = later.league.divisions[0]?.clubIds.includes(MANAGER);
    expect(position).toBe(true);
    const below = change.factors.find((factor) => factor.kind === "belowGoal");
    if (below) expect(below.amount).toBeLessThan(0);
  });

  it("três vitórias seguidas somam ao menos 5 pontos (SC-007)", () => {
    let context: BoardContext = withConfidence(after1, MANAGER, DEFAULT_BOARD.neutral);
    let total = 0;
    for (let index = 0; index < 3; index++) {
      const change = confidenceChange(withScore(context, MANAGER, 1, 2, 0), MANAGER, 1, 30);
      total += change.delta;
      context = withConfidence(context, MANAGER, change.value);
    }
    expect(total).toBeGreaterThanOrEqual(5);
  });

  it("só o clube do jogador guarda as últimas mudanças", () => {
    const later = play(newCareer(), { rounds: 12 });
    expect(later.board.clubs[MANAGER]?.recent.length).toBe(DEFAULT_BOARD.keepRecent);
    const other = Object.values(later.board.clubs).find((club) => club.clubId !== MANAGER);
    expect(other?.recent).toEqual([]);
  });
});
