import { describe, expect, it } from "vitest";
import { continentalGoal, evaluateContinental } from "../../src/board/continental";
import { evaluateSeason } from "../../src/board/evaluation";
import type { BoardContext } from "../../src/board/types";
import { startNextSeason } from "../../src/career/next-season";
import { CONTINENTAL_IDS } from "../../src/worldgen/continental";
import {
  compactState,
  continentalChampion,
  continentalLeague,
  playDays,
} from "../career/continental-helpers";
import { allSeasons, ok } from "../career/qualification-helpers";

describe("meta continental da diretoria (022 US2, FR-018)", () => {
  const { state, manager, seed } = compactState({ seed: "continental-metas" });
  const leagues = allSeasons(state);
  const participants = continentalLeague(state).divisions[0]?.clubIds ?? [];
  const byReputation = [...participants].sort(
    (a, b) =>
      (state.world.clubs.find((club) => club.id === b)?.reputation ?? 0) -
        (state.world.clubs.find((club) => club.id === a)?.reputation ?? 0) || (a < b ? -1 : 1),
  );

  it("o alvo sai da reputação do clube entre os participantes, por tercil", () => {
    const top = continentalGoal(state.world, leagues, byReputation[0] as string);
    const mid = continentalGoal(state.world, leagues, byReputation[7] as string);
    const low = continentalGoal(state.world, leagues, byReputation[15] as string);
    expect(top?.competitionId).toBe(CONTINENTAL_IDS.major);
    expect(top?.target).toEqual({ stage: 2, phase: 2 });
    expect(mid?.target).toEqual({ stage: 2 });
    expect(low?.target).toEqual({ stage: 1 });
  });

  it("quem não disputa a competição não tem meta continental", () => {
    const everyone = new Set(
      state.world.competitions
        .filter((competition) => competition.countryId === undefined)
        .flatMap((competition) => competition.divisions.flatMap((division) => division.clubIds)),
    );
    const outsider = state.world.clubs.find((club) => !everyone.has(club.id));
    expect(outsider).toBeDefined();
    expect(continentalGoal(state.world, leagues, outsider?.id ?? "")).toBeUndefined();
  });

  it("evaluateContinental compara a fase alcançada com o alvo", () => {
    const goal = { competitionId: CONTINENTAL_IDS.major, target: { stage: 2, phase: 2 } };
    expect(evaluateContinental(goal, { stage: 2, phase: 3 })).toBe("met");
    expect(evaluateContinental(goal, { stage: 2, phase: 2 })).toBe("met");
    expect(evaluateContinental(goal, { stage: 2, phase: 1 })).toBe("missed");
    expect(evaluateContinental(goal, { stage: 1 })).toBe("missed");
    expect(evaluateContinental(goal, undefined)).toBe("missed");
  });

  it("os clubes da diretoria começam a temporada com a meta no quadro", () => {
    const goals = state.board?.clubs[manager]?.goals;
    expect(goals?.continental?.competitionId).toBe(CONTINENTAL_IDS.major);
    for (const clubId of participants) {
      expect(state.board?.clubs[clubId]?.goals?.continental).toBeDefined();
    }
  });

  it("ao fim da campanha a meta é avaliada e mexe na confiança do técnico", () => {
    const end = playDays(state, "end", seed, manager);
    const goal = end.board?.clubs[manager]?.goals?.continental;
    expect(goal?.result === "met" || goal?.result === "missed").toBe(true);
    expect(goal?.reached).toBeDefined();
    const factors = (end.board?.clubs[manager]?.recent ?? []).flatMap((change) =>
      change.factors.map((factor) => factor.kind),
    );
    expect(factors.some((kind) => kind === "continentalMet" || kind === "continentalMiss")).toBe(
      true,
    );
  });

  it("o título continental entra nos feitos do técnico e a meta nova vem na temporada seguinte", () => {
    const end = playDays(state, "end", seed, manager);
    const champion = continentalChampion(end) as string;
    expect(end.board?.clubs[champion]?.goals?.continental?.champion).toBe(true);
    const context: BoardContext = {
      world: end.world,
      league: end.league,
      finances: end.finances,
      board: end.board as NonNullable<typeof end.board>,
      careerSeed: seed,
    };
    // O técnico é de um clube da liga em foco; força o título para conferir o feito.
    const board = structuredClone(end.board) as NonNullable<typeof end.board>;
    const goals = board.clubs[manager]?.goals;
    if (!goals?.continental) throw new Error("sem meta continental");
    goals.continental = { ...goals.continental, champion: true, result: "met" };
    const evaluation = evaluateSeason({ ...context, board }, manager, 14);
    expect(evaluation?.achievements).toContain("continentalTitle");

    const next = ok(startNextSeason(end, seed, undefined, manager)).state;
    const clubs = continentalLeague(next).divisions[0]?.clubIds ?? [];
    expect(clubs.length).toBe(16);
    for (const clubId of clubs) {
      const fresh = next.board?.clubs[clubId]?.goals?.continental;
      expect(fresh?.competitionId).toBe(CONTINENTAL_IDS.major);
      expect(fresh?.result).toBeUndefined();
    }
  });
});
