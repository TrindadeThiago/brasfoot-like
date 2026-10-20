import { describe, expect, it } from "vitest";
import { generateCoach, hireCoach, releaseCoach } from "../../src/board/coaches";
import { createBoard } from "../../src/board/create";
import { boardAfterRound } from "../../src/board/round";
import { DEFAULT_BOARD } from "../../src/board/rules";
import type { BoardState } from "../../src/board/types";
import { nameBankFor } from "../../src/renewal/names";
import { createRng } from "../../src/rng/xoshiro";
import { type Career, MANAGER, newCareer, play, SEED } from "./helpers";

describe("técnicos da IA na criação (research.md R14)", () => {
  const career = newCareer();

  it("todo clube da IA tem técnico; o do jogador não", () => {
    for (const [clubId, club] of Object.entries(career.board.clubs)) {
      if (clubId === MANAGER) {
        expect(club.coachId).toBeNull();
        continue;
      }
      const coach = career.board.coaches.find((entry) => entry.id === club.coachId);
      expect(coach?.clubId).toBe(clubId);
      const reputation = career.world.clubs.find((entry) => entry.id === clubId)?.reputation ?? 0;
      expect(Math.abs((coach?.reputation ?? 0) - reputation)).toBeLessThanOrEqual(
        DEFAULT_BOARD.coachSpread,
      );
      const club2 = career.world.clubs.find((entry) => entry.id === clubId);
      const names = nameBankFor(career.world, club2?.countryId ?? "");
      const [first] = (coach?.name ?? "").split(" ");
      expect(names.firstNames).toContain(first);
    }
  });

  it("mesma seed ⇒ mesmo estado", () => {
    const again = createBoard(career.world, career.league, career.finances, SEED, {
      clubId: MANAGER,
      noFiring: false,
    });
    expect(again).toEqual(career.board);
  });

  it("sem técnico do jogador (simulações): todos os clubes da IA", () => {
    const none = newCareer({ managerClubId: null });
    expect(none.board.manager.clubId).toBeNull();
    expect(Object.values(none.board.clubs).every((club) => club.coachId !== null)).toBe(true);
  });
});

describe("pool e contratação", () => {
  const career = newCareer();
  const scope = {
    world: career.world,
    league: career.league,
    finances: career.finances,
    careerSeed: SEED,
  };
  const clubId = Object.keys(career.board.clubs).find((id) => id !== MANAGER) as string;

  it("prefere o livre de reputação mais próxima dentro das margens", () => {
    const board: BoardState = structuredClone(career.board);
    const coachId = board.clubs[clubId]?.coachId as string;
    releaseCoach(board, coachId, DEFAULT_BOARD.maxFreeCoaches);
    expect(board.clubs[clubId]?.coachId).toBeNull();
    const hired = hireCoach(board, scope, clubId, createRng("x"));
    expect(hired.id).toBe(coachId);
    expect(board.clubs[clubId]?.coachId).toBe(coachId);
    expect(board.clubs[clubId]?.confidence).toBe(DEFAULT_BOARD.neutral);
  });

  it("sem livre compatível, gera um novo", () => {
    const board: BoardState = structuredClone(career.board);
    const coachId = board.clubs[clubId]?.coachId as string;
    releaseCoach(board, coachId, DEFAULT_BOARD.maxFreeCoaches);
    const coach = board.coaches.find((entry) => entry.id === coachId);
    if (coach) coach.reputation = 100;
    const reputation = career.world.clubs.find((entry) => entry.id === clubId)?.reputation ?? 0;
    const hired = hireCoach(board, scope, clubId, createRng("x"));
    if (reputation + DEFAULT_BOARD.upperMargin < 100) expect(hired.id).not.toBe(coachId);
  });

  it("pool limitado: saem os de menor reputação", () => {
    const board: BoardState = structuredClone(career.board);
    for (let index = 0; index < 5; index++) {
      generateCoach(board, career.world, clubId, createRng(`p${index}`), 8);
    }
    releaseCoach(board, board.clubs[clubId]?.coachId as string, 3);
    expect(board.coaches.filter((coach) => coach.clubId === null)).toHaveLength(3);
  });
});

describe("trocas de técnico da IA (US8)", () => {
  it("clube da IA no limite de confiança pode demitir; vaga preenchida em poucas rodadas", () => {
    let career: Career = play(newCareer(), { rounds: 10 });
    const board = structuredClone(career.board);
    const targets = Object.keys(board.clubs)
      .filter((id) => id !== MANAGER)
      .slice(0, 10);
    for (const id of targets) (board.clubs[id] as { confidence: number }).confidence = 0;
    career = { ...career, board };
    const after = play(career, { rounds: 1 });
    const fired = targets.filter((id) => after.board.vacancies.some((v) => v.clubId === id));
    expect(fired.length).toBeGreaterThan(0);
    const later = play(after, {
      rounds: DEFAULT_BOARD.vacancyRounds + DEFAULT_BOARD.offerRounds + 1,
    });
    for (const id of fired) {
      expect(later.board.clubs[id]?.coachId).not.toBeNull();
    }
  });

  it("clube dentro da meta não demite no meio da temporada", () => {
    const career = play(newCareer(), { rounds: 10 });
    const update = boardAfterRound(career, 10);
    for (const vacancy of update.board.vacancies) {
      const before = career.board.clubs[vacancy.clubId];
      expect(before?.confidence ?? 100).toBeLessThanOrEqual(DEFAULT_BOARD.fireThreshold + 10);
    }
  });
});
