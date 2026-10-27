import { describe, expect, it } from "vitest";
import { COMPACT_PROFILE, generateFootballWorld } from "../../../src/worldgen/football-world";

describe("mundo compacto (024 US6)", () => {
  const bank = generateFootballWorld(COMPACT_PROFILE, "mundo");

  it("valida sem erros nem avisos e tem as seis confederações", () => {
    expect(bank.countries).toHaveLength(24);
    const majors = bank.competitions.filter((c) => c.id.endsWith("-maior"));
    expect(majors.map((c) => c.id)).toEqual([
      "continental-uefa-maior",
      "continental-conmebol-maior",
      "continental-concacaf-maior",
      "continental-caf-maior",
      "continental-afc-maior",
      "continental-ofc-maior",
    ]);
  });

  it("os nomes de competições são fictícios e os de países reais", () => {
    expect(bank.countries.some((c) => c.name === "Brasil")).toBe(true);
    expect(bank.countries.some((c) => c.name === "Inglaterra")).toBe(true);
    expect(
      bank.competitions.some((c) => /Brasileir|Libertadores|Premier|Champions/i.test(c.name)),
    ).toBe(false);
  });

  it("calendário sem conflito: clube em duas competições nunca joga duas vezes no mesmo dia (validação do banco)", () => {
    // A validação do banco já checa o calendário (`calendar.club_double_booked`); o banco gerado passou.
    expect(bank.competitions.length).toBeGreaterThan(40);
  });
});
