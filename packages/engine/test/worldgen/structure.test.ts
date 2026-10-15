import { describe, expect, it } from "vitest";
import { generateDefaultBank } from "../../src/worldgen/generate.js";
import { at } from "../helpers/build-bank.js";

const bank = generateDefaultBank({ seed: 42 });

describe("estrutura do banco padrão (FR-028, FR-029)", () => {
  it("tem manifesto na versão 1 do formato", () => {
    expect(bank.manifest.formatVersion).toBe(1);
    expect(bank.manifest.id).toBe("default");
  });

  it("tem 1 país e 1 liga de pontos corridos em ida e volta, 3/1/0", () => {
    expect(bank.countries).toHaveLength(1);
    expect(bank.competitions).toHaveLength(1);
    const competition = at(bank.competitions, 0);
    expect(competition.countryId).toBe(at(bank.countries, 0).id);
    expect(competition.format).toMatchObject({
      type: "league",
      rounds: 2,
      points: { win: 3, draw: 1, loss: 0 },
    });
  });

  it("tem Série A e Série B com 20 clubes, 4 rebaixados e 4 promovidos", () => {
    const [serieA, serieB] = at(bank.competitions, 0).divisions;
    expect(serieA).toMatchObject({
      level: 1,
      name: "Série A",
      promotionSlots: 0,
      relegationSlots: 4,
    });
    expect(serieB).toMatchObject({
      level: 2,
      name: "Série B",
      promotionSlots: 4,
      relegationSlots: 0,
    });
    expect(serieA?.clubIds).toHaveLength(20);
    expect(serieB?.clubIds).toHaveLength(20);
    expect(bank.clubs).toHaveLength(40);
  });

  it("cada clube tem de 22 a 30 jogadores e ao menos 2 goleiros", () => {
    for (const club of bank.clubs) {
      const squad = bank.players.filter((player) => player.clubId === club.id);
      expect(squad.length).toBeGreaterThanOrEqual(22);
      expect(squad.length).toBeLessThanOrEqual(30);
      expect(squad.filter((player) => player.position === "GK").length).toBeGreaterThanOrEqual(2);
    }
  });

  it("nomes, siglas e ids de clubes são únicos", () => {
    const unique = (values: string[]) => new Set(values).size === values.length;
    expect(unique(bank.clubs.map((club) => club.name))).toBe(true);
    expect(unique(bank.clubs.map((club) => club.abbreviation))).toBe(true);
    expect(unique(bank.clubs.map((club) => club.id))).toBe(true);
    expect(unique(bank.players.map((player) => player.id))).toBe(true);
  });
});
