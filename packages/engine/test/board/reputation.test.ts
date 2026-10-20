import { describe, expect, it } from "vitest";
import { reputationDelta } from "../../src/board/reputation";
import { DEFAULT_BOARD } from "../../src/board/rules";

const rules = DEFAULT_BOARD;

describe("reputação do técnico (research.md R9, FR-002 a FR-004)", () => {
  it("meta cumprida sobe; mais quando o clube está acima do patamar do técnico", () => {
    const small = reputationDelta(rules, { reputation: 30, clubReputation: 20, sportMet: true });
    const big = reputationDelta(rules, { reputation: 30, clubReputation: 80, sportMet: true });
    expect(small).toBe(rules.metBase);
    expect(big).toBeGreaterThan(small);
  });

  it("meta descumprida desce, mais quanto mais longe", () => {
    const near = reputationDelta(rules, {
      reputation: 50,
      clubReputation: 50,
      sportMet: false,
      missBy: 1,
    });
    const far = reputationDelta(rules, {
      reputation: 50,
      clubReputation: 50,
      sportMet: false,
      missBy: 8,
    });
    expect(near).toBeLessThan(0);
    expect(far).toBeLessThan(near);
  });

  it("meta perdida dentro da expectativa não custa; superar a expectativa rende", () => {
    expect(
      reputationDelta(rules, { reputation: 30, clubReputation: 20, sportMet: false, missBy: 0 }),
    ).toBe(0);
    const over = reputationDelta(rules, {
      reputation: 30,
      clubReputation: 20,
      sportMet: true,
      overBy: 6,
    });
    expect(over).toBe(rules.metBase + 3);
  });

  it("título vale o dobro na divisão de cima; acesso sobe; rebaixamento desce", () => {
    const base = { reputation: 50, clubReputation: 50 };
    expect(reputationDelta(rules, { ...base, achievements: ["title"], topDivision: true })).toBe(
      2 * rules.titleBonus,
    );
    expect(reputationDelta(rules, { ...base, achievements: ["title"] })).toBe(rules.titleBonus);
    expect(reputationDelta(rules, { ...base, achievements: ["promotion"] })).toBe(
      rules.promotionBonus,
    );
    expect(reputationDelta(rules, { ...base, achievements: ["relegation"] })).toBe(
      -rules.relegationPenalty,
    );
  });

  it("demissão pesa mais em clube abaixo do patamar do técnico", () => {
    const fromBig = reputationDelta(rules, { reputation: 60, clubReputation: 80, fired: true });
    const fromSmall = reputationDelta(rules, { reputation: 60, clubReputation: 20, fired: true });
    expect(fromBig).toBe(-rules.firePenalty);
    expect(fromSmall).toBeLessThan(fromBig);
  });

  it("limitada a [1, 100]", () => {
    expect(
      100 +
        reputationDelta(rules, {
          reputation: 100,
          clubReputation: 100,
          sportMet: true,
          achievements: ["title"],
          topDivision: true,
        }),
    ).toBe(100);
    expect(
      2 +
        reputationDelta(rules, {
          reputation: 2,
          clubReputation: 1,
          sportMet: false,
          missBy: 20,
          fired: true,
        }),
    ).toBe(1);
  });
});
