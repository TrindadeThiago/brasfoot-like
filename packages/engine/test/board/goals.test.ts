import { describe, expect, it } from "vitest";
import { expectationOf, goalProgress, goalTiersFor, seasonGoals } from "../../src/board/goals";
import { GOAL_TIERS, type GoalTierId } from "../../src/board/types";
import { divisionClubs, newCareer, play } from "./helpers";

const rank = (tier: GoalTierId) => GOAL_TIERS.indexOf(tier);

describe("níveis de meta (research.md R4, FR-009)", () => {
  const career = newCareer();

  it("divisão de cima: sem acesso; com rebaixamento", () => {
    const tiers = goalTiersFor(career.world, career.league, 1).map((entry) => entry.tier);
    expect(tiers).not.toContain("promotion");
    expect(tiers).toContain("avoidRelegation");
    expect(tiers[0]).toBe("title");
  });

  it("divisão de baixo: acesso; sem rebaixamento ⇒ fugir das últimas", () => {
    const tiers = goalTiersFor(career.world, career.league, 2);
    expect(tiers.map((entry) => entry.tier)).toContain("promotion");
    expect(tiers.map((entry) => entry.tier)).not.toContain("avoidRelegation");
    expect(tiers.at(-1)?.tier).toBe("avoidBottom");
    const positions = tiers.map((entry) => entry.position);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(new Set(positions).size).toBe(positions.length);
  });
});

describe("metas esportivas (FR-007, SC-001)", () => {
  const career = newCareer();

  for (const level of [1, 2]) {
    it(`divisão ${level}: o mais forte recebe meta estritamente mais exigente que o mais fraco`, () => {
      const clubs = divisionClubs(career, level);
      const byExpectation = [...clubs].sort(
        (a, b) => expectationOf(career, a) - expectationOf(career, b),
      );
      const strongest = byExpectation[0] as string;
      const weakest = byExpectation.at(-1) as string;
      for (const reputation of [1, 30, 100]) {
        const strong = seasonGoals(career, strongest, reputation).sport.tier;
        const weak = seasonGoals(career, weakest, reputation).sport.tier;
        expect(rank(strong)).toBeLessThan(rank(weak));
      }
    });

    it(`divisão ${level}: maior expectativa nunca recebe meta mais fácil`, () => {
      const clubs = divisionClubs(career, level).sort(
        (a, b) => expectationOf(career, a) - expectationOf(career, b),
      );
      const tiers = clubs.map((clubId) => rank(seasonGoals(career, clubId, 30).sport.tier));
      expect([...tiers].sort((a, b) => a - b)).toEqual(tiers);
    });
  }

  it("expectativas são postos distintos de 1 a n", () => {
    const clubs = divisionClubs(career, 1);
    const ranks = clubs.map((clubId) => expectationOf(career, clubId)).sort((a, b) => a - b);
    expect(ranks).toEqual(clubs.map((_, index) => index + 1));
  });

  it("técnico de maior reputação recebe meta igual ou mais exigente", () => {
    for (const clubId of divisionClubs(career, 1)) {
      const novice = rank(seasonGoals(career, clubId, 1).sport.tier);
      const star = rank(seasonGoals(career, clubId, 100).sport.tier);
      expect(star).toBeLessThanOrEqual(novice);
    }
  });

  it("meio da temporada: a posição exigida se aproxima da posição atual", () => {
    const later = play(career, { rounds: 30 });
    const clubs = divisionClubs(later, 1);
    for (const clubId of clubs) {
      const goals = seasonGoals(later, clubId, 30, { midSeason: true });
      expect(goals.sport.midSeason).toBe(true);
      expect(goals.round).toBe(30);
    }
    const last = clubs.find(
      (clubId) => goalProgress(later, clubId)?.sport.current === clubs.length,
    );
    if (last) {
      const goals = seasonGoals(later, last, 30, { midSeason: true });
      expect(["avoidRelegation", "avoidBottom"]).toContain(goals.sport.tier);
    }
  });
});

describe("metas financeiras (R6)", () => {
  it("caixa negativo ⇒ não fechar no vermelho; folgado ⇒ não entrar em crise", () => {
    const career = newCareer();
    const [poor, rich] = divisionClubs(career, 1) as [string, string];
    const finances = structuredClone(career.finances);
    (finances.clubs[poor] as { cash: number }).cash = -1;
    (finances.clubs[rich] as { cash: number }).cash = 10_000_000_000;
    const edited = { ...career, finances };
    expect(seasonGoals(edited, poor, 30).finance.kind).toBe("nonNegativeCash");
    expect(seasonGoals(edited, rich, 30).finance.kind).toBe("noCrisis");
  });

  it("caixa apertado ⇒ manter o caixa", () => {
    const career = newCareer();
    const clubId = divisionClubs(career, 1)[0] as string;
    const finances = structuredClone(career.finances);
    (finances.clubs[clubId] as { cash: number }).cash = 1;
    expect(seasonGoals({ ...career, finances }, clubId, 30).finance.kind).toBe("keepCash");
  });
});

describe("andamento (FR-011)", () => {
  it("todos os clubes começam com metas; andamento compara posição e exigida", () => {
    const career = play(newCareer(), { rounds: 3 });
    for (const clubId of Object.keys(career.board.clubs)) {
      const progress = goalProgress(career, clubId);
      expect(progress).toBeDefined();
      if (!progress) continue;
      expect(progress.sport.met).toBe(progress.sport.current <= progress.sport.required);
    }
  });
});
