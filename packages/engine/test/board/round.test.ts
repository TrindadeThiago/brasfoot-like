import { describe, expect, it } from "vitest";
import { managerClubOf } from "../../src/board/create";
import { DEFAULT_BOARD } from "../../src/board/rules";
import type { BoardState } from "../../src/board/types";
import { startLeagueRound } from "../../src/career/league-round";
import { advanceCareer, completeCareerRound } from "../../src/finance/round";
import { finishRound } from "../../src/season/live-round";
import { type Career, MANAGER, newCareer, play } from "./helpers";

function round(career: Career, withBoard: boolean) {
  const started = startLeagueRound(career.league, career.world);
  if (!started.ok) throw new Error("rodada");
  return completeCareerRound(
    career.league,
    career.finances,
    career.world,
    finishRound(started.round),
    managerClubOf(career.board),
    undefined,
    { state: career.market, careerSeed: career.careerSeed },
    withBoard ? { state: career.board, careerSeed: career.careerSeed } : undefined,
  );
}

describe("diretoria na rodada da carreira (research.md R2)", () => {
  it("com diretoria devolve `board`; sem ela o resultado é o de antes", () => {
    const career = newCareer();
    const withBoard = round(career, true);
    const without = round(career, false);
    if (!withBoard.ok || !without.ok) throw new Error("rodada");
    expect(withBoard.board).toBeDefined();
    expect(without.board).toBeUndefined();
    const { board: _board, ...rest } = withBoard;
    expect(rest).toEqual(without);
  });

  it("demissão na rodada: libera o clube e as próximas rodadas rodam sem humano", () => {
    let career = play(newCareer(), { rounds: 10 });
    const board: BoardState = structuredClone(career.board);
    const club = board.clubs[MANAGER];
    if (!club?.goals) throw new Error("sem metas");
    club.confidence = 0;
    // Meta de título: a confiança anda para baixo e não sai do limite de demissão.
    club.goals.sport.position = 1;
    career = { ...career, board };
    const market = structuredClone(career.market);
    market.negotiations.push({
      id: "neg-x",
      playerId: career.world.players.find((player) => player.clubId !== MANAGER)?.id as string,
      kind: "buy",
      clubId: MANAGER,
      stage: "club_offer",
      openedRound: 10,
    });
    career = { ...career, market };
    const after = play(career, { rounds: 1 });
    expect(after.board.manager.clubId).toBeNull();
    expect(after.board.notice?.kind).toBe("fired");
    expect(after.market.negotiations).toEqual([]);
    expect(managerClubOf(after.board)).toBe("");
    const more = play(after, { rounds: 3 });
    expect(more.board.manager.clubId === null || more.board.manager.clubId !== MANAGER).toBe(true);
  });

  it("última rodada: avaliação e registro da temporada do técnico", () => {
    const ended = play(newCareer(), { toEnd: true });
    expect(ended.board.evaluation?.clubId).toBe(MANAGER);
    expect(ended.board.history.seasons).toHaveLength(1);
    expect(ended.board.history.seasons[0]?.goals).toBeDefined();
  });

  it("sem demissão: nunca perde o clube", () => {
    let career = play(newCareer({ noFiring: true }), { rounds: 10 });
    const board: BoardState = structuredClone(career.board);
    (board.clubs[MANAGER] as { confidence: number }).confidence = 0;
    career = play({ ...career, board }, { toEnd: true });
    expect(career.board.manager.clubId).toBe(MANAGER);
    expect(career.board.evaluation?.decision).not.toBe("fired");
  });

  it("determinístico, inclusive salvando e carregando no meio", () => {
    const start = newCareer();
    const direct = play(start, { rounds: 20 });
    const half = play(start, { rounds: 10 });
    const reloaded = JSON.parse(JSON.stringify(half)) as Career;
    const resumed = play(reloaded, { rounds: 10 });
    expect(resumed.board).toEqual(direct.board);
  });

  it("advanceCareer repassa a diretoria", () => {
    const career = newCareer();
    const result = advanceCareer(
      career.league,
      career.finances,
      career.world,
      { rounds: 2 },
      MANAGER,
      undefined,
      undefined,
      undefined,
      { state: career.board, careerSeed: career.careerSeed },
    );
    if (!result.ok) throw new Error("avanço");
    expect(result.board?.clubs[MANAGER]?.recent).toHaveLength(2);
    expect(DEFAULT_BOARD.keepRecent).toBeGreaterThan(2);
  });
});
