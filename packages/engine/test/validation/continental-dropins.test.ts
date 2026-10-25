import { describe, expect, it } from "vitest";
import type { Competition, ModPackage } from "../../src/model/types";
import { validateBank } from "../../src/validation/validate";
import { apportion, CONTINENTAL_IDS } from "../../src/worldgen/continental";
import { generateWorldBank } from "../../src/worldgen/world-example";

function compact(): ModPackage {
  return JSON.parse(
    JSON.stringify(
      generateWorldBank({
        seed: "validacao-ligacao",
        countries: 5,
        divisionsPerCountry: 1,
        clubsPerDivision: 8,
        cup: true,
        continental: "compact",
      }),
    ),
  ) as ModPackage;
}

const minorOf = (bank: ModPackage) =>
  bank.competitions.find((entry) => entry.id === CONTINENTAL_IDS.minor) as Competition;

const codes = (bank: ModPackage) => {
  const result = validateBank(bank);
  return result.ok ? [] : result.errors.map((issue) => issue.code);
};

describe("ligação entre competições na validação (022 US3, FR-025)", () => {
  it("o banco gerado, com a ligação dos terceiros dos grupos, é válido", () => {
    expect(codes(compact())).toEqual([]);
  });

  it("aceita os perdedores de uma fase de mata-mata como fonte, com a agenda depois da origem", () => {
    const bank = compact();
    const minor = minorOf(bank);
    const dropIn = minor.divisions[0]?.dropIns?.[0];
    if (!dropIn) throw new Error("sem ligação");
    dropIn.source = {
      kind: "eliminated",
      competitionId: CONTINENTAL_IDS.major,
      stage: 2,
      phase: 1,
    };
    // As quartas da maior terminam em torno da semana 10: a menor só recomeça depois.
    minor.schedule = { weekday: 4, startWeek: 10, everyWeeks: 2 };
    expect(codes(bank)).toEqual([]);
  });

  it("a contagem de quem chega por ligação entra na conta da fase de destino", () => {
    const bank = compact();
    const minor = minorOf(bank);
    const stages = minor.format.type === "stages" ? minor.format.stages : [];
    const second = stages[1];
    if (second?.type !== "knockout") throw new Error("a 2ª fase devia ser de mata-mata");
    // 2 vencedores + 4 da ligação + 2 de entrada = 8 (certo). Tirar uma entrada deixa 7 clubes.
    second.enter = second.enter?.slice(0, 1);
    expect(codes(bank)).toContain("stages.knockout_count");
  });

  it("recusa a ligação para uma fase de pontos corridos", () => {
    const bank = compact();
    const minor = minorOf(bank);
    const stages = minor.format.type === "stages" ? minor.format.stages : [];
    const dropIn = minor.divisions[0]?.dropIns?.[0];
    if (!dropIn) throw new Error("sem ligação");
    stages[1] = {
      type: "league",
      rounds: 1,
      points: { win: 3, draw: 1, loss: 0 },
      tiebreakers: ["wins"],
    };
    expect(codes(bank)).toContain("continental.dropin_unknown");
  });
});

describe("repartição das vagas por país (022 R2)", () => {
  it("reparte o total pelos pesos, respeita os tetos e é determinística", () => {
    const result = apportion(10, [3, 2, 1], [10, 10, 10]);
    expect(result.reduce((sum, value) => sum + value, 0)).toBe(10);
    expect(result[0]).toBeGreaterThanOrEqual(result[1] as number);
    expect(result[1]).toBeGreaterThanOrEqual(result[2] as number);
    expect(apportion(10, [3, 2, 1], [10, 10, 10])).toEqual(result);
    expect(apportion(10, [3, 2, 1], [2, 10, 10])[0]).toBeLessThanOrEqual(2);
    expect(() => apportion(10, [1, 1], [2, 2])).toThrow();
  });
});
