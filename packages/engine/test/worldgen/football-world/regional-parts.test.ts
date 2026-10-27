import { describe, expect, it } from "vitest";
import { generateRegionalBank } from "../../../src/worldgen/regional";

describe("estaduais parametrizáveis (024 R5)", () => {
  it("divisões de 8 e 8 clubes geram semifinal e final (sem quartas) e validam", () => {
    const bank = generateRegionalBank({
      seed: "partes",
      states: 2,
      firstDivisionClubs: 8,
      secondDivisionClubs: 8,
    });
    const estadual = bank.competitions.find((c) => c.regional);
    const knockout = estadual?.divisions[0]?.stages?.[1];
    expect(knockout?.type === "knockout" && knockout.phases.map((p) => p.name)).toEqual([
      "Semifinal",
      "Final",
    ]);
  });

  it("a configuração padrão segue com quartas, semifinal e final", () => {
    const bank = generateRegionalBank({ seed: "partes", states: 2 });
    const estadual = bank.competitions.find((c) => c.regional);
    const knockout = estadual?.divisions[0]?.stages?.[1];
    expect(knockout?.type === "knockout" && knockout.phases.length).toBe(3);
  });
});
