// 030 R10: resultado do clube e campanha por competição, só com o que o jogo já guarda.
import type { SaveFile } from "@brasfoot-like/save";
import { describe, expect, it } from "vitest";
import { campaign, clubResult } from "../../src/game/season-view";
import { seasonEndSummary } from "../../src/game/selectors";
import { storedCareer } from "../helpers/career";
import { finishedSeason } from "../helpers/season-end";

async function ended(): Promise<SaveFile> {
  const { save } = await storedCareer(1);
  return finishedSeason(save);
}

describe("resultado do clube (030)", () => {
  it("traz situação, posição e os números da linha da classificação", async () => {
    const save = await ended();
    const summary = seasonEndSummary(save);
    const result = clubResult(save);
    expect(result.situation).toBe(summary.mine.situation);
    expect(result.position).toBe(summary.mine.position);
    expect(result.played).toBe(result.wins + result.draws + result.losses);
    expect(result.points).toBe(result.wins * 3 + result.draws);
    expect(result.goalDifference).toBe(result.goalsFor - result.goalsAgainst);
  });
});

describe("campanha por competição (030)", () => {
  it("a liga sempre entra, com a premiação a pagar na virada", async () => {
    const save = await ended();
    const summary = seasonEndSummary(save);
    const { rows } = campaign(save);
    const league = rows.find((row) => row.kind === "league");
    expect(league?.competitionId).toBe(save.league.competitionId);
    expect(league?.paid).toBe(false);
    expect(league?.prize).toBe(summary.mine.prize);
    expect(league?.position).toBe(summary.mine.position);
  });

  it("uma premiação já lançada no extrato entra na sua competição, paga, e soma ao total", async () => {
    const save = await ended();
    const withPrize: SaveFile = {
      ...save,
      finances: {
        ...save.finances,
        ledger: [
          ...save.finances.ledger,
          {
            clubId: save.clubId,
            season: save.league.number,
            round: 3,
            category: "prize",
            amount: 750_000,
            date: "2027-05-01",
            competitionId: "copa-teste",
          },
        ],
      },
    };
    const before = campaign(save);
    const after = campaign(withPrize);
    const row = after.rows.find((entry) => entry.competitionId === "copa-teste");
    expect(row?.paid).toBe(true);
    expect(row?.prize).toBe(750_000);
    expect(after.total).toBe(before.total + 750_000);
    expect(after.total).toBe(after.rows.reduce((sum, entry) => sum + entry.prize, 0));
  });

  it("a meta continental ou estadual da avaliação vira uma linha com a fase alcançada e o resultado", async () => {
    const save = await ended();
    const evaluation = save.board.evaluation;
    if (!evaluation) throw new Error("sem avaliação");
    const withContinental: SaveFile = {
      ...save,
      board: {
        ...save.board,
        evaluation: {
          ...evaluation,
          continental: {
            competitionId: "copa-continental",
            target: { stage: 1 },
            reached: { stage: 2, phase: 1 },
            result: "met",
          },
        },
      },
    };
    const row = campaign(withContinental).rows.find((entry) => entry.kind === "continental");
    expect(row?.competitionId).toBe("copa-continental");
    expect(row?.reached).toEqual({ stage: 2, phase: 1 });
    expect(row?.goal).toBe("met");
  });

  it("competição sem nenhum dado do clube não gera linha e prêmio ausente não dá erro", async () => {
    const save = await ended();
    const { rows } = campaign(save);
    const ids = rows.map((row) => row.competitionId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const row of rows) {
      expect(row.prize >= 0).toBe(true);
    }
    // Sem avaliação (carreira sem metas), só a liga e o que o extrato tiver.
    const { evaluation: _removed, ...board } = save.board;
    const bare: SaveFile = { ...save, board };
    expect(() => campaign(bare)).not.toThrow();
    expect(campaign(bare).rows.some((row) => row.kind === "continental")).toBe(false);
  });
});
