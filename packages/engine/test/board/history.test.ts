import { describe, expect, it } from "vitest";
import { acceptJobOffer, createOffer } from "../../src/board/offers";
import { fireManager } from "../../src/board/round";
import type { BoardState } from "../../src/board/types";
import { createRng } from "../../src/rng/xoshiro";
import { MANAGER, newCareer, play } from "./helpers";

describe("histórico do técnico (US9, FR-034)", () => {
  it("passagens: clube → sem clube → novo clube; temporadas registradas", () => {
    let career = play(newCareer(), { rounds: 10 });
    let board: BoardState = structuredClone(career.board);
    board.history.seasons.push({
      season: 1,
      year: career.league.year,
      clubId: MANAGER,
      achievements: [],
      reputation: board.manager.reputation,
    });
    fireManager(board, { season: 1, round: 10 }, 28);
    const target = Object.keys(board.clubs).find((id) => id !== MANAGER) as string;
    const coachId = board.clubs[target]?.coachId as string;
    const coach = board.coaches.find((entry) => entry.id === coachId);
    if (coach) coach.clubId = null;
    (board.clubs[target] as { coachId: string | null }).coachId = null;
    const vacancy = { id: "v", clubId: target, season: 1, round: 12, considered: true };
    board.vacancies.push(vacancy);
    career = play({ ...career, board }, { rounds: 2 });
    board = structuredClone(career.board);
    if (!board.vacancies.some((entry) => entry.clubId === target)) {
      board.vacancies.push({ ...vacancy });
      (board.clubs[target] as { coachId: string | null }).coachId = null;
    }
    const offer = createOffer(
      board,
      career,
      board.vacancies.find((v) => v.clubId === target) ?? vacancy,
    );
    const accepted = acceptJobOffer({ ...career, board }, offer.id, createRng("h"));
    if (!accepted.ok) throw new Error(accepted.error.code);
    const stints = accepted.board.history.stints;
    expect(stints.map((stint) => stint.clubId)).toEqual([MANAGER, null, target]);
    expect(stints[0]).toMatchObject({ exit: "fired", to: { season: 1, round: 10 } });
    expect(stints[1]?.to).toEqual({ season: 1, round: 12 });
    expect(stints[2]?.to).toBeUndefined();

    const ended = play(
      { ...career, board: accepted.board, market: accepted.market },
      { toEnd: true },
    );
    const last = ended.board.history.seasons.at(-1);
    expect(last?.clubId).toBe(target);
    expect(last?.goals).toBeDefined();
  });

  it("temporada terminada sem clube vira registro sem clube", () => {
    let career = play(newCareer(), { rounds: 30 });
    const board: BoardState = structuredClone(career.board);
    board.manager.noFiring = false;
    fireManager(board, { season: 1, round: 30 }, 28);
    board.manager.reputation = 1;
    board.manager.firedBy = { clubId: MANAGER, season: 1 };
    career = play({ ...career, board }, { toEnd: true });
    if (career.board.manager.clubId === null) {
      expect(career.board.history.seasons.at(-1)?.clubId).toBeNull();
    }
  });
});
