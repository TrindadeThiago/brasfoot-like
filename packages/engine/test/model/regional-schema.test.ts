import { describe, expect, it } from "vitest";
import { competitionSchema, regionalSchema } from "../../src/model/schemas";
import { makeValidBank } from "../helpers/build-bank";

describe("competition.regional (023 R1, R7)", () => {
  it("aceita região sem peso (peso padrão no motor)", () => {
    expect(regionalSchema.safeParse({ region: "Norte" }).success).toBe(true);
  });

  it("aceita peso base e faixas de reputação", () => {
    const result = regionalSchema.safeParse({
      region: "Norte",
      weight: { pct: 100, byReputation: [{ from: 70, pct: 30 }] },
    });
    expect(result.success).toBe(true);
  });

  it("rejeita região vazia ou longa demais, peso fora de 0 a 200 e faixa fora da escala", () => {
    expect(regionalSchema.safeParse({ region: "" }).success).toBe(false);
    expect(regionalSchema.safeParse({ region: "x".repeat(41) }).success).toBe(false);
    expect(regionalSchema.safeParse({ region: "Norte", weight: { pct: 201 } }).success).toBe(false);
    expect(regionalSchema.safeParse({ region: "Norte", weight: { pct: -1 } }).success).toBe(false);
    expect(
      regionalSchema.safeParse({
        region: "Norte",
        weight: { pct: 100, byReputation: [{ from: 101, pct: 10 }] },
      }).success,
    ).toBe(false);
  });

  it("é opcional na competição: o banco válido continua passando", () => {
    const competition = makeValidBank().competitions[0];
    expect(competitionSchema.safeParse(competition).success).toBe(true);
    expect(
      competitionSchema.safeParse({ ...competition, regional: { region: "Norte" } }).success,
    ).toBe(true);
  });
});
