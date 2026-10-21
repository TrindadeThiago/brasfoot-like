import { describe, expect, it } from "vitest";
import { type DrawClub, drawPhase } from "../../src/knockout/draw";

function clubs(count: number): DrawClub[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `c${String(index + 1).padStart(2, "0")}`,
    reputation: 100 - index,
    division: index % 2 === 0 ? 2 : 1,
  }));
}

const RULES = { home: "draw", seeded: false, legs: 1, neutral: false } as const;

describe("drawPhase: sorteio base (018 R6)", () => {
  it("emparelha todos os clubes exatamente uma vez", () => {
    const pairs = drawPhase(clubs(16), RULES, "seed-a");
    expect(pairs).toHaveLength(8);
    const ids = pairs.flatMap((pair) => [pair.home, pair.away]);
    expect(new Set(ids).size).toBe(16);
  });

  it("é determinístico pela seed e não depende da ordem de entrada", () => {
    const list = clubs(16);
    const a = drawPhase(list, RULES, "seed-a");
    const b = drawPhase([...list].reverse(), RULES, "seed-a");
    expect(b).toEqual(a);
    expect(drawPhase(list, RULES, "seed-b")).not.toEqual(a);
  });

  it("com mando por sorteio, os dois lados aparecem como mandante", () => {
    const homes = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      for (const pair of drawPhase(clubs(4), RULES, `s${seed}`)) homes.add(pair.home);
    }
    expect(homes.size).toBe(4);
  });

  it("recusa número ímpar de clubes", () => {
    expect(() => drawPhase(clubs(7), RULES, "x")).toThrow();
  });
});

describe("drawPhase: cabeças de chave e mando (018 US4)", () => {
  it("cabeças de chave nunca se enfrentam enquanto há vagas", () => {
    const list = clubs(16);
    const seeds = new Set(list.slice(0, 4).map((club) => club.id));
    for (let n = 0; n < 100; n++) {
      const pairs = drawPhase(list, { ...RULES, seeded: true }, `cab-${n}`);
      for (const pair of pairs) expect(seeds.has(pair.home) && seeds.has(pair.away)).toBe(false);
      expect(new Set(pairs.flatMap((pair) => [pair.home, pair.away])).size).toBe(16);
    }
  });

  it("com poucos clubes (2 e 4) o sorteio com cabeças não falha", () => {
    expect(drawPhase(clubs(2), { ...RULES, seeded: true }, "x")).toHaveLength(1);
    expect(drawPhase(clubs(4), { ...RULES, seeded: true }, "x")).toHaveLength(2);
  });

  it("mando por ranking: a maior reputação manda; empate pelo id", () => {
    const list = clubs(8);
    for (const pair of drawPhase(list, { ...RULES, home: "ranking" }, "r")) {
      const home = list.find((club) => club.id === pair.home) as DrawClub;
      const away = list.find((club) => club.id === pair.away) as DrawClub;
      expect(home.reputation).toBeGreaterThan(away.reputation);
    }
    const equal = [
      { id: "b", reputation: 50, division: 1 },
      { id: "a", reputation: 50, division: 1 },
    ];
    expect(drawPhase(equal, { ...RULES, home: "ranking" }, "r")[0]?.home).toBe("a");
  });

  it("mando por divisão: a divisão mais baixa manda", () => {
    const list = clubs(8);
    for (const pair of drawPhase(list, { ...RULES, home: "division" }, "d")) {
      const home = list.find((club) => club.id === pair.home) as DrawClub;
      const away = list.find((club) => club.id === pair.away) as DrawClub;
      expect(home.division).toBeGreaterThanOrEqual(away.division);
    }
  });

  it("100 seeds: sempre determinístico", () => {
    for (let n = 0; n < 100; n++) {
      const rules = { ...RULES, seeded: true, home: "division" } as const;
      expect(drawPhase(clubs(16), rules, `s${n}`)).toEqual(drawPhase(clubs(16), rules, `s${n}`));
    }
  });
});
