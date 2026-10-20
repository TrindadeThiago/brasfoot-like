import { describe, expect, it } from "vitest";
import { evaluateSeason, inGrace, shouldFireMidSeason } from "../../src/board/evaluation";
import { DEFAULT_BOARD } from "../../src/board/rules";
import type { BoardContext } from "../../src/board/types";
import { leagueTotalRounds } from "../../src/career/league";
import { createRng } from "../../src/rng/xoshiro";
import { type Career, MANAGER, newCareer, play } from "./helpers";

function edit(context: BoardContext, change: (board: BoardContext["board"]) => void): BoardContext {
  const board = structuredClone(context.board);
  change(board);
  return { ...context, board };
}

function lowConfidence(context: BoardContext, clubId: string, value = 0): BoardContext {
  return edit(context, (board) => {
    (board.clubs[clubId] as { confidence: number }).confidence = value;
  });
}

describe("demissão no meio da temporada (research.md R8)", () => {
  const later = play(newCareer(), { rounds: 10 });

  it("confiança no mínimo fora da carência ⇒ demitido", () => {
    expect(shouldFireMidSeason(lowConfidence(later, MANAGER), MANAGER, 10)).toBe(true);
    expect(
      shouldFireMidSeason(
        lowConfidence(later, MANAGER, DEFAULT_BOARD.fireThreshold + 1),
        MANAGER,
        10,
      ),
    ).toBe(false);
  });

  it("carência protege o recém-contratado", () => {
    const hired = edit(lowConfidence(later, MANAGER), (board) => {
      (board.clubs[MANAGER] as { hired: { season: number; round: number } }).hired = {
        season: 1,
        round: 8,
      };
    });
    expect(inGrace(hired, MANAGER, 10)).toBe(true);
    expect(shouldFireMidSeason(hired, MANAGER, 10)).toBe(false);
  });

  it("carência explícita (save migrado) vale até o momento indicado", () => {
    const migrated = edit(lowConfidence(later, MANAGER), (board) => {
      board.manager.graceUntil = { season: 1, round: 38 };
    });
    expect(shouldFireMidSeason(migrated, MANAGER, 10)).toBe(false);
  });

  it("clube da IA também passa por sorteio", () => {
    const clubId = Object.keys(later.board.clubs).find((id) => id !== MANAGER) as string;
    const context = lowConfidence(later, clubId);
    const outcomes = new Set(
      Array.from({ length: 30 }, (_, index) =>
        shouldFireMidSeason(context, clubId, 10, createRng(`sorteio-${index}`)),
      ),
    );
    expect(outcomes).toEqual(new Set([true, false]));
  });
});

describe("avaliação de fim de temporada (R8, FR-017, FR-021)", () => {
  let ended: Career | undefined;
  const finished = (): Career => {
    ended ??= play(newCareer(), { toEnd: true });
    return ended;
  };

  it("meta cumprida e confiança boa ⇒ mantido", () => {
    const career = finished();
    const total = leagueTotalRounds(career.league);
    const context = edit(career, (board) => {
      const club = board.clubs[MANAGER];
      if (!club?.goals) throw new Error("sem metas");
      club.goals.sport.position = 20;
      club.confidence = 60;
    });
    const evaluation = evaluateSeason(context, MANAGER, total);
    expect(evaluation?.sport.met).toBe(true);
    expect(evaluation?.decision).toBe("kept");
  });

  it("muito abaixo da meta e confiança baixa ⇒ demitido", () => {
    const career = finished();
    const total = leagueTotalRounds(career.league);
    const position = career.board.evaluation?.sport.final ?? 20;
    const context = edit(career, (board) => {
      const club = board.clubs[MANAGER];
      if (!club?.goals) throw new Error("sem metas");
      club.goals.sport.position = 1;
      club.confidence = 20;
    });
    const evaluation = evaluateSeason(context, MANAGER, total);
    if (position > 1) {
      expect(evaluation?.sport.met).toBe(false);
      expect(evaluation?.decision).toBe("fired");
      expect(evaluation?.reputationAfter).toBeLessThan(evaluation?.reputationBefore ?? 0);
    }
  });

  it("sem demissão ⇒ wouldFire, mesmas contas", () => {
    const career = finished();
    const total = leagueTotalRounds(career.league);
    const context = edit(career, (board) => {
      board.manager.noFiring = true;
      const club = board.clubs[MANAGER];
      if (!club?.goals) throw new Error("sem metas");
      club.goals.sport.position = 1;
      club.confidence = 0;
      club.goals.finance = { kind: "keepCash", startCash: Number.MAX_SAFE_INTEGER };
    });
    const evaluation = evaluateSeason(context, MANAGER, total);
    expect(evaluation?.decision).toBe("wouldFire");
  });

  it("conquistas: título, acesso e rebaixamento pela posição final", () => {
    const career = finished();
    const total = leagueTotalRounds(career.league);
    const evaluations = Object.keys(career.board.clubs).map((clubId) =>
      evaluateSeason(
        edit(career, (board) => {
          const club = board.clubs[clubId];
          if (club?.goals) club.goals.season = career.league.number;
        }),
        clubId,
        total,
      ),
    );
    const achievements = evaluations.flatMap((entry) => entry?.achievements ?? []);
    expect(achievements.filter((entry) => entry === "title")).toHaveLength(2);
    expect(achievements.filter((entry) => entry === "promotion").length).toBeGreaterThan(0);
    expect(achievements.filter((entry) => entry === "relegation").length).toBeGreaterThan(0);
  });
});
