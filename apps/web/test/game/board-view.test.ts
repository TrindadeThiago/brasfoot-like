// 029 R3: situação das metas, nível e tendência da confiança e da torcida, e os motivos recentes.
import { describe, expect, it } from "vitest";
import {
  confidenceLevel,
  goalRows,
  reasonsOf,
  roundChanges,
  TREND_SYMBOL,
  trendOf,
} from "../../src/game/board-view";
import { storedCareer } from "../helpers/career";

describe("visões da diretoria (029)", () => {
  it("o nível da confiança usa as faixas do medidor: 60 ou mais é alta, de 30 a 59 média, abaixo de 30 baixa", () => {
    expect(confidenceLevel(100)).toBe("high");
    expect(confidenceLevel(60)).toBe("high");
    expect(confidenceLevel(59)).toBe("medium");
    expect(confidenceLevel(30)).toBe("medium");
    expect(confidenceLevel(29)).toBe("low");
    expect(confidenceLevel(0)).toBe("low");
  });

  it("a tendência soma as três últimas mudanças e tem símbolo próprio", () => {
    const change = (delta: number) => ({ delta });
    expect(trendOf([])).toBe("flat");
    expect(trendOf([change(5), change(-1), change(1)])).toBe("up");
    expect(trendOf([change(9), change(-2), change(-2), change(-3)])).toBe("down");
    expect(trendOf([change(3), change(-3)])).toBe("flat");
    // Só as três últimas contam.
    expect(trendOf([change(-50), change(1), change(1), change(1)])).toBe("up");
    expect(new Set(Object.values(TREND_SYMBOL)).size).toBe(3);
  });

  it("os motivos vêm do mais novo ao mais antigo e respeitam o limite", () => {
    const recent = [
      { season: 1, round: 1, delta: 2, value: 52, factors: [{ kind: "win" as const, amount: 2 }] },
      {
        season: 1,
        round: 2,
        delta: -3,
        value: 49,
        factors: [
          { kind: "loss" as const, amount: -2 },
          { kind: "belowGoal" as const, amount: -1 },
        ],
      },
    ];
    const reasons = reasonsOf(recent, 2);
    expect(reasons.map((reason) => reason.kind)).toEqual(["loss", "belowGoal"]);
    expect(reasonsOf(recent, 10)).toHaveLength(3);
    expect(roundChanges(recent).map((change) => change.round)).toEqual([2, 1]);
    // A lista original não é alterada.
    expect(recent[0]?.round).toBe(1);
  });

  it("as metas do clube empregado trazem esportiva e financeira com situação", async () => {
    const { save } = await storedCareer(6);
    const rows = goalRows(save);
    expect(rows).toBeDefined();
    const kinds = (rows ?? []).map((row) => row.kind);
    expect(kinds).toContain("sport");
    expect(kinds).toContain("finance");
    for (const row of rows ?? []) {
      if (row.kind === "sport" || row.kind === "finance") {
        expect(["onTrack", "atRisk"]).toContain(row.status);
      }
    }
  });

  it("meta continental ou estadual sem resultado está em andamento; com resultado, cumprida ou não", async () => {
    const { save } = await storedCareer(6);
    const clubId = save.board.manager.clubId as string;
    const club = save.board.clubs[clubId];
    if (!club?.goals) throw new Error("sem metas");
    const withGoal = (result?: "met" | "missed") => ({
      ...save,
      board: {
        ...save.board,
        clubs: {
          ...save.board.clubs,
          [clubId]: {
            ...club,
            goals: {
              ...club.goals,
              regional: {
                competitionId: save.league.competitionId,
                level: 1,
                target: { stage: 0 },
                ...(result ? { result } : {}),
              },
            },
          },
        },
      },
    });
    const status = (result?: "met" | "missed") =>
      goalRows(withGoal(result) as typeof save)?.find((row) => row.kind === "regional")?.status;
    expect(status()).toBe("inProgress");
    expect(status("met")).toBe("met");
    expect(status("missed")).toBe("missed");
  });

  it("sem clube (desempregado) ou sem metas da temporada, não há linhas", async () => {
    const { save } = await storedCareer(6);
    const unemployed = {
      ...save,
      board: { ...save.board, manager: { ...save.board.manager, clubId: null } },
    };
    expect(goalRows(unemployed)).toBeUndefined();
  });
});
