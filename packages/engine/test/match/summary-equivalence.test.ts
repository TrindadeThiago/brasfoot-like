import { describe, expect, it } from "vitest";
import { comparisonWorld, samples, summarize, totalVariation } from "../helpers/summary-compare";

// 020 FR-016 / SC-002 (research.md R12): as duas simulações têm distribuições equivalentes. As
// faixas abaixo são as declaradas; a distância de variação total considera o ruído de comparar
// duas amostras finitas (entre duas amostras só da completa, em jogos diferentes, ela fica em
// ~0,03 com 8 000 jogos).
const GAMES = 8000;
const BANDS = {
  goals: 0.08,
  share: 0.025,
  yellows: 0.25,
  reds: 0.03,
  injuries: 0.03,
  minutes: 0.6,
  totalVariation: 0.045,
} as const;

describe("equivalência estatística: simulação resumida × completa (020 FR-016)", () => {
  const { inputs } = comparisonWorld();
  const list = inputs(GAMES, "equivalencia");
  const full = summarize(samples(list, "full"));
  const summary = summarize(samples(list, "summary"));

  it("média de gols por jogo", () => {
    expect(Math.abs(full.goals - summary.goals)).toBeLessThanOrEqual(BANDS.goals);
  });

  it("proporção de vitórias da casa, empates e vitórias de fora", () => {
    expect(Math.abs(full.homeWin - summary.homeWin)).toBeLessThanOrEqual(BANDS.share);
    expect(Math.abs(full.draw - summary.draw)).toBeLessThanOrEqual(BANDS.share);
    expect(Math.abs(full.awayWin - summary.awayWin)).toBeLessThanOrEqual(BANDS.share);
  });

  it("distribuição de placares (distância de variação total)", () => {
    expect(totalVariation(full, summary)).toBeLessThanOrEqual(BANDS.totalVariation);
  });

  it("cartões amarelos e vermelhos por jogo", () => {
    expect(Math.abs(full.yellows - summary.yellows)).toBeLessThanOrEqual(BANDS.yellows);
    expect(Math.abs(full.reds - summary.reds)).toBeLessThanOrEqual(BANDS.reds);
  });

  it("lesões por jogo e minutos de quem joga o jogo todo", () => {
    expect(Math.abs(full.injuries - summary.injuries)).toBeLessThanOrEqual(BANDS.injuries);
    expect(Math.abs(full.starterMinutes - summary.starterMinutes)).toBeLessThanOrEqual(
      BANDS.minutes,
    );
  });
}, 120_000);
