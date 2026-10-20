import { describe, expect, it } from "vitest";
import { confidenceChange } from "../../src/board/confidence";
import { currentPosition, expectationOf } from "../../src/board/goals";
import { fansAfterRound, moodBand, moodChange, tableSnapshot } from "../../src/fans/mood";
import { DEFAULT_FANS } from "../../src/fans/rules";
import { fansCareer, MANAGER, opponentIn, playFans, withMood, withScore } from "./helpers";

const rules = DEFAULT_FANS;

describe("humor por rodada (013 R4)", () => {
  const after1 = playFans(fansCareer(), { rounds: 1 });

  it("vitória sobe, derrota desce", () => {
    const win = moodChange(withScore(after1, MANAGER, 1, 2, 0), MANAGER, 1);
    const loss = moodChange(withScore(after1, MANAGER, 1, 0, 2), MANAGER, 1);
    expect(win.factors).toContainEqual({ kind: "win", amount: rules.win });
    expect(loss.factors).toContainEqual({ kind: "loss", amount: -rules.loss });
    expect(win.value).toBeGreaterThan(loss.value);
  });

  it("limitado a [0, 100]", () => {
    for (const mood of [0, 100]) {
      for (const [own, other] of [
        [0, 5],
        [5, 0],
      ] as const) {
        const change = moodChange(
          withMood(withScore(after1, MANAGER, 1, own, other), MANAGER, mood),
          MANAGER,
          1,
        );
        expect(change.value).toBeGreaterThanOrEqual(0);
        expect(change.value).toBeLessThanOrEqual(100);
      }
    }
  });

  it("antes da rodada de checagem, volta ao neutro", () => {
    const change = moodChange(
      withMood(withScore(after1, MANAGER, 1, 1, 1), MANAGER, 90),
      MANAGER,
      1,
    );
    expect(change.factors.find((factor) => factor.kind === "calm")?.amount).toBeLessThan(0);
  });

  it("depois da rodada de checagem, a expectativa puxa", () => {
    const later = withMood(playFans(fansCareer(), { rounds: rules.checkFromRound }), MANAGER, 100);
    const change = moodChange(later, MANAGER, rules.checkFromRound);
    expect(change.factors.some((factor) => factor.kind === "calm")).toBe(false);
    expect(
      change.factors.some(
        (factor) => factor.kind === "belowExpectation" || factor.kind === "aheadOfExpectation",
      ),
    ).toBe(true);
  });

  it("cinco derrotas seguidas derrubam ao menos 15 pontos (SC-001)", () => {
    let career = playFans(fansCareer(), { rounds: 1 });
    let mood = rules.neutral;
    career = withMood(career, MANAGER, mood);
    for (let index = 0; index < 5; index++) {
      const change = moodChange(withScore(career, MANAGER, 1, 0, 2), MANAGER, 1);
      mood = change.value;
      career = withMood(career, MANAGER, mood);
    }
    expect(rules.neutral - mood).toBeGreaterThanOrEqual(15);
  });

  it("faixas", () => {
    expect(moodBand(rules, 10)).toBe("furious");
    expect(moodBand(rules, 30)).toBe("unhappy");
    expect(moodBand(rules, 50)).toBe("neutral");
    expect(moodBand(rules, 70)).toBe("happy");
    expect(moodBand(rules, 95)).toBe("euphoric");
  });

  it("só o clube do jogador guarda as mudanças; todos os clubes reagem", () => {
    const later = playFans(fansCareer(), { rounds: 12 });
    expect(later.fans.clubs[MANAGER]?.recent).toHaveLength(rules.keepRecent);
    const others = Object.entries(later.fans.clubs).filter(([id]) => id !== MANAGER);
    expect(others.every(([, club]) => club.recent.length === 0)).toBe(true);
    expect(others.some(([, club]) => club.mood !== rules.neutral)).toBe(true);
  });

  it("determinístico, inclusive salvando e carregando", () => {
    const start = fansCareer();
    const direct = playFans(start, { rounds: 8 });
    const half = JSON.parse(JSON.stringify(playFans(start, { rounds: 4 })));
    expect(playFans(half, { rounds: 4 }).fans).toEqual(direct.fans);
  });

  it("fansAfterRound não altera a entrada", () => {
    const before = JSON.stringify(after1.fans);
    fansAfterRound(after1, 1, MANAGER);
    expect(JSON.stringify(after1.fans)).toBe(before);
  });
});

describe("clássicos (013 R7, SC-002)", () => {
  const plain = playFans(fansCareer({ rivalries: [] }), { rounds: 1 });
  const rival = opponentIn(plain, MANAGER, 1);
  const derby = playFans(fansCareer({ rivalries: [{ clubIds: [MANAGER, rival], intensity: 3 }] }), {
    rounds: 1,
  });

  it("derrota em clássico de intensidade 3 pesa ≥ 1,5× na torcida, nos dois clubes", () => {
    const normal = moodChange(withScore(plain, MANAGER, 1, 0, 2), MANAGER, 1);
    const big = moodChange(withScore(derby, MANAGER, 1, 0, 2), MANAGER, 1);
    const normalLoss = normal.factors.find((factor) => factor.kind === "loss")?.amount ?? 0;
    const derbyLoss = big.factors.find((factor) => factor.kind === "derbyLoss")?.amount ?? 0;
    expect(derbyLoss).toBeLessThanOrEqual(normalLoss * 1.5);
    const winner = moodChange(withScore(derby, MANAGER, 1, 0, 2), rival, 1);
    expect(winner.factors.find((factor) => factor.kind === "derbyWin")?.amount).toBeGreaterThan(
      rules.win,
    );
  });

  it("intensidade maior pesa mais", () => {
    const low = playFans(fansCareer({ rivalries: [{ clubIds: [MANAGER, rival], intensity: 1 }] }), {
      rounds: 1,
    });
    const weak = moodChange(withScore(low, MANAGER, 1, 0, 2), MANAGER, 1);
    const strong = moodChange(withScore(derby, MANAGER, 1, 0, 2), MANAGER, 1);
    const amount = (change: typeof weak) =>
      change.factors.find((factor) => factor.kind === "derbyLoss")?.amount ?? 0;
    expect(amount(strong)).toBeLessThan(amount(weak));
  });

  it("na diretoria, derrota em clássico pesa ≥ 1,5× a derrota comum", () => {
    const normal = confidenceChange(withScore(plain, MANAGER, 1, 0, 2), MANAGER, 1, 30);
    const big = confidenceChange(withScore(derby, MANAGER, 1, 0, 2), MANAGER, 1, 30);
    const normalLoss = normal.factors.find((factor) => factor.kind === "loss")?.amount ?? 0;
    const derbyLoss = big.factors.find((factor) => factor.kind === "derbyLoss")?.amount ?? 0;
    expect(derbyLoss).toBeLessThanOrEqual(normalLoss * 1.5);
  });
});

describe("fotografia da tabela", () => {
  it("expectativas e posições iguais às calculadas clube a clube", () => {
    const career = playFans(fansCareer(), { rounds: 6 });
    const snapshot = tableSnapshot(career);
    for (const clubId of career.league.divisions.flatMap((season) => season.clubIds)) {
      expect(snapshot.expectation.get(clubId)).toBe(expectationOf(career, clubId));
      expect(snapshot.position.get(clubId)).toBe(currentPosition(career, clubId));
    }
  });
});
